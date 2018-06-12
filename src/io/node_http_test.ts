// /**
//  * @license
//  * Copyright 2018 Google Inc. All Rights Reserved.
//  * Licensed under the Apache License, Version 2.0 (the "License");
//  * you may not use this file except in compliance with the License.
//  * You may obtain a copy of the License at
//  *
//  * http://www.apache.org/licenses/LICENSE-2.0
//  *
//  * Unless required by applicable law or agreed to in writing, software
//  * distributed under the License is distributed on an "AS IS" BASIS,
//  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  * See the License for the specific language governing permissions and
//  * limitations under the License.
//  *
//  =============================================================================
//  */

// import * as tfc from '@tensorflow/tfjs-core';

// import * as fetch from 'node-fetch';
// import {NodeHTTPRequest} from './node_http';

// // Test data.
// const modelTopology1: {} = {
//   'class_name': 'Sequential',
//   'keras_version': '2.1.4',
//   'config': [{
//     'class_name': 'Dense',
//     'config': {
//       'kernel_initializer': {
//         'class_name': 'VarianceScaling',
//         'config': {
//           'distribution': 'uniform',
//           'scale': 1.0,
//           'seed': null,
//           'mode': 'fan_avg'
//         }
//       },
//       'name': 'dense',
//       'kernel_constraint': null,
//       'bias_regularizer': null,
//       'bias_constraint': null,
//       'dtype': 'float32',
//       'activation': 'linear',
//       'trainable': true,
//       'kernel_regularizer': null,
//       'bias_initializer': {'class_name': 'Zeros', 'config': {}},
//       'units': 1,
//       'batch_input_shape': [null, 3],
//       'use_bias': true,
//       'activity_regularizer': null
//     }
//   }],
//   'backend': 'tensorflow'
// };

// describe('browserHTTPRequest-load', () => {
//   let requestInits: RequestInit[];

//   const setupFakeWeightFiles = (fileBufferMap: {
//     [filename: string]:
//     string|Float32Array|Int32Array|ArrayBuffer|Uint8Array| Uint16Array
//   }) => {
//     spyOn(fetch, 'default').and.callFake((path: string, init: RequestInit) =>
//     {
//       requestInits.push(init);
//       return new Response(fileBufferMap[path]);
//     });
//   };

//   beforeEach(() => {
//     requestInits = [];
//   });

//   it('1 group, 2 weights, 1 path', done => {
//     // console.log(fetch);
//     // console.log(fetch.fetch);
//     // done();  // DEBUG
//     const weightManifest1: tfc.io.WeightsManifestConfig = [{
//       paths: ['weightfile0'],
//       weights: [
//         {
//           name: 'dense/kernel',
//           shape: [3, 1],
//           dtype: 'float32',
//         },
//         {
//           name: 'dense/bias',
//           shape: [2],
//           dtype: 'float32',
//         }
//       ]
//     }];
//     const floatData = new Float32Array([1, 3, 3, 7, 4]);
//     setupFakeWeightFiles({
//       './model.json': JSON.stringify(
//           {modelTopology: modelTopology1, weightsManifest: weightManifest1}),
//       './weightfile0': floatData,
//     });

//     const handler = new NodeHTTPRequest('http://localhost:5001/model.json');
//     handler.load()
//         .then(modelArtifacts => {
//           expect(modelArtifacts.modelTopology).toEqual(modelTopology1);
//           expect(modelArtifacts.weightSpecs)
//               .toEqual(weightManifest1[0].weights);
//           expect(new Float32Array(modelArtifacts.weightData))
//               .toEqual(floatData);
//           expect(requestInits).toEqual([{}, {}]);
//           done();
//         })
//         .catch(err => done.fail(err.stack));
//   });
// });
