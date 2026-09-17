// Location-Driven Train Conflict Analysis & Candidate Window Generator
// Indian Railways · Automatic Block Planning Architecture (SIH 2026 PS 26027)

import { CandidatePlanningWindow, InfrastructureAsset } from '../types/infrastructure';
import { BlockRequest, LiveTrainPosition, PlanningParameters, InfrastructureCondition } from '../types/samnvay';
import { detectCrossSectionSpans, CrossSectionAnalysis } from '../utils/railwayLocation';
import { PlannedCorridorMovement, SCHEDULED_CORRIDOR_MOVEMENTS, DEFAULT_PLANNING_PARAMETERS } from './corridorSchedule';

export interface AdvancedPlanningOptions {
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
  requestedResources?: string[];
  existingAllocations?: {
    requestId: string;
    resources: string[];
    startTime: string; // HH:MM
    endTime: string;   // HH:MM
  }[];
  telemetryFreshnessThresholdMinutes?: number; // default 15
}

export interface DetailedConflictAnalysisResult {
  candidateWindows: CandidatePlanningWindow[];
  recommendedWindow?: CandidatePlanningWindow;
  requestedWindowAnalysis?: CandidatePlanningWindow;
  conflictingTrainSummary?: string;
  isDurationImpossible: boolean;
  longestFeasibleWindowMinutes: number;
  liveDataAvailable: boolean;
  liveDataWarning?: string;
  isLiveDataStale?: boolean;
  staleDataWarning?: string;
  isNoSuitableWindow: boolean;
  noSuitableWindowReasons?: string[];
  totalRequiredPossessionMinutes: number;
  breakdown?: {
    setupMinutes: number;
    workMinutes: number;
    verificationMinutes: number;
    restorationMinutes: number;
  };
  possessionBreakdown?: {
    mobilisation_duration: number;
    setup_duration: number;
    work_duration: number;
    clearance_duration: number;
    restoration_duration: number;
    total_required_duration: number;
  };
  qualityRating: 'RECOMMENDED' | 'BEST_FEASIBLE_CANDIDATE_FOUND' | 'NO_FEASIBLE_SOLUTION' | 'OPTIMIZATION_FAILED';
  crossSectionAnalysis: CrossSectionAnalysis;
  hasConflict?: boolean;
  conflictDetails?: Array<{
    severity: 'HARD_CONFLICT' | 'SOFT_CONFLICT' | 'ADVISORY';
    train?: any;
    reason?: string;
  }>;
}

/**
 * Pre-Allocation Conflict Filtering and Candidate Window Generator.
 * Evaluates candidate maintenance windows against:
 * 1. Scheduled timetable train paths
 * 2. Live RailRadar train movements (with delays and dynamic ETAs)
 * 3. Goods train movement forecast
 * 4. Configurable Planning Safety Margins (15-min headway buffers)
 * 5. Multi-department resource conflicts
 * 6. Granular setup/restoration possession breakdown
 */
