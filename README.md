# NWS Slack Bot
A slack bot that posts weather alerts
The data is recived from and XMPP chatroom from the National Weather Service, you do have to request access for an account. ([request here](https://www.weather.gov/nwws/nwws_oi_request))

Directions:
1. fill the creds in .env (there is an example)
2. run `npm i`
3. run `npm run start`

TODO:
- [ ] Add docker container support
- [ ] Add deleting thread data that got canceled (probably not if they finished and not canceled because I don't feel like setting 1000 timeouts)