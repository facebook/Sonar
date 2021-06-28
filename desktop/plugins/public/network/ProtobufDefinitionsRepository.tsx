/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ProtobufDefinition} from './types';
import protobuf, {Type} from 'protobufjs';

export class ProtobufDefinitionsRepository {
  private static instance: ProtobufDefinitionsRepository;
  private rawDefinitions: {[path: string]: ProtobufDefinition} = {};
  private cachedDecodedDefinitions: {
    [path: string]: DecodedProtobufDefinition;
  } = {};

  private constructor() {}

  public static getInstance(): ProtobufDefinitionsRepository {
    if (!ProtobufDefinitionsRepository.instance) {
      ProtobufDefinitionsRepository.instance =
        new ProtobufDefinitionsRepository();
    }
    return ProtobufDefinitionsRepository.instance;
  }

  public addDefinitions(baseUrl: string, definitions: ProtobufDefinition[]) {
    for (const d of definitions) {
      if (!baseUrl.endsWith('/') && d.path.substr(0, 1) != '/') {
        this.rawDefinitions[this.key(d.method, baseUrl + '/' + d.path)] = d;
      } else {
        this.rawDefinitions[this.key(d.method, baseUrl + d.path)] = d;
      }
    }
  }

  public getResponseType(method: string, path: string): Type | undefined {
    const key = this.key(method, path);
    this.generateRoots(key);
    const messageFullName = this.rawDefinitions[key]?.responseMessageFullName;
    if (messageFullName) {
      return this.cachedDecodedDefinitions[key]?.responseRoot?.lookupType(
        messageFullName,
      );
    } else {
      return undefined;
    }
  }

  public getRequestType(method: string, path: string): Type | undefined {
    const key = this.key(method, path);
    this.generateRoots(key);
    const messageFullName = this.rawDefinitions[key]?.requestMessageFullName;
    if (messageFullName) {
      return this.cachedDecodedDefinitions[key]?.requestRoot?.lookupType(
        messageFullName,
      );
    } else {
      return undefined;
    }
  }

  public hasDefinition(method: string, path: string): boolean {
    return this.rawDefinitions.hasOwnProperty(this.key(method, path));
  }

  private generateRoots(key: string) {
    if (key in this.cachedDecodedDefinitions) {
      return;
    }
    const rawDefinition = this.rawDefinitions[key];
    if (rawDefinition === undefined) return;

    let responseRoot = undefined;
    if (rawDefinition.responseDefinitions) {
      responseRoot = protobuf.Root.fromJSON(rawDefinition.responseDefinitions);
    }

    let requestRoot = undefined;
    if (rawDefinition.requestDefinitions) {
      requestRoot = protobuf.Root.fromJSON(rawDefinition.requestDefinitions);
    }

    this.cachedDecodedDefinitions[key] = {responseRoot, requestRoot};
  }

  private key(method: string, path: string): string {
    return method + '::' + path.split('?')[0];
  }
}

type DecodedProtobufDefinition = {
  responseRoot: protobuf.Root | undefined;
  requestRoot: protobuf.Root | undefined;
};
