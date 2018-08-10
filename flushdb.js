const redis = require('redis');

client = redis.createClient();
client.flushall((err, success) => {
    console.log('redis db flushed, err=',err,' success=',success);
    process.exit();
});
