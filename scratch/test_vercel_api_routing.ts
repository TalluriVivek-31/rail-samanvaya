// Automated verification for Vercel API entrypoint and Express routing
import { app } from '../api/index.js';
import http from 'http';

async function runTests() {
  console.log('=== VERIFYING VERCEL API ENTRYPOINT & EXPRESS ROUTES ===\n');

  // Start temporary HTTP server on random port to test actual HTTP requests
  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  let passed = 0;
  let failed = 0;

  async function testEndpoint(name: string, path: string, expectedStatus: number | number[]) {
    try {
      const res = await fetch(`${baseUrl}${path}`);
      const contentType = res.headers.get('content-type') || '';
      const text = await res.text();
      const isJson = contentType.includes('application/json');
      const isHtml = text.trim().startsWith('<') || text.includes('<!doctype html>');
      const statusOk = Array.isArray(expectedStatus) ? expectedStatus.includes(res.status) : res.status === expectedStatus;

      let jsonPayload: any = null;
      try {
        jsonPayload = JSON.parse(text);
      } catch {}

      if (statusOk && isJson && !isHtml && jsonPayload) {
        console.log(`[PASS] ${name} (${path})`);
        console.log(`       Status: ${res.status}, Content-Type: ${contentType}`);
        console.log(`       JSON sample:`, JSON.stringify(jsonPayload).substring(0, 100) + '...');
        passed++;
      } else {
        console.error(`[FAIL] ${name} (${path})`);
        console.error(`       Status: ${res.status} (expected ${expectedStatus})`);
        console.error(`       Content-Type: ${contentType}`);
        console.error(`       Is HTML: ${isHtml}`);
        console.error(`       Body: ${text.substring(0, 150)}`);
        failed++;
      }
    } catch (err: any) {
      console.error(`[ERROR] ${name} (${path}):`, err.message);
      failed++;
    }
  }

  // 1. Root API health
  await testEndpoint('Root Health (/api/health)', '/api/health', 200);

  // 2. RailRadar Health check
  await testEndpoint('RailRadar Health (/api/railradar/health)', '/api/railradar/health', 200);

  // 3. RailRadar Corridor Live
  await testEndpoint('RailRadar Corridor Live (/api/railradar/corridor/live)', '/api/railradar/corridor/live', 200);

  // 4. RailRadar Single Train Live
  await testEndpoint('RailRadar Single Train Live (/api/railradar/train/12627/live)', '/api/railradar/train/12627/live', [200, 404]);

  // 5. Infrastructure Station Search
  await testEndpoint('Station Search (/api/infrastructure/stations/search?q=BZA)', '/api/infrastructure/stations/search?q=BZA', 200);

  // 6. Direct route without /api prefix (tests Vercel rewrite without /api prefix)
  await testEndpoint('Direct Route (/railradar/corridor/live)', '/railradar/corridor/live', 200);
  await testEndpoint('Direct Health (/health)', '/health', 200);

  // 7. Non-existent API route must return JSON 404, NEVER HTML!
  await testEndpoint('Non-existent Route (/api/nonexistent-route)', '/api/nonexistent-route', 404);

  server.close();

  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
