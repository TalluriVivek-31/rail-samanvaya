// scratch/test_overpass.js
const q = `[out:json][timeout:10];
node["railway"="station"](16.4,80.5,16.6,80.7);
out body 3;`;

async function test() {
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 
        'User-Agent': 'RailSamnvay/1.0 (Indian Railways Automatic Block Planning)',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'data=' + encodeURIComponent(q)
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text.slice(0, 300));
  } catch (err) {
    console.error('Overpass error:', err.message);
  }
}

test();
