// Section Detail Drawer
// Redesigned with unified Vertex-inspired government railway design system
import React from 'react';
import { useSamnvayStore } from '../../store/useSamnvayStore';
import { X, Train, ShieldAlert, Activity, Clock, Zap, ArrowRight, ShieldCheck } from 'lucide-react';

interface SectionDetailDrawerProps {
  sectionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SectionDetailDrawer: React.FC<SectionDetailDrawerProps> = ({
  sectionId,
  isOpen,
  onClose,
}) => {
  const { state } = useSamnvayStore();

  if (!isOpen || !sectionId) return null;

  const section = state.sections.find(s => s.id === sectionId) || state.sections[0];
  const sectionRequests = state.requests.filter(r => r.section === sectionId || r.section.includes(sectionId));

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-white border-l border-railway-border shadow-2xl flex flex-col justify-between select-none animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="bg-railway-canvas/60 p-5 border-b border-railway-border flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base text-railway-textPrimary font-sans">{section.name}</span>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold ${
              section.status === 'Available' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {section.status}
            </span>
          </div>
          <p className="text-xs text-railway-textMuted font-mono mt-0.5">{section.kmRange} · ROUTE-01 (BZA–GNT)</p>
        </div>

        <button 
          onClick={onClose} 
          className="w-8 h-8 rounded-full bg-white hover:bg-neutral-200 border border-railway-border flex items-center justify-center text-railway-textSecondary hover:text-railway-textPrimary transition"
          title="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
        {/* Section Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 font-mono">
          <div className="bg-railway-canvas p-3.5 rounded-2xl border border-railway-border">
            <div className="text-[10px] text-railway-textMuted uppercase font-semibold">Traffic Density</div>
            <div className="text-base font-bold text-railway-forest mt-0.5">{section.trafficDensity}</div>
          </div>
          <div className="bg-railway-canvas p-3.5 rounded-2xl border border-railway-border">
            <div className="text-[10px] text-railway-textMuted uppercase font-semibold">Max Permitted Speed</div>
            <div className="text-base font-bold text-railway-signalGreen mt-0.5">{section.maxSpeedKmph} km/h</div>
          </div>
        </div>

        {/* Temporary Speed Restriction */}
        {section.activeTSR && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-1.5">
            <div className="flex items-center space-x-2 text-amber-900 font-bold font-mono text-[11px]">
              <ShieldAlert className="w-4 h-4 text-railway-safetyAmber" />
              <span>CAUTION ORDER ENFORCED (TSR)</span>
            </div>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Speed restricted to <strong>{section.activeTSR.speedKmph} km/h</strong> due to {section.activeTSR.reason}.
            </p>
          </div>
        )}

        {/* Electrification & Track Subsystems */}
        <div className="space-y-3">
          <div className="text-[10px] uppercase font-mono tracking-wider text-railway-textMuted font-bold">
            INFRASTRUCTURE SUBSYSTEM HEALTH
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-railway-canvas border border-railway-border">
              <div className="flex items-center space-x-2.5">
                <Zap className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-railway-textPrimary">25kV OHE Catenary</span>
              </div>
              <span className="font-mono text-railway-signalGreen font-semibold text-[11px]">Energized</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-railway-canvas border border-railway-border">
              <div className="flex items-center space-x-2.5">
                <Activity className="w-4 h-4 text-railway-forest" />
                <span className="font-medium text-railway-textPrimary">Automatic Signalling</span>
              </div>
              <span className="font-mono text-railway-signalGreen font-semibold text-[11px]">Normal Clear</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-railway-canvas border border-railway-border">
              <div className="flex items-center space-x-2.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-railway-textPrimary">Suggested Work Window</span>
              </div>
              <span className="font-mono text-railway-forest font-bold text-[11px]">14:45 – 16:15 IST</span>
            </div>
          </div>
        </div>

        {/* Active Block Requisitions on this Section */}
        <div className="space-y-3">
          <div className="text-[10px] uppercase font-mono tracking-wider text-railway-textMuted font-bold">
            SCHEDULED REQUISITIONS ({sectionRequests.length})
          </div>

          {sectionRequests.length === 0 ? (
            <div className="p-4 rounded-xl bg-railway-canvas text-center text-railway-textMuted font-mono text-xs">
              No active maintenance requests on this section.
            </div>
          ) : (
            <div className="space-y-2">
              {sectionRequests.map(r => (
                <div key={r.id} className="p-3 rounded-xl bg-white border border-railway-border space-y-1 shadow-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-railway-forest">{r.id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-railway-canvas font-semibold">{r.status}</span>
                  </div>
                  <div className="text-xs font-medium text-railway-textPrimary">{r.work}</div>
                  <div className="text-[10px] text-railway-textMuted font-mono">{r.preferredTime} IST ({r.duration}m)</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drawer Footer */}
      <div className="p-5 border-t border-railway-border bg-railway-canvas/50">
        <button
          onClick={onClose}
          className="w-full py-3 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white text-xs font-semibold shadow-xs transition"
        >
          Close Section Telemetry
        </button>
      </div>
    </div>
  );
};
