//
//  SKResonseInfo.m
//  SonarKit
//
//  Created by Pritesh Nandgaonkar on 8/1/18.
//  Copyright © 2018 Facebook. All rights reserved.
//

#import "SKResponseInfo.h"

@implementation SKResponseInfo

- (instancetype)initWithIndentifier:(int64_t)identifier timestamp:(uint64_t)timestamp response:(NSURLResponse *)response data:(NSData *)data {
  if(self = [super init]) {
    _identifier = identifier;
    _timestamp = timestamp;
    _response = response;
    _body = [SKResponseInfo shouldStripReponseBodyWithResponse:response] ? nil : [data base64EncodedStringWithOptions: 0];
  }
  return self;
}

+ (BOOL) shouldStripReponseBodyWithResponse:(NSURLResponse *)response {
  NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse*)response;
  NSString *contentType = httpResponse.allHeaderFields[@"content-type"];
  if (!contentType) {
    return NO;
  }

  return [contentType containsString:@"image/"] ||
  [contentType containsString:@"video/"] ||
  [contentType containsString:@"application/zip"];
}

@end
