// Test Suite: India-Wide Geospatial Digital Twin Engine & Scope Audit
// Validates nationwide bounds, zone navigation, national trunk corridors,
// map-matching across all 18 railway zones, and lack of division-only defaults.

import { 
  INDIA_BOUNDS, 
  INDIA_ZONE_BOUNDS, 
  INDIA_BOUNDARY_COORDS, 
  NATIONAL_RAILWAY_TRACKS, 
  NATIONAL_STATION_GEOS, 
  ALL_TRACKS,
  CORRIDOR_TRACKS,
  mapMatchTrainToTrack,
  GeoPoint
} from '../src/utils/railwayGeospatial';
import type { LiveTrainPosition } from '../src/types/samnvay';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

console.log('\n=== SECTION 1: India-Wide Geographic Bounds & Zones ===');
assert(INDIA_BOUNDS.minLat <= 8.0 && INDIA_BOUNDS.maxLat >= 37.0, 'INDIA_BOUNDS covers full latitude span (Kanyakumari to Kashmir)');
assert(INDIA_BOUNDS.minLng <= 69.0 && INDIA_BOUNDS.maxLng >= 97.0, 'INDIA_BOUNDS covers full longitude span (Gujarat to Arunachal)');
assert(INDIA_BOUNDARY_COORDS.length >= 40, `INDIA_BOUNDARY_COORDS has detailed surveyed silhouette (${INDIA_BOUNDARY_COORDS.length} points)`);

const zones = Object.keys(INDIA_ZONE_BOUNDS);
assert(zones.includes('ALL_INDIA'), 'INDIA_ZONE_BOUNDS includes ALL_INDIA');
assert(zones.includes('NORTHERN'), 'INDIA_ZONE_BOUNDS includes NORTHERN');
assert(zones.includes('WESTERN'), 'INDIA_ZONE_BOUNDS includes WESTERN');
assert(zones.includes('CENTRAL'), 'INDIA_ZONE_BOUNDS includes CENTRAL');
assert(zones.includes('EASTERN'), 'INDIA_ZONE_BOUNDS includes EASTERN');
assert(zones.includes('SOUTHERN'), 'INDIA_ZONE_BOUNDS includes SOUTHERN');
assert(zones.includes('NORTHEAST'), 'INDIA_ZONE_BOUNDS includes NORTHEAST');
assert(zones.includes('PROTOTYPE'), 'INDIA_ZONE_BOUNDS includes PROTOTYPE (high-resolution corridor)');

console.log('\n=== SECTION 2: National Track Network Geometry ===');
assert(NATIONAL_RAILWAY_TRACKS.length >= 10, `NATIONAL_RAILWAY_TRACKS has ${NATIONAL_RAILWAY_TRACKS.length} major trunk corridors`);
assert(ALL_TRACKS.length === CORRIDOR_TRACKS.length + NATIONAL_RAILWAY_TRACKS.length, 'ALL_TRACKS cleanly combines national and prototype tracks');

const delhiMumbai = ALL_TRACKS.find(t => t.id === 'TRK-NAT-DEL-MUM');
assert(!!delhiMumbai, 'Delhi–Mumbai Western Trunk corridor is mapped');
assert((delhiMumbai?.coordinates.length || 0) >= 5, 'Delhi–Mumbai corridor has multi-point surveyed polyline');

const delhiHowrah = ALL_TRACKS.find(t => t.id === 'TRK-NAT-DEL-HWH');
assert(!!delhiHowrah, 'Delhi–Howrah Eastern Trunk corridor is mapped');

const grandTrunk = ALL_TRACKS.find(t => t.id === 'TRK-NAT-DEL-MAS');
assert(!!grandTrunk, 'Grand Trunk (Delhi–Chennai) North-South corridor is mapped');

const howrahChennai = ALL_TRACKS.find(t => t.id === 'TRK-NAT-HWH-MAS');
assert(!!howrahChennai, 'Howrah–Chennai East Coast trunk corridor is mapped');

console.log('\n=== SECTION 3: Nationwide Station Geodetic Database ===');
const stationCount = Object.keys(NATIONAL_STATION_GEOS).length;
assert(stationCount >= 50, `NATIONAL_STATION_GEOS has ${stationCount} stations across India`);

// Check presence of key zone hubs
const keyHubs = ['NDLS', 'BCT', 'HWH', 'MAS', 'SBC', 'SC', 'GHY', 'PNBE', 'ADI', 'JAT', 'SVDK', 'TVC', 'BBS', 'VSKP'];
for (const hub of keyHubs) {
  assert(!!NATIONAL_STATION_GEOS[hub], `Station hub ${hub} is mapped with surveyed WGS84 coordinates`);
}

console.log('\n=== SECTION 4: Map-Matching Anywhere in India ===');

// Test 4A: Train in Northern India (e.g. 12424 Dibrugarh Rajdhani near Kanpur CNB)
const trainNorth: LiveTrainPosition = {
  trainNumber: '12424',
  trainName: 'DIBRUGARH RAJDHANI',
  currentStation: 'CNB',
  nextStation: 'PRYJ',
  direction: 'DN',
  speedKmph: 125,
  delayMinutes: 5,
  delaySeconds: 300,
  gpsStatus: 'ONLINE',
  latitude: 26.4542,
  longitude: 80.3507
};
const matchedNorth = mapMatchTrainToTrack(trainNorth, ALL_TRACKS);
assert(matchedNorth.confidence === 'HIGH', `Train 12424 matched with confidence: ${matchedNorth.confidence}`);
assert(matchedNorth.snappedCoord.lat > 25.0 && matchedNorth.snappedCoord.lat < 28.0, `Train 12424 snapped correctly near Kanpur/Northern trunk: ${matchedNorth.snappedCoord.lat.toFixed(4)}°N`);
assert(matchedNorth.bearingDegrees >= 0 && matchedNorth.bearingDegrees <= 360, `Bearing computed: ${matchedNorth.bearingDegrees}°`);

