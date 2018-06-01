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

// tslint:disable-next-line:no-unused-variable
import {nodeFileSystemRouter} from './io/file_system';
import {NodeJSKernelBackend} from './nodejs_kernel_backend';

// tslint:disable-next-line:no-require-imports
import bindings = require('bindings');
import {TFJSBinding} from './tfjs_binding';

tfc.ENV.registerBackend('tensorflow', () => {
  return new NodeJSKernelBackend(bindings('tfjs_binding.node') as TFJSBinding);
});

// Register the model saving and loading handlers for the 'file://' URL scheme.
tfc.io.registerSaveRouter(nodeFileSystemRouter);
tfc.io.registerLoadRouter(nodeFileSystemRouter);

export {version} from './version';
