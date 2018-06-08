const assert = require('assert');
const Koa = require('koa');
const Redis = require('ioredis');
const superagent = require('superagent');
const util = require('util');
const koaSession = require('koa-session');
const fs = require('fs');

const als = require('../als');

const readfilePromise = util.promisify(fs.readFile);
als.enable();

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


class SessionStore {
  constructor(redisClient) {
    this.redisClient = redisClient;
  }
  async get(key) {
    const data = await this.redisClient.get(key);
    if (!data) {
      return null;
    }
    return JSON.parse(data);
  }
  async set(key, json, maxAge) {
    await this.redisClient.psetex(key, maxAge, JSON.stringify(json));
  }
  async destroy(key) {
    await this.redisClient.del(key);
  }
}

const app = new Koa();
const redisClient = new Redis(6379, '127.0.0.1');

const sessionMiddleware = koaSession(app, {
  store: new SessionStore(redisClient),
});

app.use(async (ctx, next) => {
  const id = ctx.get('X-Request-Id');
  als.scope();
  als.set('id', id);
  await next();
  assert(als.currentId());
});

// fs
app.use(async (ctx, next) => {
  assert.equal(als.get('id'), ctx.get('X-Request-Id'));
  if (ctx.query.fs) {
    const buf = await readfilePromise(__filename);
    als.set('buf', buf);
  }
  assert(als.currentId());
  return next();
});

// delay
app.use(async (ctx, next) => {
  assert.equal(als.get('id'), ctx.get('X-Request-Id'));
  if (ctx.query.delay) {
    await delay(100);
  }
  assert(als.currentId());
  return next();
});

// next tick
app.use(async (ctx, next) => {
  await new Promise((resolve) => {
    process.nextTick(() => {
      assert.equal(als.get('id'), ctx.get('X-Request-Id'));
      resolve();
    });
  });
  return next();
});

// session
app.use(async (ctx, next) => {
  assert.equal(als.get('id'), ctx.get('X-Request-Id'));
  if (ctx.query.session) {
    return sessionMiddleware(ctx, next);
  }
  assert(als.currentId());
  return next();
});

// http
app.use(async (ctx, next) => {
  assert.equal(als.get('id'), ctx.get('X-Request-Id'));
  if (ctx.query.http) {
    return superagent.get('http://www.baidu.com/').then(() => {
      assert.equal(als.get('id'), ctx.get('X-Request-Id'));
      return next();
    });
  }
  assert(als.currentId());
  return next();
});

app.use((ctx) => {
  if (ctx.query.session) {
    assert(ctx.session);
  }
  if (ctx.query.fs) {
    assert(als.get('buf'));
  }
  assert(als.currentId());
  ctx.body = als.get('id');
});

const server = app.listen();

exports.server = server;
exports.redisClient = redisClient;
