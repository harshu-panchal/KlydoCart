/**
 * SMS India HUB - Deep Diagnostics
 * Tests credentials validity and various parameters
 * Run with: node diagnose-sms.js
 */

require('dotenv').config();
const http = require('http');

const USERNAME    = process.env.SMS_INDIA_HUB_USERNAME;
const API_KEY     = process.env.SMS_INDIA_HUB_API_KEY;
const SENDER_ID   = process.env.SMS_INDIA_HUB_SENDER_ID;
const TEMPLATE_ID = process.env.SMS_INDIA_HUB_DLT_TEMPLATE_ID;
const ENTITY_ID   = process.env.SMS_INDIA_HUB_ENTITY_ID;

function callApi(paramObj) {
  return new Promise((resolve) => {
    const qs = Object.keys(paramObj)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(paramObj[k]))
      .join('&');

    const apiUrl = 'http://cloud.smsindiahub.in/vendorsms/pushsms.aspx?' + qs;

    http.get(apiUrl, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ raw: data }); }
      });
    }).on('error', err => resolve({ httpError: err.message }));
  });
}

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('\n=== SMS India HUB Deep Diagnostics ===\n');

  const TEST_MOBILE = '919302841832';
  const message = 'Welcome to the Klydocart powered by Appzeto.Your OTP for registration is 1234.BGADEC';

  // Test 1: Without gwid (no transactional route)
  console.log('TEST 1: Without gwid parameter...');
  const r1 = await callApi({
    user: USERNAME, APIKey: API_KEY,
    msisdn: TEST_MOBILE, sid: SENDER_ID,
    msg: message, fl: '0',
    DLT_TE_ID: TEMPLATE_ID,
  });
  console.log('Result:', JSON.stringify(r1));
  await delay(1000);

  // Test 2: With gwid=2 AND peid if available
  console.log('\nTEST 2: With gwid=2, DLT_TE_ID, and peid...');
  const params2 = {
    user: USERNAME, APIKey: API_KEY,
    msisdn: TEST_MOBILE, sid: SENDER_ID,
    msg: message, fl: '0', gwid: '2',
    DLT_TE_ID: TEMPLATE_ID,
  };
  if (ENTITY_ID && ENTITY_ID.trim()) params2.peid = ENTITY_ID.trim();
  const r2 = await callApi(params2);
  console.log('Result:', JSON.stringify(r2));
  await delay(1000);

  // Test 3: Wrong credentials (to see error code difference)
  console.log('\nTEST 3: Wrong credentials (to confirm error codes)...');
  const r3 = await callApi({
    user: USERNAME, APIKey: 'WRONGKEY123',
    msisdn: TEST_MOBILE, sid: SENDER_ID,
    msg: message, fl: '0', gwid: '2',
    DLT_TE_ID: TEMPLATE_ID,
  });
  console.log('Result (wrong key):', JSON.stringify(r3));
  await delay(1000);

  // Test 4: With password instead of APIKey
  console.log('\nTEST 4: Using "password" param name instead of "APIKey"...');
  const r4 = await callApi({
    user: USERNAME, password: API_KEY,
    msisdn: TEST_MOBILE, sid: SENDER_ID,
    msg: message, fl: '0', gwid: '2',
    DLT_TE_ID: TEMPLATE_ID,
  });
  console.log('Result:', JSON.stringify(r4));
  await delay(1000);

  // Test 5: Without DLT_TE_ID at all (check if template ID itself is the problem)
  console.log('\nTEST 5: Without DLT_TE_ID...');
  const r5 = await callApi({
    user: USERNAME, APIKey: API_KEY,
    msisdn: TEST_MOBILE, sid: SENDER_ID,
    msg: message, fl: '0', gwid: '2',
  });
  console.log('Result:', JSON.stringify(r5));
  await delay(1000);

  // Test 6: With completely different simple message (to see if template validation is the issue)
  console.log('\nTEST 6: Simple test message (NO DLT, different text)...');
  const r6 = await callApi({
    user: USERNAME, APIKey: API_KEY,
    msisdn: TEST_MOBILE, sid: SENDER_ID,
    msg: 'Test message 1234', fl: '0', gwid: '2',
  });
  console.log('Result:', JSON.stringify(r6));

  console.log('\n=== SUMMARY ===');
  console.log('Compare the error codes above:');
  console.log('- Code 006 = same error (template related or other server error)');
  console.log('- Code 007 = credentials issue');  
  console.log('- Code 001 = missing params');
  console.log('- Different error on Test 3 (wrong key) = credentials ARE being verified correctly');
}

main();
