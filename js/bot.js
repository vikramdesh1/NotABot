var HTTPS = require('https');
var cool = require('cool-ascii-faces');
var insultgenerator = require('insultgenerator');
require('dotenv').config();
var jsonfile = require('jsonfile');
var utilities = require('./utilities.js');
var Client = require('node-rest-client').Client;


var botID = process.env.BOT_ID;
var accessToken = process.env.ACCESS_TOKEN;
var notAMeetupId = process.env.NOTAMEETUP_ID;

function respond() {
  //comparing incoming message to regexes to determine what action to take
  var request = JSON.parse(this.req.chunks[0]),
  botRegex1 = /\$coolasciiface/;
  botRegex2 = /\$insult/;
  botRegex3 = /\$commands/;
  botRegex4 = /\$messagestats (\d+)/;
  botRegex5 = /\$messagestats/;

  if(request.sender_type != "bot") {
    this.res.writeHead(200);
    if(request.text && botRegex1.test(request.text)) {
      postMessage(cool());
    } else if(request.text && botRegex2.test(request.text)) {
      insultgenerator(function(insult)
      {
        postMessage(insult);
      });
    } else if(request.text && botRegex3.test(request.text)) {
      var file = './data/commands.json';
      var data = jsonfile.readFileSync(file);
      postMessage("These are my currently supported commands - \n" + utilities.formatJSONForBot(JSON.stringify(data)));
    } else if(request.text && botRegex4.test(request.text)) {
      var numberOfDays = botRegex4.exec(request.text)[1];
      if(numberOfDays != undefined && numberOfDays > 0) {
        sendMessageStats(numberOfDays);
      }
      else {
        postMessage("The number of days for fetching message stats is invalid");
      }

    } else if(request.text && botRegex5.test(request.text)) {
      sendMessageStats(-1);
    } else {
      //do nothing
    }
    this.res.end();
  }
}

function postMessage(message) {
  //sending message to bot
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
      //this is good
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

function purge() {
  //kick all members from the group who have had no activity for the past 30 days
  postMessage("!!!THIS IS NOT A TEST!!! The monthly purge is about to commence. Hold on to your butts!");
  setTimeout(function() {
    sendMessageStats(30);
  }, 5000);
  setTimeout(purgeAndConfirm, 10000);
}

function sendPurgeWarning() {
  //warn group members that the purge is coming
  console.log("purgeWarning");
}

function sendMessageStats(numberOfDays) {
  //send message stats
  utilities.getMessageStats(numberOfDays, function(message) {
    if(numberOfDays != -1) {
      postMessage("These are the message counts for every member of this group for the past " + numberOfDays + " days - \n" + utilities.formatJSONForBot(message));
    } else if(numberOfDays == -1) {
      postMessage("These are the message counts for every member of this group for its lifetime - \n" + utilities.formatJSONForBot(message));

    }
  });
}

function purgeAndConfirm() {
  //purge and confirm
  utilities.purge(function(message) {
    postMessage(message);
  });
}

exports.respond = respond;
exports.postMessage = postMessage;
exports.purge = purge;
exports.sendPurgeWarning = sendPurgeWarning;
