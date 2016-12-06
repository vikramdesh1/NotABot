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

  if(request.text && botRegex1.test(request.text)) {
    this.res.writeHead(200);
    postMessage(cool());
    this.res.end();
  } else if(request.text && botRegex2.test(request.text)) {
    this.res.writeHead(200);
    insultgenerator(function(insult)
    {
      postMessage(insult + " -www.insultgenerator.org");
    });
    this.res.end();
  } else if(request.text && botRegex3.test(request.text)) {
    this.res.writeHead(200);
    var file = './data/commands.json';
    var data = jsonfile.readFileSync(file);
    postMessage(utilities.formatJSONForBot(JSON.stringify(data)));
    this.res.end();
  } else {
    console.log("Don't care");
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