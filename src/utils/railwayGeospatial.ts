// Railway Geospatial Infrastructure, Map-Matching & Digital Twin Calculations
// Indian Railways · National Railway Network & Geospatial Digital Twin
// Provides ground-truth WGS84 track geometries, national trunk corridors,
// vector projection, directional snapping, maintenance chainage slicing,
// and dynamic train-block approach ETA calculations across India.

import { LiveTrainPosition, BlockRequest } from '../types/samnvay';

// -----------------------------------------------------------------------------
// 0. National Subcontinent Geospatial Bounds & Regional Zones
// -----------------------------------------------------------------------------

export const INDIA_BOUNDS = {
  minLat: 7.0,
  maxLat: 37.5,
  minLng: 68.0,
  maxLng: 98.0,
};

export interface IndiaZoneBounds {
  id: string;
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  zoomLevel: number;
  centerLat: number;
  centerLng: number;
}

export const INDIA_ZONE_BOUNDS: Record<string, IndiaZoneBounds> = {
  ALL_INDIA: {
    id: 'ALL_INDIA',
    name: 'All India Network',
    minLat: 7.0,
    maxLat: 37.5,
    minLng: 68.0,
    maxLng: 98.0,
    zoomLevel: 1.0,
    centerLat: 22.5,
    centerLng: 82.5
  },
  NORTHERN: {
    id: 'NORTHERN',
    name: 'Northern (NR / NCR / NWR)',
    minLat: 25.0,
    maxLat: 34.5,
    minLng: 73.0,
    maxLng: 82.0,
    zoomLevel: 2.2,
    centerLat: 29.0,
    centerLng: 77.5
  },
  WESTERN: {
    id: 'WESTERN',
    name: 'Western (WR / WCR)',
    minLat: 18.0,
    maxLat: 26.0,
    minLng: 68.5,
    maxLng: 77.5,
    zoomLevel: 2.2,
    centerLat: 22.0,
    centerLng: 73.0
  },
  CENTRAL: {
    id: 'CENTRAL',
    name: 'Central (CR / SECR)',
    minLat: 18.0,
    maxLat: 24.5,
    minLng: 76.0,
    maxLng: 83.5,
    zoomLevel: 2.3,
    centerLat: 21.0,
    centerLng: 79.5
  },
  EASTERN: {
    id: 'EASTERN',
    name: 'Eastern (ER / ECR / SER)',
    minLat: 21.0,
    maxLat: 27.5,
    minLng: 83.0,
    maxLng: 89.5,
    zoomLevel: 2.3,
    centerLat: 24.0,
    centerLng: 86.5
  },
  SOUTHERN: {
    id: 'SOUTHERN',
    name: 'Southern (SR / SWR / SCR)',
    minLat: 8.0,
    maxLat: 18.5,
    minLng: 74.0,
    maxLng: 83.0,
    zoomLevel: 2.0,
    centerLat: 13.5,
    centerLng: 78.5
  },
  NORTHEAST: {
    id: 'NORTHEAST',
    name: 'Northeast Frontier (NFR)',
    minLat: 24.0,
    maxLat: 28.5,
    minLng: 88.0,
    maxLng: 96.0,
    zoomLevel: 2.4,
    centerLat: 26.5,
    centerLng: 92.5
  },
  PROTOTYPE: {
    id: 'PROTOTYPE',
    name: 'Configured Prototype Corridor',
    minLat: 15.6,
    maxLat: 16.7,
    minLng: 80.0,
    maxLng: 81.0,
    zoomLevel: 3.5,
    centerLat: 16.35,
    centerLng: 80.55
  }
};

/**
 * Surveyed WGS84 coordinates outlining the geographic silhouette of the Indian subcontinent.
 */
export const INDIA_BOUNDARY_COORDS: { lat: number; lng: number }[] = [
  // West Coast (Gujarat south to Kanyakumari)
  { lat: 23.8, lng: 68.8 },
  { lat: 23.0, lng: 69.0 },
  { lat: 22.3, lng: 69.0 },
  { lat: 21.5, lng: 69.6 },
  { lat: 20.7, lng: 70.9 },
  { lat: 21.0, lng: 72.1 },
  { lat: 20.3, lng: 72.8 },
  { lat: 18.9, lng: 72.8 },
  { lat: 17.0, lng: 73.3 },
  { lat: 15.3, lng: 73.8 },
  { lat: 14.0, lng: 74.5 },
  { lat: 12.9, lng: 74.8 },
  { lat: 11.2, lng: 75.8 },
  { lat: 9.9, lng: 76.3 },
  { lat: 8.5, lng: 76.9 },
  { lat: 8.08, lng: 77.54 }, // Kanyakumari (Southernmost tip)

  // East Coast (Kanyakumari north to Bengal)
  { lat: 9.3, lng: 79.1 },
  { lat: 10.3, lng: 79.8 },
  { lat: 11.9, lng: 79.8 },
  { lat: 13.08, lng: 80.28 },
  { lat: 15.5, lng: 80.05 },
  { lat: 16.2, lng: 81.1 },
  { lat: 17.7, lng: 83.3 },
  { lat: 19.3, lng: 85.0 },
  { lat: 19.8, lng: 85.8 },
  { lat: 21.5, lng: 87.0 },
  { lat: 21.7, lng: 88.0 },
  { lat: 22.5, lng: 88.9 },

  // Northeast & Himalayan Border
  { lat: 25.0, lng: 89.0 },
  { lat: 26.5, lng: 89.8 },
  { lat: 26.2, lng: 91.8 },
  { lat: 27.5, lng: 95.0 },
  { lat: 28.2, lng: 96.0 },
  { lat: 27.0, lng: 94.0 },
  { lat: 24.8, lng: 93.9 },
  { lat: 23.5, lng: 93.0 },
  { lat: 23.8, lng: 91.3 },
  { lat: 25.5, lng: 91.5 },
  { lat: 26.7, lng: 88.4 },
  { lat: 27.3, lng: 88.6 },
  { lat: 27.5, lng: 88.1 },
  { lat: 26.8, lng: 85.0 },
  { lat: 28.5, lng: 80.5 },
  { lat: 30.5, lng: 79.5 },
  { lat: 32.5, lng: 77.0 },
  { lat: 34.5, lng: 77.5 },
  { lat: 35.5, lng: 74.8 },
  { lat: 34.1, lng: 74.8 },
  { lat: 32.7, lng: 74.9 },

  // Northwest / Western Border
  { lat: 31.6, lng: 74.9 },
  { lat: 30.0, lng: 74.0 },
  { lat: 28.5, lng: 72.8 },
  { lat: 26.9, lng: 70.9 },
  { lat: 25.7, lng: 71.3 },
  { lat: 24.5, lng: 71.0 },
  { lat: 23.8, lng: 68.8 }
];

// -----------------------------------------------------------------------------
// 1. Ground-Truth Geospatial Coordinates & Track Definitions
// -----------------------------------------------------------------------------

export interface GeoPoint {
  lat: number;
  lng: number;
  km: number;
  name?: string;
}

export interface TrackPolyline {
  id: string;
  name: string;
  type: 'UP Main' | 'DOWN Main' | 'Loop Line' | 'Goods Siding' | 'Chord Line';
  direction: 'UP' | 'DN' | 'BOTH';
  startKm: number;
  endKm: number;
  speedLimitKmph: number;
  coordinates: GeoPoint[];
}

export interface CorridorStationGeo {
  code: string;
  name: string;
  km: number;
  lat: number;
  lng: number;
  yardStartKm: number;
  yardEndKm: number;
  platforms: number;
  tracks: string[];
}

export interface CorridorSignalGeo {
  id: string;
  name: string;
  km: number;
  trackId: string;
  direction: 'UP' | 'DN';
  lat: number;
  lng: number;
  defaultAspect: 'GREEN' | 'DOUBLE_YELLOW' | 'YELLOW' | 'RED';
}

// Key station landmarks with actual surveyed WGS84 coordinates
export const CORRIDOR_STATION_GEOS: Record<string, CorridorStationGeo> = {
  BZA: {
    code: 'BZA',
    name: 'Vijayawada Junction',
    km: 0.0,
    lat: 16.5193,
    lng: 80.6231,
    yardStartKm: 0.0,
    yardEndKm: 2.5,
    platforms: 10,
    tracks: ['UP Main', 'DOWN Main', 'Yard Line']
  },
  KCC: {
    code: 'KCC',
    name: 'Krishna Canal Junction',
    km: 5.2,
    lat: 16.4850,
    lng: 80.6010,
    yardStartKm: 4.5,
    yardEndKm: 6.2,
    platforms: 4,
    tracks: ['UP Main', 'DOWN Main', 'Goods Siding']
  },
  MAG: {
    code: 'MAG',
    name: 'Mangalagiri',
    km: 12.5,
    lat: 16.4350,
    lng: 80.5650,
    yardStartKm: 11.8,
    yardEndKm: 13.2,
    platforms: 3,
    tracks: ['UP Main', 'DOWN Main', 'Loop Line', 'Goods Siding']
  },
  NBR: {
    code: 'NBR',
    name: 'Namburu',
    km: 36.8,
    lat: 16.3450,
    lng: 80.5120,
    yardStartKm: 35.5,
    yardEndKm: 37.8,
    platforms: 2,
    tracks: ['UP Main', 'DOWN Main']
  },
  GNT: {
    code: 'GNT',
    name: 'Guntur Junction',
    km: 50.0,
    lat: 16.2990,
    lng: 80.4430,
    yardStartKm: 48.2,
    yardEndKm: 52.5,
    platforms: 7,
    tracks: ['UP Main', 'DOWN Main', 'Common Loop', 'Yard Line']
  },
  VJA: {
    code: 'VJA',
    name: 'Vejandla',
    km: 63.4,
    lat: 16.2620,
    lng: 80.5510,
    yardStartKm: 62.0,
    yardEndKm: 64.8,
    platforms: 2,
    tracks: ['UP Main', 'DOWN Main', 'Loop Line']
  },
  TEL: {
    code: 'TEL',
    name: 'Tenali Junction',
    km: 78.5,
    lat: 16.2430,
    lng: 80.6480,
    yardStartKm: 76.8,
    yardEndKm: 80.0,
    platforms: 6,
    tracks: ['UP Main', 'DOWN Main', 'Yard Line']
  },
  NDO: {
    code: 'NDO',
    name: 'Nidubrolu',
    km: 356.0,
    lat: 16.1050,
    lng: 80.5920,
    yardStartKm: 355.0,
    yardEndKm: 357.5,
    platforms: 3,
    tracks: ['UP Main', 'DOWN Main', 'Loop Line']
  },
  APL: {
    code: 'APL',
    name: 'Appikatla',
    km: 330.0,
    lat: 15.9870,
    lng: 80.5280,
    yardStartKm: 329.0,
    yardEndKm: 331.0,
    platforms: 2,
    tracks: ['UP Main', 'DOWN Main']
  },
  BPP: {
    code: 'BPP',
    name: 'Bapatla',
    km: 320.5,
    lat: 15.9040,
    lng: 80.4670,
    yardStartKm: 319.0,
    yardEndKm: 322.0,
    platforms: 4,
    tracks: ['UP Main', 'DOWN Main', 'Loop Line']
  },
  CLX: {
    code: 'CLX',
    name: 'Chirala',
    km: 334.2,
    lat: 15.8240,
    lng: 80.3520,
    yardStartKm: 333.0,
    yardEndKm: 336.0,
    platforms: 4,
    tracks: ['UP Main', 'DOWN Main', 'Loop Line']
  },
  VTM: {
    code: 'VTM',
    name: 'Vetapalem',
    km: 342.0,
    lat: 15.7790,
    lng: 80.3160,
    yardStartKm: 341.0,
    yardEndKm: 343.5,
    platforms: 2,
    tracks: ['UP Main', 'DOWN Main']
  },
  OGL: {
    code: 'OGL',
    name: 'Ongole',
    km: 380.0,
    lat: 15.5050,
    lng: 80.0490,
    yardStartKm: 378.0,
    yardEndKm: 382.0,
    platforms: 5,
    tracks: ['UP Main', 'DOWN Main', 'Loop Line']
  },
  NLR: {
    code: 'NLR',
    name: 'Nellore',
    km: 480.0,
    lat: 14.4426,
    lng: 79.9865,
    yardStartKm: 478.0,
    yardEndKm: 482.0,
    platforms: 5,
    tracks: ['UP Main', 'DOWN Main']
  },
  GDR: {
    code: 'GDR',
    name: 'Gudur Junction',
    km: 518.0,
    lat: 14.1463,
    lng: 79.8504,
    yardStartKm: 516.0,
    yardEndKm: 520.0,
    platforms: 6,
    tracks: ['UP Main', 'DOWN Main', 'Yard Line']
  },
  KMT: {
    code: 'KMT',
    name: 'Khammam',
    km: 105.0,
    lat: 17.2473,
    lng: 80.1514,
    yardStartKm: 103.0,
    yardEndKm: 107.0,
    platforms: 4,
    tracks: ['UP Main', 'DOWN Main']
  },
  KZJ: {
    code: 'KZJ',
    name: 'Kazipet Junction',
    km: 215.0,
    lat: 17.9780,
    lng: 79.5210,
    yardStartKm: 213.0,
    yardEndKm: 217.0,
    platforms: 6,
    tracks: ['UP Main', 'DOWN Main']
  },
  SC: {
    code: 'SC',
    name: 'Secunderabad Junction',
    km: 350.0,
    lat: 17.4339,
    lng: 78.5045,
    yardStartKm: 348.0,
    yardEndKm: 353.0,
    platforms: 10,
    tracks: ['UP Main', 'DOWN Main', 'Yard Line']
  }
};

