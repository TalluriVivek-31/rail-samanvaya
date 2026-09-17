// Infrastructure Master Data & Work Type Configuration
// Indian Railways · South Central Railway (Vijayawada Division)
// Corridor: Vijayawada (BZA) – Guntur (GNT) – Tenali (TEL) Triangular Trunk Line (KM 0.000 – KM 80.000)

import { 
  InfrastructureMaster, 
  SectionMaster, 
  StationMaster, 
  RouteMaster, 
  AffectedSectionBreakdown, 
  BetweenStationsInfo, 
  InfrastructureAsset, 
  WorkTypeConfig, 
  LocationDetectionResult 
} from '../types/infrastructure';
import { parseRailwayKm, formatRailwayKm, calculateAffectedLength, validateKmRange } from '../utils/railwayLocation';
import { NATIONAL_STATION_GEOS } from '../utils/railwayGeospatial';

export const INFRASTRUCTURE_CORRIDOR = {
  name: 'Vijayawada – Guntur – Tenali High-Density Corridor',
  zone: 'South Central Railway (SCR)',
  division: 'Vijayawada (BZA)',
  startKm: 0.0,
  endKm: 80.0,
};

export const SECTIONS_MASTER: SectionMaster[] = [
  {
    sectionId: 'SEC-A',
    sectionName: 'BZA – MAG Section (Vijayawada – Mangalagiri)',
    corridorCode: 'CORR-01',
    startKm: 0.0,
    endKm: 25.0,
    startStation: 'Vijayawada Jn (BZA)',
    endStation: 'Mangalagiri (MAG)',
    totalKm: 25.0,
    doubleTrack: true,
    tracks: [
      {
        trackId: 'TRK-A-UP',
        trackName: 'UP Main',
        lineId: 'LINE-A-MAIN',
        lineName: 'BZA–MAG UP Main Line',
        startKm: 0.0,
        endKm: 25.0,
        electrified: true,
        speedLimitKmph: 130,
      },
      {
        trackId: 'TRK-A-DN',
        trackName: 'DOWN Main',
        lineId: 'LINE-A-MAIN',
        lineName: 'BZA–MAG DOWN Main Line',
        startKm: 0.0,
        endKm: 25.0,
        electrified: true,
        speedLimitKmph: 130,
      },
      {
        trackId: 'TRK-A-LOOP',
        trackName: 'Loop Line',
        lineId: 'LINE-A-LOOP',
        lineName: 'Mangalagiri Station Loop',
        startKm: 10.5,
        endKm: 15.2,
        electrified: true,
        speedLimitKmph: 50,
      },
      {
        trackId: 'TRK-A-SIDING',
        trackName: 'Goods Siding',
        lineId: 'LINE-A-SIDING',
        lineName: 'KCC Freight Siding',
        startKm: 11.8,
        endKm: 13.5,
        electrified: false,
        speedLimitKmph: 30,
      },
    ],
  },
  {
    sectionId: 'SEC-B',
    sectionName: 'MAG – GNT Section (Mangalagiri – Guntur Jn)',
    corridorCode: 'CORR-02',
    startKm: 25.0,
    endKm: 52.5,
    startStation: 'Mangalagiri (MAG)',
    endStation: 'Guntur Jn (GNT)',
    totalKm: 27.5,
    doubleTrack: true,
    tracks: [
      {
        trackId: 'TRK-B-UP',
        trackName: 'UP Main',
        lineId: 'LINE-B-MAIN',
        lineName: 'MAG–GNT UP Main Line',
        startKm: 25.0,
        endKm: 52.5,
        electrified: true,
        speedLimitKmph: 130,
      },
      {
        trackId: 'TRK-B-DN',
        trackName: 'DOWN Main',
        lineId: 'LINE-B-MAIN',
        lineName: 'MAG–GNT DOWN Main Line',
        startKm: 25.0,
        endKm: 52.5,
        electrified: true,
        speedLimitKmph: 130,
      },
      {
        trackId: 'TRK-B-LOOP',
        trackName: 'Common Loop',
        lineId: 'LINE-B-LOOP',
        lineName: 'Guntur West Bypass Loop',
        startKm: 47.5,
        endKm: 52.0,
        electrified: true,
        speedLimitKmph: 50,
      },
    ],
  },
  {
    sectionId: 'SEC-C',
    sectionName: 'GNT – TEL Section (Guntur Jn – Tenali Jn)',
    corridorCode: 'CORR-03',
    startKm: 52.5,
    endKm: 80.0,
    startStation: 'Guntur Jn (GNT)',
    endStation: 'Tenali Jn (TEL)',
    totalKm: 27.5,
    doubleTrack: true,
    tracks: [
      {
        trackId: 'TRK-C-UP',
        trackName: 'UP Main',
        lineId: 'LINE-C-MAIN',
        lineName: 'GNT–TEL UP Main Line',
        startKm: 52.5,
        endKm: 80.0,
        electrified: true,
        speedLimitKmph: 130,
      },
      {
        trackId: 'TRK-C-DN',
        trackName: 'DOWN Main',
        lineId: 'LINE-C-MAIN',
        lineName: 'GNT–TEL DOWN Main Line',
        startKm: 52.5,
        endKm: 80.0,
        electrified: true,
        speedLimitKmph: 130,
      },
      {
        trackId: 'TRK-C-LOOP',
        trackName: 'Loop Line',
        lineId: 'LINE-C-LOOP',
        lineName: 'Vejandla Station Loop',
        startKm: 61.5,
        endKm: 65.5,
        electrified: true,
        speedLimitKmph: 50,
      },
    ],
  },
];

