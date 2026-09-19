import React from 'react';
import { useSamnvayStore } from '../store/useSamnvayStore';
import type { SamnvayPage } from '../types/samnvay';
import { 
  Inbox, 
  Clock, 
  AlertTriangle, 
  Activity, 
  ArrowRight,
  TrainTrack, 
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle,
  Plus,
  Compass,
  Zap
} from 'lucide-react';
import { EditorialHero } from '../components/common/EditorialHero';
import { NearbyWorkWidget } from '../components/chat/NearbyWorkWidget';
import { isPendingApproval, isPlanningEligible, isExecutionEligible } from '../utils/requestLifecycle';

interface OverviewPageProps {
  onOpenSectionDrawer?: (sectionId: string) => void;
  onNavigate: (page: SamnvayPage) => void;
  onOpenCreateModal?: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onNavigate,
  onOpenCreateModal,
}) => {
  const { state } = useSamnvayStore();

  // Dynamic Metric Calculations from single-source-of-truth state machine
  const pendingRequests = state.requests.filter(r => isPendingApproval(r));
  const planningEligible = state.requests.filter(r => isPlanningEligible(r));
  const executionEligible = state.requests.filter(r => isExecutionEligible(r));
  const activeBlocks = state.executionSteps.filter(s => s.status === 'IN_PROGRESS');
  const unresolvedRequestConflicts = state.requests.filter(r => r.conflict && !r.conflict.isResolved);
  const totalConflicts = unresolvedRequestConflicts.length + state.liveConflicts.length;
  const scheduledWork = state.requests.filter(r => r.status === 'Scheduled');

  // Dynamic user permission check
  const userPerms = state.currentUser.permissions || ['overview'];
  const hasPerm = (p: string) => userPerms.includes('all') || userPerms.includes(p);

  // Relevant corridor rakes (top 3)
  const liveTrainsSample = state.liveData.liveTrains.slice(0, 3);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Master Editorial Hero Banner */}
      <EditorialHero
        category="Vijayawada Division · SCR Control Office"
        titleLines={['OPERATIONS', 'WITHOUT', 'CONFLICT']}
        subtitle="Automated railway maintenance possession planning, intelligent timetable path optimization, and real-time live corridor telemetry."
        badges={[
          { label: 'BZA–TEL CORRIDOR', variant: 'teal' },
          { label: 'CP-SAT OPTIMIZER ACTIVE', variant: 'green' },
          { label: 'G&SR CHAPTER XV COMPLIANT', variant: 'steel' },
          { label: state.isLiveMode ? 'LIVE TELEMETRY' : 'DEMO MODE', variant: state.isLiveMode ? 'green' : 'amber' },
        ]}
        actionSlot={
          <div className="flex items-center gap-2.5">
            {hasPerm('requests') && onOpenCreateModal && (
              <button
                onClick={onOpenCreateModal}
                className="flex items-center space-x-2 px-5 py-3 rounded-full bg-[#393D3F] text-white text-xs font-bold hover:bg-[#546A7B] transition shadow-sm"
              >
                <Plus className="w-4 h-4 text-[#62929E]" />
                <span>RAISE REQUISITION</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('planning')}
              className="flex items-center space-x-2 px-4 py-3 rounded-full bg-white border border-[#E8E6DF] text-[#393D3F] text-xs font-bold hover:bg-[#F2F2EF] transition shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>BLOCK PLANNER</span>
            </button>
          </div>
        }
        bgMotif="turnout"
      />

      {/* 2. Top Dynamic Metric Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Metric 1: Pending Approvals */}
        <div 
          onClick={() => onNavigate('approval')}
          className="bg-white border border-[#E8E6DF] p-5 rounded-3xl cursor-pointer hover:border-[#F59E0B] transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-[#546A7B]">
            <span>Pending Approvals</span>
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
          </div>
          <div className="text-3xl font-extrabold text-[#393D3F] mt-2 group-hover:text-[#F59E0B] transition-colors">
            {pendingRequests.length}
          </div>
          <div className="text-xs text-[#546A7B] mt-1 font-medium">
            {pendingRequests.length === 1 ? '1 awaiting clearance' : `${pendingRequests.length} awaiting clearance`}
          </div>
        </div>

        {/* Metric 2: Ready for Planning */}
        <div 
          onClick={() => onNavigate('planning')}
          className="bg-white border border-[#E8E6DF] p-5 rounded-3xl cursor-pointer hover:border-[#62929E] transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-[#546A7B]">
            <span>Planning Queue</span>
            <span className="w-2 h-2 rounded-full bg-[#62929E]" />
          </div>
          <div className="text-3xl font-extrabold text-[#393D3F] mt-2 group-hover:text-[#62929E] transition-colors">
            {planningEligible.length}
          </div>
          <div className="text-xs text-[#546A7B] mt-1 font-medium">
            {planningEligible.length === 1 ? '1 slot to optimize' : `${planningEligible.length} slots to optimize`}
          </div>
        </div>

        {/* Metric 3: Active Blocks on Track */}
        <div 
          onClick={() => onNavigate('execution')}
          className="bg-white border border-[#E8E6DF] p-5 rounded-3xl cursor-pointer hover:border-[#16A34A] transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-[#546A7B]">
            <span>Active Possessions</span>
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
          </div>
          <div className="text-3xl font-extrabold text-[#393D3F] mt-2 group-hover:text-[#16A34A] transition-colors">
            {activeBlocks.length}
          </div>
          <div className="text-xs text-[#546A7B] mt-1 font-medium">
            {activeBlocks.length > 0 ? 'Work currently in progress' : 'Track currently clear'}
          </div>
        </div>

        {/* Metric 4: Headway Conflicts */}
        <div 
          onClick={() => onNavigate('conflict')}
          className={`bg-white border p-5 rounded-3xl cursor-pointer transition-all shadow-xs group ${
            totalConflicts > 0 ? 'border-red-300 bg-red-50/20 hover:border-red-500' : 'border-[#E8E6DF] hover:border-[#393D3F]'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-[#546A7B]">
            <span>Conflict Radar</span>
            {totalConflicts > 0 ? (
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-ping" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            )}
          </div>
          <div className={`text-3xl font-extrabold mt-2 ${totalConflicts > 0 ? 'text-[#DC2626]' : 'text-[#393D3F]'}`}>
            {totalConflicts}
          </div>
          <div className="text-xs text-[#546A7B] mt-1 font-medium">
            {totalConflicts > 0 ? 'Controller action required' : 'Zero headway overlaps'}
          </div>
        </div>

        {/* Metric 5: Live Corridor Trains */}
        <div 
          onClick={() => onNavigate('live-trains')}
          className="bg-white border border-[#E8E6DF] p-5 rounded-3xl cursor-pointer hover:border-[#546A7B] transition-all shadow-xs col-span-2 sm:col-span-1 group"
        >
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-[#546A7B]">
            <span>Live Trains</span>
            <span className="w-2 h-2 rounded-full bg-[#546A7B]" />
          </div>
          <div className="text-3xl font-extrabold text-[#393D3F] mt-2 group-hover:text-[#546A7B] transition-colors">
            {state.liveData.liveTrains.length}
          </div>
          <div className="text-xs text-[#546A7B] mt-1 font-medium">
            {state.liveData.source === 'LIVE' ? 'Realtime RailRadar feed' : 'Divisional timetable'}
          </div>
        </div>
      </div>

      {/* 3. Primary Operations Grid (Asymmetric Editorial Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        {/* Left: Actionable Operations Board */}
        <div className="md:col-span-1 lg:col-span-7 space-y-6">
          {/* Card: Operational Priority / Attention Required */}
          <div className="bg-white rounded-3xl border border-[#E8E6DF] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-4 mb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#546A7B]">
                  Action Matrix
                </span>
                <h2 className="text-lg font-extrabold text-[#393D3F]">
                  Operational Priority Items
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#F2F2EF] text-[#546A7B] border border-[#E8E6DF]">
                {pendingRequests.length + totalConflicts} Actionable
              </span>
            </div>

            <div className="space-y-3">
              {pendingRequests.length === 0 && totalConflicts === 0 && planningEligible.length === 0 ? (
                <div className="py-10 text-center text-[#546A7B] text-xs font-medium space-y-2">
                  <CheckCircle className="w-8 h-8 text-[#16A34A] mx-auto mb-1" />
                  <div className="font-extrabold text-sm text-[#393D3F]">All Corridor Channels Clear</div>
                  <div className="text-xs text-[#546A7B]">No maintenance requests awaiting clearance or conflicting with traffic.</div>
                </div>
              ) : (
                <>
                  {/* Pending Clearances */}
                  {pendingRequests.slice(0, 3).map(req => (
                    <div 
                      key={req.id} 
                      className="p-4 rounded-2xl bg-[#F2F2EF] border border-[#E8E6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-[#F59E0B] transition group"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-[#F59E0B] bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 text-[10px] uppercase">
                            APPROVAL REQUIRED
                          </span>
                          <span className="font-extrabold text-[#393D3F]">{req.id}</span>
                          <span className="font-semibold text-[#546A7B]">· {req.department}</span>
                        </div>
                        <div className="text-[#393D3F] font-semibold mt-1.5">
                          {req.work}
                        </div>
                        <div className="text-[#546A7B] text-[11px] mt-0.5">
                          Section {req.section} · Required {req.duration} min
                        </div>
                      </div>
                      <button
                        onClick={() => onNavigate('approval')}
                        className="self-start sm:self-center px-4 py-2 rounded-full bg-white border border-[#E8E6DF] text-[#393D3F] font-bold text-xs hover:bg-[#393D3F] hover:text-white transition shadow-xs whitespace-nowrap"
                      >
                        Review Clearance
                      </button>
                    </div>
                  ))}

                  {/* Live Conflicts */}
                  {unresolvedRequestConflicts.slice(0, 2).map(req => (
                    <div 
                      key={`conf-${req.id}`} 
                      className="p-4 rounded-2xl bg-red-50/40 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full text-[10px] uppercase">
                            HEADWAY CONFLICT
                          </span>
                          <span className="font-extrabold text-red-950">{req.conflict?.conflictingTrain}</span>
                        </div>
                        <div className="text-red-900 font-semibold text-xs mt-1.5">
                          Overlaps window {req.allocatedWindow?.startTime}–{req.allocatedWindow?.endTime} on Section {req.section}
                        </div>
                      </div>
                      <button
                        onClick={() => onNavigate('conflict')}
                        className="self-start sm:self-center px-4 py-2 rounded-full bg-[#DC2626] text-white font-bold text-xs hover:bg-red-700 transition shadow-xs whitespace-nowrap"
                      >
                        Resolve Path
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Card: Scheduled Track Possessions */}
          <div className="bg-white rounded-3xl border border-[#E8E6DF] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-4 mb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#546A7B]">
                  Authorized Work
                </span>
                <h2 className="text-lg font-extrabold text-[#393D3F]">
                  Scheduled Maintenance Possessions
                </h2>
              </div>
              <button 
                onClick={() => onNavigate('requests')}
                className="text-xs font-bold text-[#546A7B] hover:text-[#393D3F] flex items-center gap-1 transition"
              >
                <span>All Requests</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8E6DF] text-[#546A7B] text-[10px] font-extrabold uppercase tracking-wider">
                    <th className="pb-3">Work Requisition</th>
                    <th className="pb-3">Dept</th>
                    <th className="pb-3">Section</th>
                    <th className="pb-3">Possession Slot</th>
                    <th className="pb-3 text-right">Lifecycle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6DF]/60">
                  {scheduledWork.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#546A7B] text-xs font-medium">
                        No possession slots currently locked. Allocate windows in the Planning Engine.
                      </td>
                    </tr>
                  ) : (
                    scheduledWork.slice(0, 4).map(r => (
                      <tr 
                        key={r.id}
                        onClick={() => onNavigate('requests')}
                        className="hover:bg-[#F2F2EF]/60 cursor-pointer transition-colors"
                      >
                        <td className="py-3 font-bold text-[#393D3F]">
                          {r.work}
                        </td>
                        <td className="py-3 text-[#546A7B] font-semibold">
                          {r.department}
                        </td>
                        <td className="py-3 font-mono font-bold text-[#393D3F]">
                          {r.section}
                        </td>
                        <td className="py-3 font-mono text-[#393D3F]">
                          {r.allocatedWindow?.startTime}–{r.allocatedWindow?.endTime}
                        </td>
                        <td className="py-3 text-right">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Corridor HUD & Live Telemetry */}
        <div className="md:col-span-1 lg:col-span-5 space-y-6">
          {/* Card: Corridor Topology & Health */}
          <div className="bg-white rounded-3xl border border-[#E8E6DF] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#546A7B]">
                  Corridor Topology
                </span>
                <h3 className="text-base font-extrabold text-[#393D3F]">
                  BZA–GNT–TEL Prototype
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20">
                ABS ACTIVE
              </span>
            </div>

            {/* Line schematic */}
            <div className="p-4 rounded-2xl bg-[#F2F2EF] border border-[#E8E6DF] space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-[#546A7B]">
                <span>Corridor Stations</span>
                <span className="font-mono text-[11px] text-[#393D3F]">Speed: 130 km/h</span>
              </div>

              <div className="py-3 flex items-center justify-between relative">
                <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-[#C6C5B9]" />
                {['BZA', 'KCC', 'MAG', 'NBR', 'GNT', 'TEL'].map((stn, idx) => (
                  <div key={stn} className="flex flex-col items-center relative z-10">
                    <span className={`w-2.5 h-2.5 rounded-full ${idx === 2 ? 'bg-[#F59E0B]' : 'bg-[#393D3F]'}`} />
                    <span className="text-[10px] font-extrabold text-[#393D3F] mt-1.5">{stn}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#E8E6DF] flex items-center justify-between text-xs font-bold text-[#546A7B]">
                <span>{activeBlocks.length} Active Work</span>
                <span>•</span>
                <span>{planningEligible.length} In Queue</span>
                <span>•</span>
                <span className={totalConflicts > 0 ? 'text-[#DC2626]' : ''}>
                  {totalConflicts} Conflicts
                </span>
              </div>
            </div>
          </div>

          {/* Card: Live Train Movement Stream */}
          <div className="bg-white rounded-3xl border border-[#E8E6DF] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#546A7B]">
                  Live Stream
                </span>
                <h3 className="text-base font-extrabold text-[#393D3F]">
                  Corridor Movements
                </h3>
              </div>
              <button 
                onClick={() => onNavigate('live-trains')}
                className="text-xs font-bold text-[#546A7B] hover:text-[#393D3F] flex items-center gap-1 transition"
              >
                <span>Operational Map</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {liveTrainsSample.length === 0 ? (
                <div className="py-8 text-center text-[#546A7B] text-xs font-medium">
                  Awaiting train position data from RailRadar telemetry feed.
                </div>
              ) : (
                liveTrainsSample.map(t => (
                  <div 
                    key={t.trainNumber}
                    onClick={() => onNavigate('live-trains')}
                    className="p-3.5 rounded-2xl bg-[#F2F2EF] border border-[#E8E6DF] cursor-pointer hover:border-[#62929E] transition space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-[#393D3F]">
                        {t.trainNumber} {t.trainName}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        t.delayMinutes === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {t.delayMinutes === 0 ? 'ON TIME' : `+${t.delayMinutes}m`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#546A7B]">
                      <span>Chainage: KM {typeof t.currentKm === 'number' ? t.currentKm.toFixed(1) : t.currentKm}</span>
                      <span>Speed: {t.speedKmph} km/h</span>
                      <span className="text-[10px] font-mono text-[#16A34A]">{state.liveData.source}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Joint Work & Co-location Nearby Widget */}
          <div className="bg-white rounded-3xl border border-[#E8E6DF] p-6 shadow-sm">
            <NearbyWorkWidget />
          </div>
        </div>
      </div>
    </div>
  );
};
