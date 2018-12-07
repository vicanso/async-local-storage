const path = require('path');
const fs = require('fs');
const util = require('util');
const crypto = require('crypto');
const dns = require('dns');
const http = require('http');
const request = require('supertest');

const als = require('./als');
const {
  server,
  redisClient,
} = require('./support/server');

const topList = [];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const randomBytes = () => crypto.randomBytes(8).toString('hex');
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const lookup = util.promisify(dns.lookup);
const lookupService = util.promisify(dns.lookupService);
const file = path.join(__dirname, './tmp');
fs.writeFileSync(file, '');

als.enable();

afterAll(() => {
  als.disable();
  redisClient.disconnect();
  server.close();
  const ids = [];
  let err = null;
  topList.forEach((item) => {
    if (ids.indexOf(item.id) !== -1) {
      err = new Error('the id should be unique');
    } else {
      ids.push(item.id);
    }
  });
  if (err) {
    console.error(err);
    throw err;
  }
});

describe('fs', () => {
  test('fs watch', async () => {
    als.scope();
    const id = randomBytes();
    als.set('id', id);
    const watcher = fs.watch(file, () => {
      expect(als.get('id')).toBe(id);
      watcher.close();
    });
    await writeFile(file, 'a');
    topList.push(als.top());
  });

  test('fs write/read promise', () => {
    als.scope();
    const id = randomBytes();
    als.set('id', id);
    return writeFile(file, 'a')
      .then(() => {
        expect(als.get('id')).toBe(id);
        return new Promise((resolve, reject) => {
          fs.readFile(file, err => {
            if (err) {
              reject(err);
              return;
            }
            expect(als.get('id')).toBe(id);
            resolve();
          });
        });
      })
      .then(() => {
        topList.push(als.top());
      });
  });

  test('fs write/read async/await', async () => {
    als.scope();
    const id = randomBytes();
    als.set('id', id);
    await writeFile(file, 'a');
    expect(als.get('id')).toBe(id);
    await readFile(file);
    expect(als.get('id')).toBe(id);
        topList.push(als.top());
  });
});

describe('JSSTREAM', () => {
  test('js read stream', () =>
    new Promise((resolve, reject) => {
      als.scope();
      const id = randomBytes();
      als.set('id', id);
      const stream = fs.createReadStream(file);
      stream.on('data', () => {
        expect(als.get('id')).toBe(id);
        stream.close();
      });
      stream.on('error', reject);
      stream.on('close', () => {
        topList.push(als.top());
        expect(als.get('id')).toBe(id);
        resolve();
      });
      fs.writeFileSync(file, 'ab');
    }));

  test('js write stream', () =>
    new Promise((resolve, reject) => {
      als.scope();
      const id = randomBytes();
      als.set('id', id);
      const stream = fs.createWriteStream(file);
      stream.on('error', reject);
      stream.on('close', () => {
        topList.push(als.top());
        expect(als.get('id')).toBe(id);
        resolve();
      });
      stream.write('ab');
      stream.end();
    }));
});

describe('dns', () => {
  test('get addr info promise', () => {
    als.scope();
    const id = randomBytes();
    als.set('id', id);
    return lookup('www.baidu.com')
      .then(() => {
        expect(als.get('id')).toBe(id);
      })
      .then(() => {
        topList.push(als.top());
      });
  });

  test('get addr info async/await', async () => {
    als.scope();
    const id = randomBytes();
    als.set('id', id);
    await lookup('www.baidu.com');
    expect(als.get('id')).toBe(id);
        topList.push(als.top());
  });

  test('get name info promise', () => {
    als.scope();
    const id = randomBytes();
    als.set('id', id);
    return lookupService('127.0.0.1', 80)
      .then(() => {
        expect(als.get('id')).toBe(id);
      })
      .then(() => {
        topList.push(als.top());
      });
  });

  test('get name info async/await', async () => {
    als.scope();
    const id = randomBytes();
    als.set('id', id);
    await lookupService('127.0.0.1', 80);
    expect(als.get('id')).toBe(id);
        topList.push(als.top());
  });
});

describe('http', () => {
  test('http get', () => {
    als.scope();
    const id = randomBytes();
    als.set('id', id);
    return new Promise((resolve, reject) => {
      expect(als.get('id')).toBe(id);
      http
        .get('http://www.baidu.com/', res => {
          expect(als.get('id')).toBe(id);
          res.on('data', () => {
            expect(als.get('id')).toBe(id);
          });
          res.on('end', () => {
            expect(als.get('id')).toBe(id);
            resolve();
          });
        })
        .on('error', reject);
    }).then(() => {
      expect(als.get('id')).toBe(id);
        topList.push(als.top());
    });
  });
});

