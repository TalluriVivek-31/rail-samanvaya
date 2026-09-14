// scratch/test_real_railway_map_and_location.ts
// Automated Acceptance Test Suite for Real Railway Map & Location Intelligence Upgrade
// Validates all 7 criteria specified in Section 34 of the Rail Samnvay Engineering Prompt

import { 
  searchStations, 
  getStationDetails, 
  findNearestStation,
  normalizeRailwayKm, 
  getTracksInBoundingBox, 
  resolveMaintenanceLocation 
} from '../server/services/railwayGeospatialService';
import { 
  NATIONAL_RAILWAY_LOCATIONS, 
  NATIONAL_RAILWAY_TRACKS, 
  NATIONAL_RAILWAY_FACILITIES 
} from '../server/data/nationalRailwayGeospatialDatabase';
import { detectCrossSectionSpans, parseRailwayKm, formatRailwayKm } from '../src/utils/railwayLocation';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`\x1b[32m[PASS]\x1b[0m ${testName}`);
    passed++;
  } else {
    console.error(`\x1b[31m[FAIL]\x1b[0m ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

console.log('\n========================================================================');
console.log('--- RUNNING REAL RAILWAY MAP & LOCATION INTELLIGENCE ACCEPTANCE TESTS ---');
console.log('========================================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: Nationwide Station Search
// -----------------------------------------------------------------------------
console.log('--- TEST 1: Nationwide Station Search & Autocomplete ---');
const queryDelhi = searchStations('New Delhi');
const querySecunderabad = searchStations('Secunderabad');
const queryNagpur = searchStations('Nagpur');
const queryBza = searchStations('BZA');
const queryHowrah = searchStations('HWH');

assert(
  queryDelhi.length > 0 && queryDelhi[0].railway_ref === 'NDLS',
  'Finds New Delhi station by name and resolves code NDLS'
);
assert(
  querySecunderabad.length > 0 && querySecunderabad[0].railway_ref === 'SC',
  'Finds Secunderabad station by name and resolves code SC'
);
assert(
  queryNagpur.length > 0 && queryNagpur[0].railway_ref === 'NGP',
  'Finds Nagpur Junction by name across Central Railway zone'
);
assert(
  queryBza.length > 0 && queryBza[0].railway_ref === 'BZA',
  'Finds Vijayawada Junction by code BZA across South Central Railway'
);
assert(
  queryHowrah.length > 0 && queryHowrah[0].railway_ref === 'HWH',
  'Finds Howrah Junction by code HWH across Eastern Railway'
);
assert(
  NATIONAL_RAILWAY_LOCATIONS.length >= 25,
  `National railway station database contains comprehensive station records (${NATIONAL_RAILWAY_LOCATIONS.length} stations)`
);

// -----------------------------------------------------------------------------
// TEST 2: Station Record & Connected Railway Infrastructure Resolution
// -----------------------------------------------------------------------------
console.log('\n--- TEST 2: Station Details, Real Coordinates & Connected Infrastructure ---');
const bzaDetails = getStationDetails('BZA');
assert(
  bzaDetails.station !== null && 
  bzaDetails.station.latitude === 16.5193 && 
  bzaDetails.station.longitude === 80.6231,
  'BZA resolves real coordinates (16.5193°N, 80.6231°E)'
);
assert(
  bzaDetails.station !== null && bzaDetails.station.platforms_count === 10,
  'BZA resolves real platform count (10 platforms)'
);
assert(
  bzaDetails.nearbyTracks.length > 0,
  `BZA identifies nearby real track geometries (${bzaDetails.nearbyTracks.length} tracks detected)`
);
assert(
  bzaDetails.connectedFacilities.length > 0,
  `BZA identifies connected facilities (${bzaDetails.connectedFacilities.length} facilities detected)`
);

const ndlsDetails = getStationDetails('NDLS');
assert(
  ndlsDetails.station !== null && 
  ndlsDetails.station.latitude === 28.6427 && 
  Math.abs(ndlsDetails.station.longitude - 77.22) < 0.01,
  'NDLS resolves real surveyed coordinates (28.6427°N, ~77.22°E)'
);
assert(
  ndlsDetails.station !== null && ndlsDetails.station.platforms_count === 16,
  'NDLS resolves real platform count (16 platforms)'
);

// -----------------------------------------------------------------------------
// TEST 3: KM Chainage Normalization (12.400, 12/400, 12+400)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 3: Chainage Normalization Engine ---');
const normSlash = normalizeRailwayKm('12/400');
const normDecimal = normalizeRailwayKm('12.400');
const normPlus = normalizeRailwayKm('12+400');
const normNumber = normalizeRailwayKm(12.4);

assert(
  normSlash.km === 12.4 && normSlash.meters === 12400,
  "Normalizes '12/400' -> 12.400 km (12400 m)"
);
assert(
  normDecimal.km === 12.4 && normDecimal.meters === 12400,
  "Normalizes '12.400' -> 12.400 km (12400 m)"
);
assert(
  normPlus.km === 12.4 && normPlus.meters === 12400,
  "Normalizes '12+400' -> 12.400 km (12400 m)"
);
assert(
  normNumber.km === 12.4 && normNumber.formatted === 'KM 12/400',
  "Formats numeric 12.4 to standard Indian Railways chainage string 'KM 12/400'"
);

// -----------------------------------------------------------------------------
// TEST 4: Dynamic Track Detection (No Fake Generic Tracks)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 4: Dynamic Track Detection ---');
const bzaMainLocation = resolveMaintenanceLocation('BZA', '12/400', '13/100', 'UP Main');
assert(
  bzaMainLocation.isValid === true,
  'Resolves maintenance location within BZA corridor'
);
assert(
  bzaMainLocation.track.availableTracks.includes('UP Main') && 
  bzaMainLocation.track.availableTracks.includes('DOWN Main'),
  'Detects physical mainline tracks (UP Main, DOWN Main)'
);
assert(
  !bzaMainLocation.track.availableTracks.includes('Track 1') &&
  !bzaMainLocation.track.availableTracks.includes('Track 2'),
  'Ensures NO fake generic tracks (Track 1, Track 2) are present'
);
const mainlines = bzaMainLocation.track.detailedTracks.filter(t => t.trackName.includes('Main'));
assert(
  mainlines.length >= 2 && mainlines.every(t => t.electrified === true && t.speedLimitKmph >= 120),
  'Mainline tracks contain real operational attributes (electrified 25kV, speed limit >= 120 km/h)'
);

// -----------------------------------------------------------------------------
// TEST 5: Cross-Section Boundary Detection
// -----------------------------------------------------------------------------
console.log('\n--- TEST 5: Cross-Section Boundary Detection ---');
const crossSpan = detectCrossSectionSpans(24.8, 26.2);
assert(
  crossSpan.isCrossSection === true,
  'Detects work zone crossing KM 25/000 boundary (KM 24/800 – 26/200)'
);
assert(
  crossSpan.sections.includes('SEC-A') && crossSpan.sections.includes('SEC-B'),
  'Identifies both spanned sections (SEC-A, SEC-B)'
);
assert(
  Boolean(crossSpan.warningMessage?.includes('CROSS-SECTION SPAN')),
  'Provides explicit cross-section span operational safety alert'
);

const crossGeoLocation = resolveMaintenanceLocation('MAG', '24/800', '26/200');
assert(
  crossGeoLocation.section.isCrossSection === true,
  'resolveMaintenanceLocation flags cross-section boundary dynamically'
);
assert(
  crossGeoLocation.section.affectedSections.length >= 2,
  'resolveMaintenanceLocation lists all affected sections in boundary breakdown'
);

// -----------------------------------------------------------------------------
// TEST 6: Subcontinent Bounding Box & Railway Track Filtering
// -----------------------------------------------------------------------------
console.log('\n--- TEST 6: National Subcontinent Geometry & Level of Detail (LOD) ---');
// Query India-wide bounding box at zoom 5
const nationalTracks = getTracksInBoundingBox([6.0, 68.0, 37.5, 97.5], 5);
assert(
  nationalTracks.length > 0,
  `Retrieves surveyed national trunk corridors (${nationalTracks.length} major corridors)`
);
assert(
  nationalTracks.some(t => t.name.includes('Delhi – Mumbai')),
  'Includes Western Railway Trunk (Delhi – Mumbai)'
);
assert(
  nationalTracks.some(t => t.name.includes('Delhi – Howrah')),
  'Includes Eastern Trunk (Delhi – Howrah)'
);
assert(
  nationalTracks.some(t => t.name.includes('Grand Trunk')),
  'Includes North-South Grand Trunk Corridor'
);

// -----------------------------------------------------------------------------
// TEST 7: Transparent Data Provenance & Honest Attribution
// -----------------------------------------------------------------------------
console.log('\n--- TEST 7: Transparent Data Provenance & Integrity Labeling ---');
assert(
  bzaMainLocation.dataProvenance.geospatialSource === 'OSM',
  "Attribution explicitly cites 'OSM' as geospatial source"
);
assert(
  Boolean(bzaMainLocation.dataProvenance.disclaimer.includes('OpenStreetMap')),
  "Disclaimer clearly attributes OpenStreetMap geometry"
);
assert(
  !bzaMainLocation.dataProvenance.sourceDataset.includes('Official Indian Railways Asset Database'),
  "Never falsely claims 'Official Indian Railways Asset Database'"
);
assert(
  bzaMainLocation.primaryStation.source === 'OSM',
  'Station record source transparently labeled as OSM'
);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n========================================================================');
console.log(`--- TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\x1b[32mAll Real Railway Map & Location Intelligence tests PASSED successfully!\x1b[0m\n');
  process.exit(0);
}
