// Infrastructure Master & Dynamic Railway Location Type Definitions
// Indian Railways · South Central Railway (Vijayawada Division)

import { Department, BlockPriority } from './samnvay';

export type TrackType = 'UP Main' | 'DOWN Main' | 'Loop Line' | 'Goods Siding' | 'Common Loop' | 'Yard Line';

export type AssetCategory = 
  | 'Turnout' 
  | 'Rail Section' 
  | 'Track Geometry Zone'
  | 'Signal' 
  | 'Point Machine' 
  | 'Track Circuit' 
  | 'Axle Counter'
  | 'OHE Mast' 
  | 'Sectioning Post' 
  | 'Catenary Wire'
  | 'Sub-Station feeder';

export interface InfrastructureAsset {
  assetId: string; // e.g. "T-124", "S-127", "PM-128", "M-125"
  assetType: AssetCategory;
  name: string;
  department: Department;
  km: number; // decimal KM
  kmDisplay: string; // e.g. "KM 12/450"
  trackId: string;
  trackName: TrackType;
  status: 'OPERATIONAL' | 'NEEDS_MAINTENANCE' | 'CRITICAL_WATCH';
}

export interface TrackMaster {
  trackId: string;
  trackName: TrackType;
  lineId: string;
  lineName: string;
  startKm: number;
  endKm: number;
  electrified: boolean;
  speedLimitKmph: number;
}

export interface StationMaster {
  stationId: string;
  stationCode: string; // e.g. "BZA", "KCC", "MAG", "NBR", "GNT", "VJA", "TEL"
  stationName: string; // e.g. "Mangalagiri"
  sectionId: string;   // e.g. "SEC-A"
  routeCode: string;   // e.g. "ROUTE-01"
  km: number;          // decimal KM
  kmDisplay: string;   // e.g. "KM 12/500"
  yardLimitStartKm: number; // e.g. 11.800
  yardLimitEndKm: number;   // e.g. 13.200
  tracks: string[];
}

export interface RouteMaster {
  routeId: string;
  routeCode: string; // e.g. "ROUTE-01"
  routeName: string; // e.g. "Vijayawada – Guntur Trunk Route"
  corridor: string;
  startStationCode: string;
  endStationCode: string;
  totalKm: number;
}

export interface SectionMaster {
  sectionId: string; // e.g. "SEC-A", "SEC-B", "SEC-C"
  sectionName: string; // e.g. "BZA – MAG Main Section"
  corridorCode: string; // e.g. "ROUTE-01"
  startKm: number; // e.g. 0.000
  endKm: number; // e.g. 25.000
  startStation: string;
  endStation: string;
  totalKm: number;
  doubleTrack: boolean;
  tracks: TrackMaster[];
}

export interface InfrastructureMaster {
  corridor: {
    name: string;
    zone: string;
    division: string;
    startKm: number;
    endKm: number;
  };
  routes: RouteMaster[];
  stations: StationMaster[];
  sections: SectionMaster[];
  assets: InfrastructureAsset[];
}

export interface AffectedSectionBreakdown {
  sectionId: string;
  sectionCode: string;
  sectionName: string;
  startKm: number;
  endKm: number;
  rangeDisplay: string;
  lengthMeters: number;
}

export interface BetweenStationsInfo {
  fromStation: StationMaster;
  toStation: StationMaster;
  display: string; // e.g. "Krishna Canal Jn (KCC) → Mangalagiri (MAG)"
  sectionCode: string;
}

export interface LocationDetectionResult {
  isValid: boolean;
  errorMessage?: string;
  startKmDecimal: number;
  endKmDecimal: number;
  startKmDisplay: string;
  endKmDisplay: string;
  affectedLengthKm: number;
  affectedLengthMeters: number;
  isCrossSection: boolean;
  detectedSections: SectionMaster[];
  affectedSectionsBreakdown: AffectedSectionBreakdown[];
  detectedLines: string[];
  availableTracks: TrackMaster[];
  affectedAssets: {
    all: InfrastructureAsset[];
    byDepartment: Record<Department, InfrastructureAsset[]>;
  };
  
  // Core Station Identification
  primaryStation: StationMaster | null;
  stationCode: string; // e.g. "MAG"
  stationName: string; // e.g. "Mangalagiri"
  sectionCode: string; // e.g. "SEC-A"
  sectionName: string; // e.g. "BZA – MAG Section"
  routeCode: string;   // e.g. "ROUTE-01"
  routeName: string;   // e.g. "Vijayawada – Guntur Trunk Route"
  
  // Station Limits & Yard Intersections
  isStationLimitIntersection: boolean;
  stationLimitsAffected: {
    stationCode: string;
    stationName: string;
    yardRange: string;
  }[];
  
  // Between Stations Information
  betweenStations: BetweenStationsInfo | null;
  stationsInRange: StationMaster[];
}

