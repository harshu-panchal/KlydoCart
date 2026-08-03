/**
 * SMS India HUB - Direct API Test Script
 * Run with: node test-sms.js
 * 
 * This bypasses all backend logic and directly calls the API
 * so we can see the exact raw response and diagnose the error.
 */

require('dotenv').config();
const http = require('http');

const USERNAME    = process.env.SMS_INDIA_HUB_USERNAME;
const API_KEY     = process.env.SMS_INDIA_HUB_API_KEY;
const SENDER_ID   = process.env.SMS_INDIA_HUB_SENDER_ID;
const TEMPLATE_ID = process.env.SMS_INDIA_HUB_DLT_TEMPLATE_ID;
const ENTITY_ID   = process.env.SMS_INDIA_HUB_ENTITY_ID;

console.log('\n========================================');
console.log('  SMS India HUB - Direct API Test');
console.log('========================================\n');

console.log('Credentials loaded:');
console.log('  USERNAME    :', USERNAME);
console.log('  API_KEY     :', API_KEY ? API_KEY.slice(0,4) + '****' : 'MISSING!');
console.log('  SENDER_ID   :', SENDER_ID);
console.log('  TEMPLATE_ID :', TEMPLATE_ID);
console.log('  ENTITY_ID   :', ENTITY_ID || 'NOT SET WARNING');

const TEST_OTP    = '1234';
const TEST_MOBILE = '919302841832';

const message = `Welcome to the Klydocart powered by Appzeto. Your OTP for registration is ${TEST_OTP}.`;

console.log('\nMessage to be sent:');
console.log(' "' + message + '"');
console.log(' Length:', message.length, 'chars');

const paramObj = {
  user: USERNAME,
  APIKey: API_KEY,
  msisdn: TEST_MOBILE,
  sid: SENDER_ID,
  msg: message,
  fl: '0',
  gwid: '2',
  DLT_TE_ID: TEMPLATE_ID,
};

if (ENTITY_ID && ENTITY_ID.trim()) {
  paramObj.peid = ENTITY_ID.trim();
  console.log(' peid:', ENTITY_ID);
} else {
  console.warn('\n WARNING: SMS_INDIA_HUB_ENTITY_ID (peid) is NOT set in .env');
  console.warn('  Get your Entity ID from your DLT portal and add it to .env\n');
}

const qs = Object.keys(paramObj)
  .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(paramObj[k]))
  .join('&');

const apiUrl = 'http://cloud.smsindiahub.in/vendorsms/pushsms.aspx?' + qs;
const maskedUrl = apiUrl.replace(encodeURIComponent(API_KEY), '****');
console.log('\nAPI URL (masked):\n', maskedUrl);
console.log('\nSending request...\n');

http.get(apiUrl, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('========= RAW RESPONSE =========');
    console.log(data);
    console.log('================================\n');

    try {
      const parsed = JSON.parse(data);
      const code = parsed.ErrorCode || '';
      const msg2 = parsed.ErrorMessage || '';
      console.log('ErrorCode   :', code);
      console.log('ErrorMessage:', msg2);

      if (code === '000' || msg2 === 'Done' || parsed.JobId || parsed.MessageData) {
        console.log('\nSUCCESS - SMS sent!');
      } else if (code === '006') {
        console.log('\nERROR 006 - DLT template mismatch.');
        console.log('Your message does not match the TRAI DLT registered template.');
        console.log('Check exact spaces, punctuation, and case in your registered template.');
      } else if (code === '007') {
        console.log('\nERROR 007 - Invalid credentials.');
      } else {
        console.log('\nUNKNOWN ERROR:', code, '-', msg2);
      }
    } catch (e) {
      console.log('Response is not JSON. Check raw text above.');
    }
  });
}).on('error', err => {
  console.error('HTTP request failed:', err.message);
});
