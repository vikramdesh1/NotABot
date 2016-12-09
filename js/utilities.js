var Client = require('node-rest-client').Client;
var accessToken = process.env.ACCESS_TOKEN;
var notAMeetupId = process.env.NOTAMEETUP_ID;
var bot = require('./bot.js');

function formatJSONForBot(input) {
  return input.replace(/,/g, "\n").replace("{", "").replace("}", "").replace(/:/g, " : ");
}

function getMembers(whenDone) {
  var client = new Client();
  var url = "https://api.groupme.com/v3/groups?token=" + accessToken;
  client.get(url, function(data, response) {
    var groups = data.response;
    var notAMeetup;
    for(var i=0; i<groups.length; i++) {
      if(groups[i].group_id == notAMeetupId) {
        notAMeetup = groups[i];
      }
    }
    var members = notAMeetup.members;
    whenDone(members);
  });
}

function getMessageStats(whenDone) {
  var members;
  getMembers(function(output) {
    members = output;
    members.forEach(function(member) {
      member["score"] = 0;
    });
    getMessagesFor30Days(0, function(messages) {
      members.forEach(function(member) {
        messages.forEach(function(message) {
          if(message.sender_id == member.user_id) {
            member.score++;
          }
        });
      });
      var stats = "{";
      for(var i=0; i<members.length; i++) {
        stats += "\"" + members[i].nickname + "\":\"" + members[i].score + "\"";
        if(i != members.length - 1) {
          stats += ",";
        }
      }
      stats += "}";
      whenDone(stats);
    });
  });

}

var globalMessages = [];
var lastLoop = 0;
function getMessagesFor30Days(before_id, whenDone) {
  var client = new Client();
  var url = "https://api.groupme.com/v3/groups/" + notAMeetupId + "/messages?token=" + accessToken + "&limit=100";
  if(before_id != 0 ) {
    url += "&before_id=" + before_id;
  }
  else {
    globalMessages = [];
  }
  var thirtyDaysAgo = Date.now() - 2592000000;
  client.get(url, function(data, response){
    data.response.messages.forEach(function(message) {
      if(((message.created_at * 1000) > (thirtyDaysAgo - 86400000))) {
        globalMessages.push(message);
      }
    });
    var lastMessage = globalMessages[globalMessages.length - 1];
    console.log(globalMessages.length);
    if(((lastMessage.created_at * 1000) > thirtyDaysAgo) && (globalMessages.length % 100 == 0)) {
      getMessagesFor30Days(lastMessage.id, function(messages) {
        whenDone(globalMessages);
      });
      lastLoop = 0;
    } else {
      lastLoop = 1;
    }
    if(lastLoop == 1) {
      whenDone(globalMessages);
    }
  });
}

exports.formatJSONForBot = formatJSONForBot;
exports.getMessageStats = getMessageStats;
