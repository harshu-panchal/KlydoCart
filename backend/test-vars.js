require('dotenv').config();
const http = require('http');

const USERNAME    = process.env.SMS_INDIA_HUB_USERNAME;
const API_KEY     = process.env.SMS_INDIA_HUB_API_KEY;
const SENDER_ID   = process.env.SMS_INDIA_HUB_SENDER_ID;
const TEMPLATE_ID = process.env.SMS_INDIA_HUB_DLT_TEMPLATE_ID;
const ENTITY_ID   = process.env.SMS_INDIA_HUB_ENTITY_ID;

const TEST_OTP    = '1234';
const TEST_MOBILE = '919302841832';

// Let me test different values for the first ##var## slot!
const var1_values = ['Klydocart', 'KlydoCart', 'Appzeto', 'Klydocart App', 'klydocart', 'KLYDOCART', 'App', 'Website', 'Store'];

function sendTest(var1) {
  return new Promise((resolve) => {
    const msg = `Welcome to the ${var1} powered by Appzeto.Your OTP for registration is ${TEST_OTP}.BGADEC`;
    const paramObj = {
      user: USERNAME,
      APIKey: API_KEY,
      msisdn: TEST_MOBILE,
      sid: SENDER_ID,
      msg: msg,
      fl: '0',
      gwid: '2',
      DLT_TE_ID: TEMPLATE_ID,
      peid: ENTITY_ID
    };

    const qs = Object.keys(paramObj)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(paramObj[k]))
      .join('&');

    const apiUrl = 'http://cloud.smsindiahub.in/vendorsms/pushsms.aspx?' + qs;

    http.get(apiUrl, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ var1, msg, response: parsed });
        } catch(e) {
          resolve({ var1, msg, response: data });
        }
      });
    }).on('error', err => {
      resolve({ var1, msg, error: err.message });
    });
  });
}

async function run() {
  console.log('Testing values for first variable slot (##var##[0])');
  console.log('Template: Welcome to the ##var## powered by Appzeto.Your OTP for registration is ##var##.BGADEC\n');

  for (const v1 of var1_values) {
    console.log(`Testing var1 = "${v1}"...`);
    const res = await sendTest(v1);
    
    if (res.response && (res.response.ErrorCode === '000' || res.response.ErrorMessage === 'Done' || res.response.JobId)) {
      console.log('\n🎉 SUCCESS! Winning var1 value:', `"${v1}"`);
      console.log('Exact winning message:', `"${res.msg}"`);
      console.log('Response:', res.response);
      return;
    } else {
      console.log(` ❌ Failed: ${JSON.stringify(res.response)}`);
    }
  }
}

run();
