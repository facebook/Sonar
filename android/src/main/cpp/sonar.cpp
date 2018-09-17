/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#include <memory>

#ifdef SONAR_OSS
#include <fbjni/fbjni.h>
#else
#include <fb/fbjni.h>
#endif

#include <folly/json.h>
#include <folly/io/async/EventBase.h>
#include <folly/io/async/EventBaseManager.h>

#include <Sonar/SonarClient.h>
#include <Sonar/SonarWebSocket.h>
#include <Sonar/SonarConnection.h>
#include <Sonar/SonarResponder.h>
#include <Sonar/SonarStateUpdateListener.h>
#include <Sonar/SonarState.h>

using namespace facebook;
using namespace facebook::flipper;

namespace {

class JEventBase : public jni::HybridClass<JEventBase> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/android/EventBase;";

  static void registerNatives() {
    registerHybrid({
        makeNativeMethod("initHybrid", JEventBase::initHybrid),
        makeNativeMethod("loopForever", JEventBase::loopForever),
    });
  }

  folly::EventBase* eventBase() {
    return &eventBase_;
  }

 private:
  friend HybridBase;

  JEventBase() {}

  void loopForever() {
    folly::EventBaseManager::get()->setEventBase(&eventBase_, false);
    eventBase_.loopForever();
  }

  static void initHybrid(jni::alias_ref<jhybridobject> o) {
    return setCxxInstance(o);
  }

  folly::EventBase eventBase_;
};

class JFlipperObject : public jni::JavaClass<JFlipperObject> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/core/SonarObject;";

  static jni::local_ref<JFlipperObject> create(const folly::dynamic& json) {
    return newInstance(folly::toJson(json));
  }

  std::string toJsonString() {
    static const auto method = javaClassStatic()->getMethod<std::string()>("toJsonString");
    return method(self())->toStdString();
  }
};

class JFlipperArray : public jni::JavaClass<JFlipperArray> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/core/SonarArray;";

  static jni::local_ref<JFlipperArray> create(const folly::dynamic& json) {
    return newInstance(folly::toJson(json));
  }

  std::string toJsonString() {
    static const auto method = javaClassStatic()->getMethod<std::string()>("toJsonString");
    return method(self())->toStdString();
  }
};

class JFlipperResponder : public jni::JavaClass<JFlipperResponder> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/core/SonarResponder;";
};

class JFlipperResponderImpl : public jni::HybridClass<JFlipperResponderImpl, JFlipperResponder> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/android/SonarResponderImpl;";

  static void registerNatives() {
    registerHybrid({
      makeNativeMethod("successObject", JFlipperResponderImpl::successObject),
      makeNativeMethod("successArray", JFlipperResponderImpl::successArray),
      makeNativeMethod("error", JFlipperResponderImpl::error),
    });
  }

  void successObject(jni::alias_ref<JFlipperObject> json) {
    _responder->success(json ? folly::parseJson(json->toJsonString()) : folly::dynamic::object());
  }

  void successArray(jni::alias_ref<JFlipperArray> json) {
    _responder->success(json ? folly::parseJson(json->toJsonString()) : folly::dynamic::object());
  }

  void error(jni::alias_ref<JFlipperObject> json) {
    _responder->error(json ? folly::parseJson(json->toJsonString()) : folly::dynamic::object());
  }

 private:
  friend HybridBase;
  std::shared_ptr<SonarResponder> _responder;

  JFlipperResponderImpl(std::shared_ptr<SonarResponder> responder): _responder(std::move(responder)) {}
};

class JFlipperReceiver : public jni::JavaClass<JFlipperReceiver> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/core/SonarReceiver;";

  void receive(const folly::dynamic params, std::shared_ptr<SonarResponder> responder) const {
    static const auto method = javaClassStatic()->getMethod<void(jni::alias_ref<JFlipperObject::javaobject>, jni::alias_ref<JFlipperResponder::javaobject>)>("onReceive");
    method(self(), JFlipperObject::create(std::move(params)), JFlipperResponderImpl::newObjectCxxArgs(responder));
  }
};

class JFlipperConnection : public jni::JavaClass<JFlipperConnection> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/core/SonarConnection;";
};

