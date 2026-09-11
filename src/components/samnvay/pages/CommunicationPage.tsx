// Dedicated Communication Page for Rail Samnvay Control Room
// Indian Railways · South Central Railway · Vijayawada Division (BZA)
// Operational Coordination Console (NOT a generic chatbot)
//
// Core Rules:
// 1. Two contexts: State A (No active block context -> Planning Office & Control Office)
//                  State B (Active block / planning context -> Context-Aware Coordination)
// 2. Strict RBAC: Backend/role checks. Only authorized roles participate.
// 3. Separation of Concerns: Discussion only; NEVER alters workflow status or approvals.
// 4. Audit Trail separation: Audit is permanent ledger; Communication is discussion.
// 5. Operational Quick Actions: Planning clarification, Control review, Reschedule window, etc.
// 6. Typography: Exact project font (--font-primary / Plus Jakarta Sans). Zero new fonts.

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSamnvayStore } from '../../../store/useSamnvayStore';
import { 
  Building2, 
  Radio, 
  Layers, 
  Send, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  MapPin, 
  Train, 
  AlertTriangle, 
  CheckCircle2, 
  User as UserIcon, 
  Search, 
  Lock, 
  ArrowRight, 
  Filter,
  FileText,
  Activity,
  MessageSquare
} from 'lucide-react';
import { ChatMessage, Department, UserRole, SamnvayPage } from '../../../types/samnvay';

interface CommunicationPageProps {
  onNavigate?: (page: SamnvayPage) => void;
}

