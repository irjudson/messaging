var assert = require('assert')
  , core = require('nitrogen-core')
  , request = require('request');

describe('permissions endpoint', function() {
    it('index should be not be accessible anonymously', function(done) {
        request(core.config.permissions_endpoint, function(err, resp, body) {
            assert.equal(err, undefined);
            assert.equal(resp.statusCode, 401);
            done();
        });
    });

    it('index should return all permissions', function(done) {
        request({ url: core.config.permissions_endpoint,
                  headers: { Authorization: core.fixtures.models.accessTokens.user.toAuthHeader() },
                             json: true }, function(err,resp,body) {
            assert.ifError(err);
            assert.equal(resp.statusCode, 200);

            assert.notEqual(body.permissions, undefined);
            assert.equal(body.permissions.length > 0, true);
            done();
        });
    });

    it('should allow creating and deleting a permission by a user', function(done) {
        var permission = {
            issued_to:     core.fixtures.models.principals.user.id,
            principal_for: core.fixtures.models.principals.user.id,
            action:        'admin',
            priority:      100,
            authorized:    true
        };

        request.post(core.config.permissions_endpoint,
            { headers: { Authorization: core.fixtures.models.accessTokens.user.toAuthHeader() },
                json: permission }, function(err, resp, body) {
                assert.ifError(err);
                assert.equal(resp.statusCode, 200);

                assert.notEqual(body.permission.id, undefined);

                request.del({ url: core.config.permissions_endpoint + "/" + body.permission.id,
                              headers: { Authorization: core.fixtures.models.accessTokens.user.toAuthHeader() } }, function(err, resp, body) {
                    assert.ifError(err);
                    assert.equal(resp.statusCode, 200);

                    done();
                });
            }
        );
    });

    it('shouldnt allow anotherUser to create a permission on another principal it isnt admin on', function(done) {
        var permission = {
            issued_to:     core.fixtures.models.principals.anotherUser.id,
            principal_for: core.fixtures.models.principals.device.id,
            action:        'admin',
            priority:      100,
            authorized:    true
        };

        request.post(core.config.permissions_endpoint,
            { headers: { Authorization: core.fixtures.models.accessTokens.anotherUser.toAuthHeader() },
                json: permission }, function(err, resp, body) {
                assert.ifError(err);
                assert.equal(resp.statusCode, 403);

                done();
            }
        );
    });

    it('shouldnt allow anotherUser to create a blanket admin permission', function(done) {
        var permission = {
            issued_to:     core.fixtures.models.principals.anotherUser.id,
            action:        'admin',
            priority:      100,
            authorized:    true
        };

        request.post(core.config.permissions_endpoint,
            { headers: { Authorization: core.fixtures.models.accessTokens.anotherUser.toAuthHeader() },
                json: permission }, function(err, resp, body) {
                assert.ifError(err);
                assert.equal(resp.statusCode, 403);

                done();
            }
        );
    });

    it('should allow anotherUser to grant a user view permissions', function(done) {
        var permission = {
            issued_to:     core.fixtures.models.principals.user.id,
            principal_for: core.fixtures.models.principals.anotherUser.id,
            action:        'admin',
            priority:      100,
            authorized:    true
        };

        request.post(core.config.permissions_endpoint, {
            headers: {
                Authorization: core.fixtures.models.accessTokens.anotherUser.toAuthHeader()
            },
            json: permission
        }, function(err, resp, body) {
            assert.ifError(err);
            assert.equal(resp.statusCode, 200);

            done();
        });
    });
});