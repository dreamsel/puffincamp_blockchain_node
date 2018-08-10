const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const redis = require('redis');

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(session({secret:'mysupersessionsecret1234',resave:true, saveUninitialized:true,proxy:false}));
app.set('view engine','ejs');
app.use(express.static('public'));

const port = process.env.PORT || 8080;
const redisConnection = process.env.REDIS_CONNECTION || 1;
const id = process.env.ID || 11;
const name = process.env.NAME || "demos";

const logic = require('./app/logic.js');
client = redis.createClient();
client.on('connect',function(){
  client.select(redisConnection,function(){
    const url = 'http://localhost:'+port;
    logic.init(client,id,name,url);
    require('./app/routes.js')(app,logic);
  });

  app.listen(port);
});
console.log('started on port',port);