/**
 * National surveyed station network covering all 18 Indian Railways zones and major trunk junctions.
 */
export const NATIONAL_STATION_GEOS: Record<string, CorridorStationGeo> = {
  ...CORRIDOR_STATION_GEOS,
  // Northern Railway & NCR
  NDLS: { code: 'NDLS', name: 'New Delhi', km: 0.0, lat: 28.6143, lng: 77.2185, yardStartKm: 0.0, yardEndKm: 3.5, platforms: 16, tracks: ['Platform Line 1-16', 'Up Main', 'Down Main'] },
  DLI: { code: 'DLI', name: 'Old Delhi Junction', km: 4.2, lat: 28.6610, lng: 77.2307, yardStartKm: 2.5, yardEndKm: 6.0, platforms: 16, tracks: ['Platform Line 1-16'] },
  NZM: { code: 'NZM', name: 'Hazrat Nizamuddin', km: 7.0, lat: 28.5888, lng: 77.2534, yardStartKm: 5.0, yardEndKm: 9.0, platforms: 9, tracks: ['Platform Line 1-9', 'Up Main', 'Down Main'] },
  ANVT: { code: 'ANVT', name: 'Anand Vihar Terminal', km: 12.0, lat: 28.6506, lng: 77.3153, yardStartKm: 10.0, yardEndKm: 14.0, platforms: 7, tracks: ['Platform Line 1-7'] },
  GZB: { code: 'GZB', name: 'Ghaziabad Junction', km: 25.0, lat: 28.6678, lng: 77.4379, yardStartKm: 23.0, yardEndKm: 27.0, platforms: 6, tracks: ['Main Line', 'Yard Line'] },
  MTJ: { code: 'MTJ', name: 'Mathura Junction', km: 141.0, lat: 27.4924, lng: 77.6737, yardStartKm: 139.0, yardEndKm: 143.0, platforms: 10, tracks: ['Main Line', 'Yard Line'] },
  AGC: { code: 'AGC', name: 'Agra Cantt', km: 195.0, lat: 27.1591, lng: 77.9944, yardStartKm: 193.0, yardEndKm: 197.0, platforms: 6, tracks: ['Main Line'] },
  GWL: { code: 'GWL', name: 'Gwalior Junction', km: 313.0, lat: 26.2183, lng: 78.1828, yardStartKm: 310.0, yardEndKm: 315.0, platforms: 5, tracks: ['Main Line'] },
  VGLJ: { code: 'VGLJ', name: 'Virangana Lakshmibai Jhansi', km: 410.0, lat: 25.4484, lng: 78.5685, yardStartKm: 407.0, yardEndKm: 413.0, platforms: 8, tracks: ['Main Line', 'Yard Line'] },
  ALJN: { code: 'ALJN', name: 'Aligarh Junction', km: 126.0, lat: 27.8974, lng: 78.0880, yardStartKm: 124.0, yardEndKm: 128.0, platforms: 7, tracks: ['Main Line'] },
  CNB: { code: 'CNB', name: 'Kanpur Central', km: 435.0, lat: 26.4547, lng: 80.3507, yardStartKm: 432.0, yardEndKm: 438.0, platforms: 10, tracks: ['Main Line', 'Yard Line'] },
  LKO: { code: 'LKO', name: 'Lucknow Charbagh', km: 512.0, lat: 26.8322, lng: 80.9230, yardStartKm: 509.0, yardEndKm: 515.0, platforms: 9, tracks: ['Main Line'] },
  PRYJ: { code: 'PRYJ', name: 'Prayagraj Junction', km: 627.0, lat: 25.4484, lng: 81.8340, yardStartKm: 624.0, yardEndKm: 630.0, platforms: 10, tracks: ['Main Line', 'Yard Line'] },
  DDU: { code: 'DDU', name: 'Pt. Deen Dayal Upadhyaya Junction', km: 780.0, lat: 25.2787, lng: 83.1207, yardStartKm: 776.0, yardEndKm: 785.0, platforms: 8, tracks: ['Main Line', 'Marshalling Yard'] },
  BSB: { code: 'BSB', name: 'Varanasi Junction', km: 765.0, lat: 25.3267, lng: 82.9860, yardStartKm: 762.0, yardEndKm: 768.0, platforms: 9, tracks: ['Main Line'] },
  GKP: { code: 'GKP', name: 'Gorakhpur Junction', km: 810.0, lat: 26.7638, lng: 83.3814, yardStartKm: 807.0, yardEndKm: 813.0, platforms: 10, tracks: ['World Longest Platform Line'] },
  UMB: { code: 'UMB', name: 'Ambala Cantt Junction', km: 198.0, lat: 30.3609, lng: 76.7766, yardStartKm: 195.0, yardEndKm: 201.0, platforms: 8, tracks: ['Main Line'] },
  LDH: { code: 'LDH', name: 'Ludhiana Junction', km: 312.0, lat: 30.9010, lng: 75.8573, yardStartKm: 309.0, yardEndKm: 315.0, platforms: 7, tracks: ['Main Line'] },
  JUC: { code: 'JUC', name: 'Jalandhar City', km: 368.0, lat: 31.3260, lng: 75.5762, yardStartKm: 365.0, yardEndKm: 371.0, platforms: 5, tracks: ['Main Line'] },
  ASR: { code: 'ASR', name: 'Amritsar Junction', km: 448.0, lat: 31.6340, lng: 74.8723, yardStartKm: 445.0, yardEndKm: 451.0, platforms: 6, tracks: ['Main Line'] },
  JAT: { code: 'JAT', name: 'Jammu Tawi', km: 580.0, lat: 32.7060, lng: 74.8797, yardStartKm: 577.0, yardEndKm: 583.0, platforms: 4, tracks: ['Main Line'] },
  SVDK: { code: 'SVDK', name: 'Shri Mata Vaishno Devi Katra', km: 655.0, lat: 32.9902, lng: 74.9318, yardStartKm: 652.0, yardEndKm: 658.0, platforms: 5, tracks: ['Main Line'] },

  // Western & North Western Railway
  KOTA: { code: 'KOTA', name: 'Kota Junction', km: 466.0, lat: 25.2138, lng: 75.8648, yardStartKm: 463.0, yardEndKm: 470.0, platforms: 6, tracks: ['Main Line', 'Yard Line'] },
  RTM: { code: 'RTM', name: 'Ratlam Junction', km: 730.0, lat: 23.3340, lng: 75.0375, yardStartKm: 726.0, yardEndKm: 734.0, platforms: 7, tracks: ['Main Line', 'Yard Line'] },
  BRC: { code: 'BRC', name: 'Vadodara Junction', km: 991.0, lat: 22.3107, lng: 73.1812, yardStartKm: 987.0, yardEndKm: 995.0, platforms: 7, tracks: ['Main Line', 'Yard Line'] },
  ST: { code: 'ST', name: 'Surat', km: 1120.0, lat: 21.2050, lng: 72.8407, yardStartKm: 1117.0, yardEndKm: 1123.0, platforms: 4, tracks: ['Main Line'] },
  BVI: { code: 'BVI', name: 'Borivali', km: 1353.0, lat: 19.2291, lng: 72.8573, yardStartKm: 1350.0, yardEndKm: 1355.0, platforms: 10, tracks: ['Suburban Main Line'] },
  MMCT: { code: 'MMCT', name: 'Mumbai Central', km: 1384.0, lat: 18.9696, lng: 72.8193, yardStartKm: 1381.0, yardEndKm: 1387.0, platforms: 9, tracks: ['Terminal Line'] },
  BCT: { code: 'BCT', name: 'Mumbai Central (BCT)', km: 1384.0, lat: 18.9696, lng: 72.8193, yardStartKm: 1381.0, yardEndKm: 1387.0, platforms: 9, tracks: ['Terminal Line'] },
  BDTS: { code: 'BDTS', name: 'Bandra Terminus', km: 1368.0, lat: 19.0620, lng: 72.8420, yardStartKm: 1365.0, yardEndKm: 1371.0, platforms: 7, tracks: ['Terminal Line'] },
  ADI: { code: 'ADI', name: 'Ahmedabad Junction', km: 1080.0, lat: 23.0225, lng: 72.5714, yardStartKm: 1076.0, yardEndKm: 1084.0, platforms: 12, tracks: ['Main Line', 'Yard Line'] },
  RJT: { code: 'RJT', name: 'Rajkot Junction', km: 1320.0, lat: 22.3082, lng: 70.8022, yardStartKm: 1317.0, yardEndKm: 1323.0, platforms: 5, tracks: ['Main Line'] },
  JP: { code: 'JP', name: 'Jaipur Junction', km: 308.0, lat: 26.9196, lng: 75.7878, yardStartKm: 305.0, yardEndKm: 312.0, platforms: 8, tracks: ['Main Line', 'Yard Line'] },
  AII: { code: 'AII', name: 'Ajmer Junction', km: 443.0, lat: 26.4499, lng: 74.6399, yardStartKm: 440.0, yardEndKm: 446.0, platforms: 5, tracks: ['Main Line'] },
  ABR: { code: 'ABR', name: 'Abu Road', km: 708.0, lat: 24.4820, lng: 72.7806, yardStartKm: 705.0, yardEndKm: 711.0, platforms: 3, tracks: ['Main Line'] },
  JU: { code: 'JU', name: 'Jodhpur Junction', km: 620.0, lat: 26.2847, lng: 73.0243, yardStartKm: 617.0, yardEndKm: 623.0, platforms: 5, tracks: ['Main Line'] },

  // Central & West Central Railway
  BPL: { code: 'BPL', name: 'Bhopal Junction', km: 702.0, lat: 23.2599, lng: 77.4126, yardStartKm: 699.0, yardEndKm: 706.0, platforms: 6, tracks: ['Main Line', 'Yard Line'] },
  RKMP: { code: 'RKMP', name: 'Rani Kamalapati', km: 708.0, lat: 23.2080, lng: 77.4380, yardStartKm: 706.0, yardEndKm: 711.0, platforms: 5, tracks: ['Terminal Line'] },
  ET: { code: 'ET', name: 'Itarsi Junction', km: 794.0, lat: 22.6122, lng: 77.7618, yardStartKm: 790.0, yardEndKm: 799.0, platforms: 8, tracks: ['Grand Trunk Junction Line', 'Yard Line'] },
  JBP: { code: 'JBP', name: 'Jabalpur Junction', km: 915.0, lat: 23.1686, lng: 79.9339, yardStartKm: 911.0, yardEndKm: 918.0, platforms: 6, tracks: ['Main Line'] },
  NGP: { code: 'NGP', name: 'Nagpur Junction', km: 1092.0, lat: 21.1528, lng: 79.0882, yardStartKm: 1088.0, yardEndKm: 1096.0, platforms: 8, tracks: ['Diamond Crossing Line', 'Yard Line'] },
  BSL: { code: 'BSL', name: 'Bhusaval Junction', km: 444.0, lat: 21.0455, lng: 75.7885, yardStartKm: 440.0, yardEndKm: 448.0, platforms: 8, tracks: ['Main Line', 'Electric Loco Shed'] },
  NK: { code: 'NK', name: 'Nashik Road', km: 187.0, lat: 19.9536, lng: 73.8294, yardStartKm: 184.0, yardEndKm: 190.0, platforms: 4, tracks: ['Main Line'] },
  KYN: { code: 'KYN', name: 'Kalyan Junction', km: 54.0, lat: 19.2355, lng: 73.1296, yardStartKm: 51.0, yardEndKm: 58.0, platforms: 8, tracks: ['Suburban / Main Line'] },
  CSMT: { code: 'CSMT', name: 'Chhatrapati Shivaji Maharaj Terminus', km: 0.0, lat: 18.9400, lng: 72.8353, yardStartKm: 0.0, yardEndKm: 3.0, platforms: 18, tracks: ['Terminal Line 1-18'] },
  PUNE: { code: 'PUNE', name: 'Pune Junction', km: 192.0, lat: 18.5284, lng: 73.8739, yardStartKm: 189.0, yardEndKm: 196.0, platforms: 6, tracks: ['Main Line', 'Yard Line'] },
  SUR: { code: 'SUR', name: 'Solapur', km: 455.0, lat: 17.6599, lng: 75.9064, yardStartKm: 452.0, yardEndKm: 458.0, platforms: 5, tracks: ['Main Line'] },
  BPQ: { code: 'BPQ', name: 'Balharshah Junction', km: 1250.0, lat: 19.8540, lng: 79.3510, yardStartKm: 1246.0, yardEndKm: 1254.0, platforms: 5, tracks: ['Main Line'] },

  // Eastern & South Eastern Railway
  HWH: { code: 'HWH', name: 'Howrah Junction', km: 0.0, lat: 22.5839, lng: 88.3426, yardStartKm: 0.0, yardEndKm: 4.0, platforms: 23, tracks: ['Mega Terminal Line 1-23'] },
  SDAH: { code: 'SDAH', name: 'Sealdah', km: 3.5, lat: 22.5670, lng: 88.3710, yardStartKm: 1.0, yardEndKm: 5.0, platforms: 21, tracks: ['Suburban & Mail Lines'] },
  BWN: { code: 'BWN', name: 'Barddhaman Junction', km: 106.0, lat: 23.2324, lng: 87.8615, yardStartKm: 103.0, yardEndKm: 109.0, platforms: 8, tracks: ['Main Line'] },
  ASN: { code: 'ASN', name: 'Asansol Junction', km: 212.0, lat: 23.6889, lng: 86.9661, yardStartKm: 208.0, yardEndKm: 215.0, platforms: 7, tracks: ['Main Line', 'Yard Line'] },
  DHN: { code: 'DHN', name: 'Dhanbad Junction', km: 259.0, lat: 23.7957, lng: 86.4304, yardStartKm: 255.0, yardEndKm: 263.0, platforms: 8, tracks: ['Grand Chord Line', 'Coal Yard'] },
  GAYA: { code: 'GAYA', name: 'Gaya Junction', km: 458.0, lat: 24.7955, lng: 84.9994, yardStartKm: 454.0, yardEndKm: 462.0, platforms: 9, tracks: ['Grand Chord Line'] },
  PNBE: { code: 'PNBE', name: 'Patna Junction', km: 546.0, lat: 25.6022, lng: 85.1376, yardStartKm: 542.0, yardEndKm: 550.0, platforms: 10, tracks: ['Main Line'] },
  KGP: { code: 'KGP', name: 'Kharagpur Junction', km: 115.0, lat: 22.3392, lng: 87.3247, yardStartKm: 111.0, yardEndKm: 119.0, platforms: 12, tracks: ['Main Line'] },
  TATA: { code: 'TATA', name: 'Tatanagar Junction', km: 250.0, lat: 22.7663, lng: 86.2029, yardStartKm: 246.0, yardEndKm: 254.0, platforms: 5, tracks: ['Main Line'] },
  ROU: { code: 'ROU', name: 'Rourkela Junction', km: 413.0, lat: 22.2268, lng: 84.8546, yardStartKm: 409.0, yardEndKm: 417.0, platforms: 5, tracks: ['Main Line'] },
  BSP: { code: 'BSP', name: 'Bilaspur Junction', km: 719.0, lat: 22.0797, lng: 82.1409, yardStartKm: 715.0, yardEndKm: 723.0, platforms: 8, tracks: ['Main Line'] },
  R: { code: 'R', name: 'Raipur Junction', km: 830.0, lat: 21.2514, lng: 81.6296, yardStartKm: 826.0, yardEndKm: 834.0, platforms: 7, tracks: ['Main Line'] },
  BBS: { code: 'BBS', name: 'Bhubaneswar', km: 437.0, lat: 20.2644, lng: 85.8436, yardStartKm: 434.0, yardEndKm: 441.0, platforms: 6, tracks: ['East Coast Main Line'] },
  CTC: { code: 'CTC', name: 'Cuttack Junction', km: 409.0, lat: 20.4625, lng: 85.8830, yardStartKm: 406.0, yardEndKm: 412.0, platforms: 5, tracks: ['Main Line'] },
  VSKP: { code: 'VSKP', name: 'Visakhapatnam Junction', km: 880.0, lat: 17.7215, lng: 83.2906, yardStartKm: 876.0, yardEndKm: 884.0, platforms: 8, tracks: ['Port Terminal Line'] },

  // Southern & South Western Railway
  MAS: { code: 'MAS', name: 'MGR Chennai Central', km: 0.0, lat: 13.0827, lng: 80.2755, yardStartKm: 0.0, yardEndKm: 3.5, platforms: 17, tracks: ['Southern Terminal Line 1-17'] },
  MS: { code: 'MS', name: 'Chennai Egmore', km: 2.8, lat: 13.0784, lng: 80.2612, yardStartKm: 1.0, yardEndKm: 4.5, platforms: 11, tracks: ['Southbound Main Line'] },
  KPD: { code: 'KPD', name: 'Katpadi Junction', km: 130.0, lat: 12.9698, lng: 79.1350, yardStartKm: 127.0, yardEndKm: 133.0, platforms: 5, tracks: ['Main Line'] },
  JTJ: { code: 'JTJ', name: 'Jolarpettai Junction', km: 214.0, lat: 12.5590, lng: 78.5770, yardStartKm: 211.0, yardEndKm: 218.0, platforms: 5, tracks: ['Triangular Junction Line'] },
  SA: { code: 'SA', name: 'Salem Junction', km: 334.0, lat: 11.6643, lng: 78.1460, yardStartKm: 331.0, yardEndKm: 338.0, platforms: 6, tracks: ['Main Line'] },
  ED: { code: 'ED', name: 'Erode Junction', km: 394.0, lat: 11.3410, lng: 77.7172, yardStartKm: 390.0, yardEndKm: 398.0, platforms: 5, tracks: ['Loco Shed Line'] },
  CBE: { code: 'CBE', name: 'Coimbatore Junction', km: 495.0, lat: 11.0168, lng: 76.9558, yardStartKm: 491.0, yardEndKm: 499.0, platforms: 6, tracks: ['Main Line'] },
  PGT: { code: 'PGT', name: 'Palakkad Junction', km: 550.0, lat: 10.7867, lng: 76.6548, yardStartKm: 546.0, yardEndKm: 554.0, platforms: 5, tracks: ['Palghat Gap Line'] },
  TCR: { code: 'TCR', name: 'Thrissur', km: 625.0, lat: 10.5276, lng: 76.2144, yardStartKm: 622.0, yardEndKm: 628.0, platforms: 4, tracks: ['Main Line'] },
  ERS: { code: 'ERS', name: 'Ernakulam Junction', km: 698.0, lat: 9.9816, lng: 76.2999, yardStartKm: 694.0, yardEndKm: 702.0, platforms: 6, tracks: ['Coastal Terminal Line'] },
  TVC: { code: 'TVC', name: 'Thiruvananthapuram Central', km: 904.0, lat: 8.4875, lng: 76.9525, yardStartKm: 900.0, yardEndKm: 908.0, platforms: 5, tracks: ['Terminal Line'] },
  CAPE: { code: 'CAPE', name: 'Kanniyakumari', km: 991.0, lat: 8.0883, lng: 77.5385, yardStartKm: 988.0, yardEndKm: 994.0, platforms: 4, tracks: ['Southernmost Mainland Terminal'] },
  SBC: { code: 'SBC', name: 'KSR Bengaluru City', km: 358.0, lat: 12.9781, lng: 77.5696, yardStartKm: 354.0, yardEndKm: 362.0, platforms: 10, tracks: ['Tech Capital Terminal'] },
  YPR: { code: 'YPR', name: 'Yesvantpur Junction', km: 364.0, lat: 13.0238, lng: 77.5503, yardStartKm: 360.0, yardEndKm: 368.0, platforms: 6, tracks: ['Main Line'] },
  MYS: { code: 'MYS', name: 'Mysuru Junction', km: 497.0, lat: 12.3160, lng: 76.6496, yardStartKm: 493.0, yardEndKm: 501.0, platforms: 6, tracks: ['Heritage Terminal Line'] },
  UBL: { code: 'UBL', name: 'SSS Hubballi Junction', km: 828.0, lat: 15.3468, lng: 75.1479, yardStartKm: 824.0, yardEndKm: 832.0, platforms: 8, tracks: ['Main Line'] },
  GTL: { code: 'GTL', name: 'Guntakal Junction', km: 684.0, lat: 15.1673, lng: 77.3688, yardStartKm: 680.0, yardEndKm: 688.0, platforms: 7, tracks: ['Deccan Hub Line'] },
  RU: { code: 'RU', name: 'Renigunta Junction', km: 135.0, lat: 13.6373, lng: 79.5160, yardStartKm: 132.0, yardEndKm: 138.0, platforms: 5, tracks: ['Main Line'] },
  TPTY: { code: 'TPTY', name: 'Tirupati', km: 145.0, lat: 13.6288, lng: 79.4192, yardStartKm: 142.0, yardEndKm: 148.0, platforms: 6, tracks: ['Pilgrim Terminal Line'] },

  // Northeast Frontier Railway
  MLDT: { code: 'MLDT', name: 'Malda Town', km: 340.0, lat: 25.0108, lng: 88.1411, yardStartKm: 337.0, yardEndKm: 343.0, platforms: 7, tracks: ['Northeast Gateway Line'] },
  NJP: { code: 'NJP', name: 'New Jalpaiguri Junction', km: 569.0, lat: 26.6853, lng: 88.4418, yardStartKm: 565.0, yardEndKm: 573.0, platforms: 8, tracks: ['Siliguri Junction Line'] },
  NBQ: { code: 'NBQ', name: 'New Bongaigaon Junction', km: 824.0, lat: 26.5056, lng: 90.5471, yardStartKm: 820.0, yardEndKm: 828.0, platforms: 6, tracks: ['Assam Entry Line'] },
  GHY: { code: 'GHY', name: 'Guwahati', km: 1005.0, lat: 26.1862, lng: 91.7540, yardStartKm: 1001.0, yardEndKm: 1009.0, platforms: 7, tracks: ['Northeast Zonal Terminal'] },
  DBRG: { code: 'DBRG', name: 'Dibrugarh', km: 1545.0, lat: 27.4728, lng: 94.9120, yardStartKm: 1540.0, yardEndKm: 1549.0, platforms: 4, tracks: ['Eastern Broad Gauge Terminal'] },

  // Konkan Railway
  ROHA: { code: 'ROHA', name: 'Roha', km: 144.0, lat: 18.4357, lng: 73.1172, yardStartKm: 142.0, yardEndKm: 147.0, platforms: 3, tracks: ['Konkan Entry Line'] },
  RN: { code: 'RN', name: 'Ratnagiri', km: 348.0, lat: 16.9902, lng: 73.3120, yardStartKm: 345.0, yardEndKm: 351.0, platforms: 3, tracks: ['Konkan Main Line'] },
  MAO: { code: 'MAO', name: 'Madgaon Junction', km: 580.0, lat: 15.2736, lng: 73.9780, yardStartKm: 576.0, yardEndKm: 584.0, platforms: 4, tracks: ['Goa Central Line'] },
  MAQ: { code: 'MAQ', name: 'Mangaluru Central', km: 894.0, lat: 12.8698, lng: 74.8430, yardStartKm: 890.0, yardEndKm: 898.0, platforms: 5, tracks: ['Coastal Terminal Line'] }
};

