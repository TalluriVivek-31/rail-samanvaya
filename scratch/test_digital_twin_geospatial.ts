// Test Suite: Railway Geospatial Map-Matching, Track Geometry & Digital Twin Calculations
import { 
  CORRIDOR_TRACKS,
  CORRIDOR_STATION_GEOS,
  CORRIDOR_SIGNALS,
  haversineDistanceKm,
  projectPointOntoSegment,
  interpolateTrackCoordAtKm,
  mapMatchTrainToTrack,
  getGeospatialMaintenanceZones,
  evaluateTrainBlockApproach,
  TrackPolyline,
  GeoPoint
} from '../src/utils/railwayGeospatial';
import { LiveTrainPosition, BlockRequest } from '../src/types/samnvay';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ ${testName}${detail ? ' - ' + detail : ''}`);
    failed++;
  }
}

console.log('\n=== RUNNING RAILWAY GEOSPATIAL & DIGITAL TWIN TEST SUITE ===\n');

// 1. Haversine distance tests
console.log('--- 1. Haversine Distance Tests ---');
const distBzaKcc = haversineDistanceKm(
  CORRIDOR_STATION_GEOS.BZA.lat,
  CORRIDOR_STATION_GEOS.BZA.lng,
  CORRIDOR_STATION_GEOS.KCC.lat,
  CORRIDOR_STATION_GEOS.KCC.lng
);
// Real world distance BZA to KCC is ~4.5 - 5.5 km
assert(distBzaKcc >= 4.0 && distBzaKcc <= 6.0, 'BZA to KCC great-circle distance is physically accurate (~4.5-5.5 km)', `Got ${distBzaKcc} km`);

// 2. Vector Segment Projection Tests
console.log('\n--- 2. Vector Segment Projection Tests ---');
const p1: GeoPoint = { lat: 16.5000, lng: 80.6100, km: 3.0 };
const p2: GeoPoint = { lat: 16.4900, lng: 80.6000, km: 4.5 };
const queryPoint = { lat: 16.4950, lng: 80.6060 }; // Point very close to segment p1-p2

const proj = projectPointOntoSegment(queryPoint, p1, p2);
assert(proj.t >= 0 && proj.t <= 1, 'Point projects within segment bounds [0, 1]', `t = ${proj.t}`);
assert(proj.distanceMeters < 300, 'Perpendicular distance is within expected tolerance (< 300m)', `Got ${proj.distanceMeters}m`);
assert(proj.interpolatedKm >= 3.0 && proj.interpolatedKm <= 4.5, 'Interpolated KM matches segment chainage', `KM: ${proj.interpolatedKm}`);

// 3. Track Interpolation Along Curves
console.log('\n--- 3. Curved Track Polyline Interpolation ---');
const upTrack = CORRIDOR_TRACKS.find(t => t.id === 'TRK-UP-MAIN')!;
assert(!!upTrack, 'UP Main track exists in corridor definition');

const interpAtMag = interpolateTrackCoordAtKm(upTrack, 12.5);
const magGeo = CORRIDOR_STATION_GEOS.MAG;
const distFromMag = haversineDistanceKm(interpAtMag.coord.lat, interpAtMag.coord.lng, magGeo.lat, magGeo.lng) * 1000;
assert(distFromMag < 50, 'Interpolation at KM 12.5 accurately resolves Mangalagiri station coordinates (< 50m)', `Dist: ${distFromMag}m`);
assert(interpAtMag.bearingDegrees >= 180 && interpAtMag.bearingDegrees <= 270, 'UP train bearing southwestwards towards Guntur is realistic', `Bearing: ${interpAtMag.bearingDegrees}°`);

// 4. Direction-Aware Map-Matching (Parallel Track Disambiguation)
console.log('\n--- 4. Map-Matching & Parallel Track Disambiguation ---');

// Train A: 12627 UP Karnataka Express near Mangalagiri (lat: 16.4360, lng: 80.5660)
const upTrain: LiveTrainPosition = {
  trainNumber: '12627',
  trainName: 'Karnataka Express',
  currentStation: 'MAG',
  nextStation: 'NBR',
  lastReportedStation: 'KCC',
  direction: 'UP',
  delayMinutes: 12,
  scheduledArrival: '14:20',
  expectedArrival: '14:32',
  currentKm: 12.4,
  latitude: 16.4360,
  longitude: 80.5660,
  speedKmph: 75,
  status: 'RUNNING',
  lastUpdated: new Date().toISOString()
};

const matchedUp = mapMatchTrainToTrack(upTrain, CORRIDOR_TRACKS);
assert(matchedUp.trackId === 'TRK-UP-MAIN', 'UP Train snaps to UP Main line (never to adjacent DN Main)', `Matched: ${matchedUp.trackId}`);
assert(matchedUp.confidence === 'HIGH', 'Valid GPS near centerline results in HIGH confidence', `Confidence: ${matchedUp.confidence}, dev: ${matchedUp.deviationMeters}m`);
assert(matchedUp.deviationMeters < 200, 'Deviation is within 200m Indian Railways threshold', `Dev: ${matchedUp.deviationMeters}m`);

// Train B: 20678 DN Vande Bharat Express near Mangalagiri on DOWN line
const dnTrain: LiveTrainPosition = {
  trainNumber: '20678',
  trainName: 'Vande Bharat Express',
  currentStation: 'MAG',
  nextStation: 'BZA',
  lastReportedStation: 'NBR',
  direction: 'DN',
  delayMinutes: 0,
  scheduledArrival: '14:25',
  expectedArrival: '14:25',
  currentKm: 12.4,
  latitude: 16.4355 + 0.00016, // offset to DN line
  longitude: 80.5655 + 0.00016,
  speedKmph: 110,
  status: 'RUNNING',
  lastUpdated: new Date().toISOString()
};

const matchedDn = mapMatchTrainToTrack(dnTrain, CORRIDOR_TRACKS);
assert(matchedDn.trackId === 'TRK-DN-MAIN', 'DOWN Train snaps strictly to DOWN Main line', `Matched: ${matchedDn.trackId}`);

// Train C: Train with degraded GPS (> 350m off track)
const degradedTrain: LiveTrainPosition = {
  ...upTrain,
  latitude: 16.4450, // shifted far north
  longitude: 80.5850
};
const matchedDegraded = mapMatchTrainToTrack(degradedTrain, CORRIDOR_TRACKS);
assert(matchedDegraded.confidence === 'LOW', 'Train > 200m off centerline correctly triggers LOW confidence warning', `Confidence: ${matchedDegraded.confidence}, dev: ${matchedDegraded.deviationMeters}m`);

// Train D: Train with NO GPS (telemetry fallback to KM)
const noGpsTrain: LiveTrainPosition = {
  ...upTrain,
  latitude: undefined,
  longitude: undefined,
  currentKm: 36.8 // at NBR
};
const matchedNoGps = mapMatchTrainToTrack(noGpsTrain, CORRIDOR_TRACKS);
assert(matchedNoGps.confidence === 'INFERRED_FROM_KM', 'Train with missing GPS cleanly falls back to chainage KM', `Confidence: ${matchedNoGps.confidence}`);
assert(matchedNoGps.trackKm === 36.8, 'Snapped track KM matches reported chainage', `KM: ${matchedNoGps.trackKm}`);

// 5. Maintenance Possession Geospatial Slicing
console.log('\n--- 5. Maintenance Possession Geospatial Slicing ---');
const sampleRequests: BlockRequest[] = [
  {
    id: 'BR-2001',
    department: 'P.Way',
    engineer: 'R. Sharma',
    creatorRole: 'P.Way Engineer',
    section: 'SEC-A',
    startLocation: 'KM 11/800',
    endLocation: 'KM 13/200',
    startKm: 11.8,
    endKm: 13.2,
    work: 'Through Rail Renewal (TRR)',
    workCategory: 'Track Maintenance',
    lineName: 'UP Main',
    date: '2026-09-14',
    preferredTime: '10:00',
    duration: 90,
    priority: 'HIGH',
    risk: 'HIGH',
    status: 'Approved',
    reason: 'Ultrasonic flaw detection detected rail defect',
    safetyRequirements: ['Traffic Block', 'Speed Restriction 30 km/h'],
    resourcesRequired: ['BCM Machine', 'P.Way Gang'],
    priorityScore: 85,
    priorityBreakdown: { criticality: 30, urgency: 25, risk: 20, trafficImpact: 5, resourceAvailability: 5, score: 85, explanation: 'High priority' },
    createdAt: new Date().toISOString()
  }
];

const zones = getGeospatialMaintenanceZones(sampleRequests, CORRIDOR_TRACKS);
assert(zones.length === 1, 'Exactly one maintenance zone sliced');
const zone = zones[0];
assert(zone.startKm === 11.8 && zone.endKm === 13.2, 'Zone preserves exact KM limits', `Start: ${zone.startKm}, End: ${zone.endKm}`);
assert(zone.polyline.length >= 2, 'Sub-polyline contains sliced track coordinates', `Points: ${zone.polyline.length}`);
assert(zone.centerCoord.lat > 16.42 && zone.centerCoord.lat < 16.45, 'Zone center coordinate is geographically accurate near Mangalagiri', `Center: ${zone.centerCoord.lat}, ${zone.centerCoord.lng}`);

// 6. Real-Time Proximity & Dynamic Approach ETA Calculation
console.log('\n--- 6. Train-Block Approach & Dynamic ETA Calculation ---');

// Case A: Approaching UP train at KM 8.0 with speed 60 km/h towards Block at KM 11.8 (Distance = 3.8 km)
const approachingTrain: MapMatchedTrain = {
  train: {
    ...upTrain,
    currentKm: 8.0,
    speedKmph: 60,
    direction: 'UP'
  },
  snappedCoord: { lat: 16.46, lng: 80.58 },
  trackId: 'TRK-UP-MAIN',
  trackName: 'UP Main Line (BZA → GNT → TEL)',
  trackKm: 8.0,
  bearingDegrees: 210,
  confidence: 'HIGH',
  deviationMeters: 15,
  isLive: true
};

const approachResult = evaluateTrainBlockApproach(approachingTrain, zone);
assert(!!approachResult, 'Approach evaluation returned result');
assert(approachResult?.distanceKm === 3.8, 'Approach distance is exactly 3.8 km', `Got: ${approachResult?.distanceKm} km`);
// ETA for 3.8 km at 60 km/h = 3.8 min (~4 min)
assert(approachResult?.dynamicEtaMinutes !== null && approachResult?.dynamicEtaMinutes <= 5, 'Dynamic ETA is ~4 minutes', `ETA: ${approachResult?.dynamicEtaMinutes} min`);
assert(approachResult?.status === 'IMMINENT_APPROACH', 'Status is IMMINENT_APPROACH (< 5km / 15min)', `Status: ${approachResult?.status}`);

// Case B: Train inside active possession limits (KM 12.5)
const insideTrain: MapMatchedTrain = {
  ...approachingTrain,
  trackKm: 12.5
};
const insideResult = evaluateTrainBlockApproach(insideTrain, zone);
assert(insideResult?.status === 'INSIDE_BLOCK_ZONE', 'Train inside block limits flagged as INSIDE_BLOCK_ZONE', `Status: ${insideResult?.status}`);

// Case C: Train on opposite track (DN Main)
const oppositeTrain: MapMatchedTrain = {
  ...approachingTrain,
  trackName: 'DOWN Main Line',
  train: {
    ...approachingTrain.train,
    direction: 'DN'
  }
};
const oppositeResult = evaluateTrainBlockApproach(oppositeTrain, zone);
assert(oppositeResult?.status === 'CLEAR', 'Train on opposite parallel track marked CLEAR (no false collision alert)', `Status: ${oppositeResult?.status}`);

console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL GEOSPATIAL TESTS PASSED PERFECTLY!\n');
}
