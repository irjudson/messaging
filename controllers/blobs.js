var core = require('nitrogen-core');

exports.show = function(req, res) {
    res.setHeader('Cache-Control', 'max-age=' + core.config.blob_cache_lifetime);

    core.services.blobs.stream(req.user, req.params.id, res, function(err, blob) {
      if (err) return core.utils.handleError(res, err);
      if (!blob) return core.utils.handleError(res, utils.notFoundError());
    });
};

exports.create = function(req, res) {
    var blob = new core.models.Blob({
        content_type: req.get('Content-Type'),
    });

    core.services.blobs.create(req.user, blob, req, function(err, blob) {
         if (err) return core.utils.handleError(err);

         res.send({ blob: blob });
    });
};