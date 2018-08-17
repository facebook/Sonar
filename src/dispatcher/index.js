/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import androidDevice from './androidDevice';
import iOSDevice from './iOSDevice';
import remoteDevice from './remoteDevice';
import windowsDevice from './windowsDevice';
import application from './application';
import tracking from './tracking';
import server from './server';

import type Logger from '../fb-stubs/Logger.js';
import type {Store} from '../reducers/index.js';

export default (store: Store, logger: Logger) =>
  [
    application,
    androidDevice,
    iOSDevice,
    remoteDevice,
    windowsDevice,
    tracking,
    server,
  ].forEach(fn => fn(store, logger));
