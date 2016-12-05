var HTTPS = require('https');
var cool = require('cool-ascii-faces');
var insultgenerator = require('insultgenerator');
var schedule = require('node-schedule');
var Client = require('node-rest-client').Client;

var botID = process.env.BOT_ID;
var accessToken = process.env.ACCESS_TOKEN;

function respond() {
  var request = JSON.parse(this.req.chunks[0]),
  botRegex1 = /\$coolasciiface/;
  botRegex2 = /\$insult/;
  botRegex3 = /\$testget/;

  if(request.text && botRegex1.test(request.text)) {
    this.res.writeHead(200);
    postMessage(cool());
    this.res.end();
  } else if(request.text && botRegex2.test(request.text)) {
    this.res.writeHead(200);
    insultgenerator(function(insult)
    {
      postMessage(insult + " -insultgenerator.org");
    });
    this.res.end();
  } else if(request.text && botRegex3.test(request.text)) {
    this.res.writeHead(200);
    postMessage(accessToken);
    postMessage(typeof accessToken);
    this.res.end();
    testGet();
  } else {
    console.log("don't care");
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

  console.log('sending ' + botResponse + ' to ' + botID);

  botReq = HTTPS.request(options, function(res) {
    if(res.statusCode == 202) {
      //neat
    } else {
      console.log('rejecting bad status code ' + res.statusCode);
    }
  });

  botReq.on('error', function(err) {
    console.log('error posting message '  + JSON.stringify(err));
  });
  botReq.on('timeout', function(err) {
    console.log('timeout posting message '  + JSON.stringify(err));
  });
  botReq.end(JSON.stringify(body));
}

function testGet() {
  var client = new Client();
  var url = "https://api.groupme.com/v3/groups?TOKEN=" + accessToken;
  client.get(url, function(data, response) {
    console.log(data);
  });

}

//Scheduler code
// var rule = new schedule.RecurrenceRule();
// rule.dayOfWeek = 1;
//
// var j = schedule.scheduleJob(rule, function(){
//   postMessage("This is second 1");
// });

exports.respond = respond;
