# async-local-storage

[![Build Status](https://travis-ci.org/vicanso/async-local-storage.svg?branch=master)](https://travis-ci.org/vicanso/async-local-storage)
[![Coverage Status](https://img.shields.io/coveralls/vicanso/async-local-storage/master.svg?style=flat)](https://coveralls.io/r/vicanso/async-local-storage?branch=master)
[![npm](http://img.shields.io/npm/v/async-local-storage.svg?style=flat-square)](https://www.npmjs.org/package/async-local-storage)
[![Github Releases](https://img.shields.io/npm/dm/async-local-storage.svg?style=flat-square)](https://github.com/vicanso/async-local-storage)

I want something like `thread-local` storage in threaded programming and `async_hooks` is usable in `node.js 8.0`, so there is an easy way to use `thread-local`.

## API

```js
const als = require('async-local-storage');
als.enable();
setTimeout(() => {
  als.scope();
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

### scope

change the scope of call chain, it will be the call chain top (remove the parent of itself)

```js
const als = require('async-local-storage');
const Koa = require('koa');
const assert = require('assert');

const app = new Koa();
app.use(async (ctx, next) => {
  const id = ctx.get('X-Request-Id');
  als.scope();
  als.set('id', id);
  await next();
});

app.use(async (ctx, next) => {
  const id = ctx.get('X-Request-Id');
  assert.equal(als.get('id'), id);
  await next();
});

app.use((ctx) => {
  ctx.body = 'OK';
});
```


### set

set the value by key for the current id

- `key` the key
- `value` the value
- `linkedTop` set the value linked to top

```js
als.enable()
setTimeout(() => {
  als.scope();
  const id = randomBytes();
  setTimeout(() => {
    als.set('id', id, true);
  }, 1);
  setTimeout(() => {
    assert.equal(als.get('id'), id);
  }, 10);
}, 10);
```

### get

get the value by key, if will find from parent, self --> parent --> parent, until the value is not undefined

- `key` the key

```js
als.enable();
setTimeout(() => {
  als.scope();
  const id = randomBytes();
  setTimeout(() => {
    als.set('id', id, true);
  }, 1);
  setTimeout(() => {
    assert.equal(als.get('id'), id);
  }, 10);
}, 10);
```

### enableLinkedTop

enable linked top for default (default is disabled)

```js
als.enable();
als.enableLinkedTop();
setTimeout(() => {
  als.scope();
  setTimeout(() => {
    // the same as als.set('id', 'a', true)
    als.set('id', 'a');
  }, 10);
}, 10);
```

### disableLinkedTop

disable linked top for default

```js
als.enable();
als.enableLinkedTop();
setTimeout(() => {
  als.disableLinkedTop();
  als.scope();
  setTimeout(() => {
    // the same as als.set('id', 'a', false)
    als.set('id', 'a');
  }, 10);
}, 10);
```


### currentId

get the current id

```js
const assert = require('assert');
als.enable();
setTimeout(() => {
  console.info(als.currentId());
}, 10);
```

### use

get the use time of id

- `id` The tigger id, default is `als.currentId()`

```js
als.enable()
setTimeout(() => {
  const id = als.currentId();
  console.info(als.use(id));
}, 10);
```

