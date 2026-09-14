// Active & Planned Work Nearby Widget
// Indian Railways · Spatial Corridor Awareness & Joint Work Discovery

import React from 'react';
import { useSamnvayStore } from '../../store/useSamnvayStore';
import { 
  MapPin, 
  Clock, 
  MessageSquare, 
  Hammer, 
  Zap, 
  Radio, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { BlockRequest, Department } from '../../types/samnvay';

export const NearbyWorkWidget: React.FC = () => {
  const { state, openChat, openBlockCommunication } = useSamnvayStore();

  // Filter maintenance work near the selected section / corridor
  const relevantWork = state.requests.filter(r => {
    return r.section === state.selectedSectionId || r.section === 'SEC-A';
  });

  return (
    <div className="bg-white border border-railway-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 select-text">
      <div className="flex items-center justify-between border-b border-railway-border pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-railway-forest/10 text-railway-forest flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-railway-textPrimary tracking-tight">
              Active & Planned Work Near You
            </h3>
            <p className="text-[11px] font-mono text-railway-textMuted uppercase">
              {state.selectedSectionId} · SECTIONAL JURISDICTION
            </p>
          </div>
        </div>

        <button
          onClick={() => openBlockCommunication('BLK-2026-0012')}
          className="px-3 py-1.5 rounded-full bg-railway-canvas hover:bg-neutral-100 border border-railway-border text-xs font-mono font-semibold text-railway-textPrimary flex items-center gap-1.5 transition cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-railway-forest" />
          <span>Block Desk</span>
        </button>
      </div>

      {relevantWork.length === 0 ? (
        <div className="py-8 text-center text-xs text-neutral-400 font-mono space-y-1">
          <p>No active or pending maintenance registered in this section.</p>
          <p className="text-[11px] text-neutral-300">Submit a requisition or switch sections to inspect activities.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {relevantWork.slice(0, 5).map(req => {
            const isApproved = req.status === 'Approved';
            const isScheduled = req.status === 'Scheduled' || req.status === 'Block Started' || req.status === 'Work in Progress';
            const isCandidate = req.status === 'Submitted' || req.status === 'P.Way/S&T/TRD Review';

            return (
              <div 
                key={req.id} 
                className="p-4 rounded-2xl bg-railway-canvas/70 border border-railway-border/80 flex flex-wrap items-center justify-between gap-3 hover:bg-neutral-50 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-mono">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      isScheduled ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                      isApproved ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                      'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {isScheduled ? 'ACTIVE / SCHEDULED' : isApproved ? 'APPROVED FOR PLANNING' : 'CANDIDATE REQUISITION'}
                    </span>
                    <span className="font-bold text-railway-textPrimary">{req.id}</span>
                    <span className="text-neutral-400">·</span>
                    <span className="text-neutral-600">{req.department}</span>
                  </div>

                  <div className="text-xs font-bold text-railway-textPrimary font-sans">
                    {req.work}
                  </div>

                  <div className="flex items-center space-x-3 text-[11px] font-mono text-neutral-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-railway-forest" />
                      <span>{req.startLocation} – {req.endLocation}</span>
                    </span>
                    {req.betweenStations && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-800 font-medium truncate max-w-[200px]" title={req.betweenStations}>
                          {req.betweenStations}
                        </span>
                      </>
                    )}
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      <span>{req.preferredStartTime || req.preferredTime} IST ({req.duration}m)</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => openBlockCommunication(req.id)}
                    className="px-3.5 py-1.5 rounded-full bg-white hover:bg-neutral-100 border border-railway-border text-xs font-mono font-semibold text-railway-textPrimary flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-railway-forest" />
                    <span>Communication</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
