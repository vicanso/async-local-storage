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
    if (type === 'TickObject') {
      return;
    }
    // init, set the created time
    const data = {
      created: nano.now(),
    };
    const parentId = triggerId || currentId;
    // not tigger by itself, add parent
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
 * @returns {Boolean} if sucess, will return true, otherwise false
 */
exports.set = function setValue(key, value) {
  /* istanbul ignore if */
  if (key === 'created' || key === 'paraent') {
    throw new Error('can\'t set created and parent');
  }
  const id = asyncHooks.currentId() || currentId;
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
  const data = map.get(asyncHooks.currentId() || currentId);
  const value = get(data, key);
  debug(`get ${key}:${value} from ${currentId}`);
  return value;
};

/**
 * Remove the data of the current id
 */
exports.remove = function removeValue() {
  const id = asyncHooks.currentId() || currentId;
  if (id) {
    map.delete(id);
  }
};

/**
 * Get the use the of current id
 * @returns {Number} The use time(ns) of the current id
 */
exports.use = function getUse() {
  const data = map.get(asyncHooks.currentId() || currentId);
  /* istanbul ignore if */
  if (!data) {
    return -1;
  }
  return nano.difference(data.created);
};

/**
 * Get the current id
 */
exports.currentId = () => asyncHooks.currentId() || currentId;