// Ground-truth polyline for BZA -> KCC -> MAG -> NBR -> GNT -> VJA -> TEL (UP Main)
// Follows actual Krishna river bridge curve, Amaravati expressway bypass curvature, and GNT curve
const BZA_TEL_UP_COORDS: GeoPoint[] = [
  { lat: 16.5193, lng: 80.6231, km: 0.0, name: 'BZA Station' },
  { lat: 16.5110, lng: 80.6175, km: 1.2, name: 'BZA South Yard' },
  { lat: 16.5020, lng: 80.6120, km: 2.7, name: 'Krishna River North Bank' },
  { lat: 16.4940, lng: 80.6065, km: 3.9, name: 'Krishna River Rail Bridge' },
  { lat: 16.4850, lng: 80.6010, km: 5.2, name: 'KCC Station' },
  { lat: 16.4710, lng: 80.5920, km: 7.3 },
  { lat: 16.4550, lng: 80.5810, km: 9.8, name: 'Kolanukonda Curve' },
  { lat: 16.4420, lng: 80.5710, km: 11.4 },
  { lat: 16.4350, lng: 80.5650, km: 12.5, name: 'MAG Station' },
  { lat: 16.4210, lng: 80.5540, km: 14.8, name: 'Atkur Approach' },
  { lat: 16.3980, lng: 80.5390, km: 19.2 },
  { lat: 16.3750, lng: 80.5260, km: 26.5, name: 'Pedakakani Curve' },
  { lat: 16.3450, lng: 80.5120, km: 36.8, name: 'NBR Station' },
  { lat: 16.3250, lng: 80.4850, km: 42.0, name: 'Reddigudem Cutting' },
  { lat: 16.3110, lng: 80.4610, km: 46.5, name: 'GNT East Outer' },
  { lat: 16.2990, lng: 80.4430, km: 50.0, name: 'GNT Station' },
  { lat: 16.2870, lng: 80.4720, km: 54.0, name: 'GNT South Cabin' },
  { lat: 16.2760, lng: 80.5100, km: 58.5, name: 'Chebrolu Road Crossing' },
  { lat: 16.2620, lng: 80.5510, km: 63.4, name: 'VJA Station' },
  { lat: 16.2540, lng: 80.5890, km: 68.2, name: 'Chinaravuru Curve' },
  { lat: 16.2480, lng: 80.6210, km: 73.5, name: 'TEL West Outer' },
  { lat: 16.2430, lng: 80.6480, km: 78.5, name: 'TEL Station' }
];

