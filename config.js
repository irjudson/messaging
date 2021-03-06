var log = require('winston')
  , Loggly = require('winston-loggly').Loggly
  , azureProviders = require('nitrogen-azure-providers')
  , localProviders = require('nitrogen-local-providers')
  , mongodbProviders = require('@irjudson/nitrogen-mongodb-providers')
  , redisProviders = require('nitrogen-redis-providers')
  , winston = require('winston');

var config = null;

//
// To enable proxies like NGINX, Nitrogen has internal and external ports.
//
// external_port defines the port that clients should use to access the service.
// internal_port defines the port that the service will listen to.
//

if (process.env.NODE_ENV === "production") {
    config = {
        internal_port: process.env.PORT || 8080,
        web_admin_uri: process.env.WEB_ADMIN_URI || "https://admin.nitrogen.io",
        protocol: process.env.PROTOCOL || "https"
    };

    if (!process.env.ACCESS_TOKEN_SIGNING_KEY) {
        console.log('FATAL ERROR: you must provide an ACCESS_TOKEN_SIGNING_KEY as an environmental variable.');
        process.exit(0);
    }

} else if (process.env.NODE_ENV === "test") {
    config = {
        external_port: 3051,
        internal_port: 3051,
        protocol: process.env.PROTOCOL || "http",
        mongodb_connection_string: "mongodb://localhost/nitrogen_test",
        web_admin_uri: "http://localhost:9000"
    };
} else {
    config = {
        external_port: 3031,
        protocol: process.env.PROTOCOL || "http",
        mongodb_connection_string: "mongodb://localhost/nitrogen_dev",
        web_admin_uri: "http://localhost:9000"
    };
}

config.internal_port = config.internal_port || 3031;
config.external_port = config.external_port || 443;
config.protocol = process.env.PROTOCOL || config.protocol || "https";
config.host = process.env.HOST_NAME || config.host || "localhost";
config.mongodb_connection_string = config.mongodb_connection_string || process.env.MONGODB_CONNECTION_STRING;

// Endpoint URI configuration

config.api_path = "/api/";
config.v1_api_path = config.api_path + "v1";

config.base_endpoint = config.protocol + "://" + config.host + ":" + config.external_port;
config.api_endpoint = config.base_endpoint + config.v1_api_path;

config.subscriptions_path = '/';
config.subscriptions_endpoint = config.base_endpoint + config.subscriptions_path;

config.api_keys_path = config.v1_api_path + "/api_keys";
config.api_keys_endpoint = config.base_endpoint + config.api_keys_path;

config.blobs_path = config.v1_api_path + "/blobs";
config.blobs_endpoint = config.base_endpoint + config.blobs_path;

config.headwaiter_path = config.v1_api_path + "/headwaiter";
config.headwaiter_uri = config.base_endpoint + config.headwaiter_path;

config.messages_path = config.v1_api_path + "/messages";
config.messages_endpoint = config.base_endpoint + config.messages_path;

config.ops_path = config.v1_api_path + "/ops";
config.ops_endpoint = config.base_endpoint + config.ops_path;

config.permissions_path = config.v1_api_path + "/permissions";
config.permissions_endpoint = config.base_endpoint + config.permissions_path;

config.principals_path = config.v1_api_path + "/principals";
config.principals_endpoint = config.base_endpoint + config.principals_path;

config.users_path = "/user";
config.users_endpoint = config.base_endpoint + config.users_path;

config.user_authorize_path = config.users_path + "/authorize";
config.user_change_password_path = config.users_path + "/changepassword";
config.user_create_path = config.users_path + "/create";
config.user_decision_path = config.users_path + "/decision";
config.user_delete_account_path = config.users_path + "/delete";
config.user_login_path = config.users_path + "/login";
config.user_logout_path = config.users_path + "/logout";
config.user_reset_password_path = config.users_path + "/resetpassword";

config.default_user_redirect = "http://admin.nitrogen.io";

config.user_session_secret = process.env.USER_SESSION_SECRET || "development";
config.user_session_timeout_seconds = 30 * 24 * 60 * 60; // seconds (30 days)

// Security configuration parameters.  Make sure you know what you are doing before changing
// any of these parameters.

config.password_hash_iterations = 10000;
config.password_hash_length = 128;
config.salt_length_bytes = 64;
config.reset_password_length = 10;
config.minimum_password_length = 8;

