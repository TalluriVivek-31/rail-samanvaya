// src/components/samnvay/NearbyTrainIntelligenceWidget.tsx
// Maintenance Location -> Nearby Train Intelligence, Train-Work Interaction & Conflict Timeline
// Complies with Section 7, 8, 9, 12, and 16 Specifications

import React from 'react';
import type { 
  BlockRequest, 
  LiveTrainPosition, 
  DataSource,
  NearbyTrainMovementIntelligence,
  TrainMaintenanceInteractionState
} from '../../types/samnvay';
import { 
  getNearbyTrainsForLocation, 
  classifyTrainWorkInteraction 
} from '../../utils/trainIntelligence';
import { 
  Train, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  Compass, 
  Radio, 
  CheckCircle2,
  Activity,
  ArrowRight
} from 'lucide-react';

export interface NearbyTrainIntelligenceWidgetProps {
  request: BlockRequest;
  liveTrains: LiveTrainPosition[];
  dataSource: DataSource;
  onSelectTrain?: (trainNumber: string) => void;
}

export const NearbyTrainIntelligenceWidget: React.FC<NearbyTrainIntelligenceWidgetProps> = ({
  request,
  liveTrains,
  dataSource,
  onSelectTrain
}) => {
  const startKm = request.startKm ?? 12.4;
  const endKm = request.endKm ?? 13.1;
  const affectedTrack = request.affectedTracks?.[0] || 'UP Main';
  const blockStartTime = request.allocatedWindow?.startTime || request.preferredStartTime || '04:30';
  const blockEndTime = request.allocatedWindow?.endTime || '06:30';

  const nearbyTrains = getNearbyTrainsForLocation(
    {
      startKm,
      endKm,
      track: affectedTrack,
      sectionId: request.section,
      blockStartTime,
      blockEndTime
    },
    liveTrains,
    dataSource
  );

  // Train movement impact summary (Section 16)
  const hardConflictsCount = nearbyTrains.filter(t => t.conflictSeverity === 'HARD_CONFLICT' || t.interactionState === 'IN_AFFECTED_RANGE').length;
  const potentialConflictsCount = nearbyTrains.filter(t => t.interactionState === 'POTENTIAL_CONFLICT').length;
  const knownClearCount = nearbyTrains.filter(t => t.interactionState === 'NO_INTERACTION' || t.conflictSeverity === 'NONE').length;
  const unknownTelemetryCount = nearbyTrains.filter(t => t.interactionState === 'UNKNOWN' || t.confidence === 'UNKNOWN').length;

  const isUnknownSafetyState = dataSource === 'UNAVAILABLE' || unknownTelemetryCount > 0 && hardConflictsCount === 0;

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              TRAIN MOVEMENT INTELLIGENCE · PROXIMITY RADAR
            </span>
          </div>
          <h3 className="text-base font-bold text-white font-sans">
            Maintenance Location: KM {startKm.toFixed(1)} – {endKm.toFixed(1)} ({affectedTrack})
          </h3>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Automatic spatial proximity correlation for Requisition #{request.id} ({request.work})
          </p>
        </div>

        {/* Telemetry Status Badge */}
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
            dataSource === 'LIVE'
              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
              : dataSource === 'DEMO'
              ? 'bg-amber-950 text-amber-300 border-amber-500/40'
              : 'bg-rose-950 text-rose-300 border-rose-500/40'
          }`}>
            <Radio className="w-3 h-3 animate-pulse" />
            <span>{dataSource === 'LIVE' ? 'RAILRADAR ● LIVE TELEMETRY' : dataSource === 'DEMO' ? 'RAILRADAR ● DEMO' : 'TELEMETRY OFFLINE'}</span>
          </span>
        </div>
      </div>

      {/* Train Movement Impact Summary Cards (Section 16) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700">
          <span className="text-[10px] uppercase text-slate-400 block font-bold">Relevant Trains</span>
          <strong className="text-lg text-white block mt-0.5">{nearbyTrains.length}</strong>
        </div>
        <div className={`p-3 rounded-2xl border ${hardConflictsCount > 0 ? 'bg-red-950/60 border-red-500 text-red-200' : 'bg-slate-800/60 border-slate-700'}`}>
          <span className="text-[10px] uppercase text-slate-400 block font-bold">Hard Conflicts</span>
          <strong className={`text-lg block mt-0.5 ${hardConflictsCount > 0 ? 'text-red-400 font-black' : 'text-slate-300'}`}>{hardConflictsCount}</strong>
        </div>
        <div className={`p-3 rounded-2xl border ${potentialConflictsCount > 0 ? 'bg-amber-950/50 border-amber-500 text-amber-200' : 'bg-slate-800/60 border-slate-700'}`}>
          <span className="text-[10px] uppercase text-slate-400 block font-bold">Potential Conflicts</span>
          <strong className={`text-lg block mt-0.5 ${potentialConflictsCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>{potentialConflictsCount}</strong>
        </div>
        <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700">
          <span className="text-[10px] uppercase text-slate-400 block font-bold">Known Clear</span>
          <strong className="text-lg text-emerald-400 block mt-0.5">{knownClearCount}</strong>
        </div>
        <div className={`p-3 rounded-2xl border ${unknownTelemetryCount > 0 ? 'bg-purple-950/50 border-purple-500' : 'bg-slate-800/60 border-slate-700'}`}>
          <span className="text-[10px] uppercase text-slate-400 block font-bold">Unknown Telemetry</span>
          <strong className={`text-lg block mt-0.5 ${unknownTelemetryCount > 0 ? 'text-purple-300 font-bold' : 'text-slate-300'}`}>{unknownTelemetryCount}</strong>
        </div>
      </div>

      {/* Unknown Telemetry Safety Alert (Section 12) */}
      {isUnknownSafetyState && (
        <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500 text-purple-200 text-xs font-sans space-y-1">
          <div className="flex items-center gap-2 font-mono font-bold text-purple-300">
            <ShieldAlert className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>MANDATORY SAFETY RULE: UNKNOWN TELEMETRY STATE</span>
          </div>
          <p>
            Current train telemetry could not be reliably verified. System strictly does <strong>NOT</strong> assume NO CONFLICT. Manual controller verification is mandatory prior to granting track possession.
          </p>
        </div>
      )}

      {/* Nearby Trains List (Section 7 & 8) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider">
            Approaching &amp; Relevant Rakes ({nearbyTrains.length})
          </span>
          <span className="text-[10px] text-slate-400">
            Target Possession: {blockStartTime} – {blockEndTime} IST
          </span>
        </div>

        {nearbyTrains.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/40 rounded-2xl border border-slate-800">
            No active train movements currently approaching within 60 km of this maintenance work zone.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {nearbyTrains.map((t) => {
              const isHard = t.interactionState === 'IN_AFFECTED_RANGE' || t.conflictSeverity === 'HARD_CONFLICT';
              const isPotential = t.interactionState === 'POTENTIAL_CONFLICT';
              const isApproaching = t.interactionState === 'APPROACHING';
              const isUnknown = t.interactionState === 'UNKNOWN';

              return (
                <div
                  key={t.trainNumber}
                  onClick={() => onSelectTrain?.(t.trainNumber)}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-2 cursor-pointer ${
                    isHard
                      ? 'bg-red-950/50 border-red-500/70 hover:border-red-400'
                      : isPotential
                      ? 'bg-amber-950/40 border-amber-500/60 hover:border-amber-400'
                      : isUnknown
                      ? 'bg-purple-950/40 border-purple-500/60 hover:border-purple-400'
                      : 'bg-slate-800/40 border-slate-700/80 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold text-xs border border-cyan-800">
                          {t.trainNumber}
                        </span>
                        <strong className="text-white text-xs font-sans truncate">{t.trainName}</strong>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Run: <span className="text-slate-300 font-bold">{t.runId}</span> · Line: <span className="text-slate-300 font-bold">{t.direction}</span>
                      </div>
                    </div>

                    {/* Interaction Badge (Section 8) */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide whitespace-nowrap border ${
                      isHard
                        ? 'bg-red-900 text-red-100 border-red-400 animate-pulse'
                        : isPotential
                        ? 'bg-amber-900 text-amber-100 border-amber-400'
                        : isUnknown
                        ? 'bg-purple-900 text-purple-100 border-purple-400'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-500'
                    }`}>
                      {t.interactionState.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Telemetry metrics */}
                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-2 border-t border-slate-700/60 text-slate-300">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Current Pos</span>
                      <strong className="text-white">{t.currentLocationDescription}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Distance</span>
                      <strong className="text-cyan-300">
                        {t.distanceToWorkAreaKm !== null ? `${t.distanceToWorkAreaKm} km` : 'Unverified'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">ETA at Work</span>
                      <strong className={isHard ? 'text-red-400' : isPotential ? 'text-amber-300' : 'text-emerald-300'}>
                        {t.projectedEta ? `${t.projectedEta} (~${t.etaMinutes}m)` : 'Unverified'}
                      </strong>
                    </div>
                  </div>

                  {/* Conflict Reason Explanation */}
                  <div className="text-[10px] text-slate-400 font-sans leading-tight pt-1">
                    {t.conflictReason}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Train Conflict Timeline Preview (Section 9) */}
      <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Train Passage vs Maintenance Window Timeline</span>
          </span>
          <span className="text-[10px] text-slate-400">
            Window: {blockStartTime} – {blockEndTime} IST
          </span>
        </div>

        {/* Timeline Visualization Bar */}
        <div className="space-y-2">
          <div className="relative h-8 bg-slate-800 rounded-xl overflow-hidden border border-slate-700 flex items-center">
            {/* Maintenance Window Block Bar */}
            <div className="absolute left-[20%] right-[30%] h-full bg-cyan-600/60 border-x-2 border-cyan-400 flex items-center justify-center text-[10px] font-bold text-white shadow-inner">
              POSSESSION WINDOW ({blockStartTime} – {blockEndTime})
            </div>

            {/* Approaching Trains Markers */}
            {nearbyTrains.slice(0, 3).map((t, idx) => {
              const isConflicting = t.interactionState === 'IN_AFFECTED_RANGE' || t.interactionState === 'POTENTIAL_CONFLICT';
              const offset = isConflicting ? 35 + idx * 10 : 75 + idx * 8;
              return (
                <div 
                  key={t.trainNumber}
                  style={{ left: `${Math.min(92, offset)}%` }}
                  className="absolute -translate-x-1/2 flex flex-col items-center group cursor-pointer z-10"
                  title={`Train ${t.trainNumber} ETA: ${t.projectedEta}`}
                >
                  <div className={`w-3 h-3 rounded-full border-2 ${isConflicting ? 'bg-red-500 border-white animate-ping' : 'bg-emerald-400 border-slate-900'}`} />
                  <span className="text-[8px] font-bold text-white bg-slate-900/90 px-1 rounded shadow-xs mt-0.5">
                    {t.trainNumber}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[9px] text-slate-400 font-mono">
            <span>02:00</span>
            <span>04:00</span>
            <span>06:00</span>
            <span>08:00</span>
            <span>10:00</span>
          </div>
        </div>
      </div>
    </div>
  );
};
