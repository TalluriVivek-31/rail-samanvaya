import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/RAILRADAR_API_KEY\s*=\s*(.+)/);
if (!match) {
  console.log('NO_KEY_FOUND');
  process.exit(0);
}
const key = match[1].trim().replace(/^Bearer\s+/i, '');

console.log('API Key present: YES (length:', key.length, ')');

async function testUpstream() {
  console.log('Testing api.railradar.in/v1/trains/12627/live ...');
  try {
    const res = await fetch('https://api.railradar.in/v1/trains/12627/live', {
      headers: {
        'Authorization': `Bearer ${key}`,
        'x-api-key': key,
        'Accept': 'application/json'
      }
    });
    console.log('Status Code:', res.status, res.statusText);
    const text = await res.text();
    console.log('Body length:', text.length);
    console.log('Body preview:', text.slice(0, 300));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testUpstream();
