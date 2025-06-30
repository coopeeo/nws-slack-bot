const { App } = require('@slack/bolt');
const fetch = require('node-fetch').default;
const fs = require('fs');
require('dotenv').config()

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 3000,
});

const channel = process.env.SLACK_CHANNEL;
const alertThreadDataFile = 'alertThreadData.json';

let alertThreadData = {}



async function getActiveAlerts() {
  const response = await fetch('https://api.weather.gov/alerts/active/', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': '(SlackWeatherBot/1.0, ' + process.env.NWS_USER_AGENT_CONTACT_EMAIL + ')' ,
    }
  });
  const data = await response.json();
  return data['features'];
}

async function startAndIgnore() {
  let data = await getActiveAlerts();
  await data.forEach((alert) => {
    alertThreadData[alert.properties.id] = 'ignore';
  });
};

async function mainloop() {

  //console.log(alertThreadData);
  let data = await getActiveAlerts();

  await data.forEach(async (alert) => {
    if ((alertThreadData[alert.properties.id] === undefined || alertThreadData[alert.properties.id] === null) && alertThreadData[alert.properties.id] != 'ignore') {
      // @ts-ignore
      const isUpdate = alert['properties']['references'].length != 0;
      if (isUpdate) {
        if (alertThreadData[alert['properties']['references'][0]['identifier']] === undefined || alertThreadData[alert['properties']['references'][0]['identifier']] === null) {
          alertThreadData[alert['properties']['references'][0]['identifier']] = 'ignore';
          alertThreadData[alert.properties.id] = 'ignore';
          app.logger.info(`Ignoring update for alert ${alert.properties.id} as the reference thread is not found.`);
        }
      }
      if (isUpdate && alertThreadData[alert['properties']['references'][0]['identifier']] == 'ignore') {
        app.logger.info(`Ignoring update for alert ${alert.properties.id} as it is marked as 'ignore'.`);
        return;
      }
      console.log(`Processing alert: (UPD: ${isUpdate}) ${alert.properties.id} - ${alert.properties.headline}`);
      
      
      let message = `${alert.properties.description} \n\n INTRUCTION: ${alert.properties.instruction}`;
      
      if (alert['properties']['messageType'] === 'Cancel') {
        message = `Update from NWS: the alert has been *canceled*.`;
      }
      
      let a = await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: channel,
        text: message,
        thread_ts: isUpdate ? alertThreadData[alert['properties']['references'][0]['identifier']] : undefined,
      });

      if (!isUpdate) {
        await app.client.chat.postMessage({
          token: process.env.SLACK_BOT_TOKEN,
          channel: channel,
          text: "Start Discussion here",
          thread_ts: a.ts,
        });
      }

      //console.log(isUpdate ? alertThreadData[alert['properties']['references'][0]['identifier']] : undefined);
      alertThreadData[alert.properties.id] = isUpdate ? alertThreadData[alert['properties']['references'][0]['identifier']] : a.ts;
    }
  });
}

async function saveAlertThreadData() {
  app.logger.info('Saving alertThreadData...');
  await fs.writeFileSync(`data/${alertThreadDataFile}`, JSON.stringify(alertThreadData, null, 2));
  app.logger.info('alertThreadData saved successfully.');
}

async function cleanup() {
  app.logger.info('Cleaning up before exit...');
  await saveAlertThreadData();
  app.logger.info('Cleanup completed.');
}

process.on("SIGINT", async () => {
  app.logger.info('SIGINT received, cleaning up...');
  await cleanup();
  process.exit(0);
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

  //await mainloop();
  await startAndIgnore();
  await saveAlertThreadData();

  setTimeout(async () => {
    await mainloop();
    await saveAlertThreadData();
  }, 5000);
  
  setInterval(async () => {
    await mainloop();
    await saveAlertThreadData();
  }, 60000);

})();