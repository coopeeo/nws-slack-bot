const { client, xml } = require('@xmpp/client');
const debug = require('@xmpp/debug'); // For logging XMPP traffic
const { App } = require('@slack/bolt');
const fetch = require('node-fetch').default;
const fs = require('fs');
const { XMLParser, XMLBuilder, XMLValidator} = require("fast-xml-parser");
require('dotenv').config();

let alertThreadData = {};

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
  
  if (stanza.is('message') && stanza.getChild('x') && stanza.attrs.type === 'groupchat' && stanza.getChild('x').attrs.awipsid.substring(0, 3) == "CAP") {

    const from = await stanza.attrs.from;
    const bodyXml = "<?xml" +(await stanza.getChild('x').text().split('<?xml')[1]);
    const parser = new XMLParser();
    let body = parser.parse(bodyXml);
    if (body.alert.info.description == "Monitoring message only. Please disregard.") return;
    
    if (body.alert.references && body.alert.references.length > 0 && body.alert.references != null && alertThreadData[body.alert.references.split(',')[1]] != undefined && alertThreadData[body.alert.references.split(',')[1]] != null && alertThreadData[body.alert.references[0].identifier.split(',')[1]] != 'ignore') {
      await app.client.chat.postMessage({
        channel,
        text: `ALERT UPDATE: ${body.alert.info.headline}`,
        username: 'NWS Alert Bot',
        thread_ts: alertThreadData[body.alert.references.split(',')[1]],
      });
      console.log(`ALERT UPDATE: HAPPENED FOR ${body.alert.info.headline}`);
      alertThreadData[body.alert.identifier] = alertThreadData[body.alert.references.split(',')[1]];
    } else {
      msg = await app.client.chat.postMessage({
        channel,
        text: `ALERT: ${body.alert.info.headline}`,
        username: 'NWS Alert Bot',
      }).catch((error) => {
        console.error('Error posting message to Slack:', error);
      });
      alertThreadData[body.alert.identifier] = msg.ts;
      await app.client.chat.postMessage({
        channel,
        text: `DESCRIPTION: ${body.alert.info.description}\n\nINSTRUCTION: ${body.alert.info.instruction}`,
        thread_ts: msg.ts,
        username: 'NWS Alert Bot',
      }).catch((error) => {
        console.error('Error posting message to Slack:', error);
      });
    }
    console.log(alertThreadData);
  }
});

const alertThreadDataFile = 'alertThreadData.json';

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