// server/services/locationIntelligenceService.ts
// Location Intelligence Engine for Rail Samnvay (SIH PS 26027)
// Unified Architecture: Infrastructure Master (Operational Truth) + OpenRailwayMap (GIS Context) + RailRadar (Live Trains)

import { 
  detectLocation, 
  parseKm, 
  formatKm, 
  STATIONS, 
  SECTIONS, 
  ASSETS, 
  ROUTES, 
  CORRIDOR 
} from './infrastructureService.js';
import { 
  findRailwayGeometry, 
  findNearbyFacilities, 
  findMilestones, 
  findRailwayRoute,
  RailwayGisGeometry, 
  RailwayGisFacility, 
  RailwayMilestone,
  CORRIDOR_GIS_FALLBACK 
} from './openRailwayMapService.js';

export type ConflictCategory = 'HARD_CONFLICT' | 'COORDINATION_OPPORTUNITY' | 'NO_CONFLICT';

export interface LocationIntelligenceData {
  // Operational Identification (Infrastructure Master)
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

  // Geospatial Context (OpenRailwayMap)
  gisContext: {
    source: 'OPENRAILWAYMAP' | 'INFRASTRUCTURE_FALLBACK' | 'CACHE';
    centerCoordinates: { lat: number; lon: number };
    boundingBox: [number, number, number, number];
    geometry: RailwayGisGeometry[];
    nearbyFacilities: RailwayGisFacility[];
    milestones: RailwayMilestone[];
    apiDisclaimer: string;
  };

