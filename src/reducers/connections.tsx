/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import BaseDevice from '../devices/BaseDevice';
import MacDevice from '../devices/MacDevice';
import Client from '../Client';
import {UninitializedClient} from '../UninitializedClient';
import {isEqual} from 'lodash';
import iosUtil from '../fb-stubs/iOSContainerUtility';
import {performance} from 'perf_hooks';
import isHeadless from '../utils/isHeadless';
import {Actions} from '.';
const WelcomeScreen = isHeadless()
  ? require('../chrome/WelcomeScreenHeadless').default
  : require('../chrome/WelcomeScreen').default;
import SupportRequestForm from '../fb-stubs/SupportRequestFormManager';
import SupportRequestFormV2 from '../fb-stubs/SupportRequestFormV2';

export type StaticView =
  | null
  | typeof WelcomeScreen
  | typeof SupportRequestForm
  | typeof SupportRequestFormV2;

export type FlipperError = {
  occurrences?: number;
  message: string;
  details?: string;
  error?: Error | string;
};

export type State = {
  devices: Array<BaseDevice>;
  androidEmulators: Array<string>;
  selectedDevice: null | BaseDevice;
  selectedPlugin: null | string;
  selectedApp: null | string;
  userPreferredDevice: null | string;
  userPreferredPlugin: null | string;
  userPreferredApp: null | string;
  starredPlugins: string[];
  errors: FlipperError[];
  clients: Array<Client>;
  uninitializedClients: Array<{
    client: UninitializedClient;
    deviceId?: string;
    errorMessage?: string;
  }>;
  deepLinkPayload: null | string;
  staticView: StaticView;
};

export type Action =
  | {
      type: 'UNREGISTER_DEVICES';
      payload: Set<string>;
    }
  | {
      type: 'REGISTER_DEVICE';
      payload: BaseDevice;
    }
  | {
      type: 'REGISTER_ANDROID_EMULATORS';
      payload: Array<string>;
    }
  | {
      type: 'SELECT_DEVICE';
      payload: BaseDevice;
    }
  | {
      type: 'SELECT_PLUGIN';
      payload: {
        selectedPlugin: null | string;
        selectedApp?: null | string;
        deepLinkPayload: null | string;
      };
    }
  | {
      type: 'SELECT_USER_PREFERRED_PLUGIN';
      payload: string;
    }
  | {
      type: 'SERVER_ERROR';
      payload: null | FlipperError;
    }
  | {
      type: 'NEW_CLIENT';
      payload: Client;
    }
  | {
      type: 'NEW_CLIENT_SANITY_CHECK';
      payload: Client;
    }
  | {
      type: 'CLIENT_REMOVED';
      payload: string;
    }
  | {
      type: 'PREFER_DEVICE';
      payload: string;
    }
  | {
      type: 'START_CLIENT_SETUP';
      payload: UninitializedClient;
    }
  | {
      type: 'FINISH_CLIENT_SETUP';
      payload: {client: UninitializedClient; deviceId: string};
    }
  | {
      type: 'CLIENT_SETUP_ERROR';
      payload: {client: UninitializedClient; error: FlipperError};
    }
  | {
      type: 'SET_STATIC_VIEW';
      payload: StaticView;
    }
  | {
      type: 'DISMISS_ERROR';
      payload: number;
    }
  | {
      type: 'STAR_PLUGIN';
      payload: {
        selectedPlugin: string;
        selectedApp: string;
      };
    }
  | {
      type: 'SELECT_CLIENT';
      payload: string;
    };

const DEFAULT_PLUGIN = 'DeviceLogs';
const DEFAULT_DEVICE_BLACKLIST = [MacDevice];
const INITAL_STATE: State = {
  devices: [],
  androidEmulators: [],
  selectedDevice: null,
  selectedApp: null,
  selectedPlugin: DEFAULT_PLUGIN,
  userPreferredDevice: null,
  userPreferredPlugin: null,
  userPreferredApp: null,
  starredPlugins: [],
  errors: [],
  clients: [],
  uninitializedClients: [],
  deepLinkPayload: null,
  staticView: WelcomeScreen,
};
// Please sync with NotificationsHub
const STATIC_PLUGINS_ID: Array<string> = ['notifications'];

