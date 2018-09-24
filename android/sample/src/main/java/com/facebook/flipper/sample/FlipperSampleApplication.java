// Copyright 2004-present Facebook. All Rights Reserved.

package com.facebook.flipper.sample;

import android.app.Application;
import android.content.Context;
import com.facebook.litho.config.ComponentsConfiguration;
import com.facebook.soloader.SoLoader;
import com.facebook.flipper.android.AndroidFlipperClient;
import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.plugins.inspector.DescriptorMapping;
import com.facebook.flipper.plugins.inspector.InspectorFlipperPlugin;
import com.facebook.flipper.plugins.leakcanary.LeakCanaryFlipperPlugin;
import com.facebook.flipper.plugins.litho.LithoFlipperDescriptors;
import com.facebook.flipper.plugins.network.NetworkFlipperPlugin;
import com.facebook.flipper.plugins.network.FlipperOkhttpInterceptor;
import com.facebook.flipper.plugins.sharedpreferences.SharedPreferencesFlipperPlugin;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;

public class FlipperSampleApplication extends Application {

  public static OkHttpClient okhttpClient;

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, false);

    final FlipperClient client = AndroidFlipperClient.getInstance(this);
    final DescriptorMapping descriptorMapping = DescriptorMapping.withDefaults();

    NetworkFlipperPlugin networkPlugin = new NetworkFlipperPlugin();
    FlipperOkhttpInterceptor interceptor = new FlipperOkhttpInterceptor(networkPlugin);

    okhttpClient = new OkHttpClient.Builder()
    .addNetworkInterceptor(interceptor)
    .connectTimeout(60, TimeUnit.SECONDS)
    .readTimeout(60, TimeUnit.SECONDS)
    .writeTimeout(10, TimeUnit.MINUTES)
    .build();

    // Normally, you would want to make this dependent on a BuildConfig flag, but
    // for this demo application we can safely assume that you always want to debug.
    ComponentsConfiguration.isDebugModeEnabled = true;
    LithoFlipperDescriptors.add(descriptorMapping);
    client.addPlugin(new InspectorFlipperPlugin(this, descriptorMapping));
    client.addPlugin(networkPlugin);
    client.addPlugin(new SharedPreferencesFlipperPlugin(this, "sample"));
    client.addPlugin(new LeakCanaryFlipperPlugin());
    client.start();

    getSharedPreferences("sample", Context.MODE_PRIVATE).edit().putString("Hello", "world").apply();
  }
}
