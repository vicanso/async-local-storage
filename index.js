const asyncHooks = require('async_hooks');
const nano = require('nano-seconds');

const pkg = require('./package');
const debug = require('debug')(pkg.name);

const map = new Map();

function isUndefined(value) {
  return value === undefined;
}

/**
 * Get data from itself or parent
 * @param {any} data The map data
 * @param {any} key The key
 * @returns {any}
 */
function get(data, key) {
  /* istanbul ignore if */
  if (!data) {
    return null;
  }
  const value = data[key];
  if (isUndefined(value) && data.parent) {
    return get(data.parent, key);
  }
  return value;
}

let currentId = 0;
const hooks = asyncHooks.createHook({
  init: function init(id, type, triggerId) {
    // init, set the created time
    const data = {
      created: nano.now(),
    };
    const parentId = triggerId || currentId;
    // not trigger by itself, add parent
    if (parentId !== id) {
      const parent = map.get(parentId);
      if (parent) {
        data.parent = parent;
      }
    }
    debug(`${id}(${type}) init by ${triggerId}`);
    map.set(id, data);
  },
  /**
   * Set the current id
   */
  before: function before(id) {
    currentId = id;
  },
  /**
   * Remove the data
   */
  destroy: function destroy(id) {
    if (!map.has(id)) {
      return;
    }
    debug(`destroy ${id}`);
    map.delete(id);
  },
});

/**
 * Get the current id
 */
function getCurrentId() {
  if (asyncHooks.executionAsyncId) {
    return asyncHooks.executionAsyncId();
  }
  return asyncHooks.currentId() || currentId;
}

/**
 * Get the current id
 */
exports.currentId = getCurrentId;

/**
 * Enable the async hook
 */
exports.enable = () => hooks.enable();

/**
 * Disable the async hook
 */
exports.disable = () => hooks.disable();

/**
 * Get the size of map
 */
exports.size = () => map.size;

/**
 * Set the key/value for this score
 * @param {String} key The key of value
 * @param {String} value The value
 * @returns {Boolean} if success, will return true, otherwise false
 */
exports.set = function setValue(key, value) {
  /* istanbul ignore if */
  if (key === 'created' || key === 'parent') {
    throw new Error('can\'t set created and parent');
  }
  const id = getCurrentId();
  debug(`set ${key}:${value} to ${id}`);
  const data = map.get(id);
  /* istanbul ignore if */
  if (!data) {
    return false;
  }
  data[key] = value;
  return true;
};

/**
 * Get the value by key
 * @param {String} key The key of value
 */
exports.get = function getValue(key) {
  const data = map.get(getCurrentId());
  const value = get(data, key);
  debug(`get ${key}:${value} from ${currentId}`);
  return value;
};

/**
 * Remove the data of the current id
 */
exports.remove = function removeValue() {
  const id = getCurrentId();
  if (id) {
    map.delete(id);
  }
};

/**
 * Get the use the of id
 * @param {Number} id The trigger id, is optional, default is `als.currentId()`
 * @returns {Number} The use time(ns) of the current id
 */
exports.use = function getUse(id) {
  const data = map.get(id || getCurrentId());
  /* istanbul ignore if */
  if (!data) {
    return -1;
  }
  return nano.difference(data.created);
};
