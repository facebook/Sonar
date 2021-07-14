# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

folly_compiler_flags = '-DDEBUG=1 -DFLIPPER_OSS=1 -DFB_SONARKIT_ENABLED=1 -DFOLLY_HAVE_BACKTRACE=1 -DFOLLY_HAVE_CLOCK_GETTIME=1 -DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_HAVE_LIBGFLAGS=0 -DFOLLY_HAVE_LIBJEMALLOC=0 -DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0'
yogakit_version = '~> 1.18'
flipperkit_version = '0.96.1'
Pod::Spec.new do |spec|
  spec.name = 'FlipperKit'
  spec.version = flipperkit_version
  spec.license = { :type => 'MIT' }
  spec.homepage = 'https://github.com/facebook/flipper'
  spec.summary = 'Sonar iOS podspec'
  spec.authors = 'Facebook'
  spec.static_framework = true
  spec.source = { :git => 'https://github.com/facebook/flipper.git',
                  :tag=> "v"+flipperkit_version }
  spec.module_name = 'FlipperKit'
  spec.platforms = { :ios => "10.0" }
  spec.default_subspecs = "Core"

  # This subspec is necessary since FBDefines.h is imported as <FBDefines/FBDefines.h>
  # inside SKMacros.h, which is a public header file. Defining this directory as a
  # subspec with header_dir = 'FBDefines' allows this to work, even though it wouldn't
  # generally (you would need to import <FlipperKit/t/FBDefines/FBDefines.h>)
  spec.subspec 'FBDefines' do |ss|
    ss.header_dir = 'FBDefines'
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/FBDefines/**/*.h'
    ss.public_header_files = 'iOS/FBDefines/**/*.h'
  end

  spec.subspec 'CppBridge' do |ss|
    ss.header_dir = 'CppBridge'
    ss.dependency 'Flipper', '~>'+flipperkit_version
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/FlipperKit/CppBridge/**/*.{h}'
    # We set these files as private headers since they only need to be accessed
    # by other FlipperKit source files
    ss.private_header_files = 'iOS/FlipperKit/CppBridge/**/*.h'
    ss.preserve_path = 'iOS/FlipperKit/CppBridge/**/*.h'
    header_search_paths = "\"$(PODS_ROOT)/Flipper-Boost-iOSX\" \"$(PODS_ROOT)/Flipper-DoubleConversion\" \"$(PODS_ROOT)/FlipperKit/iOS/**/\" \"$(PODS_ROOT)/libevent/include\""
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                                "ONLY_ACTIVE_ARCH": "YES",
                             "DEFINES_MODULE" => "YES",
                             "HEADER_SEARCH_PATHS" => header_search_paths }
  end

  spec.subspec 'FBCxxFollyDynamicConvert' do |ss|
    ss.header_dir = 'FBCxxFollyDynamicConvert'
    ss.compiler_flags = folly_compiler_flags
    ss.dependency 'Flipper-Folly', '~> 2.6'
    ss.source_files = 'iOS/FlipperKit/FBCxxFollyDynamicConvert/**/*.{h,mm}'
    # We set these files as private headers since they only need to be accessed
    # by other FlipperKit source files
    ss.private_header_files = 'iOS/FlipperKit/FBCxxFollyDynamicConvert/**/*.h'
    header_search_paths = "\"$(PODS_ROOT)/Flipper-Boost-iOSX\" \"$(PODS_ROOT)/Flipper-DoubleConversion\" \"$(PODS_ROOT)/libevent/include\""
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                               "ONLY_ACTIVE_ARCH": "YES",
                               "DEFINES_MODULE" => "YES",
                             "HEADER_SEARCH_PATHS" => header_search_paths }
  end

  spec.subspec "FKPortForwarding" do |ss|
    ss.header_dir = "FKPortForwarding"
    ss.dependency 'CocoaAsyncSocket', '~> 7.6'
    ss.dependency 'Flipper-PeerTalk', '~>0.0.4'
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/FlipperKit/FKPortForwarding/FKPortForwarding{Server,Common}.{h,m}'
    ss.private_header_files = 'iOS/FlipperKit/FKPortForwarding/FKPortForwarding{Server,Common}.h'
  end

  spec.subspec "Core" do |ss|
    ss.dependency 'FlipperKit/FBDefines'
    ss.dependency 'FlipperKit/FBCxxFollyDynamicConvert'
    ss.dependency 'FlipperKit/CppBridge'
    ss.dependency 'FlipperKit/FKPortForwarding'
    ss.dependency 'Flipper', '~>'+flipperkit_version
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/FlipperKit/*.{h,m,mm}', 'iOS/FlipperKit/CppBridge/*.{h,mm}'
    ss.public_header_files = 'iOS/FlipperKit/**/{FlipperDiagnosticsViewController,FlipperStateUpdateListener,FlipperClient,FlipperPlugin,FlipperConnection,FlipperResponder,SKMacros,FlipperKitCertificateProvider}.h'
    header_search_paths = "\"$(PODS_ROOT)/FlipperKit/iOS/FlipperKit/\" \"$(PODS_ROOT)/Headers/Private/FlipperKit/\" \"$(PODS_ROOT)/Flipper-Boost-iOSX\" \"$(PODS_ROOT)/libevent/include\""
    ss.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                               "ONLY_ACTIVE_ARCH": "YES",
                               "DEFINES_MODULE" => "YES",
                               "HEADER_SEARCH_PATHS" => header_search_paths }
    ss.xcconfig = { "GCC_PREPROCESSOR_DEFINITIONS" => "FB_SONARKIT_ENABLED=1", "OTHER_SWIFT_FLAGS" => "-Xcc -DFB_SONARKIT_ENABLED=1" }
  end

  spec.subspec 'FlipperKitHighlightOverlay' do |ss|
    ss.header_dir = 'FlipperKitHighlightOverlay'
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/Plugins/FlipperKitPluginUtils/FlipperKitHighlightOverlay/SKHighlightOverlay.{h,mm}'
    ss.public_header_files = 'iOS/Plugins/FlipperKitPluginUtils/FlipperKitHighlightOverlay/SKHighlightOverlay.h'
  end

  spec.subspec 'FlipperKitLayoutTextSearchable' do |ss|
    ss.header_dir = 'FlipperKitLayoutTextSearchable'
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutTextSearchable/FKTextSearchable.h'
    ss.public_header_files = 'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutTextSearchable/FKTextSearchable.h'
  end

  spec.subspec 'FlipperKitLayoutHelpers' do |ss|
    ss.header_dir = 'FlipperKitLayoutHelpers'
    ss.dependency 'FlipperKit/Core'
    ss.dependency 'FlipperKit/FlipperKitLayoutTextSearchable'
    ss.dependency 'FlipperKit/FlipperKitHighlightOverlay'
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/Plugins/FlipperKitPluginUtils/FlipperKitLayoutHelpers/**/**/*.{h,mm,m}'
    ss.public_header_files = 'iOS/Plugins/FlipperKitPluginUtils/FlipperKitLayoutHelpers/FlipperKitLayoutHelpers/SKTapListener.h',
                              'iOS/Plugins/FlipperKitPluginUtils/FlipperKitLayoutHelpers/FlipperKitLayoutHelpers/SKInvalidation.h',
                              'iOS/Plugins/FlipperKitPluginUtils/FlipperKitLayoutHelpers/FlipperKitLayoutHelpers/FlipperKitLayoutDescriptorMapperProtocol.h',
                              'iOS/Plugins/FlipperKitPluginUtils/FlipperKitLayoutHelpers/FlipperKitLayoutHelpers/SKNodeDescriptor.h',
                              'iOS/Plugins/FlipperKitPluginUtils/FlipperKitLayoutHelpers/FlipperKitLayoutHelpers/SKTouch.h',
                              'iOS/Plugins/FlipperKitPluginUtils/FlipperKitLayoutHelpers/FlipperKitLayoutHelpers/SKNamed.h'
    ss.private_header_files = 'iOS/Plugins/FlipperKitPluginUtils/FlipperKitLayoutHelpers/FlipperKitLayoutHelpers/SKObject.h',
                              'iOS/Plugins/FlipperKitPluginUtils/FlipperKitLayoutHelpers/FlipperKitLayoutHelpers/UIColor+SKSonarValueCoder.h',
                              'iOS/Plugins/FlipperKitPluginUtils/FlipperKitLayoutHelpers/FlipperKitLayoutHelpers/utils/SKObjectHash.h',
                              'iOS/Plugins/FlipperKitPluginUtils/FlipperKitLayoutHelpers/FlipperKitLayoutHelpers/utils/SKSwizzle.h',
                              'iOS/Plugins/FlipperKitPluginUtils/FlipperKitLayoutHelpers/FlipperKitLayoutHelpers/utils/SKYogaKitHelper.h'
  end

  spec.subspec 'FlipperKitLayoutIOSDescriptors' do |ss|
    ss.header_dir = 'FlipperKitLayoutIOSDescriptors'
    ss.dependency 'FlipperKit/Core'
    ss.dependency 'FlipperKit/FlipperKitHighlightOverlay'
    ss.dependency 'FlipperKit/FlipperKitLayoutHelpers'
    ss.dependency 'YogaKit', yogakit_version
    ss.compiler_flags = folly_compiler_flags
    ss.source_files = 'iOS/Plugins/FlipperKitPluginUtils/FlipperKitLayoutIOSDescriptors/**/*.{h,mm,m}'
  end

  spec.subspec "FlipperKitLayoutPlugin" do |ss|
    ss.header_dir = "FlipperKitLayoutPlugin"
    ss.dependency             'FlipperKit/Core'
    ss.dependency             'FlipperKit/FlipperKitLayoutTextSearchable'
    ss.dependency             'FlipperKit/FlipperKitHighlightOverlay'
    ss.dependency             'FlipperKit/FlipperKitLayoutHelpers'
    ss.dependency             'FlipperKit/FlipperKitLayoutIOSDescriptors'
    ss.dependency             'YogaKit', yogakit_version
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files  = 'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h',
                              'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/SKDescriptorMapper.h'
    ss.source_files         = 'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/**/*.{h,cpp,m,mm}'
    ss.exclude_files        = ['iOS/Plugins/FlipperKitLayoutPlugin/fb/*','iOS/Plugins/FlipperKitLayoutPlugin/facebook/*','iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/fb/*' ,'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin/facebook/*']
    ss.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/FlipperKit/**", "ONLY_ACTIVE_ARCH": "YES" }
  end

  spec.subspec "FlipperKitLayoutComponentKitSupport" do |ss|
    ss.header_dir = "FlipperKitLayoutComponentKitSupport"
    ss.dependency             'FlipperKit/Core'
    ss.dependency             'ComponentKit', '0.31'
    ss.dependency             'RenderCore', '0.31' # Pinning it to 0.30, as there won't be any new releases from CK team.
    ss.dependency             'FlipperKit/FlipperKitLayoutPlugin'
    ss.dependency             'FlipperKit/FlipperKitLayoutTextSearchable'
    ss.dependency             'FlipperKit/FlipperKitHighlightOverlay'
    ss.dependency             'FlipperKit/FlipperKitLayoutHelpers'
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutComponentKitSupport/FlipperKitLayoutComponentKitSupport.h',
                             'iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutComponentKitSupport/SKSubDescriptor.h'
    ss.source_files         = "iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutComponentKitSupport/**/*.{h,cpp,m,mm}"
    ss.exclude_files        = ['iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutComponentKitSupport/fb/*','iOS/Plugins/FlipperKitLayoutPlugin/FlipperKitLayoutComponentKitSupport/facebook/*']
    ss.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/FlipperKit/**","ONLY_ACTIVE_ARCH": "YES" }

  end

  spec.subspec "FlipperKitNetworkPlugin" do |ss|
    ss.header_dir = "FlipperKitNetworkPlugin"
    ss.dependency             'FlipperKit/Core'
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin/SKBufferingPlugin.h',
                             'iOS/Plugins/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin/SKNetworkReporter.h',
                             'iOS/Plugins/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin/SKRequestInfo.h',
                             'iOS/Plugins/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin/SKResponseInfo.h',
                             'iOS/Plugins/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin.h'
    ss.source_files         = "iOS/Plugins/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/FlipperKit/**" }
  end

  spec.subspec "SKIOSNetworkPlugin" do |ss|
    ss.header_dir = "SKIOSNetworkPlugin"
    ss.dependency 'FlipperKit/Core'
    ss.dependency 'FlipperKit/FlipperKitNetworkPlugin'
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/FlipperKitNetworkPlugin/SKIOSNetworkPlugin/SKIOSNetworkAdapter.h'
    ss.source_files         = "iOS/Plugins/FlipperKitNetworkPlugin/SKIOSNetworkPlugin/**/*.{h,cpp,m,mm}"
    ss.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/FlipperKit/**" }
  end

  spec.subspec "FlipperKitUserDefaultsPlugin" do |ss|
    ss.header_dir = "FlipperKitUserDefaultsPlugin"
    ss.dependency 'FlipperKit/Core'
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/FlipperKitUserDefaultsPlugin/FKUserDefaultsPlugin.h'
    ss.source_files         = "iOS/Plugins/FlipperKitUserDefaultsPlugin/**/*.{h,m}"
    ss.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/FlipperKit/**" }
  end

  spec.subspec "FlipperKitExamplePlugin" do |ss|
    ss.header_dir = "FlipperKitExamplePlugin"
    ss.dependency 'FlipperKit/Core'
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/FlipperKitExamplePlugin/FlipperKitExamplePlugin.h'
    ss.source_files         = "iOS/Plugins/FlipperKitExamplePlugin/**/*.{h,mm}"
    ss.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/FlipperKit/**" }
  end

  spec.subspec "FlipperKitReactPlugin" do |ss|
    ss.header_dir = "FlipperKitReactPlugin"
    ss.dependency 'FlipperKit/Core'
    ss.compiler_flags       = folly_compiler_flags
    ss.public_header_files = 'iOS/Plugins/FlipperKitReactPlugin/FlipperKitReactPlugin.h'
    ss.source_files         = "iOS/Plugins/FlipperKitReactPlugin/**/FlipperKitReactPlugin.{h,m}"
    ss.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)\"/Headers/Private/FlipperKit/**" }
  end
end
