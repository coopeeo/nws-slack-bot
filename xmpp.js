const { client, xml } = require('@xmpp/client');
const debug = require('@xmpp/debug'); // For logging XMPP traffic
require('dotenv').config();

const xmpp = client({
  domain: 'nwws-oi.weather.gov',
  service: 'xmpp://nwws-oi.weather.gov:5222',
  resource: 'nwws',
  username: process.env.XMPP_USERNAME,
  password: process.env.XMPP_PASSWORD,
});

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

xmpp.on('stanza', (stanza) => {
  //console.log('Received XMPP Stanza:', stanza.toString());
  //xmpp.stop();
  // Handle incoming messages or other stanzas
  if (stanza.is('message') && stanza.getChild('x') && stanza.attrs.type === 'groupchat') {
    const from = stanza.attrs.from;
    const body = stanza.getChild('x').text();
    console.log(`Message from ${from}: ${body}`);
  }
});

xmpp.start(); // Start the XMPP connection