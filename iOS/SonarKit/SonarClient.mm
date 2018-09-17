/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#if FB_SONARKIT_ENABLED

#import "SonarClient.h"
#import "SonarCppWrapperPlugin.h"
#import <Sonar/SonarClient.h>
#include <folly/io/async/EventBase.h>
#include <folly/io/async/ScopedEventBaseThread.h>
#import <UIKit/UIKit.h>
#include "SKStateUpdateCPPWrapper.h"
#import "FlipperDiagnosticsViewController.h"

#if !TARGET_OS_SIMULATOR
//#import "SKPortForwardingServer.h"
#endif

using WrapperPlugin = facebook::flipper::SonarCppWrapperPlugin;

@implementation SonarClient {
  facebook::flipper::SonarClient *_cppClient;
  folly::ScopedEventBaseThread sonarThread;
  folly::ScopedEventBaseThread connectionThread;
#if !TARGET_OS_SIMULATOR
 // SKPortForwardingServer *_server;
#endif
}

+ (instancetype)sharedClient
{
  static SonarClient *sharedClient = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    sharedClient = [[self alloc] init];
  });
  return sharedClient;
}

- (instancetype)init
{
  if (self = [super init]) {
    UIDevice *device = [UIDevice currentDevice];
    NSString *deviceName = [device name];
    NSString *appName = [[NSBundle mainBundle] objectForInfoDictionaryKey:(NSString *)kCFBundleNameKey];
    NSString *appId = appName;
    NSString *privateAppDirectory = NSSearchPathForDirectoriesInDomains(NSApplicationSupportDirectory, NSUserDomainMask, YES)[0];

    NSFileManager *manager = [NSFileManager defaultManager];

    if ([manager fileExistsAtPath:privateAppDirectory isDirectory:NULL] == NO) {
      //TODO: Handle errors properly
      [manager createDirectoryAtPath:privateAppDirectory withIntermediateDirectories:YES attributes:nil error:nil];
    }

#if TARGET_OS_SIMULATOR
    deviceName = [NSString stringWithFormat:@"%@ %@", [[UIDevice currentDevice] model], @"Simulator"];
#endif

    facebook::flipper::SonarClient::init({
      {
        "localhost",
        "iOS",
        [deviceName UTF8String],
        "unknown",
        [appName UTF8String],
        [appId UTF8String],
        [privateAppDirectory UTF8String],
      },
      sonarThread.getEventBase(),
      connectionThread.getEventBase()
    });
    _cppClient = facebook::flipper::SonarClient::instance();
  }
  return self;
}

- (void)refreshPlugins
{
  _cppClient->refreshPlugins();
}

- (void)addPlugin:(NSObject<SonarPlugin> *)plugin
{
  _cppClient->addPlugin(std::make_shared<WrapperPlugin>(plugin));
}

- (void)removePlugin:(NSObject<SonarPlugin> *)plugin
{
  _cppClient->removePlugin(std::make_shared<WrapperPlugin>(plugin));
}

- (NSObject<SonarPlugin> *)pluginWithIdentifier:(NSString *)identifier
{
  auto cppPlugin = _cppClient->getPlugin([identifier UTF8String]);
  if (auto wrapper = dynamic_cast<WrapperPlugin *>(cppPlugin.get())) {
    return wrapper->getObjCPlugin();
  }
  return nil;
}

- (void)start;
{
#if !TARGET_OS_SIMULATOR
  // _server = [SKPortForwardingServer new];
  // [_server forwardConnectionsFromPort:8088];
  // [_server listenForMultiplexingChannelOnPort:8078];
#endif
  _cppClient->start();
}

- (void)stop
{
  _cppClient->stop();
#if !TARGET_OS_SIMULATOR
  // [_server close];
  // _server = nil;
#endif
}

- (NSString *)getState {
  return @(_cppClient->getState().c_str());
}

- (NSArray *)getStateElements {
  NSMutableArray<NSDictionary<NSString *, NSString *>*> *const array = [NSMutableArray array];

  for (facebook::flipper::StateElement element: _cppClient->getStateElements()) {
    facebook::flipper::State state = element.state_;
    NSString *stateString;
    switch (state) {
      case facebook::flipper::in_progress:
        stateString = @"⏳ ";
        break;

      case facebook::flipper::success:
        stateString = @"✅ ";
        break;

      case facebook::flipper::failed:
        stateString = @"❌ ";
        break;

      default:
        stateString = @"❓ ";
        break;
    }
    [array addObject:@{
                       @"name": [NSString stringWithUTF8String:element.name_.c_str()],
                       @"state": stateString
                       }];
  }
  return array;
}

- (void)subscribeForUpdates:(id<FlipperStateUpdateListener>)controller {
  auto stateListener = std::make_shared<SKStateUpdateCPPWrapper>(controller);
  _cppClient->setStateListener(stateListener);
}

@end

#endif