const reducer = (state: State = INITAL_STATE, action: Actions): State => {
  switch (action.type) {
    case 'SET_STATIC_VIEW': {
      const {payload} = action;
      const {selectedPlugin} = state;
      return {
        ...state,
        staticView: payload,
        selectedPlugin: payload != null ? null : selectedPlugin,
      };
    }

    case 'RESET_SUPPORT_FORM_V2_STATE': {
      return updateSelection({
        ...state,
        staticView: null,
      });
    }

    case 'SELECT_DEVICE': {
      const {payload} = action;
      return updateSelection({
        ...state,
        staticView: null,
        selectedDevice: payload,
        userPreferredDevice: payload
          ? payload.title
          : state.userPreferredDevice,
      });
    }
    case 'REGISTER_ANDROID_EMULATORS': {
      const {payload} = action;
      return {
        ...state,
        androidEmulators: payload,
      };
    }
    case 'REGISTER_DEVICE': {
      const {payload} = action;

      return updateSelection({
        ...state,
        devices: state.devices.concat(payload),
      });
    }

    case 'UNREGISTER_DEVICES': {
      const {payload} = action;
      const devices = state.devices.filter((device: BaseDevice) => {
        if (payload.has(device.serial)) {
          return false;
        } else {
          return true;
        }
      });

      return updateSelection({
        ...state,
        devices,
      });
    }
    case 'SELECT_PLUGIN': {
      const {payload} = action;
      const {selectedPlugin, selectedApp} = payload;
      if (selectedPlugin) {
        performance.mark(`activePlugin-${selectedPlugin}`);
      }

      return updateSelection({
        ...state,
        staticView: null,
        selectedApp: selectedApp || null,
        selectedPlugin,
        userPreferredPlugin: selectedPlugin || state.userPreferredPlugin,
      });
    }

    case 'STAR_PLUGIN': {
      const {selectedPlugin} = action.payload;
      const starredPlugins = state.starredPlugins.slice();
      const idx = starredPlugins.indexOf(selectedPlugin);
      if (idx === -1) {
        starredPlugins.push(selectedPlugin);
      } else {
        starredPlugins.splice(idx, 1);
      }
      return {
        ...state,
        starredPlugins: starredPlugins,
      };
    }

    case 'SELECT_USER_PREFERRED_PLUGIN': {
      const {payload} = action;
      return {...state, userPreferredPlugin: payload};
    }

    case 'NEW_CLIENT': {
      const {payload} = action;

      return updateSelection({
        ...state,
        clients: state.clients.concat(payload),
        uninitializedClients: state.uninitializedClients.filter(c => {
          return (
            c.deviceId !== payload.query.device_id ||
            c.client.appName !== payload.query.app
          );
        }),
      });
    }

    case 'SELECT_CLIENT': {
      const {payload} = action;
      return updateSelection({
        ...state,
        selectedApp: payload,
        userPreferredApp: payload || state.userPreferredApp,
      });
    }

    case 'NEW_CLIENT_SANITY_CHECK': {
      const {payload} = action;
      // Check for clients initialised when there is no matching device
      const clientIsStillConnected = state.clients.filter(
        client => client.id == payload.query.device_id,
      );
      if (clientIsStillConnected) {
        const matchingDeviceForClient = state.devices.filter(
          device => payload.query.device_id === device.serial,
        );
        if (matchingDeviceForClient.length === 0) {
          console.error(
            `Client initialised for non-displayed device: ${payload.id}`,
          );
        }
      }
      return state;
    }

    case 'CLIENT_REMOVED': {
      const {payload} = action;
      return updateSelection({
        ...state,
        clients: state.clients.filter(
          (client: Client) => client.id !== payload,
        ),
      });
    }

    case 'PREFER_DEVICE': {
      const {payload: userPreferredDevice} = action;
      return {...state, userPreferredDevice};
    }
    case 'SERVER_ERROR': {
      const {payload} = action;
      if (!payload) {
        return state;
      }
      return {...state, errors: mergeError(state.errors, payload)};
    }
    case 'START_CLIENT_SETUP': {
      const {payload} = action;
      return {
        ...state,
        uninitializedClients: state.uninitializedClients
          .filter(entry => !isEqual(entry.client, payload))
          .concat([{client: payload}])
          .sort((a, b) => a.client.appName.localeCompare(b.client.appName)),
      };
    }
    case 'FINISH_CLIENT_SETUP': {
      const {payload} = action;
      return {
        ...state,
        uninitializedClients: state.uninitializedClients
          .map(c =>
            isEqual(c.client, payload.client)
              ? {...c, deviceId: payload.deviceId}
              : c,
          )
          .sort((a, b) => a.client.appName.localeCompare(b.client.appName)),
      };
    }
    case 'CLIENT_SETUP_ERROR': {
      const {payload} = action;

      const errorMessage =
        payload.error instanceof Error
          ? payload.error.message
          : '' + payload.error;
      const details = `Client setup error: ${errorMessage} while setting up client: ${payload.client.os}:${payload.client.deviceName}:${payload.client.appName}`;
      console.error(details);
      return {
        ...state,
        uninitializedClients: state.uninitializedClients
          .map(c =>
            isEqual(c.client, payload.client)
              ? {...c, errorMessage: errorMessage}
              : c,
          )
          .sort((a, b) => a.client.appName.localeCompare(b.client.appName)),
        errors: mergeError(state.errors, {
          message: `Client setup error: ${errorMessage}`,
          details,
          error: payload.error instanceof Error ? payload.error : undefined,
        }),
      };
    }
    case 'DISMISS_ERROR': {
      const errors = state.errors.slice();
      errors.splice(action.payload, 1);
      return {
        ...state,
        errors,
      };
    }
    default:
      return state;
  }
};

