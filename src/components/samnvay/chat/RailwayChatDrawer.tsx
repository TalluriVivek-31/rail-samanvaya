// Railway-Aware Contextual Communication Drawer
// Indian Railways · Operational Decision Support Communication
// Enforces:
// 1. Contextual Block Communication (tied strictly to Requisition / Block)
// 2. Planning Office Operational Queries (topics: preferred window, scheduling, coordination)
// 3. Control Office Operational Queries (issues: train conflict, headway, corridor availability)
// 4. Strict RBAC: Unrelated users cannot access block conversations.
// 5. Operating Invariant: Chat is for operational records only; NEVER authorizes or schedules blocks.

import React, { useState, useRef, useEffect } from 'react';
import { useSamnvayStore } from '../../../store/useSamnvayStore';
import { 
  X, 
  Send, 
  Layers, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  Radio, 
  Train, 
  FileText, 
  Building2, 
  Compass, 
  Lock,
  ChevronDown
} from 'lucide-react';
import { ChatMessage, Department, UserRole } from '../../../types/samnvay';

export const RailwayChatDrawer: React.FC = () => {
  const { 
    state, 
    closeChat, 
    openChat, 
    sendChatMessage, 
    openBlockCommunication,
    sendPlanningOfficeQuery, 
    sendControlOfficeQuery 
  } = useSamnvayStore();

  // Drawer Channel Tabs: 'BLOCK' | 'PLANNING' | 'CONTROL'
  const [activeTab, setActiveTab] = useState<'BLOCK' | 'PLANNING' | 'CONTROL'>('BLOCK');
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Planning Office Query Form States
  const [planReqId, setPlanReqId] = useState('');
  const [planTopic, setPlanTopic] = useState('Preferred Window Discussion');
  const [planMessage, setPlanMessage] = useState('');

  // Control Office Query Form States
  const [ctrlBlockId, setCtrlBlockId] = useState('');
  const [ctrlIssue, setCtrlIssue] = useState('Train Movement Conflict');
  const [ctrlMessage, setCtrlMessage] = useState('');

  // Determine active conversation based on selected tab or activeConversationId
  const planningConv = state.conversations.find(c => c.type === 'PLANNING_OFFICE_QUERY') || state.conversations.find(c => c.id === 'conv-planning-desk');
  const controlConv = state.conversations.find(c => c.type === 'CONTROL_OFFICE_QUERY') || state.conversations.find(c => c.id === 'conv-control-desk');
  
  // Find current block conversation
  const blockConversations = state.conversations.filter(c => c.type === 'BLOCK_COMMUNICATION' || c.blockId || c.requestId);
  
  // If activeConversationId matches a block conversation, set it as default
  const activeConvFromStore = state.conversations.find(c => c.id === state.activeConversationId);

  useEffect(() => {
    if (activeConvFromStore) {
      if (activeConvFromStore.type === 'PLANNING_OFFICE_QUERY') {
        setActiveTab('PLANNING');
      } else if (activeConvFromStore.type === 'CONTROL_OFFICE_QUERY') {
        setActiveTab('CONTROL');
      } else {
        setActiveTab('BLOCK');
        setSelectedBlockId(activeConvFromStore.blockId || activeConvFromStore.requestId || activeConvFromStore.id);
      }
    } else if (blockConversations.length > 0 && !selectedBlockId) {
      setSelectedBlockId(blockConversations[0].blockId || blockConversations[0].requestId || blockConversations[0].id);
    }
  }, [state.activeConversationId, activeConvFromStore, blockConversations.length]);

  // Find currently active block data
  const currentBlockReq = state.requests.find(r => 
    r.id === selectedBlockId || 
    r.blockMemoNumber === selectedBlockId
  ) || state.requests[0];

  const currentBlockConv = state.conversations.find(c => 
    c.id === state.activeConversationId && c.type === 'BLOCK_COMMUNICATION'
  ) || state.conversations.find(c => 
    (c.blockId && c.blockId === selectedBlockId) || 
    (c.requestId && c.requestId === selectedBlockId)
  ) || blockConversations[0];

  // RBAC Participant Authorization Check for Block Communication
  const currentUser = state.currentUser;
  const isMaster = currentUser.role === 'MASTER';
  const isPlanningOfficer = currentUser.role === 'Planning Officer';
  const isControlOfficer = currentUser.role === 'COA / Operations' || currentUser.role === 'Section Controller';
  const isDirectDepartment = currentBlockReq && (
    currentBlockReq.department === currentUser.department ||
    currentBlockReq.engineer === currentUser.name
  );
  const isCoordinatingDepartment = currentBlockReq?.spatialOverlapWith?.length ? true : false;

  const isUserAuthorizedForBlock = isMaster || isPlanningOfficer || isControlOfficer || isDirectDepartment || isCoordinatingDepartment;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentBlockConv?.messages, planningConv?.messages, controlConv?.messages, activeTab]);

  if (!state.isChatDrawerOpen) return null;

  // Handle message send within Block Communication
  const handleSendBlockMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    if (currentBlockConv) {
      sendChatMessage(currentBlockConv.id, inputText.trim());
    } else if (currentBlockReq) {
      openBlockCommunication(currentBlockReq.id);
      // Wait a tick or let store create conversation
      setTimeout(() => {
        const found = state.conversations.find(c => c.requestId === currentBlockReq.id || c.blockId === currentBlockReq.id);
        if (found) {
          sendChatMessage(found.id, inputText.trim());
        }
      }, 50);
    }
    setInputText('');
  };

  // Handle Planning Office Query Submission
  const handleSendPlanningQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planMessage.trim()) return;
    const reqId = planReqId.trim() || currentBlockReq?.id || 'GENERAL';
    sendPlanningOfficeQuery(reqId, planTopic, planMessage.trim());
    setPlanMessage('');
  };

  // Handle Control Office Query Submission
  const handleSendControlQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctrlMessage.trim()) return;
    const blkId = ctrlBlockId.trim() || currentBlockReq?.blockMemoNumber || currentBlockReq?.id || 'SEC-A';
    sendControlOfficeQuery(blkId, ctrlIssue, ctrlMessage.trim());
    setCtrlMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white border-l border-railway-border h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header: Operational Title & Close */}
        <div className="px-6 py-4 border-b border-railway-border bg-railway-canvas/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-railway-forest text-white flex items-center justify-center font-bold shadow-xs">
              <Compass className="w-5 h-5 text-railway-signalGreenLight" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-railway-textPrimary tracking-tight">
                  Operational Communication
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-railway-forest/10 text-railway-forest uppercase">
                  BZA DIVISION
                </span>
              </div>
              <p className="text-[10px] font-mono text-railway-textMuted uppercase">
                CONTEXT-BOUND COORDINATION & DESK QUERIES
              </p>
            </div>
          </div>

          <button
            onClick={closeChat}
            className="w-8 h-8 rounded-full bg-white hover:bg-neutral-100 border border-railway-border flex items-center justify-center text-railway-textSecondary hover:text-railway-textPrimary transition cursor-pointer"
            title="Close communication drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Operating Safety Protocol Notice Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-start space-x-2 text-[11px] text-amber-950 font-sans">
          <ShieldAlert className="w-4 h-4 text-railway-safetyAmber flex-shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong>Operating Protocol:</strong> Communication is for operational coordination and clarification only. Chat messages <strong>NEVER</strong> authorize, schedule, modify, or release a block. Official block memos require authorized officer sign-off in the planning workflow.
          </p>
        </div>

        {/* Channel Mode Selector Tabs */}
        <div className="px-5 py-2.5 border-b border-railway-border bg-white flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('BLOCK')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'BLOCK'
                ? 'bg-railway-forest text-white shadow-xs'
                : 'bg-railway-canvas border border-railway-border text-railway-textSecondary hover:bg-neutral-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Block Communication</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('PLANNING');
              if (planningConv) openChat(planningConv.id);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'PLANNING'
                ? 'bg-railway-forest text-white shadow-xs'
                : 'bg-railway-canvas border border-railway-border text-railway-textSecondary hover:bg-neutral-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Planning Office</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('CONTROL');
              if (controlConv) openChat(controlConv.id);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'CONTROL'
                ? 'bg-railway-forest text-white shadow-xs'
                : 'bg-railway-canvas border border-railway-border text-railway-textSecondary hover:bg-neutral-100'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Control Office</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: CONTEXTUAL BLOCK COMMUNICATION                               */}
        {/* =================================================================== */}
        {activeTab === 'BLOCK' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Block Context Selector & Meta Header */}
            {state.requests.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-neutral-500 space-y-2">
                <div className="w-12 h-12 rounded-full bg-neutral-100 mx-auto flex items-center justify-center text-neutral-400">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="font-bold text-neutral-700">No Block Context Available</div>
                <p className="max-w-xs mx-auto text-neutral-400 text-[11px]">
                  Submit a maintenance requirement or query an operational desk to initiate communication.
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={() => setActiveTab('PLANNING')}
                    className="px-3 py-1.5 rounded-full bg-railway-canvas border border-railway-border text-xs font-semibold text-railway-forest hover:bg-emerald-50"
                  >
                    Contact Planning Office
                  </button>
                  <button
                    onClick={() => setActiveTab('CONTROL')}
                    className="px-3 py-1.5 rounded-full bg-railway-canvas border border-railway-border text-xs font-semibold text-railway-forest hover:bg-emerald-50"
                  >
                    Contact Control Office
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Active Context Card at Top */}
                <div className="p-4 bg-railway-canvas border-b border-railway-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-railway-forest bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      BLOCK CONTEXT
                    </span>

                    {/* Block Switcher Dropdown */}
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-mono text-neutral-500">Switch Context:</span>
                      <select
                        value={selectedBlockId}
                        onChange={(e) => {
                          setSelectedBlockId(e.target.value);
                          openBlockCommunication(e.target.value);
                        }}
                        className="text-xs font-mono font-bold bg-white border border-railway-border rounded-lg px-2 py-1 focus:outline-none"
                      >
                        {state.requests.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.blockMemoNumber ? `${r.blockMemoNumber} (${r.id})` : r.id} · {r.department}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Context Details Grid (Prompt Section 8 Specification) */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="p-2.5 rounded-xl bg-white border border-railway-border">
                      <span className="text-[9px] text-neutral-400 uppercase block">Block / Requisition</span>
                      <span className="font-bold text-railway-forest">
                        {currentBlockReq?.blockMemoNumber || currentBlockReq?.id || 'BLK-2026-0012'}
                      </span>
                      <span className="text-[10px] text-neutral-500 block truncate">
                        {currentBlockReq?.work}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-railway-border">
                      <span className="text-[9px] text-neutral-400 uppercase block">Corridor & Section</span>
                      <span className="font-bold text-neutral-800">
                        {currentBlockReq?.section || 'SEC-A'}
                      </span>
                      <span className="text-[10px] text-neutral-500 block truncate">
                        Vijayawada – Guntur – Tenali
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-railway-border">
                      <span className="text-[9px] text-neutral-400 uppercase block">Location</span>
                      <span className="font-bold text-neutral-800">
                        {currentBlockReq?.startLocation} – {currentBlockReq?.endLocation}
                      </span>
                      <span className="text-[10px] text-emerald-800 block truncate">
                        {currentBlockReq?.affectedTracks?.join(', ') || 'UP Main'} · {currentBlockReq?.stationName || 'Station'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-railway-border">
                      <span className="text-[9px] text-neutral-400 uppercase block">Time & Status</span>
                      <span className="font-bold text-neutral-800">
                        {currentBlockReq?.allocatedWindow 
                          ? `${currentBlockReq.allocatedWindow.startTime}–${currentBlockReq.allocatedWindow.endTime}` 
                          : currentBlockReq?.preferredTime || '02:10–04:10'} IST
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 block">
                        STATUS: {currentBlockReq?.status || 'Scheduled'}
                      </span>
                    </div>
                  </div>

                  {/* Authorized Participants Strip */}
                  <div className="text-[10px] font-mono text-neutral-500 flex items-center justify-between pt-1">
                    <span>Authorized Participants:</span>
                    <span className="font-bold text-neutral-700">
                      {currentBlockReq?.department} Engg · Planning Officer · Section Controller
                    </span>
                  </div>
                </div>

                {/* Messages Viewport */}
                <div className="flex-1 p-5 overflow-y-auto space-y-3.5 select-text">
                  {!isUserAuthorizedForBlock ? (
                    /* Strict RBAC Access Restricted Guard */
                    <div className="p-8 text-center text-xs font-mono space-y-3 bg-red-50/60 border border-red-200 rounded-2xl m-4">
                      <Lock className="w-8 h-8 text-red-600 mx-auto" />
                      <div className="font-bold text-red-900 text-sm">
                        RESTRICTED OPERATIONAL CHANNEL
                      </div>
                      <p className="text-red-800 leading-relaxed max-w-sm mx-auto">
                        Your user role (<strong>{currentUser.role} · {currentUser.department}</strong>) is not an authorized participant for this specific block possession.
                      </p>
                      <p className="text-neutral-500 text-[11px]">
                        Only assigned departmental engineers ({currentBlockReq?.department}), planning officers, and train controllers are granted operational channel access.
                      </p>
                    </div>
                  ) : (
                    <>
                      {(currentBlockConv?.messages || []).length === 0 ? (
                        <div className="py-12 text-center text-xs text-neutral-400 font-mono">
                          Operational channel active for {currentBlockReq?.id}. Type below to coordinate.
                        </div>
                      ) : (
                        currentBlockConv!.messages!.map((msg) => {
                          const isCurrentUser = msg.senderName === currentUser.name;

                          if (msg.isSystemMessage) {
                            return (
                              <div 
                                key={msg.id} 
                                className="p-3.5 rounded-2xl bg-neutral-900 text-white border border-neutral-700 space-y-1.5 shadow-xs font-mono text-xs select-text"
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
                              className={`flex flex-col select-text ${isCurrentUser ? 'items-end' : 'items-start'}`}
                            >
                              <div className="flex items-center space-x-1.5 text-[10px] font-mono text-neutral-400 mb-1 px-1">
                                <span className="font-bold text-railway-textPrimary">{msg.senderName}</span>
                                <span>·</span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-neutral-100 text-neutral-700">
                                  {msg.senderDepartment}
                                </span>
                                <span>·</span>
                                <span>{msg.timestamp}</span>
                              </div>

                              <div className={`p-3 rounded-2xl text-xs max-w-sm leading-relaxed shadow-xs ${
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

                {/* Input Area (Visible only if authorized) */}
                {isUserAuthorizedForBlock && (
                  <form onSubmit={handleSendBlockMessage} className="p-3.5 border-t border-railway-border bg-white flex items-center space-x-2">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={`Coordinate for ${currentBlockReq?.id || 'Block'}...`}
                      className="flex-1 px-4 py-2.5 rounded-full bg-railway-canvas border border-railway-border text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="w-10 h-10 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white flex items-center justify-center transition disabled:opacity-40 cursor-pointer shadow-xs"
                      title="Send message to block participants"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: PLANNING OFFICE OPERATIONAL QUERIES (Prompt Section 6)       */}
        {/* =================================================================== */}
        {activeTab === 'PLANNING' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Planning Desk Header Box */}
            <div className="p-4 bg-railway-canvas border-b border-railway-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-800 bg-purple-100 px-2 py-0.5 rounded border border-purple-300">
                  DIVISIONAL PLANNING OFFICE DESK
                </span>
                <span className="text-xs font-mono text-neutral-500">M. K. Rao (Planning Officer)</span>
              </div>
              <p className="text-xs text-neutral-600 font-sans">
                Official operational channel for scheduling clarifications, preferred time discussions, alternative windows, and recommendation queries.
              </p>
            </div>

            {/* Query Form */}
            <form onSubmit={handleSendPlanningQuery} className="p-4 bg-white border-b border-railway-border space-y-3 font-mono text-xs">
              <div className="text-[11px] font-bold text-railway-textPrimary uppercase">
                Submit Operational Planning Query
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-neutral-500 uppercase block mb-1">Requisition ID</label>
                  <select
                    value={planReqId}
                    onChange={(e) => setPlanReqId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-railway-canvas border border-railway-border text-xs"
                  >
                    <option value="">Select Requisition...</option>
                    {state.requests.map(r => (
                      <option key={r.id} value={r.id}>{r.id} ({r.department} · {r.section})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-500 uppercase block mb-1">Topic</label>
                  <select
                    value={planTopic}
                    onChange={(e) => setPlanTopic(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-railway-canvas border border-railway-border text-xs"
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
                <label className="text-[10px] text-neutral-500 uppercase block mb-1">Operational Message</label>
                <textarea
                  rows={2}
                  value={planMessage}
                  onChange={(e) => setPlanMessage(e.target.value)}
                  placeholder="e.g. Requesting consideration of the 02:00–04:00 preferred maintenance window..."
                  className="w-full px-3 py-2 rounded-xl bg-railway-canvas border border-railway-border text-xs font-sans text-railway-textPrimary focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!planMessage.trim()}
                  className="px-5 py-2 rounded-full bg-railway-forest hover:bg-railway-forestDark disabled:opacity-40 text-white font-semibold text-xs shadow-xs transition"
                >
                  Send Operational Query
                </button>
              </div>
            </form>

            {/* Historical Queries Log */}
            <div className="flex-1 p-5 overflow-y-auto space-y-3 select-text">
              <div className="text-[10px] font-mono uppercase text-neutral-400 font-bold mb-2">
                Operational Queries Log · Planning Desk
              </div>
              {(planningConv?.messages || []).map((msg) => (
                <div key={msg.id} className="p-3.5 rounded-2xl bg-railway-canvas border border-railway-border space-y-1 text-xs font-mono select-text">
                  <div className="flex items-center justify-between text-[10px] border-b border-railway-border pb-1">
                    <span className="font-bold text-railway-forest">{msg.senderName} ({msg.senderRole})</span>
                    <span className="text-neutral-400">{msg.timestamp}</span>
                  </div>
                  {msg.topicOrIssue && (
                    <div className="text-[10px] font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded inline-block">
                      {msg.topicOrIssue} {msg.requestId ? `· ${msg.requestId}` : ''}
                    </div>
                  )}
                  <p className="text-neutral-800 font-sans leading-relaxed pt-1">
                    {msg.text}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: CONTROL OFFICE OPERATIONAL QUERIES (Prompt Section 7)        */}
        {/* =================================================================== */}
        {activeTab === 'CONTROL' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Control Desk Header Box */}
            <div className="p-4 bg-railway-canvas border-b border-railway-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-800 bg-red-100 px-2 py-0.5 rounded border border-red-300">
                  DIVISIONAL TRAIN CONTROL DESK
                </span>
                <span className="text-xs font-mono text-neutral-500">P. Murthy / Section Controller</span>
              </div>
              <p className="text-xs text-neutral-600 font-sans">
                Official operational channel for train movement conflicts, corridor availability, headway restrictions, and dynamic rescheduling.
              </p>
            </div>

            {/* Query Form */}
            <form onSubmit={handleSendControlQuery} className="p-4 bg-white border-b border-railway-border space-y-3 font-mono text-xs">
              <div className="text-[11px] font-bold text-railway-textPrimary uppercase">
                Submit Operational Control Query
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-neutral-500 uppercase block mb-1">Block / Section ID</label>
                  <select
                    value={ctrlBlockId}
                    onChange={(e) => setCtrlBlockId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-railway-canvas border border-railway-border text-xs"
                  >
                    <option value="SEC-A">Section SEC-A (BZA–MAG)</option>
                    <option value="SEC-B">Section SEC-B (MAG–GNT)</option>
                    <option value="SEC-C">Section SEC-C (GNT–TEL)</option>
                    {state.requests.map(r => (
                      <option key={r.id} value={r.blockMemoNumber || r.id}>
                        {r.blockMemoNumber || r.id} ({r.section})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-500 uppercase block mb-1">Issue Category</label>
                  <select
                    value={ctrlIssue}
                    onChange={(e) => setCtrlIssue(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-railway-canvas border border-railway-border text-xs"
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
                <label className="text-[10px] text-neutral-500 uppercase block mb-1">Operational Message</label>
                <textarea
                  rows={2}
                  value={ctrlMessage}
                  onChange={(e) => setCtrlMessage(e.target.value)}
                  placeholder="e.g. Train 12627 is approaching the affected section. Please review the recommended possession window..."
                  className="w-full px-3 py-2 rounded-xl bg-railway-canvas border border-railway-border text-xs font-sans text-railway-textPrimary focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!ctrlMessage.trim()}
                  className="px-5 py-2 rounded-full bg-railway-forest hover:bg-railway-forestDark disabled:opacity-40 text-white font-semibold text-xs shadow-xs transition"
                >
                  Send Operational Query
                </button>
              </div>
            </form>

            {/* Historical Queries Log */}
            <div className="flex-1 p-5 overflow-y-auto space-y-3 select-text">
              <div className="text-[10px] font-mono uppercase text-neutral-400 font-bold mb-2">
                Operational Queries Log · Control Desk
              </div>
              {(controlConv?.messages || []).map((msg) => (
                <div key={msg.id} className="p-3.5 rounded-2xl bg-railway-canvas border border-railway-border space-y-1 text-xs font-mono select-text">
                  <div className="flex items-center justify-between text-[10px] border-b border-railway-border pb-1">
                    <span className="font-bold text-red-900">{msg.senderName} ({msg.senderRole})</span>
                    <span className="text-neutral-400">{msg.timestamp}</span>
                  </div>
                  {msg.topicOrIssue && (
                    <div className="text-[10px] font-bold text-red-900 bg-red-50 px-2 py-0.5 rounded inline-block">
                      {msg.topicOrIssue} {msg.blockId ? `· ${msg.blockId}` : ''}
                    </div>
                  )}
                  <p className="text-neutral-800 font-sans leading-relaxed pt-1">
                    {msg.text}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
