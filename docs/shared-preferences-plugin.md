---
id: shared-preferences-plugin
title: Shared Preferences
---

Easily inspect and modify the data contained within your app's shared preferences.

![Shared Preferences Plugin](/docs/assets/shared-preferences.png)

## Setup

This plugin is available for both Android and iOS.

### Android

```java
import com.facebook.flipper.plugins.sharedpreferences.SharedPreferencesFlipperPlugin;

client.addPlugin(
    new SharedPreferencesFlipperPlugin(context, "my_shared_preference_file"));
```

### iOS

#### Swift

```swift
import FlipperKit
client?.add(FKUserDefaultsPlugin.init(suiteName: "your_suitename"))
```

#### Objective-c

```objc
#import <FlipperKitUserDefaultsPlugin/FKUserDefaultsPlugin.h>
[client addPlugin:[[FKUserDefaultsPlugin alloc] initWithSuiteName:@"your_suitename"]];
```

## Usage

All changes to the given shared preference file will automatically appear in Flipper. You may also edit the values in Flipper and have them synced to your device. This can be done by clicking on the value of the specific key you wish to edit, editing the value and then pressing enter.
