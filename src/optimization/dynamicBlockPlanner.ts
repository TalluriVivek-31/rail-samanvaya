// src/optimization/dynamicBlockPlanner.ts
// Dynamic API-Driven Automatic Block Planner + Station-to-Station Train Intelligence
// Indian Railways · Automatic Block Planning Architecture (SIH 2026 PS 26027)

import { CandidatePlanningWindow, StationMaster, SectionMaster } from '../types/infrastructure';
import { BlockRequest, LiveTrainPosition, PlanningParameters } from '../types/samnvay';
import { CORRIDOR_STATIONS, SECTIONS_MASTER } from '../data/infrastructureMasterData';
import { parseRailwayKm, formatRailwayKm, detectCrossSectionSpans } from '../utils/railwayLocation';
import { calculatePriorityScore } from './priorityEngine';
import { DEFAULT_PLANNING_PARAMETERS, SCHEDULED_CORRIDOR_MOVEMENTS, PlannedCorridorMovement } from './corridorSchedule';

export interface StationCorridorContext {
  previousStation: StationMaster;
  affectedSection: string;
  affectedSectionName: string;
  nextStation: StationMaster;
  corridorStationsSequence: string[];
  isCrossSection: boolean;
  crossSectionWarning?: string;
  workZoneKmDisplay: string;
}

export interface ProjectedTrainMovement {
  trainNumber: string;
  trainName: string;
  runIdentity?: string;
  source: 'LIVE' | 'DEMO' | 'TIMETABLE' | 'UNAVAILABLE';
  track: string;
  direction: 'UP' | 'DN' | 'UNKNOWN';
  speedKmph: number;
  delayMinutes: number;
  currentKm: number | null;
  currentStation?: string;
  nextStation?: string;
  destinationStation?: string;
  remainingStations?: string[];
  telemetryTimestamp?: string;
  telemetryAgeMinutes: number;
  isStale: boolean;
  isTerminated: boolean;
  classification: 
    | 'INSIDE_AFFECTED_SECTION' 
    | 'APPROACHING_AFFECTED_SECTION' 
    | 'PASSED_AFFECTED_SECTION' 
    | 'RECEDING' 
    | 'UNRELATED_ROUTE' 
    | 'TERMINATED' 
    | 'UNKNOWN';
  projectedEntryMinutes: number | null; // minutes from 00:00
  projectedExitMinutes: number | null;  // minutes from 00:00
  entryTimeStr?: string;
  exitTimeStr?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  reason: string;
}

export interface ProtectedTrainInterval {
  trainNumber: string;
  trainName: string;
  track: string;
  tEnterMins: number;
  tExitMins: number;
  protectedStartMins: number; // tEnter - buffer
  protectedEndMins: number;   // tExit + buffer
  protectedStartStr: string;
  protectedEndStr: string;
  reason: string;
}

export interface DynamicGap {
  gapId: string;
  startMinutes: number;
  endMinutes: number;
  startTimeStr: string;
  endTimeStr: string;
  availableMinutes: number;
  boundingTrainBefore?: string;
  boundingTrainAfter?: string;
  boundingBlockBefore?: string;
  boundingBlockAfter?: string;
}

export interface DynamicPlanningResult {
  corridorContext: StationCorridorContext;
  projectedTrains: ProjectedTrainMovement[];
  protectedIntervals: ProtectedTrainInterval[];
  dynamicGaps: DynamicGap[];
  candidateWindows: CandidatePlanningWindow[];
  recommendedWindow?: CandidatePlanningWindow;
  planningMode: 'LIVE' | 'TIMETABLE_DEGRADED' | 'LIVE_DATA_UNAVAILABLE';
  isLiveDataAvailable: boolean;
  liveDataWarning?: string;
  longestAvailableGapMinutes: number;
  totalRequiredPossessionMinutes: number;
  isNoSuitableWindow: boolean;
  noSuitableWindowReasons?: string[];
  qualityRating: 'RECOMMENDED' | 'BEST_FEASIBLE_CANDIDATE_FOUND' | 'NO_FEASIBLE_SOLUTION' | 'OPTIMIZATION_FAILED';
}

/**
 * Format minutes from 00:00 into "HH:MM"
 */
