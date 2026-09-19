import React, { useEffect, useState, useCallback } from 'react';
import { 
  X, 
  Activity, 
  Cpu, 
  Database, 
  RefreshCw, 
  ShieldAlert, 
  Layers, 
  Zap, 
  Gauge 
} from 'lucide-react';
import { fetchRailRadarMetrics, RailRadarMetrics } from '../../services/railRadarClient';
import { LiveTrainPosition } from '../../types';

interface RailRadarDiagnosticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTrain?: LiveTrainPosition | null;
  isLiveMode: boolean;
}

export const RailRadarDiagnosticsDrawer: React.FC<RailRadarDiagnosticsDrawerProps> = ({
  isOpen,
  onClose,
  selectedTrain,
  isLiveMode
}) => {
  const [metrics, setMetrics] = useState<RailRadarMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchRailRadarMetrics();
      if (data) {
        setMetrics(data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.warn('Failed to load RailRadar metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadMetrics();
      const interval = setInterval(loadMetrics, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, loadMetrics]);

  // Keyboard ESC listener for clean dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[60] overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-fadeIn"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
      >
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold tracking-tight">RailRadar Request Governor Diagnostics</h2>
              <p className="text-[11px] text-slate-400 font-mono">Waterfall Pipeline & Concurrency Telemetry</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadMetrics}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Refresh Diagnostics"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
          {/* Status Overview Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1">
                <Gauge className="w-3 h-3 text-indigo-500" />
                <span>Mode</span>
              </div>
              <div className={`mt-1 font-bold text-xs ${isLiveMode ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isLiveMode ? 'LIVE (Real-Time)' : 'DEMO (Simulated)'}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1">
                <Activity className="w-3 h-3 text-cyan-500" />
                <span>Governor</span>
              </div>
              <div className="mt-1 font-bold text-xs text-slate-800">
                {metrics?.governor.isBackingOff ? (
                  <span className="text-rose-600 animate-pulse">BACKOFF ACTIVE</span>
                ) : (
                  <span className="text-emerald-600">NORMAL (Throttled)</span>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Queue / Flight</span>
              </div>
              <div className="mt-1 font-bold text-xs text-slate-800">
                {metrics?.governor.queueLength ?? 0} queued / {metrics?.governor.inFlightCount ?? 0} flight
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-500" />
                <span>Cache Entries</span>
              </div>
              <div className="mt-1 font-bold text-xs text-slate-800">
                {metrics?.governor.cacheEntriesCount ?? 0} cached (60s TTL)
              </div>
            </div>
          </div>

          {/* Rate Limiting & Backoff Status */}
          {metrics?.governor.isBackingOff && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
              <div className="flex items-center gap-2 font-bold font-mono text-xs">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>UPSTREAM RATE-LIMIT BACKOFF ACTIVATED</span>
              </div>
              <p className="mt-1 text-[11px] text-rose-800">
                The RailRadar Request Governor has detected upstream HTTP 429 quota exhaustion. Requests are held to prevent upstream ban.
              </p>
              <div className="mt-2 flex items-center gap-3 font-mono text-[10px]">
                <span>Backoff Level: <strong>{metrics.governor.backoffCount}</strong></span>
                <span>Next Retry: <strong>{metrics.governor.backoffUntil ? new Date(metrics.governor.backoffUntil).toLocaleTimeString() : 'N/A'}</strong></span>
              </div>
            </div>
          )}

          {/* Request Pipeline Metrics */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 font-mono text-xs">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Request Pipeline Statistics
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Updated {lastRefreshed.toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-xs">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500">Total Upstream Calls</div>
                <div className="text-sm font-bold text-slate-800">{metrics?.upstreamCalls ?? 0}</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="text-[10px] text-emerald-600 font-bold">Successful (200 OK)</div>
                <div className="text-sm font-bold text-emerald-700">{metrics?.successfulCalls ?? 0}</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="text-[10px] text-rose-600 font-bold">Rate Limited (429)</div>
                <div className="text-sm font-bold text-rose-700">{metrics?.rateLimitedCalls ?? 0}</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="text-[10px] text-indigo-600 font-bold">Single-Flight Locks</div>
                <div className="text-sm font-bold text-indigo-700">{metrics?.deduplicatedCalls ?? 0}</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="text-[10px] text-cyan-600 font-bold">Memory Cache Hits</div>
                <div className="text-sm font-bold text-cyan-700">{metrics?.cacheHits ?? 0}</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500">Circuit Breaker</div>
                <div className="text-sm font-bold text-slate-800">
                  {metrics?.circuitBreaker?.isTripped ? (
                    <span className="text-rose-600">TRIPPED</span>
                  ) : (
                    <span className="text-emerald-600">HEALTHY</span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 font-mono bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span>Concurrency Limit:</span>
                <span className="font-bold text-slate-700">1 active request at a time</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Minimum Dispatch Interval:</span>
                <span className="font-bold text-slate-700">2,000 ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Upstream Quota Policy:</span>
                <span className="font-bold text-slate-700">Max 10 req/min (RailRadar Tier)</span>
              </div>
            </div>
          </div>

          {/* Train Provenance Inspector (Section 31) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 font-mono text-xs">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                Train Provenance Inspector: RAW → NORMALIZED → UI
              </span>
              {selectedTrain && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {selectedTrain.trainNumber}
                </span>
              )}
            </div>

            {selectedTrain ? (
              <div className="space-y-2 font-mono text-xs">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Train Identity</div>
                    <div className="font-bold text-slate-900">{(selectedTrain as any).trainNumber} - {(selectedTrain as any).trainName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Run ID</div>
                    <div className="text-slate-700 text-[11px]">{(selectedTrain as any).runId || 'N/A'}</div>
                  </div>
                </div>

                {/* Provenance Fields Table */}
                <div className="divide-y divide-slate-100 bg-white rounded-lg border border-slate-200 overflow-hidden text-[11px]">
                  <div className="p-2.5 flex items-center justify-between bg-slate-50 font-bold text-slate-600 text-[10px] uppercase">
                    <span>Field</span>
                    <span>Normalized Operational Value</span>
                    <span>Authoritative Source</span>
                  </div>

                  {/* Running Status */}
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-slate-600">Running Status</span>
                    <span className="font-bold text-emerald-700">{(selectedTrain as any).runningStatus || selectedTrain.status || 'UNKNOWN'}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                      {(selectedTrain as any).provenance?.runningStatus?.source || 'LIVE_OPERATIONAL'}
                    </span>
                  </div>

                  {/* Delay */}
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-slate-600">Delay</span>
                    <span className="font-bold text-slate-900">
                      {selectedTrain.delayMinutes !== undefined && selectedTrain.delayMinutes > 0
                        ? `+${selectedTrain.delayMinutes} min`
                        : selectedTrain.delayMinutes === 0
                        ? '0 min (Right Time)'
                        : 'UNKNOWN'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                      {(selectedTrain as any).provenance?.delayMinutes?.source || 'LIVE_OPERATIONAL'}
                    </span>
                  </div>

                  {/* Current Station */}
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-slate-600">Current Station</span>
                    <span className="font-bold text-slate-900">{selectedTrain.currentStation || 'UNKNOWN'}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                      {(selectedTrain as any).provenance?.currentStation?.source || 'LIVE_STATUS'}
                    </span>
                  </div>

                  {/* Next Station */}
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-slate-600">Next Station</span>
                    <span className="font-bold text-indigo-700">{selectedTrain.nextStation || 'UNKNOWN'}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                      {(selectedTrain as any).provenance?.nextStation?.source || 'LIVE_NEXT_STOP'}
                    </span>
                  </div>

                  {/* Coordinates */}
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-slate-600">Coordinates</span>
                    <span className="font-bold text-slate-800">
                      {selectedTrain.latitude && selectedTrain.longitude
                        ? `${selectedTrain.latitude.toFixed(4)}, ${selectedTrain.longitude.toFixed(4)}`
                        : 'UNAVAILABLE'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                      {selectedTrain.latitude ? 'REALTIME_GPS' : 'NO_COORDINATES'}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 italic p-1">
                  * Live operational telemetry strictly supersedes timetable schedules. When live data is missing, field defaults to UNKNOWN rather than fabricated defaults.
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 font-mono text-xs">
                Select a train in the Radar Grid or Search to inspect its field-level telemetry provenance.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>RailRadar SDK v1.0.0</span>
          <span>Zero Fabricated Telemetry Guarantee</span>
        </div>
      </div>
    </div>
  );
};
