const Koa = require('koa');
const crypto = require('crypto');
const request = require('superagent');
const EventEmitter = require('events');
const assert = require('assert');

const als = require('..');

const randomBytes = () => crypto.randomBytes(8).toString('hex');
const emiter = new EventEmitter();


const app = new Koa();
const key = 'id';
als.enable();

setInterval(() => {
  console.info(`map size:${als.size()}`);
}, 60 * 1000);

app.use((ctx, next) => {
  const id = randomBytes();
  ctx.state[key] = id;
  als.scope();
  als.set(key, id);
  return next();
});

app.use((ctx, next) => {
  function done() {
    assert.equal(ctx.state[key], als.get(key));
  }
  return next().then(done, done);
});
app.use((ctx, next) => {
  setTimeout(() => {
    assert.equal(ctx.state[key], als.get(key));
  }, 10);
  return next();
});
app.use((ctx, next) => {
  setImmediate(() => {
    als.set('immediate', true, true);
    assert.equal(ctx.state[key], als.get(key));
  });
  return next();
});

app.use((ctx, next) => {
  process.nextTick(() => {
    assert.equal(ctx.state[key], als.get(key));
  });
  return next();
});
app.use((ctx, next) => {
  ctx.res.once('finish', () => {
    // 在finish触发时，调用链已经被删除
    // fail!!!
    // the finish event call can not get the name from als
    assert.equal(als.get(key), undefined);
  });
  return next();
});
app.use((ctx, next) => {
  emiter.once('my-event', () => {
    // 此事件触发的时候，调用链还存在
    assert.equal(ctx.state[key], als.get(key));
  });
  return next();
});

app.use(async (ctx, next) => {
  await request.get('https://www.baidu.com/');
  assert.equal(ctx.state[key], als.get(key));
  return next();
});

app.use((ctx, next) => {
  const url = 'https://www.baidu.com/';
  return request.get(url)
    .then(() => {
      assert.equal(true, als.get('immediate'));
      assert.equal(ctx.state[key], als.get(key));
      return next();
    });
});

app.use((ctx) => {
  emiter.emit('my-event');
  ctx.body = `Hello ${als.get(key)}`;
});

app.listen(3015);
console.info('http://127.0.0.1:3015/');
