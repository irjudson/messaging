if (process.env.NEW_RELIC_LICENSE_KEY && process.env.NEW_RELIC_APP_NAME) {
    require('newrelic');
}

var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , BearerStrategy = require('passport-http-bearer').Strategy
  , core = require('nitrogen-core')
  , controllers = require('./controllers')
  , LocalStrategy = require('passport-local').Strategy
  , middleware = require('./middleware')
  , mongoose = require('mongoose')
  , passport = require('passport')
  , path = require('path');

core.config = require('./config');
core.log = require('winston');

if (process.env.LOGGLY_SUBDOMAIN && process.env.LOGGLY_INPUT_TOKEN &&
    process.env.LOGGLY_USERNAME && process.env.LOGGLY_PASSWORD) {
    
    core.log.add(Loggly, {
        "subdomain": process.env.LOGGLY_SUBDOMAIN,
        "inputToken": process.env.LOGGLY_INPUT_TOKEN,
        "auth": {
            "username": process.env.LOGGLY_USERNAME,
            "password": process.env.LOGGLY_PASSWORD
        }
    });
}

core.log.remove(core.log.transports.Console);
core.log.add(core.log.transports.Console, { colorize: true, timestamp: true, level: 'debug' });

core.log.info("connecting to mongodb instance: " + core.config.mongodb_connection_string);
mongoose.connect(core.config.mongodb_connection_string);

app.use(express.logger(core.config.request_log_format));
app.use(express.compress());
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.cookieSession({
    secret: core.config.user_session_secret,
    cookie: {
        expires: new Date(Date.now() + core.config.user_session_timeout_seconds * 1000),
        maxAge: new Date(Date.now() + core.config.user_session_timeout_seconds * 1000),
    }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new BearerStrategy({}, core.services.accessTokens.verify));

app.use(middleware.crossOrigin);

app.enable('trust proxy');
app.disable('x-powered-by');

// only open endpoints when we have a connection to MongoDB.
mongoose.connection.once('open', function () {
    core.log.info("service connected to mongodb.");

    core.services.initialize(function (err) {
        console.log('here: ' + err);
        if (err) return core.log.error("service failed to initialize: " + err);
        if (!core.services.principals.servicePrincipal) return core.log.error("Service principal not available after initialize.");

        server.listen(core.config.internal_port);
        core.services.subscriptions.attach(server);

        core.log.info("service has initialized itself, exposing api at: " + core.config.api_endpoint);

        // REST API ENDPOINTS

        // blob endpoints
        if (core.config.blob_provider) {
            app.get(core.config.blobs_path + '/:id',    middleware.accessTokenAuth,        controllers.blobs.show);
            app.post(core.config.blobs_path,            middleware.accessTokenAuth,        controllers.blobs.create);
        } else {
            log.warn("not exposing blob endpoints because no blob provider configured (see config.js).");
        }

        // ops endpoints
        app.get(core.config.ops_path + '/health',                                          controllers.ops.health);

        // permissions endpoints
        app.get(core.config.permissions_path,           middleware.accessTokenAuth,        controllers.permissions.index);
        app.post(core.config.permissions_path,          middleware.accessTokenAuth,        controllers.permissions.create);
        app.delete(core.config.permissions_path + '/:id', middleware.accessTokenAuth,      controllers.permissions.remove);

        // message endpoints
        app.get(core.config.messages_path + '/:id',     middleware.accessTokenAuth,        controllers.messages.show);
        app.get(core.config.messages_path,              middleware.accessTokenAuth,        controllers.messages.index);
        app.post(core.config.messages_path,             middleware.accessTokenAuth,        controllers.messages.create);
        app.delete(core.config.messages_path,           middleware.accessTokenAuth,        controllers.messages.remove);

        // client libraries
        app.get('/client/nitrogen.js', function(req, res) {
            res.contentType('application/javascript');
            res.send(core.services.messages.clients['nitrogen.js']);
        });

        app.get('/client/nitrogen-min.js', function(req, res) {
            res.contentType('application/javascript');
            res.send(core.services.messages.clients['nitrogen-min.js']);
        });

        // static files (static/ is mapped to the root API url for any path not already covered above)
        app.use(express.static(path.join(__dirname, '/static')));

        core.log.info("service has initialized API endpoints");

        mongoose.connection.on('error', core.log.error);
    });
});

exports = module.exports = app;