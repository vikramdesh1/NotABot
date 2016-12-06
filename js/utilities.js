var Client = require('node-rest-client').Client;
var accessToken = process.env.ACCESS_TOKEN;
var notAMeetupId = process.env.NOTAMEETUP_ID;
var bot = require('./bot.js');

function formatJSONForBot(input) {
  return input.replace(/,/g, "\n").replace("{", "").replace("}", "");
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
  var client = new Client();
  var url = "https://api.groupme.com/v3/groups/" + notAMeetupId + "/messages?token=" + accessToken;
  var messageCount = [];
}

exports.formatJSONForBot = formatJSONForBot;
exports.getMessageStats = getMessageStats;
