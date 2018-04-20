---
id: understand
title: Understanding Sonar
sidebar_label: Understanding Sonar
---

The Sonar desktop app and the mobile native SDK establish a web-socket connection which is used to send data to and from the device. Sonar does not make any restrictions on what kind of data is being sent. This enables a lot of different use-cases where you want to better understand what is going inside your app. For example you can visualize the state of local caches, events happening or trigger actions on your app from the desktop.

## Plugins

Sonar itself only provides the architectural platform. What makes it useful are the plugins built on top of this: [Logs](logs-plugin.md), [Layout Inspector](layout-plugin.md) or [Network Inspector](network-plugin.md) are all plugins. Plugins can be built very specific to your business logic and the use-cases you have in your app. We are shipping Sonar with a couple of built in plugins, but you can also go ahead and build your own.

A plugin always consists of the native implementation sending and receiving data and the desktop plugin visualizing data in most cases. Learn more on how to [create a plugin](create-plugin.md). The native implementations are usually written in Java or Objective-C, the desktop UI is written in React.
