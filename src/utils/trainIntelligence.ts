// src/utils/trainIntelligence.ts
// Train Movement Intelligence, Proximity Analysis & Interaction Classification
// Designed for Rail Samnvay Section 47 Specification & Indian Railways Operating Rules

import type { 
  LiveTrainPosition, 
  DataSource, 
  TrainMaintenanceInteractionState, 
  NearbyTrainMovementIntelligence 
} from '../types/samnvay';

/**
 * Builds canonical normalized Run Identity: Train Number + Service Date + Run ID
 * Supports passing either a LiveTrainPosition object or (trainNumber, scheduledDate, runSequence)
 * Example: 12704-20260917-RUN-1
 */
export function buildRunIdentity(
  trainOrNumber: string | number | LiveTrainPosition | null | undefined,
  scheduledDate?: string | Date,
  runSequence: number = 1
): string {
  if (!trainOrNumber) return `TRAIN-${new Date().toISOString().slice(0, 10).replace(/[^0-9]/g, '').slice(0, 8)}-RUN-1`;

  if (typeof trainOrNumber === 'object') {
    const t = trainOrNumber as any;
    let rawDate: string | undefined = undefined;
    if (typeof t.serviceDate === 'string') rawDate = t.serviceDate;
    else if (typeof t.originDate === 'string') rawDate = t.originDate;
    else if (typeof t.startDate === 'string') rawDate = t.startDate;
    else if (typeof t.lastUpdated === 'string') rawDate = t.lastUpdated.slice(0, 10);
    else if (t.lastUpdated instanceof Date) rawDate = t.lastUpdated.toISOString().slice(0, 10);
    else if (typeof t.lastUpdated === 'number' && !isNaN(t.lastUpdated)) {
      try { rawDate = new Date(t.lastUpdated).toISOString().slice(0, 10); } catch { rawDate = undefined; }
    }

    const cleanDate = (rawDate || new Date().toISOString().slice(0, 10)).replace(/[^0-9]/g, '').slice(0, 8);
    const rawRun = t.runId != null ? String(t.runId).trim() : '';
    const run = rawRun ? (rawRun.startsWith('RUN-') ? rawRun : `RUN-${rawRun}`) : 'RUN-1';
    const trainNum = t.trainNumber != null ? String(t.trainNumber).trim() : 'TRAIN';
    return `${trainNum}-${cleanDate}-${run}`;
  }

  const rawDateStr = typeof scheduledDate === 'string' 
    ? scheduledDate 
    : scheduledDate instanceof Date 
    ? scheduledDate.toISOString().slice(0, 10) 
    : undefined;
  const cleanDate = (rawDateStr || new Date().toISOString().slice(0, 10)).replace(/[^0-9]/g, '').slice(0, 8);
  const trainNum = String(trainOrNumber).trim() || 'TRAIN';
  return `${trainNum}-${cleanDate || 'RUN'}-RUN-${runSequence}`;
}

// Standard registered corridor section bounds & track definitions
export const STANDARD_CORRIDOR_SECTIONS: Record<string, { startKm: number; endKm: number; tracks: string[] }> = {
  'SEC-A': { startKm: 0.0, endKm: 25.0, tracks: ['UP Main', 'DOWN Main', 'Loop Line', 'Goods Siding'] },
  'SEC-B': { startKm: 25.0, endKm: 52.5, tracks: ['UP Main', 'DOWN Main'] },
  'SEC-C': { startKm: 52.5, endKm: 80.0, tracks: ['UP Main', 'DOWN Main', 'Loop Line'] }
};

/**
 * Calculates great-circle spatial distance between two geographic coordinates (WGS84) in kilometers
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export interface WorkLocationParams {
  id?: string;
  requestId?: string;
  startKm: number;
  endKm: number;
  track?: string;
  affectedTracks?: string[];
  sectionId?: string;
  section?: string;
  routeCode?: string;
  routeStations?: string[];
  blockStartTime?: string; // HH:MM
  blockEndTime?: string;   // HH:MM
  proximityThresholdKm?: number; // Configurable operational threshold (default 30km)
  hasAuthoritativeMapping?: boolean;
  isActiveNow?: boolean;   // Active maintenance occurring currently
  isScheduled?: boolean;   // Scheduled future block window
  stationCode?: string;
  station?: string;
}

/**
 * Diagnostic proximity trace record adhering to Section 11 specifications
 */