config.auth_code_bytes = 16;
config.api_key_bytes = 16;
config.unassigned_apikey_pool_size = 10;

config.nonce_bytes = 32;
config.nonce_lifetime_seconds = 5 * 60;
config.public_key_bits = 2048;
config.public_key_exponent = 65537;

config.auth_code_lifetime_seconds = 60 * 60; // seconds (default: 1 hour)

config.device_secret_bytes = 128;

config.access_token_bytes = 32;
config.access_token_lifetime = 7; // days
config.access_token_signing_key = process.env.ACCESS_TOKEN_SIGNING_KEY || '12345678901234567890123456789012';

config.blob_cache_lifetime = 2592000; // seconds

// # of days a message should be remain in indexed storage by default
config.default_message_indexed_lifetime = 7; // days

config.permissions_for_cache_lifetime_minutes = 24 * 60; // minutes
config.principals_cache_lifetime_minutes = 24 * 60; // minutes

// Provider configurations
config.flatten_messages = false;
config.archive_providers = [];

// when the token gets within 10% (default) of config.access_token_lifetime,
// refresh it with a new token via the response header.
config.refresh_token_threshold = 0.1;

config.redis_servers = {
    "n2-redis-1": {
        "host": process.env.REDIS_HOST || "localhost",
        "port": process.env.REDIS_PORT || 6379,
        "password": process.env.REDIS_PASSWORD
    }
};

if (process.env.AZURE_STORAGE_ACCOUNT && process.env.AZURE_STORAGE_KEY) {
    console.log('archive_provider: using Azure Table storage.');

    var azureTableStorageProvider = new azureProviders.AzureTableStorageProvider(config, log);
    config.archive_providers.push(azureTableStorageProvider);
    config.primary_archive_provider = azureTableStorageProvider;

    console.log('blob_provider: using Azure Blob storage.');
    config.blob_provider = new azureProviders.AzureBlobProvider(config, log);

    config.images_endpoint = config.blob_provider.base_endpoint + "/images";

    // Eventhub configuration - add to archive providers for now.
    if (process.env.AZURE_SERVICE_BUS && process.env.AZURE_SAS_KEY_NAME && process.env.AZURE_SAS_KEY && process.env.AZURE_EVENTHUB_NAME) {
        config.archive_providers.push(new azureProviders.AzureEventHubProvider(config, log));
    }

    console.log('pubsub_provider: using Azure queues pubsub.');
    config.pubsub_provider = new azureProviders.AzureQueuesPubSubProvider(config, log);
} else {
    console.log('archive_provider: using local storage.');

    var mongoDBArchiveProvider = new mongodbProviders.MongoDBArchiveProvider(config, log);
    config.archive_providers.push(mongoDBArchiveProvider);
    config.primary_archive_provider = mongoDBArchiveProvider;

    // var nullArchiveProvider = new localProviders.NullArchiveProvider(config, log);
    // config.archive_providers.push(nullArchiveProvider);
    // config.primary_archive_provider = nullArchiveProvider;

    console.log('blob_provider: using local storage.');
    config.blob_storage_path = './storage';
    config.blob_provider = new localProviders.LocalBlobProvider(config, log);

    console.log('pubsub_provider: using Redis pubsub.');
    config.pubsub_provider = new redisProviders.RedisPubSubProvider(config, log);
}

console.log('cache_provider: Using redis cache provider.');
config.cache_provider = new redisProviders.RedisCacheProvider(config, log);

console.log('email_provider: using null provider.');
config.email_provider = new localProviders.NullEmailProvider(config, log);

// You can use Loggly's log service by specifying these 4 environmental variables

// if you'd like additional indexes applied to messages at the database layer, you can specify them here.
config.message_indexes = [
];

// Claim codes are what users use to claim devices they have added to the service when IP matching fails.
// Longer claim codes are more secure but less convienent for users.
config.claim_code_length = 8;

// run the janitor every minute
config.janitor_interval = 60 * 1000; // ms

// Validate all message schemas to conform to all core and installed schemas.
config.validate_schemas = true;

// Email address that the service should use for administrative emails.
config.service_email_address = "admin@nitrogen.io";

// Migration configuration
config.migrations_relative_path = "/node_modules/nitrogen-core/migrations/";

// Test fixture location configuration
config.blob_fixture_path = 'node_modules/nitrogen-core/test/fixtures/images/image.jpg';

module.exports = config;
