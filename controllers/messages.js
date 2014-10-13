var async = require('async')
  , core = require('nitrogen-core');

exports.create = function(req, res) {
    core.services.messages.createMany(req.user, req.body, function(err, messages) {
        if (err) return core.utils.handleError(res, err);

        res.send({ "messages": messages });
    });
};

exports.index = function(req, res) {
    var query = core.utils.parseQuery(req);
    var options = core.utils.parseOptions(req);

    if (!options.sort) options.sort = { ts: -1 };

    core.services.messages.find(req.user, query, options, function(err, messages) {
        if (err) return core.utils.handleError(res, err);

        res.send({ "messages": messages });
    });
};

exports.remove = function(req, res) {
    var query = core.utils.parseQuery(req);

    core.services.messages.remove(req.user, query, function(err, removed) {
        if (err) return core.utils.handleError(res, err);

        res.send({ "removed": removed });
    });
};

exports.show = function(req, res) {
    core.services.messages.findById(req.user, req.params.id, function(err, message) {
        if (err) return core.utils.handleError(res, err);
        if (!message) return core.utils.sendFailedResponse(res, 403, err);

        res.send({ "message": message });
    });
};
