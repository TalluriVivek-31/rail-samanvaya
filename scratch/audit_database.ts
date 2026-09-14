// scratch/audit_database.ts
import {
  NATIONAL_RAILWAY_LOCATIONS,
  NATIONAL_RAILWAY_TRACK_GEOMETRIES,
  NATIONAL_RAILWAY_FACILITIES
} from '../server/data/nationalRailwayGeospatialDatabase';
import {
  searchStations,
  getStationDetails,
  findNearestStation,
  resolveMaintenanceLocation
} from '../server/services/railwayGeospatialService';

console.log('======================================================================');
console.log('RAIL SAMNVAY — DATA AUDIT OF nationalRailwayGeospatialDatabase.ts');
console.log('======================================================================');

// 1. Exact counts
const totalStations = NATIONAL_RAILWAY_LOCATIONS.filter(l => l.railway_type === 'station').length;
const totalHalts = NATIONAL_RAILWAY_LOCATIONS.filter(l => l.railway_type === 'halt').length;
const totalStopPositions = NATIONAL_RAILWAY_LOCATIONS.filter(l => l.railway_type === 'stop_position').length;
const totalJunctions = NATIONAL_RAILWAY_LOCATIONS.filter(l => l.station_type === 'junction').length;
const totalTerminals = NATIONAL_RAILWAY_LOCATIONS.filter(l => l.station_type === 'terminal').length;
const totalWayStations = NATIONAL_RAILWAY_LOCATIONS.filter(l => l.station_type === 'way_station').length;
const totalSuburban = NATIONAL_RAILWAY_LOCATIONS.filter(l => l.station_type === 'suburban').length;

console.log(`\n1. RECORD COUNTS IN NATIONAL_RAILWAY_LOCATIONS:`);
console.log(`- Total locations: ${NATIONAL_RAILWAY_LOCATIONS.length}`);
console.log(`  - railway_type = 'station': ${totalStations}`);
console.log(`  - railway_type = 'halt': ${totalHalts}`);
console.log(`  - railway_type = 'stop_position': ${totalStopPositions}`);
console.log(`  - station_type = 'junction': ${totalJunctions}`);
console.log(`  - station_type = 'terminal': ${totalTerminals}`);
console.log(`  - station_type = 'way_station': ${totalWayStations}`);
console.log(`  - station_type = 'suburban': ${totalSuburban}`);

// Facilities
const totalFacilities = NATIONAL_RAILWAY_FACILITIES.length;
const facilityTypes: Record<string, number> = {};
NATIONAL_RAILWAY_FACILITIES.forEach(f => {
  facilityTypes[f.type] = (facilityTypes[f.type] || 0) + 1;
});

console.log(`\n2. RECORD COUNTS IN NATIONAL_RAILWAY_FACILITIES:`);
console.log(`- Total facilities: ${totalFacilities}`);
Object.entries(facilityTypes).forEach(([type, count]) => {
  console.log(`  - ${type}: ${count}`);
});

// Tracks
const totalTracks = NATIONAL_RAILWAY_TRACK_GEOMETRIES.length;
let totalVertices = 0;
let estimatedTotalKm = 0;

function haversineDistKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

console.log(`\n3. RECORD COUNTS IN NATIONAL_RAILWAY_TRACKS:`);
console.log(`- Total track geometries: ${totalTracks}`);
NATIONAL_RAILWAY_TRACK_GEOMETRIES.forEach(t => {
  totalVertices += t.geometry.length;
  let trackLen = 0;
  for (let i = 0; i < t.geometry.length - 1; i++) {
    trackLen += haversineDistKm(
      t.geometry[i].lat, t.geometry[i].lng,
      t.geometry[i + 1].lat, t.geometry[i + 1].lng
    );
  }
  estimatedTotalKm += trackLen;
  console.log(`  - [${t.id}] ${t.name} (${t.corridor_name}): ${t.geometry.length} points, approx ${trackLen.toFixed(1)} km`);
});
console.log(`- Total track vertices: ${totalVertices}`);
console.log(`- Total track length calculated: ${estimatedTotalKm.toFixed(1)} km`);

// Zones and States
const zones: Record<string, number> = {};
const states: Record<string, number> = {};
NATIONAL_RAILWAY_LOCATIONS.forEach(l => {
  zones[l.zone] = (zones[l.zone] || 0) + 1;
  states[l.state] = (states[l.state] || 0) + 1;
});

console.log(`\n4. GEOGRAPHIC SPREAD:`);
console.log(`- Distinct Zones represented (${Object.keys(zones).length}):`, Object.keys(zones).sort().join(', '));
console.log(`- Distinct States/UTs represented (${Object.keys(states).length}):`, Object.keys(states).sort().join(', '));