export function analyzeLocationTrainConflicts(
  startKm: number,
  endKm: number,
  selectedTracks: string[] = ['UP Main'],
  durationMinutes: number = 120,
  requestedTime: string = '02:00',
  liveTrains: LiveTrainPosition[] = [],
  parameters: PlanningParameters = DEFAULT_PLANNING_PARAMETERS,
  dataSource: 'LIVE' | 'LAST_KNOWN' | 'DEMO' | 'UNAVAILABLE' = 'LIVE',
  lastFetchTimestamp: string | null = null,
  options?: AdvancedPlanningOptions
): DetailedConflictAnalysisResult {
  const headwayBuffer = parameters.headwayBufferMinutes ?? 15;
  const hasLiveTelemetry = dataSource === 'LIVE' && liveTrains.length > 0;
  const liveWarning = !hasLiveTelemetry
    ? 'LIVE TRAIN DATA UNAVAILABLE: Real-time train positions from RailRadar are offline. Evaluation is using static master timetables and goods movement forecasts.'
    : undefined;

  // Stale Telemetry Check
  let isLiveDataStale = false;
  let staleDataWarning: string | undefined = undefined;
  const freshnessThresholdMins = options?.telemetryFreshnessThresholdMinutes ?? 15;

  if (hasLiveTelemetry) {
    for (const t of liveTrains) {
      const ts = t.telemetryTimestamp || t.upstreamUpdatedAt || t.lastUpdated;
      if (ts) {
        const parsed = new Date(ts).getTime();
        if (!isNaN(parsed)) {
          const ageMinutes = (Date.now() - parsed) / (1000 * 60);
          if (ageMinutes > freshnessThresholdMins) {
            isLiveDataStale = true;
            staleDataWarning = `LIVE DATA STALE: Train telemetry timestamp (${ts}) is older than ${freshnessThresholdMins} minutes. Real-time headway conflict confidence is degraded.`;
            break;
          }
        }
      }
    }
  }

  // Possession Duration Breakdown (Section 12, 18 of specification)
  // Total Required Possession = Mobilisation + Setup + Pure Work + Clearance + Restoration
  const pb = options?.possessionBreakdown;
  const bd = options?.breakdown;
  const hasExplicitBreakdown = Boolean(pb || bd);

  const mobilisationMinutes = pb?.mobilisation_duration ?? 0;
  const setupMinutes = pb?.setup_duration ?? bd?.setupMinutes ?? (hasExplicitBreakdown ? 15 : 0);
  const workMinutes = pb?.work_duration ?? bd?.workMinutes ?? durationMinutes;
  const clearanceMinutes = pb?.clearance_duration ?? 0;
  const verificationMinutes = bd?.verificationMinutes ?? 0;
  const restorationMinutes = pb?.restoration_duration ?? bd?.restorationMinutes ?? (hasExplicitBreakdown ? 15 : 0);

  const totalRequiredPossessionMinutes = pb?.total_required_duration ?? (
    hasExplicitBreakdown
      ? mobilisationMinutes + setupMinutes + workMinutes + clearanceMinutes + verificationMinutes + restorationMinutes
      : durationMinutes
  );

  const crossSectionAnalysis = detectCrossSectionSpans(startKm, endKm);

  // Merge scheduled paths with live RailRadar train positions
  const activeMovements: PlannedCorridorMovement[] = [...SCHEDULED_CORRIDOR_MOVEMENTS];

  liveTrains.forEach(t => {
    let mins = 0;
    const timeStr = t.expectedArrival || t.scheduledArrival;
    if (timeStr) {
      const parts = timeStr.split(':');
      mins = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    } else if (t.currentKm != null && t.currentKm >= startKm - 1.0 && t.currentKm <= endKm + 1.0) {
      const reqParts = (requestedTime || '04:30').split(':');
      mins = (parseInt(reqParts[0], 10) || 0) * 60 + (parseInt(reqParts[1], 10) || 0);
    }
    activeMovements.push({
      trainNumber: t.trainNumber,
      trainName: t.trainName,
      type: 'EXPRESS',
      track: (t.direction === 'DN' || (t.direction as string) === 'DOWN') ? 'DOWN Main' : 'UP Main',
      speedKmph: t.speedKmph || 100,
      currentKm: t.currentKm,
      passageTimeAtZone: timeStr || `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`,
      timeMinutes: mins,
    });
  });

  // Check impossible duration (Section 17 of specification)
  // Maximum continuous line closure feasible on this trunk corridor is 240 minutes (4 hours)
  const MAX_POSSIBLE_CORRIDOR_WINDOW = 240;
  const isDurationImpossible = totalRequiredPossessionMinutes > MAX_POSSIBLE_CORRIDOR_WINDOW;

  if (isDurationImpossible) {
    const impossibleCandidate: CandidatePlanningWindow = {
      slotId: 'SLOT-IMPOSSIBLE',
      startTime: requestedTime,
      endTime: requestedTime,
      candidate_start: requestedTime,
      candidate_end: requestedTime,
      durationMinutes: totalRequiredPossessionMinutes,
      required_duration: totalRequiredPossessionMinutes,
      available_duration: MAX_POSSIBLE_CORRIDOR_WINDOW,
      status: 'INSUFFICIENT_DURATION',
      isRecommended: false,
      reason: `NO SUITABLE WINDOW: Required possession duration (${totalRequiredPossessionMinutes} min: ${setupMinutes}m setup + ${workMinutes}m work + ${verificationMinutes}m verification + ${restorationMinutes}m restoration) exceeds maximum feasible continuous corridor window (${MAX_POSSIBLE_CORRIDOR_WINDOW} min). Split into multiple child blocks or schedule during multi-day major capital work.`,
    };

    return {
      candidateWindows: [impossibleCandidate],
      recommendedWindow: undefined,
      conflictingTrainSummary: `Requested duration of ${totalRequiredPossessionMinutes} min is impossible to accommodate in a single traffic block.`,
      isDurationImpossible: true,
      isNoSuitableWindow: true,
      noSuitableWindowReasons: [`Required possession duration (${totalRequiredPossessionMinutes} min) exceeds maximum feasible continuous corridor closure (${MAX_POSSIBLE_CORRIDOR_WINDOW} min).`],
      longestFeasibleWindowMinutes: MAX_POSSIBLE_CORRIDOR_WINDOW,
      liveDataAvailable: hasLiveTelemetry,
      liveDataWarning: liveWarning,
      isLiveDataStale,
      staleDataWarning,
      totalRequiredPossessionMinutes,
      breakdown: {
        setupMinutes,
        workMinutes,
        verificationMinutes,
        restorationMinutes
      },
      qualityRating: 'OPTIMIZATION_FAILED',
      crossSectionAnalysis
    };
  }

  // Candidate Slot Definitions across Corridor Operational Cycle
  interface SlotDef {
    slotId: string;
    startStr: string;
    endStr: string;
    startMins: number;
    endMins: number;
    availableMinutes: number;
  }

  const slotDefs: SlotDef[] = [
    { slotId: 'SLOT-01', startStr: '02:00', endStr: '04:00', startMins: 120, endMins: 240, availableMinutes: 120 },
    { slotId: 'SLOT-02', startStr: '04:30', endStr: '06:30', startMins: 270, endMins: 390, availableMinutes: 120 },
    { slotId: 'SLOT-03', startStr: '07:00', endStr: '08:00', startMins: 420, endMins: 480, availableMinutes: 60 },
    { slotId: 'SLOT-04', startStr: '11:30', endStr: '13:30', startMins: 690, endMins: 810, availableMinutes: 120 },
  ];

  const requestedResources = options?.requestedResources || [];
  const existingAllocations = options?.existingAllocations || [];

  const candidates: CandidatePlanningWindow[] = [];
  let conflictingTrainSummary: string | undefined = undefined;

  for (const s of slotDefs) {
    let status: 'CONFLICT' | 'FEASIBLE' | 'INSUFFICIENT_DURATION' = 'FEASIBLE';
    let reason = '';
    let conflictingTrainInfo: CandidatePlanningWindow['conflictingTrain'] | undefined = undefined;
    let resourceConflicts: CandidatePlanningWindow['resource_conflicts'] | undefined = undefined;

    // 1. Duration Feasibility Check
    if (s.availableMinutes < totalRequiredPossessionMinutes) {
      status = 'INSUFFICIENT_DURATION';
      reason = hasExplicitBreakdown
        ? `Required possession (${totalRequiredPossessionMinutes} min: ${setupMinutes}m setup + ${workMinutes}m work + ${verificationMinutes}m verification + ${restorationMinutes}m restoration) exceeds available window (${s.availableMinutes} min).`
        : `Slot duration (${s.availableMinutes} min) is insufficient for the requested ${totalRequiredPossessionMinutes} min maintenance operation.`;
    }

    // 2. Train Headway & Path Conflict Check (if not already insufficient duration)
    if (status === 'FEASIBLE') {
      const isSlotAffectedByTrack = selectedTracks.some(t => t.includes('UP') || t.includes('Main'));
      const conflictingMovement = activeMovements.find(m => {
        const matchesTrack = selectedTracks.some(t => m.track.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(m.track.toLowerCase()));
        if (!matchesTrack) return false;
        const timeOverlap = m.timeMinutes > s.startMins - headwayBuffer && m.timeMinutes < s.endMins + headwayBuffer;
        const physicalOccupancy = m.currentKm != null && m.currentKm >= startKm - 0.5 && m.currentKm <= endKm + 0.5;
        return timeOverlap || physicalOccupancy;
      });

      if (isSlotAffectedByTrack && conflictingMovement) {
        status = 'CONFLICT';
        conflictingTrainInfo = {
          trainNumber: conflictingMovement.trainNumber,
          trainName: conflictingMovement.trainName,
          estimatedArrivalAtKm: `${conflictingMovement.passageTimeAtZone} IST (${conflictingMovement.track})`,
          delayMinutes: 0
        };
        reason = `Dynamic Headway Conflict: ${conflictingMovement.trainName} (${conflictingMovement.trainNumber}) scheduled passage at ${conflictingMovement.passageTimeAtZone} violates ${headwayBuffer}-min planning safety margin on ${conflictingMovement.track}.`;
        if (!conflictingTrainSummary) {
          conflictingTrainSummary = `${conflictingMovement.trainName} (${conflictingMovement.trainNumber}) passing at ${conflictingMovement.passageTimeAtZone} IST on ${conflictingMovement.track}`;
        }
      }
    }

    // 3. Resource Conflict Check (Section 11 of specification)
    if (status === 'FEASIBLE' && requestedResources.length > 0 && existingAllocations.length > 0) {
      const conflicts: { resourceName: string; conflictingRequestId: string; conflictingWindow: string; }[] = [];
      
      for (const alloc of existingAllocations) {
        const [aStartH, aStartM] = alloc.startTime.split(':').map(Number);
        const [aEndH, aEndM] = alloc.endTime.split(':').map(Number);
        const aStartMins = (aStartH || 0) * 60 + (aStartM || 0);
        const aEndMins = (aEndH || 0) * 60 + (aEndM || 0);

        // Check time intersection: max(startA, startB) < min(endA, endB)
        const overlaps = Math.max(s.startMins, aStartMins) < Math.min(s.endMins, aEndMins);
        if (overlaps) {
          const sharedRes = alloc.resources.filter(r => requestedResources.includes(r));
          for (const res of sharedRes) {
            conflicts.push({
              resourceName: res,
              conflictingRequestId: alloc.requestId,
              conflictingWindow: `${alloc.startTime}–${alloc.endTime}`
            });
          }
        }
      }

      if (conflicts.length > 0) {
        status = 'CONFLICT';
        resourceConflicts = conflicts;
        reason = `Resource Conflict: Non-shareable resource(s) [${conflicts.map(c => c.resourceName).join(', ')}] already allocated to request ${conflicts[0].conflictingRequestId} (${conflicts[0].conflictingWindow}).`;
      }
    }

    // 4. Default Feasible Reason & Telemetry Failure Handling (Specification Section 35)
    let candidateStatus: CandidatePlanningWindow['status'] = status;
    if (status === 'FEASIBLE') {
      if (!hasLiveTelemetry && dataSource === 'UNAVAILABLE') {
        candidateStatus = 'UNKNOWN';
        reason = `Train conflict status: UNKNOWN. Real-time RailRadar telemetry is currently unavailable. Operating feasibility cannot be verified without live headway data.`;
      } else if (s.slotId === 'SLOT-02') {
        reason = hasLiveTelemetry
          ? `Feasible duration with compatible departmental work and no detected train movement conflict under available telemetry. Preserves full ${headwayBuffer}-min safety margin.`
          : `Timetable-clear window verified against master passenger timetable and goods forecast paths. CAUTION: Live train telemetry is currently unavailable; real-time headway conflict cannot be guaranteed.`;
      } else {
        reason = `Secondary off-peak passenger window between scheduled express movements with ${headwayBuffer}-min headway buffers.`;
      }
    }

    // Comparison attributes (Specification Section 33)
    let trainConflictsCount = conflictingTrainInfo ? 1 : 0;
    let coordinationCount = s.slotId === 'SLOT-02' ? 2 : (s.slotId === 'SLOT-04' ? 1 : 0);
    let operationalImpact: 'Low' | 'Medium' | 'High' = s.slotId === 'SLOT-02' ? 'Low' : (s.slotId === 'SLOT-01' ? 'Medium' : 'High');
    let priorityFit: 'High' | 'Medium' | 'Low' = s.slotId === 'SLOT-02' ? 'High' : (s.slotId === 'SLOT-01' ? 'Medium' : 'Low');

    candidates.push({
      slotId: s.slotId,
      startTime: s.startStr,
      endTime: s.endStr,
      candidate_start: s.startStr,
      candidate_end: s.endStr,
      durationMinutes: s.availableMinutes,
      required_duration: totalRequiredPossessionMinutes,
      available_duration: s.availableMinutes,
      status: candidateStatus,
      train_conflicts: trainConflictsCount,
      trainConflictsCount,
      coordinationCount,
      operationalImpact,
      priorityFit,
      conflictingTrain: conflictingTrainInfo,
      resource_conflicts: resourceConflicts,
      isResourceConflict: Boolean(resourceConflicts && resourceConflicts.length > 0),
      isDurationSufficient: s.availableMinutes >= totalRequiredPossessionMinutes,
      reason,
      isRecommended: false
    });
  }

  // Find first feasible candidate
  const feasibleCandidates = candidates.filter(c => c.status === 'FEASIBLE');
  let recommended: CandidatePlanningWindow | undefined = undefined;
  let isNoSuitableWindow = false;
  let noSuitableWindowReasons: string[] | undefined = undefined;
  let qualityRating: DetailedConflictAnalysisResult['qualityRating'] = 'RECOMMENDED';

  if (feasibleCandidates.length > 0) {
    recommended = feasibleCandidates[0];
    recommended.isRecommended = true;
    qualityRating = 'RECOMMENDED';
  } else {
    isNoSuitableWindow = true;
    qualityRating = 'NO_FEASIBLE_SOLUTION';
    noSuitableWindowReasons = candidates.map(c => `${c.slotId} (${c.startTime}–${c.endTime}): ${c.reason}`);
  }

  // Validate the requested/entered time against corridor timetable & RailRadar
  let requestedWindowAnalysis: CandidatePlanningWindow | undefined;
  if (requestedTime) {
    const [reqH, reqM] = requestedTime.split(':').map(Number);
    if (!isNaN(reqH)) {
      const reqStartMins = (reqH * 60) + (reqM || 0);
      const reqEndMins = reqStartMins + totalRequiredPossessionMinutes;
      const endH = Math.floor(reqEndMins / 60) % 24;
      const endM = reqEndMins % 60;
      const reqEndTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      const conflictingMovement = activeMovements.find(m => {
        const matchesTrack = selectedTracks.some(t => m.track.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(m.track.toLowerCase()));
        if (!matchesTrack) return false;
        const timeOverlap = m.timeMinutes > reqStartMins - headwayBuffer && m.timeMinutes < reqEndMins + headwayBuffer;
        const physicalOccupancy = m.currentKm != null && m.currentKm >= startKm - 0.5 && m.currentKm <= endKm + 0.5;
        return timeOverlap || physicalOccupancy;
      });

      const hasConflict = Boolean(conflictingMovement);

      requestedWindowAnalysis = {
        slotId: 'SLOT-REQUESTED-CUSTOM',
        startTime: requestedTime,
        endTime: reqEndTimeStr,
        candidate_start: requestedTime,
        candidate_end: reqEndTimeStr,
        durationMinutes: totalRequiredPossessionMinutes,
        required_duration: totalRequiredPossessionMinutes,
        available_duration: totalRequiredPossessionMinutes,
        status: hasConflict ? 'CONFLICT' : 'FEASIBLE',
        conflictingTrain: hasConflict && conflictingMovement ? {
          trainNumber: conflictingMovement.trainNumber,
          trainName: conflictingMovement.trainName,
          estimatedArrivalAtKm: `${conflictingMovement.passageTimeAtZone} IST (${conflictingMovement.track})`,
          delayMinutes: 0
        } : undefined,
        reason: hasConflict && conflictingMovement
          ? `Headway Conflict: ${conflictingMovement.trainName} (${conflictingMovement.trainNumber}) scheduled passage at ${conflictingMovement.passageTimeAtZone} violates ${headwayBuffer}-min planning safety margin.`
          : hasLiveTelemetry
          ? `Requested time window ${requestedTime}–${reqEndTimeStr} is clear with ${headwayBuffer}-min safety buffers verified against live RailRadar movements & timetable.`
          : `Requested time window ${requestedTime}–${reqEndTimeStr} matches scheduled timetable paths. NOTE: Live train data is unavailable; operational conflict analysis cannot be fully guaranteed without live telemetry.`
      };
    }
  }

  const hasOverallConflict = Boolean(conflictingTrainSummary || candidates.some(c => c.status === 'CONFLICT') || requestedWindowAnalysis?.status === 'CONFLICT');
  const conflictDetails = [
    ...candidates.filter(c => c.status === 'CONFLICT').map(c => ({ severity: 'HARD_CONFLICT' as const, train: c.conflictingTrain, reason: c.reason })),
    ...(requestedWindowAnalysis?.status === 'CONFLICT' && requestedWindowAnalysis.conflictingTrain ? [{ severity: 'HARD_CONFLICT' as const, train: requestedWindowAnalysis.conflictingTrain, reason: requestedWindowAnalysis.reason }] : [])
  ];

  return {
    candidateWindows: candidates,
    recommendedWindow: recommended,
    requestedWindowAnalysis,
    conflictingTrainSummary,
    hasConflict: hasOverallConflict,
    conflictDetails,
    isDurationImpossible: false,
    longestFeasibleWindowMinutes: MAX_POSSIBLE_CORRIDOR_WINDOW,
    liveDataAvailable: hasLiveTelemetry,
    liveDataWarning: liveWarning,
    isLiveDataStale,
    staleDataWarning,
    isNoSuitableWindow,
    noSuitableWindowReasons,
    totalRequiredPossessionMinutes,
    breakdown: {
      setupMinutes,
      workMinutes,
      verificationMinutes,
      restorationMinutes
    },
    qualityRating,
    crossSectionAnalysis
  };
}

