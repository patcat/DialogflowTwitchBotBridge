const express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    port = process.env.PORT || 8080,
    bodyParser = require('body-parser'),
    request = require('request'),
    WebSocket = require('ws'),
    dialogflow = require('apiai'),
    
    // Dialogflow settings
    dialogflowClientAccessToken = 'YOURTOKENHERE',
    dialogflowSessionClient = dialogflow(dialogflowClientAccessToken),
    dialogflowSessionID = 'twitchbotbridge-session-id',
    genericIntents = [{
        intent: 'smalltalk.greetings.hello',
        freq: 0.5
    },
    {
        intent: 'smalltalk.greetings.bye',
        freq: 0.5
    }],

    // Twitch settings
    twitchChannel = '#devdiner',
    twitchBotName = 'DrArnoldBernard',
    twitchPassword = 'oauth:z8megdym1abfhqvrqfyfcuxrb7ogxa', // Need a token? https://twitchapps.com/tmi/
    genericName = 'Dr', // A name we'll replace any mentions of the username with to help with training
    typicalDelayBeforeResponding = 1000, // Wait a bit before seeing the message
    charactersPerMinute = 300, // How fast does the bot type?
    keepQuietOnFallback = true; // Rather than awkwardly saying it doesn't know all the time, just don't respond

app.use(bodyParser.json());

app.use(express.static('public'));

app.set('views', __dirname + '/views');

app.get('/', function (request, response) {
    response.sendFile(__dirname + '/views/index.html');
});

var listener = app.listen(process.env.PORT, function () {
    console.log('Dialogflow Twitch Bot Bridge is listening on port ' + listener.address().port);

    ultimateTwitchBotBridge = new ultimateTwitchBotBridge({
        channel: twitchChannel,
        username: twitchBotName,
        password: twitchPassword
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
                console.log('Message coming in was: ', parsed);
                try {
                    if (parsed.directMention) {
                        if (parsed.directMention.toLowerCase() === '@' + twitchBotName.toLowerCase()) {
                            this.sendDialogflow(parsed, {direct: true});
                        }
                    } else {
                        console.log('Not being spoken to');
                        this.sendDialogflow(parsed, { direct: false });
                    }
                } catch (e) {
                    console.log('Errored out: ', e);
                }
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

        ultimateTwitchBotBridge.open();
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
            username: null,
            directMention: null,
            mentions: []
        };

        if (rawMessage[0] === '@') {
            var tagIndex = rawMessage.indexOf(' '),
            userIndex = rawMessage.indexOf(' ', tagIndex + 1),
            commandIndex = rawMessage.indexOf(' ', userIndex + 1),
            channelIndex = rawMessage.indexOf(' ', commandIndex + 1),
            messageIndex = rawMessage.indexOf(':', channelIndex + 1),
            endOfMessageIndex = rawMessage.indexOf('\r\n', messageIndex + 1);

            parsedMessage.tags = rawMessage.slice(0, tagIndex);
            parsedMessage.username = rawMessage.slice(tagIndex + 2, rawMessage.indexOf('!'));
            parsedMessage.command = rawMessage.slice(userIndex + 1, commandIndex);
            parsedMessage.channel = rawMessage.slice(commandIndex + 1, channelIndex);
            parsedMessage.message = rawMessage.slice(messageIndex + 1, endOfMessageIndex);

            // Is the message at someone?
            if (parsedMessage.message.indexOf('@') == 0) {
              parsedMessage.directMention = parsedMessage.message.substr(0,parsedMessage.message.indexOf(' '));
            }

            if (parsedMessage.message.toLowerCase().indexOf('@'+twitchBotName.toLowerCase()) != -1) {
                console.log('I was mentioned elsewhere in the message');
                
                parsedMessage.message = parsedMessage.message.toLowerCase().replace('@' + twitchBotName.toLowerCase(), genericName);
                parsedMessage.directMention = '@' + twitchBotName;
            }
            // TODO: Build this to note any mentions
            if (parsedMessage.message.indexOf('@') != -1) {
              var mentions = [];
              console.log('There is an @');
              for (var i = 0; i < parsedMessage.message.length; i++) {
                if (parsedMessage.message[i] === '@') {
                  var mention = parsedMessage.message.substr(i, parsedMessage.message.indexOf(' ', i));
                  mentions.push(mention);
                  parsedMessage.message = parsedMessage.message.replace(mention + ' ', '');
                }
              }
              parsedMessage.mentions = mentions;
            }
        }

        if (parsedMessage.command !== 'PRIVMSG') {
            parsedMessage = null;
        }

        console.log(parsedMessage);

        return parsedMessage;
    };

    this.sendMessage = function(messageToSend) {
        var socket = this.webSocket;

        if (socket !== null && socket.readyState === 1) {
            console.log('Looking to send a message.');

            setTimeout(() => {
                socket.send('PRIVMSG ' + this.channel + ' :' + messageToSend);
            }, typicalDelayBeforeResponding + (messageToSend.length / charactersPerMinute) * 60000);
        }
    };

    this.sendDialogflow = function(parsed, opts) {
        var request = dialogflowSessionClient.textRequest(parsed.message, {
            sessionId: dialogflowSessionID
        }),
        direct = opts.direct ? opts.direct : false;

        request.on('response', function(response) {
            intent = response.result.metadata.intentName,
            contexts = response.result.contexts,
            parameters = response.result.parameters,
            talk = 'I'm not quite sure what you mean, could you run it by me again?',
            botResponse = {
                'speech': talk,
                'displayText': talk,
                'source': 'agent',
                'data': {}
            }
            
            // Uncomment below if you're looking to see more of what's going on
            //console.log('Context was: ', contexts);
            //console.log('Intent was: ', intent);
            //console.log('Parameters were: ', parameters);

            if (intent == 'Default Fallback Intent' && keepQuietOnFallback) {
                console.log('Didn't know what to say, so not saying anything at all')
            } else {
                if (direct) {
                    ultimateTwitchBotBridge.sendMessage('@' + parsed.username + ' ' + (response.result.fulfillment.speech ? response.result.fulfillment.speech : response.result.speech));
                } else {
                    console.log('Not a direct message, will check what global intents I should respond to.');
                    var shouldRespond = false;

                    for (var i = 0; i < genericIntents.length; i++) {
                        console.log(genericIntents[i]);
                        if (intent == genericIntents[i].intent && Math.random() < genericIntents[i].freq) {
                            shouldRespond = true;
                        }
                    }

                    if (shouldRespond) {
                        console.log('Yes, that is something I should respond to');
                        ultimateTwitchBotBridge.sendMessage((response.result.fulfillment.speech ? response.result.fulfillment.speech : response.result.speech));
                    }
                }
            }
        });

        request.on('error', function(error) {
            console.log(error);
        });

        request.end();
    };
}