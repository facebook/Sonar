/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

import type BaseDevice from './devices/BaseDevice.js';
import type Application from './init.js';
import type {SonarPlugin} from './plugin.js';
import plugins from './plugins/index.js';

const EventEmitter = (require('events'): any);
const url = require('url');

const invariant = require('invariant');
const WebSocketServer = require('ws').Server;

const PORT = 8088;

type WebSocketRequest = any;
type WebSocketConnection = any;

type ClientInfo = {|
  request: ?WebSocketRequest,
  connection: ?WebSocketConnection,
  client: Client,
|};

type Plugins = Array<string>;

type ClientQuery = {|
  app: string,
  os: string,
  device: string,
  device_id: ?string,
|};

type RequestMetadata = {method: string, id: number, params: ?Object};

export class Client extends EventEmitter {
  constructor(
    app: Application,
    id: string,
    query: ClientQuery,
    conn: ?WebSocketConnection,
  ) {
    super();

    this.connected = true;
    this.plugins = [];
    this.connection = conn;
    this.id = id;
    this.query = query;
    this.messageIdCounter = 0;
    this.app = app;

    this.broadcastCallbacks = new Map();
    this.requestCallbacks = new Map();

    if (conn) {
      conn.on('message', this.onMessage.bind(this));

      conn.on('close', () => {
        this.connected = false;
      });
    }
  }

  on: ((event: 'plugins-change', callback: () => void) => void) &
    ((event: 'close', callback: () => void) => void);

  app: Application;
  connected: boolean;
  id: string;
  query: ClientQuery;
  messageIdCounter: number;
  plugins: Plugins;
  connection: ?WebSocketConnection;

  broadcastCallbacks: Map<?string, Map<string, Set<Function>>>;

  requestCallbacks: Map<
    number,
    {|
      resolve: (data: any) => void,
      reject: (err: Error) => void,
      metadata: RequestMetadata,
    |},
  >;

  getDevice(): ?BaseDevice {
    const {device_id} = this.query;

    if (device_id == null) {
      return null;
    } else {
      return this.app.getDevice(device_id);
    }
  }

  supportsPlugin(Plugin: Class<SonarPlugin<>>): boolean {
    return this.plugins.includes(Plugin.id);
  }

  getFirstSupportedPlugin(): ?string {
    for (const Plugin of plugins) {
      if (this.supportsPlugin(Plugin)) {
        return Plugin.id;
      }
    }
  }

  async init() {
    await this.getPlugins();
  }

  // get the supported plugins
  async getPlugins(): Promise<Plugins> {
    const plugins = await this.rawCall('getPlugins').then(data => data.plugins);
    this.plugins = plugins;
    return plugins;
  }

  // get the plugins, and update the UI
  async refreshPlugins() {
    await this.getPlugins();
    this.emit('plugins-change');
  }

  onMessage(msg: string) {
    if (typeof msg !== 'string') {
      return;
    }

    let rawData;
    try {
      rawData = JSON.parse(msg);
    } catch (err) {
      this.app.logger.error(`Invalid JSON: ${msg}`, 'clientMessage');
      return;
    }

    const data: {|
      id?: number,
      method?: string,
      params?: Object,
      success?: Object,
      error?: Object,
    |} = rawData;

    this.app.logger.info(data, 'message:receive');

    const {id, method} = data;

    if (id == null) {
      const {error} = data;
      if (error != null) {
        this.app.logger.error(error.stacktrace || error.message, 'deviceError');
        this.app.errorReporter.report({
          message: error.message,
          stack: error.stacktrace,
        });
      } else if (method === 'refreshPlugins') {
        this.refreshPlugins();
      } else if (method === 'execute') {
        const params = data.params;
        invariant(params, 'expected params');

        const apiCallbacks = this.broadcastCallbacks.get(params.api);
        if (!apiCallbacks) {
          return;
        }

        const methodCallbacks: ?Set<Function> = apiCallbacks.get(params.method);
        if (methodCallbacks) {
          for (const callback of methodCallbacks) {
            callback(params.params);
          }
        }
      }
      return;
    }

    const callbacks = this.requestCallbacks.get(id);
    if (!callbacks) {
      return;
    }
    this.requestCallbacks.delete(id);
    this.finishTimingRequestResponse(callbacks.metadata);

    if (data.success) {
      callbacks.resolve(data.success);
    } else if (data.error) {
      callbacks.reject(data.error);
    } else {
      // ???
    }
  }

  toJSON() {
    return null;
  }