// Generate DOWN Main with realistic parallel track lateral offset (~18m north/east)
const OFFSET_LAT = 0.00016;
const OFFSET_LNG = 0.00016;

const BZA_TEL_DN_COORDS: GeoPoint[] = BZA_TEL_UP_COORDS.map(pt => ({
  lat: Number((pt.lat + OFFSET_LAT).toFixed(6)),
  lng: Number((pt.lng + OFFSET_LNG).toFixed(6)),
  km: pt.km,
  name: pt.name ? `${pt.name} (DN)` : undefined
})).reverse();

// Mangalagiri Loop Line (KM 10.5 to KM 15.2, offset by ~45m south)
const MAG_LOOP_COORDS: GeoPoint[] = [
  { lat: 16.4480, lng: 80.5750, km: 10.5, name: 'MAG North Turnout' },
  { lat: 16.4410, lng: 80.5690, km: 11.6 },
  { lat: 16.4340, lng: 80.5630, km: 12.5, name: 'MAG Platform 2 Loop' },
  { lat: 16.4270, lng: 80.5580, km: 13.8 },
  { lat: 16.4180, lng: 80.5510, km: 15.2, name: 'MAG South Turnout' }
];

// Krishna Canal Goods Siding (KM 4.5 to KM 6.2)
const KCC_SIDING_COORDS: GeoPoint[] = [
  { lat: 16.4880, lng: 80.6035, km: 4.8, name: 'KCC Siding North Entry' },
  { lat: 16.4840, lng: 80.6000, km: 5.5, name: 'KCC Freight Depot Siding' },
  { lat: 16.4810, lng: 80.5975, km: 6.2, name: 'KCC Siding South Trailing' }
];

// Tenali - Krishna Canal direct trunk chord line (direct triangular leg)
const TEL_KCC_CHORD_COORDS: GeoPoint[] = [
  { lat: 16.2430, lng: 80.6480, km: 78.5, name: 'TEL Station North Junction' },
  { lat: 16.3200, lng: 80.6380, km: 89.0, name: 'Duggirala Chord' },
  { lat: 16.4100, lng: 80.6220, km: 99.5, name: 'Pedavadlapudi Chord' },
  { lat: 16.4850, lng: 80.6010, km: 109.0, name: 'KCC Junction Triangle Apex' }
];

// Grand Trunk Main Line South: Tenali -> Nidubrolu -> Appikatla -> Bapatla -> Chirala -> Vetapalem -> Ongole -> Nellore -> Gudur
const GT_SOUTH_COORDS: GeoPoint[] = [
  { lat: 16.2430, lng: 80.6480, km: 384.0, name: 'TEL Station' },
  { lat: 16.1050, lng: 80.5920, km: 356.0, name: 'NDO Station' },
  { lat: 15.9870, lng: 80.5280, km: 330.0, name: 'APL Station' },
  { lat: 15.9040, lng: 80.4670, km: 320.5, name: 'BPP Station' },
  { lat: 15.8240, lng: 80.3520, km: 334.2, name: 'CLX Station' },
  { lat: 15.7790, lng: 80.3160, km: 342.0, name: 'VTM Station' },
  { lat: 15.5050, lng: 80.0490, km: 380.0, name: 'OGL Station' },
  { lat: 14.4426, lng: 79.9865, km: 480.0, name: 'NLR Station' },
  { lat: 14.1463, lng: 79.8504, km: 518.0, name: 'GDR Station' }
];

// Vijayawada – Kazipet – Secunderabad Trunk Line: BZA -> Madhira -> Khammam -> Warangal -> Kazipet -> Secunderabad
const SC_CORRIDOR_COORDS: GeoPoint[] = [
  { lat: 16.5193, lng: 80.6231, km: 0.0, name: 'BZA Station' },
  { lat: 16.9200, lng: 80.3700, km: 54.0, name: 'MDR Station' },
  { lat: 17.2473, lng: 80.1514, km: 105.0, name: 'KMT Station' },
  { lat: 17.9689, lng: 79.5941, km: 205.0, name: 'WL Station' },
  { lat: 17.9780, lng: 79.5210, km: 215.0, name: 'KZJ Station' },
  { lat: 17.4339, lng: 78.5045, km: 350.0, name: 'SC Station' }
];