class JFlipperConnectionImpl : public jni::HybridClass<JFlipperConnectionImpl, JFlipperConnection> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/android/SonarConnectionImpl;";

  static void registerNatives() {
    registerHybrid({
      makeNativeMethod("sendObject", JFlipperConnectionImpl::sendObject),
      makeNativeMethod("sendArray", JFlipperConnectionImpl::sendArray),
      makeNativeMethod("reportError", JFlipperConnectionImpl::reportError),
      makeNativeMethod("receive", JFlipperConnectionImpl::receive),
    });
  }

  void sendObject(const std::string method, jni::alias_ref<JFlipperObject> json) {
    _connection->send(std::move(method), json ? folly::parseJson(json->toJsonString()) : folly::dynamic::object());
  }

  void sendArray(const std::string method, jni::alias_ref<JFlipperArray> json) {
    _connection->send(std::move(method), json ? folly::parseJson(json->toJsonString()) : folly::dynamic::object());
  }

  void reportError(jni::alias_ref<jni::JThrowable> throwable) {
    _connection->error(throwable->toString(), throwable->getStackTrace()->toString());
  }

  void receive(const std::string method, jni::alias_ref<JFlipperReceiver> receiver) {
    auto global = make_global(receiver);
    _connection->receive(std::move(method), [global] (const folly::dynamic& params, std::unique_ptr<SonarResponder> responder) {
      global->receive(params, std::move(responder));
    });
  }

 private:
  friend HybridBase;
  std::shared_ptr<SonarConnection> _connection;

  JFlipperConnectionImpl(std::shared_ptr<SonarConnection> connection): _connection(std::move(connection)) {}
};

class JFlipperPlugin : public jni::JavaClass<JFlipperPlugin> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/core/SonarPlugin;";

  std::string identifier() const {
    static const auto method = javaClassStatic()->getMethod<std::string()>("getId");
    return method(self())->toStdString();
  }

  void didConnect(std::shared_ptr<SonarConnection> conn) {
    static const auto method = javaClassStatic()->getMethod<void(jni::alias_ref<JFlipperConnection::javaobject>)>("onConnect");
    method(self(), JFlipperConnectionImpl::newObjectCxxArgs(conn));
  }

  void didDisconnect() {
    static const auto method = javaClassStatic()->getMethod<void()>("onDisconnect");
    method(self());
  }
};

class JFlipperStateUpdateListener : public jni::JavaClass<JFlipperStateUpdateListener> {
 public:
  constexpr static auto  kJavaDescriptor = "Lcom/facebook/sonar/core/SonarStateUpdateListener;";

  void onUpdate() {
    static const auto method = javaClassStatic()->getMethod<void()>("onUpdate");
    method(self());
  }
  void onStepStarted(std::string step) {
    static const auto method = javaClassStatic()->getMethod<void(std::string)>("onStepStarted");
    method(self(), step);
  }
  void onStepSuccess(std::string step) {
    static const auto method = javaClassStatic()->getMethod<void(std::string)>("onStepSuccess");
    method(self(), step);
  }
  void onStepFailed(std::string step, std::string errorMessage) {
    static const auto method = javaClassStatic()->getMethod<void(std::string, std::string)>("onStepFailed");
    method(self(), step, errorMessage);
  }
};

class AndroidFlipperStateUpdateListener : public SonarStateUpdateListener {
 public:
  AndroidFlipperStateUpdateListener(jni::alias_ref<JFlipperStateUpdateListener> stateListener);
  void onUpdate();

  private:
   jni::global_ref<JFlipperStateUpdateListener> jStateListener;
};

class JFlipperPluginWrapper : public SonarPlugin {
 public:
  jni::global_ref<JFlipperPlugin> jplugin;

  virtual std::string identifier() const override {
    return jplugin->identifier();
  }

  virtual void didConnect(std::shared_ptr<SonarConnection> conn) override {
    jplugin->didConnect(conn);
  }

  virtual void didDisconnect() override {
    jplugin->didDisconnect();
  }

  JFlipperPluginWrapper(jni::global_ref<JFlipperPlugin> plugin): jplugin(plugin) {}
};

struct JStateSummary : public jni::JavaClass<JStateSummary> {
public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/core/StateSummary;";

  static jni::local_ref<JStateSummary> create() {
    return newInstance();
  }

  void addEntry(std::string name, std::string state) {
    static const auto method = javaClassStatic()->getMethod<void(std::string, std::string)>("addEntry");
    return method(self(), name, state);
  }

};

