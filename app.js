const { client, xml } = require('@xmpp/client'); // XMPP Client
const { App } = require('@slack/bolt');
const { XMLParser } = require("fast-xml-parser");

const fs = require('fs');

const logger = require('./lib/logger')
const debug = require('./lib/xmpp.debug'); // For logging XMPP traffic


require('dotenv').config();

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
  socketMode: process.env.SLACK_SOCKET_MODE, // Use Socket Mode if set to TRUE
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 3000,
});

let alertThreadData = {};
const channel = process.env.SLACK_CHANNEL;

debug(xmpp, false);

xmpp.on('error', (err) => {
  logger.throw('[XMPP]', err);
});

xmpp.on('status', (status) => {
  logger.debug('[XMPP]', status);
});

xmpp.on('online', async () => {
  logger.info('[XMPP] client is online!');

  const presence = xml('presence', { 
    to: `nwws@conference.nwws-oi.weather.gov/${process.env.XMPP_USERNAME}`
  });
  await xmpp.send(presence);

});

xmpp.on('stanza', async (stanza) => {
  if (stanza.is('message') && stanza.getChild('x') && stanza.attrs.type === 'groupchat' && stanza.getChild('x').attrs.awipsid.substring(0, 3) == "CAP") {

    const from = await stanza.attrs.from;
    const bodyXml = "<?xml" +(await stanza.getChild('x').text().split('<?xml')[1]);
    const parser = new XMLParser();
    
    let body = parser.parse(bodyXml);
    
    if (body.alert.info.description == "Monitoring message only. Please disregard.") return;

    if (body.alert.references && body.alert.references.split(',').length == 0) app.logger.info(`Alert ${body.alert.identifier} has a reference but cant find id. References: ${body.alert.references}`);

    if (body.alert.references && body.alert.references != null && alertThreadData[body.alert.references.split(',')[1]] != undefined && alertThreadData[body.alert.references.split(',')[1]] != null && alertThreadData[body.alert.references.split(',')[1]] != 'ignore') {
      await app.client.chat.postMessage({
        channel,
        text: `ALERT UPDATE: ${body.alert.info.headline}\n\nDESCRIPTION: ${body.alert.info.description}\n\nINSTRUCTION: ${body.alert.info.instruction}`,
        username: 'NWS Alert Bot',
        thread_ts: alertThreadData[body.alert.references.split(',')[1]],
      });
      
      alertThreadData[body.alert.identifier] = alertThreadData[body.alert.references.split(',')[1]];
    
    } else {
      msg = await app.client.chat.postMessage({
        channel,
        text: `ALERT: ${body.alert.info.headline}`,
        username: 'NWS Alert Bot',
      }).catch((error) => {
        logger.error('Error posting message to Slack:', error);
      });

      alertThreadData[body.alert.identifier] = msg.ts;
      
      if (body.alert.references && body.alert.references != null) {
        body.alert.references.split(',').filter((ref) => (ref.startsWith('urn:oid:'))).forEach((ref) => {
          alertThreadData[ref] = msg.ts;
          logger.info(`Added reference ${ref} to alertThreadData with ts ${msg.ts}`);
        });
      }
      
      await app.client.chat.postMessage({
        channel,
        text: `DESCRIPTION: ${body.alert.info.description}\n\nINSTRUCTION: ${body.alert.info.instruction}`,
        thread_ts: msg.ts,
        username: 'NWS Alert Bot',
      }).catch((error) => {
        logger.error('Error posting message to Slack:', error);
      });
    }
    logger.debug(`[ALERT INFO]`, body.alert.info);
  }
});



const alertThreadDataFile = 'alertThreadData.json';

async function saveAlertThreadData() {
  logger.debug('Saving alertThreadData...');
  await fs.writeFileSync(`data/${alertThreadDataFile}`, JSON.stringify(alertThreadData, null, 2));
  logger.debug('alertThreadData saved successfully.');
}

async function cleanup() {
  logger.debug('Cleaning up before exit...');
  await xmpp.stop();
  await xmpp.removeAllListeners();
  await saveAlertThreadData();
  logger.info('Cleanup completed.');
}

process.on("SIGINT", async () => {
  logger.debug('SIGINT received, cleaning up...');
  await cleanup();
  process.exit(0);
});

(async () => {
  logger.debug('Loading alertThreadData...');
  try {
    alertThreadData = await JSON.parse(fs.readFileSync(`data/${alertThreadDataFile}`, 'utf8'));
  } catch (error) {
    logger.warn('Failed to load alertThreadData.json, starting with empty data.');
    alertThreadData = {};
  }
  // Start your app
  await app.start();

  logger.info('⚡️ Bolt app is running!');
  xmpp.start();

  setInterval(async () => {
    await saveAlertThreadData();
  }, 5000);
})();