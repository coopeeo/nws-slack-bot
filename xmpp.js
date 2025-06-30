const { client, xml } = require('@xmpp/client');
const debug = require('@xmpp/debug'); // For logging XMPP traffic
const { App } = require('@slack/bolt');
const fetch = require('node-fetch').default;
const fs = require('fs');
require('dotenv').config();

const alertsSelections = [
  "SVR"
]

const xmpp = client({
  domain: 'nwws-oi.weather.gov',
  service: 'xmpp://nwws-oi.weather.gov:5222',
  resource: 'nwws',
  username: process.env.XMPP_USERNAME,
  password: process.env.XMPP_PASSWORD,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 3000,
});

const channel = process.env.SLACK_CHANNEL;

//debug(xmpp, true); // Enable debugging to see XMPP stanzas

xmpp.on('error', (err) => {
  console.error('XMPP Error:', err);
});

xmpp.on('status', (status) => {
  console.log('XMPP Status:', status);
});

xmpp.on('online', async () => {
  console.log('XMPP client is online!');

  const presence = xml('presence', { to: `nwws@conference.nwws-oi.weather.gov/${process.env.XMPP_USERNAME}` });
  await xmpp.send(presence);
});

xmpp.on('stanza', async (stanza) => {
  // Handle incoming messages or other stanzas
  if (stanza.is('message') && stanza.getChild('x') && stanza.attrs.type === 'groupchat') {
    const from = await stanza.attrs.from;
    const body = await stanza.getChild('x').text();

    console.log(stanza.getChild('x').attrs);
    msg = await app.client.chat.postMessage({
      channel,
      text: `New alert from ${from}: ${body}`,
      username: 'NWS Alert Bot',
    }).catch((error) => {
      console.error('Error posting message to Slack:', error);
    });

    await app.client.chat.postMessage({
      channel,
      text: `test`,
      thread_ts: msg.ts,
      username: 'NWS Alert Bot',
    }).catch((error) => {
      console.error('Error posting message to Slack:', error);
    });
  }
});

(async () => {
  app.logger.info('Loading alertThreadData...');
  try {
    alertThreadData = await JSON.parse(fs.readFileSync(`data/${alertThreadDataFile}`, 'utf8'));
  } catch (error) {
    app.logger.error('Failed to load alertThreadData.json, starting with empty data.');
    alertThreadData = {};
  }
  // Start your app
  await app.start();

  app.logger.info('⚡️ Bolt app is running!');
  xmpp.start();
})();