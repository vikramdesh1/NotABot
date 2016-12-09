var HTTPS = require('https');
var cool = require('cool-ascii-faces');
var insultgenerator = require('insultgenerator');
require('dotenv').config();
var jsonfile = require('jsonfile');
var utilities = require('./utilities.js');


var botID = process.env.BOT_ID;
var accessToken = process.env.ACCESS_TOKEN;
var notAMeetupId = process.env.NOTAMEETUP_ID;

function respond() {
  var request = JSON.parse(this.req.chunks[0]),
  botRegex1 = /^\$coolasciiface$/;
  botRegex2 = /^\$insult$/;
  botRegex3 = /^\$commands$/;
  botRegex4 = /^\$messagestats$/;
  botRegex5 = /^\$test$/;

  if(request.text && botRegex1.test(request.text)) {
    this.res.writeHead(200);
    postMessage(cool());
    this.res.end();
  } else if(request.text && botRegex2.test(request.text)) {
    this.res.writeHead(200);
    insultgenerator(function(insult)
    {
      postMessage(insult);
    });
    this.res.end();
  } else if(request.text && botRegex3.test(request.text)) {
    this.res.writeHead(200);
    var file = './data/commands.json';
    var data = jsonfile.readFileSync(file);
    postMessage("These are my currently supported commands - \n" + utilities.formatJSONForBot(JSON.stringify(data)));
    this.res.end();
  } else if(request.text && botRegex4.test(request.text)) {
    this.res.writeHead(200);
    utilities.getMessageStats(function(message) {
      postMessage("These are the message counts for every user in this group for the past 30 days - \n" + utilities.formatJSONForBot(message));
    });
    this.res.end();
  } else if(request.text && botRegex5.test(request.text)) {
    this.res.writeHead(200);
    console.log(__filename);
    this.res.end();
  } else {
    this.res.writeHead(200);
    this.res.end();
  }
}

function postMessage(message) {
  var botResponse, options, body, botReq;
  botResponse = message;
  options = {
    hostname: 'api.groupme.com',
    path: '/v3/bots/post',
    method: 'POST'
  };
  body = {
    "bot_id" : botID,
    "text" : botResponse
  };
  console.log('Sending ' + botResponse + ' to ' + botID);
  botReq = HTTPS.request(options, function(res) {
    if(res.statusCode == 202) {
      //neat
    } else {
      console.log('Rejecting bad status code : ' + res.statusCode);
    }
  });
  botReq.on('error', function(err) {
    console.log('Error posting message : '  + JSON.stringify(err));
  });
  botReq.on('timeout', function(err) {
    console.log('Timeout posting message : '  + JSON.stringify(err));
  });
  botReq.end(JSON.stringify(body));
}

exports.respond = respond;
exports.postMessage = postMessage;
