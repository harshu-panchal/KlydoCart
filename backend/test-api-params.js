require('dotenv').config();
const http = require('http');

const USERNAME    = process.env.SMS_INDIA_HUB_USERNAME;
const API_KEY     = process.env.SMS_INDIA_HUB_API_KEY;
const SENDER_ID   = process.env.SMS_INDIA_HUB_SENDER_ID;
const TEMPLATE_ID = process.env.SMS_INDIA_HUB_DLT_TEMPLATE_ID;
const ENTITY_ID   = process.env.SMS_INDIA_HUB_ENTITY_ID;

const TEST_OTP    = '1234';
const TEST_MOBILE = '919302841832';

// Testing without DLT_TE_ID or with different parameter names to see if SMS India HUB accepts it
async function sendTest(params) {
  const qs = Object.keys(params)
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&');

  const apiUrl = 'http://cloud.smsindiahub.in/vendorsms/pushsms.aspx?' + qs;

  return new Promise((resolve) => {
    http.get(apiUrl, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          resolve(data);
        }
      });
    }).on('error', err => resolve({ error: err.message }));
  });
}

async function run() {
  const baseMsg = `Welcome to the Klydocart powered by Appzeto.Your OTP for registration is ${TEST_OTP}.BGADEC`;

  console.log('1. Testing with DLT_TE_ID & peid...');
  let res1 = await sendTest({
    user: USERNAME, APIKey: API_KEY, msisdn: TEST_MOBILE, sid: SENDER_ID,
    msg: baseMsg, fl: '0', gwid: '2', DLT_TE_ID: TEMPLATE_ID, peid: ENTITY_ID
  });
  console.log('Result 1:', res1);

  console.log('\n2. Testing with dlt_te_id (lowercase)...');
  let res2 = await sendTest({
    user: USERNAME, APIKey: API_KEY, msisdn: TEST_MOBILE, sid: SENDER_ID,
    msg: baseMsg, fl: '0', gwid: '2', dlt_te_id: TEMPLATE_ID, peid: ENTITY_ID
  });
  console.log('Result 2:', res2);

  console.log('\n3. Testing with template_id...');
  let res3 = await sendTest({
    user: USERNAME, APIKey: API_KEY, msisdn: TEST_MOBILE, sid: SENDER_ID,
    msg: baseMsg, fl: '0', gwid: '2', template_id: TEMPLATE_ID, peid: ENTITY_ID
  });
  console.log('Result 3:', res3);
}

run();