export const CORRIDOR_TRACKS: TrackPolyline[] = [
  {
    id: 'TRK-UP-MAIN',
    name: 'UP Main Line (BZA → GNT → TEL)',
    type: 'UP Main',
    direction: 'UP',
    startKm: 0.0,
    endKm: 78.5,
    speedLimitKmph: 130,
    coordinates: BZA_TEL_UP_COORDS
  },
  {
    id: 'TRK-DN-MAIN',
    name: 'DOWN Main Line (TEL → GNT → BZA)',
    type: 'DOWN Main',
    direction: 'DN',
    startKm: 78.5,
    endKm: 0.0,
    speedLimitKmph: 130,
    coordinates: BZA_TEL_DN_COORDS
  },
  {
    id: 'TRK-MAG-LOOP',
    name: 'Mangalagiri Station Common Loop',
    type: 'Loop Line',
    direction: 'BOTH',
    startKm: 10.5,
    endKm: 15.2,
    speedLimitKmph: 50,
    coordinates: MAG_LOOP_COORDS
  },
  {
    id: 'TRK-KCC-SIDING',
    name: 'KCC Freight Goods Siding',
    type: 'Goods Siding',
    direction: 'BOTH',
    startKm: 4.8,
    endKm: 6.2,
    speedLimitKmph: 30,
    coordinates: KCC_SIDING_COORDS
  },
  {
    id: 'TRK-TEL-KCC-CHORD',
    name: 'Tenali – Krishna Canal Direct Trunk Chord',
    type: 'Chord Line',
    direction: 'BOTH',
    startKm: 78.5,
    endKm: 109.0,
    speedLimitKmph: 110,
    coordinates: TEL_KCC_CHORD_COORDS
  },
  {
    id: 'TRK-GT-SOUTH',
    name: 'Grand Trunk South Main Line (TEL → BPP → CLX → GDR)',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 320.0,
    endKm: 518.0,
    speedLimitKmph: 130,
    coordinates: GT_SOUTH_COORDS
  },
  {
    id: 'TRK-SC-NORTH',
    name: 'Vijayawada – Kazipet – Secunderabad Trunk Line',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 350.0,
    speedLimitKmph: 130,
    coordinates: SC_CORRIDOR_COORDS
  }
];

/**
 * High-density National Railway Trunk Lines covering all zones of Indian Railways.
 * Enables India-wide live train map-matching and digital twin visualization.
 */
