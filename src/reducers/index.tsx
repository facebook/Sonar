/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {combineReducers, Dispatch} from 'redux';
import application, {
  State as ApplicationState,
  Action as ApplicationAction,
} from './application';
import connections, {
  State as DevicesState,
  Action as DevicesAction,
} from './connections';
import pluginStates, {
  State as PluginStatesState,
  Action as PluginStatesAction,
} from './pluginStates';
import notifications, {
  State as NotificationsState,
  Action as NotificationsAction,
} from './notifications';
import plugins, {
  State as PluginsState,
  Action as PluginsAction,
} from './plugins';
import supportForm, {
  State as SupportFormState,
  Action as SupportFormAction,
} from './supportForm';
import settings, {
  Settings as SettingsState,
  Action as SettingsAction,
} from './settings';
import pluginManager, {
  State as PluginManagerState,
  Action as PluginManagerAction,
} from './pluginManager';
import healthchecks, {
  Action as HealthcheckAction,
  State as HealthcheckState,
} from './healthchecks';
import user, {State as UserState, Action as UserAction} from './user';
import JsonFileStorage from '../utils/jsonFileReduxPersistStorage';
import os from 'os';
import {resolve} from 'path';
import xdg from 'xdg-basedir';
import {persistReducer} from 'redux-persist';
import {PersistPartial} from 'redux-persist/es/persistReducer';

import {Store as ReduxStore, MiddlewareAPI as ReduxMiddlewareAPI} from 'redux';
import storage from 'redux-persist/lib/storage';

export type Actions =
  | ApplicationAction
  | DevicesAction
  | PluginStatesAction
  | NotificationsAction
  | PluginsAction
  | UserAction
  | SettingsAction
  | SupportFormAction
  | PluginManagerAction
  | HealthcheckAction
  | {type: 'INIT'};

export type State = {
  application: ApplicationState;
  connections: DevicesState & PersistPartial;
  pluginStates: PluginStatesState;
  notifications: NotificationsState & PersistPartial;
  plugins: PluginsState;
  user: UserState & PersistPartial;
  settingsState: SettingsState & PersistPartial;
  supportForm: SupportFormState;
  pluginManager: PluginManagerState;
  healthchecks: HealthcheckState;
};

export type Store = ReduxStore<State, Actions>;
export type MiddlewareAPI = ReduxMiddlewareAPI<Dispatch<Actions>, State>;

const settingsStorage = new JsonFileStorage(
  resolve(
    ...(xdg.config ? [xdg.config] : [os.homedir(), '.config']),
    'flipper',
    'settings.json',
  ),
);

export default combineReducers<State, Actions>({
  application,
  connections: persistReducer<DevicesState, Actions>(
    {
      key: 'connections',
      storage,
      whitelist: [
        'userPreferredDevice',
        'userPreferredPlugin',
        'userPreferredApp',
        'starredPlugins',
      ],
    },
    connections,
  ),
  pluginStates,
  notifications: persistReducer(
    {
      key: 'notifications',
      storage,
      whitelist: ['blacklistedPlugins', 'blacklistedCategories'],
    },
    notifications,
  ),
  plugins,
  supportForm,
  pluginManager,
  user: persistReducer(
    {
      key: 'user',
      storage,
    },
    user,
  ),
  settingsState: persistReducer(
    {key: 'settings', storage: settingsStorage},
    settings,
  ),
  healthchecks,
});
