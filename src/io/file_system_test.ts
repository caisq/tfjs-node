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
import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';
import * as tmp from 'tmp';

import {NodeFileSystem} from './file_system';

describe('File system IOHandler', () => {
  const modelTopology1: {} = {
    'class_name': 'Sequential',
    'keras_version': '2.1.6',
    'config': [{
      'class_name': 'Dense',
      'config': {
        'kernel_initializer': {
          'class_name': 'VarianceScaling',
          'config': {
            'distribution': 'uniform',
            'scale': 1.0,
            'seed': null,
            'mode': 'fan_avg'
          }
        },
        'name': 'dense',
        'kernel_constraint': null,
        'bias_regularizer': null,
        'bias_constraint': null,
        'dtype': 'float32',
        'activation': 'linear',
        'trainable': true,
        'kernel_regularizer': null,
        'bias_initializer': {'class_name': 'Zeros', 'config': {}},
        'units': 1,
        'batch_input_shape': [null, 3],
        'use_bias': true,
        'activity_regularizer': null
      }
    }],
    'backend': 'tensorflow'
  };
  const weightSpecs1: tfc.io.WeightsManifestEntry[] = [
    {
      name: 'dense/kernel',
      shape: [3, 1],
      dtype: 'float32',
    },
    {
      name: 'dense/bias',
      shape: [1],
      dtype: 'float32',
    }
  ];
  const weightData1 = new ArrayBuffer(16);

  let testDir: string;
  beforeEach(() => {
    testDir = tmp.dirSync().name;
  });

  afterEach(() => {
    rimraf.sync(testDir);
  });

  it('save succeeds with nonexistent path', done => {
    const t0 = new Date();
    testDir = path.join(testDir, 'save-destination');
    const handler = new NodeFileSystem(testDir);
    handler
        .save({
          modelTopology: modelTopology1,
          weightSpecs: weightSpecs1,
          weightData: weightData1,
        })
        .then(saveResult => {
          expect(saveResult.modelArtifactsInfo.dateSaved.getTime())
              .toBeGreaterThanOrEqual(t0.getTime());
          expect(saveResult.modelArtifactsInfo.modelTopologyType)
              .toEqual('JSON');

          const modelJSONPath = path.join(testDir, 'model.json');
          const weightsBinPath = path.join(testDir, 'weights.bin');
          const modelJSON = JSON.parse(fs.readFileSync(modelJSONPath, 'utf8'));
          expect(modelJSON.modelTopology).toEqual(modelTopology1);
          expect(modelJSON.weightsManifest.length).toEqual(1);
          expect(modelJSON.weightsManifest[0].paths).toEqual(['weights.bin']);
          expect(modelJSON.weightsManifest[0].weights).toEqual(weightSpecs1);

          const weightData = new Uint8Array(
              new Buffer(fs.readFileSync(weightsBinPath, 'binary')));
          expect(weightData.length).toEqual(16);
          weightData.forEach(value => expect(value).toEqual(0));

          // Verify the content of the files.
          done();
        })
        .catch(err => done.fail(err.stack));
  });

  it('save fails if path exists as a file', done => {
    testDir = path.join(testDir, 'save-destination');
    // Create a file at the locatin.
    fs.writeFileSync(testDir, 'foo');
    const handler = new NodeFileSystem(testDir);
    handler
        .save({
          modelTopology: modelTopology1,
          weightSpecs: weightSpecs1,
          weightData: weightData1,
        })
        .then(saveResult => {
          done.fail('Saving to path of existing file succeeded unexpectedly.');
        })
        .catch(err => {
          expect(err.message).toMatch(/.*exists as a file.*directory.*/);
          done();
        });
  });

  it('save-load round trip: one weight file', done => {
    const handler1 = new NodeFileSystem(testDir);
    handler1
        .save({
          modelTopology: modelTopology1,
          weightSpecs: weightSpecs1,
          weightData: weightData1,
        })
        .then(saveResult => {
          const modelJSONPath = path.join(testDir, 'model.json');
          const handler2 = new NodeFileSystem(modelJSONPath);
          handler2.load()
              .then(modelArtifacts => {
                expect(modelArtifacts.modelTopology).toEqual(modelTopology1);
                expect(modelArtifacts.weightSpecs).toEqual(weightSpecs1);
                expect(new Float32Array(modelArtifacts.weightData))
                    .toEqual(new Float32Array([0, 0, 0, 0]));
                done();
              })
              .catch(err => done.fail(err.stack));
        })
        .catch(err => done.fail(err.stack));
  });

  it('save-load round trip: two weight files', done => {
    console.log('=============== BEGIN ===============');  // DEBUG
    const weightsManifest: tfc.io.WeightsManifestConfig = [
      {
        paths: ['weights.1.bin'],
        weights: [{
          name: 'dense/kernel',
          shape: [3, 1],
          dtype: 'float32',
        }],
      },

      {
        paths: ['weights.2.bin'],
        weights: [{
          name: 'dense/bias',
          shape: [1],
          dtype: 'float32',
        }]
      }
    ];
    const modelJSON = {
      modelTopology: modelTopology1,
      weightsManifest,
    };

    // Write model.json file.
    console.log('testDir = ' + testDir);  // DEBUG
    const modelJSONPath = path.join(testDir, 'model.json');
    fs.writeFileSync(modelJSONPath, JSON.stringify(modelJSON), 'utf8');

    // Write the two binary weights files.
    console.log('----------------------------------------');   // DEBUG
    console.log(new Float32Array([-1.1, -3.3, -3.3]).buffer);  // DEBUG
    console.log(new Float32Array([-7.7]).buffer);              // DEBUG
    console.log('----------------------------------------');   // DEBUG
    const weightsData1 =
        new Buffer(new Float32Array([-1.1, -3.3, -3.3]).buffer);
    fs.writeFileSync(
        path.join(testDir, 'weights.1.bin'), weightsData1, 'binary');

    const weightsData2 = new Buffer(new Float32Array([-7.7]).buffer);
    fs.writeFileSync(
        path.join(testDir, 'weights.2.bin'), weightsData2, 'binary');

    // Load the artifacts consisting of a model.json and two binary weight
    // files.
    const handler = new NodeFileSystem(modelJSONPath);
    handler.load()
        .then(modelArtifacts => {
          expect(modelArtifacts.modelTopology).toEqual(modelTopology1);
          expect(modelArtifacts.weightSpecs).toEqual([
            {
              name: 'dense/kernel',
              shape: [3, 1],
              dtype: 'float32',
            },
            {
              name: 'dense/bias',
              shape: [1],
              dtype: 'float32',
            }
          ]);
          console.log(modelArtifacts.weightData);
          // console.log(new Float32Array(modelArtifacts.weightData));
          // .toEqual(new Float32Array([0, 0, 0, 0]));
          console.log('=============== DONE ===============');  // DEBUG
          done();
        })
        .catch(err => done.fail(err.stack));
  });
});