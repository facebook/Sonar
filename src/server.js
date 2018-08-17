/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {SecureServerConfig} from './utils/CertificateProvider';
import type Logger from './fb-stubs/Logger';
import type {ClientQuery} from './Client.js';

import CertificateProvider from './utils/CertificateProvider';
import {RSocketServer, ReactiveSocket} from 'rsocket-core';
import RSocketTCPServer from 'rsocket-tcp-server';
import RSocketWebSocketServer from 'rsocket-websocket-server';
import {Single} from 'rsocket-flowable';
import Client from './Client.js';
import {RecurringError} from './utils/errors';

import Bonjour from 'bonjour';

const EventEmitter = (require('events'): any);
const invariant = require('invariant');
const tls = require('tls');
const net = require('net');

const SECURE_PORT = 8088;
const INSECURE_PORT = 8089;
const WEBSOCKET_PORT = 8090;

type RSocket = {|
  fireAndForget(payload: {data: string}): void,
  connectionStatus(): any,
  close(): void,
|};

type ClientInfo = {|
  connection: ?ReactiveSocket,
  client: Client,
|};

export default class Server extends EventEmitter {
  connections: Map<string, ClientInfo>;
  secureServer: RSocketServer;
  insecureServer: RSocketServer;
  websocketServer: RSocketServer;
  certificateProvider: CertificateProvider;
  connectionTracker: ConnectionTracker;
  logger: Logger;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
    this.connections = new Map();
    this.certificateProvider = new CertificateProvider(this, logger);
    this.connectionTracker = new ConnectionTracker(logger);
    this.init();
  }

  on: ((event: 'new-client', callback: (client: Client) => void) => void) &
    ((event: 'error', callback: (err: Error) => void) => void) &
    ((event: 'clients-change', callback: () => void) => void);

  init() {
    if (process.env.NODE_ENV === 'test') {
      console.warn(
        "rsocket server has not been started as we're in test mode",
        'server',
      );
      return;
    }

    this.certificateProvider
      .loadSecureServerConfig()
      .then(
        options => (this.secureServer = this.startServer(SECURE_PORT, false, false, options)),
      );
    this.insecureServer = this.startServer(INSECURE_PORT, false, true);

    // TODO optionally enable via a preference
    this.websocketServer = this.startServer(WEBSOCKET_PORT, true, false);
    const bonjour = new Bonjour();
    bonjour.publish({ name: 'Flipper', type: 'flipper', port: WEBSOCKET_PORT });
  }

  startServer(port: number, websocket: boolean, certificateServer: boolean, sslConfig?: SecureServerConfig) {
    const server = this;
    const serverFactory = onConnect => {
      const transportServer = sslConfig
        ? tls.createServer(sslConfig, socket => {
            onConnect(socket);
          })
        : net.createServer(onConnect);
      transportServer
        .on('error', err => {
          server.emit('error', err);
          console.log(`Error opening server on port ${port}`, 'server');
        })
        .on('listening', () => {
          console.debug(
            `${
              certificateServer ? 'Certificate' : 'Secure'
            } server started on port ${port}`,
            'server',
          );
        });
      return transportServer;
    };
    const transport = websocket
      ? new RSocketWebSocketServer({
          port: port,
        })
      : new RSocketTCPServer({
          port: port,
          serverFactory: serverFactory,
        });
    const rsServer = new RSocketServer({
      getRequestHandler: certificateServer
        ? this._untrustedRequestHandler
        : this._trustedRequestHandler,
      transport: transport,
    });

    rsServer.start();
    return rsServer;
  }

  _trustedRequestHandler = (conn: RSocket, connectRequest: {data: string}) => {
    const server = this;

    const clientData: ClientQuery = JSON.parse(connectRequest.data);
    this.connectionTracker.logConnectionAttempt(clientData);

    const client = this.addConnection(conn, clientData);

    conn.connectionStatus().subscribe({
      onNext(payload) {
        if (payload.kind == 'ERROR' || payload.kind == 'CLOSED') {
          console.debug(`Device disconnected ${client.id}`, 'connection');
          server.removeConnection(client.id);
        }
      },
      onSubscribe(subscription) {
        subscription.request(Number.MAX_SAFE_INTEGER);
      },
    });

    return client.responder;
  };

  _untrustedRequestHandler = (
    conn: RSocket,
    connectRequest: {data: string},
  ) => {
    const clientData = JSON.parse(connectRequest.data);
    this.connectionTracker.logConnectionAttempt(clientData);

    if (
      clientData.os === 'iOS' &&
      !clientData.device.toLowerCase().includes('simulator')
    ) {
      this.emit(
        'error',
        new Error(
          "Sonar doesn't currently support physical iOS devices. You can still use it to view logs, but for now to use the majority of the sonar plugins you'll have to use the Simulator.",
        ),
      );
      console.warn(
        'Physical iOS device detected. This is not currently supported by sonar.',
      );
    }

    return {
      requestResponse: (payload: {data: string}) => {
        if (typeof payload.data !== 'string') {
          return;
        }

        let rawData;
        try {
          rawData = JSON.parse(payload.data);
        } catch (err) {
          console.error(`Invalid JSON: ${payload.data}`, 'clientMessage');
          return;
        }

        const json: {|
          method: 'signCertificate',
          csr: string,
          destination: string,
        |} = rawData;
        if (json.method === 'signCertificate') {
          console.debug('CSR received from device', 'server');
          const {csr, destination} = json;
          return new Single(subscriber => {
            subscriber.onSubscribe();
            this.certificateProvider
              .processCertificateSigningRequest(csr, clientData.os, destination)
              .then(_ => {
                subscriber.onComplete({
                  data: JSON.stringify({}),
                  metadata: '',
                });
              })
              .catch(e => {
                console.error(e);
                subscriber.onError(e);
              });
          });
        }
      },

      // Leaving this here for a while for backwards compatibility,
      // but for up to date SDKs it will no longer used.
      // We can delete it after the SDK change has been using requestResponse for a few weeks.
      fireAndForget: (payload: {data: string}) => {
        if (typeof payload.data !== 'string') {
          return;
        }

        let rawData;
        try {
          rawData = JSON.parse(payload.data);
        } catch (err) {
          console.error(`Invalid JSON: ${payload.data}`, 'clientMessage');
          return;
        }

        const json: {|
          method: 'signCertificate',
          csr: string,
          destination: string,
        |} = rawData;
        if (json.method === 'signCertificate') {
          console.debug('CSR received from device', 'server');
          const {csr, destination} = json;
          this.certificateProvider
            .processCertificateSigningRequest(csr, clientData.os, destination)
            .catch(e => {
              console.error(e);
            });
        }
      },
    };
  };

  close() {
    this.secureServer.stop();
    this.insecureServer.stop();
    this.websocketServer.stop();
  }

  toJSON() {
    return null;
  }

  addConnection(conn: ReactiveSocket, query: ClientQuery): Client {
    invariant(query, 'expected query');

    const id = `${query.app}-${query.os}-${query.device}`;
    console.debug(`Device connected: ${id}`, 'connection');

    const client = new Client(id, query, conn, this.logger);

    const info = {
      client,
      connection: conn,
    };

    client.init().then(() => {
      console.debug(
        `Device client initialised: ${id}. Supported plugins: ${client.plugins.join(
          ', ',
        )}`,
        'connection',
      );

      /* If a device gets disconnected without being cleaned up properly,
       * sonar won't be aware until it attempts to reconnect.
       * When it does we need to terminate the zombie connection.
      */
      if (this.connections.has(id)) {
        const connectionInfo = this.connections.get(id);
        connectionInfo &&
          connectionInfo.connection &&
          connectionInfo.connection.close();
        this.removeConnection(id);
      }

      this.connections.set(id, info);
      this.emit('new-client', client);
      this.emit('clients-change');
      client.emit('plugins-change');
    });

    return client;
  }

  attachFakeClient(client: Client) {
    this.connections.set(client.id, {
      client,
      connection: null,
    });
  }

  removeConnection(id: string) {
    const info = this.connections.get(id);
    if (info) {
      info.client.emit('close');
      this.connections.delete(id);
      this.emit('clients-change');
      this.emit('removed-client', id);
    }
  }
}

class ConnectionTracker {
  timeWindowMillis = 20 * 1000;
  connectionProblemThreshold = 4;

  // "${device}.${app}" -> [timestamp1, timestamp2...]
  connectionAttempts: Map<string, Array<number>> = new Map();
  logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  logConnectionAttempt(client: ClientQuery) {
    const key = `${client.os}-${client.device}-${client.app}`;
    const time = Date.now();
    var entry = this.connectionAttempts.get(key) || [];
    entry.push(time);
    entry = entry.filter(t => t >= time - this.timeWindowMillis);

    this.connectionAttempts.set(key, entry);
    if (entry.length >= this.connectionProblemThreshold) {
      console.error(
        new RecurringError(
          `Connection loop detected with ${key}. Connected ${
            this.connectionProblemThreshold
          } times within ${this.timeWindowMillis / 1000}s.`,
        ),
      );
    }
  }
}
