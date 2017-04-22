/**
 * https://github.com/nodejs/diagnostics/tree/master/tracing/AsyncWrap
 */
'use strict';
const asyncWrap = process.binding('async_wrap');
const nano = require('nano-seconds');

const TIMER = asyncWrap.Providers.TIMERWRAP;
let currentUid = -1;
const map = new Map();

function isUndefined(value) {
  return value === undefined
}

function get(data, key) {
  if (!data) {
    return;
  }
  const value = data[key];
  if (isUndefined(value) && data.parent) {
    return get(data.parent, key);
  }
  return value;
}

function init(uid, provider, parentUid) {
  if (provider === TIMER) {
    return;
  }
  const parent = map.get(parentUid || currentUid);
  const data = {
    create: nano.now(),
  };
  if (parent) {
    data.parent = parent;
  }
  map.set(uid, data);
}

function pre(uid) {
  if (!map.has(uid)) {
    return;
  }
  currentUid = uid;
}

function post(uid) {
  if (!map.has(uid)) {
    return;
  }
  currentUid = -1;
}

function destroy(uid) {
  if (!map.has(uid)) {
    return;
  }
  map.delete(uid);
}

asyncWrap.setupHooks({
  init,
  pre,
  post,
  destroy,
});

exports.enable = () => {
  asyncWrap.enable();
};

exports.disable = () => {
  asyncWrap.disable();
};

exports.use = () => {
  const data = map.get(currentUid);
  if (!data) {
    return -1;
  }
  return nano.difference(data.create);
};

exports.set = (key, value) => {
  const data = map.get(currentUid);
  if (!data) {
    return false;
  }
  data[key] = value;
  return true;
};

exports.get = (key) => {
  const data = map.get(currentUid);
  return get(data, key);
};
