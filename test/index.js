const assert = require('assert');
const Koa = require('koa');
const Redis = require('ioredis');
const request = require('supertest');
const superagent = require('superagent');
const crypto = require('crypto');
const util = require('util');
const koaSession = require('koa-session');
const fs = require('fs');
const als = require('..');

const readfilePromise = util.promisify(fs.readFile);
als.enable();

const randomBytes = length => crypto.randomBytes(length).toString('hex');
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

const sessionMiddleware = koaSession(app, {
  store: new SessionStore(new Redis()),
});

app.use(async (ctx, next) => {
  const id = ctx.get('X-Request-Id');
  als.set('id', id);
  await next();
  assert(als.use());
});

// fs
app.use(async (ctx, next) => {
  assert.equal(als.get('id'), ctx.get('X-Request-Id'));
  if (ctx.query.fs) {
    await readfilePromise(__filename);
  }
  return next();
});

// delay
app.use(async (ctx, next) => {
  assert.equal(als.get('id'), ctx.get('X-Request-Id'));
  if (ctx.query.delay) {
    await delay(100);
  }
  return next();
});

// session
app.use(async (ctx, next) => {
  assert.equal(als.get('id'), ctx.get('X-Request-Id'));
  if (ctx.query.session) {
    return sessionMiddleware(ctx, next);
  }
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
  return next();
});

app.use((ctx) => {
  if (ctx.query.session) {
    assert(ctx.session);
  }
  ctx.body = als.get('id');
});

const server = app.listen();

describe('async-local-storage', () => {
  const check = (url) => {
    const fns = [1, 2, 3, 4, 5].map(() => {
      const id = randomBytes(8);
      return request(server).get(url)
        .set('X-Request-Id', id)
        .expect(200)
        .then((response) => {
          assert.equal(response.text, id);
        });
    });
    return Promise.all(fns);
  };

  it('get id success', (done) => {
    check('/').then(() => {
      done();
    }).catch(done);
  });

  it('get id(fs) success', (done) => {
    check('/?fs=true').then(() => {
      done();
    }).catch(done);
  });


  it('get id(delay) success', (done) => {
    check('/?delay=true').then(() => {
      done();
    }).catch(done);
  });

  it('get id(http) success', (done) => {
    check('/?http=true').then(() => {
      done();
    }).catch(done);
  });

  it('get id(session) success', (done) => {
    check('/?session=true').then(() => {
      done();
    }).catch(done);
  });

  it('get id(all) success', (done) => {
    const id = randomBytes(8);
    request(server).get('/?fs=true&http=true')
      .set('X-Request-Id', id)
      .expect(200)
      .then((response) => {
        assert.equal(response.text, id);
        done();
      }).catch(done);
  });

  it('get the size', () => {
    assert(als.size());
  });
});