/**
 * Changing Train Operational Picture & Live Movement Shift Detector (Section 15 of specification)
 * Re-evaluates an authorized block window against real-time train movement changes.
 */
export function detectOperationalShift(
  plannedWindow: { startTime: string; endTime: string; track?: string },
  currentLiveTrains: LiveTrainPosition[],
  headwayBufferMinutes: number = 15
): {
  shiftDetected: boolean;
  conflictingTrain?: { trainNumber: string; trainName: string; delayMinutes: number; eta: string };
  reason?: string;
  actionRequired: 'RE_EVALUATION_REQUIRED' | 'OPERATIONAL_CONFLICT_DETECTED' | 'CLEAR';
} {
  const [startH, startM] = (plannedWindow.startTime || '00:00').split(':').map(Number);
  const [endH, endM] = (plannedWindow.endTime || '00:00').split(':').map(Number);
  const windowStartMins = (startH || 0) * 60 + (startM || 0);
  const windowEndMins = (endH || 0) * 60 + (endM || 0);

  for (const train of currentLiveTrains) {
    const etaStr = train.expectedArrival || train.scheduledArrival || '00:00';
    const [h, m] = etaStr.split(':').map(Number);
    const trainEtaMins = (h || 0) * 60 + (m || 0);

    // If train intersects window or safety buffer
    if (trainEtaMins >= windowStartMins - headwayBufferMinutes && trainEtaMins <= windowEndMins + headwayBufferMinutes) {
      return {
        shiftDetected: true,
        conflictingTrain: {
          trainNumber: train.trainNumber,
          trainName: train.trainName,
          delayMinutes: train.delayMinutes,
          eta: etaStr
        },
        reason: `OPERATIONAL PICTURE CHANGED: Train ${train.trainName} (${train.trainNumber}) ETA is ${etaStr} (Delay: ${train.delayMinutes}m), entering the authorized block window ${plannedWindow.startTime}–${plannedWindow.endTime} within the ${headwayBufferMinutes}-min headway safety margin. Re-evaluation required prior to possession grant.`,
        actionRequired: 'OPERATIONAL_CONFLICT_DETECTED'
      };
    }
  }

  return {
    shiftDetected: false,
    actionRequired: 'CLEAR'
  };
}

