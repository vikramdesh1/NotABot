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
  botRegex4 = /\$messagestats ?(\d+)?/;
  botRegex5 = /\$randommessage ?([\s\S]+)?/;
  botRegex6 = /\$test/;

  if((request.sender_type != "bot" && request.sender_type != "system") && request.text) {
    this.res.writeHead(200);
    if(botRegex1.test(request.text)) {
      postMessage(cool());
    } else if(botRegex2.test(request.text)) {
      insultgenerator(function(insult)
      {
        postMessage(insult);
      });
    } else if(botRegex3.test(request.text)) {
      var file = './data/commands.json';
      var data = jsonfile.readFileSync(file);
      postMessage("These are my currently supported commands - \n" + utilities.formatJSONForBot(JSON.stringify(data)));
    } else if(botRegex4.test(request.text)) {
      var numberOfDays = botRegex4.exec(request.text)[1];
      if(numberOfDays == undefined) {
        sendMessageStats(-1);
      } else {
        if(numberOfDays > 0) {
          sendMessageStats(numberOfDays);
        }
        else {
          postMessage("The number of days for fetching message stats is invalid");
        }
      }
    } else if(botRegex5.test(request.text)) {
      var userName = botRegex5.exec(request.text)[1];
      if(userName == undefined) {
        getRandomMessage(null, function(text, attachments) {
          postMessage(text, attachments);
        });
      }
      else {
        getRandomMessage(userName, function(text, attachments) {
          postMessage(text, attachments);
        });
      }
    } else if(botRegex6.test(request.text)) {

    } else {
      //do nothing
    }
    this.res.end();
  }
}

function postMessage(message, attachments) {
  //sending message to bot
  var botResponse, options, body, botReq;
  if(message != null) {
    botResponse = message;
  } else {
    botResponse = "";
  }
  options = {
    hostname: 'api.groupme.com',
    path: '/v3/bots/post',
    method: 'POST'
  };
  body = {
    "bot_id" : botID,
    "text" : botResponse
  };
  if(attachments != undefined && attachments.length > 0) {
    body.attachments = attachments;
  }
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

function sendMessageStats(numberOfDays) {
  //send message stats
  utilities.getMessageStats(numberOfDays, function(message) {
    if(numberOfDays != -1) {
      postMessage("These are the message counts for the past " + numberOfDays + " days - \n" + utilities.formatJSONForBot(message));
    } else if(numberOfDays == -1) {
      postMessage("These are the message counts for the group's lifetime - \n" + utilities.formatJSONForBot(message));

    }
  });
}

function purgeAndConfirm() {
  //purge and confirm
  utilities.purge(function(message) {
    postMessage(message);
  });
}

function getRandomMessage(userName, whenDone) {
  if(userName != null) {
    utilities.getMessages(-1, 0, function(allMessages) {
      var messages = [];
      var memberId;
      utilities.getMembers(function(members) {
        members.forEach(function(member) {
          if(member.nickname == userName) {
            memberId = member.user_id;
          }
        });
        allMessages.forEach(function(message) {
          if(message.user_id == memberId) {
            messages.push(message);
          }
        });
        if(messages.length != 0) {
          var index = utilities.getRandomInt(0, messages.length - 1);
          var message = messages[index];
          var timestamp = new Date(message.created_at * 1000);
          var text = "Message #" + (index + 1) + "/" + messages.length + " - \n" + message.name + " (" + (timestamp.getMonth() + 1) + "/" + timestamp.getDate() + "/" + timestamp.getFullYear() + ") : ";
          if(message.text == null) {
            text += "(no message)";
          } else {
            text += message.text;
          }
          var attachments = message.attachments;
          whenDone(text, attachments);
        } else {
          var text = "The member's name for fetching a random message is invalid";
          var attachments = [];
          whenDone(text, attachments);
        }
      });
    });
  } else {
    utilities.getMessages(-1, 0, function(messages) {
      var index = utilities.getRandomInt(0, messages.length - 1);
      var message = messages[index];
      var timestamp = new Date(message.created_at * 1000);
      var text = "Message #" + (index + 1) + "/" + messages.length + " - \n" + message.name + " (" + (timestamp.getMonth() + 1) + "/" + timestamp.getDate() + "/" + timestamp.getFullYear() + ") : " + message.text;
      var attachments = message.attachments;
      whenDone(text, attachments);
    });
  }
}

exports.respond = respond;
exports.postMessage = postMessage;
exports.purge = purge;