describe('linked top', () => {
  test('normal linked top', () => {
    als.scope();
    const id = randomBytes();
    const user = randomBytes();
    als.set('id', id);
    return delay(10).then(() => {
      const fn1 = delay(10).then(() => {
        const current = als.getCurrentData();
        expect(current.user).toBeUndefined();
      });
      const fn2 = new Promise((resolve) => {
        als.set('user', user);
        resolve();
      });
      return Promise.all([fn1, fn2]);
    }).then(() => {
      expect(als.get('id')).toBe(id);
      expect(als.get('user')).toBe(user);
    });
  });

  test('set value to self scope', () => {
    als.scope();
    const id = randomBytes();
    const user = randomBytes();
    als.set('id', id);
    return delay(10).then(() => {
      expect(als.get('id')).toBe(id);
      als.set('id', 'a');
      als.set('user', user);
    }).then(() => {
      expect(als.get('id')).toBe('a');
      expect(als.get('user')).toBe(user);
    });
  });

  test('enableLinkedTop', () => {
    als.scope();
    const id = randomBytes();
    const user = randomBytes();
    als.enableLinkedTop();
    als.set('id', id);
    const current = als.getCurrentData();
    return delay(10).then(() => {
      als.set('user', user);
    }).then(() => {
      expect(current.id).toBe(id);
      expect(current.user).toBe(user);
      als.disableLinkedTop();
    });
  });
});

describe('get use', () => {
  test('use', () => {
    als.scope();
    const id = als.currentId();
    return delay(10).then(() => {
      const use = als.use(id);
      expect(use).toBeGreaterThanOrEqual(9 * 1000 * 1000);
    });
  });
});

describe('size', () => {
  test('get size', () => {
    expect(als.size()).toBeGreaterThan(1);
  });
});

describe('koa', () => {
  const check = (url) => {
    const fns = [1, 2, 3, 4, 5].map(() => {
      const id = randomBytes(8);
      return request(server).get(url)
        .set('X-Request-Id', id)
        .expect(200)
        .then((response) => {
          expect(response.text).toBe(id);
        });
    });
    return Promise.all(fns);
  };
  test('get request id', () => check('/'));

  test('get request id (fs)', () => check('/?fs=true'));

  test('get request id(delay)', () => check('/?delay=true'));

  test('get request id(http)', () => check('/?http=true'));

  test('get request id(session)', () => check('/?session=true'));

  test('get request id(all)', () => check('/?fs=true&delay=true&http=true&session=true'))
});

describe('getFromParent', () => {
  test('top', () => {
    als.scope()
    let id = als.getFromParent('id')
    expect(id).toBe(undefined);
    als.set('id', 1);
    id = als.getFromParent('id')
    expect(id).toBe(undefined);
  })
  describe('1 level', () => {
    test('single', () => {
      als.scope()
      als.set('id', 1);
      return delay(10).then(() => {
        expect(als.getFromParent('id')).toBe(1)
        als.set('id', 2)
        expect(als.getFromParent('id')).toBe(1)
        expect(als.get('id')).toBe(2)
      })
    })
    test('multiple', () => {
      als.scope()
      als.set('id', 1);
      return Promise.all([
        delay(10).then(() => {
          expect(als.getFromParent('id')).toBe(1)
          als.set('id', 2)
          expect(als.getFromParent('id')).toBe(1)
          expect(als.get('id')).toBe(2)
        }),
        delay(10).then(() => {
          expect(als.getFromParent('id')).toBe(1)
          als.set('id', 3)
          expect(als.getFromParent('id')).toBe(1)
          expect(als.get('id')).toBe(3)
        }),
      ]).then(() => {
        expect(als.get('id')).toBe(1)
      })
    })
  })
  test('2 level', () => {
    als.scope()
    als.set('id', 1);
    return delay(10).then(() => {
      als.set('key2', 1)
      return delay(10).then(() => {
        expect(als.get('key2')).toBe(1)
        expect(als.getFromParent('id')).toBe(1)
        als.set('id', 2)
        expect(als.getFromParent('id')).toBe(1)
        expect(als.get('id')).toBe(2)
      })
    })
  })
})
