// Block Requests Page
// Redesigned with unified Vertex-inspired government railway design system
import React, { useState } from 'react';
import { useSamnvayStore } from '../store/useSamnvayStore';
import { Department, BlockPriority, BlockStatus } from '../types/samnvay';
import { 
  Inbox, 
  Plus, 
  Filter, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Search,
  FileText,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  Trash2,
  X
} from 'lucide-react';
import type { SamnvayPage } from '../types/samnvay';

interface BlockRequestsPageProps {
  onOpenCreateModal: () => void;
  onSelectRequest: (requestId: string) => void;
  onNavigate?: (page: SamnvayPage) => void;
}

export const BlockRequestsPage: React.FC<BlockRequestsPageProps> = ({
  onOpenCreateModal,
  onSelectRequest,
  onNavigate,
}) => {
  const { state, sendPlanningOfficeQuery, deleteMaintenanceBlock } = useSamnvayStore();
  const isMaster = state.currentUser.role === 'MASTER';
  const [deleteModalReqId, setDeleteModalReqId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');

  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter requests
  const filteredRequests = state.requests.filter(req => {
    if (selectedDept !== 'ALL' && req.department !== selectedDept) return false;
    if (selectedPriority !== 'ALL' && req.priority !== selectedPriority) return false;
    if (selectedSection !== 'ALL' && req.section !== selectedSection) return false;
    if (selectedStatus !== 'ALL' && req.status !== selectedStatus) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        req.id.toLowerCase().includes(q) ||
        req.work.toLowerCase().includes(q) ||
        req.engineer.toLowerCase().includes(q) ||
        (req.stationCode && req.stationCode.toLowerCase().includes(q)) ||
        (req.stationName && req.stationName.toLowerCase().includes(q)) ||
        (req.routeCode && req.routeCode.toLowerCase().includes(q)) ||
        (req.betweenStations && req.betweenStations.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-railway-border pb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-railway-textPrimary font-sans">
            Maintenance Requirements
          </h1>
          <p className="text-sm text-railway-textSecondary mt-1">
            Browse, filter, and track maintenance requirements across Permanent Way, Signalling, and Traction departments.
          </p>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white font-semibold text-sm shadow-sm transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 text-railway-signalGreenLight" />
          <span>New Maintenance Requisition</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-railway-border p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-railway-textMuted" />
            <input
              type="text"
              placeholder="Search by ID, work description, engineer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-full bg-railway-canvas border border-railway-border text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20 focus:border-railway-forest transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-full bg-railway-canvas border border-railway-border text-xs font-medium text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
            >
              <option value="ALL">All Departments</option>
              <option value="P.Way">Permanent Way (P.Way)</option>
              <option value="S&T">Signal & Telecom (S&T)</option>
              <option value="TRD">Traction / OHE (TRD)</option>
            </select>
          </div>

          {/* Dynamic Section Filter */}
          <div>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-full bg-railway-canvas border border-railway-border text-xs font-medium text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
            >
              <option value="ALL">All Sections (SEC-A–C)</option>
              <option value="SEC-A">SEC-A (BZA – MAG)</option>
              <option value="SEC-B">SEC-B (MAG – GNT)</option>
              <option value="SEC-C">SEC-C (GNT – TEL)</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-full bg-railway-canvas border border-railway-border text-xs font-medium text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-full bg-railway-canvas border border-railway-border text-xs font-medium text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
            >
              <option value="ALL">All Statuses (17 Stages)</option>
              <option value="Submitted">Submitted (Review Pending)</option>
              <option value="Verified">Verified (Technical Clearance)</option>
              <option value="Approval Pending">Approval Pending (Operating Concurrence)</option>
              <option value="Approved">Approved</option>
              <option value="Planning Queue">Planning Queue</option>
              <option value="Block Window Allocated">Block Window Allocated</option>
              <option value="Scheduled">Scheduled (Time-Locked)</option>
              <option value="Block Started">Block Started (Memo Exchanged)</option>
              <option value="Work in Progress">Work in Progress (Track Protected)</option>
              <option value="Work Completed">Work Completed</option>
              <option value="Block Released">Block Released</option>
              <option value="Closed">Closed</option>
              <option value="Revision Required">Revision Required</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Counts */}
        <div className="flex items-center justify-between text-xs text-railway-textMuted font-mono pt-2 border-t border-railway-border/60">
          <span>SHOWING {filteredRequests.length} OF {state.requests.length} REQUISITIONS</span>
          {(selectedDept !== 'ALL' || selectedPriority !== 'ALL' || selectedStatus !== 'ALL' || searchQuery !== '') && (
            <button
              onClick={() => {
                setSelectedDept('ALL');
                setSelectedPriority('ALL');
                setSelectedSection('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
              }}
              className="text-railway-forest font-semibold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Multi-Department Spatial Overlap Card (Section 10 & 19 of Prompt) */}
      {state.spatialOverlaps && state.spatialOverlaps.length > 0 && (
        <div className="p-5 rounded-3xl bg-amber-50/90 border border-amber-200 text-amber-950 shadow-xs space-y-3.5 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>SPATIAL OVERLAP DETECTED (Multi-Department Location Coordination)</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-amber-200/80 text-amber-900 px-3 py-1 rounded-full border border-amber-300">
              COORDINATED BLOCK OPTIMIZER ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            {state.spatialOverlaps[0].departmentBreakdown.map((item) => (
              <div key={item.requestId} className="p-3 rounded-2xl bg-white border border-amber-200/90 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900">{item.department}:</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-neutral-100 text-neutral-700 font-bold">{item.requestId}</span>
                </div>
                <div className="text-neutral-900 font-semibold">{item.kmRange}</div>
                <div className="text-[11px] text-neutral-500 font-sans truncate">{item.work} ({item.duration} min)</div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-2xl bg-white border border-amber-300/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div>
              <span className="text-amber-800 font-bold uppercase text-[10px] block">Recommended Coordinated Possession:</span>
              <span className="font-bold text-neutral-900 text-sm">
                {state.spatialOverlaps[0].recommendedBlock?.location} · {state.spatialOverlaps[0].recommendedBlock?.durationMinutes} min
              </span>
              <span className="text-neutral-500 text-[11px] font-sans ml-2">
                (Bundle: {state.spatialOverlaps[0].recommendedBlock?.departments.join(' + ')})
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-[10px] text-neutral-500 uppercase">Block Utilization</div>
                <div className="font-bold text-emerald-700 text-sm">{state.spatialOverlaps[0].recommendedBlock?.blockUtilizationPercent}%</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-neutral-500 uppercase">Power Block</div>
                <div className="font-bold text-amber-800 text-sm">{state.spatialOverlaps[0].recommendedBlock?.powerBlock ? 'Required' : 'No'}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-neutral-500 uppercase">Train Conflicts</div>
                <div className="font-bold text-emerald-700 text-sm">{state.spatialOverlaps[0].recommendedBlock?.trainConflicts} None</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Requests Table / Cards Container */}
      <div className="rounded-3xl bg-white border border-railway-border shadow-xs overflow-hidden">
        {filteredRequests.length === 0 ? (
          /* Operational Empty State (Prompt Specification) */
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-railway-canvas mx-auto flex items-center justify-center text-railway-textMuted border border-railway-border">
              <Inbox className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-railway-textPrimary">
                {state.requests.length === 0 ? 'No maintenance requirements' : 'No matching maintenance requirements found'}
              </h3>
              <p className="text-sm text-railway-textSecondary max-w-sm mx-auto">
                {state.requests.length === 0 
                  ? 'Create a maintenance requirement to begin planning.' 
                  : 'No maintenance requisitions currently match your selected filters. Adjust your query or submit a new requirement.'}
              </p>
            </div>
            <button
              onClick={onOpenCreateModal}
              className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-railway-forest text-white text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-railway-signalGreenLight" />
              <span>Create Maintenance Requirement</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-railway-border bg-railway-canvas/50 text-[11px] font-mono text-railway-textMuted uppercase tracking-wider">
                  <th className="py-3.5 px-6 font-semibold">Request ID</th>
                  <th className="py-3.5 px-6 font-semibold">Department</th>
                  <th className="py-3.5 px-6 font-semibold">Section & Chainage</th>
                  <th className="py-3.5 px-6 font-semibold">Work Scope</th>
                  <th className="py-3.5 px-6 font-semibold">Window & Duration</th>
                  <th className="py-3.5 px-6 font-semibold">Priority</th>
                  <th className="py-3.5 px-6 font-semibold">Status</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-railway-border text-xs">
                {filteredRequests.map((req) => {
                  const isPending = req.status === 'Pending';
                  const isApproved = req.status === 'Approved';
                  const isRejected = req.status === 'Rejected';
                  const isRevision = req.status === 'Revision';

                  return (
                    <tr 
                      key={req.id}
                      onClick={() => onSelectRequest(req.id)}
                      className="hover:bg-neutral-50/80 transition-colors cursor-pointer group"
                    >
                      {/* ID */}
                      <td className="py-4 px-6 font-mono font-bold text-railway-forest">
                        {req.id}
                      </td>

                      {/* Department */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          req.department === 'P.Way' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          req.department === 'S&T' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                          'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {req.department}
                        </span>
                      </td>

                      {/* Section, Station & Chainage */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-1.5 font-semibold text-railway-textPrimary">
                          <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-bold">
                            {req.stationCode || 'MAG'}
                          </span>
                          <span>{req.section}</span>
                          {req.routeCode && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 font-bold border border-purple-200">
                              {req.routeCode}
                            </span>
                          )}
                          {req.isCrossSection && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300">
                              CROSS-SECTION
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-railway-textMuted mt-0.5">
                          {req.startLocation} – {req.endLocation}
                          {req.affectedLengthMeters ? ` (${req.affectedLengthMeters}m)` : ''}
                        </div>
                        {req.betweenStations && (
                          <div className="text-[10px] text-neutral-500 font-mono truncate max-w-xs mt-0.5">
                            {req.betweenStations}
                          </div>
                        )}
                        {req.affectedTracks && req.affectedTracks.length > 0 && (
                          <div className="text-[10px] font-mono font-medium text-emerald-700 mt-0.5">
                            {req.affectedTracks.join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Work Scope */}
                      <td className="py-4 px-6 max-w-xs truncate">
                        <div className="font-medium text-railway-textPrimary truncate">
                          {req.work}
                        </div>
                        <div className="text-[11px] text-railway-textMuted">
                          By {req.engineer}
                        </div>
                      </td>

                      {/* Window & Duration */}
                      <td className="py-4 px-6 font-mono">
                        <div className="font-semibold text-railway-textPrimary">
                          {req.preferredTime} IST
                        </div>
                        <div className="text-[11px] text-railway-textMuted">
                          {req.duration} minutes ({req.date})
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          req.priority === 'CRITICAL' ? 'bg-red-50 text-red-800 border border-red-200' :
                          req.priority === 'HIGH' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          'bg-neutral-100 text-neutral-800'
                        }`}>
                          {req.priority} ({req.priorityScore})
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                          req.status === 'Scheduled' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold' :
                          req.status === 'Block Window Allocated' ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold' :
                          req.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          req.status === 'Block Started' || req.status === 'Work in Progress' ? 'bg-teal-50 text-teal-800 border border-teal-200' :
                          req.status === 'Work Completed' || req.status === 'Block Released' || req.status === 'Closed' ? 'bg-green-50 text-green-800 border border-green-200' :
                          req.status === 'Submitted' || req.status === 'Pending' || req.status === 'Approval Pending' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          req.status === 'P.Way/S&T/TRD Review' || req.status === 'Verified' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                          req.status === 'Planning Queue' || req.status === 'AI/OR Optimization' ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
                          req.status === 'Rejected' || req.status === 'Unsafe / Cancelled' ? 'bg-red-50 text-red-800 border border-red-200' :
                          'bg-purple-50 text-purple-800 border border-purple-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            req.status === 'Scheduled' ? 'bg-emerald-600' :
                            req.status === 'Block Window Allocated' ? 'bg-amber-600 animate-pulse' :
                            req.status === 'Approved' || req.status === 'Closed' ? 'bg-railway-signalGreen' :
                            req.status === 'Block Started' || req.status === 'Work in Progress' ? 'bg-teal-500 animate-pulse' :
                            req.status === 'Submitted' || req.status === 'Approval Pending' ? 'bg-railway-safetyAmber' :
                            req.status === 'Rejected' || req.status === 'Unsafe / Cancelled' ? 'bg-railway-operationalRed' :
                            'bg-blue-600'
                          }`} />
                          <span>
                            {req.status === 'Block Window Allocated' ? 'Recommendation (Awaiting Sign-off)' : req.status}
                          </span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              sendPlanningOfficeQuery(
                                req.id,
                                'Maintenance Scheduling Clarification',
                                `Operational inquiry regarding ${req.id} (${req.work}) at KM ${req.startLocation}–${req.endLocation}. Preferred slot: ${req.preferredTime || '02:00–04:00'}.`
                              );
                              if (onNavigate) {
                                onNavigate('communication');
                              } else {
                                window.location.hash = 'communication';
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-semibold transition"
                            title="Discuss this requirement with Divisional Planning Office"
                          >
                            <MessageSquare className="w-3 h-3 text-purple-700" />
                            <span>DISCUSS WITH PLANNING</span>
                          </button>

                          {/* MASTER ONLY: Permanent Deletion Action */}
                          {isMaster && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteModalReqId(req.id);
                                setDeleteReason('');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold transition cursor-pointer"
                              title="MASTER Authority: Delete maintenance block"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              <span>DELETE</span>
                            </button>
                          )}

                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-railway-forest group-hover:translate-x-0.5 transition-transform pl-1">
                            <span>Inspect</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* MASTER DELETE CONFIRMATION MODAL */}
        {deleteModalReqId && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-railway-border shadow-2xl space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center border border-red-200">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-railway-textPrimary font-sans">
                      Delete Maintenance Block
                    </h3>
                    <p className="text-xs text-neutral-500 font-mono">
                      Target: {deleteModalReqId}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteModalReqId(null)}
                  className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1">
                <strong className="block font-bold">Principal Chief Operations Manager (MASTER) Authority</strong>
                <p>
                  This action permanently cancels and removes this maintenance block possession from all operational queues, planning algorithms, and execution schedules.
                </p>
              </div>

              <div className="space-y-1 font-mono text-xs">
                <label className="text-[10px] text-neutral-500 uppercase block font-bold">
                  Deletion Justification / Operational Reason (Recorded in Audit Ledger):
                </label>
                <textarea
                  rows={3}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Cancelled due to urgent high-density freight priority movement or track relaying rescheduling..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-railway-canvas border border-railway-border text-xs font-sans text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-railway-border">
                <button
                  type="button"
                  onClick={() => setDeleteModalReqId(null)}
                  className="px-4 py-2 rounded-full border border-railway-border text-xs font-semibold text-railway-textSecondary hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deleteModalReqId) {
                      deleteMaintenanceBlock(deleteModalReqId, deleteReason);
                      setDeleteModalReqId(null);
                    }
                  }}
                  className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Confirm Permanent Deletion
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
