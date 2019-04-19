/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

// $FlowFixMe
import pako from 'pako';
import type {Request, Response, Header} from './types.js';

export function getHeaderValue(headers: Array<Header>, key: string): string {
  for (const header of headers) {
    if (header.key.toLowerCase() === key.toLowerCase()) {
      return header.value;
    }
  }
  return '';
}

export function decodeBody(container: Request | Response): string {
  if (!container.data) {
    return '';
  }

  const b64Decoded = atob(container.data);
  const body =
    getHeaderValue(container.headers, 'Content-Encoding') === 'gzip'
      ? decompress(b64Decoded)
      : b64Decoded;

  // Data is transferred as base64 encoded bytes to support unicode characters,
  // we need to decode the bytes here to display the correct unicode characters.
  try {
    return decodeURIComponent(escape(body));
  } catch (e) {
    console.warn('Discarding malformed body:', escape(body));
    return '';
  }
}

function decompress(body: string): string {
  const charArray = body.split('').map(x => x.charCodeAt(0));

  const byteArray = new Uint8Array(charArray);

  let data;
  try {
    if (body) {
      data = pako.inflate(byteArray);
    } else {
      return body;
    }
  } catch (e) {
    // Sometimes Content-Encoding is 'gzip' but the body is already decompressed.
    // Assume this is the case when decompression fails.
    return body;
  }

  return String.fromCharCode.apply(null, new Uint8Array(data));
}

export function convertRequestToCurlCommand(request: Request): string {
  let command: string = `curl -v -X ${request.method}`;
  command += ` ${escapedString(request.url)}`;
  // Add headers
  request.headers.forEach(header => {
    const headerStr = `${header.key}: ${header.value}`;
    command += ` -H ${escapedString(headerStr)}`;
  });
  // Add body
  const body = decodeBody(request);
  if (body) {
    command += ` -d ${escapedString(body)}`;
  }
  return command;
}

function escapeCharacter(x) {
  const code = x.charCodeAt(0);
  return code < 16 ? '\\u0' + code.toString(16) : '\\u' + code.toString(16);
}

const needsEscapingRegex = /[\u0000-\u001f\u007f-\u009f!]/g;

// Escape util function, inspired by Google DevTools. Works only for POSIX
// based systems.
function escapedString(str) {
  if (needsEscapingRegex.test(str) || str.includes("'")) {
    return (
      "$'" +
      str
        .replace(/\\/g, '\\\\')
        .replace(/\'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(needsEscapingRegex, escapeCharacter) +
      "'"
    );
  }

  // Simply use singly quoted string.
  return "'" + str + "'";
}
