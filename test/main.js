var assert = require('assert')
  , server = require('../server') 
  , core = require('nitrogen-core')
  , fixtures = require('./fixtures');

before(function(done) {
    console.log('start of before');
    core.config.pubsub_provider.resetForTest(function(err) {
        assert(!err);
        console.log('after resetForTest');

        fixtures.reset(function(err) {
            assert(!err); 

            core.log.info("FIXTURES: creation finished...");
            done();
        });
    });
});
