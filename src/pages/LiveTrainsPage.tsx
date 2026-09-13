import React, { useState, useEffect } from 'react';
import { 
  TrainTrack, 
  Search, 
  RefreshCw, 
  Radio, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  Activity, 
  ShieldCheck, 
  Gauge, 
  Calendar, 
  ExternalLink 
} from 'lucide-react';
import { useSamnvayStore } from '../store/useSamnvayStore';
import { useCorridorTrains, useStationBoard, useLiveTrainSearch } from '../hooks/useRailRadar';
import { STATIONS } from '../data/corridorData';
import { useLiveClock, formatIndianTime, formatDelay } from '../utils/dateTime';
import type { LiveTrainPosition, StationBoardEntry } from '../types/samnvay';

export const LiveTrainsPage: React.FC = () => {
  const { state, toggleLiveMode, updateLiveTrains, updateStationBoard } = useSamnvayStore();
  const [selectedStation, setSelectedStation] = useState<string>('BPP');
  const [searchQuery, setSearchQuery] = useState('');

  // True runtime current clock (Asia/Kolkata IST) updating every second
  const { formattedDateTime: currentLiveDateTime } = useLiveClock(1000);

  // Corridor live tracking hook with 30s interval
  const { 
    trains, 
    source, 
    lastUpdated, 
    upstreamUpdatedAt,
    isLoading, 
    refetch, 
    error: corridorError 
  } = useCorridorTrains(state.isLiveMode, true, 30_000);
  
  // Station live board hook with 30s interval
  const { 
    entries: stationEntries, 
    isLoading: isStationLoading, 
    refetch: refetchStation 
  } = useStationBoard(selectedStation, state.isLiveMode, true, 30_000);

  // Single train lookup tied to current live mode
  const { 
    train: searchedTrain, 
    isLoading: isSearching, 
    search, 
    clear: clearSearch, 
    error: searchError 
  } = useLiveTrainSearch(state.isLiveMode);

  // Sync with Samnvay Store whenever trains update
  useEffect(() => {
    if (trains && trains.length > 0) {
      updateLiveTrains(trains, source, corridorError);
    } else if (source === 'UNAVAILABLE') {
      updateLiveTrains([], 'UNAVAILABLE', corridorError);
    }
  }, [trains, source, corridorError, updateLiveTrains]);

  // Sync Station Board with Store
  useEffect(() => {
    if (stationEntries && stationEntries.length > 0) {
      updateStationBoard(selectedStation, stationEntries, source);
    }
  }, [stationEntries, selectedStation, source, updateStationBoard]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      search(searchQuery.trim(), true);
    }
  };

  const formatKm = (km: any) => {
    const num = typeof km === 'number' ? km : parseFloat(km);
    return isNaN(num) ? '320.0' : num.toFixed(1);
  };

  const safeTrains = Array.isArray(trains) ? trains : [];
  const safeStationEntries = Array.isArray(stationEntries) ? stationEntries : [];

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* 1. Header & Live Stream Status Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-railway-border shadow-soft flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-railway-canvas flex items-center justify-center text-railway-forest border border-railway-border shadow-xs">
                <TrainTrack className="w-5 h-5 text-railway-forest" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-railway-textPrimary">
                RailRadar™ Live Movement Stream
              </h1>
            </div>
            <p className="text-sm text-railway-textSecondary max-w-2xl">
              Corridor telemetry feed for the Vijayawada (BZA) Division trunk route. Real-time section passage, dynamic headway, and live platform displays.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Data Source Pill */}
            {source === 'LIVE' ? (
              <div className="px-3.5 py-1.5 rounded-full border text-xs font-mono font-medium flex items-center gap-2 bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                FEED: LIVE RAILRADAR
              </div>
            ) : source === 'UNAVAILABLE' ? (
              <div className="px-3.5 py-1.5 rounded-full border text-xs font-mono font-medium flex items-center gap-2 bg-red-50 text-red-700 border-red-200 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                FEED: LIVE DATA UNAVAILABLE
              </div>
            ) : (
              <div className="px-3.5 py-1.5 rounded-full border text-xs font-mono font-medium flex items-center gap-2 bg-amber-50 text-amber-700 border-amber-200 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                FEED: DEMO TIMETABLE
              </div>
            )}

            {/* Live / Demo Mode Switcher */}
            <button
              onClick={toggleLiveMode}
              className={`px-3.5 py-1.5 rounded-full border text-xs font-mono font-medium flex items-center gap-2 shadow-xs transition-all ${
                state.isLiveMode
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
              title="Click to toggle between LIVE RailRadar feed and DEMO simulation mode"
            >
              <span className={`w-2 h-2 rounded-full ${state.isLiveMode ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{state.isLiveMode ? 'MODE: LIVE API' : 'MODE: DEMO TIMETABLE'}</span>
            </button>

            {/* Explicit Manual Refresh Button */}
            <button
              onClick={async () => {
                await Promise.all([refetch(), refetchStation()]);
              }}
              disabled={isLoading || isStationLoading}
              className="px-4 py-2 rounded-full border border-railway-border text-railway-textPrimary font-semibold text-xs hover:text-railway-forest hover:bg-railway-canvas transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
              title="Request fresh upstream RailRadar telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(isLoading || isStationLoading) ? 'animate-spin text-railway-forest' : 'text-railway-textSecondary'}`} />
              <span>Refresh Feed</span>
            </button>
          </div>
        </div>

        {/* Section 13 UI Requirement: 4 Technical Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          {/* 1. Current Time (Live Runtime Clock in IST) */}
          <div className="p-3.5 bg-railway-canvas rounded-2xl border border-railway-border">
            <div className="text-[10px] uppercase tracking-wider text-railway-textMuted flex items-center gap-1.5 font-bold">
              <Clock className="w-3 h-3 text-railway-forest animate-pulse" />
              <span>Current Time</span>
            </div>
            <div className="font-bold text-railway-textPrimary mt-1.5 text-xs sm:text-sm text-emerald-800 tracking-tight">
              {currentLiveDateTime}
            </div>
          </div>

          {/* 2. Polling Interval */}
          <div className="p-3.5 bg-railway-canvas rounded-2xl border border-railway-border">
            <div className="text-[10px] uppercase tracking-wider text-railway-textMuted flex items-center gap-1.5 font-bold">
              <Activity className="w-3 h-3 text-railway-textSecondary" />
              <span>Polling Interval</span>
            </div>
            <div className="font-bold text-railway-textPrimary mt-1.5 text-xs sm:text-sm">
              30s
            </div>
          </div>

          {/* 3. Last Telemetry Sync (Freezes on failure) */}
          <div className="p-3.5 bg-railway-canvas rounded-2xl border border-railway-border">
            <div className="text-[10px] uppercase tracking-wider text-railway-textMuted flex items-center gap-1.5 font-bold">
              <Radio className="w-3 h-3 text-railway-textSecondary" />
              <span>Last Telemetry Sync</span>
            </div>
            <div className="font-bold text-railway-textPrimary mt-1.5 text-xs sm:text-sm">
              {lastUpdated 
                ? formatIndianTime(lastUpdated) 
                : isLoading 
                ? 'Syncing...' 
                : source === 'UNAVAILABLE' 
                ? 'Unavailable (No Sync)' 
                : 'Pending First Sync'}
            </div>
          </div>

          {/* 4. Source */}
          <div className="p-3.5 bg-railway-canvas rounded-2xl border border-railway-border">
            <div className="text-[10px] uppercase tracking-wider text-railway-textMuted flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-3 h-3 text-railway-textSecondary" />
              <span>Source</span>
            </div>
            <div className="font-bold text-railway-textPrimary mt-1.5 text-xs sm:text-sm truncate">
              {source === 'LIVE' ? 'RailRadar API' : source === 'DEMO' ? 'RailRadar (Demo)' : 'Unavailable'}
            </div>
          </div>
        </div>

        {/* Optional Source Timestamp from RailRadar Upstream */}
        {upstreamUpdatedAt && (
          <div className="text-[11px] font-mono text-railway-textMuted flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Source Timestamp (RailRadar Upstream): <strong className="text-railway-textPrimary">{formatIndianTime(upstreamUpdatedAt)}</strong></span>
          </div>
        )}
      </div>

      {corridorError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div>
              <span><strong>Live Telemetry Notice:</strong> {corridorError}</span>
              {state.isLiveMode && (
                <p className="text-[11px] text-amber-700 mt-0.5 font-sans">
                  Live API key not detected. Switch to Demo Timetable to view simulated Vijayawada corridor movement, or configure RAILRADAR_API_KEY in .env.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {state.isLiveMode && (
              <button
                onClick={toggleLiveMode}
                className="px-3.5 py-1 rounded-full bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800 transition shadow-xs"
              >
                Switch to Demo Mode
              </button>
            )}
            <button
              onClick={async () => {
                await Promise.all([refetch(), refetchStation()]);
              }}
              className="px-3 py-1 rounded-full bg-white border border-amber-300 text-amber-800 text-xs font-semibold hover:bg-amber-50 transition"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* 2. Interactive Train Search */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-railway-border shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-railway-textPrimary">Live Train Query</h2>
            <p className="text-xs text-railway-textSecondary">Check current sectional coordinate and telemetry for any IR express rake</p>
          </div>
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-railway-textSecondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Train No. (e.g. 12627, 20834)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-railway-canvas border border-railway-border rounded-full text-xs font-mono focus:outline-none focus:border-railway-forest w-56 sm:w-64"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2 rounded-full bg-railway-forest text-white text-xs font-semibold hover:bg-railway-forestHover transition-colors disabled:opacity-50"
            >
              {isSearching ? 'Tracking...' : 'Query'}
            </button>
            {searchedTrain && (
              <button
                type="button"
                onClick={clearSearch}
                className="px-3 py-2 text-xs text-railway-textSecondary hover:text-railway-textPrimary"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {searchError && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center gap-2.5 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="font-semibold">{searchError}</span>
          </div>
        )}

        {searchedTrain && !searchError && (
          <div className="mt-4 p-5 rounded-2xl bg-railway-canvas border border-railway-border flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-railway-forest text-white text-xs font-mono font-bold">
                  {searchedTrain.trainNumber}
                </span>
                <span className="font-bold text-sm text-railway-textPrimary">{searchedTrain.trainName}</span>
                <span className="text-xs font-mono text-railway-textSecondary">({searchedTrain.direction} Line)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {source === 'LIVE' ? 'LIVE RAILRADAR' : 'DEMO TIMETABLE'}
                </span>
                {searchedTrain.status && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                    searchedTrain.status === 'RUNNING'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : searchedTrain.status === 'COMPLETED'
                      ? 'bg-neutral-100 text-neutral-800 border-neutral-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {searchedTrain.status}
                  </span>
                )}
                {searchedTrain.startDate && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                    Originated: {searchedTrain.startDate}
                  </span>
                )}
                {searchedTrain.upstreamUpdatedAt && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                    Telemetry: {formatIndianTime(searchedTrain.upstreamUpdatedAt)}
                  </span>
                )}
              </div>
              <div className="text-xs text-railway-textSecondary flex flex-wrap items-center gap-3">
                <span>
                  Current: <strong className="text-railway-textPrimary">{searchedTrain.currentStationName || searchedTrain.currentStation} ({searchedTrain.currentStation})</strong>
                </span>
                <span>•</span>
                <span>
                  Distance from Origin: <strong className="text-railway-textPrimary">{formatKm(searchedTrain.distanceTravelledKm || searchedTrain.currentKm)} km</strong>
                </span>
                <span>•</span>
                <span>
                  Next Station: <strong className="text-railway-textPrimary">{searchedTrain.nextStationName || searchedTrain.nextStation} ({searchedTrain.nextStation})</strong>
                </span>
                {searchedTrain.nextHaltStation && (
                  <>
                    <span>•</span>
                    <span>
                      Next Halt: <strong className="text-railway-textPrimary">{searchedTrain.nextHaltName || searchedTrain.nextHaltStation} ({searchedTrain.nextHaltStation})</strong>
                      {searchedTrain.nextHaltEta && searchedTrain.nextHaltEta !== '—' && (
                        <span className="ml-1 text-railway-textSecondary font-mono">[{searchedTrain.nextHaltEta} IST]</span>
                      )}
                    </span>
                  </>
                )}
                <span>•</span>
                <span>Speed: <strong className="text-railway-textPrimary">{searchedTrain.speedKmph} km/h</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right font-mono">
                <div className="text-xs text-railway-textSecondary">Expected At Next Station</div>
                <div className="text-sm font-bold text-railway-textPrimary">{searchedTrain.expectedArrival} IST</div>
              </div>
              {(() => {
                const delayInfo = formatDelay(searchedTrain.delaySeconds, searchedTrain.delayMinutes);
                return (
                  <div className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono border ${delayInfo.colorClass}`}>
                    {delayInfo.text}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* 3. Corridor Trains Radar Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-railway-textPrimary flex items-center gap-2">
              <span>Vijayawada (BZA) Trunk Corridor Movements</span>
              <span className="text-xs font-mono text-railway-textSecondary font-normal">(BPP – CLX – VTM)</span>
            </h2>
            <p className="text-xs text-railway-textSecondary">Real-time positions used by Constraint Engine for dynamic headway checks</p>
          </div>
          <span className="text-xs font-mono text-railway-textSecondary">
            {safeTrains.length} Rakes Monitored
          </span>
        </div>

        {safeTrains.length === 0 ? (
          <div className="p-16 text-center space-y-4 rounded-3xl bg-white border border-railway-border shadow-xs">
            <div className="w-16 h-16 rounded-full bg-railway-canvas text-railway-textMuted mx-auto flex items-center justify-center border border-railway-border">
              <TrainTrack className="w-8 h-8 text-neutral-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-railway-textPrimary font-sans">
                {source === 'UNAVAILABLE' ? 'Live Telemetry Feed Unavailable' : 'No train movements detected'}
              </h3>
              <p className="text-xs text-railway-textSecondary max-w-sm mx-auto leading-relaxed">
                {corridorError 
                  ? corridorError 
                  : 'No train rakes currently detected on corridor telemetry feed. Telemetry will appear here as soon as trains enter section coordinates.'}
              </p>
              {state.isLiveMode && (
                <div className="pt-3">
                  <button
                    onClick={toggleLiveMode}
                    className="px-4 py-2 bg-railway-forest text-white rounded-full text-xs font-semibold hover:bg-emerald-800 transition shadow-xs"
                  >
                    Switch to Demo Timetable Mode
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {safeTrains.map((t: LiveTrainPosition) => {
              return (
                <div 
                  key={t.trainNumber}
                  className="bg-white rounded-3xl p-6 border border-railway-border shadow-soft hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
                >
                  {/* Status Bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    t.delayMinutes === 0 ? 'bg-emerald-500' : t.delayMinutes <= 15 ? 'bg-amber-500' : 'bg-red-500'
                  }`} />

                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <span className="px-2.5 py-1 rounded-full bg-railway-canvas text-railway-forest text-xs font-mono font-bold border border-railway-border">
                          {t.trainNumber}
                        </span>
                        <h3 className="font-bold text-sm text-railway-textPrimary mt-2 leading-tight">
                          {t.trainName}
                        </h3>
                        <div className="text-xs text-railway-textSecondary font-mono mt-0.5">
                          Line: {t.direction} Main • Pos: KM {formatKm(t.currentKm)}
                        </div>
                      </div>

                      {(() => {
                        const delayInfo = formatDelay(t.delaySeconds, t.delayMinutes);
                        return (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold whitespace-nowrap border ${delayInfo.colorClass}`}>
                            {delayInfo.text}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Route & Progress Info */}
                    <div className="p-3.5 bg-railway-canvas rounded-2xl space-y-2 mb-4 text-xs font-mono border border-railway-border/60">
                      <div className="flex items-center justify-between text-railway-textSecondary">
                        <span>Last: <strong className="text-railway-textPrimary">{t.lastReportedStation}</strong></span>
                        <ArrowRight className="w-3 h-3 text-railway-textSecondary" />
                        <span>Next: <strong className="text-railway-textPrimary">{t.nextStation}</strong></span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-railway-border/40 text-[11px]">
                        <span className="text-railway-textSecondary">Expected: <strong>{t.expectedArrival} IST</strong></span>
                        <span className="text-railway-textSecondary">Speed: <strong>{t.speedKmph} km/h</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-railway-border/60 flex items-center justify-between text-xs text-railway-textSecondary">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-railway-forest" />
                      <span>{t.status || 'RUNNING'}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-railway-canvas text-railway-forest font-bold border border-railway-border">
                        {state.isLiveMode ? 'RAILRADAR' : 'DEMO'}
                      </span>
                    </span>
                    <span className="font-mono text-[11px] text-railway-textMuted">
                      {t.platform ? `PF-${t.platform}` : 'THROUGH'} · {t.upstreamUpdatedAt ? formatIndianTime(t.upstreamUpdatedAt) : 'Live'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Live Station Electronic Display Board */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-railway-border shadow-soft space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-railway-border pb-5">
          <div>
            <h2 className="text-base font-bold text-railway-textPrimary">Station Electronic Display Board</h2>
            <p className="text-xs text-railway-textSecondary">Live platform indicator synchronized with automatic block signalling feed</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-railway-textSecondary">Select Station:</label>
            <div className="flex gap-1.5 bg-railway-canvas p-1 rounded-full border border-railway-border">
              {STATIONS.map((stn: { code: string; name: string }) => (
                <button
                  key={stn.code}
                  onClick={() => setSelectedStation(stn.code)}
                  className={`px-3 py-1 text-xs font-mono font-semibold rounded-full transition-all ${
                    selectedStation === stn.code
                      ? 'bg-railway-forest text-white shadow-xs'
                      : 'text-railway-textSecondary hover:text-railway-textPrimary'
                  }`}
                >
                  {stn.code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Board Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-railway-border text-railway-textSecondary text-[11px] uppercase tracking-wider">
                <th className="pb-3 pl-3 font-semibold">Train No / Name</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold">Dir</th>
                <th className="pb-3 font-semibold">Sch. Time</th>
                <th className="pb-3 font-semibold">Expected</th>
                <th className="pb-3 font-semibold">PF</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-railway-border/60">
              {safeStationEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-railway-textSecondary font-sans">
                    No scheduled arrivals or departures for station {selectedStation} in this time window.
                  </td>
                </tr>
              ) : (
                safeStationEntries.map((e: StationBoardEntry, idx: number) => (
                  <tr key={`${e.trainNumber}-${idx}`} className="hover:bg-railway-canvas/60 transition-colors">
                    <td className="py-3.5 pl-3">
                      <div className="flex items-center gap-2 font-sans">
                        <span className="font-mono font-bold text-railway-forest">{e.trainNumber}</span>
                        <span className="font-medium text-railway-textPrimary">{e.trainName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-railway-textSecondary">{e.type}</td>
                    <td className="py-3.5 text-railway-textSecondary">{e.direction}</td>
                    <td className="py-3.5 text-railway-textSecondary">{e.scheduledTime}</td>
                    <td className="py-3.5 font-bold text-railway-textPrimary">{e.expectedTime}</td>
                    <td className="py-3.5 font-bold text-railway-forest">{e.platform ? `PF-${e.platform}` : '—'}</td>
                    <td className="py-3.5">
                      {(() => {
                        const delayInfo = formatDelay(null, e.delayMinutes);
                        return (
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${delayInfo.colorClass}`}>
                            {delayInfo.text}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Safety & Operational Authority Disclaimer */}
      <div className="p-4 rounded-2xl bg-railway-canvas border border-railway-border text-xs text-railway-textSecondary flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-railway-forest flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-railway-textPrimary font-semibold">Operational Advisory Notice: </strong>
          RailRadar™ provides crowdsourced train telemetry and timetable data as an external advisory feed. Rail Samnvay uses this data exclusively for secondary conflict forecasting. All formal corridor disconnections, power blocks, and train dispatch authority remain strictly governed by the Section Controller and Station Master in accordance with Indian Railways General & Subsidiary Rules (G&SR).
        </div>
      </div>
    </div>
  );
};