// 5. Audit 19 Indian Cities
const testCities = [
  'New Delhi',
  'Mumbai Central',
  'Howrah',
  'Chennai Central',
  'Guwahati',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
  'Bengaluru',
  'Hyderabad',
  'Bhubaneswar',
  'Patna',
  'Kolkata',
  'Thiruvananthapuram',
  'Jammu',
  'Amritsar',
  'Nagpur',
  'Vijayawada',
  'Secunderabad'
];

console.log(`\n======================================================================`);
console.log(`5. BACKEND DATABASE SEARCH AUDIT FOR 19 REQUIRED INDIAN CITIES:`);
console.log(`======================================================================`);

testCities.forEach(city => {
  const results = searchStations(city, 5);
  console.log(`\nQUERY: "${city}" -> Found: ${results.length}`);
  if (results.length === 0) {
    console.log(`  [MISSING] No records found for "${city}"`);
  } else {
    results.forEach(r => {
      console.log(`  - Match: ${r.name} (${r.railway_ref}) | Zone: ${r.zone} | State: ${r.state} | Coord: [${r.latitude}, ${r.longitude}] | Source: ${r.source}`);
    });
  }
});

console.log(`\n======================================================================`);
console.log(`6. BLOCK REQUISITION ROUTE/SECTION + KM INTEGRITY TEST (SECTION 10):`);
console.log(`======================================================================`);

// Test A: Station outside the 6 named corridors - Guwahati (GHY, Northeast Frontier Railway)
const ghyLoc = resolveMaintenanceLocation('GHY', '14/500', '16/200');
console.log('\nTEST A: Guwahati (GHY, NFR) at KM 14/500 – 16/200:');
console.log(`- Valid: ${ghyLoc.isValid}`);
console.log(`- Station: ${ghyLoc.primaryStation.name} (${ghyLoc.primaryStation.code}) | Zone: ${ghyLoc.primaryStation.zone} | Div: ${ghyLoc.primaryStation.division}`);
console.log(`- Section: ${ghyLoc.section.name} (ID: ${ghyLoc.section.id})`);
console.log(`- Line: ${ghyLoc.line.name}`);
console.log(`- Start KM: ${ghyLoc.startKmDisplay} | End KM: ${ghyLoc.endKmDisplay} | Length: ${ghyLoc.affectedLengthMeters}m`);
console.log(`- Correctly NOT Vijayawada section: ${ghyLoc.section.id !== 'SEC-A' && !ghyLoc.section.name.includes('Vijayawada') ? 'PASS' : 'FAIL'}`);

// Test B: Station outside corridors - Jaipur (JP, North Western Railway)
const jpLoc = resolveMaintenanceLocation('JP', '5/200', '6/800');
console.log('\nTEST B: Jaipur (JP, NWR) at KM 5/200 – 6/800:');
console.log(`- Station: ${jpLoc.primaryStation.name} (${jpLoc.primaryStation.code}) | Zone: ${jpLoc.primaryStation.zone}`);
console.log(`- Section: ${jpLoc.section.name} (ID: ${jpLoc.section.id})`);
console.log(`- Line: ${jpLoc.line.name}`);
console.log(`- Correctly NOT Vijayawada section: ${jpLoc.section.id !== 'SEC-A' && !jpLoc.section.name.includes('Vijayawada') ? 'PASS' : 'FAIL'}`);

// Test C: Station on Vijayawada corridor - BZA (SEC-A)
const bzaLoc = resolveMaintenanceLocation('BZA', '12/400', '14/800');
console.log('\nTEST C: Vijayawada (BZA, SCR) at KM 12/400 – 14/800:');
console.log(`- Station: ${bzaLoc.primaryStation.name} (${bzaLoc.primaryStation.code})`);
console.log(`- Section: ${bzaLoc.section.name} (ID: ${bzaLoc.section.id})`);
console.log(`- Available Tracks (${bzaLoc.track.availableTracks.length}):`, bzaLoc.track.availableTracks);
console.log(`- Location Status: ${bzaLoc.locationStatus}`);

// Test D: Cross-Section span on Vijayawada corridor (SEC-A to SEC-B)
const crossLoc = resolveMaintenanceLocation('MAG', '24/800', '26/200');
console.log('\nTEST D: Cross-Section Span at KM 24/800 – 26/200 (MAG):');
console.log(`- Cross-Section detected: ${crossLoc.section.isCrossSection ? 'YES (PASS)' : 'NO (FAIL)'}`);
console.log(`- Affected Sections:`, crossLoc.section.affectedSections);

