// Formal Activity Network Critical Path Method (CPM) Engine
// Indian Railways · Automatic Block Planning Architecture (SIH 2026 PS 26027)

import { BlockRequest, CpmActivity, CpmAnalysisResult } from '../types/samnvay';

/**
 * Formal Activity Network Critical Path Method (CPM) Engine.
 * 
 * Takes a coordinated maintenance package and models the directed activity network:
 * 1. Prerequisites (Power isolation, Signal disconnection)
 * 2. Parallel / Concurrent Maintenance Tasks (P.Way, TRD, S&T)
 * 3. Inspection & Safety Release Tasks (Track clearance muster, power restoration, testing)
 * 
 * Computes:
 * - Forward Pass: Early Start (ES) and Early Finish (EF)
 * - Backward Pass: Late Start (LS) and Late Finish (LF)
 * - Total Float: TF = LS - ES (Critical when TF == 0)
 * - Critical Path Duration
 * - Block Utilization % = (Critical Path Duration / Available Window) * 100
 * - Aggregate Work Density % = (Sum of Durations / Available Window) * 100
 */
export function calculateCpmActivityNetwork(
  requests: BlockRequest[],
  availableWindowMinutes: number = 135
): CpmAnalysisResult {
  if (requests.length === 0) {
    return {
      activities: [],
      parallelActivityCount: 0,
      sequentialDependencyCount: 0,
      criticalPathDuration: 0,
      criticalActivities: [],
      nonCriticalActivities: [],
      availableWindowMinutes,
      blockUtilizationPercent: 0,
      aggregateWorkDensityPercent: 0,
    };
  }

  const activities: CpmActivity[] = [];
  const requiresPower = requests.some(r => r.powerBlockRequired || r.department === 'TRD' || (r.work && r.work.toLowerCase().includes('ohe')));
  const requiresSnt = requests.some(r => r.sntDisconnectionRequired || r.department === 'S&T' || (r.work && r.work.toLowerCase().includes('signal')));

  // 1. Initial Prerequisites
  if (requiresPower) {
    activities.push({
      id: 'ACT-TRD-ISO',
      name: 'TRD 25kV OHE Power Isolation & Earthing Discharge',
      department: 'TRD',
      durationMinutes: 15,
      prerequisites: [],
      earlyStart: 0,
      earlyFinish: 15,
      lateStart: 0,
      lateFinish: 15,
      totalFloat: 0,
      isCritical: true,
    });
  }

  if (requiresSnt) {
    activities.push({
      id: 'ACT-SNT-DIS',
      name: 'S&T Signal Disconnection & Point Locking Notice',
      department: 'S&T',
      durationMinutes: 15,
      prerequisites: [],
      earlyStart: 0,
      earlyFinish: 15,
      lateStart: 0,
      lateFinish: 15,
      totalFloat: 0,
      isCritical: true,
    });
  }

  // 2. Departmental Execution Tasks (Parallel if track compatible)
  const workActivityIds: string[] = [];
  for (const req of requests) {
    const actId = `ACT-${req.id}`;
    workActivityIds.push(actId);

    const reqPrereqs: string[] = [];
    if (requiresPower && (req.powerBlockRequired || req.department === 'TRD' || req.department === 'P.Way')) {
      reqPrereqs.push('ACT-TRD-ISO');
    }
    if (requiresSnt && (req.sntDisconnectionRequired || req.department === 'S&T')) {
      reqPrereqs.push('ACT-SNT-DIS');
    }

    activities.push({
      id: actId,
      name: `${req.department} Main Work: ${req.workCategory || req.work} (${req.id})`,
      department: req.department,
      durationMinutes: req.duration || 60,
      prerequisites: reqPrereqs,
      earlyStart: 0,
      earlyFinish: 0,
      lateStart: 0,
      lateFinish: 0,
      totalFloat: 0,
      isCritical: false,
    });
  }

  // 3. Post-Work Clearance & Inspection
  activities.push({
    id: 'ACT-INSP-CLR',
    name: 'G&SR Chapter XV Track Clearance & Gang Muster Certification',
    department: 'Operations',
    durationMinutes: 15,
    prerequisites: [...workActivityIds],
    earlyStart: 0,
    earlyFinish: 0,
    lateStart: 0,
    lateFinish: 0,
    totalFloat: 0,
    isCritical: false,
  });

  let lastPrereqs = ['ACT-INSP-CLR'];

  if (requiresPower) {
    activities.push({
      id: 'ACT-TRD-REST',
      name: 'TRD Catenary Inspection & 25kV Power Restoration',
      department: 'TRD',
      durationMinutes: 10,
      prerequisites: ['ACT-INSP-CLR'],
      earlyStart: 0,
      earlyFinish: 0,
      lateStart: 0,
      lateFinish: 0,
      totalFloat: 0,
      isCritical: false,
    });
    lastPrereqs = ['ACT-TRD-REST'];
  }

  // Final Possession Release
  activities.push({
    id: 'ACT-FINAL-REL',
    name: 'Section Controller Operating Block Memo Cancellation & Line Normalization',
    department: 'Operations',
    durationMinutes: 5,
    prerequisites: lastPrereqs,
    earlyStart: 0,
    earlyFinish: 0,
    lateStart: 0,
    lateFinish: 0,
    totalFloat: 0,
    isCritical: false,
  });

  // FORWARD PASS
  for (const act of activities) {
    if (act.prerequisites.length === 0) {
      act.earlyStart = 0;
      act.earlyFinish = act.durationMinutes;
    } else {
      let maxPreEf = 0;
      for (const pId of act.prerequisites) {
        const pAct = activities.find(a => a.id === pId);
        if (pAct && pAct.earlyFinish > maxPreEf) {
          maxPreEf = pAct.earlyFinish;
        }
      }
      act.earlyStart = maxPreEf;
      act.earlyFinish = act.earlyStart + act.durationMinutes;
    }
  }

  const criticalPathDuration = Math.max(...activities.map(a => a.earlyFinish));

  // BACKWARD PASS
  for (let i = activities.length - 1; i >= 0; i--) {
    const act = activities[i];
    const successors = activities.filter(a => a.prerequisites.includes(act.id));
    if (successors.length === 0) {
      act.lateFinish = criticalPathDuration;
      act.lateStart = act.lateFinish - act.durationMinutes;
    } else {
      let minSuccLs = Infinity;
      for (const s of successors) {
        if (s.lateStart < minSuccLs) {
          minSuccLs = s.lateStart;
        }
      }
      act.lateFinish = minSuccLs;
      act.lateStart = act.lateFinish - act.durationMinutes;
    }

    act.totalFloat = Math.max(0, act.lateStart - act.earlyStart);
    act.isCritical = act.totalFloat === 0;
  }

  const criticalActivities = activities.filter(a => a.isCritical).map(a => a.name);
  const nonCriticalActivities = activities
    .filter(a => !a.isCritical)
    .map(a => ({ name: a.name, floatMinutes: a.totalFloat }));

  const sumAllDurations = activities.reduce((sum, a) => sum + a.durationMinutes, 0);
  const blockUtilizationPercent = Number(((Math.min(criticalPathDuration, availableWindowMinutes) / availableWindowMinutes) * 100).toFixed(1));
  const aggregateWorkDensityPercent = Number(((sumAllDurations / availableWindowMinutes) * 100).toFixed(1));

  const parallelActivityCount = activities.filter(a => {
    return activities.some(other => other.id !== a.id && 
      !(other.earlyFinish <= a.earlyStart || other.earlyStart >= a.earlyFinish));
  }).length;

  const sequentialDependencyCount = activities.reduce((sum, a) => sum + a.prerequisites.length, 0);

  return {
    activities,
    parallelActivityCount,
    sequentialDependencyCount,
    criticalPathDuration,
    criticalActivities,
    nonCriticalActivities,
    availableWindowMinutes,
    blockUtilizationPercent,
    aggregateWorkDensityPercent,
  };
}
