def flipper_post_install(installer)
  installer.pods_project.targets.each do |target|
    if target.name == 'YogaKit'
      target.build_configurations.each do |config|
        config.build_settings['SWIFT_VERSION'] = '4.1'
      end
    end
  end
end


def use_flipper!(versions = {}, configurations: ['Debug'])
  versions['Flipper'] ||= '0.93.0'
  versions['Flipper-Boost-iOSX'] ||= '1.76.0.1.11'
  versions['Flipper-DoubleConversion'] ||= '3.1.7'
  versions['Flipper-Fmt'] ||= '7.1.7'
  versions['Flipper-Folly'] ||= '2.6.7'
  versions['Flipper-Glog'] ||= '0.3.6'
  versions['Flipper-PeerTalk'] ||= '0.0.4'
  versions['Flipper-RSocket'] ||= '1.4.3'
  pod 'FlipperKit', versions['Flipper'], :configurations => configurations
  pod 'FlipperKit/FlipperKitLayoutPlugin', versions['Flipper'], :configurations => configurations
  pod 'FlipperKit/SKIOSNetworkPlugin', versions['Flipper'], :configurations => configurations
  pod 'FlipperKit/FlipperKitUserDefaultsPlugin', versions['Flipper'], :configurations => configurations
  pod 'FlipperKit/FlipperKitReactPlugin', versions['Flipper'], :configurations => configurations
  # List all transitive dependencies for FlipperKit pods
  # to avoid them being linked in Release builds
  pod 'Flipper', versions['Flipper'], :configurations => configurations
  pod 'Flipper-Boost-iOSX', versions['Flipper-Boost-iOSX'], :configurations => configurations
  pod 'Flipper-DoubleConversion', versions['Flipper-DoubleConversion'], :configurations => configurations
  pod 'Flipper-Fmt', versions['Flipper-Fmt'], :configurations => configurations
  pod 'Flipper-Folly', versions['Flipper-Folly'], :configurations => configurations
  pod 'Flipper-Glog', versions['Flipper-Glog'], :configurations => configurations
  pod 'Flipper-PeerTalk', versions['Flipper-PeerTalk'], :configurations => configurations
  pod 'Flipper-RSocket', versions['Flipper-RSocket'], :configurations => configurations
  pod 'FlipperKit/Core', versions['Flipper'], :configurations => configurations
  pod 'FlipperKit/CppBridge', versions['Flipper'], :configurations => configurations
  pod 'FlipperKit/FBCxxFollyDynamicConvert', versions['Flipper'], :configurations => configurations
  pod 'FlipperKit/FBDefines', versions['Flipper'], :configurations => configurations
  pod 'FlipperKit/FKPortForwarding', versions['Flipper'], :configurations => configurations
  pod 'FlipperKit/FlipperKitHighlightOverlay', versions['Flipper'], :configurations => configurations
  pod 'FlipperKit/FlipperKitLayoutTextSearchable', versions['Flipper'], :configurations => configurations
  pod 'FlipperKit/FlipperKitNetworkPlugin', versions['Flipper'], :configurations => configurations
end