/**
 * Asset Availability Model (Section 18 of specification)
 * Computes realistic asset condition distribution from real records rather than arbitrary numbers.
 */
export function calculateCorridorAssetAvailability(
  assets: InfrastructureAsset[],
  activeRequests: BlockRequest[]
): {
  totalAssets: number;
  availableCount: number;
  underMaintenanceCount: number;
  restrictedCount: number;
  restorationPendingCount: number;
  availabilityPercentage: number;
  breakdown: Record<InfrastructureCondition, number>;
} {
  const counts: Record<InfrastructureCondition, number> = {
    NORMAL: 0,
    NORMAL_RESTORED: 0,
    RESTRICTED: 0,
    RESTORATION_PENDING: 0,
    UNAVAILABLE: 0,
    UNDER_MAINTENANCE: 0
  };

  const assetStatusMap = new Map<string, InfrastructureCondition>();

  for (const asset of assets) {
    assetStatusMap.set(asset.assetId, 'NORMAL');
  }

  for (const req of activeRequests) {
    if (req.affectedAssets) {
      for (const assetId of req.affectedAssets) {
        if (assetStatusMap.has(assetId)) {
          if (req.status === 'Block Started' || req.status === 'Work in Progress') {
            assetStatusMap.set(assetId, 'UNDER_MAINTENANCE');
          } else if (req.infrastructureCondition === 'RESTORATION_PENDING') {
            assetStatusMap.set(assetId, 'RESTORATION_PENDING');
          } else if (req.infrastructureCondition === 'RESTRICTED' || req.operationalRestriction?.type === 'RESTRICTED') {
            assetStatusMap.set(assetId, 'RESTRICTED');
          }
        }
      }
    }
  }

  for (const [, cond] of assetStatusMap) {
    counts[cond] = (counts[cond] || 0) + 1;
  }

  const total = assets.length || 1;
  const available = counts.NORMAL;
  const pct = Number(((available / total) * 100).toFixed(1));

  return {
    totalAssets: total,
    availableCount: available,
    underMaintenanceCount: counts.UNDER_MAINTENANCE,
    restrictedCount: counts.RESTRICTED,
    restorationPendingCount: counts.RESTORATION_PENDING,
    availabilityPercentage: pct,
    breakdown: counts
  };
}
