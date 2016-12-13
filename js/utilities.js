var Client = require("node-rest-client").Client;
var accessToken = process.env.ACCESS_TOKEN;
var notAMeetupId = process.env.NOTAMEETUP_ID;
var bot = require("./bot.js");

function formatJSONForBot(input) {
  //making JSON readable
  return input.replace(/,/g, "\n").replace("{", "").replace("}", "").replace(/:/g, " : ");
}

function getMembers(whenDone) {
  //fetch array of group members
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

function getMessageStats(numberOfDays, whenDone) {
  //return sorted list of members with number of messages they've sent in the last n days
  var members;
  getMembers(function(output) {
    members = output;
    members.forEach(function(member) {
      member["score"] = 0;
    });
    getMessages(numberOfDays, 0, function(messages) {
      members.forEach(function(member) {
        messages.forEach(function(message) {
          if(message.sender_id == member.user_id) {
            member.score++;
          }
        });
      });
      //sorting list in descending order of number of messages (yeah, yeah bubble sort i know)
      var n = members.length;
      while(n != 0) {
        var newN = 0;
        for(var i=1; i<members.length; i++) {
          if(members[i-1].score < members[i].score) {
            var temp = members[i-1];
            members[i-1] = members[i];
            members[i] = temp;
            newN = i;
          }
        }
        n = newN;
      }
      //constructing object from array
      var stats = "{";
      for(var i=0; i<members.length; i++) {
        stats += "\"" + members[i].nickname + "\":\"" + members[i].score + "\"";
        if(i != members.length - 1) {
          stats += ",";
        }
      }
      stats += "}";
      whenDone(stats, members);
    });
  });

}

var globalMessages = [];
var lastLoop = 0;
function getMessages(numberOfDays, before_id, whenDone) {
  //get all messages from the group posted within the last ~n days
  //don't know how i got this to work but there's recursion and shit in here
  var client = new Client();
  var url = "https://api.groupme.com/v3/groups/" + notAMeetupId + "/messages?token=" + accessToken + "&limit=100";
  if(before_id != 0 ) {
    url += "&before_id=" + before_id;
  }
  else {
    globalMessages = [];
  }
  if(numberOfDays != -1) {
    var nDaysAgo = Date.now() - (numberOfDays * 86400000);
    client.get(url, function(data, response){
      data.response.messages.forEach(function(message) {
        //multiplying timestamp by 1000 because groupme has timestamps in seconds instead of milliseconds
        //subtracting one hour from nDaysAgo because of some twisted logic, but hey it works
        if(((message.created_at * 1000) > (nDaysAgo - 3600000))) {
          globalMessages.push(message);
        }
      });
      var lastMessage = globalMessages[globalMessages.length - 1];
      //some twisted logic again, smh
      if(((lastMessage.created_at * 1000) > nDaysAgo) && (globalMessages.length % 100 == 0)) {
        getMessages(numberOfDays, lastMessage.id, function(messages) {
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
  } else if(numberOfDays == -1) {
    var lastMessage = null;
    client.get(url, function(data, response){
      if(data.response != undefined) {
      data.response.messages.forEach(function(message) {
        //multiplying timestamp by 1000 because groupme has timestamps in seconds instead of milliseconds
        //subtracting one hour from nDaysAgo because of some twisted logic, but hey it works
          globalMessages.push(message);
      });
      lastMessage = globalMessages[globalMessages.length - 1];
    }

      //some twisted logic again, smh
      if(lastMessage != null) {
        getMessages(-1, lastMessage.id, function(messages) {
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
}

function purge(whenDone) {
  var client = new Client();
  var toBeKicked = [];
  var message = "";
  getMessageStats(30, function(stats, members) {
    members.forEach(function(member) {
      if(member.score == 0) {
        toBeKicked.push(member);
      }
    });
    if(toBeKicked.length > 0) {
      message += "The following members are being removed for inactivity - \n";
      for(var i=0; i<toBeKicked.length; i++) {
        message += "\"" + toBeKicked[i].nickname + "\"";
        if(i != toBeKicked.length - 1) {
          message += "\n";
        }
      }
    } else {
      message += "Looks like everyone survived this one. Until next time...";
    }
    whenDone(message);
    //kick people here
    var args = {
      data: {},
      headers: {}
    };
    toBeKicked.forEach(function(member) {
      var url = "https://api.groupme.com/v3/groups/" + notAMeetupId + "/members/" + member.id + "/remove?token=" + accessToken;
      toBeKicked.forEach(function(member) {
        client.post(url, args, function (data, response) {
          console.log("Removing " + member.nickname + " from group - " + data);
        });
      });
    });
  });
}

exports.formatJSONForBot = formatJSONForBot;
exports.getMembers = getMembers;
exports.getMessageStats = getMessageStats;
exports.purge = purge;
