const Koa = require('koa');
const request = require('superagent');
const EventEmitter = require('events');

const emiter = new EventEmitter();
const als = require('..');
const name = 'tree.xie';

const app = new Koa();
als.enable();

app.use((ctx, next) => {
  als.set('name', name);
  return next();
});
app.use((ctx, next) => {
  function done() {
    console.info(`done function: ${als.get('name')}`);
  }
  return next().then(done, done);
});
app.use((ctx, next) => {
  setTimeout(() => {
    console.info(`set timeout function: ${als.get('name')}`);
  }, 100);
  return next();
});
app.use((ctx, next) => {
  ctx.res.once('finish', () => {
    // 在finish触发时，调用链已经被删除
    // fail!!!
    // the finish event call can not get the name from als
    console.info(`on close function: ${als.get('name')}`);
  });
  return next();
});
app.use((ctx, next) => {
  emiter.once('my-event', () => {
    // 此事件触发的时候，调用链还存在
    console.info(`on my event: ${als.get('name')}`);
  });
  return next();
});

app.use(async (ctx, next) => {
  const res = await request.get('https://www.baidu.com/');
  console.info(`await http request: ${als.get('name')}`);
  return next();
});

app.use((ctx, next) => {
  return request.get('https://www.baidu.com/').then(() => {
    console.info(`promise function: ${als.get('name')}`);
    return next();
  });
});

app.use((ctx) => {
  emiter.emit('my-event');
  ctx.body = `Hello ${als.get('name')}`;
});

app.listen(3015);
