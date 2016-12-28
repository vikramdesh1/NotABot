var Client = require("node-rest-client").Client;
var bot = require("./bot.js");
var jsonfile = require('jsonfile');
const Markov = require('markov-strings');

var accessToken = process.env.ACCESS_TOKEN;
var notAMeetupId = process.env.NOTAMEETUP_ID;

function formatJSONForBot(input) {
  //making JSON readable
  return input.replace(/,/g, "\n").replace("{", "").replace("}", "").replace(/:/g, " : ").replace(/\"/g, "");
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
  //using -1 as flag indicating that the entire message history needs to be fetched
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
        message += toBeKicked[i].nickname;
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

//This  method thanks to MDN (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random)
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function dumpMessages() {
  getMessages(-1, 0, function(messages) {
    var file = './data/messages.json';
    jsonfile.writeFileSync(file, messages);
  });
}

function getRandomMessage(userName, whenDone) {
  if(userName != null) {
    getMessages(-1, 0, function(allMessages) {
      var messages = [];
      var memberId;
      getMembers(function(members) {
        members.forEach(function(member) {
          if(member.nickname.toLowerCase() == userName.trim().toLowerCase()) {
            memberId = member.user_id;
          }
        });
        allMessages.forEach(function(message) {
          if(message.user_id == memberId) {
            messages.push(message);
          }
        });
        if(messages.length != 0) {
          var index = getRandomInt(0, messages.length - 1);
          var message = messages[index];
          var timestamp = new Date(message.created_at * 1000);
          var text = "Message #" + (messages.length - index) + "/" + messages.length + " - \n" + message.name + " (" + (timestamp.getMonth() + 1) + "/" + timestamp.getDate() + "/" + timestamp.getFullYear() + ") : ";
          if(message.text == null) {
            text += "(no message)";
          } else {
            text += message.text;
          }
          var attachments = message.attachments;
          whenDone(text, attachments);
        } else {
          var text = "Name is invalid";
          var attachments = [];
          whenDone(text, attachments);
        }
      });
    });
  } else {
    getMessages(-1, 0, function(messages) {
      var index = getRandomInt(0, messages.length - 1);
      var message = messages[index];
      var timestamp = new Date(message.created_at * 1000);
      var text = "Message #" + (messages.length - index) + "/" + messages.length + " - \n" + message.name + " (" + (timestamp.getMonth() + 1) + "/" + timestamp.getDate() + "/" + timestamp.getFullYear() + ") : " + message.text;
      var attachments = message.attachments;
      whenDone(text, attachments);
    });
  }
}

function getSimulatedMessage(userName, whenDone) {
  try {
    getMembers(function(members) {
      getMessages(-1, 0, function(tempMessages) {
        var member;
        var messages = [];
        if(userName == null) {
          member = members[getRandomInt(0, members.length - 1)];
        }
        else {
          members.forEach(function(tempMember) {
            if(tempMember.nickname.toLowerCase() == userName.trim().toLowerCase()) {
              member = tempMember;
            }
          });
        }
        if(member != undefined) {
          tempMessages.forEach(function(tempMessage) {
            if(tempMessage.user_id == member.user_id && tempMessage.text != null) {
              messages.push(tempMessage.text);
            }
          });
          var message = "";
          if(messages.length <= 100) {
            message += "Not enough data to simulate message for " + member.nickname;
          }
          else if(messages.length > 100){
            const markov = new Markov(messages);
            markov.buildCorpusSync();
            var options = {};
            if(messages.length > 100 && messages.length <= 200) {
              options.minScore = 1;
              options.minScorePerWord = 0;
            } else if(messages.length > 200 && messages.length <= 400) {
              options.minScore = 3;
              options.minScorePerWord = 0;
            } else if(messages.length > 400 && messages.length <= 600) {
              options.minScore = 8;
              options.minScorePerWord = 1;
            } else if(messages.length > 600 && messages.length <= 800) {
              options.minScore = 13;
              options.minScorePerWord = 2;
            } else if(messages.length > 800) {
              options.minScore = 18;
              options.minScorePerWord = 3;
            }
            const result = markov.generateSentenceSync(options);
            console.log(result);
            message += member.nickname + " (simulated using " + result.refs.length + " messages) - \n" + result.string;
          }
          whenDone(message);
        }
      });
    });
  } catch (err) {
    console.log(err);
  }
}

exports.formatJSONForBot = formatJSONForBot;
exports.getMembers = getMembers;
exports.getMessageStats = getMessageStats;
exports.getMessages = getMessages;
exports.getRandomInt = getRandomInt;
exports.dumpMessages = dumpMessages;
exports.getRandomMessage = getRandomMessage;
exports.getSimulatedMessage = getSimulatedMessage;
exports.purge = purge;
