# Flipper [![Build Status](https://travis-ci.org/facebook/flipper.svg?branch=master)](https://travis-ci.org/facebook/flipper)

---

**Flipper, formerly Sonar, is currently in the process of being renamed. This may cause some inconsistencies until everything is in place. We apologize for any inconvience caused.**

---

Flipper is a platform for debugging mobile apps on iOS and Android. Visualize, inspect, and control your apps from a simple desktop interface. Use Flipper as is or extend it using the plugin API.

![Flipper](/website/static/img/splash@2x.png)

## Mobile development

Flipper aims to be your number one companion for mobile app development on iOS and Android. Therefore, we provide a bunch of useful tools including a log viewer, interactive layout inspector, and network inspector.

## Extending Flipper

Flipper is built as a platform. In addition to using the tools already included, you can create your own plugins to visualize and debug data from your mobile apps. Flipper takes care of sending data back and forth, calling functions, and listening for events on the mobile app.

## Contributing to Flipper

Both Flipper's desktop app and native mobile SDKs are open-source and MIT licensed. This enables you to see and understand how we are building plugins, and of course join the community and help improve Flipper. We are excited to see what you will build on this platform.

# In this repo

This repository includes all parts of Flipper. This includes:

* Flipper's desktop app built using [Electron](https://electronjs.org) (`/src`)
* native Flipper SDKs for iOS (`/iOS`)
* native Flipper SDKs for Android (`/android`)
* Plugins:
  * Logs (`/src/device-plugins/logs`)
  * Layout inspector (`/src/plugins/layout`)
  * Network inspector (`/src/plugins/network`)
* website and documentation (`/website` / `/docs`)

# Getting started

Please refer to our [Getting Started guide](https://fbflipper.com/docs/getting-started.html) to set up Flipper.

## Requirements

* macOS (while Flipper is buildable using other systems as well, only macOS is officially supported)
* node >= 8
* yarn >= 1.5
* iOS developer tools (for developing iOS plugins)
* Android SDK and adb

# Building from Source

## Desktop
### Running from source

```
git clone https://github.com/facebook/flipper.git
cd flipper
yarn
yarn start
```

NOTE: If you're on Windows, you need to use Yarn 1.5.1 until [this issue](https://github.com/yarnpkg/yarn/issues/6048) is resolved.

### Building standalone application

```
yarn build --mac --version $buildNumber
```
## iOS SDK + Sample App

```
cd iOS/Sample
pod install
open Sample.xcworkspace
<Run app from xcode>
```

## Android SDK + Sample app

Start up an android emulator and run the following in the project root:
```
./gradlew :sample:installDebug
```

## Documentation

Find the full documentation for this project at [fbflipper.com](https://fbflipper.com/docs).

## Contributing and license

See the CONTRIBUTING file for how to help out.
Flipper is MIT licensed, as found in the LICENSE file.