export default (state: State = INITAL_STATE, action: Actions): State => {
  const nextState = reducer(state, action);

  if (nextState.selectedDevice) {
    const {selectedDevice} = nextState;
    const deviceNotSupportedErrorMessage = 'iOS Devices are not yet supported';
    const error =
      selectedDevice.os === 'iOS' &&
      selectedDevice.deviceType === 'physical' &&
      !iosUtil.isAvailable()
        ? deviceNotSupportedErrorMessage
        : null;

    if (error) {
      const deviceNotSupportedError = nextState.errors.find(
        error => error.message === deviceNotSupportedErrorMessage,
      );
      if (deviceNotSupportedError) {
        deviceNotSupportedError.message = error;
      } else {
        nextState.errors.push({message: error});
      }
    }
  }
  return nextState;
};

function mergeError(
  errors: FlipperError[],
  newError: FlipperError,
): FlipperError[] {
  const idx = errors.findIndex(error => error.message === newError.message);
  const results = errors.slice();
  if (idx !== -1) {
    results[idx] = {
      ...newError,
      occurrences: (errors[idx].occurrences || 0) + 1,
    };
  } else {
    results.push({
      ...newError,
      occurrences: 1,
    });
  }
  return results;
}

export const selectDevice = (payload: BaseDevice): Action => ({
  type: 'SELECT_DEVICE',
  payload,
});

export const setStaticView = (payload: StaticView): Action => ({
  type: 'SET_STATIC_VIEW',
  payload,
});

export const preferDevice = (payload: string): Action => ({
  type: 'PREFER_DEVICE',
  payload,
});

export const selectPlugin = (payload: {
  selectedPlugin: null | string;
  selectedApp?: null | string;
  deepLinkPayload: null | string;
}): Action => ({
  type: 'SELECT_PLUGIN',
  payload,
});

export const starPlugin = (payload: {
  selectedPlugin: string;
  selectedApp: string;
}): Action => ({
  type: 'STAR_PLUGIN',
  payload,
});

export const dismissError = (index: number): Action => ({
  type: 'DISMISS_ERROR',
  payload: index,
});

export const selectClient = (clientId: string): Action => ({
  type: 'SELECT_CLIENT',
  payload: clientId,
});

export function getAvailableClients(
  device: null | undefined | BaseDevice,
  clients: Client[],
): Client[] {
  if (!device) {
    return [];
  }
  return clients
    .filter(
      (client: Client) =>
        (device &&
          device.supportsOS(client.query.os) &&
          client.query.device_id === device.serial) ||
        // Old android sdk versions don't know their device_id
        // Display their plugins under all selected devices until they die out
        client.query.device_id === 'unknown',
    )
    .sort((a, b) => (a.query.app || '').localeCompare(b.query.app));
}

function getBestAvailableClient(
  device: BaseDevice | null | undefined,
  clients: Client[],
  preferredClient: string | null,
): Client | undefined {
  const availableClients = getAvailableClients(device, clients);
  if (availableClients.length === 0) {
    return undefined;
  }
  return (
    getClientById(availableClients, preferredClient) ||
    availableClients[0] ||
    null
  );
}

export function getClientById(
  clients: Client[],
  clientId: string | null | undefined,
): Client | undefined {
  return clients.find(client => client.id === clientId);
}

function canBeDefaultDevice(device: BaseDevice) {
  return !DEFAULT_DEVICE_BLACKLIST.some(
    blacklistedDevice => device instanceof blacklistedDevice,
  );
}

/**
 * This function, given the current state, tries to build to build the best
 * selection possible, preselection device if there is non, plugins based on preferences, etc
 * @param state
 */
function updateSelection(state: Readonly<State>): State {
  if (state.staticView && state.staticView !== WelcomeScreen) {
    return state;
  }

  const updates: Partial<State> = {
    staticView: null,
  };
  // Find the selected device if it still exists
  let device: BaseDevice | null =
    state.selectedDevice && state.devices.includes(state.selectedDevice)
      ? state.selectedDevice
      : null;
  if (!device) {
    device =
      state.devices.find(
        device => device.title === state.userPreferredDevice,
      ) ||
      state.devices.find(device => canBeDefaultDevice(device)) ||
      null;
  }
  updates.selectedDevice = device;
  if (!device) {
    updates.staticView = WelcomeScreen;
  }

  // Select client based on device
  const client = getBestAvailableClient(
    device,
    state.clients,
    state.selectedApp || state.userPreferredApp,
  );
  updates.selectedApp = client ? client.id : null;

  const availablePlugins: string[] = [
    ...(device?.devicePlugins || []),
    ...(client?.plugins || []),
    ...STATIC_PLUGINS_ID,
  ];

  if (
    // Try the preferred plugin first
    state.userPreferredPlugin &&
    availablePlugins.includes(state.userPreferredPlugin)
  ) {
    updates.selectedPlugin = state.userPreferredPlugin;
  } else if (
    !state.selectedPlugin ||
    !availablePlugins.includes(state.selectedPlugin)
  ) {
    // currently selected plugin is not available in this state,
    // fall back to the default
    updates.selectedPlugin = DEFAULT_PLUGIN;
  }

  return {...state, ...updates};
}
