// Global configs
$env = {
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  destination_host: process.env.DESTINATION_URL,
  verify_token: (process.env.VERIFY_TOKEN || 'my53cr37v3r1f1c4710n70k3n')
};

// Module dependencies.
var express = require('express');
var routes = require('./routes');
var proxygram = require('./routes/proxygram');
var http = require('http');
var path = require('path');

var app = express();

// All environments
app.set('port', (process.env.PORT || 3000));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// Development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// Routes
app.get('/', routes.index);
app.post('/subscribe', proxygram.subscribe);
app.post('/unsubscribe', proxygram.unsubscribe);
app.get('/subscription', proxygram.confirmSubscription);
app.post('/subscription', proxygram.handlePush);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Proxygram listening on port ' + app.get('port'));
});
