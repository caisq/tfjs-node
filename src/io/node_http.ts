/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import * as tfc from '@tensorflow/tfjs-core';
// import * as fetch from 'node-fetch';
// tslint:disable-next-line:no-require-imports
import fetch = require('node-fetch');

export class NodeHTTPRequest implements tfc.io.IOHandler {
  protected readonly path: string;
  protected readonly requestInit: fetch.RequestInit;

  readonly DEFAULT_METHOD = 'POST';

  static readonly URL_SCHEMES = ['http://', 'https://'];

  constructor(path: string, requestInit?: fetch.RequestInit) {
    if (!tfc.ENV.get('IS_NODE')) {
      throw new Error('NodeHTTPRequest is not supported outside Node.js.');
    }

    tfc.util.assert(
        path != null && path.length > 0,
        'URL path for browserHTTPRequest must not be null, undefined or ' +
            'empty.');
    this.path = path;

    if (requestInit != null && requestInit.body != null) {
      throw new Error(
          'requestInit is expected to have no pre-existing body, but has one.');
    }
    this.requestInit = requestInit || {};
  }

  // TODO(cais): Implement save().

  /**
   * Load model artifacts via HTTP request(s).
   *
   * See the documentation to `browserHTTPRequest` for details on the saved
   * artifacts.
   *
   * @returns The loaded model artifacts (if loading succeeds).
   */
  async load(): Promise<tfc.io.ModelArtifacts> {
    const modelConfigRequest = await fetch.default(this.path, this.requestInit);
    const modelConfig = await modelConfigRequest.json();
    const modelTopology = modelConfig['modelTopology'];
    const weightsManifest = modelConfig['weightsManifest'];

    // We do not allow both modelTopology and weightsManifest to be missing.
    if (modelTopology == null && weightsManifest == null) {
      throw new Error(
          `The JSON from HTTP path ${this.path} contains neither model ` +
          `topology or manifest for weights.`);
    }

    let weightSpecs: tfc.io.WeightsManifestEntry[];
    let weightData: ArrayBuffer;
    if (weightsManifest != null) {
      const weightsManifest =
          modelConfig['weightsManifest'] as tfc.io.WeightsManifestConfig;
      weightSpecs = [];
      for (const entry of weightsManifest) {
        weightSpecs.push(...entry.weights);
      }

      let pathPrefix = this.path.substring(0, this.path.lastIndexOf('/'));
      if (!pathPrefix.endsWith('/')) {
        pathPrefix = pathPrefix + '/';
      }

      const fetchURLs: string[] = [];
      weightsManifest.forEach(weightsGroup => {
        weightsGroup.paths.forEach(path => {
          fetchURLs.push(`${pathPrefix}${path}`);
        });
      });
      weightData = concatenateArrayBuffers(
          await loadWeightsAsArrayBuffer(fetchURLs, this.requestInit));
    }

    return {modelTopology, weightSpecs, weightData};
  }
}

async function loadWeightsAsArrayBuffer(
    fetchURLs: string[],
    requestOptions?: fetch.RequestInit): Promise<ArrayBuffer[]> {
  // Create the requests for all of the weights in parallel.
  const requests =
      fetchURLs.map(fetchURL => fetch.default(fetchURL, requestOptions));
  const responses = await Promise.all(requests);
  const buffers =
      await Promise.all(responses.map(response => response.arrayBuffer()));
  return buffers;
}

export function concatenateArrayBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  let totalByteLength = 0;
  buffers.forEach(buffer => {
    totalByteLength += buffer.byteLength;
  });

  const temp = new Uint8Array(totalByteLength);
  let offset = 0;
  buffers.forEach(buffer => {
    temp.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  });
  return temp.buffer;
}

export const nodeHTTPRequestRouter = (url: string) => {
  console.log('In nodeHTTPRequestRouter(): url = ' + url);  // DEBUG
  if (!tfc.ENV.get('IS_NODE')) {
    // NodeHTTPRequest uses `fetch`, which differs from HTTP requests in
    // the web browser.
    return null;
  } else {
    for (const scheme of NodeHTTPRequest.URL_SCHEMES) {
      if (url.startsWith(scheme)) {
        return new NodeHTTPRequest(url);
      }
    }
    return null;
  }
};
