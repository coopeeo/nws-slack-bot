const { client, xml } = require('@xmpp/client');
const debug = require('@xmpp/debug'); // For logging XMPP traffic
const { App } = require('@slack/bolt');
const fetch = require('node-fetch').default;
const fs = require('fs');
require('dotenv').config();

const alertsSelections = [
  "CAP",  // Messages in Common Alerting Protocol format
  "TOR",  // Tornado Warning
  "SVR",  // Severe Thunderstorm Warning
  "FLO",  // Flood Warning
  "FFW",  // Flash Flood Warning
  "WFO",  // Weather Forecast Office (general weather updates)
  "SVS",  // Special Weather Statement (not immediately threatening but could impact public safety)
  "RWT",  // Routine Weather Test (routine tests for weather systems)
  "NCF",  // National Coastal Flood (alerts for coastal flooding)
  "MCD",  // Mesoscale Discussion (detailed forecast discussions for weather phenomena)
  "MSC",  // Marine Special Consideration (alerts regarding marine conditions)
  "LAL",  // Lightning Activity Level (monitoring lightning in specific areas)
  "LEW",  // Lake Effect Snow Warning (alerts related to lake-effect snow)
  "MWW",  // Marine Weather Warning (general warnings related to marine weather)
  "SPS",  // Special Weather Statement (warnings for minor conditions not severe but noteworthy)
  "CFW",  // Coastal Flood Warning (warnings for flooding along coastlines)
  "CFA",  // Coastal Flood Advisory (less urgent coastal flooding advisory)
  "SFA",  // Snowfall Advisory (advisory for snow-related weather issues)
  "SMW",  // Snow Squall Warning (issued when a snow squall is approaching)
  "SWY",  // Snow Watch (warnings for possible snow squalls or storms)
  "HLS",  // Hurricane Local Statement (specific information during hurricanes)
  "HMW",  // High Wind Warning (wind conditions are a danger)
  "HWA",  // High Wind Advisory (winds expected but not dangerous enough to issue a warning)
  "HWW",  // High Water Warning (issued when floodwaters are imminent)
  "HLS",  // Hazardous Weather Statement (general hazard statement)
  "NWS"   // National Weather Service Alert (a catch-all code for alerts issued directly by NWS)
];

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
  
  if (stanza.is('message') && stanza.getChild('x') && stanza.attrs.type === 'groupchat' && alertsSelections.includes(stanza.getChild('x').attrs.awipsid.substring(0, 3))) {
    const from = await stanza.attrs.from;
    const body = await stanza.getChild('x').text();

    console.log(stanza.getChild('x').attrs);
    msg = await app.client.chat.postMessage({
      channel,
      text: `${stanza.getChild('x').attrs.cccc} issued ${stanza.getChild('x').attrs.awipsid.substring(0, 3)}`,
      username: 'NWS Alert Bot',
    }).catch((error) => {
      console.error('Error posting message to Slack:', error);
    });

    await app.client.chat.postMessage({
      channel,
      text: body,
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