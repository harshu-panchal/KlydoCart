require('dotenv').config();
const http = require('http');

const USERNAME    = process.env.SMS_INDIA_HUB_USERNAME;
const API_KEY     = process.env.SMS_INDIA_HUB_API_KEY;
const SENDER_ID   = process.env.SMS_INDIA_HUB_SENDER_ID;
const TEMPLATE_ID = process.env.SMS_INDIA_HUB_DLT_TEMPLATE_ID;
const ENTITY_ID   = process.env.SMS_INDIA_HUB_ENTITY_ID;

const TEST_OTP    = '1234';
const TEST_MOBILE = '919302841832';

// All possible template variations to test against SMS India HUB DLT engine
const variations = [
  `Welcome to the Klydocart powered by Appzeto.Your OTP for registration is ${TEST_OTP}.BGADEC`,
  `Welcome to the Klydocart powered by Appzeto. Your OTP for registration is ${TEST_OTP}.BGADEC`,
  `Welcome to the Klydocart powered by Appzeto.Your OTP for registration is ${TEST_OTP}.`,
  `Welcome to the Klydocart powered by Appzeto. Your OTP for registration is ${TEST_OTP}.`,
  `Welcome to the Klydocart powered by Appzeto.Your OTP for registration is ${TEST_OTP}`,
  `Welcome to the Klydocart powered by Appzeto. Your OTP for registration is ${TEST_OTP}`,
  `Welcome to the klydocart powered by Appzeto.Your OTP for registration is ${TEST_OTP}.BGADEC`,
  `Welcome to the klydocart powered by Appzeto. Your OTP for registration is ${TEST_OTP}.BGADEC`,
  `Welcome to the klydocart powered by Appzeto. Your OTP for registration is ${TEST_OTP}.`,
  `Welcome to the Appzeto powered by Appzeto.Your OTP for registration is ${TEST_OTP}.BGADEC`,
  `Welcome to the Appzeto powered by Appzeto. Your OTP for registration is ${TEST_OTP}.`,
  `Welcome to the KlydoCart powered by Appzeto. Your OTP for registration is ${TEST_OTP}.`,
  `Welcome to the KlydoCart powered by Appzeto.Your OTP for registration is ${TEST_OTP}.BGADEC`,
  `Welcome to the Klydocart powered by Appzeto. Your OTP for registration is ${TEST_OTP}`
];

function sendTest(msg) {
  return new Promise((resolve) => {
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
          resolve({ msg, response: parsed });
        } catch(e) {
          resolve({ msg, response: data });
        }
      });
    }).on('error', err => {
      resolve({ msg, error: err.message });
    });
  });
}

async function run() {
  console.log('Testing template variations for Template ID:', TEMPLATE_ID);
  console.log('Sender ID:', SENDER_ID, '| PEID:', ENTITY_ID);
  console.log('--------------------------------------------------\n');

  for (let i = 0; i < variations.length; i++) {
    const v = variations[i];
    console.log(`[Test ${i + 1}/${variations.length}] Sending: "${v}"`);
    const res = await sendTest(v);
    
    if (res.response && (res.response.ErrorCode === '000' || res.response.ErrorMessage === 'Done' || res.response.JobId)) {
      console.log('\n🎉 SUCCESS FOUND! Exact matching format:');
      console.log(`\n"${v}"\n`);
      console.log('API Response:', res.response);
      return;
    } else {
      console.log(` ❌ Failed: ${res.response?.ErrorMessage || JSON.stringify(res.response)}\n`);
    }
  }

  console.log('\nAll automated variations failed.');
  console.log('Please check your DLT portal for Template ID 1007282516644508833 and copy the exact raw text.');
}

run();
