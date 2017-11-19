const express = require("express"),
    app = express(),
    server = require('http').createServer(app),
    port = process.env.PORT || 8080,
    bodyParser = require("body-parser"),
    request = require("request"),
    WebSocket = require('ws'),
    google = require('googleapis'), // For auth
    dialogflow = require('dialogflow'),
    dialogflowSessionClient = new dialogflow.SessionsClient(),
    dialogflowProjectID = "ed3e7584767742fa848355b1e2bef85c",
    dialogflowSessionID = "devdiner-session-id",
    dialogflowQuery = "Heya",
    dialogflowLanguage = "en-US",
    dialogflowSessionPath = dialogflowSessionClient.sessionPath(dialogflowProjectID, dialogflowSessionID);

app.use(bodyParser.json());

app.use(express.static('public'));

app.set("views", __dirname + "/views");

google.auth.getApplicationDefault(function(err, authClient) {
  if (err) {
    return console.log(err);
  }
});

app.post("/fulfillment", function(req, resp) {
  var intent = req.body.result.metadata.intentName,
      contexts = req.body.result.contexts,
      parameters = req.body.result.parameters,
      talk = "I'm not quite sure what you mean, could you run it by me again?",
      recipient = parameters["contact"].toLowerCase(),
      botResponse = {
        "speech": talk,
        "displayText": talk,
        "source": "agent",
        "data": {}
      }
  console.log("Context was: ", contexts);
  console.log("Intent was: ", intent);
  console.log("Parameters were: ", parameters);
  console.log("Recipient is: ", recipient);

  switch (intent) {
    case "Message":
      if (recipient == "twitter") {
        console.log("Sending your message to IFTTT");

        request.post({
          url: 'https://maker.ifttt.com/trigger/tweet_message/with/key/jtPc2sah12bJ-Ll8NP94E3kRF0JXHshk-1YL82XPgp4',
          json: true,
          body: {"value1": parameters["message"]}
        }, function(error, response, body) {
          console.log(body);
        });

        talk = "Sending that message to Twitter",
        botResponse = {
          "speech": talk,
          "displayText": talk,
          "source": "agent",
          "data": {}
        }
      }

      resp.send(botResponse);
      break;
    default:
      resp.send(botResponse);
      break;
  }
});

app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);

  ultimateTwitchBotBridge = new ultimateTwitchBotBridge({
      channel: '#patcatandtech',
      username: 'patcatbot',
      password: 'oauth:wr5gz0k70j1d9bht66wpt86kd3zlas', // Need a token? https://twitchapps.com/tmi/
  });

  ultimateTwitchBotBridge.open();
});

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


var ultimateTwitchBotBridge = function(options) {
    this.username = options.username;
    this.password = options.password;
    this.channel = options.channel;

    this.server = 'irc-ws.chat.twitch.tv';
    this.port = 443;

    this.open = function() {
        this.webSocket = new WebSocket('wss://' + this.server + ':' + this.port + '/', 'irc');

        this.webSocket.onmessage = this.onMessage.bind(this);
        this.webSocket.onerror = this.onError.bind(this);
        this.webSocket.onclose = this.onClose.bind(this);
        this.webSocket.onopen = this.onOpen.bind(this);
    };

    this.onError = function(message) {
        console.log('Error: ' + message);
    };

    this.onMessage = function(message) {
        if (message !== null){
            var parsed = this.parseMessage(message.data);

            if (parsed !== null) {
                console.log("Message coming in was: ", parsed);
                this.sendDialogflow(parsed.message);
            }
        }
    };

    this.onOpen = function() {
        var socket = this.webSocket;

        if (socket !== null && socket.readyState === 1) {
            console.log('Connecting and authenticating...');

            socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
            socket.send('PASS ' + this.password);
            socket.send('NICK ' + this.username);
            socket.send('JOIN ' + this.channel);
        }
    };

    this.onClose = function() {
        console.log('Disconnected from the chat server.');
    };

    this.close = function() {
        if (this.webSocket) {
            this.webSocket.close();
        }
    };

    this.parseMessage = function(rawMessage) {
        var parsedMessage = {
            message: null,
            tags: null,
            command: null,
            original: rawMessage,
            channel: null,
            username: null
        };

        console.log(rawMessage);

        if (rawMessage[0] === '@') {
            var tagIndex = rawMessage.indexOf(' '),
            userIndex = rawMessage.indexOf(' ', tagIndex + 1),
            commandIndex = rawMessage.indexOf(' ', userIndex + 1),
            channelIndex = rawMessage.indexOf(' ', commandIndex + 1),
            messageIndex = rawMessage.indexOf(':', channelIndex + 1);

            parsedMessage.tags = rawMessage.slice(0, tagIndex);
            parsedMessage.username = rawMessage.slice(tagIndex + 2, rawMessage.indexOf('!'));
            parsedMessage.command = rawMessage.slice(userIndex + 1, commandIndex);
            parsedMessage.channel = rawMessage.slice(commandIndex + 1, channelIndex);
            parsedMessage.message = rawMessage.slice(messageIndex + 1);
        }

        if (parsedMessage.command !== 'PRIVMSG') {
            parsedMessage = null;
        }

        return parsedMessage;
    };

    this.sendMessage = function(messageToSend) {
        var socket = this.webSocket;

        if (socket !== null && socket.readyState === 1) {
            console.log('Looking to send a message.');

            socket.send('PRIVMSG ' + this.channel + ' :' + messageToSend);
        }
    };

    this.sendDialogflow = function(messageToSend) {
      var request = {
        session: dialogflowSessionPath,
        queryInput: {
          text: {
            text: dialogflowQuery,
            languageCode: dialogflowLanguage,
          },
        },
      };

      dialogflowSessionClient
        .detectIntent(request)
        .then(responses => {
          console.log('Detected intent');
          const result = responses[0].queryResult;
          console.log('  Query: ${result.queryText}');
          console.log('  Response: ${result.fulfillmentText}');
          if (result.intent) {
            console.log('  Intent: ${result.intent.displayName}');
          } else {
            console.log('  No intent matched.');
          }
        })
        .catch(err => {
          console.error('ERROR:', err);
        });
    };
}


/* This is an example of an IRC message with tags. I split it across 
multiple lines for readability. The spaces at the beginning of each line are 
intentional to show where each set of information is parsed. */

//@badges=global_mod/1,turbo/1;color=#0D4200;display-name=TWITCH_UserNaME;emotes=25:0-4,12-16/1902:6-10;mod=0;room-id=1337;subscriber=0;turbo=1;user-id=1337;user-type=global_mod
// :twitch_username!twitch_username@twitch_username.tmi.twitch.tv 
// PRIVMSG 
// #channel
// :Kappa Keepo Kappa
