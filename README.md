# async-local-storage

[![Build Status](https://travis-ci.org/vicanso/async-local-storage.svg?branch=master)](https://travis-ci.org/vicanso/async-local-storage)
[![Coverage Status](https://img.shields.io/coveralls/vicanso/async-local-storage/master.svg?style=flat)](https://coveralls.io/r/vicanso/async-local-storage?branch=master)
[![npm](http://img.shields.io/npm/v/async-local-storage.svg?style=flat-square)](https://www.npmjs.org/package/async-local-storage)
[![Github Releases](https://img.shields.io/npm/dm/async-local-storage.svg?style=flat-square)](https://github.com/vicanso/async-local-storage)

I want something like `thread-local` storage in threaded programming and `async_hooks` is usable in `node.js 8.0`, so there is an easy way to use `thread-local`.

### API

```js
const als = require('async-local-storage');
als.enable();
setTimeout(() => {
  const id = randomBytes(8);
  als.set('id', id);
  delay().then(() => {
    assert.equal(als.get('id'), id);
    return readfilePromise(__filename);
  }).then(() => {
    assert.equal(als.get('id'), id);
    return superagent.get('http://www.baidu.com/');
  }).then(() => {
    assert.equal(als.get('id'), id);
  });
}, 100);
```

### enable

enable the async hooks

```js
const als = require('async-local-storage');
als.enable();
```

### disable

disable the async hooks

```js
const als = require('async-local-storage');
als.enable();
setTimeout(() => {
  als.disable();
}, 100);
```

### size

get the size of storage

```js
const als = require('async-local-storage');
als.enable();
setTimeout(() => {
  console.info(als.size());
}, 100);
```

### set

set the value by key for the current id

- `key` the key
- `value` the value

```js
const assert = require('assert');
const als = require('async-local-storage');
const crypto = require('crypto');
const randomBytes = length => crypto.randomBytes(length).toString('hex')

als.enable()
setTimeout(() => {
  const id = randomBytes(8);
  als.set('id', id);
  const check = (times, id, subId) => {
    assert.equal(als.get('id'), id);
    assert.equal(als.get('subId'), subId);
    if (times < 0) {
      done();
    } else {
      setTimeout(() => {
        check(times - 1, id, subId);
      }, 10);
    }
  };
  setTimeout(() => {
    const subId = randomBytes(8);
    als.set('subId', subId);
    assert.equal(als.get('id'), id);
    check(3, id, subId);
  }, 10);
}, 10);
```

### get

get the value by key, if will find from parent, self --> parent --> parent, until the value is not undefined

- `key` the key

```js
const assert = require('assert');
const als = require('async-local-storage');
const crypto = require('crypto');
const randomBytes = length => crypto.randomBytes(length).toString('hex')

als.enable()
setTimeout(() => {
  const id = randomBytes(8);
  als.set('id', id);
  const check = (times, id, subId) => {
    assert.equal(als.get('id'), id);
    assert.equal(als.get('subId'), subId);
    if (times < 0) {
      done();
    } else {
      setTimeout(() => {
        check(times - 1, id, subId);
      }, 10);
    }
  };
  setTimeout(() => {
    const subId = randomBytes(8);
    als.set('subId', subId);
    assert.equal(als.get('id'), id);
    check(3, id, subId);
  }, 10);
}, 10);
```

### currentId

Get the current id

```js
const assert = require('assert');
const als = require('async-local-storage');
als.enable();
setTimeout(() => {
  assert(als.currentId());
}, 10);
```

## License

MIT