export const NATIONAL_RAILWAY_TRACKS: TrackPolyline[] = [
  {
    id: 'TRK-NAT-DEL-MUM',
    name: 'Delhi – Mumbai Central Trunk Corridor (WR)',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 1384.0,
    speedLimitKmph: 130,
    coordinates: [
      { lat: 28.6143, lng: 77.2185, km: 0.0, name: 'NDLS (New Delhi)' },
      { lat: 27.4924, lng: 77.6737, km: 141.0, name: 'MTJ (Mathura)' },
      { lat: 25.2138, lng: 75.8648, km: 466.0, name: 'KOTA (Kota)' },
      { lat: 23.3340, lng: 75.0375, km: 730.0, name: 'RTM (Ratlam)' },
      { lat: 22.3107, lng: 73.1812, km: 991.0, name: 'BRC (Vadodara)' },
      { lat: 21.2050, lng: 72.8407, km: 1120.0, name: 'ST (Surat)' },
      { lat: 19.2291, lng: 72.8573, km: 1353.0, name: 'BVI (Borivali)' },
      { lat: 18.9696, lng: 72.8193, km: 1384.0, name: 'MMCT (Mumbai Central)' }
    ]
  },
  {
    id: 'TRK-NAT-DEL-HWH',
    name: 'Delhi – Howrah Grand Trunk Corridor (NCR/ECR/ER)',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 1445.0,
    speedLimitKmph: 130,
    coordinates: [
      { lat: 28.6143, lng: 77.2185, km: 0.0, name: 'NDLS (New Delhi)' },
      { lat: 27.8974, lng: 78.0880, km: 126.0, name: 'ALJN (Aligarh)' },
      { lat: 26.4547, lng: 80.3507, km: 435.0, name: 'CNB (Kanpur Central)' },
      { lat: 25.4484, lng: 81.8340, km: 627.0, name: 'PRYJ (Prayagraj)' },
      { lat: 25.2787, lng: 83.1207, km: 780.0, name: 'DDU (Pt Deen Dayal Upadhyaya)' },
      { lat: 24.7955, lng: 84.9994, km: 998.0, name: 'GAYA (Gaya)' },
      { lat: 23.7957, lng: 86.4304, km: 1198.0, name: 'DHN (Dhanbad)' },
      { lat: 23.6889, lng: 86.9661, km: 1245.0, name: 'ASN (Asansol)' },
      { lat: 23.2324, lng: 87.8615, km: 1351.0, name: 'BWN (Barddhaman)' },
      { lat: 22.5839, lng: 88.3426, km: 1445.0, name: 'HWH (Howrah)' }
    ]
  },
  {
    id: 'TRK-NAT-DEL-MAS',
    name: 'Grand Trunk Express Corridor (Delhi – Nagpur – Vijayawada – Chennai)',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 2182.0,
    speedLimitKmph: 130,
    coordinates: [
      { lat: 28.6143, lng: 77.2185, km: 0.0, name: 'NDLS (New Delhi)' },
      { lat: 27.1591, lng: 77.9944, km: 195.0, name: 'AGC (Agra Cantt)' },
      { lat: 26.2183, lng: 78.1828, km: 313.0, name: 'GWL (Gwalior)' },
      { lat: 25.4484, lng: 78.5685, km: 410.0, name: 'VGLJ (Jhansi)' },
      { lat: 23.2599, lng: 77.4126, km: 702.0, name: 'BPL (Bhopal)' },
      { lat: 22.6122, lng: 77.7618, km: 794.0, name: 'ET (Itarsi)' },
      { lat: 21.1528, lng: 79.0882, km: 1092.0, name: 'NGP (Nagpur)' },
      { lat: 19.8540, lng: 79.3510, km: 1250.0, name: 'BPQ (Balharshah)' },
      { lat: 17.9689, lng: 79.5941, km: 1455.0, name: 'WL (Warangal)' },
      { lat: 16.5193, lng: 80.6231, km: 1750.0, name: 'BZA (Vijayawada)' },
      { lat: 14.1463, lng: 79.8504, km: 2045.0, name: 'GDR (Gudur)' },
      { lat: 13.0827, lng: 80.2755, km: 2182.0, name: 'MAS (Chennai Central)' }
    ]
  },
  {
    id: 'TRK-NAT-MUM-HWH',
    name: 'Mumbai – Nagpur – Howrah Trans-India Trunk Corridor',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 1968.0,
    speedLimitKmph: 130,
    coordinates: [
      { lat: 18.9400, lng: 72.8353, km: 0.0, name: 'CSMT (Mumbai)' },
      { lat: 19.2355, lng: 73.1296, km: 54.0, name: 'KYN (Kalyan)' },
      { lat: 19.9536, lng: 73.8294, km: 187.0, name: 'NK (Nashik Road)' },
      { lat: 21.0455, lng: 75.7885, km: 444.0, name: 'BSL (Bhusaval)' },
      { lat: 21.1528, lng: 79.0882, km: 837.0, name: 'NGP (Nagpur)' },
      { lat: 21.2514, lng: 81.6296, km: 1118.0, name: 'R (Raipur)' },
      { lat: 22.0797, lng: 82.1409, km: 1229.0, name: 'BSP (Bilaspur)' },
      { lat: 22.2268, lng: 84.8546, km: 1535.0, name: 'ROU (Rourkela)' },
      { lat: 22.7663, lng: 86.2029, km: 1698.0, name: 'TATA (Tatanagar)' },
      { lat: 22.3392, lng: 87.3247, km: 1833.0, name: 'KGP (Kharagpur)' },
      { lat: 22.5839, lng: 88.3426, km: 1968.0, name: 'HWH (Howrah)' }
    ]
  },
  {
    id: 'TRK-NAT-MUM-MAS',
    name: 'Mumbai – Pune – Guntakal – Chennai Trunk Corridor',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 1284.0,
    speedLimitKmph: 130,
    coordinates: [
      { lat: 18.9400, lng: 72.8353, km: 0.0, name: 'CSMT (Mumbai)' },
      { lat: 18.5284, lng: 73.8739, km: 192.0, name: 'PUNE (Pune)' },
      { lat: 17.6599, lng: 75.9064, km: 455.0, name: 'SUR (Solapur)' },
      { lat: 15.1673, lng: 77.3688, km: 808.0, name: 'GTL (Guntakal)' },
      { lat: 13.6373, lng: 79.5160, km: 1149.0, name: 'RU (Renigunta)' },
      { lat: 13.0827, lng: 80.2755, km: 1284.0, name: 'MAS (Chennai Central)' }
    ]
  },
  {
    id: 'TRK-NAT-HWH-MAS',
    name: 'Howrah – Visakhapatnam – Chennai East Coast Trunk',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 1662.0,
    speedLimitKmph: 130,
    coordinates: [
      { lat: 22.5839, lng: 88.3426, km: 0.0, name: 'HWH (Howrah)' },
      { lat: 22.3392, lng: 87.3247, km: 115.0, name: 'KGP (Kharagpur)' },
      { lat: 20.4625, lng: 85.8830, km: 409.0, name: 'CTC (Cuttack)' },
      { lat: 20.2644, lng: 85.8436, km: 437.0, name: 'BBS (Bhubaneswar)' },
      { lat: 17.7215, lng: 83.2906, km: 880.0, name: 'VSKP (Visakhapatnam)' },
      { lat: 16.5193, lng: 80.6231, km: 1230.0, name: 'BZA (Vijayawada)' },
      { lat: 15.5050, lng: 80.0490, km: 1368.0, name: 'OGL (Ongole)' },
      { lat: 14.4426, lng: 79.9865, km: 1485.0, name: 'NLR (Nellore)' },
      { lat: 14.1463, lng: 79.8504, km: 1524.0, name: 'GDR (Gudur)' },
      { lat: 13.0827, lng: 80.2755, km: 1662.0, name: 'MAS (Chennai Central)' }
    ]
  },
  {
    id: 'TRK-NAT-DEL-JAT',
    name: 'Delhi – Ambala – Jammu – Katra Trunk (NR)',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 655.0,
    speedLimitKmph: 130,
    coordinates: [
      { lat: 28.6143, lng: 77.2185, km: 0.0, name: 'NDLS (New Delhi)' },
      { lat: 30.3609, lng: 76.7766, km: 198.0, name: 'UMB (Ambala Cantt)' },
      { lat: 30.9010, lng: 75.8573, km: 312.0, name: 'LDH (Ludhiana)' },
      { lat: 31.3260, lng: 75.5762, km: 368.0, name: 'JUC (Jalandhar)' },
      { lat: 31.6340, lng: 74.8723, km: 448.0, name: 'ASR (Amritsar)' },
      { lat: 32.7060, lng: 74.8797, km: 580.0, name: 'JAT (Jammu Tawi)' },
      { lat: 32.9902, lng: 74.9318, km: 655.0, name: 'SVDK (Katra)' }
    ]
  },
  {
    id: 'TRK-NAT-HWH-GHY',
    name: 'Kolkata – Guwahati – Dibrugarh Northeast Trunk (ER/NFR)',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 1545.0,
    speedLimitKmph: 110,
    coordinates: [
      { lat: 22.5839, lng: 88.3426, km: 0.0, name: 'HWH (Howrah)' },
      { lat: 23.2324, lng: 87.8615, km: 106.0, name: 'BWN (Barddhaman)' },
      { lat: 25.0108, lng: 88.1411, km: 340.0, name: 'MLDT (Malda Town)' },
      { lat: 26.6853, lng: 88.4418, km: 569.0, name: 'NJP (New Jalpaiguri)' },
      { lat: 26.5056, lng: 90.5471, km: 824.0, name: 'NBQ (New Bongaigaon)' },
      { lat: 26.1862, lng: 91.7540, km: 1005.0, name: 'GHY (Guwahati)' },
      { lat: 27.4728, lng: 94.9120, km: 1545.0, name: 'DBRG (Dibrugarh)' }
    ]
  },
  {
    id: 'TRK-NAT-BLR-HYD',
    name: 'Bengaluru – Hyderabad – Balharshah Central Trunk',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 890.0,
    speedLimitKmph: 130,
    coordinates: [
      { lat: 12.9781, lng: 77.5696, km: 0.0, name: 'SBC (Bengaluru)' },
      { lat: 15.1673, lng: 77.3688, km: 326.0, name: 'GTL (Guntakal)' },
      { lat: 17.4339, lng: 78.5045, km: 625.0, name: 'SC (Secunderabad)' },
      { lat: 17.9780, lng: 79.5210, km: 757.0, name: 'KZJ (Kazipet)' },
      { lat: 19.8540, lng: 79.3510, km: 890.0, name: 'BPQ (Balharshah)' }
    ]
  },
  {
    id: 'TRK-NAT-MAS-BLR',
    name: 'Chennai – Bengaluru – Mysuru Trunk (SR/SWR)',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 497.0,
    speedLimitKmph: 130,
    coordinates: [
      { lat: 13.0827, lng: 80.2755, km: 0.0, name: 'MAS (Chennai)' },
      { lat: 12.9698, lng: 79.1350, km: 130.0, name: 'KPD (Katpadi)' },
      { lat: 12.5590, lng: 78.5770, km: 214.0, name: 'JTJ (Jolarpettai)' },
      { lat: 12.9781, lng: 77.5696, km: 358.0, name: 'SBC (Bengaluru)' },
      { lat: 12.3160, lng: 76.6496, km: 497.0, name: 'MYS (Mysuru)' }
    ]
  },
  {
    id: 'TRK-NAT-MAS-KER',
    name: 'Chennai – Coimbatore – Kerala Main Line (SR)',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 991.0,
    speedLimitKmph: 130,
    coordinates: [
      { lat: 13.0827, lng: 80.2755, km: 0.0, name: 'MAS (Chennai)' },
      { lat: 11.6643, lng: 78.1460, km: 334.0, name: 'SA (Salem)' },
      { lat: 11.3410, lng: 77.7172, km: 394.0, name: 'ED (Erode)' },
      { lat: 11.0168, lng: 76.9558, km: 495.0, name: 'CBE (Coimbatore)' },
      { lat: 10.7867, lng: 76.6548, km: 550.0, name: 'PGT (Palakkad)' },
      { lat: 10.5276, lng: 76.2144, km: 625.0, name: 'TCR (Thrissur)' },
      { lat: 9.9816, lng: 76.2999, km: 698.0, name: 'ERS (Ernakulam)' },
      { lat: 8.4875, lng: 76.9525, km: 904.0, name: 'TVC (Thiruvananthapuram)' },
      { lat: 8.0883, lng: 77.5385, km: 991.0, name: 'CAPE (Kanniyakumari)' }
    ]
  },
  {
    id: 'TRK-NAT-RAJ-ADI',
    name: 'Delhi – Jaipur – Ahmedabad Desert Corridor (NWR/WR)',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 991.0,
    speedLimitKmph: 130,
    coordinates: [
      { lat: 28.6143, lng: 77.2185, km: 0.0, name: 'NDLS (New Delhi)' },
      { lat: 26.9196, lng: 75.7878, km: 308.0, name: 'JP (Jaipur)' },
      { lat: 26.4499, lng: 74.6399, km: 443.0, name: 'AII (Ajmer)' },
      { lat: 24.4820, lng: 72.7806, km: 708.0, name: 'ABR (Abu Road)' },
      { lat: 23.0225, lng: 72.5714, km: 890.0, name: 'ADI (Ahmedabad)' },
      { lat: 22.3107, lng: 73.1812, km: 991.0, name: 'BRC (Vadodara)' }
    ]
  },
  {
    id: 'TRK-NAT-CEN-DIA',
    name: 'Central Trans-India Diagonal (Itarsi – Jabalpur – Prayagraj)',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 604.0,
    speedLimitKmph: 120,
    coordinates: [
      { lat: 22.6122, lng: 77.7618, km: 0.0, name: 'ET (Itarsi)' },
      { lat: 23.1686, lng: 79.9339, km: 245.0, name: 'JBP (Jabalpur)' },
      { lat: 25.4484, lng: 81.8340, km: 604.0, name: 'PRYJ (Prayagraj)' }
    ]
  },
  {
    id: 'TRK-NAT-KONKAN',
    name: 'Konkan Railway Coastal Corridor (KRCL)',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 750.0,
    speedLimitKmph: 120,
    coordinates: [
      { lat: 18.4357, lng: 73.1172, km: 0.0, name: 'ROHA (Roha)' },
      { lat: 16.9902, lng: 73.3120, km: 204.0, name: 'RN (Ratnagiri)' },
      { lat: 15.2736, lng: 73.9780, km: 436.0, name: 'MAO (Madgaon, Goa)' },
      { lat: 12.8698, lng: 74.8430, km: 750.0, name: 'MAQ (Mangaluru)' }
    ]
  },
  {
    id: 'TRK-NAT-BHR-NJP',
    name: 'Bihar – Northeast Link Corridor (ECR/NFR)',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 569.0,
    speedLimitKmph: 110,
    coordinates: [
      { lat: 25.2787, lng: 83.1207, km: 0.0, name: 'DDU (Pt Deen Dayal Upadhyaya)' },
      { lat: 25.6022, lng: 85.1376, km: 212.0, name: 'PNBE (Patna)' },
      { lat: 25.0108, lng: 88.1411, km: 430.0, name: 'MLDT (Malda Town)' },
      { lat: 26.6853, lng: 88.4418, km: 569.0, name: 'NJP (New Jalpaiguri)' }
    ]
  },
  {
    id: 'TRK-NAT-SWR-COR',
    name: 'Bengaluru – Hubballi – Pune Corridor (SWR/CR)',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 894.0,
    speedLimitKmph: 120,
    coordinates: [
      { lat: 12.9781, lng: 77.5696, km: 0.0, name: 'SBC (Bengaluru)' },
      { lat: 15.3468, lng: 75.1479, km: 470.0, name: 'UBL (Hubballi)' },
      { lat: 18.5284, lng: 73.8739, km: 894.0, name: 'PUNE (Pune)' }
    ]
  },
  {
    id: 'TRK-NAT-SC-BZA',
    name: 'Secunderabad – Kazipet – Vijayawada Main Line (SCR)',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 349.0,
    speedLimitKmph: 130,
    coordinates: [
      { lat: 17.4339, lng: 78.5045, km: 0.0, name: 'SC (Secunderabad)' },
      { lat: 17.7300, lng: 79.1600, km: 85.0, name: 'ZN (Jangaon)' },
      { lat: 17.9780, lng: 79.5210, km: 132.0, name: 'KZJ (Kazipet)' },
      { lat: 17.5000, lng: 80.1500, km: 240.0, name: 'KMT (Khammam)' },
      { lat: 16.5193, lng: 80.6231, km: 349.0, name: 'BZA (Vijayawada)' }
    ]
  },
  {
    id: 'TRK-NAT-ADI-MUM',
    name: 'Ahmedabad – Vadodara – Surat – Mumbai Western Trunk (WR)',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 492.0,
    speedLimitKmph: 130,
    coordinates: [
      { lat: 23.0225, lng: 72.5714, km: 0.0, name: 'ADI (Ahmedabad)' },
      { lat: 22.3107, lng: 73.1812, km: 100.0, name: 'BRC (Vadodara)' },
      { lat: 21.2052, lng: 72.8407, km: 230.0, name: 'ST (Surat)' },
      { lat: 20.3888, lng: 72.9106, km: 325.0, name: 'VAPI (Vapi)' },
      { lat: 19.8297, lng: 72.7508, km: 405.0, name: 'PLG (Palghar)' },
      { lat: 18.9696, lng: 72.8193, km: 492.0, name: 'BCT (Mumbai Central)' }
    ]
  },
  {
    id: 'TRK-NAT-GANGES',
    name: 'Lucknow – Kanpur – Prayagraj – Varanasi – Patna Ganges Trunk',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 625.0,
    speedLimitKmph: 130,
    coordinates: [
      { lat: 26.8467, lng: 80.9462, km: 0.0, name: 'LKO (Lucknow)' },
      { lat: 26.4547, lng: 80.3507, km: 74.0, name: 'CNB (Kanpur Central)' },
      { lat: 25.4484, lng: 81.8340, km: 268.0, name: 'PRYJ (Prayagraj)' },
      { lat: 25.3176, lng: 82.9739, km: 395.0, name: 'BSB (Varanasi)' },
      { lat: 25.2787, lng: 83.1207, km: 413.0, name: 'DDU (Pt Deen Dayal Upadhyaya)' },
      { lat: 25.6022, lng: 85.1376, km: 625.0, name: 'PNBE (Patna)' }
    ]
  },
  {
    id: 'TRK-NAT-MAS-TN',
    name: 'Chennai – Tiruchirappalli – Madurai – Kanniyakumari Deep South Trunk',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 735.0,
    speedLimitKmph: 130,
    coordinates: [
      { lat: 13.0827, lng: 80.2755, km: 0.0, name: 'MAS (Chennai)' },
      { lat: 11.9416, lng: 79.4861, km: 160.0, name: 'VM (Villupuram)' },
      { lat: 10.7905, lng: 78.7047, km: 338.0, name: 'TPJ (Tiruchirappalli)' },
      { lat: 9.9252, lng: 78.1198, km: 495.0, name: 'MDU (Madurai)' },
      { lat: 8.7139, lng: 77.7567, km: 650.0, name: 'TEN (Tirunelveli)' },
      { lat: 8.0883, lng: 77.5385, km: 735.0, name: 'CAPE (Kanniyakumari)' }
    ]
  },
  {
    id: 'TRK-NAT-NORTHEAST',
    name: 'New Jalpaiguri – New Bongaigaon – Guwahati – Dimapur Link (NFR)',
    type: 'UP Main',
    direction: 'BOTH',
    startKm: 0.0,
    endKm: 690.0,
    speedLimitKmph: 110,
    coordinates: [
      { lat: 26.6853, lng: 88.4418, km: 0.0, name: 'NJP (New Jalpaiguri)' },
      { lat: 26.5056, lng: 90.5471, km: 255.0, name: 'NBQ (New Bongaigaon)' },
      { lat: 26.1862, lng: 91.7540, km: 436.0, name: 'GHY (Guwahati)' },
      { lat: 25.9080, lng: 93.7270, km: 690.0, name: 'DMV (Dimapur)' }
    ]
  }
];