export const ROUTES_MASTER: RouteMaster[] = [
  {
    routeId: 'RT-01',
    routeCode: 'ROUTE-01',
    routeName: 'Vijayawada – Guntur Trunk Route',
    corridor: 'BZA–GNT–TEL Corridor',
    startStationCode: 'BZA',
    endStationCode: 'GNT',
    totalKm: 52.5,
  },
  {
    routeId: 'RT-02',
    routeCode: 'ROUTE-02',
    routeName: 'Guntur – Tenali Chord Route',
    corridor: 'BZA–GNT–TEL Corridor',
    startStationCode: 'GNT',
    endStationCode: 'TEL',
    totalKm: 27.5,
  },
];

export const CORRIDOR_STATIONS: StationMaster[] = [
  {
    stationId: 'STN-BZA',
    stationCode: 'BZA',
    stationName: 'Vijayawada Junction',
    sectionId: 'SEC-A',
    routeCode: 'ROUTE-01',
    km: 0.0,
    kmDisplay: 'KM 0/000',
    yardLimitStartKm: 0.0,
    yardLimitEndKm: 2.5,
    tracks: ['UP Main', 'DOWN Main', 'Yard Line'],
  },
  {
    stationId: 'STN-KCC',
    stationCode: 'KCC',
    stationName: 'Krishna Canal Junction',
    sectionId: 'SEC-A',
    routeCode: 'ROUTE-01',
    km: 5.2,
    kmDisplay: 'KM 5/200',
    yardLimitStartKm: 4.5,
    yardLimitEndKm: 6.2,
    tracks: ['UP Main', 'DOWN Main', 'Goods Siding'],
  },
  {
    stationId: 'STN-MAG',
    stationCode: 'MAG',
    stationName: 'Mangalagiri',
    sectionId: 'SEC-A',
    routeCode: 'ROUTE-01',
    km: 12.5,
    kmDisplay: 'KM 12/500',
    yardLimitStartKm: 11.8,
    yardLimitEndKm: 13.2,
    tracks: ['UP Main', 'DOWN Main', 'Loop Line', 'Goods Siding'],
  },
  {
    stationId: 'STN-NBR',
    stationCode: 'NBR',
    stationName: 'Namburu',
    sectionId: 'SEC-B',
    routeCode: 'ROUTE-01',
    km: 36.8,
    kmDisplay: 'KM 36/800',
    yardLimitStartKm: 35.5,
    yardLimitEndKm: 37.8,
    tracks: ['UP Main', 'DOWN Main'],
  },
  {
    stationId: 'STN-GNT',
    stationCode: 'GNT',
    stationName: 'Guntur Junction',
    sectionId: 'SEC-B',
    routeCode: 'ROUTE-01',
    km: 50.0,
    kmDisplay: 'KM 50/000',
    yardLimitStartKm: 48.2,
    yardLimitEndKm: 52.5,
    tracks: ['UP Main', 'DOWN Main', 'Common Loop', 'Yard Line'],
  },
  {
    stationId: 'STN-VJA',
    stationCode: 'VJA',
    stationName: 'Vejandla',
    sectionId: 'SEC-C',
    routeCode: 'ROUTE-02',
    km: 63.4,
    kmDisplay: 'KM 63/400',
    yardLimitStartKm: 62.0,
    yardLimitEndKm: 64.8,
    tracks: ['UP Main', 'DOWN Main', 'Loop Line'],
  },
  {
    stationId: 'STN-TEL',
    stationCode: 'TEL',
    stationName: 'Tenali Junction',
    sectionId: 'SEC-C',
    routeCode: 'ROUTE-02',
    km: 78.5,
    kmDisplay: 'KM 78/500',
    yardLimitStartKm: 76.8,
    yardLimitEndKm: 80.0,
    tracks: ['UP Main', 'DOWN Main', 'Yard Line'],
  },
];

