### This is the last commit with web support as it's buggy, spammy (specifically to slack's api), and most slow as it's based on requests and not pub/sub like xmpp is. If you want to host this bot please use the main branch as that will have the latest version of xmpp

# NWS Slack Bot
A slack bot

this is very early alpha but 
1. fill the creds in .env (there is an example)
2. run `npm i`
3. run either `node web.js` for web or `node xmpp.js` for xmpp (account is required)


- this is very early alpha also the NWS_RECIVE env var doesnt do anything yet.

## web
- has update support and does it in replies but its a hit or miss
- will ratelimit slack alot since it does a request every 30 seconds to nws api and there can be alot of new alerts

## xmpp
- you get alerts via sub/pub instead of html endpoint
- no replying support yet
- detects cap messages only since those are alert ones
- also it does all the actual info in a reply but in the little main short message imma have it maybe spell out the station name and the warning/alert name

TODO:
- [x] Add an option for reciving via NWWS-CI (will be default and its faster as its a push service like websockets but requires and account)
- [ ] Make cancelations actually work
- [ ] send messages 1 by one and while yes it would be slower, then no rate limit, and no i'm not making two bots or even more to get around that
- [ ] better error catching so it doesn't crash
