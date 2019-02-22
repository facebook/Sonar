/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const {spawn} = require('child_process');

const isProduction = () =>
  !/node_modules[\\/]electron[\\/]/.test(process.execPath);

const isLauncherInstalled = () => {
  if (os.type() == 'Darwin') {
    const receipt = 'com.facebook.flipper.launcher';
    const plistLocation = '/Applications/Flipper.app/Contents/Info.plist';
    return (
      fs.existsSync(plistLocation) &&
      fs.readFileSync(plistLocation).indexOf(receipt) > 0
    );
  }

  return false;
};

const startLauncher = () => {
  if (os.type() == 'Darwin') {
    spawn('open', ['/Applications/Flipper.app']);
  }
};

module.exports = function(argv) {
  if (argv.launcher && isProduction() && isLauncherInstalled()) {
    console.warn('Delegating to Flipper Launcher ...');
    console.warn(
      `You can disable this behavior by passing '--no-launcher' at startup.`,
    );
    startLauncher();
    process.exit(0);
  }

  if (!process.env.ANDROID_HOME) {
    process.env.ANDROID_HOME = '/opt/android_sdk';
  }

  // emulator/emulator is more reliable than tools/emulator, so prefer it if
  // it exists
  process.env.PATH = `${process.env.ANDROID_HOME}/emulator:${
    process.env.ANDROID_HOME
  }/tools:${process.env.PATH}`;

  // ensure .flipper folder and config exist
  const flipperDir = path.join(os.homedir(), '.flipper');
  if (!fs.existsSync(flipperDir)) {
    fs.mkdirSync(flipperDir);
  }

  const configPath = path.join(flipperDir, 'config.json');
  let config = {
    pluginPaths: [],
    disabledPlugins: [],
    lastWindowPosition: {},
  };

  try {
    config = {
      ...config,
      ...JSON.parse(fs.readFileSync(configPath)),
    };
  } catch (e) {
    // file not readable or not parsable, overwrite it with the new config
    fs.writeFileSync(configPath, JSON.stringify(config));
  }

  // Non-persistent CLI arguments.
  config = {
    ...config,
    updaterEnabled: argv.updater,
    launcherMsg: argv.launcherMsg,
  };

  return {config, configPath, flipperDir};
};
