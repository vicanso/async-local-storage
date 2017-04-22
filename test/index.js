'use strict';
const assert = require('assert');
const express = require('express');
const request = require('supertest');
const crypto = require('crypto');
const fs = require('fs');
const als = require('..');
als.enable();

const app = express();


const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

function getId(cb) {
  return new Promise((resolve) => {
    fs.readFile(__filename, () => {
      resolve(als.get('id'));
    });
  });
}

app.use(function(req, res, next) {
  als.set('id', req.get('X-Request-Id'));
  next();
});

app.get('/', function (req, res) {
  getId().then((id) => {
    res.send(id);
  }).catch(err => res.status(500).send(err.message));
});

const server = app.listen();


describe('async-local-storage', () => {
  it('use', (done) => {
    const fns = [1, 2, 3, 4, 5].map(() => {
      const id = crypto.randomBytes(8).toString('hex');
      return request(server).get('/')
        .set('X-Request-Id', id)
        .expect(200)
        .then((response) => {
          assert.equal(response.text, id);
        });
    });
    Promise.all(fns).then(() => {
      done();
    }).catch(done);
  });
});