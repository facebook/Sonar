/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {KeyboardActions} from './MenuBar.js';
import type {App} from './App.js';
import type {Logger} from './fb-interfaces/Logger.js';
import type Client from './Client.js';
import type {Store} from './reducers/index.js';

import React from 'react';
import type {Node} from 'react';
import BaseDevice from './devices/BaseDevice.js';
import AndroidDevice from './devices/AndroidDevice';
import IOSDevice from './devices/IOSDevice';

const invariant = require('invariant');

export type PluginClient = {|
  send: (method: string, params?: Object) => void,
  call: (method: string, params?: Object) => Promise<any>,
  subscribe: (method: string, callback: (params: any) => void) => void,
|};

type PluginTarget = BaseDevice | Client;

export type Notification = {|
  id: string,
  title: string,
  message: string | Node,
  severity: 'warning' | 'error',
  timestamp?: number,
  category?: string,
  action?: string,
|};

export type Props<T> = {
  logger: Logger,
  persistedState: T,
  setPersistedState: (state: $Shape<T>) => void,
  target: PluginTarget,
  deepLinkPayload: ?string,
  selectPlugin: (pluginID: string, deepLinkPayload: ?string) => boolean,
};

export class FlipperBasePlugin<
  State = *,
  Actions = *,
  PersistedState = *,
> extends React.Component<Props<PersistedState>, State> {
  static title: ?string = null;
  static id: string = '';
  static icon: ?string = null;
  static gatekeeper: ?string = null;
  static entry: ?string = null;
  static bugs: ?{
    email?: string,
    url?: string,
  } = null;
  static keyboardActions: ?KeyboardActions;
  static screenshot: ?string;
  static defaultPersistedState: PersistedState;
  static persistedStateReducer: ?(
    persistedState: PersistedState,
    method: string,
    data: Object,
  ) => $Shape<PersistedState>;
  static getActiveNotifications: ?(
    persistedState: PersistedState,
  ) => Array<Notification>;
  static onRegisterDevice: ?(
    store: Store,
    baseDevice: BaseDevice,
    setPersistedState: (
      pluginKey: string,
      newPluginState: ?PersistedState,
    ) => void,
  ) => void;
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
    return `<${this.constructor.name}#${this.constructor.id}>`;
  }

  // methods to be overriden by plugins
  init(): void {}
  teardown(): void {}
  computeNotifications(props: Props<*>, state: State): Array<Notification> {
    return [];
  }
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

  static supportsDevice(device: BaseDevice) {
    throw new Error(
      'supportsDevice is unimplemented in FlipperDevicePlugin class',
    );
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
      this.realClient.deinitPlugin(this.constructor.id);
    }
  }

  _init() {
    this.realClient.initPlugin(this.constructor.id);
    this.init();
  }
}
