const assert = require('assert');
const crypto = require('crypto');
const request = require('supertest');
const fs = require('fs');
const util = require('util');
const superagent = require('superagent');

const readfilePromise = util.promisify(fs.readFile);
const als = require('..');

const randomBytes = length => crypto.randomBytes(length).toString('hex');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


const {
  server,
} = require('./support/server');

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

  it('loop(20) success', function(done) {
    this.timeout(120 * 1000);
    const fns = [];
    for (let i = 0; i < 20; i += 1) {
      const id = randomBytes(8);
      const p = request(server).get('/?fs=true&http=true')
        .set('X-Request-Id', id)
        .expect(200)
        .then((response) => {
          assert.equal(response.text, id);
        }).catch(done);
      fns.push(p);
    }
    Promise.all(fns).then(() => done()).catch(done);
  });

  it('fs settimeout http', (done) => {
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
      done();
    }).catch(done);
  });

  it('get from parent', (done) => {
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
  });

  it('get the size', (done) => {
    setTimeout(function() {
      assert(als.size()); 
      als.disable();
      done();
    }, 1000);
  });
});
