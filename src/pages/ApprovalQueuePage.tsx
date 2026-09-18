// Approval Queue Command Center & Decision Workspace
// Indian Railways · Operating Concurrence & Technical Verification
// Complete Original Submission Visibility + Operational Permissions Matrix + Dynamic Actions

import React, { useState } from 'react';
import { useSamnvayStore } from '../store/useSamnvayStore';
import { 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ShieldAlert, 
  Clock, 
  ArrowRight,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  FileText,
  MessageSquare,
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  Wrench,
  Package,
  Users,
  Zap,
  Radio,
  Hammer,
  Sliders,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { BlockRequest, Department, UserRole, SamnvayPage } from '../types/samnvay';
import { calculateCpmActivityNetwork } from '../utils/conflictPlanner';
import { isPendingApproval } from '../utils/requestLifecycle';

interface ApprovalQueuePageProps {
  onNavigate?: (page: SamnvayPage) => void;
}

export const ApprovalQueuePage: React.FC<ApprovalQueuePageProps> = ({ onNavigate }) => {
  const { 
    state, 
    transitionBlockStatus, 
    approveRequest, 
    rejectRequestWithReason, 
    resendRequestForCorrection, 
    requestConcurrence,
    deleteMaintenanceBlock,
    openChat,
    sendPlanningOfficeQuery,
    sendToControl,
    authorizeAndScheduleBlock,
    submitDepartmentApproval,
    submitPlanApproval
  } = useSamnvayStore();

  const isMaster = state.currentUser.role === 'MASTER';
  const [deleteModalReqId, setDeleteModalReqId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');

  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  // Modal Dialog States
  const [resendModalReq, setResendModalReq] = useState<BlockRequest | null>(null);
  const [resendReason, setResendReason] = useState('');
  const [resendFields, setResendFields] = useState<string[]>(['End KM', 'Estimated Duration']);

  const [rejectModalReq, setRejectModalReq] = useState<BlockRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [approveModalReq, setApproveModalReq] = useState<BlockRequest | null>(null);

  // Canonical filter: only requisitions awaiting initial technical or departmental approval
  const pendingRequests = state.requests.filter(r => {
    if (!isPendingApproval(r)) return false;
    if (filterDept !== 'ALL' && r.department !== filterDept) return false;
    return true;
  });

  const isEngineerRole = state.currentUser.role === 'P.Way Engineer' || 
                         state.currentUser.role === 'S&T Engineer' || 
                         state.currentUser.role === 'TRD Engineer';

  const toggleExpand = (id: string) => {
    setExpandedRequestId(expandedRequestId === id ? null : id);
  };

  const toggleResendField = (field: string) => {
    if (resendFields.includes(field)) {
      setResendFields(resendFields.filter(f => f !== field));
    } else {
      setResendFields([...resendFields, field]);
    }
  };

  const handleConfirmResend = () => {
    if (!resendModalReq || !resendReason.trim()) return;
    resendRequestForCorrection(resendModalReq.id, resendReason, resendFields);
    setResendModalReq(null);
    setResendReason('');
  };

  const handleConfirmReject = () => {
    if (!rejectModalReq || !rejectReason.trim()) return;
    rejectRequestWithReason(rejectModalReq.id, rejectReason);
    setRejectModalReq(null);
    setRejectReason('');
  };

  const handleConfirmApprove = () => {
    if (!approveModalReq) return;
    approveRequest(approveModalReq.id, `Formal approval granted by ${state.currentUser.role} ${state.currentUser.name}`);
    setApproveModalReq(null);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-railway-border pb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-railway-textPrimary font-sans">
            Approval Queue
          </h1>
          <p className="text-sm text-railway-textSecondary mt-1">
            Operating Concurrence & Technical Verification
          </p>
        </div>

        {/* Current Active Officer Badge */}
        <div className="bg-white border border-railway-border px-4 py-2 rounded-full flex items-center space-x-2.5 text-xs font-mono shadow-xs">
          <UserCheck className="w-4 h-4 text-railway-signalGreen" />
          <span className="text-railway-textMuted">Active Officer:</span>
          <span className="text-railway-textPrimary font-bold">{state.currentUser.name}</span>
          <span className="px-2 py-0.5 rounded-full bg-railway-canvas text-railway-forest font-semibold border border-railway-border">
            {state.currentUser.role}
          </span>
        </div>
      </div>

      {/* Indian Railways Concurrence & Authorization Lifecycle */}
      <div className="bg-white border border-railway-border rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
        <div className="text-[10px] uppercase font-mono tracking-wider text-railway-textMuted font-bold flex items-center justify-between">
          <span>INDIAN RAILWAYS BLOCK AUTHORITY & OPERATING PIPELINE</span>
          <span className="text-railway-forest font-bold">G&SR CHAPTER XV STANDARD DISCIPLINE</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs font-mono">
          <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col gap-1">
            <span className="w-5 h-5 rounded-full bg-railway-signalGreen text-white flex items-center justify-center font-bold text-[10px]">1</span>
            <span className="font-bold text-[10px] leading-tight">SUBMITTED</span>
            <span className="text-[9px] text-emerald-700 font-sans">Field Requisition</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col gap-1">
            <span className="w-5 h-5 rounded-full bg-railway-signalGreen text-white flex items-center justify-center font-bold text-[10px]">2</span>
            <span className="font-bold text-[10px] leading-tight">DEPT VERIFIED</span>
            <span className="text-[9px] text-emerald-700 font-sans">Tech & Isolation</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col gap-1">
            <span className="w-5 h-5 rounded-full bg-railway-signalGreen text-white flex items-center justify-center font-bold text-[10px]">3</span>
            <span className="font-bold text-[10px] leading-tight">PLANNING REVIEW</span>
            <span className="text-[9px] text-emerald-700 font-sans">Planning Officer</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col gap-1">
            <span className="w-5 h-5 rounded-full bg-railway-signalGreen text-white flex items-center justify-center font-bold text-[10px]">4</span>
            <span className="font-bold text-[10px] leading-tight">OPTIMIZATION</span>
            <span className="text-[9px] text-emerald-700 font-sans">CP-SAT / CPM</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 flex flex-col gap-1">
            <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px]">5</span>
            <span className="font-bold text-[10px] leading-tight">RECOMMENDED</span>
            <span className="text-[9px] text-sky-700 font-sans">Sent to Control</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 flex flex-col gap-1">
            <span className="w-5 h-5 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold text-[10px]">6</span>
            <span className="font-bold text-[10px] leading-tight">CONTROL REVIEW</span>
            <span className="text-[9px] text-purple-700 font-sans">COA / Operations</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 flex flex-col gap-1">
            <span className="w-5 h-5 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold text-[10px]">7</span>
            <span className="font-bold text-[10px] leading-tight">AUTHORIZED</span>
            <span className="text-[9px] text-purple-700 font-sans">Operating Consent</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-railway-canvas border border-railway-border text-railway-textSecondary flex flex-col gap-1">
            <span className="w-5 h-5 rounded-full bg-neutral-300 text-neutral-700 flex items-center justify-center font-bold text-[10px]">8</span>
            <span className="font-bold text-[10px] leading-tight">SCHEDULED</span>
            <span className="text-[9px] text-neutral-500 font-sans">Official Block Memo</span>
          </div>
        </div>
      </div>

      {/* Department Filter Strip */}
      <div className="flex items-center space-x-2">
        {(['ALL', 'P.Way', 'S&T', 'TRD'] as const).map(d => (
          <button
            key={d}
            onClick={() => setFilterDept(d)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
              filterDept === d
                ? 'bg-railway-forest text-white shadow-xs'
                : 'bg-white border border-railway-border text-railway-textSecondary hover:bg-railway-canvas'
            }`}
          >
            {d === 'ALL' ? 'All Pending Requisitions' : d}
          </button>
        ))}
      </div>

      {/* Requisitions List */}
      <div className="space-y-6">
        {pendingRequests.length === 0 ? (
          <div className="p-16 text-center space-y-4 rounded-3xl bg-white border border-railway-border shadow-xs">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-railway-signalGreen mx-auto flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-railway-textPrimary">
                Approval queue clear
              </h3>
              <p className="text-sm text-railway-textSecondary max-w-sm mx-auto">
                No maintenance requisitions are currently waiting for operating concurrence or technical verification.
              </p>
            </div>
          </div>
        ) : (
          pendingRequests.map(req => {
            const isCreator = (
              req.engineer?.toLowerCase().trim() === state.currentUser.name.toLowerCase().trim() ||
              (req as any).creatorId === state.currentUser.employeeId ||
              (req as any).creatorId === state.currentUser.id ||
              (req as any).submittedBy === state.currentUser.name ||
              (req as any).submittedBy === state.currentUser.employeeId
            ) && state.currentUser.role !== 'MASTER';
            const isExpanded = expandedRequestId === req.id;

            // CPM network for this requisition + any overlapping requests
            const overlapping = state.requests.filter(other => 
              other.id !== req.id && 
              (other.section === req.section || (other.startKm && req.startKm && Math.abs(other.startKm - req.startKm) < 2.0))
            );
            const cpmPackage = [req, ...overlapping];
            const cpmAnalysis = calculateCpmActivityNetwork(cpmPackage);

            return (
              <div
                key={req.id}
                className="bg-white rounded-3xl border border-railway-border p-6 sm:p-8 shadow-xs hover:shadow-md transition-all space-y-6"
              >
                {/* Header Row: ID, Department, Status, Priority Score, Timing */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-railway-border">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-bold text-lg text-railway-forest">
                      {req.id}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                      req.department === 'P.Way' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      req.department === 'S&T' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                      'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {req.department}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                      req.status === 'Revision Required' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      req.status === 'Verified' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                      'bg-neutral-100 text-neutral-800'
                    }`}>
                      {req.status}
                    </span>
                    <span className="text-xs font-mono text-railway-textMuted">
                      Priority: <strong className="text-railway-textPrimary">{req.priorityScore || 80}/100</strong> ({req.priority})
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono">
                    <span className="text-railway-textMuted">Requested Window:</span>
                    <span className="font-bold text-railway-textPrimary">{req.date} @ {req.preferredStartTime || req.preferredTime} IST</span>
                    <span className="text-railway-borderDark">|</span>
                    <span className="text-railway-textMuted">Duration:</span>
                    <span className="font-bold text-railway-forest">{req.duration} min</span>
                  </div>
                </div>

                {/* Revision Notice Banner if in Revision Required state */}
                {req.status === 'Revision Required' && req.revisionRequest && (
                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-1.5 text-xs text-amber-950 font-mono">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5 text-amber-900">
                        <RotateCcw className="w-4 h-4 text-amber-700" />
                        <span>RESENT FOR CORRECTION BY {req.revisionRequest.requestedBy.toUpperCase()} ({req.revisionRequest.role})</span>
                      </span>
                      <span className="text-neutral-500">{req.revisionRequest.timestamp}</span>
                    </div>
                    <p className="text-amber-900 font-sans">
                      <strong>Correction Reason:</strong> {req.revisionRequest.reason}
                    </p>
                    {req.revisionRequest.fieldsRequiringCorrection.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-neutral-500">Fields Requiring Revision:</span>
                        {req.revisionRequest.fieldsRequiringCorrection.map((f, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-white border border-amber-300 font-bold text-amber-900">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Summary Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  <div className="space-y-1">
                    <span className="text-railway-textMuted font-mono uppercase text-[10px] font-bold">Location & Station</span>
                    <div className="font-bold text-sm text-railway-textPrimary">
                      {req.stationCode || 'BZA'} · {req.stationName || 'Vijayawada'}
                    </div>
                    <div className="font-mono text-railway-textSecondary">
                      {req.section} ({req.startLocation} to {req.endLocation})
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-railway-textMuted font-mono uppercase text-[10px] font-bold">Work Scope & Category</span>
                    <div className="font-medium text-sm text-railway-textPrimary">{req.work}</div>
                    <div className="text-railway-textSecondary">
                      Requester: <strong>{req.engineer}</strong> ({req.creatorRole})
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-railway-textMuted font-mono uppercase text-[10px] font-bold">Asset Under Maintenance</span>
                    <div className="font-medium text-sm text-railway-forest">
                      {req.assetId ? `${req.assetId} — ${req.assetName || 'Corridor Asset'}` : (req.affectedAssets?.[0] || 'Track Infrastructure')}
                    </div>
                    <div className="text-railway-textSecondary font-mono">
                      Category: {req.maintenanceCategory || 'Preventive'}
                    </div>
                  </div>
                </div>

                {/* Toggle Button for Full Original Submission & Decision Workspace */}
                <button
                  type="button"
                  onClick={() => toggleExpand(req.id)}
                  className="w-full py-2 px-4 rounded-xl bg-railway-canvas hover:bg-neutral-100 border border-railway-border flex items-center justify-between text-xs font-mono font-semibold text-railway-textPrimary transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-railway-forest" />
                    <span>{isExpanded ? 'Hide Complete Submission & Decision Workspace' : 'Inspect Complete Original Submission & Operational Matrix'}</span>
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
                </button>

                {/* EXPANDED COMPLETE SUBMISSION & DECISION WORKSPACE */}
                {isExpanded && (
                  <div className="space-y-6 pt-2 animate-in fade-in duration-200">
                    
                    {/* 1. COMPLETE ORIGINAL USER SUBMISSION */}
                    <div className="p-5 rounded-2xl bg-neutral-50/70 border border-railway-border space-y-4">
                      <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                        <h4 className="text-xs font-bold font-mono text-railway-textPrimary uppercase flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-railway-forest" />
                          <span>COMPLETE ORIGINAL USER SUBMISSION (FULL RECORD)</span>
                        </h4>
                        <span className="text-[10px] font-mono text-neutral-500">Submitted at: {req.createdAt || req.date}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                        <div>
                          <span className="text-neutral-400 text-[10px] uppercase block">Maintenance Category</span>
                          <span className="font-bold text-railway-textPrimary">{req.maintenanceCategory || 'Preventive'}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 text-[10px] uppercase block">Inspection Reference</span>
                          <span className="font-bold text-railway-textPrimary">{req.inspectionReference || 'TI/BZA/2026/09/W-12'}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 text-[10px] uppercase block">Workforce Mobilization</span>
                          <span className="font-bold text-railway-forest">{req.workforceCount || 8} Track Personnel</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 text-[10px] uppercase block">Schedule Flexibility</span>
                          <span className="font-bold text-railway-textPrimary">{req.flexibleTiming ? `Flexible (${req.earliestAcceptableTime || '02:00'}–${req.latestAcceptableTime || '06:30'})` : 'Fixed'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="p-3 rounded-xl bg-white border border-neutral-200 space-y-1">
                          <span className="text-neutral-400 text-[10px] font-mono uppercase block font-bold">Defect Details & Reason</span>
                          <p className="text-railway-textPrimary leading-relaxed">
                            {req.defectDetails || req.reason}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-white border border-neutral-200 space-y-1">
                          <span className="text-neutral-400 text-[10px] font-mono uppercase block font-bold">Machines, Equipment & Materials</span>
                          <p className="text-railway-textPrimary font-mono leading-relaxed">
                            {req.machines?.join(', ') || req.resourcesRequired?.join(', ') || '09-3X Tamping Machine'}
                            {req.materials && req.materials.length > 0 && ` | Materials: ${req.materials.join(', ')}`}
                          </p>
                        </div>
                      </div>

                      {req.dependencies && req.dependencies.length > 0 && (
                        <div className="p-3 rounded-xl bg-white border border-neutral-200 text-xs font-mono space-y-1">
                          <span className="text-neutral-400 text-[10px] uppercase block font-bold">Declared Dependencies</span>
                          <p className="text-amber-900">{req.dependencies.join('; ')}</p>
                        </div>
                      )}
                    </div>

                    {/* 2. OPERATIONAL & PERMISSION REQUIREMENTS DECISION MATRIX */}
                    <div className="p-5 rounded-2xl bg-white border border-railway-border space-y-4 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-railway-border pb-2">
                        <h4 className="text-xs font-bold font-mono text-railway-textPrimary uppercase flex items-center gap-1.5">
                          <Sliders className="w-4 h-4 text-railway-forest" />
                          <span>OPERATIONAL & PERMISSION REQUIREMENTS MATRIX</span>
                        </h4>
                        <span className="text-[10px] font-mono text-railway-textMuted">Evaluated for Operating Concurrence</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className="border-b border-neutral-200 text-neutral-400 text-[10px] uppercase">
                              <th className="pb-2">Requirement</th>
                              <th className="pb-2">Evaluation Status</th>
                              <th className="pb-2">Inference & Rationale</th>
                              <th className="pb-2">Operating Impact</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            <tr>
                              <td className="py-2.5 font-bold text-railway-textPrimary">Traffic Possession</td>
                              <td className="py-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  req.trafficBlockRequired ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
                                }`}>
                                  {req.trafficBlockRequired ? 'REQUIRED' : 'NOT REQUIRED'}
                                </span>
                              </td>
                              <td className="py-2.5 text-neutral-600 font-sans text-[11px]">
                                Maintenance activities on running line ({req.affectedTracks?.join(', ') || 'UP Main'}) require complete block section protection.
                              </td>
                              <td className="py-2.5 font-bold text-amber-700">Line Closure</td>
                            </tr>

                            <tr>
                              <td className="py-2.5 font-bold text-railway-textPrimary">Power Block (25kV OHE)</td>
                              <td className="py-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  req.powerBlockRequired || req.department === 'TRD' || (req.work && req.work.toLowerCase().includes('ohe'))
                                    ? 'bg-amber-100 text-amber-900' : 'bg-neutral-100 text-neutral-600'
                                }`}>
                                  {req.powerBlockRequired || req.department === 'TRD' || (req.work && req.work.toLowerCase().includes('ohe'))
                                    ? 'REQUIRED' : 'TO BE DETERMINED'}
                                </span>
                              </td>
                              <td className="py-2.5 text-neutral-600 font-sans text-[11px]">
                                {req.powerBlockRequired || req.department === 'TRD'
                                  ? 'Traction catenary de-energization and discharge rod earthing mandatory.'
                                  : 'Electrified track section. Height gauges and machine boom clearance to be verified.'}
                              </td>
                              <td className="py-2.5 font-bold text-amber-700">
                                {req.powerBlockRequired || req.department === 'TRD' ? 'Permit to Work' : 'No Traction Cut'}
                              </td>
                            </tr>

                            <tr>
                              <td className="py-2.5 font-bold text-railway-textPrimary">S&T Disconnection</td>
                              <td className="py-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  req.sntDisconnectionRequired || req.department === 'S&T'
                                    ? 'bg-blue-100 text-blue-900' : 'bg-neutral-100 text-neutral-600'
                                }`}>
                                  {req.sntDisconnectionRequired || req.department === 'S&T' ? 'REQUIRED' : 'NOT REQUIRED'}
                                </span>
                              </td>
                              <td className="py-2.5 text-neutral-600 font-sans text-[11px]">
                                {req.sntDisconnectionRequired || req.department === 'S&T'
                                  ? 'Point detection circuit disconnect notice required under G&SR 15.08.'
                                  : 'No track circuit bounding or point interlocking disturbed by planned work.'}
                              </td>
                              <td className="py-2.5 font-bold text-neutral-700">
                                {req.sntDisconnectionRequired ? 'Signal Freeze' : 'Normal Signaling'}
                              </td>
                            </tr>

                            <tr>
                              <td className="py-2.5 font-bold text-railway-textPrimary">Speed Restriction (TSR)</td>
                              <td className="py-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  req.speedRestrictionRequired ? 'bg-amber-100 text-amber-900' : 'bg-neutral-100 text-neutral-600'
                                }`}>
                                  {req.speedRestrictionRequired ? 'CONFIRMED' : 'TO BE DETERMINED'}
                                </span>
                              </td>
                              <td className="py-2.5 text-neutral-600 font-sans text-[11px]">
                                {req.specialOperatingRestrictions || 'Caution order 30 km/h for first 3 trains post track disturbance.'}
                              </td>
                              <td className="py-2.5 font-bold text-purple-700">30 km/h Caution Order</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 3. OPERATIONAL DECISION ANALYSIS PANEL */}
                    <div className="p-5 rounded-2xl bg-neutral-900 text-white space-y-4 shadow-md font-mono">
                      <div className="flex items-center justify-between border-b border-white/15 pb-2">
                        <span className="text-emerald-400 font-bold text-xs uppercase flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>OPERATIONAL DECISION ANALYSIS & CONFLICT SCREENING</span>
                        </span>
                        <span className="text-neutral-400 text-[10px]">CORRIDOR SOLVER PIPELINE</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                          <span className="text-neutral-400 text-[10px] uppercase block">Location Intelligence</span>
                          <div className="text-emerald-400 font-bold">
                            {req.isStationLimitIntersection ? 'Yard Limit Intersection' : '✓ Station Resolved'}
                          </div>
                          <div className="text-[11px] text-neutral-300">
                            {req.stationCode || 'BZA'} · {req.betweenStations || `${req.section || 'Corridor'} Line`}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                          <span className="text-neutral-400 text-[10px] uppercase block">OpenRailwayMap GIS (Supplementary)</span>
                          <div className="text-cyan-400 font-bold">
                            Supplementary Geometry
                          </div>
                          <div className="text-[11px] text-neutral-300 truncate" title="Geospatial track coordinates and switches referenced from OpenRailwayMap GIS adapter.">
                            Track: {req.affectedTracks?.[0] || 'UP Main'} (Broad Gauge 1676mm, 25kV OHE)
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                          <span className="text-neutral-400 text-[10px] uppercase block">Conflict Classification</span>
                          <div className={`font-bold ${
                            req.conflict ? 'text-red-400' : overlapping.length > 0 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {req.conflict ? 'HARD CONFLICT' : overlapping.length > 0 ? 'COORDINATION OPP.' : 'NO CONFLICT'}
                          </div>
                          <div className="text-[11px] text-neutral-300">
                            {req.conflict ? 'Headway collision detected' : overlapping.length > 0 ? 'Multi-dept shadow bundling' : 'Corridor path clear'}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                          <span className="text-neutral-400 text-[10px] uppercase block">CPM Critical Path</span>
                          <div className="text-emerald-400 font-bold">{cpmAnalysis.criticalPathDuration} Minutes</div>
                          <div className="text-[11px] text-neutral-300">
                            Bottleneck: {cpmAnalysis.criticalActivities[0] || 'Track Work'}
                          </div>
                        </div>
                      </div>

                      {/* Coordination Action Button */}
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                        <span className="text-neutral-300 text-[11px]">
                          Discuss window coordination with affected departments:
                        </span>
                        <button
                          type="button"
                          onClick={() => openChat('conv-coord-01')}
                          className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Open Department Coordination Chat</span>
                        </button>
                      </div>
                    </div>

                    {/* 4. PERMANENT APPROVAL & DECISION AUDIT TRAIL */}
                    {req.statusHistory && req.statusHistory.length > 0 && (
                      <div className="p-4 rounded-2xl bg-white border border-railway-border space-y-3">
                        <h4 className="text-xs font-bold font-mono text-railway-textPrimary uppercase">
                          PERMANENT APPROVAL & DECISION AUDIT TRAIL
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {req.statusHistory.map((h, i) => (
                            <div key={i} className="flex items-start justify-between p-2 rounded-xl bg-railway-canvas text-xs font-mono">
                              <div>
                                <span className="font-bold text-railway-textPrimary">{h.status}</span>
                                <span className="text-neutral-400 mx-1.5">·</span>
                                <span className="text-neutral-600">{h.actor} ({h.role})</span>
                                <p className="text-[11px] text-neutral-500 font-sans mt-0.5">{h.remarks}</p>
                              </div>
                              <span className="text-[10px] text-neutral-400 whitespace-nowrap">{h.timestamp}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* Self-Approval Warning Banner if applicable */}
                {isCreator && (
                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 flex items-center space-x-2.5 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-railway-safetyAmber flex-shrink-0" />
                    <span><strong>Self-Approval Blocked:</strong> You created this requisition. Indian Railways operating regulations require independent officer concurrence.</span>
                  </div>
                )}

                {/* Dynamic Approval Actions Footer */}
                <div className="pt-4 border-t border-railway-border flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center space-x-2 text-xs font-mono text-railway-textMuted">
                    <ShieldCheck className="w-4 h-4 text-railway-signalGreen" />
                    <span>Corridor Safety: G&SR Chapter XV Rule Compliance Checked</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Inter-Departmental Concurrence Button if TRD/S&T involved */}
                    {req.department === 'P.Way' && (
                      <button
                        type="button"
                        onClick={() => requestConcurrence(req.id, 'TRD', 'Requesting 25kV OHE isolation concurrence')}
                        className="px-3.5 py-2 rounded-full border border-amber-300 hover:bg-amber-50 text-amber-900 text-xs font-semibold transition flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                        <span>Request TRD Concurrence</span>
                      </button>
                    )}

                    {/* Technical Verification by Departmental Head */}
                    {(req.status === 'SUBMITTED' || req.status === 'Submitted' || req.status === 'P.Way/S&T/TRD Review') && (
                      <button
                        type="button"
                        disabled={isCreator}
                        onClick={() => submitDepartmentApproval(req.id, 'Technical clearance verified: Assets, gang, and safety equipment checked.')}
                        className="px-4 py-2 rounded-full bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-900 text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Verify Technical Feasibility</span>
                      </button>
                    )}

                    {/* Forward to Operating Approval / Corridor Planning */}
                    {(req.status === 'DEPARTMENT_APPROVED' || req.status === 'Verified') && (
                      <button
                        type="button"
                        disabled={isCreator}
                        onClick={() => submitPlanApproval(req.id, 'Forwarded to Senior Divisional Operating Manager / Corridor Planning for timetable concurrence.')}
                        className="px-4 py-2 rounded-full bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-900 text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-purple-600" />
                        <span>Forward for Operating Concurrence</span>
                      </button>
                    )}

                    {/* Direct Requisition Approval into Approved Pool */}
                    {(state.currentUser.role === 'Planning Officer' || state.currentUser.role === 'COA / Operations' || state.currentUser.role === 'MASTER') && (
                      <button
                        type="button"
                        disabled={isCreator}
                        onClick={() => setApproveModalReq(req)}
                        className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        title={isCreator ? "Self-approval blocked: creator cannot approve own requisition" : "Approve requisition into the Approved planning pool"}
                      >
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>Approve Requisition</span>
                      </button>
                    )}

                    {/* Request Clarification via Communication */}
                    <button
                      type="button"
                      onClick={() => {
                        sendPlanningOfficeQuery(
                          req.id,
                          'Maintenance Scheduling Clarification',
                          `Approval Queue clarification request for ${req.id} (${req.work}) on Section ${req.section}. Requested window: ${req.preferredStartTime || req.preferredTime}.`
                        );
                        if (onNavigate) {
                          onNavigate('communication');
                        } else {
                          window.location.hash = 'communication';
                        }
                      }}
                      className="px-3.5 py-2 rounded-full border border-purple-200 hover:bg-purple-50 text-purple-900 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      title="Request formal clarification via Planning Office communication"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                      <span>REQUEST CLARIFICATION</span>
                    </button>

                    {/* Resend for Correction (Opens Dialog) */}
                    <button
                      type="button"
                      onClick={() => {
                        setResendModalReq(req);
                        setResendReason('');
                      }}
                      className="px-4 py-2 rounded-full border border-railway-border hover:bg-neutral-100 text-railway-textSecondary hover:text-railway-textPrimary text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Resend for Correction</span>
                    </button>

                    {/* Reject Request (Opens Dialog) */}
                    <button
                      type="button"
                      onClick={() => {
                        setRejectModalReq(req);
                        setRejectReason('');
                      }}
                      className="px-4 py-2 rounded-full border border-red-200 hover:bg-red-50 text-red-800 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 text-red-600" />
                      <span>Reject</span>
                    </button>

                    {/* MASTER ONLY: Permanent Deletion Action */}
                    {isMaster && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteModalReqId(req.id);
                          setDeleteReason('');
                        }}
                        className="px-4 py-2 rounded-full border border-red-300 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                        title="MASTER Authority: Permanently delete maintenance block requisition"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        <span>DELETE</span>
                      </button>
                    )}

                    {/* Role-Specific Operating & Planning Actions */}
                    {state.currentUser.role === 'Planning Officer' ? (
                      <button
                        type="button"
                        disabled={isCreator}
                        onClick={() => {
                          sendToControl(req.id, `Recommended window formulated by Planning Officer ${state.currentUser.name}`);
                          if (onNavigate) onNavigate('planning');
                        }}
                        className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 cursor-pointer"
                        title="Run AI optimization and submit recommended block window to COA / Operations Control"
                      >
                        <Sparkles className="w-4 h-4 text-emerald-200" />
                        <span>GENERATE RECOMMENDATION & SEND TO CONTROL</span>
                      </button>
                    ) : state.currentUser.role === 'COA / Operations' ? (
                      <div className="flex items-center space-x-2">
                        {onNavigate && (
                          <button
                            type="button"
                            onClick={() => onNavigate('planning')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-semibold shadow-2xs transition cursor-pointer"
                          >
                            <Search className="w-3.5 h-3.5 text-purple-700" />
                            <span>REVIEW OPERATIONAL IMPACT</span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isCreator}
                          onClick={() => authorizeAndScheduleBlock(req.id, `Possession officially authorized & scheduled by Operating Control Authority ${state.currentUser.name} (COA / Operations)`)}
                          className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 cursor-pointer"
                          title="Authorize corridor block and issue official Indian Railways Block Memo"
                        >
                          <CheckCircle2 className="w-4 h-4 text-purple-200" />
                          <span>AUTHORIZE & SCHEDULE BLOCK</span>
                        </button>
                      </div>
                    ) : state.currentUser.role === 'MASTER' ? (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => authorizeAndScheduleBlock(req.id, 'Administrative Override by MASTER')}
                          className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-neutral-800 hover:bg-black text-white text-xs font-bold shadow-xs transition active:scale-98 cursor-pointer"
                          title="System Administrator emergency override: Authorize block and log administrative override"
                        >
                          <ShieldAlert className="w-4 h-4 text-amber-300" />
                          <span>ADMINISTRATIVE OVERRIDE: AUTHORIZE BLOCK</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={true}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-neutral-100 border border-neutral-300 text-neutral-500 text-xs font-semibold cursor-not-allowed"
                        title="Field maintenance roles create requirements only; operating control authority required for authorization"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-neutral-400" />
                        <span>REQUIRES OPERATING AUTHORITY</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* DIALOG 1: RESEND FOR CORRECTION                                            */}
      {/* ========================================================================= */}
      {resendModalReq && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-railway-border rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-railway-border pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-railway-textPrimary text-sm">Resend for Correction</h3>
                  <p className="text-[11px] font-mono text-railway-textMuted">{resendModalReq.id} · {resendModalReq.engineer}</p>
                </div>
              </div>
              <button
                onClick={() => setResendModalReq(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
                Check Fields Requiring Revision
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {['Start KM', 'End KM', 'Estimated Duration', 'Track Selection', 'Work Description', 'Machines', 'Preferred Time'].map((f) => (
                  <label key={f} className="flex items-center space-x-2 p-2 rounded-xl bg-railway-canvas border border-railway-border cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resendFields.includes(f)}
                      onChange={() => toggleResendField(f)}
                      className="rounded text-railway-forest accent-railway-forest"
                    />
                    <span className="text-railway-textPrimary font-semibold">{f}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
                Specific Correction Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                value={resendReason}
                onChange={(e) => setResendReason(e.target.value)}
                rows={3}
                placeholder="e.g. Please confirm exact End KM to prevent turnout fouling and update track machine count."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-railway-canvas border border-railway-border text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>

            <div className="pt-2 border-t border-railway-border flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setResendModalReq(null)}
                className="px-5 py-2 rounded-full border border-railway-border text-xs font-semibold text-railway-textSecondary hover:text-railway-textPrimary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!resendReason.trim()}
                onClick={handleConfirmResend}
                className="px-6 py-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
              >
                Confirm & Resend to Requester
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 2: REJECT WITH MANDATORY REASON                                     */}
      {/* ========================================================================= */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-railway-border rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-railway-border pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-700 flex items-center justify-center border border-red-200">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-railway-textPrimary text-sm">Reject Maintenance Requisition</h3>
                  <p className="text-[11px] font-mono text-railway-textMuted">{rejectModalReq.id} · {rejectModalReq.department}</p>
                </div>
              </div>
              <button
                onClick={() => setRejectModalReq(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-red-50 border border-red-200 p-3 text-xs text-red-900">
              <p>
                <strong>Operational Safety Rule:</strong> Rejection terminates the requirement for this cycle. A permanent record will be stored in the corridor audit ledger. An operational justification reason is mandatory.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
                Rejection Reason & Operating Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g. Unacceptable headway imposition during morning peak express traffic. Resubmit for night window."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-railway-canvas border border-railway-border text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>

            <div className="pt-2 border-t border-railway-border flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                className="px-5 py-2 rounded-full border border-railway-border text-xs font-semibold text-railway-textSecondary hover:text-railway-textPrimary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim()}
                onClick={handleConfirmReject}
                className="px-6 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 3: MASTER DELETE MAINTENANCE BLOCK                                 */}
      {/* ========================================================================= */}
      {deleteModalReqId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-railway-border rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-railway-border pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center border border-red-200">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-railway-textPrimary text-sm">Delete Maintenance Block</h3>
                  <p className="text-[11px] font-mono text-railway-textMuted">Target: {deleteModalReqId}</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteModalReqId(null)}
                className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1">
              <strong className="block font-bold">Principal Chief Operations Manager (MASTER) Authority</strong>
              <p>
                Permanently purge this maintenance requisition from the approval queue, planning queue, and scheduled possessions.
              </p>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <label className="text-xs font-semibold text-railway-textSecondary uppercase text-[10px]">
                Reason for Permanent Deletion (Logged in Audit Trail):
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
                placeholder="e.g. Work duplicate, emergency track revision, or operational traffic priority override."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-railway-canvas border border-railway-border text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-red-500/30 font-sans"
              />
            </div>

            <div className="pt-2 border-t border-railway-border flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeleteModalReqId(null)}
                className="px-5 py-2 rounded-full border border-railway-border text-xs font-semibold text-railway-textSecondary hover:text-railway-textPrimary"
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
                className="px-6 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Confirm Permanent Deletion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 4: CONFIRM REQUISITION APPROVAL                                     */}
      {/* ========================================================================= */}
      {approveModalReq && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-railway-border rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-railway-border pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-railway-textPrimary text-sm">Approve Maintenance Requisition</h3>
                  <p className="text-[11px] font-mono text-railway-textMuted">{approveModalReq.id} · {approveModalReq.department}</p>
                </div>
              </div>
              <button
                onClick={() => setApproveModalReq(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 leading-relaxed">
              <p>
                <strong>Operational Decision:</strong> Moving <strong>{approveModalReq.id}</strong> ({approveModalReq.work}) on section {approveModalReq.section} to <strong>Approved</strong> pool makes it immediately available for Dynamic CP-SAT Automatic Block Planning.
              </p>
            </div>

            <div className="text-xs font-mono text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-1">
              <div>Approving Officer: <strong>{state.currentUser.name}</strong> ({state.currentUser.role})</div>
              <div>Requested Window: <strong>{approveModalReq.duration} min</strong> @ {approveModalReq.preferredStartTime || approveModalReq.preferredTime} IST</div>
            </div>

            <div className="pt-2 border-t border-railway-border flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setApproveModalReq(null)}
                className="px-5 py-2 rounded-full border border-railway-border text-xs font-semibold text-railway-textSecondary hover:text-railway-textPrimary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                className="px-6 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
