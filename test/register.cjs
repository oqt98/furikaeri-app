const Module = require('module');
const { registerTS, registerTSX } = require('../node_modules/sucrase/dist/register');
const asyncStorageMock = require('./async-storage-mock.cjs');

registerTS();
registerTSX();

const originalLoad = Module._load;

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '@react-native-async-storage/async-storage') {
    return asyncStorageMock;
  }

  return originalLoad.call(this, request, parent, isMain);
};
