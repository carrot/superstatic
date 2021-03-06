var connect = require('connect');
var request = require('supertest');
var expect = require('expect.js');
var sinon = require('sinon');
var configure = require('../../../lib/server/middleware/configure');
var defaultSettings = require('../../../lib/server/settings/default');
var _ = require('lodash');
var connect = require('connect');

describe('configure middleware', function() {
  var app;
  var settings;

  beforeEach(function () {
    app = connect();
    settings = defaultSettings.create();
  });

  it('loads the settings', function (done) {
    app.use(configure(settings));
    app.use(function (req, res, next) {
      expect(req.config).to.not.equal(undefined);
      next();
    });

    request(app).get('/').end(done);
  });

  it('sets the default index file', function (done) {
    app.use(configure(settings));
    app.use(function (req, res, next) {
      expect(req.config.index).to.equal('index.html');
      next();
    });

    request(app).get('/').end(done);
  });

  it('parses the hostname to get the request configuration', function (done) {
    sinon.spy(settings, "load");
    app.use(configure(settings));
    app.use(function (req, res, next) {
      expect(settings.load.args[0][0]).to.be('foobar');
      settings.load.restore();
      next();
    });
    request(app).get('/').set('host', 'foobar').end(done);
  });
});
