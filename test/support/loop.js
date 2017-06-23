const request = require('supertest');
const crypto = require('crypto');
const assert = require('assert');

const als = require('../..');

const {
  server,
} = require('./server');

const randomBytes = length => crypto.randomBytes(length).toString('hex');

let count = 0;
setInterval(() => {
  count += 1;
  if (count % 10 === 0) {
    const memoryUsage = Math.floor(process.memoryUsage().rss / (1024 * 1024));
    console.info(`count:${count}, als map size:${als.size()} memory:${memoryUsage}`);
  }
  const id = randomBytes(8);
  request(server)
    .get('/?fs=true&session=true&delay=true')
    .set('X-Request-Id', id)
    .then((res) => {
      assert.equal(res.text, id);
    });
}, 500);
