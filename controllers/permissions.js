var async = require('async')
  , core = require('nitrogen-core');

exports.create = function(req, res) {
    var permission = new core.models.Permission(req.body);

    core.services.permissions.create(req.user, permission, function(err, permission) {
        if (err) return core.utils.handleError(res, err);

        res.send({ 'permission': permission });
    });
};

exports.index = function(req, res) {
    var query = core.utils.parseQuery(req);
    var options = core.utils.parseOptions(req);

    core.services.permissions.find(req.user, query, options, function(err, permissions) {
        if (err) return core.utils.handleError(res, err);

        res.send({ "permissions": permissions });
    });
};

exports.remove = function(req, res) {
    core.services.permissions.removeById(req.user, req.params.id, function(err) {
        if (err) return core.utils.handleError(res, err);

        res.send(200);
    });
};