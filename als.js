const asyncHooks = require('async_hooks');
const nano = require('nano-seconds');
const util = require('util');
const fs = require('fs');

const map = new Map();

const enabledDebug = process.env.DEBUG === 'als';

function debug(...args) {
  if (!enabledDebug) {
    return;
  }
  // use a function like this one when debugging inside an AsyncHooks callback
  fs.writeSync(1, `${util.format(...args)}\n`);
}

let defaultLinkedTop = false;

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
  let currentData = data;
  let value = currentData[key];
  while (isUndefined(value) && currentData.parent) {
    currentData = currentData.parent;
    value = currentData[key];
  }
  return value;
}

/**
 * Get the top data
 */
function getTop(data) {
  let result = data;
  while (result && result.parent) {
    result = result.parent;
  }
  return result;
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
 * Enable linked top
 */
exports.enableLinkedTop = () => {
  defaultLinkedTop = true;
};

/**
 * Disable linked top
 */
exports.disableLinkedTop = () => {
  defaultLinkedTop = false;
};

/**
 * Set the key/value for this score
 * @param {String} key The key of value
 * @param {String} value The value
 * @param {Boolean} linkedTop The value linked to top
 * @returns {Boolean} if success, will return true, otherwise false
 */
exports.set = function setValue(key, value, linkedTop) {
  /* istanbul ignore if */
  if (key === 'created' || key === 'parent') {
    throw new Error("can't set created and parent");
  }
  const id = getCurrentId();
  debug(`set ${key}:${value} to ${id}`);
  let data = map.get(id);
  /* istanbul ignore if */
  if (!data) {
    return false;
  }
  let setToLinkedTop = linkedTop;
  if (isUndefined(linkedTop)) {
    setToLinkedTop = defaultLinkedTop;
  }
  if (setToLinkedTop) {
    data = getTop(data);
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
 * 获取当前current data
 */
exports.getCurrentData = () => map.get(getCurrentId());

/**
 * Get the value by key from parent
 * @param {String} key The key of value
 */
exports.getFromParent = (key) => {
  const currentData = map.get(getCurrentId());
  if (!currentData) {
    return null
  }
  const value = get({ parent: currentData.parent }, key)
  return value
}

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

/**
 * Get the top value
 */
exports.top = function top() {
  const data = map.get(getCurrentId());
  return getTop(data);
};

/**
 * Set the scope (it will change the top)
 */
exports.scope = function scope() {
  const data = map.get(getCurrentId());
  delete data.parent;
};