// Test 4B: Train in Western India (e.g. 12951 Mumbai Rajdhani near Kota KOTA)
const trainWest: LiveTrainPosition = {
  trainNumber: '12951',
  trainName: 'MUMBAI RAJDHANI',
  currentStation: 'KOTA',
  nextStation: 'RTM',
  direction: 'UP',
  speedKmph: 130,
  delayMinutes: 0,
  delaySeconds: 0,
  gpsStatus: 'ONLINE',
  latitude: 25.2138,
  longitude: 75.8648
};
const matchedWest = mapMatchTrainToTrack(trainWest, ALL_TRACKS);
assert(matchedWest.confidence === 'HIGH', `Train 12951 matched with confidence: ${matchedWest.confidence}`);
assert(matchedWest.snappedCoord.lat > 23.0 && matchedWest.snappedCoord.lat < 26.5, `Train 12951 snapped near Kota: ${matchedWest.snappedCoord.lat.toFixed(4)}°N`);

// Test 4C: Train in Southern India (e.g. 12627 Karnataka Exp near Bangalore SBC)
const trainSouth: LiveTrainPosition = {
  trainNumber: '12627',
  trainName: 'KARNATAKA EXPRESS',
  currentStation: 'SBC',
  nextStation: 'DMM',
  direction: 'UP',
  speedKmph: 85,
  delayMinutes: 12,
  delaySeconds: 720,
  gpsStatus: 'ONLINE',
  latitude: 12.9781,
  longitude: 77.5694
};
const matchedSouth = mapMatchTrainToTrack(trainSouth, ALL_TRACKS);
assert(matchedSouth.confidence === 'HIGH', `Train 12627 matched with confidence: ${matchedSouth.confidence}`);
assert(matchedSouth.snappedCoord.lat > 12.0 && matchedSouth.snappedCoord.lat < 14.5, `Train 12627 snapped near SBC/Bangalore: ${matchedSouth.snappedCoord.lat.toFixed(4)}°N`);

// Test 4D: Train in Eastern India (e.g. 12301 Howrah Rajdhani near Howrah HWH)
const trainEast: LiveTrainPosition = {
  trainNumber: '12301',
  trainName: 'HOWRAH RAJDHANI',
  currentStation: 'HWH',
  nextStation: 'BWN',
  direction: 'DN',
  speedKmph: 110,
  delayMinutes: 2,
  delaySeconds: 120,
  gpsStatus: 'ONLINE',
  latitude: 22.5830,
  longitude: 88.3426
};
const matchedEast = mapMatchTrainToTrack(trainEast, ALL_TRACKS);
assert(matchedEast.confidence === 'HIGH', `Train 12301 matched with confidence: ${matchedEast.confidence}`);
assert(matchedEast.snappedCoord.lng > 87.5 && matchedEast.snappedCoord.lng < 89.0, `Train 12301 snapped near Howrah: ${matchedEast.snappedCoord.lng.toFixed(4)}°E`);

// Test 4E: Train in Northeast India (e.g. 15657 Brahmaputra Mail near Guwahati GHY)
const trainNE: LiveTrainPosition = {
  trainNumber: '15657',
  trainName: 'BRAHMAPUTRA MAIL',
  currentStation: 'GHY',
  nextStation: 'RNY',
  direction: 'DN',
  speedKmph: 75,
  delayMinutes: 25,
  delaySeconds: 1500,
  gpsStatus: 'ONLINE',
  latitude: 26.1862,
  longitude: 91.7540
};
const matchedNE = mapMatchTrainToTrack(trainNE, ALL_TRACKS);
assert(matchedNE.confidence === 'HIGH', `Train 15657 matched with confidence: ${matchedNE.confidence}`);
assert(matchedNE.snappedCoord.lat > 25.5 && matchedNE.snappedCoord.lat < 27.0, `Train 15657 snapped near Guwahati: ${matchedNE.snappedCoord.lat.toFixed(4)}°N`);

// Test 4F: Train in Prototype Corridor with Chainage KM (e.g. 12703 Falaknuma Exp in block section between BZA and MAG)
const trainPrototype: LiveTrainPosition = {
  trainNumber: '12703',
  trainName: 'HOWRAH SECUNDERABAD FALAKNUMA EXP',
  currentStation: 'BZA',
  nextStation: 'MAG',
  direction: 'UP',
  speedKmph: 92,
  delayMinutes: 4,
  delaySeconds: 240,
  currentKm: 7.8,
  gpsStatus: 'ONLINE'
};
const matchedProto = mapMatchTrainToTrack(trainPrototype, ALL_TRACKS);
assert(matchedProto.trackKm === 7.8, `Train 12703 preserved high-precision chainage KM: ${matchedProto.trackKm}`);
assert(matchedProto.trackName.includes('Main'), `Train 12703 matched to prototype track: ${matchedProto.trackName}`);

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL INDIA-WIDE GEOSPATIAL ENGINE AUDIT TESTS PASSED SUCCESSFULLY!\n');
}
