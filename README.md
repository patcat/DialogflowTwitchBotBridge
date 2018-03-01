# PatCat's Dialogflow Twitch Bot Bridge

Been looking for a way to use Dialogflow to make a Twitch bot? Look no further! Here's a quick and easy way to link up a Dialogflow agent to a Twitch account and channel.

The idea is that you should be able to allow your Dialogflow bot to respond to messages in chat, both from direct @ mentions and also just joining in the overall conversation when appropriate. The latter is a bit of a different use that Dialogflow isn't typically used for, so we've got a bit of additional settings for that to make sure the bot doesn't go a bit wild and respond to **everything**!.

It's still early days, so if you spot issues, definitely raise them here.

## Usage
Want to give it a go? Do the following:

1. Clone this repo somewhere where you'll want to run a Node server (I've typically just run it locally on my PC/Mac). Cloning should be as simple as:

```
git clone https://github.com/patcat/DialogflowTwitchBotBridge.git
```

2. Open up `server.js` and change `dialogflowClientAccessToken` to your own access token from Dialogflow.

```
dialogflowClientAccessToken = "YOURTOKENHERE",
```

3. Change `genericIntents` to list which intents in your Dialogflow agent should apply to the general chat in the room (e.g. run them even if your bot isn't mentioned directly in the message):

```
genericIntents = [{
    intent: "smalltalk.greetings.hello",
    freq: 0.5
},
{
    intent: "smalltalk.greetings.bye",
    freq: 0.5
}],
```

You can change the frequency they're run too. For things like hello and goodbye... the bot will be watching out for those all the time — so if everyone is saying the word "Hello", your bot would theoretically try to respond to that every time. `freq: 0.5` adds a bit of randomness to it and sets up a 50% chance it'll actually respond instead. Use this to prevent your bot from constantly triggering generic responses, while also letting it get involved in chat occasionally.

4. Add in your Twitch channel you'd like the bot to be chatting in:

```
// Twitch settings
twitchChannel = '#devdiner',
```

5. Add in the bot's name (needs to be an actual account you've got access to!):

```
twitchBotName = 'DrArnoldBernard',
```

6. You'll need a token that'll allow you to post on that account's behalf. Grab one from [https://twitchapps.com/tmi/](https://twitchapps.com/tmi/) if you don't already have one. Then put it into the `twitchPassword` field:

```
twitchPassword = 'oauth:YOUROAUTHHERE',
```

7. When it comes to training up your bot, it can be a bit awkward for the messages in Dialogflow to all have `@YourBotUsername` constantly. That's not really pronouncable or what Dialogflow expects. So instead, we set a name that isn't the username to replace any instances of the username with (e.g. "Dr" for `@DrArnoldBernard`, you could use say "Barry" for `@BarryAllenRunBarryRun` as another example):

```
genericName = 'Dr',
```

8. You could want your bot to respond instantly to anything, but that can be offputting. People don't respond instantly, they take time to read a message. Let's not show just how speedy and superior our bot is to its fellow Twitch humans by adding in a delay to mimic them reading the message first. The delay is in milliseconds:

```
typicalDelayBeforeResponding = 1000,
```

9. Humans also take time to type a message. That time is different depending on how long that message was. The Dialogflow Twitch Bot Bridge can mimic that too! You can decide how many characters per minute your bot can type and we'll delay its responses accordingly:

```
charactersPerMinute = 300,
```

10. Finally, Dialogflow has a fallback for when it doesn't understand something. If someone @ mentions your bot, you can decide whether it should respond or not if it doesn't know what they mean. If your bot isn't quite smart enough yet to respond to everything — and you don't want your chat spammed with "I didn't understand" type messages — you can tell Dialogflow Twitch Bot Bridge to just not respond if it doesn't understand instead.

```
keepQuietOnFallback = true;
```

11. Once all is updated, run the following from root of your cloned folder to install all dependencies:

```
npm install
```

12. Then run it like so:

```
node server.js
```

## Needing more help?
I'm releasing an online course on Dialogflow and I'll have a guide that'll explain a lot more of the process of building a Dialogflow bot there! If you're interested, [register your interest for the Dialogflow content here](https://devdiner.com/artificial-intelligence/register-interest-virtual-assistant-course)!

### Note
This API bridge is entirely free to use with a glorious MIT license — but by downloading it, you agree to be responsible with it. With great power comes great responsibility! Go forth and build cool things! Play nice.

Please check Twitch terms and conditions, along with other relevant rules and regulations, before using this Dialogflow Twitch Bot Bridge. You are responsible for anything that goes wrong while you use this, please use it with care!