export interface WorkTypeConfig {
  id: string;
  name: string;
  department: Department;
  defaultDurationMins: number;
  trafficBlockRequired: boolean;
  powerBlockRequired: boolean;
  sntDisconnectionRequired: boolean;
  speedRestrictionRequired: boolean;
  defaultPriority: BlockPriority;
  suggestedResources: string[];
  description: string;
}

export interface CandidatePlanningWindow {
  slotId: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  durationMinutes: number;
  status: 'CONFLICT' | 'FEASIBLE' | 'INSUFFICIENT_DURATION';
  conflictingTrain?: {
    trainNumber: string;
    trainName: string;
    estimatedArrivalAtKm: string;
    delayMinutes: number;
  };
  reason: string;
  isRecommended?: boolean;
}

export interface SpatialOverlapResult {
  hasOverlap: boolean;
  isSpatialOverlap?: boolean;
  section?: string;
  overlapKmRange?: string;
  overlapStartKm: number;
  overlapEndKm: number;
  overlapLengthMeters: number;
  requestIds: string[];
  departmentBreakdown: {
    department: Department;
    requestId: string;
    work: string;
    kmRange: string;
    duration: number;
  }[];
  compatibility: {
    trackCompatible: boolean;
    powerCompatible: boolean;
    safetyCompatible: boolean;
    combinedDuration: number;
    efficiencyGainPercent: number;
  };
  recommendedBlock?: {
    location: string;
    startKm: number;
    endKm: number;
    section: string;
    tracks: string[];
    durationMinutes: number;
    availableWindowMinutes?: number;
    availableCorridorWindow?: string;
    departments: Department[];
    powerBlock: boolean;
    recommendedWindow: string;
    trainConflicts: number;
    blockUtilizationPercent: number;
    reason: string;
  };
}

// -----------------------------------------------------------------------------
// OpenRailwayMap GIS & Location Intelligence Engine Models (v2.1)
// -----------------------------------------------------------------------------
export type ConflictCategory = 'HARD_CONFLICT' | 'COORDINATION_OPPORTUNITY' | 'NO_CONFLICT';

export interface RailwayGisGeometry {
  type: 'LineString' | 'MultiLineString' | 'Point';
  coordinates: number[][] | number[][][];
  properties: {
    railway?: string;
    gauge?: string;
    electrified?: string;
    voltage?: string;
    usage?: string;
    maxspeed?: number;
    name?: string;
    ref?: string;
    layer?: number;
  };
}

export interface RailwayGisFacility {
  id: string;
  name: string;
  type: 'station' | 'halt' | 'yard' | 'substation' | 'crossover' | 'level_crossing' | 'signal_box';
  lat: number;
  lon: number;
  operator?: string;
  source: 'OPENRAILWAYMAP' | 'INFRASTRUCTURE_MASTER_FALLBACK';
}

export interface RailwayMilestone {
  ref: string;
  km: number;
  lat: number;
  lon: number;
}

export interface LocationIntelligenceData {
  isValid: boolean;
  errorMessage?: string;
  station: {
    code: string;
    name: string;
    km: number;
    kmDisplay: string;
    isStationLimitIntersection: boolean;
    yardLimits?: { startKm: number; endKm: number };
  } | null;
  betweenStations: {
    fromStation: string;
    toStation: string;
    display: string;
  } | null;
  section: {
    id: string;
    name: string;
    startKm: number;
    endKm: number;
    isCrossSection: boolean;
    allAffectedSections: string[];
  };
  route: {
    id: string;
    code: string;
    name: string;
  };
  line: {
    name: string;
    availableLines: string[];
  };
  track: {
    requestedTrack: string;
    availableTracks: string[];
    speedLimitKmph: number;
    electrified: boolean;
  };
  locationRange: {
    startKmDecimal: number;
    endKmDecimal: number;
    startKmDisplay: string;
    endKmDisplay: string;
    affectedLengthKm: number;
    affectedLengthMeters: number;
  };
  assets: {
    inRangeCount: number;
    criticalCount: number;
    items: any[];
  };
  gisContext: {
    source: 'OPENRAILWAYMAP' | 'INFRASTRUCTURE_FALLBACK' | 'CACHE';
    centerCoordinates: { lat: number; lon: number };
    boundingBox: [number, number, number, number];
    geometry: RailwayGisGeometry[];
    nearbyFacilities: RailwayGisFacility[];
    milestones: RailwayMilestone[];
    apiDisclaimer: string;
  };
  liveTrainContext: {
    sectionTrafficDensity: 'HIGH' | 'MEDIUM' | 'LOW';
    approachingTrainsCount: number;
    earliestArrivalMinutes: number | null;
    closestTrainNumber?: string;
    closestTrainName?: string;
    closestTrainDelay?: number;
    conflictCategory: ConflictCategory;
    conflictSummary: string;
  };
  timestamp: string;
}
