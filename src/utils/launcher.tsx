/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {ProcessConfig} from './processConfig';
import {Store} from '../reducers/index';

export function initLauncherHooks(config: ProcessConfig, store: Store) {
  if (config.launcherMsg) {
    store.dispatch({
      type: 'LAUNCHER_MSG',
      payload: {
        severity: 'warning',
        message: config.launcherMsg,
      },
    });
  }
}