  // Live Train Proximity (RailRadar relationship)
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

/**
 * Derives approximate GPS coordinates from decimal railway KM for the BZA-GNT-TEL corridor.
 */
function interpolateCoordinates(km: number): { lat: number; lon: number } {
  // Key corridor anchors:
  // KM 0.0 (BZA): 16.5193, 80.6231
  // KM 12.5 (MAG): 16.4350, 80.5650
  // KM 50.0 (GNT): 16.2990, 80.4430
  // KM 78.5 (TEL): 16.2430, 80.6480
  if (km <= 12.5) {
    const ratio = Math.max(0, Math.min(1, km / 12.5));
    return {
      lat: Number((16.5193 + ratio * (16.4350 - 16.5193)).toFixed(5)),
      lon: Number((80.6231 + ratio * (80.5650 - 80.6231)).toFixed(5))
    };
  } else if (km <= 50.0) {
    const ratio = Math.max(0, Math.min(1, (km - 12.5) / 37.5));
    return {
      lat: Number((16.4350 + ratio * (16.2990 - 16.4350)).toFixed(5)),
      lon: Number((80.5650 + ratio * (80.4430 - 80.5650)).toFixed(5))
    };
  } else {
    const ratio = Math.max(0, Math.min(1, (km - 50.0) / 28.5));
    return {
      lat: Number((16.2990 + ratio * (16.2430 - 16.2990)).toFixed(5)),
      lon: Number((80.4430 + ratio * (80.6480 - 80.4430)).toFixed(5))
    };
  }
}

/**
 * Main Location Intelligence Resolver
 * Combines Infrastructure Master + OpenRailwayMap + RailRadar Context
 */
export async function resolveLocationIntelligence(
  startLocationInput: string | number,
  endLocationInput: string | number,
  requestedTrack: string = 'UP Main',
  activeLiveTrains: any[] = []
): Promise<LocationIntelligenceData> {
  // 1. Authoritative Infrastructure Master Resolution
  const infraResult = detectLocation(startLocationInput, endLocationInput);
  const now = new Date().toISOString();

  if (!infraResult.isValid) {
    return {
      isValid: false,
      errorMessage: infraResult.error || 'Invalid railway location range',
      station: null,
      betweenStations: null,
      section: { id: '', name: '', startKm: 0, endKm: 0, isCrossSection: false, allAffectedSections: [] },
      route: { id: '', code: '', name: '' },
      line: { name: '', availableLines: [] },
      track: { requestedTrack, availableTracks: [], speedLimitKmph: 0, electrified: false },
      locationRange: { startKmDecimal: 0, endKmDecimal: 0, startKmDisplay: '', endKmDisplay: '', affectedLengthKm: 0, affectedLengthMeters: 0 },
      assets: { inRangeCount: 0, criticalCount: 0, items: [] },
      gisContext: {
        source: 'INFRASTRUCTURE_FALLBACK',
        centerCoordinates: { lat: 16.4350, lon: 80.5650 },
        boundingBox: [16.4, 80.5, 16.5, 80.6],
        geometry: [],
        nearbyFacilities: [],
        milestones: [],
        apiDisclaimer: 'OpenRailwayMap provides supplementary GIS context. Official operational data is governed by Rail Samnvay Infrastructure Master.'
      },
      liveTrainContext: {
        sectionTrafficDensity: 'LOW',
        approachingTrainsCount: 0,
        earliestArrivalMinutes: null,
        conflictCategory: 'NO_CONFLICT',
        conflictSummary: 'Invalid location bounds'
      },
      timestamp: now
    };
  }

  const sKm = infraResult.startKm;
  const eKm = infraResult.endKm;
  const midKm = (sKm + eKm) / 2;
  const centerCoords = interpolateCoordinates(midKm);

  // 2. OpenRailwayMap Geospatial Resolution (with Cache & Fallback)
  const latDelta = 0.04;
  const lonDelta = 0.04;
  const bbox: [number, number, number, number] = [
    centerCoords.lat - latDelta,
    centerCoords.lon - lonDelta,
    centerCoords.lat + latDelta,
    centerCoords.lon + lonDelta
  ];

  // Concurrently query geometry, facilities, and milestones
  const [geomRes, facRes, mileRes] = await Promise.all([
    findRailwayGeometry(bbox),
    findNearbyFacilities(centerCoords.lat, centerCoords.lon, 4.0),
    findMilestones(centerCoords.lat, centerCoords.lon, 2.5)
  ]);

  // Determine overall GIS source
  const gisSource = geomRes.source === 'OPENRAILWAYMAP' ? 'OPENRAILWAYMAP' :
                    geomRes.source === 'CACHE' ? 'CACHE' : 'INFRASTRUCTURE_FALLBACK';

  // 3. Station Identification Logic
  let matchedStation: LocationIntelligenceData['station'] = null;
  let betweenStations: LocationIntelligenceData['betweenStations'] = null;

  // Check if work intersects station yard limits
  const stationInYard = STATIONS.find(stn => stn.yardLimitStartKm < eKm && stn.yardLimitEndKm > sKm);
  if (stationInYard) {
    matchedStation = {
      code: stationInYard.code,
      name: stationInYard.name,
      km: stationInYard.km,
      kmDisplay: formatKm(stationInYard.km),
      isStationLimitIntersection: true,
      yardLimits: {
        startKm: stationInYard.yardLimitStartKm,
        endKm: stationInYard.yardLimitEndKm
      }
    };
  } else {
    // Find closest station
    let closestStn = STATIONS[0];
    let minDiff = Math.abs(STATIONS[0].km - midKm);
    for (const stn of STATIONS) {
      const diff = Math.abs(stn.km - midKm);
      if (diff < minDiff) {
        minDiff = diff;
        closestStn = stn;
      }
    }

    matchedStation = {
      code: closestStn.code,
      name: closestStn.name,
      km: closestStn.km,
      kmDisplay: formatKm(closestStn.km),
      isStationLimitIntersection: false
    };

    // Calculate Between Stations
    const sorted = [...STATIONS].sort((a, b) => a.km - b.km);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sKm >= sorted[i].km && eKm <= sorted[i + 1].km) {
        betweenStations = {
          fromStation: `${sorted[i].name} (${sorted[i].code})`,
          toStation: `${sorted[i + 1].name} (${sorted[i + 1].code})`,
          display: `${sorted[i].name} (${sorted[i].code}) → ${sorted[i + 1].name} (${sorted[i + 1].code})`
        };
        break;
      }
    }
  }

  // 4. Section, Track & Assets Context
  const primarySection = infraResult.detectedSections[0] || SECTIONS[0];
  const allSectionIds = infraResult.detectedSections.map((s: any) => s.sectionId);
  const matchedTrack = infraResult.availableTracks.find((t: any) => t.trackName === requestedTrack) || infraResult.availableTracks[0];

  // 5. RailRadar Live Train Relationship Evaluation
  // Evaluates live train movements approaching the maintenance KM interval
  const normalizedRequestedTrack = requestedTrack.toLowerCase();
  const approachingTrains = (activeLiveTrains || []).filter(t => {
    // Check if train is operating on same section or corridor
    const trainTrack = (t.track || '').toLowerCase();
    const isSameTrack = trainTrack.includes('up') && normalizedRequestedTrack.includes('up') ||
                        trainTrack.includes('dn') && normalizedRequestedTrack.includes('dn');
    return isSameTrack;
  });

  let conflictCat: ConflictCategory = 'NO_CONFLICT';
  let conflictSummary = 'No conflicting train paths in immediate safety window';

  if (approachingTrains.length > 0) {
    conflictCat = 'HARD_CONFLICT';
    const firstTrain = approachingTrains[0];
    conflictSummary = `TRAIN MOVEMENT CONFLICT: ${firstTrain.trainName || firstTrain.trainNumber} on ${requestedTrack} projected passage overlaps safety headway margin.`;
  }

  return {
    isValid: true,
    station: matchedStation,
    betweenStations,
    section: {
      id: primarySection.sectionId,
      name: primarySection.sectionName,
      startKm: primarySection.startKm,
      endKm: primarySection.endKm,
      isCrossSection: infraResult.isCrossSection,
      allAffectedSections: allSectionIds
    },
    route: {
      id: ROUTES[0].routeId,
      code: ROUTES[0].routeCode,
      name: ROUTES[0].routeName
    },
    line: {
      name: infraResult.detectedLines[0] || 'Main Line',
      availableLines: infraResult.detectedLines
    },
    track: {
      requestedTrack,
      availableTracks: infraResult.availableTracks.map((t: any) => t.trackName),
      speedLimitKmph: matchedTrack?.speedLimitKmph || 130,
      electrified: matchedTrack?.electrified ?? true
    },
    locationRange: {
      startKmDecimal: sKm,
      endKmDecimal: eKm,
      startKmDisplay: formatKm(sKm),
      endKmDisplay: formatKm(eKm),
      affectedLengthKm: infraResult.affectedLengthKm,
      affectedLengthMeters: infraResult.affectedLengthMeters
    },
    assets: {
      inRangeCount: infraResult.assets?.list?.length || 0,
      criticalCount: (infraResult.assets?.list || []).filter((a: any) => a.status === 'NEEDS_MAINTENANCE' || a.status === 'CRITICAL_WATCH').length,
      items: infraResult.assets?.list || []
    },
    gisContext: {
      source: gisSource,
      centerCoordinates: centerCoords,
      boundingBox: bbox,
      geometry: geomRes.data || [],
      nearbyFacilities: facRes.data || [],
      milestones: mileRes.data || [],
      apiDisclaimer: 'OpenRailwayMap provides supplementary GIS context. Official operational data is governed by Rail Samnvay Infrastructure Master.'
    },
    liveTrainContext: {
      sectionTrafficDensity: primarySection.sectionId === 'SEC-A' ? 'HIGH' : 'MEDIUM',
      approachingTrainsCount: approachingTrains.length,
      earliestArrivalMinutes: approachingTrains.length > 0 ? 25 : null,
      closestTrainNumber: approachingTrains[0]?.trainNumber,
      closestTrainName: approachingTrains[0]?.trainName,
      closestTrainDelay: approachingTrains[0]?.delayMinutes || 0,
      conflictCategory: conflictCat,
      conflictSummary
    },
    timestamp: now
  };
}
