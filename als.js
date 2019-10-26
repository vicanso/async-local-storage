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
let enabledCreatedAt = true;
let defaultIgnoreNoneParent = false;

function isUndefined(value) {
  return value === undefined;
}

/**
 * Get data from itself or parent
 * @param {any} data The map data
 * @param {any} key The key
 * @returns {any} value
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

const cleanNoDataParent = (data) => {
  while (data && data.parent && !data.parent.hasValue) {
    // eslint-disable-next-line no-param-reassign
    data.parent = data.parent.parent
  }
}

/**
 * Get the top data
 * @param {object} data data
 * @returns {object} top parent
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
    const data = {};
    // init, set the created time
    if (enabledCreatedAt) {
      data.created = nano.now();
    }
    const parentId = triggerId || currentId;
    // not trigger by itself, add parent
    if (parentId !== id) {
      const parent = map.get(parentId);
      if (parent) {
        data.parent = parent;
        data.parentId = parentId;
      }
    }
    debug('%d(%s) init by %d', id, type, triggerId);
    map.set(id, data);
  },
  /**
   * Set the current id
   * @param {int} id asyncId
   * @returns {void}
   */
  before: function before(id) {
    currentId = id;
    if (defaultIgnoreNoneParent) {
      cleanNoDataParent(
        map.get(id)
      )
    }
  },
  /**
   * Remove the data
   * @param {int} id asyncId
   * @returns {void}
   */
  destroy: function destroy(id) {
    if (!map.has(id)) {
      return;
    }
    debug('destroy %d', id);
    map.delete(id);
  },
});

/**
 * Get the current id
 * @returns {int} currentId
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
 * @param {object} [options] enable options
 * @param {boolean} [options.ignoreNoneParent = false] ignore no data parent
 * @returns {AsyncHook} A reference to asyncHook.
 */
exports.enable = ({ ignoreNoneParent } = {}) => {
  defaultIgnoreNoneParent = ignoreNoneParent;
  return hooks.enable();
}

/**
 * Disable the async hook
 * @returns {AsyncHook} A reference to asyncHook.
 */
exports.disable = () => {
  map.clear()
  return hooks.disable();
}

/**
 * Get the size of map
 * @returns {int} size
 */
exports.size = () => map.size;

/**
 * Enable linked top
 * @returns {void}
 */
exports.enableLinkedTop = () => {
  defaultLinkedTop = true;
};

/**
 * Disable linked top
 * @returns {void}
 */
exports.disableLinkedTop = () => {
  defaultLinkedTop = false;
};

/**
 * Set the key/value for this score
 * @param {string} key The key of value
 * @param {any} value The value
 * @param {boolean} [linkedTop] The value linked to top
 * @returns {boolean} if success, will return true, otherwise false
 */
exports.set = function setValue(key, value, linkedTop) {
  /* istanbul ignore if */
  if (key === 'created' || key === 'parent') {
    throw new Error("can't set created and parent");
  }
  const id = getCurrentId();
  debug('set %s:%j to %d', key, value, id);
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
  data.hasValue = true
  return true;
};

/**
 * Get the value by key
 * @param {string} key The key of value
 * @returns {any} value
 */
exports.get = function getValue(key) {
  const data = map.get(getCurrentId());
  const value = get(data, key);
  debug('get %s:%j from %d', key, value, currentId);
  return value;
};

/**
 * 获取当前current data
 * @returns {object} current data
 */
exports.getCurrentData = () => map.get(getCurrentId());

/**
 * Get the value by key from parent
 * @param {string} key The key of value
 * @returns {any} value
 */
exports.getFromParent = key => {
  const currentData = map.get(getCurrentId());
  if (!currentData) {
    return null;
  }
  const value = get({parent: currentData.parent}, key);
  return value;
};

/**
 * Remove the data of the current id
 * @returns {void}
 */
exports.remove = function removeValue() {
  const id = getCurrentId();
  if (id) {
    map.delete(id);
  }
};

/**
 * Get the use the of id
 * @param {number} id The trigger id, is optional, default is `als.currentId()`
 * @returns {number} The use time(ns) of the current id
 */
exports.use = function getUse(id) {
  const data = map.get(id || getCurrentId());
  /* istanbul ignore if */
  if (!data || !enabledCreatedAt) {
    return -1;
  }
  return nano.difference(data.created);
};

/**
 * Get the top value
 * @returns {object} topData
 */
exports.top = function top() {
  const data = map.get(getCurrentId());
  return getTop(data);
};

/**
 * Set the scope (it will change the top)
 * @returns {void}
 */
exports.scope = function scope() {
  const data = map.get(getCurrentId());
  if (data) {
    delete data.parent;
  }
};

/**
 * Get all data of async locatl storage, please don't modify the data
 * @returns {map} allData
 */
exports.getAllData = function getAllData() {
  return map;
};

/**
 * Enable the create time of data
 * @returns {void}
 */
exports.enableCreateTime = function enableCreateTime() {
  enabledCreatedAt = true;
};

/**
 * Disable the create time of data
 * @returns {void}
 */
exports.disableCreateTime = function disableCreateTime() {
  enabledCreatedAt = false;
};
