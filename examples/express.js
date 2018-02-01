const express = require('express');
const request = require('superagent');
const EventEmitter = require('events');
const onHeaders = require('on-headers');

const emiter = new EventEmitter();
const als = require('..');
const name = 'tree.xie';

const app = express();
als.enable();

app.use((req, res, next) => {
  als.set('name', name);
  next();
});

app.use((req, res, next) => {
  onHeaders(res, () => {
    console.info(`done function: ${als.get('name')}`);
  });
  next();
});

app.use((req, res, next) => {
  setTimeout(() => {
    console.info(`set timeout function: ${als.get('name')}`);
  }, 10);
  next();
});

app.use((req, res, next) => {
  setImmediate(() => {
    als.set('immediate', true, true);
    console.info(`set immediate function: ${als.get('name')}`);
  });
  next();
});

app.use((req, res, next) => {
  process.nextTick(() => {
    console.info(`next tick function: ${als.get('name')}`);
  });
  next();
});

app.use((req, res, next) => {
  res.once('finish', () => {
    // 在finish触发时，调用链已经被删除
    // fail!!!
    // the finish event call can not get the name from als
    console.info(`on close function: ${als.get('name')}`);
  });
  next();
});

app.use((req, res, next) => {
  emiter.once('my-event', () => {
    // 此事件触发的时候，调用链还存在
    console.info(`on my event: ${als.get('name')}`);
  });
  next();
});

app.use(async (req, res, next) => {
  await request.get('https://www.baidu.com/');
  console.info(`await http request: ${als.get('name')}`);
  next();
});


app.use((req, res, next) => {
  return request.get('https://www.baidu.com/').then(() => {
    console.info(`get immediate from top:${als.get('immediate')}`);
    console.info(`promise function: ${als.get('name')}`);
    next();
  });
});

app.use((req, res) => {
  emiter.emit('my-event');
  res.send(`Hello ${als.get('name')}`);
});

app.listen(3015);
