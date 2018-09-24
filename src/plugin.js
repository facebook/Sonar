/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {KeyboardActions} from './MenuBar.js';
import type {App} from './App.js';
import type Logger from './fb-stubs/Logger.js';
import type Client from './Client.js';

import React from 'react';
import BaseDevice from './devices/BaseDevice.js';
import {AndroidDevice, IOSDevice} from 'flipper';

const invariant = require('invariant');

export type PluginClient = {|
  send: (method: string, params?: Object) => void,
  call: (method: string, params?: Object) => Promise<any>,
  subscribe: (method: string, callback: (params: any) => void) => void,
|};

type PluginTarget = BaseDevice | Client;

export type Props<T> = {
  logger: Logger,
  persistedState: T,
  setPersistedState: (state: $Shape<T>) => void,
  target: PluginTarget,
};

export class FlipperBasePlugin<
  State = *,
  Actions = *,
  PersistedState = *,
> extends React.Component<Props<PersistedState>, State> {
  static title: string = 'Unknown';
  static id: string = 'Unknown';
  static icon: string = 'apps';
  static keyboardActions: ?KeyboardActions;
  static screenshot: ?string;

  // forbid instance properties that should be static
  title: empty;
  id: empty;
  persist: empty;
  icon: empty;
  keyboardActions: empty;
  screenshot: empty;

  reducers: {
    [actionName: string]: (state: State, actionData: Object) => $Shape<State>,
  } = {};
  app: App;
  onKeyboardAction: ?(action: string) => void;

  toJSON() {
    return `<${this.constructor.name}#${this.constructor.title}>`;
  }

  // methods to be overriden by plugins
  init(): void {}
  teardown(): void {}
  // methods to be overridden by subclasses
  _init(): void {}
  _teardown(): void {}

  dispatchAction(actionData: Actions) {
    // $FlowFixMe
    const action = this.reducers[actionData.type];
    if (!action) {
      // $FlowFixMe
      throw new ReferenceError(`Unknown action ${actionData.type}`);
    }

    if (typeof action === 'function') {
      this.setState(action.call(this, this.state, actionData));
    } else {
      // $FlowFixMe
      throw new TypeError(`Reducer ${actionData.type} isn't a function`);
    }
  }
}

export class FlipperDevicePlugin<S = *, A = *, P = *> extends FlipperBasePlugin<
  S,
  A,
  P,
> {
  device: BaseDevice;

  constructor(props: Props<*>) {
    super(props);
    this.device = props.target;
  }

  _init() {
    this.init();
  }
}

export class FlipperPlugin<S = *, A = *, P = *> extends FlipperBasePlugin<
  S,
  A,
  P,
> {
  constructor(props: Props<*>) {
    super(props);
    const {id} = this.constructor;
    this.subscriptions = [];
    // $FlowFixMe props.target will be instance of Client
    this.realClient = props.target;
    this.client = {
      call: (method, params) => this.realClient.call(id, method, params),
      send: (method, params) => this.realClient.send(id, method, params),
      subscribe: (method, callback) => {
        this.subscriptions.push({
          method,
          callback,
        });
        this.realClient.subscribe(id, method, callback);
      },
    };
  }

  subscriptions: Array<{
    method: string,
    callback: Function,
  }>;

  client: PluginClient;
  realClient: Client;

  getDevice(): ?BaseDevice {
    return this.realClient.getDevice();
  }

  getAndroidDevice(): AndroidDevice {
    const device = this.getDevice();
    invariant(
      device != null && device instanceof AndroidDevice,
      'expected android device',
    );
    return device;
  }

  getIOSDevice() {
    const device = this.getDevice();
    invariant(
      device != null && device instanceof IOSDevice,
      'expected ios device',
    );
    return device;
  }

  _teardown() {
    // automatically unsubscribe subscriptions
    for (const {method, callback} of this.subscriptions) {
      this.realClient.unsubscribe(this.constructor.id, method, callback);
    }
    // run plugin teardown
    this.teardown();
    if (this.realClient.connected) {
      this.realClient.rawSend('deinit', {plugin: this.constructor.id});
    }
  }

  _init() {
    this.realClient.rawSend('init', {plugin: this.constructor.id});
    this.init();
  }
}
