const asyncHooks = require('async_hooks');
const nano = require('nano-seconds');

const pkg = require('./package');
const debug = require('debug')(pkg.name);

const map = new Map();

function isUndefined(value) {
  return value === undefined;
}

function get(data, key) {
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
  init: (id, type, triggerId) => {
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
  before: (id) => {
    currentId = id;
  },
  /**
   * Remove the data
   */
  destroy: (id) => {
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
exports.enable = () => {
  hooks.enable();
};


/**
 * Disable the async hook
 */
exports.disable = () => {
  hooks.disable();
};

exports.size = () => map.size;

/**
 * Set the key/value for this score
 */
exports.set = (key, value) => {
  if (key === 'created' || key === 'paraent') {
    throw new Error('can\'t set created and parent');
  }
  const id = asyncHooks.currentId() || currentId;
  debug(`set ${key}:${value} to ${id}`);
  const data = map.get(id);
  if (!data) {
    return false;
  }
  data[key] = value;
  return true;
};

exports.get = (key) => {
  const data = map.get(asyncHooks.currentId() || currentId);
  const value = get(data, key);
  debug(`get ${key}:${value} from ${currentId}`);
  return value;
};

exports.use = () => {
  const data = map.get(asyncHooks.currentId() || currentId);
  if (!data) {
    return -1;
  }
  return nano.difference(data.created);
};