/** All Indian Railways tracks combining national trunk lines and high-resolution prototype corridor */
export const ALL_TRACKS: TrackPolyline[] = [...CORRIDOR_TRACKS, ...NATIONAL_RAILWAY_TRACKS];

// Corridor automatic block signals placed at ~1.5 - 2 km spacing
export const CORRIDOR_SIGNALS: CorridorSignalGeo[] = [
  { id: 'SIG-UP-01', name: 'S-101 (BZA Adv Starter)', km: 1.8, trackId: 'TRK-UP-MAIN', direction: 'UP', lat: 16.5080, lng: 80.6155, defaultAspect: 'GREEN' },
  { id: 'SIG-UP-03', name: 'S-103 (Krishna River Auto)', km: 3.5, trackId: 'TRK-UP-MAIN', direction: 'UP', lat: 16.4970, lng: 80.6080, defaultAspect: 'GREEN' },
  { id: 'SIG-UP-05', name: 'S-105 (KCC Home)', km: 4.6, trackId: 'TRK-UP-MAIN', direction: 'UP', lat: 16.4890, lng: 80.6030, defaultAspect: 'GREEN' },
  { id: 'SIG-UP-07', name: 'S-107 (KCC Starter)', km: 5.8, trackId: 'TRK-UP-MAIN', direction: 'UP', lat: 16.4800, lng: 80.5980, defaultAspect: 'GREEN' },
  { id: 'SIG-UP-09', name: 'S-109 (Kolanukonda Auto)', km: 8.5, trackId: 'TRK-UP-MAIN', direction: 'UP', lat: 16.4630, lng: 80.5865, defaultAspect: 'GREEN' },
  { id: 'SIG-UP-11', name: 'S-111 (MAG Distant)', km: 11.2, trackId: 'TRK-UP-MAIN', direction: 'UP', lat: 16.4435, lng: 80.5720, defaultAspect: 'YELLOW' },
  { id: 'SIG-UP-13', name: 'S-113 (MAG Home)', km: 12.1, trackId: 'TRK-UP-MAIN', direction: 'UP', lat: 16.4380, lng: 80.5670, defaultAspect: 'RED' },
  { id: 'SIG-UP-15', name: 'S-115 (MAG Starter)', km: 13.0, trackId: 'TRK-UP-MAIN', direction: 'UP', lat: 16.4310, lng: 80.5620, defaultAspect: 'GREEN' },
  { id: 'SIG-UP-19', name: 'S-119 (Pedakakani Auto)', km: 24.5, trackId: 'TRK-UP-MAIN', direction: 'UP', lat: 16.3820, lng: 80.5300, defaultAspect: 'GREEN' },
  { id: 'SIG-UP-23', name: 'S-123 (NBR Home)', km: 35.8, trackId: 'TRK-UP-MAIN', direction: 'UP', lat: 16.3490, lng: 80.5150, defaultAspect: 'GREEN' },
  { id: 'SIG-UP-27', name: 'S-127 (GNT Outer)', km: 48.5, trackId: 'TRK-UP-MAIN', direction: 'UP', lat: 16.3050, lng: 80.4520, defaultAspect: 'DOUBLE_YELLOW' },
  { id: 'SIG-DN-02', name: 'S-202 (TEL Adv Starter)', km: 76.5, trackId: 'TRK-DN-MAIN', direction: 'DN', lat: 16.2460, lng: 80.6350, defaultAspect: 'GREEN' },
  { id: 'SIG-DN-06', name: 'S-206 (VJA Home)', km: 64.5, trackId: 'TRK-DN-MAIN', direction: 'DN', lat: 16.2600, lng: 80.5600, defaultAspect: 'GREEN' },
  { id: 'SIG-DN-12', name: 'S-212 (GNT DN Starter)', km: 49.2, trackId: 'TRK-DN-MAIN', direction: 'DN', lat: 16.3010, lng: 80.4480, defaultAspect: 'GREEN' },
  { id: 'SIG-DN-16', name: 'S-216 (MAG DN Home)', km: 13.5, trackId: 'TRK-DN-MAIN', direction: 'DN', lat: 16.4320, lng: 80.5630, defaultAspect: 'GREEN' }
];

// -----------------------------------------------------------------------------
// 2. Vector Projection & Geospatial Mathematics
// -----------------------------------------------------------------------------

/**
 * Calculates great-circle distance between two coordinates in kilometers (Haversine).
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Projects a point P onto segment AB in 2D space.
 * Returns the snapped point, parameter t in [0, 1], and perpendicular distance in meters.
 */
export function projectPointOntoSegment(
  p: { lat: number; lng: number },
  a: GeoPoint,
  b: GeoPoint
): { snappedPoint: { lat: number; lng: number }; t: number; distanceMeters: number; interpolatedKm: number } {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    const distM = haversineDistanceKm(p.lat, p.lng, a.lat, a.lng) * 1000;
    return { snappedPoint: { lat: a.lat, lng: a.lng }, t: 0, distanceMeters: distM, interpolatedKm: a.km };
  }

  // Projection scalar t = ((P - A) . (B - A)) / |B - A|^2
  let t = ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t)); // clamp to segment

  const snappedLat = a.lat + t * dy;
  const snappedLng = a.lng + t * dx;
  const distanceMeters = haversineDistanceKm(p.lat, p.lng, snappedLat, snappedLng) * 1000;
  const interpolatedKm = a.km + t * (b.km - a.km);

  return {
    snappedPoint: { lat: snappedLat, lng: snappedLng },
    t,
    distanceMeters,
    interpolatedKm
  };
}

/**
 * Computes the bearing in degrees (0 to 360) from point A to point B.
 */
