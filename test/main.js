var async = require('async')
  , assert = require('assert')
    , fs = require('fs')
  , server = require('../server')
  , core = require('nitrogen-core');

var removeAll = function (modelType, callback) {
    modelType.remove({}, callback);
};

before(function(done) {
    var modelTypes = Object.keys(core.models).map(function(key) {
        return core.models[key];
    });

    async.each(modelTypes, removeAll, function(err) {
        assert(!err);

        core.config.pubsub_provider.resetForTest(function(err) {
            assert(!err);

            core.fixtures.reset(function(err) {
                assert(!err);

                core.log.debug("FIXTURES: creation finished...");
                done();
            });
        });
    });
});
