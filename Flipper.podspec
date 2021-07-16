# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

flipperkit_version = '0.98.0'
Pod::Spec.new do |spec|
  spec.name = 'Flipper'
  spec.version = flipperkit_version
  spec.license = { :type => 'MIT' }
  spec.homepage = 'https://github.com/facebook/flipper'
  spec.summary = 'SonarKit core cpp code with network implementation'
  spec.authors = 'Facebook'
  spec.source = { :git => 'https://github.com/facebook/flipper.git',
                  :tag => 'v'+flipperkit_version }
  spec.module_name = 'Flipper'
  spec.public_header_files = 'xplat/Flipper/*.h','xplat/utils/*.h'
  spec.source_files = 'xplat/Flipper/*.{h,cpp,m,mm}','xplat/Flipper/utils/*.{h,cpp,m,mm}'
  spec.libraries = "stdc++"
  spec.dependency 'Flipper-Folly', '~> 2.6
  '
  spec.dependency 'Flipper-RSocket', '~> 1.4'
  spec.compiler_flags = '-DFLIPPER_OSS=1 -DFB_SONARKIT_ENABLED=1 -DFOLLY_HAVE_BACKTRACE=1 -DFOLLY_HAVE_CLOCK_GETTIME=1 -DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_HAVE_LIBGFLAGS=0 -DFOLLY_HAVE_LIBJEMALLOC=0 -DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0 -Wall
    -std=c++14
    -Wno-global-constructors'
  spec.platforms = { :ios => "10.0" }
  spec.pod_target_xcconfig = { "USE_HEADERMAP" => "NO",
                               "CLANG_CXX_LANGUAGE_STANDARD" => "c++14",
                               "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)\" \"$(PODS_ROOT)/Flipper-Boost-iOSX\" \"$(PODS_ROOT)/Flipper-RSocket\" \"$(PODS_ROOT)/Flipper-DoubleConversion\" \"$(PODS_ROOT)/libevent/include\""
                               }
end
