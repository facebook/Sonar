Pod::Spec.new do |spec|
  spec.name = 'Sonar'
  spec.version = '1.0.0'
  spec.license = { :type => 'MIT' }
  spec.homepage = 'https://github.com/facebook/sonar'
  spec.summary = 'SonarKit core cpp code with network implementation'
  spec.authors = 'Facebook'
  # spec.prepare_command = 'mv src double-conversion'
  spec.source = { :git => 'https://github.com/facebook/Sonar.git',
                  :branch => 'master' }
  spec.module_name = 'Sonar'
  spec.public_header_files = 'xplat/Sonar/*.h'
  spec.source_files = 'xplat/Sonar/*.{h,cpp,m,mm}'
  spec.libraries = "stdc++"
  spec.dependency 'Folly'
  spec.dependency 'EasyWSClient'
  # spec.dependency 'boost-for-react-native'
  #
  # spec.dependency 'DoubleConversion'
  # spec.dependency 'Folly'
  # spec.dependency 'glog'
  spec.compiler_flags = '-DFB_SONARKIT_ENABLED=1 -DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_HAVE_LIBGFLAGS=0 -DFOLLY_HAVE_LIBJEMALLOC=0 -DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0 -Wall
    -std=c++14
    -Wno-global-constructors'
  # spec.header_mappings_dir = 'folly'
  # spec.header_dir = 'folly'
  # spec.preserve_paths = 'xplat/**/*'
  # Pinning to the same version as React.podspec.
  spec.platforms = { :ios => "8.0", :tvos => "9.2" }
  spec.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                               "CLANG_CXX_LANGUAGE_STANDARD" => "c++14",
                               "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)\" \"$(PODS_ROOT)/boost-for-react-native\" \"$(PODS_ROOT)/EasyWSClient\" \"$(PODS_ROOT)/DoubleConversion\"" }
end
