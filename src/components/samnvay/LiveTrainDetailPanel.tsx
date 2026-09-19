// src/components/samnvay/LiveTrainDetailPanel.tsx
// Unified Live Train Detail & Maintenance Intelligence Panel for Rail Samnvay

import React, { useMemo } from 'react';
import type { LiveTrainPosition, DataSource } from '../../types/samnvay';
import { useSamnvayStore } from '../../store/useSamnvayStore';
import { classifyTrainWorkInteraction, buildRunIdentity } from '../../utils/trainIntelligence';
import { 
  X, 
  Train, 
  MapPin, 
  Gauge, 
  Clock, 
  Compass, 
  ShieldCheck, 
  Route as RouteIcon,
  Radio, 
  AlertTriangle, 
  ArrowRight, 
  Wrench,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  Navigation,
  GitCommit
} from 'lucide-react';
import { formatIndianTime } from '../../utils/dateTime';

export interface LiveTrainDetailPanelProps {
  train: LiveTrainPosition | null;
  source: DataSource;
  isOpen: boolean;
  onClose: () => void;
  routeGeometry?: any | null;
}

export const LiveTrainDetailPanel: React.FC<LiveTrainDetailPanelProps> = ({
  train,
  source,
  isOpen,
  onClose,
  routeGeometry
}) => {
  const { state } = useSamnvayStore();

  const hasGps = Boolean(
    train && 
    typeof train.latitude === 'number' && 
    typeof train.longitude === 'number' && 
    Number.isFinite(train.latitude) && 
    Number.isFinite(train.longitude) && 
    train.latitude !== 0 && 
    train.longitude !== 0
  );
  const isDelayed = Boolean(train && (train.delayMinutes || 0) > 0);
  const confidence = train?.confidence || (hasGps ? 'HIGH' : train?.currentStation ? 'MEDIUM' : 'LOW');

  // 1. Data Freshness State Determination (Must run unconditionally)
  const freshnessInfo = useMemo(() => {
    if (!train) {
      return {
        label: 'UNKNOWN',
        detail: 'No train selected',
        color: 'bg-slate-100 text-slate-700 border-slate-300',
        dotColor: 'bg-slate-400'
      };
    }
    if (source === 'DEMO') {
      return {
        label: 'DEMO DATA',
        detail: 'Synthetic demonstration timetable',
        color: 'bg-amber-100 text-amber-800 border-amber-300',
        dotColor: 'bg-amber-500'
      };
    }
    if (source === 'UNAVAILABLE') {
      return {
        label: 'LIVE OPERATIONAL DATA UNAVAILABLE',
        detail: 'Live train conflict validation unavailable. Timetable context only.',
        color: 'bg-rose-100 text-rose-800 border-rose-300',
        dotColor: 'bg-rose-500'
      };
    }
    const timestamp = train.upstreamUpdatedAt || train.lastUpdated;
    if (!timestamp) {
      return {
        label: 'UNKNOWN',
        detail: 'Insufficient operational data',
        color: 'bg-slate-100 text-slate-700 border-slate-300',
        dotColor: 'bg-slate-400'
      };
    }
    const parsedTs = new Date(timestamp).getTime();
    if (isNaN(parsedTs)) {
      return {
        label: 'UNKNOWN',
        detail: 'Insufficient operational data',
        color: 'bg-slate-100 text-slate-700 border-slate-300',
        dotColor: 'bg-slate-400'
      };
    }
    const ageSeconds = Math.max(0, Math.floor((Date.now() - parsedTs) / 1000));
    if (ageSeconds > 900) { // >15 minutes
      const min = Math.floor(ageSeconds / 60);
      return {
        label: 'STALE TELEMETRY',
        detail: `Last telemetry: ${min} min ago`,
        color: 'bg-amber-100 text-amber-800 border-amber-300',
        dotColor: 'bg-amber-500'
      };
    }
    return {
      label: 'RAILRADAR LIVE',
      detail: `Updated ${ageSeconds} sec ago · Source: RailRadar`,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      dotColor: 'bg-emerald-500 animate-pulse'
    };
  }, [source, train?.upstreamUpdatedAt, train?.lastUpdated, train]);

  // 2. Compute interaction with active maintenance requests
  const primaryInteraction = useMemo(() => {
    if (!train) return null;
    const requests = state.requests || [];
    const interactions = requests.map(req => {
      const sKm = req.startKm ?? 12.4;
      const eKm = req.endKm ?? 13.1;
      const track = req.affectedTracks?.[0] || 'UP Main';
      const interaction = classifyTrainWorkInteraction(
        train,
        {
          id: req.id,
          requestId: req.id,
          startKm: sKm,
          endKm: eKm,
          track,
          sectionId: req.section,
          isActiveNow: req.status === 'Active' || req.status === 'Work in Progress',
          blockStartTime: req.allocatedWindow?.startTime || '04:30',
          blockEndTime: req.allocatedWindow?.endTime || '06:30'
        },
        source
      );
      return { req, interaction };
    });

    const inRange = interactions.find(i => i.interaction.state === 'IN_AFFECTED_RANGE');
    if (inRange) return inRange;
    const approaching = interactions.find(i => i.interaction.state === 'APPROACHING');
    if (approaching) return approaching;
    const potential = interactions.find(i => i.interaction.state === 'POTENTIAL_CONFLICT');
    if (potential) return potential;
    const unknown = interactions.find(i => i.interaction.state === 'UNKNOWN');
    if (unknown) return unknown;
    return interactions[0] || null;
  }, [train, state.requests, source]);

  // 3. Sectional Traffic Context: Preceding and Following trains on same line/corridor
  const sectionalTraffic = useMemo<{
    preceding: { train: LiveTrainPosition; distanceKm: number } | null;
    following: { train: LiveTrainPosition; distanceKm: number } | null;
  }>(() => {
    if (!train) return { preceding: null, following: null };
    const liveTrains: LiveTrainPosition[] = state.liveData?.liveTrains || [];
    const otherTrains = liveTrains.filter(t => t.trainNumber !== train.trainNumber);
    if (otherTrains.length === 0) {
      return { preceding: null, following: null };
    }

    const currentTrainPos = train.distanceTravelledKm ?? train.currentKm ?? 0;
    const currentDirection = train.direction || 'UP';

    // Same direction trains
    const directionalTrains = otherTrains.filter(t => (t.direction || 'UP') === currentDirection);
    const candidateList = directionalTrains.length > 0 ? directionalTrains : otherTrains;

    let preceding: { train: LiveTrainPosition; distanceKm: number } | null = null;
    let following: { train: LiveTrainPosition; distanceKm: number } | null = null;

    candidateList.forEach(other => {
      const otherPos = other.distanceTravelledKm ?? other.currentKm ?? 0;
      const delta = otherPos - currentTrainPos;
      // In UP direction, greater distance means ahead
      const isAhead = currentDirection === 'UP' ? delta > 0 : delta < 0;
      const absDist = Math.abs(delta);

      if (isAhead) {
        if (!preceding || absDist < preceding.distanceKm) {
          preceding = { train: other, distanceKm: parseFloat(absDist.toFixed(1)) };
        }
      } else {
        if (!following || absDist < following.distanceKm) {
          following = { train: other, distanceKm: parseFloat(absDist.toFixed(1)) };
        }
      }
    });

    return { preceding, following };
  }, [train, state.liveData?.liveTrains]);

  // Early return ONLY after all hooks have been unconditionally registered
  if (!isOpen || !train) return null;
  
  // Format run identity
  const runId = train.runId || buildRunIdentity(train.trainNumber, train.serviceDate || train.startDate);

  // Route geometry coordinates count
  const geojsonCoords = routeGeometry?.geojson?.geometry?.coordinates || 
                        routeGeometry?.geometry?.coordinates ||
                        (Array.isArray(train.routeGeometry) ? train.routeGeometry : null);
  const coordCount = Array.isArray(geojsonCoords) ? geojsonCoords.length : 0;

  // Render Status Badge for Maintenance Interaction
  const renderInteractionBadge = (stateName?: string) => {
    switch (stateName) {
      case 'IN_AFFECTED_RANGE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-600 text-white flex items-center gap-1.5 animate-pulse shadow-xs">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>🔴 INSIDE WORK ZONE</span>
          </span>
        );
      case 'APPROACHING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500 text-white flex items-center gap-1.5 shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>🟠 APPROACHING</span>
          </span>
        );
      case 'POTENTIAL_CONFLICT':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-yellow-400 text-slate-950 flex items-center gap-1.5 border border-yellow-500 shadow-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>🟡 POTENTIAL CONFLICT</span>
          </span>
        );
      case 'UNKNOWN':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>⚪ UNKNOWN</span>
          </span>
        );
      case 'NO_INTERACTION':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-600 text-white flex items-center gap-1.5 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>🟢 NO INTERACTION</span>
          </span>
        );
    }
  };

  // Keyboard ESC listener for clean dismissal
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !train) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full border border-railway-border shadow-2xl space-y-4 font-mono max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-railway-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-railway-forest text-white font-bold text-xs">
                TRAIN {train.trainNumber}
              </span>
              <div className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${freshnessInfo.color}`}>
                <span className={`w-2 h-2 rounded-full ${freshnessInfo.dotColor}`} />
                <span>{freshnessInfo.label}</span>
              </div>
            </div>
            <h2 className="text-lg font-bold text-railway-textPrimary font-sans">
              {train.trainName || `Express ${train.trainNumber}`}
            </h2>
            <p className="text-[11px] text-railway-textSecondary font-sans">
              {freshnessInfo.detail}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Train Run Identity */}
        <div className="p-3 bg-slate-900 text-white rounded-2xl space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Canonical Run Identity</span>
          </div>
          <div className="text-xs font-bold text-cyan-300 flex items-center gap-2 flex-wrap">
            <span>{train.trainNumber}</span>
            <span>·</span>
            <span>{train.serviceDate || train.startDate || 'Current Run'}</span>
            <span>·</span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px]">
              {runId}
            </span>
          </div>
        </div>

        {/* Key Telemetry Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Status */}
          <div className="p-3 bg-railway-canvas rounded-2xl border border-railway-border">
            <span className="text-railway-textMuted text-[10px] uppercase block font-bold">Operational Status</span>
            <strong className="text-railway-textPrimary text-sm mt-0.5 block">{train.status || 'RUNNING'}</strong>
          </div>

          {/* Telemetry Confidence */}
          <div className="p-3 bg-railway-canvas rounded-2xl border border-railway-border">
            <span className="text-railway-textMuted text-[10px] uppercase block font-bold">Telemetry Confidence</span>
            <strong className={`text-sm mt-0.5 block ${
              confidence === 'HIGH' ? 'text-emerald-700' :
              confidence === 'MEDIUM' ? 'text-cyan-700' :
              confidence === 'LOW' ? 'text-amber-700' : 'text-rose-700'
            }`}>
              {confidence}
            </strong>
          </div>

          {/* Current Location */}
          <div className="p-3 bg-railway-canvas rounded-2xl border border-railway-border">
            <span className="text-railway-textMuted text-[10px] uppercase block font-bold">Current Location</span>
            <strong className="text-railway-textPrimary text-xs mt-0.5 block truncate">
              {train.currentStationName || train.currentStation 
                ? `${train.currentStationName || train.currentStation} (${train.currentStation})`
                : (train.currentKm != null && Number.isFinite(Number(train.currentKm)))
                ? `KM ${Number(train.currentKm).toFixed(1)}` 
                : 'Not available'}
            </strong>
            {hasGps && (
              <span className="text-[10px] text-slate-500 block mt-0.5">
                GPS: {Number(train.latitude).toFixed(4)}, {Number(train.longitude).toFixed(4)}
              </span>
            )}
          </div>

          {/* Next Known Station */}
          <div className="p-3 bg-railway-canvas rounded-2xl border border-railway-border">
            <span className="text-railway-textMuted text-[10px] uppercase block font-bold">Next Known Station</span>
            <strong className="text-railway-textPrimary text-xs mt-0.5 block truncate">
              {train.nextStationName || train.nextStation 
                ? `${train.nextStationName || train.nextStation} (${train.nextStation})` 
                : 'Not available'}
            </strong>
            {train.expectedArrival && (
              <span className="text-[10px] text-cyan-700 block mt-0.5">
                ETA: {train.expectedArrival} IST
              </span>
            )}
          </div>

          {/* Speed */}
          <div className="p-3 bg-railway-canvas rounded-2xl border border-railway-border">
            <span className="text-railway-textMuted text-[10px] uppercase block font-bold">Speed</span>
            <strong className="text-railway-textPrimary text-sm mt-0.5 block">
              {train.speedKmph !== undefined ? `${train.speedKmph} km/h` : 'Not available'}
            </strong>
          </div>

          {/* Delay */}
          <div className="p-3 bg-railway-canvas rounded-2xl border border-railway-border">
            <span className="text-railway-textMuted text-[10px] uppercase block font-bold">Delay</span>
            <strong className={`text-sm mt-0.5 block ${isDelayed ? 'text-amber-700' : 'text-emerald-700'}`}>
              {train.delayMinutes !== undefined 
                ? (train.delayMinutes > 0 ? `+${train.delayMinutes} min Late` : 'Right Time (RT)')
                : 'Not available'}
            </strong>
          </div>

          {/* Track & Direction */}
          <div className="p-3 bg-railway-canvas rounded-2xl border border-railway-border">
            <span className="text-railway-textMuted text-[10px] uppercase block font-bold">Track / Direction</span>
            <strong className="text-railway-textPrimary text-xs mt-0.5 block">
              {train.direction ? `${train.direction} Line` : 'UNKNOWN'} • {train.platform ? `PF-${train.platform}` : 'Through Line'}
            </strong>
          </div>

          {/* Last Telemetry Sync */}
          <div className="p-3 bg-railway-canvas rounded-2xl border border-railway-border">
            <span className="text-railway-textMuted text-[10px] uppercase block font-bold">Last Telemetry</span>
            <strong className="text-railway-textPrimary text-xs mt-0.5 block">
              {train.upstreamUpdatedAt 
                ? formatIndianTime(train.upstreamUpdatedAt) 
                : train.lastUpdated 
                ? formatIndianTime(train.lastUpdated) 
                : 'Not available'}
            </strong>
          </div>
        </div>

        {/* 4. MAINTENANCE WORK-ZONE INTERACTION CARD (Section 17 Specification) */}
        <div className="p-4 bg-neutral-50 rounded-2xl border border-railway-border space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-2.5">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-emerald-700" />
              <span className="font-bold text-xs text-railway-textPrimary uppercase tracking-wider">
                Maintenance Work-Zone Interaction
              </span>
            </div>
            <div>
              {renderInteractionBadge(primaryInteraction?.interaction.state)}
            </div>
          </div>

          {primaryInteraction && primaryInteraction.req ? (
            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 bg-white rounded-xl border border-neutral-200 text-[11px]">
                <div>
                  <span className="text-neutral-500 block text-[10px]">Work ID:</span>
                  <strong className="text-neutral-900">{primaryInteraction.req.id}</strong>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">Department:</span>
                  <strong className="text-neutral-900">{primaryInteraction.req.department || 'Engineering'}</strong>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">Section:</span>
                  <strong className="text-neutral-900">{primaryInteraction.req.section || 'MAG–GNT'}</strong>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">Chainage:</span>
                  <strong className="text-neutral-900">KM {primaryInteraction.req.startKm}–{primaryInteraction.req.endKm}</strong>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">Track / Line:</span>
                  <strong className="text-neutral-900">{primaryInteraction.req.affectedTracks?.[0] || 'UP Main'}</strong>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">Maintenance Window:</span>
                  <strong className="text-neutral-900">
                    {primaryInteraction.req.allocatedWindow?.startTime || primaryInteraction.req.preferredStartTime || '04:30'}–
                    {primaryInteraction.req.allocatedWindow?.endTime || '06:30'}
                  </strong>
                </div>
              </div>

              {/* Distance & Projection */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-white rounded-xl border border-neutral-200 text-[11px]">
                <div>
                  <span className="text-neutral-500 text-[10px] block">Current Distance to Work Zone:</span>
                  <strong className="text-slate-900">
                    {primaryInteraction.interaction.distanceKm != null 
                      ? `${primaryInteraction.interaction.distanceKm} km away`
                      : primaryInteraction.interaction.state === 'IN_AFFECTED_RANGE'
                      ? 'Inside Possession Zone (0.0 km)'
                      : 'Not in approach path'}
                  </strong>
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] block">Projected Work Arrival:</span>
                  <strong className="text-cyan-800">
                    {primaryInteraction.interaction.projectedEta || (
                      primaryInteraction.interaction.etaMinutes != null 
                        ? `in ${primaryInteraction.interaction.etaMinutes} min`
                        : 'N/A (Clear)'
                    )}
                  </strong>
                </div>
              </div>

              {/* Operational Justification (WHY) */}
              <div className="p-2.5 rounded-xl bg-slate-900 text-slate-100 text-[11px] space-y-1">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                  Operational Justification (Why):
                </span>
                <p className="font-sans text-slate-300 leading-snug">
                  {primaryInteraction.interaction.state === 'IN_AFFECTED_RANGE'
                    ? `Train is physically inside the designated maintenance possession envelope (KM ${primaryInteraction.req.startKm}–${primaryInteraction.req.endKm}) on ${primaryInteraction.req.affectedTracks?.[0] || 'affected track'}.`
                    : primaryInteraction.interaction.state === 'APPROACHING'
                    ? `Train's remaining route is directed toward active work zone ${primaryInteraction.req.id}. Movement state indicates impending arrival within proximity buffer.`
                    : primaryInteraction.interaction.state === 'POTENTIAL_CONFLICT'
                    ? `Train's remaining route intersects affected ${primaryInteraction.req.affectedTracks?.[0] || 'track'} and projected occupation overlaps the possession window.`
                    : primaryInteraction.interaction.state === 'UNKNOWN'
                    ? `Telemetry or track route vector is unverified. Under railway safety rules, missing telemetry cannot be certified safe.`
                    : `Train's remaining route does not intersect the possession track or the work zone is physically behind current position.`}
                </p>
              </div>

              {/* UNKNOWN Safety Invariant Warning */}
              {primaryInteraction.interaction.state === 'UNKNOWN' && (
                <div className="text-[10px] text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                    <span>SAFETY INVARIANT: UNKNOWN != NO_INTERACTION</span>
                  </div>
                  <p className="text-[10px] text-amber-800 font-sans leading-normal">
                    The system cannot verify physical track or route vector from external telemetry. 
                    Never treat unconfirmed telemetry as a safe possession clear.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-emerald-800 font-sans py-1">
              Train movement is clear of all currently active or scheduled railway possession windows.
            </p>
          )}
        </div>

        {/* 5. SECTIONAL TRAFFIC CONTEXT CARD (Section 18 Specification) */}
        <div className="p-4 bg-neutral-50 rounded-2xl border border-railway-border space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-railway-textPrimary uppercase tracking-wider flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-cyan-600" />
              <span>Sectional Traffic Context</span>
            </span>
            <span className="text-[10px] font-mono text-neutral-500">
              Corridor Headway Status
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Preceding Train */}
            <div className="p-2.5 bg-white rounded-xl border border-neutral-200 flex items-center justify-between text-[11px]">
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase font-bold">Preceding Train</span>
                {sectionalTraffic.preceding ? (
                  <div>
                    <strong className="text-slate-900">{sectionalTraffic.preceding.train.trainNumber}</strong>
                    <span className="text-neutral-600 ml-1">({sectionalTraffic.preceding.train.trainName || 'Express'})</span>
                  </div>
                ) : (
                  <span className="text-neutral-400 italic">No train immediately ahead</span>
                )}
              </div>
              {sectionalTraffic.preceding && (
                <div className="text-right">
                  <span className="font-bold text-cyan-700 font-mono">+{sectionalTraffic.preceding.distanceKm} km ahead</span>
                  <div className="text-[10px] text-neutral-500">{sectionalTraffic.preceding.train.nextStation || 'Enroute'}</div>
                </div>
              )}
            </div>

            {/* Selected Train Position */}
            <div className="p-2.5 bg-cyan-50 rounded-xl border border-cyan-200 flex items-center justify-between text-[11px]">
              <div>
                <span className="text-[10px] text-cyan-800 block uppercase font-bold">Selected Train</span>
                <strong className="text-cyan-950 font-bold">{train.trainNumber} {train.trainName}</strong>
              </div>
              <div className="text-right">
                <span className="font-bold text-cyan-900 font-mono">{train.speedKmph || 85} km/h</span>
                <div className="text-[10px] text-cyan-700">{train.direction || 'UP'} Line</div>
              </div>
            </div>

            {/* Following Train */}
            <div className="p-2.5 bg-white rounded-xl border border-neutral-200 flex items-center justify-between text-[11px]">
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase font-bold">Following Train</span>
                {sectionalTraffic.following ? (
                  <div>
                    <strong className="text-slate-900">{sectionalTraffic.following.train.trainNumber}</strong>
                    <span className="text-neutral-600 ml-1">({sectionalTraffic.following.train.trainName || 'Express'})</span>
                  </div>
                ) : (
                  <span className="text-neutral-400 italic">No train immediately following</span>
                )}
              </div>
              {sectionalTraffic.following && (
                <div className="text-right">
                  <span className="font-bold text-amber-700 font-mono">-{sectionalTraffic.following.distanceKm} km behind</span>
                  <div className="text-[10px] text-neutral-500">{sectionalTraffic.following.train.currentStation || 'Enroute'}</div>
                </div>
              )}
            </div>

            <p className="text-[10px] text-neutral-500 font-sans leading-tight pt-1">
              Note: Headway and sectional spacing are monitored along the line. Trains represent operational dependencies only when constrained by mutual block possessions or shared signals.
            </p>
          </div>
        </div>

        {/* 6. Route Geometry Vector Status */}
        <div className="p-3.5 bg-neutral-50 rounded-2xl border border-railway-border space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-railway-textPrimary flex items-center gap-1.5">
              <RouteIcon className="w-4 h-4 text-cyan-600" />
              <span>Route Intelligence</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-neutral-300">
              {coordCount > 0 ? 'GEOMETRY VERIFIED' : 'NO ROUTE VECTOR'}
            </span>
          </div>
          {coordCount > 0 ? (
            <p className="text-[11px] text-neutral-600 leading-snug font-sans">
              Verified <strong>{coordCount.toLocaleString()}</strong> route waypoints loaded from RailRadar vector geometry along the corridor alignment.
            </p>
          ) : (
            <p className="text-[11px] text-amber-700 italic font-sans">
              Route geometry vector unavailable for this service. No straight-line decorative approximations applied.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-railway-border">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-railway-forest text-white text-xs font-semibold hover:bg-emerald-800 transition cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
