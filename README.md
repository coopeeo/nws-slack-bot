# NWS Slack Bot
A slack bot that posts weather alerts
The data is recived from and XMPP chatroom from the National Weather Service, you do have to request access for an account. ([request here](https://www.weather.gov/nwws/nwws_oi_request))

Directions:
1. Make a slack bot
2. Enable interactivity and set url to `http://nwsslackbot.example.com/slack/events
3. Enable Home Tab
4. Enable channels oauth permissions and publishing to home
5. fill the creds in `.env` (there is an example)
6. run `npm i`
7. run `npm run start`

TODO:
- [ ] Add docker container support
- [ ] (prob not) Add deleting thread data that got canceled (probably not if they finished and not canceled because I don't feel like setting 1000 timeouts)
- [ ] Refactor so its actually readable
- [ ] make it typescript somehow or something ig
- [ ] Make it module based (i think one thing will have to be cjs but thats fine imo)