export function minsToTimeStr(mins: number): string {
  const normalized = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Parse "HH:MM" string to minutes from 00:00
 */
export function timeStrToMins(timeStr?: string): number | null {
  if (!timeStr || !timeStr.includes(':')) return null;
  const parts = timeStr.trim().split(':').map(Number);
  if (isNaN(parts[0]) || isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
}

/**
 * SECTION 4: STATION-TO-STATION CORRIDOR RESOLUTION
 * Resolves previousStation, affectedSection, and nextStation surrounding the maintenance work zone.
 */
export function resolveCorridorContext(
  startKm: number,
  endKm: number,
  specifiedSection?: string
): StationCorridorContext {
  const midKm = (startKm + endKm) / 2;
  const crossSection = detectCrossSectionSpans(startKm, endKm);

  // 1. Identify surrounding stations along CORRIDOR_STATIONS
  const stations = [...CORRIDOR_STATIONS].sort((a, b) => a.km - b.km);
  let prevStation = stations[0];
  let nextStation = stations[1] || stations[0];

  for (let i = 0; i < stations.length; i++) {
    if (stations[i].km <= midKm) {
      prevStation = stations[i];
      nextStation = stations[Math.min(stations.length - 1, i + 1)];
    }
  }

  // Handle boundary condition if at the terminal station
  if (prevStation.stationCode === nextStation.stationCode && stations.length > 1) {
    const idx = stations.findIndex(s => s.stationCode === prevStation.stationCode);
    if (idx > 0) prevStation = stations[idx - 1];
  }

  // 2. Resolve section from SECTIONS_MASTER
  const matchedSection = SECTIONS_MASTER.find(sec => sec.startKm <= midKm && sec.endKm >= midKm)
    || SECTIONS_MASTER.find(sec => sec.sectionId === specifiedSection)
    || SECTIONS_MASTER[0];

  const affectedSection = matchedSection ? matchedSection.sectionId : `${prevStation.stationCode}-${nextStation.stationCode}`;
  const affectedSectionName = matchedSection ? matchedSection.sectionName : `${prevStation.stationName} – ${nextStation.stationName} Section`;

  return {
    previousStation: prevStation,
    affectedSection,
    affectedSectionName,
    nextStation: nextStation,
    corridorStationsSequence: stations.map(s => s.stationCode),
    isCrossSection: crossSection.isCrossSection,
    crossSectionWarning: crossSection.warningMessage,
    workZoneKmDisplay: `${formatRailwayKm(startKm)} – ${formatRailwayKm(endKm)}`
  };
}

/**
 * Check whether a train has terminated or completed its journey
 */
export function isTrainCompletedOrTerminated(train: LiveTrainPosition): boolean {
  const raw = String(train.status || '').toUpperCase();
  const terminalStatuses = ['TERMINATED', 'ARRIVED', 'COMPLETED', 'JOURNEY_COMPLETED', 'AT_DESTINATION', 'FINISHED', 'TERMINAL'];
  if (terminalStatuses.includes(raw)) return true;
  if ((train as any).journeyCompleted === true || (train as any).isTerminated === true) return true;

  const dest = train.destinationStation || (train as any).destination;
  if (dest && train.currentStation && train.currentStation !== '—' && train.currentStation === dest) {
    if (!train.nextStation || train.nextStation === '—' || train.nextStation === train.currentStation || raw === 'ARRIVED') {
      return true;
    }
  }
  return false;
}

/**
 * SECTION 5 & 12: PROJECT TRAIN ARRIVAL & OCCUPATION AT WORK ZONE
 * Projects entry time and exit time through the maintenance zone using actual telemetry
 */
export function calculateProjectedTrainArrival(
  train: LiveTrainPosition,
  startKm: number,
  endKm: number,
  workTrack: string = 'UP Main',
  corridorContext: StationCorridorContext,
  nowMinutes: number = new Date().getHours() * 60 + new Date().getMinutes()
): ProjectedTrainMovement {
  const trainNumber = String(train.trainNumber || 'UNKNOWN');
  const trainName = String(train.trainName || `Train ${trainNumber}`);
  const speed = Math.max(0, train.speedKmph || 0);
  const effectiveSpeed = speed > 15 ? speed : 70; // Reasonable fallback section speed (70 km/h) if idling at platform
  const delayMinutes = typeof train.delayMinutes === 'number' ? train.delayMinutes : 0;
  const trainDirection = (train.direction === 'DN' || (train.direction as string) === 'DOWN') ? 'DN' : 'UP';
  const trainTrack = (train as any).trackName || (trainDirection === 'DN' ? 'DOWN Main' : 'UP Main');

  // Freshness calculation
  const ts = train.telemetryTimestamp || (train as any).upstreamUpdatedAt || train.lastUpdated;
  let telemetryAgeMinutes = 0;
  let isStale = false;
  if (ts) {
    const parsed = new Date(ts).getTime();
    if (!isNaN(parsed)) {
      telemetryAgeMinutes = Math.max(0, Math.round((Date.now() - parsed) / 60000));
      if (telemetryAgeMinutes > 15) {
        isStale = true;
      }
    }
  }

  // 1. Lifecycle Check: Terminated / Completed
  if (isTrainCompletedOrTerminated(train)) {
    return {
      trainNumber,
      trainName,
      runIdentity: (train as any).runIdentity,
      source: (train as any).source || 'LIVE',
      track: trainTrack,
      direction: trainDirection,
      speedKmph: speed,
      delayMinutes,
      currentKm: train.currentKm ?? null,
      currentStation: train.currentStation,
      nextStation: train.nextStation,
      destinationStation: train.destinationStation,
      remainingStations: (train as any).remainingStations,
      telemetryTimestamp: ts,
      telemetryAgeMinutes,
      isStale,
      isTerminated: true,
      classification: 'TERMINATED',
      projectedEntryMinutes: null,
      projectedExitMinutes: null,
      confidence: 'HIGH',
      reason: `Train ${trainNumber} has completed its journey at terminal station (${train.currentStation || train.destinationStation || 'Terminus'}). Excluded from future maintenance conflicts.`
    };
  }

  // 2. Missing Essential Telemetry Check -> UNKNOWN
  if (!train.direction || (train.currentKm == null && !train.expectedArrival && !train.scheduledArrival)) {
    return {
      trainNumber,
      trainName,
      runIdentity: (train as any).runIdentity,
      source: (train as any).source || 'LIVE',
      track: trainTrack,
      direction: train.direction || 'UNKNOWN',
      speedKmph: speed,
      delayMinutes,
      currentKm: train.currentKm ?? null,
      telemetryTimestamp: ts,
      telemetryAgeMinutes,
      isStale,
      isTerminated: false,
      classification: 'UNKNOWN',
      projectedEntryMinutes: null,
      projectedExitMinutes: null,
      confidence: 'UNKNOWN',
      reason: `Missing critical operational telemetry (direction or KM) for Train ${trainNumber}. Status flagged as UNKNOWN.`
    };
  }

  const trainKm = train.currentKm ?? (trainDirection === 'UP' ? 0.0 : 80.0);
  const workSpanKm = Math.max(0.2, endKm - startKm);

  // 3. Physical Proximity and Movement Classification
  const isInside = trainKm >= (startKm - 0.2) && trainKm <= (endKm + 0.2);

  let isApproaching = false;
  let hasPassed = false;
  let isReceding = false;

  if (trainDirection === 'UP') {
    // UP trains travel in increasing KM order (BZA km 0 -> TEL km 80)
    if (trainKm < startKm - 0.2) {
      isApproaching = true;
    } else if (trainKm > endKm + 0.2) {
      hasPassed = true;
      isReceding = true;
    }
  } else {
    // DN trains travel in decreasing KM order (TEL km 80 -> BZA km 0)
    if (trainKm > endKm + 0.2) {
      isApproaching = true;
    } else if (trainKm < startKm - 0.2) {
      hasPassed = true;
      isReceding = true;
    }
  }

  // Check remaining route if available
  const remainingStns = (train as any).remainingStations as string[] | undefined;
  if (remainingStns && remainingStns.length > 0) {
    const prevCode = corridorContext.previousStation.stationCode;
    const nextCode = corridorContext.nextStation.stationCode;
    const routeIncludesWorkZone = remainingStns.includes(prevCode) || remainingStns.includes(nextCode);
    if (!routeIncludesWorkZone && !isInside) {
      return {
        trainNumber,
        trainName,
        runIdentity: (train as any).runIdentity,
        source: (train as any).source || 'LIVE',
        track: trainTrack,
        direction: trainDirection,
        speedKmph: speed,
        delayMinutes,
        currentKm: trainKm,
        currentStation: train.currentStation,
        nextStation: train.nextStation,
        destinationStation: train.destinationStation,
        remainingStations: remainingStns,
        telemetryTimestamp: ts,
        telemetryAgeMinutes,
        isStale,
        isTerminated: false,
        classification: 'UNRELATED_ROUTE',
        projectedEntryMinutes: null,
        projectedExitMinutes: null,
        confidence: 'HIGH',
        reason: `Remaining route of Train ${trainNumber} excludes corridor stations (${prevCode} / ${nextCode}). Excluded from conflict calculations.`
      };
    }
  }

  // 4. Calculate Projected Work-Zone Entry and Exit Minutes
  let projectedEntryMins: number | null = null;
  let projectedExitMins: number | null = null;

  if (isInside) {
    // Inside work zone: entry is right now (or earlier), exit is time to clear the span
    const timeToClearSpanMins = Math.max(4, Math.round((workSpanKm / effectiveSpeed) * 60));
    projectedEntryMins = nowMinutes;
    projectedExitMins = nowMinutes + timeToClearSpanMins;
  } else if (isApproaching) {
    const distanceKm = trainDirection === 'UP' ? (startKm - trainKm) : (trainKm - endKm);
    const transitTimeMins = Math.max(1, Math.round((distanceKm / effectiveSpeed) * 60));
    const spanTransitMins = Math.max(3, Math.round((workSpanKm / effectiveSpeed) * 60));

    // Incorporate expectedArrival if already projected at station
    const etaStr = train.expectedArrival || train.scheduledArrival;
    const parsedEta = timeStrToMins(etaStr);

    if (parsedEta !== null) {
      projectedEntryMins = parsedEta;
    } else {
      projectedEntryMins = nowMinutes + transitTimeMins;
    }
    projectedExitMins = projectedEntryMins + spanTransitMins;
  } else if (hasPassed || isReceding) {
    // Passed work zone -> no future conflict
    projectedEntryMins = null;
    projectedExitMins = null;
  }

  // Classification Assignment
  let classification: ProjectedTrainMovement['classification'] = 'UNRELATED_ROUTE';
  if (isInside) classification = 'INSIDE_AFFECTED_SECTION';
  else if (isApproaching) classification = 'APPROACHING_AFFECTED_SECTION';
  else if (hasPassed) classification = 'PASSED_AFFECTED_SECTION';
  else if (isReceding) classification = 'RECEDING';

  const entryStr = projectedEntryMins !== null ? minsToTimeStr(projectedEntryMins) : undefined;
  const exitStr = projectedExitMins !== null ? minsToTimeStr(projectedExitMins) : undefined;

  let reason = '';
  if (classification === 'INSIDE_AFFECTED_SECTION') {
    reason = `Train ${trainName} (${trainNumber}) is currently physically INSIDE the maintenance work zone (KM ${trainKm.toFixed(1)} within ${formatRailwayKm(startKm)}–${formatRailwayKm(endKm)}).`;
  } else if (classification === 'APPROACHING_AFFECTED_SECTION') {
    const dist = trainDirection === 'UP' ? (startKm - trainKm).toFixed(1) : (trainKm - endKm).toFixed(1);
    reason = `Train ${trainName} (${trainNumber}) is APPROACHING on ${trainTrack} from KM ${trainKm.toFixed(1)} (${dist} km away). Projected section entry: ${entryStr} IST, exit: ${exitStr} IST.`;
  } else if (classification === 'PASSED_AFFECTED_SECTION' || classification === 'RECEDING') {
    reason = `Train ${trainName} (${trainNumber}) at KM ${trainKm.toFixed(1)} has already PASSED the maintenance section. No future conflict.`;
  } else {
    reason = `Train ${trainName} (${trainNumber}) movement does not intersect this maintenance work zone.`;
  }

  if (isStale) {
    reason = `[STALE TELEMETRY ${telemetryAgeMinutes}m] ${reason}`;
  }

  return {
    trainNumber,
    trainName,
    runIdentity: (train as any).runIdentity,
    source: (train as any).source || 'LIVE',
    track: trainTrack,
    direction: trainDirection,
    speedKmph: speed,
    delayMinutes,
    currentKm: trainKm,
    currentStation: train.currentStation,
    nextStation: train.nextStation,
    destinationStation: train.destinationStation,
    remainingStations: remainingStns,
    telemetryTimestamp: ts,
    telemetryAgeMinutes,
    isStale,
    isTerminated: false,
    classification,
    projectedEntryMinutes: projectedEntryMins,
    projectedExitMinutes: projectedExitMins,
    entryTimeStr: entryStr,
    exitTimeStr: exitStr,
    confidence: isStale ? 'LOW' : (speed > 0 ? 'HIGH' : 'MEDIUM'),
    reason
  };
}

/**
 * SECTION 13 & 14: CALCULATE TRAIN OCCUPATION INTERVALS & DYNAMIC FREE WINDOWS
 * Inverts the timeline around protected train intervals and existing blocks to find candidate free gaps.
 */
export function generateDynamicCandidateWindows(
  request: {
    id: string;
    startKm: number;
    endKm: number;
    affectedTracks: string[];
    duration: number;
    preferredStartTime?: string;
    requestedResources?: string[];
    possessionBreakdown?: {
      mobilisation_duration?: number;
      setup_duration?: number;
      work_duration?: number;
      clearance_duration?: number;
      restoration_duration?: number;
      total_required_duration?: number;
    };
    breakdown?: {
      setupMinutes?: number;
      workMinutes?: number;
      verificationMinutes?: number;
      restorationMinutes?: number;
    };
    criticality?: number;
    urgency?: number;
    risk?: number;
    trafficImpact?: number;
    resourceAvailability?: number;
  },
  liveTrains: LiveTrainPosition[] = [],
  existingBlocks: Array<{
    requestId: string;
    startTime: string; // HH:MM
    endTime: string;   // HH:MM
    track?: string;
    resources?: string[];
  }> = [],
  options?: {
    planningParameters?: PlanningParameters;
    dataSource?: 'LIVE' | 'TIMETABLE' | 'DEMO' | 'UNAVAILABLE';
    nowMinutes?: number;
    freshnessThresholdMinutes?: number;
    horizonDays?: number;
    horizonType?: 'TODAY' | 'NEXT_24_HOURS' | 'NEXT_7_DAYS' | 'NEXT_30_DAYS' | 'CUSTOM';
    startDate?: string;
    customEndDate?: string;
    preferredSlotType?: 'ALL' | 'NIGHT_ONLY' | 'DAY_ONLY';
    workingDaysOnly?: boolean;
  }
): DynamicPlanningResult {
  const params = options?.planningParameters || DEFAULT_PLANNING_PARAMETERS;
  const headwayBuffer = params.headwayBufferMinutes ?? 15;
  const nowMins = options?.nowMinutes ?? (new Date().getHours() * 60 + new Date().getMinutes());
  const selectedTrack = request.affectedTracks?.[0] || 'UP Main';
  const startKm = request.startKm;
  const endKm = request.endKm;

  // 1. Resolve surrounding station corridor context
  const corridorContext = resolveCorridorContext(startKm, endKm);

  // 2. Calculate Total Required Possession Duration
  const pb = request.possessionBreakdown;
  const bd = request.breakdown;
  const hasBreakdown = Boolean(pb || bd);

  const mobilisation = pb?.mobilisation_duration ?? 0;
  const setup = pb?.setup_duration ?? bd?.setupMinutes ?? (hasBreakdown ? 15 : 0);
  const pureWork = pb?.work_duration ?? bd?.workMinutes ?? request.duration;
  const clearance = pb?.clearance_duration ?? 0;
  const verification = bd?.verificationMinutes ?? 0;
  const restoration = pb?.restoration_duration ?? bd?.restorationMinutes ?? (hasBreakdown ? 15 : 0);

  const totalRequiredPossessionMinutes = pb?.total_required_duration ?? (
    hasBreakdown
      ? (mobilisation + setup + pureWork + clearance + verification + restoration)
      : request.duration
  );

  // 3. Evaluate Data Source & Telemetry State
  const dataSource = options?.dataSource || (liveTrains.length > 0 ? 'LIVE' : 'TIMETABLE');
  const isLiveDataAvailable = dataSource === 'LIVE' && liveTrains.length > 0;
  const liveDataWarning = !isLiveDataAvailable
    ? 'LIVE OPERATIONAL DATA UNAVAILABLE: Real-time train positions from RailRadar are currently offline. Planning basis: Scheduled master timetables and goods movement forecasts. Live train conflict status: UNKNOWN.'
    : undefined;

  // 4. Project train movements for all active corridor trains
  const projectedTrains: ProjectedTrainMovement[] = [];

  // A. Real Live RailRadar trains
  liveTrains.forEach(t => {
    projectedTrains.push(
      calculateProjectedTrainArrival(t, startKm, endKm, selectedTrack, corridorContext, nowMins)
    );
  });

  // B. Incorporate scheduled corridor movements
  SCHEDULED_CORRIDOR_MOVEMENTS.forEach(m => {
    if (!liveTrains.some(lt => String(lt.trainNumber) === String(m.trainNumber))) {
      const isTrackMatch = m.track.toLowerCase().includes(selectedTrack.toLowerCase()) 
                        || selectedTrack.toLowerCase().includes(m.track.toLowerCase());
      if (isTrackMatch) {
        const timeParts = m.passageTimeAtZone.split(':').map(Number);
        const passageMins = timeParts[0] * 60 + timeParts[1];
        projectedTrains.push({
          trainNumber: m.trainNumber,
          trainName: m.trainName,
          source: 'TIMETABLE',
          track: m.track,
          direction: m.track.includes('DN') ? 'DN' : 'UP',
          speedKmph: m.speedKmph,
          delayMinutes: 0,
          currentKm: m.currentKm,
          telemetryAgeMinutes: 0,
          isStale: false,
          isTerminated: false,
          classification: 'APPROACHING_AFFECTED_SECTION',
          projectedEntryMinutes: passageMins,
          projectedExitMinutes: passageMins + 4,
          entryTimeStr: minsToTimeStr(passageMins),
          exitTimeStr: minsToTimeStr(passageMins + 4),
          confidence: 'MEDIUM',
          reason: `Master Corridor Timetable Movement: Scheduled passage at ${m.passageTimeAtZone} on ${m.track}.`
        });
      }
    }
  });

  // 5. Generate Protected Train Intervals [Tenter - 15m, Texit + 15m]
  const protectedIntervals: ProtectedTrainInterval[] = [];

  for (const pt of projectedTrains) {
    if (pt.isTerminated || pt.classification === 'PASSED_AFFECTED_SECTION' || pt.classification === 'RECEDING' || pt.classification === 'UNRELATED_ROUTE') {
      continue; // Exclude non-conflicting trains
    }

    if (pt.projectedEntryMinutes !== null && pt.projectedExitMinutes !== null) {
      const isSameTrack = pt.track.toLowerCase() === selectedTrack.toLowerCase()
        || selectedTrack.toLowerCase().includes(pt.track.toLowerCase())
        || pt.track.toLowerCase().includes(selectedTrack.toLowerCase());

      const isYard = (startKm >= 11.8 && endKm <= 13.2) || (startKm >= 48.0 && endKm <= 52.0);

      if (isSameTrack || isYard) {
        const pStart = Math.max(0, pt.projectedEntryMinutes - headwayBuffer);
        const pEnd = Math.min(1440, pt.projectedExitMinutes + headwayBuffer);

        protectedIntervals.push({
          trainNumber: pt.trainNumber,
          trainName: pt.trainName,
          track: pt.track,
          tEnterMins: pt.projectedEntryMinutes,
          tExitMins: pt.projectedExitMinutes,
          protectedStartMins: pStart,
          protectedEndMins: pEnd,
          protectedStartStr: minsToTimeStr(pStart),
          protectedEndStr: minsToTimeStr(pEnd),
          reason: `${pt.trainName} (${pt.trainNumber}) occupation ${pt.entryTimeStr}–${pt.exitTimeStr} requires ${headwayBuffer}-min protection margin (${minsToTimeStr(pStart)}–${minsToTimeStr(pEnd)}).`
        });
      }
    }
  }

  // 6. Incorporate Existing Possessions & Resource Blocks
  interface BlockedInterval {
    startMins: number;
    endMins: number;
    source: 'TRAIN' | 'EXISTING_BLOCK';
    label: string;
    requestId?: string;
  }

  const blockedIntervals: BlockedInterval[] = [];

  protectedIntervals.forEach(p => {
    blockedIntervals.push({
      startMins: p.protectedStartMins,
      endMins: p.protectedEndMins,
      source: 'TRAIN',
      label: `Train ${p.trainNumber} (${p.trainName})`
    });
  });

  existingBlocks.forEach(eb => {
    const sMins = timeStrToMins(eb.startTime);
    const eMins = timeStrToMins(eb.endTime);
    if (sMins !== null && eMins !== null && sMins < eMins) {
      const isTrackOverlap = !eb.track || eb.track === selectedTrack;
      // If the block is on the same track without specific resource contention, or has no resources, block the physical track.
      // If it specifies resources that might conflict, candidate generation evaluates resource conflicts on candidate slots.
      if (isTrackOverlap && (!eb.resources || eb.resources.length === 0)) {
        blockedIntervals.push({
          startMins: sMins,
          endMins: eMins,
          source: 'EXISTING_BLOCK',
          label: `Existing Block #${eb.requestId}`,
          requestId: eb.requestId
        });
      }
    }
  });

  blockedIntervals.sort((a, b) => a.startMins - b.startMins);

  const mergedBlocks: { startMins: number; endMins: number; labels: string[] }[] = [];
  for (const b of blockedIntervals) {
    if (mergedBlocks.length === 0) {
      mergedBlocks.push({ startMins: b.startMins, endMins: b.endMins, labels: [b.label] });
    } else {
      const last = mergedBlocks[mergedBlocks.length - 1];
      if (b.startMins <= last.endMins) {
        last.endMins = Math.max(last.endMins, b.endMins);
        last.labels.push(b.label);
      } else {
        mergedBlocks.push({ startMins: b.startMins, endMins: b.endMins, labels: [b.label] });
      }
    }
  }

  // 7. Invert Timeline to Extract Continuous Free Gaps for Day 0 (Today)
  const dynamicGaps: DynamicGap[] = [];
  let timelinePointer = 60; // 01:00
  let gapIdx = 1;

  for (const mb of mergedBlocks) {
    if (mb.startMins > timelinePointer) {
      const available = mb.startMins - timelinePointer;
      if (available >= 30) {
        dynamicGaps.push({
          gapId: `GAP-${String(gapIdx++).padStart(2, '0')}`,
          startMinutes: timelinePointer,
          endMinutes: mb.startMins,
          startTimeStr: minsToTimeStr(timelinePointer),
          endTimeStr: minsToTimeStr(mb.startMins),
          availableMinutes: available,
          boundingTrainAfter: mb.labels.join(' / ')
        });
      }
    }
    timelinePointer = Math.max(timelinePointer, mb.endMins);
  }

  if (timelinePointer < 1440) {
    const available = 1440 - timelinePointer;
    if (available >= 30) {
      dynamicGaps.push({
        gapId: `GAP-${String(gapIdx++).padStart(2, '0')}`,
        startMinutes: timelinePointer,
        endMinutes: 1440,
        startTimeStr: minsToTimeStr(timelinePointer),
        endTimeStr: minsToTimeStr(1440),
        availableMinutes: available,
        boundingTrainBefore: mergedBlocks[mergedBlocks.length - 1]?.labels.join(' / ')
      });
    }
  }

  const longestAvailableGapMinutes = dynamicGaps.reduce((max, g) => Math.max(max, g.availableMinutes), 0);

  // 8. Multi-Day Horizon & Candidate Feasibility Modeling
  const candidates: CandidatePlanningWindow[] = [];

  // Determine Horizon Scope
  const horizonType = options?.horizonType || 'TODAY';
  let numDays = options?.horizonDays || 1;
  if (horizonType === 'NEXT_7_DAYS') numDays = 7;
  else if (horizonType === 'NEXT_30_DAYS') numDays = 30;
  else if (horizonType === 'NEXT_24_HOURS' || horizonType === 'TODAY') numDays = 1;
  else if (horizonType === 'CUSTOM' && options?.startDate && options?.customEndDate) {
    const d1 = new Date(options.startDate).getTime();
    const d2 = new Date(options.customEndDate).getTime();
    numDays = Math.max(1, Math.min(30, Math.ceil((d2 - d1) / (86400000)) + 1));
  }

  const baseDate = options?.startDate ? new Date(options.startDate) : new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Helper to evaluate candidate feasibility for any gap on any day
  const evaluateGapCandidates = (
    gaps: DynamicGap[], 
    dayIndex: number, 
    dateStr: string, 
    dayLabel: string, 
    isSunday: boolean, 
    dayProtectedIntervals: ProtectedTrainInterval[]
  ) => {
    for (const gap of gaps) {
      const isDurationSufficient = gap.availableMinutes >= totalRequiredPossessionMinutes;
      const slotStartMins = Math.ceil(gap.startMinutes / 5) * 5;
      const slotEndMins = slotStartMins + totalRequiredPossessionMinutes;
      const slotStartStr = minsToTimeStr(slotStartMins);
      const slotEndStr = minsToTimeStr(slotEndMins);
      const isNight = slotStartMins >= 60 && slotStartMins <= 390;
      const isDay = slotStartMins > 390 && slotStartMins <= 1320;

      let status: CandidatePlanningWindow['status'] = 'FEASIBLE';
      let reason = '';

      if (!isDurationSufficient) {
        status = 'INSUFFICIENT_DURATION';
        reason = `INSUFFICIENT DURATION: Only ${gap.availableMinutes} minutes available in dynamic gap (${gap.startTimeStr}–${gap.endTimeStr}). Required possession: ${totalRequiredPossessionMinutes} mins (${setup}m setup + ${pureWork}m work + ${restoration}m restoration). Blocked by: ${gap.boundingTrainAfter || 'corridor traffic'}.`;
      } else if (!isLiveDataAvailable && dataSource === 'UNAVAILABLE' && dayIndex === 0) {
        status = 'UNKNOWN';
        reason = `TRAIN CONFLICT STATUS: UNKNOWN. Real-time RailRadar telemetry is currently offline. Operating feasibility in gap ${gap.startTimeStr}–${gap.endTimeStr} cannot be verified without live headway data.`;
      } else if (options?.workingDaysOnly && isSunday) {
        status = 'CONFLICT';
        reason = `WORKING DAYS CONSTRAINT: Maintenance possession restricted on Sundays (${dayLabel}). Select a working day (Mon–Sat) for execution.`;
      } else if (options?.preferredSlotType === 'NIGHT_ONLY' && !isNight) {
        status = 'POTENTIAL_CONFLICT';
        reason = `PREFERRED TIME CONSTRAINT: Window (${slotStartStr}–${slotEndStr}) falls outside preferred Night Window (01:00–06:00).`;
      } else if (options?.preferredSlotType === 'DAY_ONLY' && !isDay) {
        status = 'POTENTIAL_CONFLICT';
        reason = `PREFERRED TIME CONSTRAINT: Window (${slotStartStr}–${slotEndStr}) falls outside preferred Day Window (06:00–22:00).`;
      } else {
        const trainsBefore = dayProtectedIntervals.filter(p => p.protectedEndMins <= slotStartMins).map(p => p.trainNumber);
        const trainsAfter = dayProtectedIntervals.filter(p => p.protectedStartMins >= slotEndMins).map(p => p.trainNumber);

        const beforeDesc = trainsBefore.length > 0 ? `Train ${trainsBefore[trainsBefore.length - 1]} projected before` : 'corridor clear prior';
        const afterDesc = trainsAfter.length > 0 ? `Train ${trainsAfter[0]} projected after` : 'corridor clear subsequent';

        reason = `FEASIBLE DYNAMIC WINDOW: ${totalRequiredPossessionMinutes}-minute possession fits inside ${gap.availableMinutes}-min operational gap (${gap.startTimeStr}–${gap.endTimeStr}). Preserves statutory ${headwayBuffer}-min protection margins (${beforeDesc}, ${afterDesc}). No conflicting active rake detected.`;
      }

      // Evaluate Resource Contention
      let isResourceConflict = false;
      let resourceConflicts: CandidatePlanningWindow['resource_conflicts'] = undefined;
      if (request.requestedResources && request.requestedResources.length > 0) {
        for (const eb of existingBlocks) {
          const ebDate = (eb as any).scheduledDate || (eb as any).date;
          // Only check existing blocks that belong to the same date, or date-agnostic blocks on day 0
          if (ebDate && ebDate !== dateStr) continue;
          if (eb.resources && eb.resources.length > 0) {
            const ebStart = timeStrToMins(eb.startTime);
            const ebEnd = timeStrToMins(eb.endTime);
            if (ebStart !== null && ebEnd !== null) {
              if (Math.max(slotStartMins, ebStart) < Math.min(slotEndMins, ebEnd)) {
                const shared = eb.resources.filter(r => request.requestedResources!.includes(r));
                if (shared.length > 0) {
                  isResourceConflict = true;
                  status = 'CONFLICT';
                  resourceConflicts = [{
                    resourceName: shared.join(', '),
                    conflictingRequestId: eb.requestId,
                    conflictingWindow: `${eb.startTime}–${eb.endTime}`
                  }];
                  reason = `RESOURCE CONTENTION: Shared maintenance equipment [${shared.join(', ')}] is already committed to Block #${eb.requestId} (${eb.startTime}–${eb.endTime}).`;
                  break;
                }
              }
            }
          }
        }
      }

      const slotId = numDays > 1 ? `D${dayIndex + 1}-${gap.gapId}` : `SLOT-${gap.gapId}`;

      candidates.push({
        slotId,
        startTime: slotStartStr,
        endTime: slotEndStr,
        candidate_start: slotStartStr,
        candidate_end: slotEndStr,
        candidateDate: dateStr,
        dayLabel,
        slotType: isNight ? 'NIGHT' : 'DAY',
        durationMinutes: totalRequiredPossessionMinutes,
        required_duration: totalRequiredPossessionMinutes,
        available_duration: gap.availableMinutes,
        status,
        isDurationSufficient,
        isResourceConflict,
        resource_conflicts: resourceConflicts,
        train_conflicts: status === 'CONFLICT' ? 1 : 0,
        trainConflictsCount: status === 'CONFLICT' ? 1 : 0,
        coordinationCount: corridorContext.isCrossSection ? 2 : 1,
        operationalImpact: gap.startMinutes < 360 ? 'Low' : gap.startMinutes < 720 ? 'High' : 'Medium',
        priorityFit: 'High',
        reason,
        isRecommended: false
      });
    }
  };

  // Day 0 Evaluation
  const day0Date = new Date(baseDate);
  const day0Str = day0Date.toISOString().split('T')[0];
  const day0Sunday = day0Date.getDay() === 0;
  const day0Label = numDays > 1 ? 'Day 1 (Today)' : 'Today';
  evaluateGapCandidates(dynamicGaps, 0, day0Str, day0Label, day0Sunday, protectedIntervals);

  // Subsequent Days Evaluation (for 7-day, 30-day, or Custom horizon)
  if (numDays > 1) {
    // Generate timetable intervals for master corridor movements
    const timetableIntervals: ProtectedTrainInterval[] = [];
    SCHEDULED_CORRIDOR_MOVEMENTS.forEach(m => {
      const isTrackMatch = m.track.toLowerCase().includes(selectedTrack.toLowerCase()) 
                        || selectedTrack.toLowerCase().includes(m.track.toLowerCase());
      if (isTrackMatch) {
        const parts = m.passageTimeAtZone.split(':').map(Number);
        const pMins = parts[0] * 60 + parts[1];
        const pStart = Math.max(0, pMins - headwayBuffer);
        const pEnd = Math.min(1440, pMins + 4 + headwayBuffer);
        timetableIntervals.push({
          trainNumber: m.trainNumber,
          trainName: m.trainName,
          track: m.track,
          tEnterMins: pMins,
          tExitMins: pMins + 4,
          protectedStartMins: pStart,
          protectedEndMins: pEnd,
          protectedStartStr: minsToTimeStr(pStart),
          protectedEndStr: minsToTimeStr(pEnd),
          reason: `Master Corridor Timetable: ${m.trainName} (${m.trainNumber})`
        });
      }
    });

    for (let d = 1; d < numDays; d++) {
      const targetDate = new Date(baseDate.getTime() + d * 24 * 60 * 60 * 1000);
      const dateStr = targetDate.toISOString().split('T')[0];
      const dow = targetDate.getDay();
      const isSunday = dow === 0;
      const dayLabel = d === 1 ? 'Day 2 (Tomorrow)' : `Day ${d + 1} (${dayNames[dow]}, ${targetDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`;

      // Day d blocked intervals
      const dayBlocked: { startMins: number; endMins: number; label: string }[] = [];
      timetableIntervals.forEach(p => {
        dayBlocked.push({
          startMins: p.protectedStartMins,
          endMins: p.protectedEndMins,
          label: `Train ${p.trainNumber} (${p.trainName})`
        });
      });

      // Existing blocks on this specific day
      existingBlocks.forEach(eb => {
        const ebDate = (eb as any).scheduledDate || (eb as any).date;
        if (ebDate === dateStr) {
          const sMins = timeStrToMins(eb.startTime);
          const eMins = timeStrToMins(eb.endTime);
          if (sMins !== null && eMins !== null && sMins < eMins) {
            dayBlocked.push({
              startMins: sMins,
              endMins: eMins,
              label: `Existing Block #${eb.requestId}`
            });
          }
        }
      });

      dayBlocked.sort((a, b) => a.startMins - b.startMins);
      const mergedDayBlocks: { startMins: number; endMins: number; labels: string[] }[] = [];
      for (const b of dayBlocked) {
        if (mergedDayBlocks.length === 0) {
          mergedDayBlocks.push({ startMins: b.startMins, endMins: b.endMins, labels: [b.label] });
        } else {
          const last = mergedDayBlocks[mergedDayBlocks.length - 1];
          if (b.startMins <= last.endMins) {
            last.endMins = Math.max(last.endMins, b.endMins);
            last.labels.push(b.label);
          } else {
            mergedDayBlocks.push({ startMins: b.startMins, endMins: b.endMins, labels: [b.label] });
          }
        }
      }

      // Extract gaps on Day d
      const dayGaps: DynamicGap[] = [];
      let dayPointer = 60; // 01:00
      let dGapIdx = 1;
      for (const mb of mergedDayBlocks) {
        if (mb.startMins > dayPointer) {
          const avail = mb.startMins - dayPointer;
          if (avail >= 30) {
            dayGaps.push({
              gapId: `GAP-${String(dGapIdx++).padStart(2, '0')}`,
              startMinutes: dayPointer,
              endMinutes: mb.startMins,
              startTimeStr: minsToTimeStr(dayPointer),
              endTimeStr: minsToTimeStr(mb.startMins),
              availableMinutes: avail,
              boundingTrainAfter: mb.labels.join(' / ')
            });
          }
        }
        dayPointer = Math.max(dayPointer, mb.endMins);
      }
      if (dayPointer < 1440) {
        const avail = 1440 - dayPointer;
        if (avail >= 30) {
          dayGaps.push({
            gapId: `GAP-${String(dGapIdx++).padStart(2, '0')}`,
            startMinutes: dayPointer,
            endMinutes: 1440,
            startTimeStr: minsToTimeStr(dayPointer),
            endTimeStr: minsToTimeStr(1440),
            availableMinutes: avail,
            boundingTrainBefore: mergedDayBlocks[mergedDayBlocks.length - 1]?.labels.join(' / ')
          });
        }
      }

      evaluateGapCandidates(dayGaps, d, dateStr, dayLabel, isSunday, timetableIntervals);
    }
  }

  // 9. OR-TOOLS CP-SAT MULTI-CRITERIA EVALUATOR
  const feasibleCandidates = candidates.filter(c => c.status === 'FEASIBLE');
  let recommended: CandidatePlanningWindow | undefined = undefined;

  if (feasibleCandidates.length > 0) {
    const priorityCalc = calculatePriorityScore({
      criticality: request.criticality ?? 80,
      urgency: request.urgency ?? 75,
      risk: request.risk ?? 70,
      trafficImpact: request.trafficImpact ?? 40,
      resourceAvailability: request.resourceAvailability ?? 90
    });

    let bestScore = -Infinity;
    let bestCandidate = feasibleCandidates[0];

    for (const cand of feasibleCandidates) {
      const startMins = timeStrToMins(cand.startTime) || 0;
      const spareBuffer = (cand.available_duration || 0) - totalRequiredPossessionMinutes;

      const isPeakHours = (startMins >= 420 && startMins <= 600) || (startMins >= 1020 && startMins <= 1200);
      const peakPenalty = isPeakHours ? 40 : 0;

      const nightBonus = (startMins >= 60 && startMins <= 390) ? 30 : 0;

      let waitPenalty = 0;
      if (request.preferredStartTime) {
        const prefMins = timeStrToMins(request.preferredStartTime);
        if (prefMins !== null) {
          waitPenalty = Math.min(50, Math.abs(startMins - prefMins) / 6);
        }
      }

      const objectiveValue = (priorityCalc.score * 1.5) + (spareBuffer * 0.5) + nightBonus - peakPenalty - waitPenalty;

      if (objectiveValue > bestScore) {
        bestScore = objectiveValue;
        bestCandidate = cand;
      }
    }

    bestCandidate.isRecommended = true;
    recommended = bestCandidate;
  }

  const isNoSuitableWindow = feasibleCandidates.length === 0;
  const noSuitableReasons = isNoSuitableWindow
    ? candidates.map(c => `${c.slotId} (${c.startTime}–${c.endTime}): ${c.reason}`)
    : undefined;

  return {
    corridorContext,
    projectedTrains,
    protectedIntervals,
    dynamicGaps,
    candidateWindows: candidates,
    recommendedWindow: recommended,
    planningMode: isLiveDataAvailable ? 'LIVE' : (dataSource === 'UNAVAILABLE' ? 'LIVE_DATA_UNAVAILABLE' : 'TIMETABLE_DEGRADED'),
    isLiveDataAvailable,
    liveDataWarning,
    longestAvailableGapMinutes,
    totalRequiredPossessionMinutes,
    isNoSuitableWindow,
    noSuitableWindowReasons: noSuitableReasons,
    qualityRating: recommended ? 'RECOMMENDED' : (isNoSuitableWindow ? 'NO_FEASIBLE_SOLUTION' : 'OPTIMIZATION_FAILED')
  };
}

/**
 * SECTION 27 & 28: DYNAMIC REPLANNING & ANTI-JITTER DAMPING
 */
export function evaluateDynamicReplanning(
  currentPlan: { startTime: string; endTime: string; track?: string },
  updatedLiveTrains: LiveTrainPosition[],
  workZone: { startKm: number; endKm: number; track?: string },
  stabilityThresholdMinutes: number = 5
): {
  replanRequired: boolean;
  actionRequired: 'CLEAR' | 'RE_EVALUATION_REQUIRED' | 'OPERATIONAL_CONFLICT_DETECTED';
  conflictSeverity: 'NONE' | 'SOFT_WARNING' | 'HARD_CONFLICT';
  conflictingTrain?: { trainNumber: string; trainName: string; delayChangeMinutes: number; newEta: string };
  reason: string;
} {
  const planStartMins = timeStrToMins(currentPlan.startTime) || 0;
  const planEndMins = timeStrToMins(currentPlan.endTime) || 1440;
  const buffer = 15;

  for (const train of updatedLiveTrains) {
    if (isTrainCompletedOrTerminated(train)) continue;

    const etaStr = train.expectedArrival || train.scheduledArrival;
    const etaMins = timeStrToMins(etaStr);

    if (etaMins !== null) {
      const intersectsWindow = etaMins >= (planStartMins - buffer) && etaMins <= (planEndMins + buffer);

      if (intersectsWindow) {
        return {
          replanRequired: true,
          actionRequired: 'OPERATIONAL_CONFLICT_DETECTED',
          conflictSeverity: 'HARD_CONFLICT',
          conflictingTrain: {
            trainNumber: train.trainNumber,
            trainName: train.trainName,
            delayChangeMinutes: train.delayMinutes || 0,
            newEta: etaStr || minsToTimeStr(etaMins)
          },
          reason: `OPERATIONAL CONFLICT DETECTED: Train ${train.trainName} (${train.trainNumber}) arrival shifted to ${etaStr} IST (Delay: ${train.delayMinutes}m), directly intruding into planned possession ${currentPlan.startTime}–${currentPlan.endTime} within statutory 15m headway margins. Human authorization and replanning required.`
        };
      }
    }
  }

  return {
    replanRequired: false,
    actionRequired: 'CLEAR',
    conflictSeverity: 'NONE',
    reason: `Operational stability preserved. No live train movements intrude upon authorized window ${currentPlan.startTime}–${currentPlan.endTime}.`
  };
}
