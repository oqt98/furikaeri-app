const storage = {
  __INTERNAL_MOCK_STORAGE__: {},

  async getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.__INTERNAL_MOCK_STORAGE__, key)
      ? this.__INTERNAL_MOCK_STORAGE__[key]
      : null;
  },

  async setItem(key, value) {
    this.__INTERNAL_MOCK_STORAGE__[key] = value;
  },

  async removeItem(key) {
    delete this.__INTERNAL_MOCK_STORAGE__[key];
  },

  async clear() {
    this.__INTERNAL_MOCK_STORAGE__ = {};
  },

  async getAllKeys() {
    return Object.keys(this.__INTERNAL_MOCK_STORAGE__);
  },
};

module.exports = storage;