export function calculateBearingDegrees(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const y = Math.sin(((b.lng - a.lng) * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180);
  const x =
    Math.cos((a.lat * Math.PI) / 180) * Math.sin((b.lat * Math.PI) / 180) -
    Math.sin((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.cos(((b.lng - a.lng) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Interpolates coordinate and bearing along a track polyline given a chainage KM.
 */
export function interpolateTrackCoordAtKm(
  track: TrackPolyline,
  targetKm: number
): { coord: { lat: number; lng: number }; bearingDegrees: number; segmentIndex: number } {
  const coords = track.coordinates;
  if (coords.length === 0) {
    return { coord: { lat: 16.5193, lng: 80.6231 }, bearingDegrees: 0, segmentIndex: 0 };
  }
  if (coords.length === 1) {
    return { coord: { lat: coords[0].lat, lng: coords[0].lng }, bearingDegrees: 0, segmentIndex: 0 };
  }

  // Find surrounding segment
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const minKm = Math.min(a.km, b.km);
    const maxKm = Math.max(a.km, b.km);

    if (targetKm >= minKm && targetKm <= maxKm) {
      const denom = maxKm - minKm;
      const t = denom === 0 ? 0 : Math.abs(targetKm - a.km) / denom;
      const lat = a.lat + t * (b.lat - a.lat);
      const lng = a.lng + t * (b.lng - a.lng);
      const bearing = calculateBearingDegrees(a, b);
      return { coord: { lat, lng }, bearingDegrees: bearing, segmentIndex: i };
    }
  }

  // If outside bounds, snap to nearest endpoint
  if (targetKm < Math.min(coords[0].km, coords[coords.length - 1].km)) {
    const first = coords[0];
    const second = coords[1];
    return { coord: { lat: first.lat, lng: first.lng }, bearingDegrees: calculateBearingDegrees(first, second), segmentIndex: 0 };
  }

  const last = coords[coords.length - 1];
  const secondLast = coords[coords.length - 2];
  return {
    coord: { lat: last.lat, lng: last.lng },
    bearingDegrees: calculateBearingDegrees(secondLast, last),
    segmentIndex: coords.length - 2
  };
}

// -----------------------------------------------------------------------------
// 3. Map-Matching Engine: Direction-Aware Snapping
// -----------------------------------------------------------------------------

export interface MapMatchedTrain {
  train: LiveTrainPosition;
  snappedCoord: { lat: number; lng: number };
  trackId: string;
  trackName: string;
  trackKm: number;
  bearingDegrees: number;
  confidence: 'HIGH' | 'LOW' | 'INFERRED_FROM_KM';
  deviationMeters: number;
  isLive: boolean;
  approachBlock?: {
    blockId: string;
    distanceKm: number;
    dynamicEtaMinutes: number | null;
    status: 'INSIDE_BLOCK_ZONE' | 'IMMINENT_APPROACH' | 'APPROACHING' | 'CLEAR';
    message: string;
  };
}

/**
 * Direction-Aware Map-Matching for Live RailRadar Trains across India.
 * Projects GPS coordinates onto the appropriate physical track vector without parallel track confusion.
 * If raw GPS is absent, maps intelligently via national station database and track geometry.
 */
export function mapMatchTrainToTrack(
  train: LiveTrainPosition,
  tracks: TrackPolyline[] = ALL_TRACKS
): MapMatchedTrain {
  const isUp = train.direction === 'UP';

  // Filter candidate tracks strictly by train direction to prevent snapping UP train to DN track
  const candidateTracks = tracks.filter(trk => {
    if (trk.direction === 'BOTH') return true;
    return isUp ? trk.direction === 'UP' : trk.direction === 'DN';
  });

  const availableTracks = candidateTracks.length > 0 ? candidateTracks : tracks;
  const primaryTrack = availableTracks.find(t => isUp ? t.type === 'UP Main' : t.type === 'DOWN Main') || availableTracks[0];

  // Case A: Raw GPS coordinates are available anywhere in India
  if (train.latitude && train.longitude && !isNaN(train.latitude) && !isNaN(train.longitude)) {
    const rawPoint = { lat: train.latitude, lng: train.longitude };
    let bestSnap = {
      coord: { lat: train.latitude, lng: train.longitude },
      distanceMeters: Infinity,
      trackKm: train.currentKm || 0,
      track: primaryTrack,
      bearingDegrees: isUp ? 210 : 30
    };

    for (const track of availableTracks) {
      for (let i = 0; i < track.coordinates.length - 1; i++) {
        const a = track.coordinates[i];
        const b = track.coordinates[i + 1];
        const proj = projectPointOntoSegment(rawPoint, a, b);

        if (proj.distanceMeters < bestSnap.distanceMeters) {
          const bearing = calculateBearingDegrees(a, b);
          bestSnap = {
            coord: proj.snappedPoint,
            distanceMeters: proj.distanceMeters,
            trackKm: proj.interpolatedKm,
            track,
            bearingDegrees: bearing
          };
        }
      }
    }

    // Indian Railways confidence standard: within 200 meters of track centerline is HIGH confidence
    const isHighConfidence = bestSnap.distanceMeters <= 200;

    return {
      train,
      snappedCoord: bestSnap.coord,
      trackId: bestSnap.track.id,
      trackName: bestSnap.track.name,
      trackKm: Number(bestSnap.trackKm.toFixed(2)),
      bearingDegrees: Math.round(bestSnap.bearingDegrees),
      confidence: isHighConfidence ? 'HIGH' : 'LOW',
      deviationMeters: Math.round(bestSnap.distanceMeters),
      isLive: true
    };
  }

  // Case B: GPS absent, resolve via reported railway chainage KM or nationwide station database
  let targetKm = train.currentKm;
  if (typeof targetKm === 'number' && !isNaN(targetKm) && targetKm > 0) {
    const { coord, bearingDegrees } = interpolateTrackCoordAtKm(primaryTrack, targetKm);
    return {
      train,
      snappedCoord: coord,
      trackId: primaryTrack.id,
      trackName: primaryTrack.name,
      trackKm: Number(targetKm.toFixed(2)),
      bearingDegrees: Math.round(bearingDegrees),
      confidence: 'INFERRED_FROM_KM',
      deviationMeters: 0,
      isLive: false
    };
  }

  // If chainage KM absent, resolve via station geo
  const nationalStn = NATIONAL_STATION_GEOS[train.currentStation] || 
                      NATIONAL_STATION_GEOS[train.lastReportedStation] ||
                      CORRIDOR_STATION_GEOS[train.currentStation] || 
                      CORRIDOR_STATION_GEOS[train.lastReportedStation];

  if (nationalStn) {
    const stnPoint = { lat: nationalStn.lat, lng: nationalStn.lng };
    let bestSnap = {
      coord: stnPoint,
      distanceMeters: Infinity,
      trackKm: nationalStn.km,
      track: primaryTrack,
      bearingDegrees: isUp ? 210 : 30
    };

    for (const track of availableTracks) {
      for (let i = 0; i < track.coordinates.length - 1; i++) {
        const a = track.coordinates[i];
        const b = track.coordinates[i + 1];
        const proj = projectPointOntoSegment(stnPoint, a, b);

        if (proj.distanceMeters < bestSnap.distanceMeters) {
          const bearing = calculateBearingDegrees(a, b);
          bestSnap = {
            coord: proj.snappedPoint,
            distanceMeters: proj.distanceMeters,
            trackKm: proj.interpolatedKm,
            track,
            bearingDegrees: bearing
          };
        }
      }
    }

    return {
      train,
      snappedCoord: bestSnap.coord,
      trackId: bestSnap.track.id,
      trackName: bestSnap.track.name,
      trackKm: Number(bestSnap.trackKm.toFixed(2)),
      bearingDegrees: Math.round(bestSnap.bearingDegrees),
      confidence: 'INFERRED_FROM_KM',
      deviationMeters: Math.round(bestSnap.distanceMeters),
      isLive: false
    };
  }

  // Fallback to chainage KM on primary track
  targetKm = isUp ? 12.5 : 50.0;
  const { coord, bearingDegrees } = interpolateTrackCoordAtKm(primaryTrack, targetKm);

  return {
    train,
    snappedCoord: coord,
    trackId: primaryTrack.id,
    trackName: primaryTrack.name,
    trackKm: Number(targetKm.toFixed(2)),
    bearingDegrees: Math.round(bearingDegrees),
    confidence: 'INFERRED_FROM_KM',
    deviationMeters: 0,
    isLive: false
  };
}

// -----------------------------------------------------------------------------
// 4. Maintenance Block Geospatial Slicing
// -----------------------------------------------------------------------------

export interface GeospatialMaintenanceZone {
  blockId: string;
  department: string;
  workDescription: string;
  startKm: number;
  endKm: number;
  trackName: string;
  trackId: string;
  status: string;
  priority: string;
  polyline: GeoPoint[];
  centerCoord: { lat: number; lng: number };
  boundingBox: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  isCrossSection?: boolean;
  powerBlockRequired?: boolean;
  sntDisconnectionRequired?: boolean;
}

/**
 * Extracts the exact sub-segment polyline of the track geometry covered by a maintenance possession.
 */
export function getGeospatialMaintenanceZones(
  requests: BlockRequest[],
  tracks: TrackPolyline[] = CORRIDOR_TRACKS
): GeospatialMaintenanceZone[] {
  const zones: GeospatialMaintenanceZone[] = [];

  for (const req of requests) {
    // Only map requests with identifiable locations
    const startKm = req.startKm !== undefined ? req.startKm : 12.0;
    const endKm = req.endKm !== undefined ? req.endKm : 13.5;
    const minKm = Math.min(startKm, endKm);
    const maxKm = Math.max(startKm, endKm);

    // Identify corresponding track
    const lineName = (req.lineName || (req.affectedTracks && req.affectedTracks[0]) || 'UP Main').toLowerCase();
    let targetTrack = tracks.find(t => t.name.toLowerCase().includes('up') && lineName.includes('up'));
    if (!targetTrack && lineName.includes('down')) {
      targetTrack = tracks.find(t => t.name.toLowerCase().includes('down'));
    }
    if (!targetTrack && lineName.includes('loop')) {
      targetTrack = tracks.find(t => t.type === 'Loop Line');
    }
    if (!targetTrack) targetTrack = tracks[0];

    // Build sliced sub-polyline
    const subPolyline: GeoPoint[] = [];

    // Add start point
    const startInterp = interpolateTrackCoordAtKm(targetTrack, minKm);
    subPolyline.push({ lat: startInterp.coord.lat, lng: startInterp.coord.lng, km: minKm, name: `Start KM ${minKm}` });

    // Add all intermediate track vertices strictly inside [minKm, maxKm]
    for (const pt of targetTrack.coordinates) {
      if (pt.km > minKm && pt.km < maxKm) {
        subPolyline.push(pt);
      }
    }

    // Add end point
    const endInterp = interpolateTrackCoordAtKm(targetTrack, maxKm);
    subPolyline.push({ lat: endInterp.coord.lat, lng: endInterp.coord.lng, km: maxKm, name: `End KM ${maxKm}` });

    // Calculate center and bounding box
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    let sumLat = 0, sumLng = 0;

    for (const pt of subPolyline) {
      minLat = Math.min(minLat, pt.lat);
      maxLat = Math.max(maxLat, pt.lat);
      minLng = Math.min(minLng, pt.lng);
      maxLng = Math.max(maxLng, pt.lng);
      sumLat += pt.lat;
      sumLng += pt.lng;
    }

    const centerCoord = {
      lat: Number((sumLat / subPolyline.length).toFixed(6)),
      lng: Number((sumLng / subPolyline.length).toFixed(6))
    };

    zones.push({
      blockId: req.id,
      department: req.department,
      workDescription: req.work,
      startKm: minKm,
      endKm: maxKm,
      trackName: targetTrack.name,
      trackId: targetTrack.id,
      status: req.status,
      priority: req.priority,
      polyline: subPolyline,
      centerCoord,
      boundingBox: { minLat, maxLat, minLng, maxLng },
      isCrossSection: req.isCrossSection,
      powerBlockRequired: req.powerBlockRequired,
      sntDisconnectionRequired: req.sntDisconnectionRequired
    });
  }

  return zones;
}

// -----------------------------------------------------------------------------
// 5. Dynamic Train-Block Approach & ETA Calculation
// -----------------------------------------------------------------------------

/**
 * Calculates track distance Delta KM and dynamic ETA between an approaching train and a maintenance possession.
 */
export function evaluateTrainBlockApproach(
  matchedTrain: MapMatchedTrain,
  blockZone: GeospatialMaintenanceZone
): MapMatchedTrain['approachBlock'] {
  const trainKm = matchedTrain.trackKm;
  const isUp = matchedTrain.train.direction === 'UP';

  // Check if train is operating on the same physical line
  const isSameTrack =
    (isUp && blockZone.trackName.includes('UP')) ||
    (!isUp && blockZone.trackName.includes('DOWN')) ||
    blockZone.trackName.includes('Loop');

  if (!isSameTrack) {
    return {
      blockId: blockZone.blockId,
      distanceKm: 999,
      dynamicEtaMinutes: null,
      status: 'CLEAR',
      message: `Operating on adjacent parallel line (${matchedTrain.trackName}). No direct track occupancy.`
    };
  }

  // Inside maintenance block possession limits
  if (trainKm >= blockZone.startKm && trainKm <= blockZone.endKm) {
    return {
      blockId: blockZone.blockId,
      distanceKm: 0,
      dynamicEtaMinutes: 0,
      status: 'INSIDE_BLOCK_ZONE',
      message: `TRAIN CURRENTLY INSIDE ACTIVE POSSESSION LIMITS (KM ${blockZone.startKm} - ${blockZone.endKm})`
    };
  }

  // Calculate distance along track vector towards block
  let distanceKm = 0;
  let isApproaching = false;

  if (isUp) {
    // UP trains travel from KM 0.0 towards KM 78.5
    if (trainKm < blockZone.startKm) {
      distanceKm = Number((blockZone.startKm - trainKm).toFixed(2));
      isApproaching = true;
    }
  } else {
    // DN trains travel from KM 78.5 down towards KM 0.0
    if (trainKm > blockZone.endKm) {
      distanceKm = Number((trainKm - blockZone.endKm).toFixed(2));
      isApproaching = true;
    }
  }

  if (!isApproaching) {
    return {
      blockId: blockZone.blockId,
      distanceKm: 999,
      dynamicEtaMinutes: null,
      status: 'CLEAR',
      message: 'Train has already cleared or is moving away from the block location.'
    };
  }

  // Dynamic ETA calculation based on real-time speed
  const speedKmph = Math.max(matchedTrain.train.speedKmph || 0, 45); // minimum speed assumption if coasting
  const dynamicEtaMinutes = Math.max(1, Math.round((distanceKm / speedKmph) * 60));

  let status: 'IMMINENT_APPROACH' | 'APPROACHING' | 'CLEAR' = 'CLEAR';
  let message = '';

  if (distanceKm <= 5.0 || dynamicEtaMinutes <= 15) {
    status = 'IMMINENT_APPROACH';
    message = `TRAIN APPROACHING | ETA ${dynamicEtaMinutes} min | Dist ${distanceKm} km (Speed: ${matchedTrain.train.speedKmph} km/h)`;
  } else if (distanceKm <= 20.0 || dynamicEtaMinutes <= 30) {
    status = 'APPROACHING';
    message = `Train in approach corridor: ${distanceKm} km away (~${dynamicEtaMinutes} min)`;
  } else {
    status = 'CLEAR';
    message = `Train safely distanced: ${distanceKm} km away`;
  }

  return {
    blockId: blockZone.blockId,
    distanceKm,
    dynamicEtaMinutes,
    status,
    message
  };
}
