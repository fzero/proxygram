// Dependencies
var utils = require('express/node_modules/connect').utils;
var request = require('request');
var Instagram = require('instagram-node-lib');
Instagram.set('client_id', $env.client_id);
Instagram.set('client_secret', $env.client_secret);
Instagram.set('maxSockets', 10);


/*
 * Instagram subscribe/unsubscribe
 */

// Subscription endpoint
exports.subscribe = function(req, res){
  console.log('--- SUBSCRIPTION starting: %s', JSON.stringify(req.body));

  if (!req.body.subscription) {
    console.error("!!! SUBSCRIPTION error: missing subscription data.");
    res.send(400);
    return null;
  }

  var subscription = utils.merge(
    req.body.subscription,
    {
      callback_url: 'http://' + req.host + '/subscription',
      verify_token: $env.verify_token,
      aspect: 'media',
      complete: function(data, pagination){
        console.log('--- SUBSCRIPTION result: %s (success)', JSON.stringify(data));
        res.json(data);
      },
      error: errorLogger
    }
  );

  Instagram.subscriptions.subscribe(subscription);
};


// Unsubscription endpoint
exports.unsubscribe = function(req, res){
  console.log('--- UNSUBSCRIPTION starting: %s', JSON.stringify(req.body));

  if (!req.body.sub_id) {
    console.error("!!! UNSUBSCRIPTION error: missing sub_id.");
    res.send(400);
    return null;
  }

  var sub_id = req.body.sub_id;

  Instagram.subscriptions.unsubscribe({
    id: sub_id,
    complete: function(data, pagination){
      console.log('--- UNSUBSCRIPTION result: %s (success)', data);
      res.json(data);
    },
    error: errorLogger
  });
};


// Instagram challenge URL
exports.confirmSubscription = function(req, res){
  if (req.query['hub.verify_token'] != $env.verify_token) {
    console.log('!!! CHALLENGE: Token mismatch!');
    res.send(400);
    return null;
  }

  console.log('--- CHALLENGE: %s', req.query['hub.challenge']);
  res.send(req.query['hub.challenge']);
};


/*
 * Subscription push handling
 */

// Receives subscription push
exports.handlePush = function(req, res){
  if (!req.body || !req.is('json')) {
    console.error('!!! PUSH: Illegal push, ignoring.');
    return;
  }
  console.log('--- PUSH: %s', JSON.stringify(req.body));
  processPushes(req.body); // Takes payload and process off-band.
  res.send(200); // Just smile and wave...
};


// Each push can have more than one subscription, so we need to
// unroll them first. This is only a separate function to guarantee
// it won't get in the way of the event loop.
var processPushes = function(pushes){
  pushes.forEach(fetchPictures);
};


// Gets pictures from API
var fetchPictures = function(push, index, array) {
  console.log('--- PROCESSING: %s push (%s)', push.object, push.object_id);
  var picture_data = {
    object: push.object,
    object_id: push.object_id,
    pictures: []
  }

  if (push.object == 'geography') {
    Instagram.geographies.recent({
      geography_id: push.object_id,
      count: 20,
      complete: function(data, pagination){
        // Instagram generates additional pushes if more pictures are waiting,
        // so pagination is not a huge concern.
        picture_data.pictures = data;
        forwardPictures(picture_data);
      },
      error: errorLogger
    });
  }
};


// Pushes pictures to endpoint
var forwardPictures = function(picture_data) {
  console.log(
    '--- FORWARDING: %s picture(s) for %s %s',
    picture_data.pictures.length, picture_data.object, picture_data.object_id
  )

  request.post(
    {
      url: $env.destination_url,
      json: picture_data
    },
    function(error, response, body) {
      if (error) {
        console.error(
          '!!! FORWARDING: failed to send data to %s\n'+
          '>>> response: %s\n'+
          '>>> body: %s\n'+
          '>>> picture_data: %s\n',
          $env.destination_host,
          JSON.stringify(response),
          JSON.stringify(body),
          JSON.stringify(picture_data)
        );
      }
    }
  );
};


/*
 * Error logger
 */

var errorLogger = function(errorMessage, errorObject, caller) {
  console.error(
    "!!! ERROR: %s\n%s\n%s\n",
    errorMessage, JSON.stringify(errorObject), caller
  );
};
