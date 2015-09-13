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
  , mongodbProviders = require('@irjudson/nitrogen-mongodb-providers')
  , passport = require('passport')
  , path = require('path');

core.config = require('./config');
core.log = require('winston');

core.config.pubsub_provider.services = core.services;

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
core.log.add(core.log.transports.Console, { colorize: true, timestamp: true, level: 'info' });

app.use(express.logger(core.config.request_log_format));
app.use(express.compress());
app.use(express.bodyParser());

if (process.env.USE_MONGODB_ARCHIVE_PROVIDER) {
    core.config.archive_providers.unshift(new mongodbProviders.MongoDBArchiveProvider(core));
}

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

core.services.initialize(function (err) {
    if (err) return core.log.error("service failed to initialize: " + err);
    if (!core.services.principals.servicePrincipal) return core.log.error("Service principal not available after initialize.");

    server.listen(core.config.internal_port);

    core.log.info("service has initialized itself, exposing api externally at: " + core.config.api_endpoint + " and internally on port: " + core.config.internal_port);

    // REST API ENDPOINTS

    // TODO: Drop blob endpoints.

    // blob endpoints
    if (core.config.blob_provider) {
        app.get(core.config.blobs_path + '/:id',    middleware.accessTokenAuth,        controllers.blobs.show);
        app.post(core.config.blobs_path,            middleware.accessTokenAuth,        controllers.blobs.create);
    } else {
        log.warn("not exposing blob endpoints because no blob provider configured (see config.js).");
    }

    // ops endpoints
    app.get(core.config.ops_path + '/health',                                          controllers.ops.health);

    // TODO: Move permissions to the device registry

    // permissions endpoints
    app.get(core.config.permissions_path,           middleware.accessTokenAuth,        controllers.permissions.index);
    app.post(core.config.permissions_path,          middleware.accessTokenAuth,        controllers.permissions.create);
    app.delete(core.config.permissions_path + '/:id', middleware.accessTokenAuth,      controllers.permissions.remove);

    // message endpoints
    app.get(core.config.messages_path + '/:id',     middleware.accessTokenAuth,        controllers.messages.show);
    app.get(core.config.messages_path,              middleware.accessTokenAuth,        controllers.messages.index);
    app.post(core.config.messages_path,             middleware.accessTokenAuth,        controllers.messages.create);
    // app.delete(core.config.messages_path,           middleware.accessTokenAuth,        controllers.messages.remove);

    // TODO: Add mqtt endpoint

    // subscription endpoints
    core.services.subscriptions.attach(server);

    // TODO: Do we need user serialization and deserialization?

    // user serialization and deserialization
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        core.services.principals.findByIdCached(core.services.principals.servicePrincipal, id, done);
    });

    core.log.info("service has initialized API endpoints");
});

exports = module.exports = app;
