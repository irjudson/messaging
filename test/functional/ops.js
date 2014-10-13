var assert = require('assert')
  , core = require('nitrogen-core')
  , request = require('request');

describe('ops endpoint', function() {

    it('should have passing health', function(done) {
        request({url: core.config.ops_endpoint + '/health', json: true}, function(err, resp, body) {
            assert(!err);

            assert.equal(resp.statusCode, 200);
            assert.equal(body.status, "ok");
            done();
        });
    });

    it('should have stats', function(done) {
        request({url: core.config.ops_endpoint + '/stats', json: true}, function(err, resp, body) {
            assert(!err);

            assert.equal(resp.statusCode, 200);

            assert.notEqual(body.devices_24h_active, undefined);
            assert.notEqual(body.messages, undefined);
            assert.notEqual(body.principals_24h_active, undefined);
            assert.notEqual(body.subscriptions, undefined);
            assert.notEqual(body.users_24h_active, undefined);

            done();
        });
    });

});