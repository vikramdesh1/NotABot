require('dotenv').config();

var HTTPS = require('https');
var cool = require('cool-ascii-faces');
var jsonfile = require('jsonfile');
var utilities = require('./utilities.js');
var Client = require('node-rest-client').Client;

var botID = process.env.BOT_ID;
var accessToken = process.env.ACCESS_TOKEN;
var notAMeetupId = process.env.NOTAMEETUP_ID;

function respond() {
  //comparing incoming message to regexes to determine what action to take
  var request = JSON.parse(this.req.chunks[0]),
  coolasciifaceRegex = /\$coolasciiface/;
  commandsRegex = /\$commands/;
  messagestatsRegex = /\$messagestats ?(\d+)?/;
  randommessageRegex = /\$randommessage ?([\s\S]+)?/;
  raiseyourdongersRegex = /\$raiseyourdongers ?(\d+)?/;
  simulatemessageRegex = /\$simulatemessage ?([\s\S]+)?/;
  likesgivenstatsRegex = /\$likesgivenstats ?(\d+)?/;
  likesreceivedstatsRegex = /\$likesreceivedstats ?(\d+)?/;
  dumpmessagesRegex = /\$dumpmessages/;
  testRegex = /\$test/;
  try {
    if((request.sender_type != "bot" && request.sender_type != "system") && request.text) {
      this.res.writeHead(200);
      if(coolasciifaceRegex.test(request.text)) {
        postMessage(cool());
      } else if(commandsRegex.test(request.text)) {
        postMessage("Currently supported commands are here - \n" + "https://github.com/vikramdesh1/NotABot/blob/master/commands.md");
      } else if(messagestatsRegex.test(request.text)) {
        var numberOfDays = messagestatsRegex.exec(request.text)[1];
        if(numberOfDays == undefined) {
          sendMessageStats(-1);
        } else {
          if(numberOfDays > 0) {
            sendMessageStats(numberOfDays);
          }
          else {
            postMessage("Number of days is invalid");
          }
        }
      } else if(randommessageRegex.test(request.text)) {
        var userName = randommessageRegex.exec(request.text)[1];
        if(userName == undefined) {
          utilities.getRandomMessage(null, function(text, attachments) {
            postMessage(text, attachments);
          });
        }
        else {
          utilities.getRandomMessage(userName, function(text, attachments) {
            postMessage(text, attachments);
          });
        }
      } else if(raiseyourdongersRegex.test(request.text)) {
        var count = raiseyourdongersRegex.exec(request.text)[1];
        if(count == undefined || count <= 0) {
          postMessage("ヽ༼ຈل͜ຈ༽ﾉ");
        }
        else if(count > 0) {
          var message = "";
          for(var i=0; i<count; i++) {
            message += "ヽ༼ຈل͜ຈ༽ﾉ ";
          }
          postMessage(message);
        }
      } else if(simulatemessageRegex.test(request.text)) {
        var userName = simulatemessageRegex.exec(request.text)[1];
        if(userName == undefined) {
          utilities.getSimulatedMessage(null, function(message) {
            postMessage(message);
          });
        }
        else {
          utilities.getSimulatedMessage(userName, function(message) {
            postMessage(message);
          });
        }
      } else if(dumpmessagesRegex.test(request.text)) {
        var file = './data/messages.json';
        utilities.getMessages(-1, 0, function(messages) {
          jsonfile.writeFileSync(file, messages);
          console.log(messages.length);
        });
      } else if(likesgivenstatsRegex.test(request.text)) {
        var numberOfDays = likesgivenstatsRegex.exec(request.text)[1];
        if(numberOfDays == undefined) {
          sendLikesGivenStats(-1);
        } else {
          if(numberOfDays > 0) {
            sendLikesGivenStats(numberOfDays);
          }
          else {
            postMessage("Number of days is invalid");
          }
        }
      } else if(likesreceivedstatsRegex.test(request.text)) {
        var numberOfDays = likesreceivedstatsRegex.exec(request.text)[1];
        if(numberOfDays == undefined) {
          sendLikesReceivedStats(-1);
        } else {
          if(numberOfDays > 0) {
            sendLikesReceivedStats(numberOfDays);
          }
          else {
            postMessage("Number of days is invalid");
          }
        }
      } else if(testRegex.test(request.text)) {
        console.log(request);
      } else {
        //do nothing
      }
      this.res.end();  
    }
  } catch(err) {
    postMessage("Beep boop. Something went wrong. Tell Vikram to check the logs.")
    console.log(err);
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
      postMessage("Message counts for the past " + numberOfDays + " days - \n" + utilities.formatJSONForBot(message));
    } else if(numberOfDays == -1) {
      postMessage("Message counts for the group's lifetime - \n" + utilities.formatJSONForBot(message));
    }
  });
}

function sendLikesGivenStats(numberOfDays) {
  //send message stats
  utilities.getLikesGivenStats(numberOfDays, function(message) {
    if(numberOfDays != -1) {
      postMessage("Like counts for the past " + numberOfDays + " days - \n" + utilities.formatJSONForBot(message));
    } else if(numberOfDays == -1) {
      postMessage("Like counts for the group's lifetime - \n" + utilities.formatJSONForBot(message));
    }
  });
}

function sendLikesReceivedStats(numberOfDays) {
  //send message stats
  utilities.getLikesReceivedStats(numberOfDays, function(message) {
    if(numberOfDays != -1) {
      postMessage("Like counts for the past " + numberOfDays + " days - \n" + utilities.formatJSONForBot(message));
    } else if(numberOfDays == -1) {
      postMessage("Like counts for the group's lifetime - \n" + utilities.formatJSONForBot(message));
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