  subscribe(
    api: ?string = null,
    method: string,
    callback: (params: Object) => void,
  ) {
    let apiCallbacks = this.broadcastCallbacks.get(api);
    if (!apiCallbacks) {
      apiCallbacks = new Map();
      this.broadcastCallbacks.set(api, apiCallbacks);
    }

    let methodCallbacks = apiCallbacks.get(method);
    if (!methodCallbacks) {
      methodCallbacks = new Set();
      apiCallbacks.set(method, methodCallbacks);
    }
    methodCallbacks.add(callback);
  }

  unsubscribe(api: ?string = null, method: string, callback: Function) {
    const apiCallbacks = this.broadcastCallbacks.get(api);
    if (!apiCallbacks) {
      return;
    }

    const methodCallbacks = apiCallbacks.get(method);
    if (!methodCallbacks) {
      return;
    }
    methodCallbacks.delete(callback);
  }

  rawCall(method: string, params?: Object): Promise<Object> {
    return new Promise((resolve, reject) => {
      const id = this.messageIdCounter++;
      const metadata: RequestMetadata = {
        method,
        id,
        params,
      };
      this.requestCallbacks.set(id, {reject, resolve, metadata});

      const data = {
        id,
        method,
        params,
      };

      this.app.logger.info(data, 'message:call');
      this.startTimingRequestResponse({method, id, params});
      if (this.connection && this.connection.readyState === 1) {
        this.connection.send(JSON.stringify(data));
      }
    });
  }

  startTimingRequestResponse(data: RequestMetadata) {
    performance.mark(this.getPerformanceMark(data));
  }

  finishTimingRequestResponse(data: RequestMetadata) {
    const mark = this.getPerformanceMark(data);
    const logEventName = this.getLogEventName(data);
    this.app.logger.trackTimeSince(mark, logEventName);
  }

  getPerformanceMark(data: RequestMetadata): string {
    const {method, id} = data;
    return `request_response_${method}_${id}`;
  }

  getLogEventName(data: RequestMetadata): string {
    const {method, params} = data;
    return params && params.api && params.method
      ? `request_response_${method}_${params.api}_${params.method}`
      : `request_response_${method}`;
  }

  rawSend(method: string, params?: Object): void {
    const data = {
      method,
      params,
    };
    this.app.logger.info(data, 'message:send');
    if (this.connection && this.connection.readyState === 1) {
      this.connection.send(JSON.stringify(data));
    }
  }

  call(api: string, method: string, params?: Object): Promise<Object> {
    return this.rawCall('execute', {api, method, params});
  }

  send(api: string, method: string, params?: Object): void {
    return this.rawSend('execute', {api, method, params});
  }
}

export class Server extends EventEmitter {
  constructor(app: Application) {
    super();

    this.app = app;

    this.connections = new Map();

    this.init();
  }

  connections: Map<string, ClientInfo>;
  id: number;
  server: WebSocketServer;
  app: Application;

  on: ((event: 'new-client', callback: (client: Client) => void) => void) &
    ((event: 'error', callback: (err: Error) => void) => void) &
    ((event: 'clients-change', callback: () => void) => void);

  init() {
    if (process.env.NODE_ENV === 'test') {
      this.app.logger.warn(
        "Websocket server has not been started as we're in test mode",
        'server',
      );
      return;
    }

    const ws = (this.server = new WebSocketServer({
      port: PORT,
    }));

    ws.on('listening', () => {
      this.app.logger.warn(`Listening on port ${PORT}`, 'server');
    });

    ws.on('connection', (conn: WebSocketConnection, req: WebSocketRequest) => {
      const id = this.addConnection(req, conn);

      conn.on('close', () => {
        this.app.logger.warn(`Device disconnected ${id}`, 'connection');
        this.removeConnection(id);
      });
    });

    ws.on('error', err => {
      this.emit('error', err);
    });
  }

  close() {
    this.server.close();
  }

  toJSON() {
    return null;
  }

  addConnection(req: WebSocketRequest, conn: WebSocketConnection): string {
    const {query} = url.parse(req.url, true);
    this.app.logger.warn(
      `Device connected: ${JSON.stringify(query)}`,
      'connection',
    );
    invariant(query, 'expected query');

    const id = `${query.app}-${query.os}-${query.device}`;
    const client = new Client(this.app, id, query, conn);

    const info = {
      client,
      connection: conn,
      request: req,
    };

    client.init().then(() => {
      this.app.logger.warn(
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
          connectionInfo.connection.terminate();
        this.removeConnection(id);
      }
      this.connections.set(id, info);
      this.emit('new-client', client);
      this.emit('clients-change');
      client.emit('plugins-change');
    });
    return id;
  }

  attachFakeClient(client: Client) {
    this.connections.set(client.id, {
      client,
      connection: null,
      request: null,
    });
  }

  removeConnection(id: string) {
    const info = this.connections.get(id);
    if (info) {
      info.client.emit('close');
      this.connections.delete(id);
      this.emit('clients-change');
    }
  }
}