class JSonarClient : public jni::HybridClass<JSonarClient> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/android/SonarClientImpl;";

  static void registerNatives() {
    registerHybrid({
      makeNativeMethod("init", JSonarClient::init),
      makeNativeMethod("getInstance", JSonarClient::getInstance),
      makeNativeMethod("start", JSonarClient::start),
      makeNativeMethod("stop", JSonarClient::stop),
      makeNativeMethod("addPlugin", JSonarClient::addPlugin),
      makeNativeMethod("removePlugin", JSonarClient::removePlugin),
      makeNativeMethod("subscribeForUpdates", JSonarClient::subscribeForUpdates),
      makeNativeMethod("unsubscribe", JSonarClient::unsubscribe),
      makeNativeMethod("getPlugin", JSonarClient::getPlugin),
      makeNativeMethod("getState", JSonarClient::getState),
      makeNativeMethod("getStateSummary", JSonarClient::getStateSummary),
    });
  }

  static jni::alias_ref<JSonarClient::javaobject> getInstance(jni::alias_ref<jclass>) {
    static auto client = make_global(newObjectCxxArgs());
  	return client;
  }

  void start() {
  	SonarClient::instance()->start();
  }

  void stop() {
  	SonarClient::instance()->stop();
  }

  void addPlugin(jni::alias_ref<JFlipperPlugin> plugin) {
    auto wrapper = std::make_shared<JFlipperPluginWrapper>(make_global(plugin));
    SonarClient::instance()->addPlugin(wrapper);
  }

  void removePlugin(jni::alias_ref<JFlipperPlugin> plugin) {
    auto client = SonarClient::instance();
    client->removePlugin(client->getPlugin(plugin->identifier()));
  }

  void subscribeForUpdates(jni::alias_ref<JFlipperStateUpdateListener> stateListener) {
    auto client = SonarClient::instance();
    mStateListener = std::make_shared<AndroidFlipperStateUpdateListener>(stateListener);
    client->setStateListener(mStateListener);
  }

  void unsubscribe() {
    auto client = SonarClient::instance();
    mStateListener = nullptr;
    client->setStateListener(nullptr);
  }

  std::string getState() {
    return SonarClient::instance()->getState();
  }

  jni::global_ref<JStateSummary::javaobject> getStateSummary() {
    auto summary = jni::make_global(JStateSummary::create());
    auto elements = SonarClient::instance()->getStateElements();
    for (auto&& element : elements) {
      std::string status;
      switch (element.state_) {
        case State::in_progress: status = "IN_PROGRESS"; break;
        case State::failed: status = "FAILED"; break;
        case State::success: status = "SUCCESS"; break;
      }
      summary->addEntry(element.name_, status);
    }
    return summary;
  }

  jni::alias_ref<JFlipperPlugin> getPlugin(const std::string& identifier) {
    auto plugin = SonarClient::instance()->getPlugin(identifier);
    if (plugin) {
      auto wrapper = std::static_pointer_cast<JFlipperPluginWrapper>(plugin);
      return wrapper->jplugin;
    } else {
      return nullptr;
    }
  }

  static void init(
      jni::alias_ref<jclass>,
      JEventBase* callbackWorker,
      JEventBase* connectionWorker,
      const std::string host,
      const std::string os,
      const std::string device,
      const std::string deviceId,
      const std::string app,
      const std::string appId,
      const std::string privateAppDirectory) {

    SonarClient::init({
      {
        std::move(host),
        std::move(os),
        std::move(device),
        std::move(deviceId),
        std::move(app),
        std::move(appId),
        std::move(privateAppDirectory)
      },
      callbackWorker->eventBase(),
      connectionWorker->eventBase()
    });
  }

 private:
  friend HybridBase;
  std::shared_ptr<SonarStateUpdateListener> mStateListener = nullptr;
  JSonarClient() {}
};

} // namespace

jint JNI_OnLoad(JavaVM* vm, void*) {
  return jni::initialize(vm, [] {
    JSonarClient::registerNatives();
    JFlipperConnectionImpl::registerNatives();
    JFlipperResponderImpl::registerNatives();
    JEventBase::registerNatives();
  });
}

AndroidFlipperStateUpdateListener::AndroidFlipperStateUpdateListener(jni::alias_ref<JFlipperStateUpdateListener> stateListener) {
  jStateListener = jni::make_global(stateListener);
}

void AndroidFlipperStateUpdateListener::onUpdate() {
  jStateListener->onUpdate();
}
