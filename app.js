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
  logLevel: 'debug',
});

let alertThreadData = {};
let alertNotificationData = {};
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



// events
async function submitHomeView(event, client, body = {}) {
  const thestuff = {
      // Use the user ID associated with the event
      user_id: event ? event.user || body.user.id : body.user.id,
      view: {
        // Home tabs must be enabled in your app configuration page under "App Home"
        type: "home",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "Here are your current subscribed zones",
              emoji: true
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Waunakee, WI*\nZone: ######"
            },
            accessory: {
              type: "button",
              text: {
                type: "plain_text",
                text: "Unsubscribe",
                emoji: true
              },
              action_id: "unsub_btn",
              value: "stuff here"
            }
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Remove All Subscriptions",
                  emoji: true
                },
                style: "danger",
                action_id: "unsub_all_btn",
                value: "unsub_all_btn"
              }
            ]
          },
          {
            type: "divider"
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Subscribe",
                  emoji: true
                },
                style: "primary",
                action_id: "subscribe_modal"
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Help",
                  emoji: true
                },
                action_id: "help"
              },
            ]
          }
        ]
      }
    };
    await app.client.conversations.members({
      channel: channel,
    }).then((members) => {
      const isMember =  !members.members.includes(event ? event.user || body.user.id : body.user.id);
      if (isMember) {
        thestuff.view.blocks[thestuff.view.blocks.length - 1].elements.push({
            type: "button",
            text: {
              type: "plain_text",
              text: "Join the Channel",
              emoji: true
            },
            action_id: "join_channel"
        });
      }
    });
    return await client.views.publish(thestuff);
}


app.event('app_home_opened', async ({ event, client, logger }) => {
  try {
    // Call views.publish with the built-in client
    const result = await submitHomeView(event, client);

    logger.info(result);
  }
  catch (error) {
    logger.error(error);
  }
});

app.action('unsub_btn', async ({ body, ack }) => {
  // Acknowledge the action
  await ack();
  app.client.views.open({
    user_id: body.user.id,
    trigger_id: body.trigger_id,
    view: {
      callback_id: "unsub_modal",
      title: {
          type: "plain_text",
          text: "Confirm Unsubscription?"
        },
      type: "modal",
      blocks: [
        {
            type: "header",
            text: {
              type: "plain_text",
              text: "Are you sure you want to unsubscribe from this zone?",
              emoji: true
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "Waunakee, WI"
            }
          },
        ],
        submit: {
          type: "plain_text",
          text: "Confirm"
        }
      }
    })
});

app.view('unsub_modal', async ({ ack, body, view, client }) => {
  // Acknowledge the view submission
  await ack();
  // soon lmao
  await submitHomeView(view.event, client, body);
});

app.action('unsub_all_btn', async ({ body, ack }) => {
  // Acknowledge the action
  await ack();
  app.client.views.open({
    user_id: body.user.id,
    trigger_id: body.trigger_id,
    view: {
      callback_id: "unsub_all_modal",
      title: {
          type: "plain_text",
          text: "Confirm Unsubscription?"
        },
      type: "modal",
      blocks: [
        {
            type: "header",
            text: {
              type: "plain_text",
              text: "Are you sure you want to unsubscribe from all zones?",
              emoji: true
            }
          },
        ],
        submit: {
          type: "plain_text",
          text: "Confirm"
        }
      }
    })
});

app.view('unsub_all_modal', async ({ ack, body, view, client }) => {
  // Acknowledge the view submission
  await ack();
  // soon lmao
  logger.info('body', JSON.stringify(body));
  await submitHomeView(view.event, client, body);
});

app.action('join_channel', async ({ body, event, ack }) => {
  // Acknowledge the action
  await ack();
  try {
    await app.client.conversations.invite({
      channel: channel,
      users: body.user.id
    });
    submitHomeView(event, app.client, body);
  } catch (error) {
    logger.error('Error inviting user to channel:', error);
  }
});

app.action('help', async ({ body, ack }) => {
  // Acknowledge the action
  await ack();
  app.client.views.open({
    user_id: body.user.id,
    trigger_id: body.trigger_id,
    view: {
      callback_id: "help_modal",
      title: {
          type: "plain_text",
          text: "Help"
        },
      type: "modal",
      blocks: [
        {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "This bot lets you subscribe to NWS alerts for your area.\nYou can also subscribe to multiple zones.\n\nTo subscribe to a zone please close this popup and click the green *Subscribe* button.",
            }
          },
        ],
      }
    })
});

// Handle saving and loading of bot
const alertThreadDataFile = 'alertThreadData.json';
const alertNotificationDataFile = 'alertNotificationData.json';

async function saveAlertThreadData() {
  logger.debug('Saving alertThreadData...');
  await fs.writeFileSync(`data/${alertThreadDataFile}`, JSON.stringify(alertThreadData, null, 2));
  logger.debug('alertThreadData saved successfully.');
}

async function saveAlertNotificationData() {
  logger.debug('Saving alert notification data...');
  try {
    await fs.writeFileSync(`data/${alertNotificationDataFile}`, JSON.stringify(alertNotificationData, null, 2));
    logger.debug('Alert notification data saved successfully.');
  } catch (error) {
    logger.error('Error saving alert notification data:', error);
  }
}

async function cleanup() {
  logger.debug('Cleaning up before exit...');
  await xmpp.stop();
  await xmpp.removeAllListeners();
  await saveAlertThreadData();
  await saveAlertNotificationData();
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
  logger.debug('Loading alertNotificationData...');
  try {
    alertNotificationData = await JSON.parse(fs.readFileSync(`data/${alertNotificationDataFile}`, 'utf8'));
  } catch (error) {
    logger.warn('Failed to load alertNotificationData.json, starting with empty data.');
    alertNotificationData = {};
  }
  // Start your app
  await app.start(process.env.PORT || 3000);

  logger.info('⚡️ Bolt app is running!');
  xmpp.start();

  setInterval(async () => {
    await saveAlertThreadData();
  }, 5000);
})();