export interface ProximityTraceLog {
  trainNumber: string;
  runIdentity: string;
  telemetryTimestamp: string;
  telemetryAge: string;
  latitude: number | null;
  longitude: number | null;
  routeId: string;
  sectionId: string;
  trackId: string;
  trackName: string;
  direction: 'UP' | 'DN' | 'UNKNOWN';
  workRequestId: string;
  workRouteId: string;
  workSectionId: string;
  workTrackId: string;
  workKmStart: number;
  workKmEnd: number;
  routeMatch: boolean;
  sectionMatch: boolean;
  trackMatch: boolean;
  directionMatch: boolean;
  distanceAlongRouteKm: number | null;
  speed: number;
  etaMinutes: number | null;
  interactionState: TrainMaintenanceInteractionState;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  reason: string;
}

/**
 * Parse HH:MM to minutes from midnight
 */
function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr || !timeStr.includes(':')) return null;
  const [hh, mm] = timeStr.split(':').map(Number);
  if (isNaN(hh) || isNaN(mm)) return null;
  return hh * 60 + mm;
}

/**
 * Checks if train telemetry is stale (>15 minutes threshold as per Indian Railways operating rules)
 */
export function isTelemetryStale(
  train: LiveTrainPosition & { 
    isStale?: boolean; 
    telemetryStale?: boolean; 
    telemetryAgeMinutes?: number;
  },
  maxAgeMinutes: number = 15
): boolean {
  if (train.isStale === true || train.telemetryStale === true) return true;
  if (typeof train.telemetryAgeMinutes === 'number' && train.telemetryAgeMinutes > maxAgeMinutes) return true;

  const rawTimestamp = train.upstreamUpdatedAt || train.telemetryTimestamp || train.lastUpdated;
  if (!rawTimestamp) return false;

  const ts = new Date(rawTimestamp).getTime();
  if (!isNaN(ts)) {
    const ageMinutes = (Date.now() - ts) / (60 * 1000);
    if (ageMinutes > maxAgeMinutes) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a train has completed its journey or arrived at its final destination/terminal
 */
export function hasJourneyCompleted(
  train: LiveTrainPosition & { 
    isTerminated?: boolean; 
    journeyCompleted?: boolean; 
    destinationStation?: string;
  }
): boolean {
  const rawStatusUpper = String(train.status || '').toUpperCase();
  const terminalStatuses = ['TERMINATED', 'ARRIVED', 'COMPLETED', 'JOURNEY_COMPLETED', 'AT_DESTINATION', 'FINISHED', 'TERMINAL'];
  if (terminalStatuses.includes(rawStatusUpper)) return true;
  if (train.journeyCompleted === true || train.isTerminated === true) return true;
  const dest = train.destinationStation;
  const isAtDestStation = Boolean(dest && train.currentStation && train.currentStation === dest);
  return isAtDestStation && (train.nextStation === '—' || !train.nextStation || train.nextStation === train.currentStation || rawStatusUpper === 'ARRIVED' || rawStatusUpper === 'COMPLETED');
}

/**
 * Classifies the operational interaction between a real train and a maintenance possession area.
 * Strictly adheres to Section 1–16 of the Rail Samnvay Proximity Rules:
 * LIVE TRAIN -> RUN IDENTITY -> CURRENT POSITION -> VALIDATED ROUTE -> RAILWAY SECTION ->
 * TRACK/LINE -> DIRECTION -> WORK ZONE -> ROUTE DISTANCE -> PROXIMITY -> ETA -> INTERACTION
 */
export function classifyTrainWorkInteraction(
  train: LiveTrainPosition & {
    routeCode?: string;
    routeStations?: string[];
    corridorId?: string;
    routeGeometryUnavailable?: boolean;
    routeAvailable?: boolean;
    routeGeometryStatus?: string;
    onDifferentRoute?: boolean;
    isStale?: boolean;
    telemetryStale?: boolean;
    telemetryAgeMinutes?: number;
    projectedArrivalTime?: string;
    candidateBlockOverlap?: boolean;
    originStation?: string;
    destinationStation?: string;
    isTerminated?: boolean;
    journeyCompleted?: boolean;
    remainingStations?: string[];
    source?: string;
    track?: string;
    trackName?: string;
  },
  work: WorkLocationParams & {
    corridorId?: string;
    referenceTime?: string | Date;
    referenceMinutes?: number;
    blockStartMinutes?: number;
    blockEndMinutes?: number;
    isActiveNow?: boolean;
    stationCode?: string;
    station?: string;
  },
  dataSource: DataSource = 'LIVE'
): {
  state: TrainMaintenanceInteractionState;
  distanceKm: number | null;
  etaMinutes: number | null;
  projectedEta: string | null;
  severity: 'HARD_CONFLICT' | 'POTENTIAL_CONFLICT' | 'ADVISORY' | 'NONE' | 'UNKNOWN';
  reason: string;
  requiresAttention?: boolean;
  cannotGenerateLiveAlert?: boolean;
  isSimulation?: boolean;
} {
  const workKmStart = Math.min(work.startKm, work.endKm);
  const workKmEnd = Math.max(work.startKm, work.endKm);
  const workTrackName = work.track || work.affectedTracks?.[0] || 'UP Main';
  const workSectionId = work.sectionId || work.section;
  const proximityThreshold = work.proximityThresholdKm ?? 30.0; // Default 30 km operational threshold

  // 1. LIVE DATA REQUIREMENT (Section 2)
  // Operational alerts may ONLY originate from genuine live RailRadar train records
  const isGenuineLive = (dataSource === 'LIVE' || train.source === 'LIVE' || train.source === 'RAILRADAR_LIVE') && dataSource !== 'DEMO' && train.source !== 'DEMO' && dataSource !== 'UNAVAILABLE';
  const cannotGenerateLiveAlert = !isGenuineLive;

  // 2. JOURNEY COMPLETION & TERMINAL STATUS CHECK (Section 1 & 5)
  // A train that has reached its final destination or terminated must NOT be treated as approaching
  const rawStatusUpper = String(train.status || '').toUpperCase();
  const terminalStatuses = ['TERMINATED', 'ARRIVED', 'COMPLETED', 'JOURNEY_COMPLETED', 'AT_DESTINATION', 'FINISHED', 'TERMINAL'];
  const isLevel1Terminal = terminalStatuses.includes(rawStatusUpper);
  const isLevel2Flag = train.journeyCompleted === true || train.isTerminated === true;
  const dest = train.destinationStation;
  const isAtDestStation = Boolean(dest && train.currentStation && train.currentStation === dest);
  const isLevel3Confirmed = isAtDestStation && (train.nextStation === '—' || !train.nextStation || train.nextStation === train.currentStation || rawStatusUpper === 'ARRIVED' || rawStatusUpper === 'COMPLETED');

  if (isLevel1Terminal || isLevel2Flag || isLevel3Confirmed) {
    return {
      state: 'NO_INTERACTION',
      distanceKm: null,
      etaMinutes: null,
      projectedEta: null,
      severity: 'NONE',
      reason: 'TRAIN_JOURNEY_COMPLETED_AT_TERMINAL',
      requiresAttention: false,
      cannotGenerateLiveAlert: true,
      isSimulation: !isGenuineLive
    };
  }

  // 3. TELEMETRY FRESHNESS CHECK (Section 6 & 10)
  // Stale Telemetry (>15 min) -> UNKNOWN, requiresAttention = true
  if (isTelemetryStale(train, 15)) {
    return {
      state: 'UNKNOWN',
      distanceKm: null,
      etaMinutes: null,
      projectedEta: null,
      severity: 'UNKNOWN',
      reason: 'STALE_TELEMETRY',
      requiresAttention: true,
      cannotGenerateLiveAlert: true,
      isSimulation: !isGenuineLive
    };
  }

  // 4. ROUTE GEOMETRY & MAPPING VALIDITY (Section 8)
  const isRouteUnavailable = 
    train.routeGeometry === null || 
    train.routeGeometryUnavailable === true ||
    train.routeAvailable === false ||
    train.routeGeometryStatus === 'UNAVAILABLE';

  if (isRouteUnavailable) {
    return {
      state: 'UNKNOWN',
      distanceKm: null,
      etaMinutes: null,
      projectedEta: null,
      severity: 'UNKNOWN',
      reason: 'INSUFFICIENT_ROUTE_MAPPING',
      requiresAttention: true,
      cannotGenerateLiveAlert: true,
      isSimulation: !isGenuineLive
    };
  }

  // Telemetry integrity check
  const isTelemetryUnknown = 
    dataSource === 'UNAVAILABLE' || 
    train.confidence === 'UNKNOWN' || 
    typeof train.currentKm !== 'number' ||
    isNaN(train.currentKm);

  if (isTelemetryUnknown) {
    return {
      state: 'UNKNOWN',
      distanceKm: null,
      etaMinutes: null,
      projectedEta: null,
      severity: 'UNKNOWN',
      reason: 'INSUFFICIENT_ROUTE_MAPPING',
      requiresAttention: true,
      cannotGenerateLiveAlert: true,
      isSimulation: !isGenuineLive
    };
  }

  // Authoritative work zone infrastructure mapping check
  if (workSectionId && workSectionId.startsWith('SEC-')) {
    const secRecord = STANDARD_CORRIDOR_SECTIONS[workSectionId];
    if (secRecord) {
      if (workKmStart < secRecord.startKm || workKmEnd > secRecord.endKm) {
        return {
          state: 'UNKNOWN',
          distanceKm: null,
          etaMinutes: null,
          projectedEta: null,
          severity: 'UNKNOWN',
          reason: 'WORK_ZONE_CHAINAGE_OUT_OF_BOUNDS',
          requiresAttention: true,
          cannotGenerateLiveAlert: true,
          isSimulation: !isGenuineLive
        };
      }
    }
  }

  // 5. REMAINING ROUTE COMPATIBILITY & PHYSICAL REACH (Section 7, 8, 9)
  // Distinguish historical route from remaining route
  let isRemainingRouteExcludes = false;

  if (Array.isArray(train.remainingStations)) {
    const workStation = work.stationCode || work.station;
    if (workStation && !train.remainingStations.includes(workStation)) {
      isRemainingRouteExcludes = true;
    }
    if (work.routeStations && Array.isArray(work.routeStations) && work.routeStations.length > 0) {
      const hasOverlap = work.routeStations.some(s => train.remainingStations!.includes(s));
      if (!hasOverlap) {
        isRemainingRouteExcludes = true;
      }
    }
  }

  if (train.onDifferentRoute === true || isRemainingRouteExcludes) {
    return {
      state: 'NO_INTERACTION',
      distanceKm: null,
      etaMinutes: null,
      projectedEta: null,
      severity: 'NONE',
      reason: 'REMAINING_ROUTE_EXCLUDES_WORK_ZONE',
      requiresAttention: false,
      cannotGenerateLiveAlert: true,
      isSimulation: !isGenuineLive
    };
  }

  // Check route code & corridor compatibility
  let isDifferentRoute = 
    Boolean(train.routeCode && work.routeCode && train.routeCode !== work.routeCode) ||
    Boolean(train.corridorId && work.corridorId && train.corridorId !== work.corridorId);

  // Station route overlap check if available
  if (!isDifferentRoute && train.routeStations && work.routeStations) {
    if (Array.isArray(train.routeStations) && Array.isArray(work.routeStations)) {
      isDifferentRoute = !train.routeStations.some(s => work.routeStations!.includes(s));
    }
  }

  // Spatial corridor validation using live station or GPS coordinates
  const isCorridorWork = workSectionId && ['SEC-A', 'SEC-B', 'SEC-C'].includes(workSectionId);
  const corridorStationCodes = ['BZA', 'KCC', 'MAG', 'NBR', 'GNT', 'VJA', 'TEL'];

  if (isCorridorWork && train.currentStation && !corridorStationCodes.includes(train.currentStation)) {
    if (train.latitude != null && train.longitude != null) {
      const distToCorridor = haversineDistanceKm(train.latitude, train.longitude, 16.5193, 80.6231);
      if (distToCorridor > 60.0) {
        isDifferentRoute = true;
      }
    } else {
      isDifferentRoute = true;
    }
  }

  // Nationwide Bhopal area check for KM 702
  if (workKmStart >= 650 && workKmStart <= 750) {
    if (train.latitude != null && train.longitude != null) {
      const distToWork = haversineDistanceKm(train.latitude, train.longitude, 23.2599, 77.4126);
      if (distToWork > 60.0) {
        isDifferentRoute = true;
      }
    } else if (train.currentStation && !['BPL', 'HBJ', 'RKMP'].includes(train.currentStation)) {
      isDifferentRoute = true;
    }
  }

  if (isDifferentRoute) {
    return {
      state: 'NO_INTERACTION',
      distanceKm: null,
      etaMinutes: null,
      projectedEta: null,
      severity: 'NONE',
      reason: 'REMAINING_ROUTE_EXCLUDES_WORK_ZONE',
      requiresAttention: false,
      cannotGenerateLiveAlert: true,
      isSimulation: !isGenuineLive
    };
  }

  // 6. DIRECTION VALIDATION (Section 10)
  const rawDirection = String(train.direction || '').toUpperCase().trim();
  const direction = (rawDirection === 'DOWN' || rawDirection === 'DN') ? 'DN' : (rawDirection === 'UP') ? 'UP' : null;
  if (!direction) {
    return {
      state: 'UNKNOWN',
      distanceKm: null,
      etaMinutes: null,
      projectedEta: null,
      severity: 'UNKNOWN',
      reason: 'MISSING_DIRECTION',
      requiresAttention: true,
      cannotGenerateLiveAlert: true,
      isSimulation: !isGenuineLive
    };
  }

  // 7. TRACK COMPATIBILITY CHECK (Section 9)
  const trainTrackName = String(train.track || train.trackName || '').toUpperCase();
  if (trainTrackName.includes('UNMAPPED') || trainTrackName.includes('UNKNOWN') || trainTrackName.includes('INVALID') || trainTrackName.includes('UNVERIFIED')) {
    return {
      state: 'UNKNOWN',
      distanceKm: null,
      etaMinutes: null,
      projectedEta: null,
      severity: 'UNKNOWN',
      reason: 'INSUFFICIENT_TRACK_MAPPING',
      requiresAttention: true,
      cannotGenerateLiveAlert: true,
      isSimulation: !isGenuineLive
    };
  }

  if (workTrackName.includes('UP') && direction === 'DN') {
    return {
      state: 'NO_INTERACTION',
      distanceKm: null,
      etaMinutes: null,
      projectedEta: null,
      severity: 'NONE',
      reason: `Train ${train.trainNumber} is travelling on DOWN line and does not affect ${workTrackName} work zone.`,
      requiresAttention: false,
      cannotGenerateLiveAlert: true,
      isSimulation: !isGenuineLive
    };
  }
  if (workTrackName.includes('DOWN') && direction === 'UP') {
    return {
      state: 'NO_INTERACTION',
      distanceKm: null,
      etaMinutes: null,
      projectedEta: null,
      severity: 'NONE',
      reason: `Train ${train.trainNumber} is travelling on UP line and does not affect ${workTrackName} work zone.`,
      requiresAttention: false,
      cannotGenerateLiveAlert: true,
      isSimulation: !isGenuineLive
    };
  }

  const trainKm = train.currentKm;

  // 8. PHYSICAL OCCUPANCY INSIDE WORK BOUNDARIES (Section 12)
  if (trainKm >= workKmStart && trainKm <= workKmEnd) {
    return {
      state: 'IN_AFFECTED_RANGE',
      distanceKm: 0,
      etaMinutes: 0,
      projectedEta: 'NOW',
      severity: 'HARD_CONFLICT',
      reason: `Train ${train.trainNumber} is physically occupied within KM ${workKmStart.toFixed(1)} – ${workKmEnd.toFixed(1)}.`,
      requiresAttention: true,
      cannotGenerateLiveAlert,
      isSimulation: !isGenuineLive
    };
  }

  // 9. DIRECTIONAL MOVEMENT & RECEDING CHECK (Section 10 & 11)
  let isApproaching = false;
  let distanceAlongRoute = 0;

  if (direction === 'UP') {
    if (trainKm < workKmStart) {
      isApproaching = true;
      distanceAlongRoute = workKmStart - trainKm;
    } else {
      isApproaching = false;
      distanceAlongRoute = trainKm - workKmEnd;
    }
  } else {
    if (trainKm > workKmEnd) {
      isApproaching = true;
      distanceAlongRoute = trainKm - workKmEnd;
    } else {
      isApproaching = false;
      distanceAlongRoute = workKmStart - trainKm;
    }
  }

  distanceAlongRoute = Math.max(0, Math.round(distanceAlongRoute * 10) / 10);

  if (!isApproaching) {
    return {
      state: 'NO_INTERACTION',
      distanceKm: distanceAlongRoute,
      etaMinutes: null,
      projectedEta: null,
      severity: 'NONE',
      reason: 'TRAIN_RECEDING_FROM_WORK_ZONE',
      requiresAttention: false,
      cannotGenerateLiveAlert: true,
      isSimulation: !isGenuineLive
    };
  }

  // 10. SPEED & DYNAMIC ETA CALCULATION
  const hasValidSpeed = typeof train.speedKmph === 'number' && train.speedKmph > 0;
  const effectiveSpeed = hasValidSpeed ? train.speedKmph : 40;
  const etaMins = Math.round((distanceAlongRoute / effectiveSpeed) * 60);

  let projectedEta: string | null = null;
  if (typeof train.projectedArrivalTime === 'string') {
    projectedEta = train.projectedArrivalTime;
  } else if (etaMins !== null) {
    const refDate = work.referenceTime ? new Date(work.referenceTime) : new Date();
    const arrivalDate = new Date(refDate.getTime() + etaMins * 60000);
    projectedEta = arrivalDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  } else {
    projectedEta = 'UNKNOWN';
  }

  // 11. MAINTENANCE WINDOW OVERLAP CHECK (Section 13, 14, 15, 16)
  const hasExplicitOverlap = train.candidateBlockOverlap === true;
  if (hasExplicitOverlap) {
    return {
      state: 'POTENTIAL_CONFLICT',
      distanceKm: distanceAlongRoute,
      etaMinutes: etaMins,
      projectedEta,
      severity: 'POTENTIAL_CONFLICT',
      reason: `Train ${train.trainNumber} route intersects section and projected arrival overlaps candidate block window ${work.blockStartTime || ''}–${work.blockEndTime || ''}.`,
      requiresAttention: true,
      cannotGenerateLiveAlert,
      isSimulation: !isGenuineLive
    };
  }

  // Case A: Work is currently active right now in the field
  if (work.isActiveNow === true) {
    if (distanceAlongRoute > proximityThreshold) {
      return {
        state: 'NO_INTERACTION',
        distanceKm: distanceAlongRoute,
        etaMinutes: null,
        projectedEta: null,
        severity: 'NONE',
        reason: `Train ${train.trainNumber} is ${distanceAlongRoute} km away along route, outside active approaching proximity threshold (${proximityThreshold} km).`,
        requiresAttention: false,
        cannotGenerateLiveAlert: true,
        isSimulation: !isGenuineLive
      };
    }
    return {
      state: 'APPROACHING',
      distanceKm: distanceAlongRoute,
      etaMinutes: etaMins,
      projectedEta,
      severity: distanceAlongRoute <= 15 ? 'POTENTIAL_CONFLICT' : 'ADVISORY',
      reason: `Live train is actively approaching work zone on ${direction} line (${distanceAlongRoute} km, ETA: ${projectedEta}).`,
      requiresAttention: distanceAlongRoute <= 15,
      cannotGenerateLiveAlert,
      isSimulation: !isGenuineLive
    };
  }

  // Case B: Scheduled block window is specified
  const blockStart = parseTimeToMinutes(work.blockStartTime);
  const blockEnd = parseTimeToMinutes(work.blockEndTime);
  const arrivalMinutes = parseTimeToMinutes(projectedEta);

  if (blockStart !== null && blockEnd !== null && arrivalMinutes !== null) {
    const headwayMargin = 15;
    const trainArrivalStart = arrivalMinutes - headwayMargin;
    const trainArrivalEnd = arrivalMinutes + headwayMargin;

    const hasExplicitOverlap = train.candidateBlockOverlap === true;
    const hasWindowOverlap = hasExplicitOverlap || (trainArrivalStart <= blockEnd && trainArrivalEnd >= blockStart);

    if (!hasWindowOverlap) {
      return {
        state: 'NO_INTERACTION',
        distanceKm: distanceAlongRoute,
        etaMinutes: etaMins,
        projectedEta,
        severity: 'NONE',
        reason: 'NO_TIME_OVERLAP',
        requiresAttention: false,
        cannotGenerateLiveAlert: true,
        isSimulation: !isGenuineLive
      };
    }

    // Overlaps the maintenance window!
    if (distanceAlongRoute > proximityThreshold) {
      return {
        state: 'NO_INTERACTION',
        distanceKm: distanceAlongRoute,
        etaMinutes: etaMins,
        projectedEta,
        severity: 'NONE',
        reason: `Train arrival coincides with block window but train is currently ${distanceAlongRoute} km away along route, outside active approaching proximity threshold (${proximityThreshold} km).`,
        requiresAttention: false,
        cannotGenerateLiveAlert: true,
        isSimulation: !isGenuineLive
      };
    }

    return {
      state: 'POTENTIAL_CONFLICT',
      distanceKm: distanceAlongRoute,
      etaMinutes: etaMins,
      projectedEta,
      severity: 'POTENTIAL_CONFLICT',
      reason: `Projected arrival ${projectedEta} coincides with planned block window ${work.blockStartTime}–${work.blockEndTime}.`,
      requiresAttention: true,
      cannotGenerateLiveAlert,
      isSimulation: !isGenuineLive
    };
  }

  // Case C: No block window specified and not marked active
  if (distanceAlongRoute > proximityThreshold) {
    return {
      state: 'NO_INTERACTION',
      distanceKm: distanceAlongRoute,
      etaMinutes: null,
      projectedEta: null,
      severity: 'NONE',
      reason: `Train ${train.trainNumber} is ${distanceAlongRoute} km away along route, outside active approaching proximity threshold (${proximityThreshold} km).`,
      requiresAttention: false,
      cannotGenerateLiveAlert: true,
      isSimulation: !isGenuineLive
    };
  }

  return {
    state: 'APPROACHING',
    distanceKm: distanceAlongRoute,
    etaMinutes: etaMins,
    projectedEta,
    severity: distanceAlongRoute <= 15 ? 'POTENTIAL_CONFLICT' : 'ADVISORY',
    reason: `Live train is on the same validated railway section and affected track, travelling toward KM ${workKmStart.toFixed(1)}–${workKmEnd.toFixed(1)}, with ${distanceAlongRoute} km route distance and fresh telemetry.`,
    requiresAttention: distanceAlongRoute <= 15,
    cannotGenerateLiveAlert,
    isSimulation: !isGenuineLive
  };
}

/**
 * Traces the complete train-to-work proximity calculation for diagnostic inspection (Section 11).
 * Logs and returns all operational parameters, route matching, and interaction reasons.
 */
export function traceTrainWorkProximity(
  train: LiveTrainPosition & any,
  work: WorkLocationParams & any,
  dataSource: DataSource = 'LIVE'
): ProximityTraceLog {
  const result = classifyTrainWorkInteraction(train, work, dataSource);
  const workKmStart = Math.min(work.startKm, work.endKm);
  const workKmEnd = Math.max(work.startKm, work.endKm);
  const rawTs = train.upstreamUpdatedAt || train.telemetryTimestamp || train.lastUpdated || '';
  const parsedTs = rawTs ? new Date(rawTs).getTime() : NaN;
  const ageMin = !isNaN(parsedTs) ? (Date.now() - parsedTs) / 60000 : null;
  const ageStr = ageMin !== null ? `${Math.max(0, Math.round(ageMin))}m` : 'UNKNOWN';

  const log: ProximityTraceLog = {
    trainNumber: train.trainNumber,
    runIdentity: train.runId || buildRunIdentity(train),
    telemetryTimestamp: rawTs,
    telemetryAge: ageStr,
    latitude: typeof train.latitude === 'number' ? train.latitude : null,
    longitude: typeof train.longitude === 'number' ? train.longitude : null,
    routeId: train.routeCode || train.corridorId || 'IR-ROUTE',
    sectionId: train.sectionId || 'SECTION-LIVE',
    trackId: train.trackId || (train.direction ? `${train.direction} Main` : 'UNKNOWN'),
    trackName: train.track || (train.direction ? `${train.direction} Main` : 'UNKNOWN'),
    direction: (train.direction === 'UP' || train.direction === 'DN') ? train.direction : 'UNKNOWN',
    workRequestId: work.requestId || work.id || 'REQ-UNKNOWN',
    workRouteId: work.routeCode || work.corridorId || 'CORRIDOR-MAIN',
    workSectionId: work.sectionId || work.section || 'SECTION-UNKNOWN',
    workTrackId: work.track || work.affectedTracks?.[0] || 'UP Main',
    workKmStart,
    workKmEnd,
    routeMatch: result.state !== 'NO_INTERACTION' && result.state !== 'UNKNOWN',
    sectionMatch: result.state !== 'NO_INTERACTION' && result.state !== 'UNKNOWN',
    trackMatch: result.state !== 'NO_INTERACTION' && result.state !== 'UNKNOWN',
    directionMatch: result.state === 'APPROACHING' || result.state === 'IN_AFFECTED_RANGE' || result.state === 'POTENTIAL_CONFLICT',
    distanceAlongRouteKm: result.distanceKm,
    speed: train.speedKmph || 0,
    etaMinutes: result.etaMinutes,
    interactionState: result.state,
    confidence: train.confidence || (dataSource === 'LIVE' ? 'HIGH' : 'LOW'),
    reason: result.reason
  };

  return log;
}

/**
 * Finds and analyzes all relevant/nearby trains for a given maintenance possession zone.
 */
export function getNearbyTrainsForLocation(
  work: WorkLocationParams,
  liveTrains: LiveTrainPosition[],
  dataSource: DataSource = 'LIVE'
): NearbyTrainMovementIntelligence[] {
  if (!liveTrains || liveTrains.length === 0) {
    return [];
  }

  const results: NearbyTrainMovementIntelligence[] = [];

  for (const train of liveTrains) {
    const analysis = classifyTrainWorkInteraction(train, work, dataSource);

    // Filter relevant trains: either in affected range, approaching within 60 km, or potential conflict
    const isRelevant = 
      analysis.state === 'IN_AFFECTED_RANGE' ||
      analysis.state === 'POTENTIAL_CONFLICT' ||
      analysis.state === 'UNKNOWN' ||
      (analysis.distanceKm !== null && analysis.distanceKm <= 60);

    if (isRelevant) {
      results.push({
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        runId: train.runId || buildRunIdentity(train.trainNumber, train.serviceDate || train.startDate),
        serviceDate: train.serviceDate || train.startDate,
        currentKm: train.currentKm ?? 0,
        currentLocationDescription: train.currentStationName || train.currentStation || `KM ${train.currentKm?.toFixed(1) || '—'}`,
        distanceToWorkAreaKm: analysis.distanceKm,
        projectedEta: analysis.projectedEta,
        etaMinutes: analysis.etaMinutes,
        speedKmph: train.speedKmph || 0,
        delayMinutes: train.delayMinutes || 0,
        direction: train.direction || 'UP',
        track: work.track || 'Main',
        status: train.status || 'RUNNING',
        confidence: train.confidence || (dataSource === 'LIVE' ? 'HIGH' : 'MEDIUM'),
        interactionState: analysis.state,
        conflictSeverity: analysis.severity,
        conflictReason: analysis.reason,
        lastTelemetryTimestamp: train.upstreamUpdatedAt || train.lastUpdated
      });
    }
  }

  // Sort by priority: HARD_CONFLICT first, then POTENTIAL_CONFLICT, then shortest distance
  return results.sort((a, b) => {
    const score = (item: NearbyTrainMovementIntelligence) => {
      if (item.interactionState === 'IN_AFFECTED_RANGE') return 1000;
      if (item.interactionState === 'POTENTIAL_CONFLICT') return 500;
      if (item.interactionState === 'APPROACHING') return 200 - (item.distanceToWorkAreaKm || 999);
      if (item.interactionState === 'UNKNOWN') return 100;
      return 0;
    };
    return score(b) - score(a);
  });
}
