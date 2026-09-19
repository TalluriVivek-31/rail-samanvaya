import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.RAILRADAR_API_KEY || 'rg_ca7b12a12b4146c5b56bdcd4225e48bd';
const BASE_URL = process.env.RAILRADAR_BASE_URL || 'https://api.railradar.in';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function testSingle() {
  console.log('Waiting 30 seconds for quota window to reset...');
  await sleep(30000);

  const url = `${BASE_URL}/v1/trains/12627/live`;
  console.log(`\nFetching single: ${url}`);
  const resp = await fetch(url, {
    headers: {
      'x-api-key': API_KEY,
      'Authorization': `Bearer ${API_KEY}`,
      'Accept': 'application/json'
    }
  });

  console.log(`Status: ${resp.status} ${resp.statusText}`);
  console.log('Headers:');
  for (const [k, v] of resp.headers.entries()) {
    console.log(`  ${k}: ${v}`);
  }
  const text = await resp.text();
  console.log('Body length:', text.length);
  try {
    const json = JSON.parse(text);
    console.log('JSON content (keys):', Object.keys(json));
    console.log('JSON stringified (first 2500 chars):', JSON.stringify(json, null, 2).slice(0, 2500));
    if (json.data) {
      console.log('data keys:', Object.keys(json.data));
    }
  } catch (e) {
    console.log('Raw text:', text);
  }
}

testSingle();