export const INFRASTRUCTURE_ASSETS: InfrastructureAsset[] = [
  // --- KM 12.000 - 13.500 Focus Cluster (Mangalagiri Vicinity) ---
  // P.Way Assets
  {
    assetId: 'RS-12',
    assetType: 'Rail Section',
    name: '60kg 90UTS Welded Rail Section KM 12/400–13/100',
    department: 'P.Way',
    km: 12.75,
    kmDisplay: 'KM 12/750',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'NEEDS_MAINTENANCE',
  },
  {
    assetId: 'T-124',
    assetType: 'Turnout',
    name: 'Turnout 1:12 Curved Switch (UP Main to Loop)',
    department: 'P.Way',
    km: 12.45,
    kmDisplay: 'KM 12/450',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'TG-01',
    assetType: 'Track Geometry Zone',
    name: 'Track Alignment & Gauge Monitoring Zone 12A',
    department: 'P.Way',
    km: 12.8,
    kmDisplay: 'KM 12/800',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'NEEDS_MAINTENANCE',
  },
  {
    assetId: 'T-125',
    assetType: 'Turnout',
    name: 'Goods Siding Derailing Switch & Diamond Crossing',
    department: 'P.Way',
    km: 13.05,
    kmDisplay: 'KM 13/050',
    trackId: 'TRK-A-SIDING',
    trackName: 'Goods Siding',
    status: 'OPERATIONAL',
  },

  // S&T Assets
  {
    assetId: 'S-127',
    assetType: 'Signal',
    name: '4-Aspect Color Light Starter Signal S-127',
    department: 'S&T',
    km: 12.6,
    kmDisplay: 'KM 12/600',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'PM-128',
    assetType: 'Point Machine',
    name: 'Dual-Control Electric Point Machine PM-128',
    department: 'S&T',
    km: 12.85,
    kmDisplay: 'KM 12/850',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'TC-129',
    assetType: 'Track Circuit',
    name: 'Audio-Frequency Track Circuit (AFTC) TC-129',
    department: 'S&T',
    km: 12.9,
    kmDisplay: 'KM 12/900',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'NEEDS_MAINTENANCE',
  },
  {
    assetId: 'AC-125',
    assetType: 'Axle Counter',
    name: 'High-Integrity Dual Electronic Axle Counter Unit',
    department: 'S&T',
    km: 12.42,
    kmDisplay: 'KM 12/420',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },

  // TRD Assets
  {
    assetId: 'M-125',
    assetType: 'OHE Mast',
    name: 'Traction Portal Mast M-125 (25kV AC)',
    department: 'TRD',
    km: 12.5,
    kmDisplay: 'KM 12/500',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'M-126',
    assetType: 'OHE Mast',
    name: 'Cantilever Catenary Support Mast M-126',
    department: 'TRD',
    km: 12.75,
    kmDisplay: 'KM 12/750',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'NEEDS_MAINTENANCE',
  },
  {
    assetId: 'SP-12',
    assetType: 'Sectioning Post',
    name: 'Sectioning & Paralleling Post SP-12 Isolator Switch',
    department: 'TRD',
    km: 12.8,
    kmDisplay: 'KM 12/800',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'CAT-12',
    assetType: 'Catenary Wire',
    name: '107 sq mm Hard-Drawn Grooved Copper Contact Wire',
    department: 'TRD',
    km: 12.88,
    kmDisplay: 'KM 12/880',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'NEEDS_MAINTENANCE',
  },

  // --- Other Corridor Assets (SEC-A, SEC-B, SEC-C) ---
  {
    assetId: 'T-201',
    assetType: 'Turnout',
    name: 'Namburu West Facing Points',
    department: 'P.Way',
    km: 24.9,
    kmDisplay: 'KM 24/900',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'S-205',
    assetType: 'Signal',
    name: 'Boundary Automatic Signal S-205',
    department: 'S&T',
    km: 25.15,
    kmDisplay: 'KM 25/150',
    trackId: 'TRK-B-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'M-201',
    assetType: 'OHE Mast',
    name: 'Section-Boundary OHE Tensioner Mast M-201',
    department: 'TRD',
    km: 25.3,
    kmDisplay: 'KM 25/300',
    trackId: 'TRK-B-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'PM-301',
    assetType: 'Point Machine',
    name: 'Guntur Junction East Approach Points',
    department: 'S&T',
    km: 49.8,
    kmDisplay: 'KM 49/800',
    trackId: 'TRK-B-LOOP',
    trackName: 'Common Loop',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'T-312',
    assetType: 'Turnout',
    name: 'Vejandla Main Crossover Turnout',
    department: 'P.Way',
    km: 63.2,
    kmDisplay: 'KM 63/200',
    trackId: 'TRK-C-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'SP-33',
    assetType: 'Sectioning Post',
    name: 'Tenali North Neutral Section Isolator SP-33',
    department: 'TRD',
    km: 77.9,
    kmDisplay: 'KM 77/900',
    trackId: 'TRK-C-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
];

export const WORK_TYPES_MASTER: Record<string, WorkTypeConfig[]> = {
  'P.Way': [
    {
      id: 'PW-01',
      name: 'Track Tamping',
      department: 'P.Way',
      defaultDurationMins: 120,
      trafficBlockRequired: true,
      powerBlockRequired: false,
      sntDisconnectionRequired: false,
      speedRestrictionRequired: true,
      defaultPriority: 'HIGH',
      suggestedResources: ['09-3X Dynamic Tamping Machine', '6 Track Maintainers', 'Track Master Level'],
      description: 'Continuous mechanized packing and tamping to restore track ballast bed resilience and longitudinal levels.',
    },
    {
      id: 'PW-02',
      name: 'Rail Replacement',
      department: 'P.Way',
      defaultDurationMins: 180,
      trafficBlockRequired: true,
      powerBlockRequired: false,
      sntDisconnectionRequired: false,
      speedRestrictionRequired: true,
      defaultPriority: 'CRITICAL',
      suggestedResources: ['Rail Crane / Threader', 'Flash Butt Welding Plant', '12 Gang Staff'],
      description: 'Exchange of worn or defective rail sections with newly tested 60kg 90UTS continuous welded rails.',
    },
    {
      id: 'PW-03',
      name: 'Track Geometry Correction',
      department: 'P.Way',
      defaultDurationMins: 90,
      trafficBlockRequired: true,
      powerBlockRequired: false,
      sntDisconnectionRequired: false,
      speedRestrictionRequired: true,
      defaultPriority: 'HIGH',
      suggestedResources: ['Ballast Regulator', 'Track Gauge & Cross Level', '8 Keymen'],
      description: 'Realignment of track cross-levels, cant deficiency, and sleeper spacing along curves.',
    },
    {
      id: 'PW-04',
      name: 'Sleeper Replacement',
      department: 'P.Way',
      defaultDurationMins: 150,
      trafficBlockRequired: true,
      powerBlockRequired: false,
      sntDisconnectionRequired: false,
      speedRestrictionRequired: true,
      defaultPriority: 'MEDIUM',
      suggestedResources: ['Sleeper Exchanger Rake', '10 Track Maintainers', 'Elastic Rail Clips'],
      description: 'Renewal of cracked or damaged pre-stressed concrete sleepers (PSC) and rubber pads.',
    },
    {
      id: 'PW-05',
      name: 'Thermit Rail Welding',
      department: 'P.Way',
      defaultDurationMins: 75,
      trafficBlockRequired: true,
      powerBlockRequired: false,
      sntDisconnectionRequired: false,
      speedRestrictionRequired: false,
      defaultPriority: 'HIGH',
      suggestedResources: ['Alumino-Thermic Welding Kit', 'Weld Grinder', '4 Certified Welders'],
      description: 'Execution of AT rail joints with controlled pre-heating and ultrasonic flaw inspection.',
    },
    {
      id: 'PW-06',
      name: 'Ballast Cleaning & Screening',
      department: 'P.Way',
      defaultDurationMins: 240,
      trafficBlockRequired: true,
      powerBlockRequired: false,
      sntDisconnectionRequired: false,
      speedRestrictionRequired: true,
      defaultPriority: 'MEDIUM',
      suggestedResources: ['BCM Ballast Cleaning Machine', 'Hopper Rake', '14 Gang Staff'],
      description: 'Deep screening of fouled ballast under track bed to restore drainage and elasticity.',
    },
  ],

  'S&T': [
    {
      id: 'ST-01',
      name: 'Point Machine Maintenance',
      department: 'S&T',
      defaultDurationMins: 45,
      trafficBlockRequired: true,
      powerBlockRequired: false,
      sntDisconnectionRequired: true,
      speedRestrictionRequired: false,
      defaultPriority: 'HIGH',
      suggestedResources: ['S&T Calibration Kit', 'Obstruction Test Gauge (3.25mm)', '2 Technicians'],
      description: 'Testing of point drive stroke, lock detection, and friction clutch torque under disconnexion memo.',
    },
    {
      id: 'ST-02',
      name: 'Signal Interlocking & Aspect Testing',
      department: 'S&T',
      defaultDurationMins: 60,
      trafficBlockRequired: true,
      powerBlockRequired: false,
      sntDisconnectionRequired: true,
      speedRestrictionRequired: false,
      defaultPriority: 'HIGH',
      suggestedResources: ['Relay Test Set', 'LED Signal Optical Meter', 'Sectional S&T Inspector'],
      description: 'Electronic Interlocking (EI) logic table verification, aspect cascade test, and red lamp monitoring.',
    },
    {
      id: 'ST-03',
      name: 'Track Circuit Maintenance',
      department: 'S&T',
      defaultDurationMins: 45,
      trafficBlockRequired: true,
      powerBlockRequired: false,
      sntDisconnectionRequired: true,
      speedRestrictionRequired: false,
      defaultPriority: 'MEDIUM',
      suggestedResources: ['Track Feed Resistance Tester', 'Bootleg Bond Repair Kit', '2 ESM Staff'],
      description: 'Drop shunt test, rail bond integrity inspection, and ballast insulation resistance testing.',
    },
    {
      id: 'ST-04',
      name: 'Axle Counter Maintenance',
      department: 'S&T',
      defaultDurationMins: 30,
      trafficBlockRequired: false,
      powerBlockRequired: false,
      sntDisconnectionRequired: true,
      speedRestrictionRequired: false,
      defaultPriority: 'MEDIUM',
      suggestedResources: ['Axle Counter Wheel Simulator', 'High-Frequency Oscilloscope', '1 Tech'],
      description: 'High-frequency track sensor alignment, reset circuit testing, and channel phase measurement.',
    },
    {
      id: 'ST-05',
      name: 'Telecommunication & Cable Overhaul',
      department: 'S&T',
      defaultDurationMins: 90,
      trafficBlockRequired: false,
      powerBlockRequired: false,
      sntDisconnectionRequired: false,
      speedRestrictionRequired: false,
      defaultPriority: 'LOW',
      suggestedResources: ['Optical Time Domain Reflectometer (OTDR)', 'Fiber Splicing Machine'],
      description: 'Optical fiber cable attenuation measurement and quad cable joint insulation testing.',
    },
  ],

  'TRD': [
    {
      id: 'TRD-01',
      name: 'OHE Maintenance / Inspection',
      department: 'TRD',
      defaultDurationMins: 60,
      trafficBlockRequired: true,
      powerBlockRequired: true,
      sntDisconnectionRequired: false,
      speedRestrictionRequired: false,
      defaultPriority: 'HIGH',
      suggestedResources: ['Self-Propelled 8-Wheeler Tower Wagon', 'Discharge Rods', '4 OHE Linemen'],
      description: 'Pantograph contact wire height, stagger measurement, and cantilever insulator cleaning under 25kV power block.',
    },
    {
      id: 'TRD-02',
      name: 'Catenary Wire Renewal',
      department: 'TRD',
      defaultDurationMins: 120,
      trafficBlockRequired: true,
      powerBlockRequired: true,
      sntDisconnectionRequired: false,
      speedRestrictionRequired: true,
      defaultPriority: 'CRITICAL',
      suggestedResources: ['Wiring Train / Tensioner Machine', 'Temporary Earthing Equipt', '8 TRD Staff'],
      description: 'Stringing and tensioning of high-tensile 65 sq mm cadmium-copper catenary wire over the section.',
    },
    {
      id: 'TRD-03',
      name: 'OHE Mast Maintenance',
      department: 'TRD',
      defaultDurationMins: 45,
      trafficBlockRequired: false,
      powerBlockRequired: true,
      sntDisconnectionRequired: false,
      speedRestrictionRequired: false,
      defaultPriority: 'MEDIUM',
      suggestedResources: ['Ladder Trolley', 'Torque Wrench', '3 Linemen'],
      description: 'Inspection of mast foundation grouting, bond wire continuity, and bracket bolt torquing.',
    },
    {
      id: 'TRD-04',
      name: 'Sectioning Post Overhaul',
      department: 'TRD',
      defaultDurationMins: 90,
      trafficBlockRequired: true,
      powerBlockRequired: true,
      sntDisconnectionRequired: false,
      speedRestrictionRequired: false,
      defaultPriority: 'HIGH',
      suggestedResources: ['Interrupter Contact Gauge', '25kV Dielectric Test Kit', 'Sr. DEE Staff'],
      description: 'Vacuum circuit breaker (VCB) maintenance and remote supervisory control (SCADA) telemetry checkout.',
    },
    {
      id: 'TRD-05',
      name: 'Electrical Isolator Switch Replacement',
      department: 'TRD',
      defaultDurationMins: 75,
      trafficBlockRequired: true,
      powerBlockRequired: true,
      sntDisconnectionRequired: false,
      speedRestrictionRequired: false,
      defaultPriority: 'HIGH',
      suggestedResources: ['Manual Isolator Operating Pole', 'Silver-Plated Contact Blades', '4 Linemen'],
      description: 'Switching isolator jaw alignment and contact pressure measurement under dead section conditions.',
    },
  ],
};

/**
 * Search the Infrastructure Master by Station Code, Station Name, Section Code, Route Code, KM, or Asset ID.
 */
export function searchRailwayLocation(query: string): Array<{
  type: 'STATION' | 'SECTION' | 'ROUTE' | 'ASSET' | 'KM';
  title: string;
  subtitle: string;
  code: string;
  startKm: number;
  endKm: number;
  suggestedStartKm: string;
  suggestedEndKm: string;
  primaryStationCode: string;
  sectionCode: string;
  routeCode: string;
}> {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim().toLowerCase();
  const results: Array<any> = [];
  const matchedCodes = new Set<string>();

  // 1. Match Local Corridor Stations (by code or name)
  CORRIDOR_STATIONS.forEach(stn => {
    if (stn.stationCode.toLowerCase().includes(q) || stn.stationName.toLowerCase().includes(q) || `stn${stn.stationCode}`.toLowerCase().includes(q)) {
      matchedCodes.add(stn.stationCode);
      results.push({
        type: 'STATION',
        title: `${stn.stationName} (${stn.stationCode})`,
        subtitle: `Station KM ${formatRailwayKm(stn.km)} · Yard: ${formatRailwayKm(stn.yardLimitStartKm)} – ${formatRailwayKm(stn.yardLimitEndKm)}`,
        code: stn.stationCode,
        startKm: stn.yardLimitStartKm,
        endKm: stn.yardLimitEndKm,
        suggestedStartKm: formatRailwayKm(stn.yardLimitStartKm).replace('KM ', ''),
        suggestedEndKm: formatRailwayKm(stn.yardLimitEndKm).replace('KM ', ''),
        primaryStationCode: stn.stationCode,
        sectionCode: stn.sectionId,
        routeCode: stn.routeCode,
      });
    }
  });

  // 1b. Match Nationwide Stations across all 18 Indian Railway Zones
  Object.values(NATIONAL_STATION_GEOS).forEach((stn: any) => {
    if (matchedCodes.has(stn.code)) return;
    if (stn.code.toLowerCase().includes(q) || stn.name.toLowerCase().includes(q)) {
      matchedCodes.add(stn.code);
      const baseKm = stn.km != null ? stn.km : 12.4;
      results.push({
        type: 'STATION',
        title: `${stn.name} (${stn.code})`,
        subtitle: `National Railway Station · ${stn.platforms || 4} Platforms · Coordinates: ${stn.lat.toFixed(2)}, ${stn.lng.toFixed(2)}`,
        code: stn.code,
        startKm: baseKm,
        endKm: baseKm + 1.2,
        suggestedStartKm: formatRailwayKm(baseKm).replace('KM ', ''),
        suggestedEndKm: formatRailwayKm(baseKm + 1.2).replace('KM ', ''),
        primaryStationCode: stn.code,
        sectionCode: `${stn.code}-SEC`,
        routeCode: 'IR-TRUNK',
      });
    }
  });

  // 2. Match Sections (by sectionId or sectionName)
  SECTIONS_MASTER.forEach(sec => {
    if (sec.sectionId.toLowerCase().includes(q) || sec.sectionName.toLowerCase().includes(q)) {
      results.push({
        type: 'SECTION',
        title: `${sec.sectionId} — ${sec.sectionName}`,
        subtitle: `Corridor Range: ${formatRailwayKm(sec.startKm)} – ${formatRailwayKm(sec.endKm)} (${sec.totalKm} km)`,
        code: sec.sectionId,
        startKm: sec.startKm,
        endKm: sec.endKm,
        suggestedStartKm: formatRailwayKm(sec.startKm).replace('KM ', ''),
        suggestedEndKm: formatRailwayKm(Math.min(sec.startKm + 1.0, sec.endKm)).replace('KM ', ''),
        primaryStationCode: sec.startStation.includes('(') ? sec.startStation.split('(')[1].replace(')', '') : 'BZA',
        sectionCode: sec.sectionId,
        routeCode: sec.corridorCode,
      });
    }
  });

  // 3. Match Routes (by routeCode or routeName)
  ROUTES_MASTER.forEach(rt => {
    if (rt.routeCode.toLowerCase().includes(q) || rt.routeName.toLowerCase().includes(q)) {
      results.push({
        type: 'ROUTE',
        title: `${rt.routeCode} — ${rt.routeName}`,
        subtitle: `${rt.startStationCode} to ${rt.endStationCode} (${rt.totalKm} km)`,
        code: rt.routeCode,
        startKm: 0.0,
        endKm: rt.totalKm,
        suggestedStartKm: '12/400',
        suggestedEndKm: '13/100',
        primaryStationCode: 'MAG',
        sectionCode: 'SEC-A',
        routeCode: rt.routeCode,
      });
    }
  });

  // 4. Match Assets (by assetId or name)
  INFRASTRUCTURE_ASSETS.forEach(ast => {
    if (ast.assetId.toLowerCase().includes(q) || ast.name.toLowerCase().includes(q) || ast.assetType.toLowerCase().includes(q)) {
      const astStart = Math.max(0, Math.round((ast.km - 0.3) * 1000) / 1000);
      const astEnd = Math.min(80, Math.round((ast.km + 0.3) * 1000) / 1000);
      results.push({
        type: 'ASSET',
        title: `${ast.assetId} · ${ast.name}`,
        subtitle: `${ast.department} ${ast.assetType} at ${ast.kmDisplay} on ${ast.trackName}`,
        code: ast.assetId,
        startKm: astStart,
        endKm: astEnd,
        suggestedStartKm: formatRailwayKm(astStart).replace('KM ', ''),
        suggestedEndKm: formatRailwayKm(astEnd).replace('KM ', ''),
        primaryStationCode: ast.km < 25 ? 'MAG' : ast.km < 52.5 ? 'GNT' : 'TEL',
        sectionCode: ast.km < 25 ? 'SEC-A' : ast.km < 52.5 ? 'SEC-B' : 'SEC-C',
        routeCode: ast.km < 52.5 ? 'ROUTE-01' : 'ROUTE-02',
      });
    }
  });

  return results.slice(0, 8);
}

/**
 * Automatically detects sections, lines, tracks, assets, and stations for a given start and end KM.
 * Implements authoritative Station Identification, Between Stations detection, Station Limit Intersections,
 * and Cross-Section breakdown.
 */
export function detectLocationInfrastructure(
  startInput: string | number,
  endInput: string | number
): LocationDetectionResult {
  const startKmDecimal = parseRailwayKm(startInput);
  const endKmDecimal = parseRailwayKm(endInput);

  const validation = validateKmRange(
    startKmDecimal, 
    endKmDecimal, 
    0.0, 
    3000.0
  );

  const startKmDisplay = isNaN(startKmDecimal) ? 'Invalid' : formatRailwayKm(startKmDecimal);
  const endKmDisplay = isNaN(endKmDecimal) ? 'Invalid' : formatRailwayKm(endKmDecimal);
  const { lengthKm, lengthMeters } = calculateAffectedLength(startKmDecimal, endKmDecimal);

  if (!validation.isValid) {
    return {
      isValid: false,
      errorMessage: validation.errorMessage,
      startKmDecimal,
      endKmDecimal,
      startKmDisplay,
      endKmDisplay,
      affectedLengthKm: lengthKm,
      affectedLengthMeters: lengthMeters,
      isCrossSection: false,
      detectedSections: [],
      affectedSectionsBreakdown: [],
      detectedLines: [],
      availableTracks: [],
      affectedAssets: {
        all: [],
        withinRange: [],
        nearby: [],
        byDepartment: { 'P.Way': [], 'S&T': [], 'TRD': [] },
      },
      stationContextType: 'BETWEEN_STATIONS',
      primaryStation: null,
      stationCode: 'UNKNOWN',
      stationName: 'Unknown Station',
      sectionCode: 'UNKNOWN',
      sectionName: 'Unknown Section',
      routeCode: 'ROUTE-01',
      routeName: 'Vijayawada – Guntur Trunk Route',
      isStationLimitIntersection: false,
      stationLimitsAffected: [],
      betweenStations: null,
      stationsInRange: [],
    };
  }

  // 1. Detect intersecting sections & compute detailed breakdown per section
  let detectedSections = SECTIONS_MASTER.filter(sec => {
    return sec.startKm < endKmDecimal && sec.endKm > startKmDecimal;
  });

  // If outside local corridor (e.g. nationwide chainage), provide dynamic section with dynamic tracks
  if (detectedSections.length === 0) {
    const natList = Object.values(NATIONAL_STATION_GEOS);
    const closest: any = natList.find(s => s.km != null && Math.abs(s.km - startKmDecimal) <= 30) || natList[0];
    detectedSections = [{
      sectionId: `${closest.code}-SEC`,
      sectionName: `${closest.name} Main Section`,
      corridorCode: 'IR-TRUNK',
      startKm: Math.floor(startKmDecimal),
      endKm: Math.ceil(endKmDecimal),
      startStation: closest.code,
      endStation: closest.code,
      totalKm: Math.max(1, endKmDecimal - startKmDecimal),
      doubleTrack: true,
      tracks: [
        {
          trackId: 'TRK-UP-MAIN',
          trackName: 'UP Main',
          lineId: 'LINE-UP',
          lineName: `${closest.name} UP Main Line`,
          startKm: startKmDecimal,
          endKm: endKmDecimal,
          electrified: true,
          speedLimitKmph: 130
        },
        {
          trackId: 'TRK-DN-MAIN',
          trackName: 'DOWN Main',
          lineId: 'LINE-DN',
          lineName: `${closest.name} DOWN Main Line`,
          startKm: startKmDecimal,
          endKm: endKmDecimal,
          electrified: true,
          speedLimitKmph: 130
        }
      ]
    }];
  }

  const isCrossSection = detectedSections.length > 1;

  const affectedSectionsBreakdown: AffectedSectionBreakdown[] = detectedSections.map(sec => {
    const segStart = Math.max(sec.startKm, startKmDecimal);
    const segEnd = Math.min(sec.endKm, endKmDecimal);
    const segLen = Math.round((segEnd - segStart) * 1000);
    return {
      sectionId: sec.sectionId,
      sectionCode: sec.sectionId,
      sectionName: sec.sectionName,
      startKm: segStart,
      endKm: segEnd,
      rangeDisplay: `${formatRailwayKm(segStart)} – ${formatRailwayKm(segEnd)}`,
      lengthMeters: segLen,
    };
  });

  // 2. Detect available tracks that physically exist in the input KM range
  const availableTracks: any[] = [];
  const trackIdSet = new Set<string>();
  const lineSet = new Set<string>();

  detectedSections.forEach(sec => {
    sec.tracks.forEach(trk => {
      const overlaps = trk.startKm < endKmDecimal && trk.endKm > startKmDecimal;
      if (overlaps && !trackIdSet.has(trk.trackName)) {
        trackIdSet.add(trk.trackName);
        availableTracks.push(trk);
        lineSet.add(trk.lineName);
      }
    });
  });

  // 3. Find affected and nearby infrastructure assets with proximity classification
  const PROXIMITY_TOLERANCE_KM = 2.0; // 2000m tolerance for nearby assets
  const classifiedAssets: (InfrastructureAsset & { proximity: 'WITHIN_RANGE' | 'INTERSECTS_RANGE' | 'NEARBY'; distanceMeters: number; isAffected: boolean })[] = [];

  INFRASTRUCTURE_ASSETS.forEach(a => {
    const assetKm = a.km;
    if (assetKm >= startKmDecimal && assetKm <= endKmDecimal) {
      classifiedAssets.push({
        ...a,
        proximity: 'WITHIN_RANGE',
        distanceMeters: 0,
        isAffected: true,
      });
    } else if (Math.abs(assetKm - startKmDecimal) <= 0.005 || Math.abs(assetKm - endKmDecimal) <= 0.005) {
      classifiedAssets.push({
        ...a,
        proximity: 'INTERSECTS_RANGE',
        distanceMeters: Math.round(Math.min(Math.abs(assetKm - startKmDecimal), Math.abs(assetKm - endKmDecimal)) * 1000),
        isAffected: true,
      });
    } else if (assetKm < startKmDecimal && (startKmDecimal - assetKm) <= PROXIMITY_TOLERANCE_KM) {
      classifiedAssets.push({
        ...a,
        proximity: 'NEARBY',
        distanceMeters: Math.round((startKmDecimal - assetKm) * 1000),
        isAffected: false,
      });
    } else if (assetKm > endKmDecimal && (assetKm - endKmDecimal) <= PROXIMITY_TOLERANCE_KM) {
      classifiedAssets.push({
        ...a,
        proximity: 'NEARBY',
        distanceMeters: Math.round((assetKm - endKmDecimal) * 1000),
        isAffected: false,
      });
    }
  });

  const withinRangeAssets = classifiedAssets.filter(a => a.isAffected);
  const nearbyAssets = classifiedAssets.filter(a => !a.isAffected);

  const byDepartment: Record<any, InfrastructureAsset[]> = {
    'P.Way': withinRangeAssets.filter(a => a.department === 'P.Way'),
    'S&T': withinRangeAssets.filter(a => a.department === 'S&T'),
    'TRD': withinRangeAssets.filter(a => a.department === 'TRD'),
  };

  // 4. Station Identification Logic
  // Find stations in range or nearby
  const stationsInRange = CORRIDOR_STATIONS.filter(stn => {
    return stn.km >= startKmDecimal - 3.0 && stn.km <= endKmDecimal + 3.0;
  });

  // Check Station Limit Intersections (Yard Limit overlap)
  const stationLimitsAffected: { stationCode: string; stationName: string; yardRange: string }[] = [];
  CORRIDOR_STATIONS.forEach(stn => {
    const overlapsYard = stn.yardLimitStartKm < endKmDecimal && stn.yardLimitEndKm > startKmDecimal;
    if (overlapsYard) {
      stationLimitsAffected.push({
        stationCode: stn.stationCode,
        stationName: stn.stationName,
        yardRange: `${formatRailwayKm(stn.yardLimitStartKm)} – ${formatRailwayKm(stn.yardLimitEndKm)}`,
      });
    }
  });
  const isStationLimitIntersection = stationLimitsAffected.length > 0;

  // Determine Primary Station:
  // If yard limit is intersected, use that station; otherwise find closest station to the midpoint
  const midKm = (startKmDecimal + endKmDecimal) / 2;
  let primaryStation: StationMaster = CORRIDOR_STATIONS[0];
  let minDiff = Infinity;

  CORRIDOR_STATIONS.forEach(stn => {
    const diff = Math.abs(stn.km - midKm);
    if (diff < minDiff) {
      minDiff = diff;
      primaryStation = stn;
    }
  });

  // If outside local corridor, resolve closest nationwide station
  if (minDiff > 50) {
    const natList = Object.values(NATIONAL_STATION_GEOS);
    let closestNat: any = natList[0];
    let minNatDiff = Infinity;
    natList.forEach(stn => {
      const diff = Math.abs((stn.km || 0) - midKm);
      if (diff < minNatDiff) {
        minNatDiff = diff;
        closestNat = stn;
      }
    });
    if (closestNat) {
      primaryStation = {
        stationId: `STN-${closestNat.code}`,
        stationCode: closestNat.code,
        stationName: closestNat.name,
        sectionId: `${closestNat.code}-SEC`,
        routeCode: 'IR-TRUNK',
        km: closestNat.km || midKm,
        kmDisplay: formatRailwayKm(closestNat.km || midKm),
        yardLimitStartKm: closestNat.yardStartKm || midKm - 1.5,
        yardLimitEndKm: closestNat.yardEndKm || midKm + 1.5,
        tracks: closestNat.tracks || ['UP Main', 'DOWN Main']
      };
    }
  }

  // If a station's yard limits are intersected, prioritize that station
  if (isStationLimitIntersection) {
    const match = CORRIDOR_STATIONS.find(s => s.stationCode === stationLimitsAffected[0].stationCode);
    if (match) primaryStation = match;
  }

  // 5. Between Stations Determination (Station A -> Station B)
  // Identify the block section between stations containing or adjoining this maintenance work
  let prevStation: StationMaster = CORRIDOR_STATIONS[0];
  let nextStation: StationMaster = CORRIDOR_STATIONS[1];

  for (let i = 0; i < CORRIDOR_STATIONS.length; i++) {
    const stn = CORRIDOR_STATIONS[i];
    if (stn.km <= midKm) {
      prevStation = stn;
      nextStation = CORRIDOR_STATIONS[Math.min(CORRIDOR_STATIONS.length - 1, i + 1)];
    }
  }

  // If work is located at or around a station (e.g. MAG at KM 12.5), identify the block section
  // from the preceding junction to this station (e.g. KCC -> MAG) or this station to next (MAG -> NBR)
  if (prevStation.stationCode === nextStation.stationCode) {
    const idx = CORRIDOR_STATIONS.findIndex(s => s.stationCode === prevStation.stationCode);
    if (idx > 0) prevStation = CORRIDOR_STATIONS[idx - 1];
  }

  // If the work intersects station limits of MAG (KM 12.4-13.1), indicate KCC -> MAG or MAG Yard
  if (isStationLimitIntersection && primaryStation.stationCode === 'MAG' && startKmDecimal <= primaryStation.km + 0.6) {
    const kcc = CORRIDOR_STATIONS.find(s => s.stationCode === 'KCC');
    if (kcc) {
      prevStation = kcc;
      nextStation = primaryStation;
    }
  }

  const betweenStations: BetweenStationsInfo = {
    fromStation: prevStation,
    toStation: nextStation,
    display: `${prevStation.stationName} (${prevStation.stationCode}) → ${nextStation.stationName} (${nextStation.stationCode})`,
    sectionCode: detectedSections[0]?.sectionId || 'SEC-A',
  };

  const primarySection = detectedSections[0] || SECTIONS_MASTER[0];
  const routeObj = ROUTES_MASTER.find(r => r.routeCode === primarySection.corridorCode) || ROUTES_MASTER[0];

  return {
    isValid: true,
    startKmDecimal,
    endKmDecimal,
    startKmDisplay,
    endKmDisplay,
    affectedLengthKm: lengthKm,
    affectedLengthMeters: lengthMeters,
    isCrossSection,
    detectedSections,
    affectedSectionsBreakdown,
    detectedLines: Array.from(lineSet),
    availableTracks,
    affectedAssets: {
      all: classifiedAssets,
      withinRange: withinRangeAssets,
      nearby: nearbyAssets,
      byDepartment,
    },
    primaryStation,
    stationCode: primaryStation.stationCode,
    stationName: primaryStation.stationName,
    sectionCode: primarySection.sectionId,
    sectionName: primarySection.sectionName,
    routeCode: routeObj.routeCode,
    routeName: routeObj.routeName,
    isStationLimitIntersection,
    stationLimitsAffected,
    betweenStations,
    stationsInRange,
    stationContextType: stationLimitsAffected.length === 1 && startKmDecimal >= (primaryStation?.yardLimitStartKm ?? 0) && endKmDecimal <= (primaryStation?.yardLimitEndKm ?? 0)
      ? 'WITHIN_STATION_LIMITS'
      : stationLimitsAffected.length > 0
      ? 'CROSSING_STATION_LIMITS'
      : stationsInRange.some(s => Math.min(Math.abs(s.km - startKmDecimal), Math.abs(s.km - endKmDecimal)) < 1.0)
      ? 'NEAR_STATION'
      : 'BETWEEN_STATIONS',
  };
}