export const CommunicationPage: React.FC<CommunicationPageProps> = ({ onNavigate }) => {
  const { 
    state, 
    sendChatMessage, 
    sendPlanningOfficeQuery, 
    sendControlOfficeQuery,
    openBlockCommunication,
    markConversationRead
  } = useSamnvayStore();

  const currentUser = state.currentUser;

  // Active channel view: 'AUTO' | 'PLANNING' | 'CONTROL' | 'BLOCK'
  const [activeChannelType, setActiveChannelType] = useState<'AUTO' | 'PLANNING' | 'CONTROL' | 'BLOCK'>('AUTO');
  const [selectedReqOrBlockId, setSelectedReqOrBlockId] = useState<string>('');
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Planning Query Form State
  const [planReqId, setPlanReqId] = useState('');
  const [planTopic, setPlanTopic] = useState('Preferred Window Discussion');
  const [planQueryText, setPlanQueryText] = useState('');

  // Control Query Form State
  const [ctrlBlockId, setCtrlBlockId] = useState('');
  const [ctrlIssue, setCtrlIssue] = useState('Train Movement Conflict');
  const [ctrlQueryText, setCtrlQueryText] = useState('');

  // 1. Identify User's Active Contextual Items (Requirements, Planning Items, Blocks)
  const userContextItems = useMemo(() => {
    return state.requests.filter(req => {
      // MASTER sees all active items
      if (currentUser.role === 'MASTER') return true;
      // Planning Officer sees all planning and scheduled items
      if (currentUser.role === 'Planning Officer') return true;
      // Section Controller & Operations see active/scheduled items
      if (currentUser.role === 'Section Controller' || currentUser.role === 'COA / Operations') {
        return req.status === 'Scheduled' || req.status === 'Block Started' || req.status === 'Work in Progress' || !!req.conflict;
      }
      // Department engineers see their department's items or items they created
      return req.department === currentUser.department || req.engineer === currentUser.name;
    });
  }, [state.requests, currentUser]);

  // Determine if User currently has an active block/work context (STATE B vs STATE A)
  const hasActiveContext = userContextItems.length > 0;

  // Currently selected block or default to first context item
  const effectiveContextReq = useMemo(() => {
    if (selectedReqOrBlockId) {
      return state.requests.find(r => r.id === selectedReqOrBlockId || r.blockMemoNumber === selectedReqOrBlockId) || null;
    }
    return userContextItems[0] || null;
  }, [selectedReqOrBlockId, state.requests, userContextItems]);

  // Find relevant conversations
  const planningConv = useMemo(() => {
    return state.conversations.find(c => c.type === 'PLANNING_OFFICE_QUERY' || c.id === 'conv-planning-desk');
  }, [state.conversations]);

  const controlConv = useMemo(() => {
    return state.conversations.find(c => c.type === 'CONTROL_OFFICE_QUERY' || c.id === 'conv-control-desk');
  }, [state.conversations]);

  const currentBlockConv = useMemo(() => {
    if (!effectiveContextReq) return null;
    return state.conversations.find(c => 
      (c.blockId && (c.blockId === effectiveContextReq.blockMemoNumber || c.blockId === effectiveContextReq.id)) ||
      (c.requestId && c.requestId === effectiveContextReq.id) ||
      c.id === `conv-block-${effectiveContextReq.id}`
    ) || null;
  }, [effectiveContextReq, state.conversations]);

  // Determine current active mode
  const currentViewMode: 'STATE_A_HOME' | 'PLANNING_DESK' | 'CONTROL_DESK' | 'BLOCK_CONTEXT' = useMemo(() => {
    if (activeChannelType === 'PLANNING') return 'PLANNING_DESK';
    if (activeChannelType === 'CONTROL') return 'CONTROL_DESK';
    if (activeChannelType === 'BLOCK' && effectiveContextReq) return 'BLOCK_CONTEXT';

    // Automatic mode: if active context exists, show BLOCK_CONTEXT; otherwise STATE_A_HOME
    if (hasActiveContext && effectiveContextReq) {
      return 'BLOCK_CONTEXT';
    }
    return 'STATE_A_HOME';
  }, [activeChannelType, hasActiveContext, effectiveContextReq]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentBlockConv?.messages, planningConv?.messages, controlConv?.messages]);

  // Clear unread badge for the currently active conversation
  useEffect(() => {
    if (currentViewMode === 'BLOCK_CONTEXT' && currentBlockConv?.id) {
      markConversationRead(currentBlockConv.id);
    } else if (currentViewMode === 'PLANNING_DESK' && planningConv?.id) {
      markConversationRead(planningConv.id);
    } else if (currentViewMode === 'CONTROL_DESK' && controlConv?.id) {
      markConversationRead(controlConv.id);
    }
  }, [currentViewMode, currentBlockConv?.id, planningConv?.id, controlConv?.id, markConversationRead]);

  // RBAC Participant Check for Block Context
  const isAuthorizedForBlock = useMemo(() => {
    if (!effectiveContextReq) return false;
    if (currentUser.role === 'MASTER') return true;
    if (currentUser.role === 'Planning Officer') return true;
    if (currentUser.role === 'Section Controller' || currentUser.role === 'COA / Operations') return true;
    if (currentUser.department === effectiveContextReq.department) return true;
    if (effectiveContextReq.engineer === currentUser.name) return true;
    return false;
  }, [currentUser, effectiveContextReq]);

  // Handlers
  const handleSendBlockMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !effectiveContextReq) return;

    if (!currentBlockConv) {
      openBlockCommunication(effectiveContextReq.id);
      setTimeout(() => {
        const conv = state.conversations.find(c => c.requestId === effectiveContextReq.id || c.blockId === effectiveContextReq.id);
        if (conv) {
          sendChatMessage(conv.id, messageInput.trim(), undefined, 'Operational Coordination', {
            requestId: effectiveContextReq.id,
            blockId: effectiveContextReq.blockMemoNumber || effectiveContextReq.id,
            sectionId: effectiveContextReq.section,
            kmRange: `${effectiveContextReq.startLocation} – ${effectiveContextReq.endLocation}`,
            department: currentUser.department,
            role: currentUser.role
          });
        }
      }, 50);
    } else {
      sendChatMessage(currentBlockConv.id, messageInput.trim(), undefined, 'Operational Coordination', {
        requestId: effectiveContextReq.id,
        blockId: effectiveContextReq.blockMemoNumber || effectiveContextReq.id,
        sectionId: effectiveContextReq.section,
        kmRange: `${effectiveContextReq.startLocation} – ${effectiveContextReq.endLocation}`,
        department: currentUser.department,
        role: currentUser.role
      });
    }

    setMessageInput('');
  };

  const handleSendPlanningQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planQueryText.trim()) return;
    sendPlanningOfficeQuery(planReqId || 'REQ-GENERAL', planTopic, planQueryText.trim());
    setPlanQueryText('');
  };

  const handleSendControlQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctrlQueryText.trim()) return;
    sendControlOfficeQuery(ctrlBlockId || 'SEC-A', ctrlIssue, ctrlQueryText.trim());
    setCtrlQueryText('');
  };

  // Operational Quick Actions (Section 13)
  const handleQuickAction = (actionType: string) => {
    if (!effectiveContextReq) return;
    const blockId = effectiveContextReq.blockMemoNumber || effectiveContextReq.id;

    switch (actionType) {
      case 'CLARIFICATION':
        setActiveChannelType('PLANNING');
        setPlanReqId(effectiveContextReq.id);
        setPlanTopic('Maintenance Scheduling Clarification');
        setPlanQueryText(`Requesting planning clarification for ${blockId} (${effectiveContextReq.work}) at KM ${effectiveContextReq.startLocation}–${effectiveContextReq.endLocation}. Preferred time: ${effectiveContextReq.preferredTime}.`);
        break;

      case 'CONTROL_REVIEW':
        setActiveChannelType('CONTROL');
        setCtrlBlockId(blockId);
        setCtrlIssue('Operational Restrictions');
        setCtrlQueryText(`Requesting Control review for ${blockId} on Section ${effectiveContextReq.section}. Line: ${effectiveContextReq.affectedTracks?.join(', ') || 'UP Main'}.`);
        break;

      case 'ALTERNATIVE_WINDOW':
        setActiveChannelType('PLANNING');
        setPlanReqId(effectiveContextReq.id);
        setPlanTopic('Alternative Window Request');
        setPlanQueryText(`Requesting evaluation of an alternative maintenance window for ${blockId}. Current window: ${effectiveContextReq.preferredTime}. Required duration: ${effectiveContextReq.duration}m.`);
        break;

      case 'NOTIFY_DEPT':
        if (currentBlockConv) {
          sendChatMessage(currentBlockConv.id, `Urgent operational update: Coordination required between P.Way, TRD, and S&T regarding site readiness at ${effectiveContextReq.startLocation}.`, undefined, 'Department Coordination Notice');
        }
        break;
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans select-text">
      
      {/* ── 1. Page Header ── */}
      <div className="border-b border-railway-border pb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-railway-forest text-white flex items-center justify-center font-bold shadow-xs">
              <MessageSquare className="w-4 h-4 text-emerald-300" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-railway-textPrimary">
              Operational Communication
            </h1>
          </div>
          <p className="text-sm text-railway-textSecondary mt-1">
            Official coordination desk for maintenance possessions, planning office clarifications, and divisional train control operations.
          </p>
        </div>

        {/* Operating Invariant Notice Pill */}
        <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full text-xs text-amber-900 font-mono">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Operational discussion only · Official actions require authorized workflow sign-off</span>
        </div>
      </div>

      {/* ── 2. Channel & Desk Selector Tabs ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-railway-border shadow-xs">
        <div className="flex items-center space-x-2">
          {/* Block Context Option (if active items exist) */}
          {hasActiveContext && (
            <button
              onClick={() => {
                setActiveChannelType('BLOCK');
                if (userContextItems.length > 0 && !selectedReqOrBlockId) {
                  setSelectedReqOrBlockId(userContextItems[0].id);
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-2 ${
                currentViewMode === 'BLOCK_CONTEXT'
                  ? 'bg-railway-forest text-white shadow-xs'
                  : 'text-railway-textSecondary hover:bg-neutral-100 hover:text-railway-textPrimary'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Active Block Context</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-700/30 text-emerald-200">
                {userContextItems.length}
              </span>
            </button>
          )}

          {/* Planning Office Desk */}
          <button
            onClick={() => setActiveChannelType('PLANNING')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-2 ${
              currentViewMode === 'PLANNING_DESK'
                ? 'bg-railway-forest text-white shadow-xs'
                : 'text-railway-textSecondary hover:bg-neutral-100 hover:text-railway-textPrimary'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Planning Office</span>
            {(planningConv?.unreadCount || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-red-100 text-red-800 border border-red-300">
                {planningConv?.unreadCount}
              </span>
            )}
          </button>

          {/* Control Office Desk */}
          <button
            onClick={() => setActiveChannelType('CONTROL')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-2 ${
              currentViewMode === 'CONTROL_DESK'
                ? 'bg-railway-forest text-white shadow-xs'
                : 'text-railway-textSecondary hover:bg-neutral-100 hover:text-railway-textPrimary'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Control Office</span>
            {(controlConv?.unreadCount || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-red-100 text-red-800 border border-red-300">
                {controlConv?.unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* User Identity & Department Tag */}
        <div className="flex items-center space-x-2 text-xs font-mono text-railway-textMuted px-3">
          <span>CONSOLE:</span>
          <strong className="text-railway-textPrimary">{currentUser.name}</strong>
          <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-bold border border-neutral-200 uppercase">
            {currentUser.role}
          </span>
        </div>
      </div>

      {/* ── 3. STATE A: NO ACTIVE CONTEXT LANDING SCREEN (Prompt Section 6) ── */}
      {currentViewMode === 'STATE_A_HOME' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-railway-border p-6 shadow-xs space-y-2">
            <div className="flex items-center space-x-2 font-mono text-xs text-railway-textMuted uppercase font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Standard Operational Channels</span>
            </div>
            <h2 className="text-xl font-bold text-railway-textPrimary">
              Divisional Operational Desks
            </h2>
            <p className="text-xs text-railway-textSecondary max-w-2xl leading-relaxed">
              No active maintenance requirement or assigned block is currently selected in your session context. You can submit formal operational queries directly to the <strong>Divisional Planning Office</strong> or <strong>Divisional Train Control Desk</strong> below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Desk Card 1: Planning Office */}
            <div className="bg-white rounded-3xl border border-railway-border p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-800 flex items-center justify-center border border-purple-200">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded font-bold border border-purple-300">
                    PLANNING OFFICE
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-railway-textPrimary">
                    Planning & Scheduling Coordination
                  </h3>
                  <p className="text-xs text-railway-textSecondary leading-relaxed">
                    Submit questions regarding maintenance planning, candidate block windows, preferred timings, alternative optimization windows, and multi-departmental coordination.
                  </p>
                </div>

                <div className="text-xs font-mono text-railway-textMuted space-y-1 border-t border-railway-border pt-3">
                  <div>Officer: <strong>M. K. Rao (Sr. DOM / Planning)</strong></div>
                  <div>Jurisdiction: <strong>Vijayawada Division (BZA)</strong></div>
                  <div>Channel Status: <strong className="text-emerald-700">Active (Standard Operating Protocol)</strong></div>
                </div>
              </div>

              <button
                onClick={() => setActiveChannelType('PLANNING')}
                className="w-full py-3 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white text-xs font-bold transition shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>OPEN CONVERSATION</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Desk Card 2: Control Office */}
            <div className="bg-white rounded-3xl border border-railway-border p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-800 flex items-center justify-center border border-red-200">
                    <Radio className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-red-100 text-red-900 px-2.5 py-0.5 rounded font-bold border border-red-300">
                    CONTROL OFFICE
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-railway-textPrimary">
                    Operational & Train Movement Queries
                  </h3>
                  <p className="text-xs text-railway-textSecondary leading-relaxed">
                    Submit queries regarding live train movements, headway restrictions, corridor traffic density, timetable conflicts, and dynamic rescheduling for active sections.
                  </p>
                </div>

                <div className="text-xs font-mono text-railway-textMuted space-y-1 border-t border-railway-border pt-3">
                  <div>Controller: <strong>P. Murthy / Section Controller</strong></div>
                  <div>Corridor: <strong>BZA – GNT – TEL Mainlines</strong></div>
                  <div>Channel Status: <strong className="text-emerald-700">Online · Live RailRadar Link</strong></div>
                </div>
              </div>

              <button
                onClick={() => setActiveChannelType('CONTROL')}
                className="w-full py-3 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white text-xs font-bold transition shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>OPEN CONVERSATION</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 4. STATE B: CONTEXT-AWARE BLOCK COMMUNICATION (Prompt Sections 7, 8, 16) ── */}
      {currentViewMode === 'BLOCK_CONTEXT' && effectiveContextReq && (
        <div className="space-y-4">
          
          {/* Compact Block Context Header (Prompt Section 16) */}
          <div className="rounded-3xl bg-white border border-railway-border p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-railway-border pb-4">
              <div className="flex items-center space-x-3">
                <span className="font-mono font-bold text-lg text-railway-forest">
                  {effectiveContextReq.blockMemoNumber || effectiveContextReq.id}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                  effectiveContextReq.department === 'P.Way' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                  effectiveContextReq.department === 'S&T' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                  'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {effectiveContextReq.department}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                  {effectiveContextReq.status}
                </span>
                {effectiveContextReq.conflict && !effectiveContextReq.conflict.isResolved && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-100 text-red-900 border border-red-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                    <span>TRAIN CONFLICT</span>
                  </span>
                )}
              </div>

              {/* Context Selector Dropdown if multiple requisitions/blocks exist */}
              {userContextItems.length > 1 && (
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-railway-textMuted">SWITCH CONTEXT:</span>
                  <select
                    value={effectiveContextReq.id}
                    onChange={(e) => setSelectedReqOrBlockId(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-railway-canvas border border-railway-border text-xs font-bold text-railway-textPrimary focus:outline-none"
                  >
                    {userContextItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.blockMemoNumber || item.id} ({item.department} · {item.section})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Metadata Badges: Section, KM range, Time Window, Participants */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-2xl bg-railway-canvas border border-railway-border">
                <span className="text-[10px] text-neutral-400 uppercase block">Corridor Section</span>
                <strong className="text-railway-textPrimary text-sm">{effectiveContextReq.section}</strong>
                <span className="text-[10px] text-emerald-800 block truncate">
                  {effectiveContextReq.stationName || 'Mangalagiri'} ({effectiveContextReq.stationCode || 'MAG'})
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-railway-canvas border border-railway-border">
                <span className="text-[10px] text-neutral-400 uppercase block">KM Chainage</span>
                <strong className="text-railway-textPrimary text-sm">
                  {effectiveContextReq.startLocation} – {effectiveContextReq.endLocation}
                </strong>
                <span className="text-[10px] text-neutral-500 block truncate">
                  {effectiveContextReq.affectedTracks?.join(', ') || 'UP Main'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-railway-canvas border border-railway-border">
                <span className="text-[10px] text-neutral-400 uppercase block">Possession Window</span>
                <strong className="text-railway-forest text-sm">
                  {effectiveContextReq.allocatedWindow 
                    ? `${effectiveContextReq.allocatedWindow.startTime} – ${effectiveContextReq.allocatedWindow.endTime}` 
                    : effectiveContextReq.preferredTime || '02:00 – 04:00'} IST
                </strong>
                <span className="text-[10px] text-neutral-500 block">
                  Duration: {effectiveContextReq.duration} min
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-railway-canvas border border-railway-border">
                <span className="text-[10px] text-neutral-400 uppercase block">Authorized Roles</span>
                <div className="text-[11px] font-bold text-neutral-800 truncate">
                  {effectiveContextReq.department} · Planning · Control
                </div>
                <span className="text-[10px] text-emerald-700 block">
                  RBAC Verified Channel
                </span>
              </div>
            </div>

            {/* Operational Quick Actions (Prompt Section 13) */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold mr-1">
                Operational Actions:
              </span>
              <button
                type="button"
                onClick={() => handleQuickAction('CLARIFICATION')}
                className="px-3 py-1.5 rounded-full bg-white border border-railway-border hover:bg-neutral-50 text-xs font-semibold text-railway-textPrimary transition cursor-pointer"
              >
                Request Planning Clarification
              </button>
              <button
                type="button"
                onClick={() => handleQuickAction('CONTROL_REVIEW')}
                className="px-3 py-1.5 rounded-full bg-white border border-railway-border hover:bg-neutral-50 text-xs font-semibold text-railway-textPrimary transition cursor-pointer"
              >
                Request Control Review
              </button>
              <button
                type="button"
                onClick={() => handleQuickAction('ALTERNATIVE_WINDOW')}
                className="px-3 py-1.5 rounded-full bg-white border border-railway-border hover:bg-neutral-50 text-xs font-semibold text-railway-textPrimary transition cursor-pointer"
              >
                Request Alternative Window
              </button>
              <button
                type="button"
                onClick={() => handleQuickAction('NOTIFY_DEPT')}
                className="px-3 py-1.5 rounded-full bg-white border border-railway-border hover:bg-neutral-50 text-xs font-semibold text-railway-textPrimary transition cursor-pointer"
              >
                Notify Departments
              </button>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('planning')}
                  className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold text-emerald-900 transition cursor-pointer ml-auto"
                >
                  View in Planning Engine →
                </button>
              )}
            </div>
          </div>

          {/* Conversation Log & Message Input */}
          <div className="bg-white rounded-3xl border border-railway-border overflow-hidden shadow-xs flex flex-col h-[520px]">
            
            {/* Viewport Header */}
            <div className="px-6 py-3 bg-railway-canvas border-b border-railway-border flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-railway-textPrimary">
                  LIVE OPERATIONAL COORDINATION CHANNEL
                </span>
                <span className="text-neutral-400">·</span>
                <span className="text-neutral-500">
                  {effectiveContextReq.blockMemoNumber || effectiveContextReq.id}
                </span>
              </div>
              <span className="text-[10px] text-neutral-400">
                G&SR Chapter XV Rule Compliant
              </span>
            </div>

            {/* Messages Viewport */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {!isAuthorizedForBlock ? (
                <div className="p-8 text-center text-xs font-mono space-y-3 bg-red-50/60 border border-red-200 rounded-2xl m-4">
                  <Lock className="w-8 h-8 text-red-600 mx-auto" />
                  <div className="font-bold text-red-900 text-sm">
                    RESTRICTED OPERATIONAL CHANNEL
                  </div>
                  <p className="text-red-800 leading-relaxed max-w-sm mx-auto">
                    Your current role (<strong>{currentUser.role} · {currentUser.department}</strong>) does not have permission to view or participate in this operational channel.
                  </p>
                </div>
              ) : (
                <>
                  {(!currentBlockConv?.messages || currentBlockConv.messages.length === 0) ? (
                    <div className="py-16 text-center text-xs text-neutral-400 font-mono space-y-2">
                      <MessageSquare className="w-8 h-8 text-neutral-300 mx-auto" />
                      <div>Channel initialized for {effectiveContextReq.id}. Send a message to coordinate with participating officers.</div>
                    </div>
                  ) : (
                    currentBlockConv.messages.map((msg) => {
                      const isCurrentUser = msg.senderName === currentUser.name;

                      if (msg.isSystemMessage) {
                        return (
                          <div 
                            key={msg.id} 
                            className="p-4 rounded-2xl bg-neutral-900 text-white border border-neutral-700 space-y-1.5 shadow-xs font-mono text-xs"
                          >
                            <div className="flex items-center justify-between border-b border-white/10 pb-1 text-[10px]">
                              <span className="text-emerald-400 font-bold uppercase">
                                {msg.systemMessageType || 'OPERATIONAL ADVISORY'}
                              </span>
                              <span className="text-neutral-400">{msg.timestamp}</span>
                            </div>
                            <p className="text-[11px] text-neutral-200 font-sans leading-relaxed">
                              {msg.text}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={msg.id} 
                          className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center space-x-1.5 text-[10px] font-mono text-neutral-400 mb-1 px-1">
                            <span className="font-bold text-railway-textPrimary">{msg.senderName}</span>
                            <span>·</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-neutral-100 text-neutral-700">
                              {msg.senderDepartment}
                            </span>
                            <span>·</span>
                            <span className="text-neutral-500 font-semibold">{msg.senderRole}</span>
                            <span>·</span>
                            <span>{msg.timestamp}</span>
                          </div>

                          <div className={`p-3.5 rounded-2xl text-xs max-w-lg leading-relaxed shadow-xs ${
                            isCurrentUser 
                              ? 'bg-railway-forest text-white rounded-tr-xs' 
                              : 'bg-railway-canvas border border-railway-border text-railway-textPrimary rounded-tl-xs'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Bar */}
            {isAuthorizedForBlock && (
              <form onSubmit={handleSendBlockMsg} className="p-4 border-t border-railway-border bg-white flex items-center space-x-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Submit operational note for ${effectiveContextReq.blockMemoNumber || effectiveContextReq.id}...`}
                  className="flex-1 px-4 py-3 rounded-full bg-railway-canvas border border-railway-border text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="px-6 py-3 rounded-full bg-railway-forest hover:bg-railway-forestDark disabled:opacity-40 text-white font-bold text-xs shadow-xs transition flex items-center space-x-2 cursor-pointer"
                >
                  <span>SEND</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ── 5. PLANNING OFFICE DESK VIEW (Prompt Section 14) ── */}
      {currentViewMode === 'PLANNING_DESK' && (
        <div className="space-y-6">
          
          <div className="bg-white rounded-3xl border border-railway-border p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-railway-border pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-800 flex items-center justify-center border border-purple-200">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-railway-textPrimary">
                    Divisional Planning Office Desk
                  </h2>
                  <p className="text-xs text-neutral-500 font-mono">
                    Officer In-Charge: M. K. Rao (Sr. DOM / Planning) · BZA Operating Office
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-300 font-bold">
                PLANNING CHANNEL
              </span>
            </div>

            {/* Planning Query Form */}
            <form onSubmit={handleSendPlanningQuerySubmit} className="space-y-3 font-mono text-xs">
              <div className="text-[11px] font-bold text-railway-textPrimary uppercase">
                Submit Formal Operational Planning Query
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-neutral-500 uppercase block mb-1">Target Requisition / Block</label>
                  <select
                    value={planReqId}
                    onChange={(e) => setPlanReqId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-railway-canvas border border-railway-border text-xs"
                  >
                    <option value="">General Planning Query...</option>
                    {state.requests.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.id} ({r.department} · {r.section} · {r.work})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-500 uppercase block mb-1">Query Subject / Category</label>
                  <select
                    value={planTopic}
                    onChange={(e) => setPlanTopic(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-railway-canvas border border-railway-border text-xs"
                  >
                    <option>Preferred Window Discussion</option>
                    <option>Maintenance Scheduling Clarification</option>
                    <option>Alternative Window Request</option>
                    <option>Multi-Department Coordination Request</option>
                    <option>Planning Rejection Clarification</option>
                    <option>Recommendation Clarification</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-neutral-500 uppercase block mb-1">Operational Inquiry</label>
                <textarea
                  rows={3}
                  value={planQueryText}
                  onChange={(e) => setPlanQueryText(e.target.value)}
                  placeholder="e.g. Requesting scheduling clarification for the 02:00–04:00 window due to machine availability..."
                  className="w-full px-4 py-3 rounded-2xl bg-railway-canvas border border-railway-border text-xs font-sans text-railway-textPrimary focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!planQueryText.trim()}
                  className="px-6 py-2.5 rounded-full bg-railway-forest hover:bg-railway-forestDark disabled:opacity-40 text-white font-bold text-xs shadow-xs transition"
                >
                  Send Query to Planning Desk
                </button>
              </div>
            </form>
          </div>

          {/* Historical Planning Queries Log */}
          <div className="bg-white rounded-3xl border border-railway-border p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-railway-border pb-3">
              <span className="text-xs font-mono font-bold uppercase text-railway-textPrimary">
                Chronological Planning Queries Log
              </span>
              <span className="text-xs font-mono text-neutral-400">
                {(planningConv?.messages || []).length} Records
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {(planningConv?.messages || []).map((msg) => (
                <div key={msg.id} className="p-4 rounded-2xl bg-railway-canvas border border-railway-border space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between border-b border-railway-border pb-1.5 text-[10px]">
                    <div className="flex items-center space-x-2">
                      <strong className="text-railway-forest">{msg.senderName}</strong>
                      <span className="text-neutral-400">·</span>
                      <span className="text-neutral-600">{msg.senderRole}</span>
                    </div>
                    <span className="text-neutral-400">{msg.timestamp}</span>
                  </div>
                  {msg.topicOrIssue && (
                    <div className="inline-block text-[10px] font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded">
                      {msg.topicOrIssue} {msg.requestId ? `· ${msg.requestId}` : ''}
                    </div>
                  )}
                  <p className="text-neutral-800 font-sans leading-relaxed pt-1">
                    {msg.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── 6. CONTROL OFFICE DESK VIEW (Prompt Section 15) ── */}
      {currentViewMode === 'CONTROL_DESK' && (
        <div className="space-y-6">
          
          <div className="bg-white rounded-3xl border border-railway-border p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-railway-border pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-red-50 text-red-800 flex items-center justify-center border border-red-200">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-railway-textPrimary">
                    Divisional Train Control Desk
                  </h2>
                  <p className="text-xs text-neutral-500 font-mono">
                    Chief Controller: P. Murthy / Section Controller · BZA Central Control Room
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-red-100 text-red-900 border border-red-300 font-bold">
                OPERATING CONTROL CHANNEL
              </span>
            </div>

            {/* Control Query Form */}
            <form onSubmit={handleSendControlQuerySubmit} className="space-y-3 font-mono text-xs">
              <div className="text-[11px] font-bold text-railway-textPrimary uppercase">
                Submit Operational Query to Train Control
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-neutral-500 uppercase block mb-1">Affected Section / Block</label>
                  <select
                    value={ctrlBlockId}
                    onChange={(e) => setCtrlBlockId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-railway-canvas border border-railway-border text-xs"
                  >
                    <option value="SEC-A">Section SEC-A (Vijayawada – Mangalagiri)</option>
                    <option value="SEC-B">Section SEC-B (Mangalagiri – Guntur Jn)</option>
                    <option value="SEC-C">Section SEC-C (Guntur Jn – Tenali Jn)</option>
                    {state.requests.map(r => (
                      <option key={r.id} value={r.blockMemoNumber || r.id}>
                        {r.blockMemoNumber || r.id} ({r.section} · {r.work})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-500 uppercase block mb-1">Operational Subject</label>
                  <select
                    value={ctrlIssue}
                    onChange={(e) => setCtrlIssue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-railway-canvas border border-railway-border text-xs"
                  >
                    <option>Train Movement Conflict</option>
                    <option>Operational Restrictions</option>
                    <option>Corridor Availability</option>
                    <option>Timetable Concerns</option>
                    <option>Headway Concerns</option>
                    <option>Live Operational Changes</option>
                    <option>Block Timing Clarification</option>
                    <option>Rescheduling Due to Train Movement</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-neutral-500 uppercase block mb-1">Operational Query Details</label>
                <textarea
                  rows={3}
                  value={ctrlQueryText}
                  onChange={(e) => setCtrlQueryText(e.target.value)}
                  placeholder="e.g. Inquiring regarding traffic density between 02:00 and 04:00 on SEC-A due to incoming freight movement..."
                  className="w-full px-4 py-3 rounded-2xl bg-railway-canvas border border-railway-border text-xs font-sans text-railway-textPrimary focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!ctrlQueryText.trim()}
                  className="px-6 py-2.5 rounded-full bg-railway-forest hover:bg-railway-forestDark disabled:opacity-40 text-white font-bold text-xs shadow-xs transition"
                >
                  Send Query to Control Desk
                </button>
              </div>
            </form>
          </div>

          {/* Historical Control Queries Log */}
          <div className="bg-white rounded-3xl border border-railway-border p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-railway-border pb-3">
              <span className="text-xs font-mono font-bold uppercase text-railway-textPrimary">
                Chronological Control Desk Log
              </span>
              <span className="text-xs font-mono text-neutral-400">
                {(controlConv?.messages || []).length} Records
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {(controlConv?.messages || []).map((msg) => (
                <div key={msg.id} className="p-4 rounded-2xl bg-railway-canvas border border-railway-border space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between border-b border-railway-border pb-1.5 text-[10px]">
                    <div className="flex items-center space-x-2">
                      <strong className="text-red-900">{msg.senderName}</strong>
                      <span className="text-neutral-400">·</span>
                      <span className="text-neutral-600">{msg.senderRole}</span>
                    </div>
                    <span className="text-neutral-400">{msg.timestamp}</span>
                  </div>
                  {msg.topicOrIssue && (
                    <div className="inline-block text-[10px] font-bold text-red-900 bg-red-100 px-2 py-0.5 rounded">
                      {msg.topicOrIssue} {msg.blockId ? `· ${msg.blockId}` : ''}
                    </div>
                  )}
                  <p className="text-neutral-800 font-sans leading-relaxed pt-1">
                    {msg.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
