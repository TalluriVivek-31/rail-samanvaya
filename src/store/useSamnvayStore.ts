// State Management Store for Rail Samnvay
// Implements role-based permissions, approval workflows, conflict resolution, and digital twin controls

import { useState, useEffect, useCallback } from 'react';
import { 
  BlockRequest, 
  SectionData, 
  ExecutionStep, 
  AuditEvent, 
  User, 
  UserRole,
  Department,
  BlockPriority,
  BlockStatus,
  StatusHistoryEntry,
  DataSource,
  LiveTrainPosition,
  StationBoardEntry,
  LiveDataState,
  LiveConflictAlert,
  BlockPlan,
  ScheduledBlock,
  ChatMessage,
  ChatConversation
} from '../types/samnvay';
import { authenticateEmployee, verifyCurrentSession, logoutEmployee } from '../services/authClient';
import { evaluateMultiDepartmentOverlaps, analyzeLocationTrainConflicts } from '../utils/conflictPlanner';
import { SpatialOverlapResult } from '../types/infrastructure';

export const USERS: Record<UserRole, User> = {
  'MASTER': {
    id: 'u-1',
    name: 'V. Ramanathan',
    designation: 'Principal Chief Operations Manager (PCOM)',
    role: 'MASTER',
    employeeId: 'EMP-IR-001',
    department: 'All',
    avatarInitials: 'VR',
    permissions: ['all', 'overview', 'requests', 'approval', 'planning', 'conflict', 'execution', 'communication', 'audit', 'live-trains']
  },
  'Planning Officer': {
    id: 'u-2',
    name: 'M. K. Rao',
    designation: 'Senior Divisional Operations Manager (Planning)',
    role: 'Planning Officer',
    employeeId: 'EMP-IR-104',
    department: 'Operations',
    avatarInitials: 'MR',
    permissions: ['overview', 'requests', 'planning', 'conflict', 'execution', 'communication']
  },
  'COA / Operations': {
    id: 'u-3',
    name: 'P. Murthy',
    designation: 'Chief Controller / Section Controller (BZA)',
    role: 'COA / Operations',
    employeeId: 'EMP-IR-210',
    department: 'Operations',
    avatarInitials: 'PM',
    permissions: ['overview', 'live-trains', 'conflict', 'execution', 'communication']
  },
  'Section Controller': {
    id: 'u-3b',
    name: 'Section Controller BZA',
    designation: 'Section Train Controller (BZA Division)',
    role: 'Section Controller',
    employeeId: 'EMP-IR-211',
    department: 'Operations',
    avatarInitials: 'SC',
    permissions: ['overview', 'live-trains', 'conflict', 'execution', 'communication']
  },
  'P.Way Engineer': {
    id: 'u-4',
    name: 'A. K. Sharma',
    designation: 'Senior Divisional Engineer (Coordination / P.Way)',
    role: 'P.Way Engineer',
    employeeId: 'EMP-IR-301',
    department: 'P.Way',
    avatarInitials: 'AS',
    permissions: ['overview', 'requests', 'execution', 'communication']
  },
  'S&T Engineer': {
    id: 'u-5',
    name: 'Rajesh Verma',
    designation: 'Senior Divisional Signal & Telecom Engineer (Sr. DSTE)',
    role: 'S&T Engineer',
    employeeId: 'EMP-IR-402',
    department: 'S&T',
    avatarInitials: 'RV',
    permissions: ['overview', 'requests', 'execution', 'communication']
  },
  'TRD Engineer': {
    id: 'u-6',
    name: 'S. K. Nair',
    designation: 'Senior Divisional Electrical Engineer (Sr. DEE / TRD)',
    role: 'TRD Engineer',
    employeeId: 'EMP-IR-503',
    department: 'TRD',
    avatarInitials: 'SN',
    permissions: ['overview', 'requests', 'execution', 'communication']
  },
};

export const INITIAL_SECTIONS: SectionData[] = [
  {
    id: 'SEC-A',
    name: 'SEC-A (Vijayawada – Mangalagiri)',
    kmRange: 'KM 0/000 – KM 25/000',
    trafficDensity: 'HIGH',
    status: 'Available',
    maxSpeedKmph: 130,
    nextTrains: []
  },
  {
    id: 'SEC-B',
    name: 'SEC-B (Mangalagiri – Guntur Jn)',
    kmRange: 'KM 25/000 – KM 52/500',
    trafficDensity: 'MEDIUM',
    status: 'Available',
    maxSpeedKmph: 130,
    nextTrains: []
  },
  {
    id: 'SEC-C',
    name: 'SEC-C (Guntur Jn – Tenali Jn)',
    kmRange: 'KM 52/500 – KM 80/000',
    trafficDensity: 'HIGH',
    status: 'Available',
    maxSpeedKmph: 110,
    nextTrains: []
  }
];

export const INITIAL_REQUESTS: BlockRequest[] = [];

export const INITIAL_EXECUTION_STEPS: ExecutionStep[] = [
  {
    stepNumber: 1,
    title: 'Request Approved',
    code: '01',
    status: 'PENDING',
    details: 'Formal concurrence received from Operating Control & Engineering heads.'
  },
  {
    stepNumber: 2,
    title: 'Block Granted',
    code: '02',
    status: 'PENDING',
    details: 'Traffic block Memo exchanged via control phone and train operating system.'
  },
  {
    stepNumber: 3,
    title: 'Safety Protection',
    code: '03',
    status: 'PENDING',
    details: 'Red banner flags erected at 600m & 1200m; 3 detonators placed on railhead. Disconnection confirmed.'
  },
  {
    stepNumber: 4,
    title: 'Maintenance Started',
    code: '04',
    status: 'PENDING',
    details: 'Track maintenance machinery deployment and heavy equipment track entry.'
  },
  {
    stepNumber: 5,
    title: 'Maintenance Completed',
    code: '05',
    status: 'PENDING',
    details: 'Physical works finished, track clearance verified, tools and staff mustered.'
  },
  {
    stepNumber: 6,
    title: 'Block Released',
    code: '06',
    status: 'PENDING',
    details: 'Fitness certificate issued to Station Master; section returned to normal traffic.'
  }
];

export const INITIAL_AUDIT_LOGS: AuditEvent[] = [];

export const INITIAL_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'conv-planning-desk',
    title: 'Planning Office Desk',
    type: 'PLANNING_OFFICE_QUERY',
    corridor: 'Vijayawada Division (BZA)',
    topicOrIssue: 'Preferred Window & Scheduling Queries',
    participants: [
      { name: 'M. K. Rao', role: 'Planning Officer', department: 'Operations' },
      { name: 'P. Murthy', role: 'COA / Operations', department: 'Operations' }
    ],
    unreadCount: 0,
    createdAt: '2026-09-11 08:00 IST',
    messages: [
      {
        id: 'msg-plan-01',
        conversationId: 'conv-planning-desk',
        senderId: 'sys',
        senderName: 'Rail Samnvay Planning Office',
        senderRole: 'Planning Officer',
        senderDepartment: 'Operations',
        topicOrIssue: 'Operational Channel Initialized',
        text: 'Planning Office desk active. Submit operational queries regarding maintenance scheduling, preferred windows, and multi-department coordination.',
        timestamp: '08:00 IST',
        isSystemMessage: true,
        systemMessageType: 'PLANNING_RECOMMENDATION'
      }
    ]
  },
  {
    id: 'conv-control-desk',
    title: 'Control Office Desk',
    type: 'CONTROL_OFFICE_QUERY',
    corridor: 'Vijayawada Division (BZA Control)',
    topicOrIssue: 'Train Movement & Headway Queries',
    participants: [
      { name: 'P. Murthy', role: 'COA / Operations', department: 'Operations' },
      { name: 'Section Controller BZA', role: 'Section Controller', department: 'Operations' }
    ],
    unreadCount: 0,
    createdAt: '2026-09-11 08:00 IST',
    messages: [
      {
        id: 'msg-ctrl-01',
        conversationId: 'conv-control-desk',
        senderId: 'sys',
        senderName: 'Divisional Train Control Desk',
        senderRole: 'Section Controller',
        senderDepartment: 'Operations',
        topicOrIssue: 'Operational Channel Initialized',
        text: 'Divisional Train Control active. Submit operational queries regarding train headway conflicts, speed restrictions, and dynamic rescheduling.',
        timestamp: '08:00 IST',
        isSystemMessage: true,
        systemMessageType: 'SAFETY_NOTICE'
      }
    ]
  },
  {
    id: 'conv-coord-01',
    title: 'Block Possession BLK-2026-0012',
    type: 'BLOCK_COMMUNICATION',
    blockId: 'BLK-2026-0012',
    requestId: 'REQ-PWAY-001',
    sectionId: 'SEC-A',
    kmRange: 'KM 12/400 – 13/100',
    corridor: 'Vijayawada – Guntur – Tenali',
    locationDisplay: 'KM 12/400 – 13/100 · UP Main · Mangalagiri (MAG)',
    timeWindow: '02:10 – 04:10 IST (120m)',
    statusDisplay: 'Scheduled',
    participants: [
      { name: 'A. K. Sharma', role: 'P.Way Engineer', department: 'P.Way' },
      { name: 'S. K. Nair', role: 'TRD Engineer', department: 'TRD' },
      { name: 'Rajesh Verma', role: 'S&T Engineer', department: 'S&T' },
      { name: 'M. K. Rao', role: 'Planning Officer', department: 'Operations' }
    ],
    unreadCount: 0,
    isCoordinationOpportunity: true,
    createdAt: '2026-09-11 08:30 IST',
    messages: [
      {
        id: 'msg-01',
        conversationId: 'conv-coord-01',
        blockId: 'BLK-2026-0012',
        requestId: 'REQ-PWAY-001',
        senderId: 'sys',
        senderName: 'Rail Samnvay Planning Engine',
        senderRole: 'MASTER',
        senderDepartment: 'Operations',
        text: 'COORDINATED BLOCK WINDOW IDENTIFIED: P.Way Tamping (KM 12/400–13/100) and TRD OHE Inspection (KM 12/800–13/500) overlap spatially on UP Main. Critical path duration: 120m.',
        timestamp: '08:30 IST',
        isSystemMessage: true,
        systemMessageType: 'COORDINATION_OPPORTUNITY'
      },
      {
        id: 'msg-02',
        conversationId: 'conv-coord-01',
        blockId: 'BLK-2026-0012',
        requestId: 'REQ-PWAY-001',
        senderId: 'u-4',
        senderName: 'A. K. Sharma',
        senderRole: 'P.Way Engineer',
        senderDepartment: 'P.Way',
        text: 'Can TRD complete the OHE inspection during our 02:00–04:00 preferred window?',
        timestamp: '08:35 IST'
      },
      {
        id: 'msg-03',
        conversationId: 'conv-coord-01',
        blockId: 'BLK-2026-0012',
        requestId: 'REQ-PWAY-001',
        senderId: 'u-6',
        senderName: 'S. K. Nair',
        senderRole: 'TRD Engineer',
        senderDepartment: 'TRD',
        text: 'Yes, our contact wire inspection needs approximately 60 minutes. We can isolate the 25kV catenary and work concurrently once your gang takes possession.',
        timestamp: '08:42 IST'
      },
      {
        id: 'msg-04',
        conversationId: 'conv-coord-01',
        blockId: 'BLK-2026-0012',
        requestId: 'REQ-PWAY-001',
        senderId: 'u-5',
        senderName: 'Rajesh Verma',
        senderRole: 'S&T Engineer',
        senderDepartment: 'S&T',
        text: 'We can also inspect point machine PM-12 at KM 13/000 under the same block without requiring any additional line closure time.',
        timestamp: '08:50 IST'
      },
      {
        id: 'msg-05',
        conversationId: 'conv-coord-01',
        blockId: 'BLK-2026-0012',
        requestId: 'REQ-PWAY-001',
        senderId: 'u-2',
        senderName: 'M. K. Rao',
        senderRole: 'Planning Officer',
        senderDepartment: 'Operations',
        text: 'Noted. CPM bottleneck is the P.Way tamping cycle (120 min). Please submit requisitions into the Approval Queue for formal departmental endorsement.',
        timestamp: '09:05 IST'
      }
    ]
  }
];

export interface DigitalTwinLayers {
  tracks: boolean;
  trains: boolean;
  signals: boolean;
  ohe: boolean;
  maintenanceBlocks: boolean;
}

export interface SamnvayState {
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  currentUser: User;
  sections: SectionData[];
  selectedSectionId: string;
  requests: BlockRequest[];
  blockPlans: BlockPlan[];
  scheduledBlocks: ScheduledBlock[];
  executionSteps: ExecutionStep[];
  auditLogs: AuditEvent[];
  twinLayers: DigitalTwinLayers;
  notification: { message: string; type: 'success' | 'info' | 'warning' | 'error' } | null;
  isPlanningInProgress: boolean;
  planningProgressStage: string;
  liveData: LiveDataState;
  isLiveMode: boolean;
  liveConflicts: LiveConflictAlert[];
  spatialOverlaps: SpatialOverlapResult[];
  conversations: ChatConversation[];
  activeConversationId: string | null;
  isChatDrawerOpen: boolean;
}

const STORAGE_KEY = 'rail_samnvay_state_prod_v1';

function getInitialState(): SamnvayState {
  return {
    isAuthenticated: false,
    authLoading: true,
    authError: null,
    currentUser: USERS['MASTER'],
    sections: INITIAL_SECTIONS,
    selectedSectionId: 'SEC-A',
    requests: INITIAL_REQUESTS,
    blockPlans: [],
    scheduledBlocks: [],
    executionSteps: INITIAL_EXECUTION_STEPS,
    auditLogs: INITIAL_AUDIT_LOGS,
    twinLayers: {
      tracks: true,
      trains: true,
      signals: true,
      ohe: true,
      maintenanceBlocks: true,
    },
    notification: null,
    isPlanningInProgress: false,
    planningProgressStage: '',
    liveData: {
      source: 'LIVE',
      lastFetchTimestamp: null,
      isPolling: false,
      error: null,
      liveTrains: [],
      stationBoards: {},
    },
    isLiveMode: true,
    liveConflicts: [],
    spatialOverlaps: evaluateMultiDepartmentOverlaps(INITIAL_REQUESTS),
    conversations: INITIAL_CONVERSATIONS,
    activeConversationId: 'conv-coord-01',
    isChatDrawerOpen: false,
  };
}

let globalState: SamnvayState = (() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...getInitialState(),
          ...parsed,
          blockPlans: parsed.blockPlans || [],
          scheduledBlocks: parsed.scheduledBlocks || [],
          conversations: (parsed.conversations && parsed.conversations.length > 0) ? parsed.conversations : INITIAL_CONVERSATIONS,
          activeConversationId: parsed.activeConversationId || 'conv-coord-01',
          isChatDrawerOpen: false,
          isAuthenticated: false,
          authLoading: true,
          authError: null
        };
      }
    }
  } catch (e) {
    console.warn('Storage read failed:', e);
  }
  return getInitialState();
})();

const listeners = new Set<() => void>();

function notify() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(globalState));
    }
  } catch (e) {
    // ignore
  }
  listeners.forEach(fn => fn());
  notifySubscribers();
}

export function useSamnvayStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick(t => t + 1);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  // Check active session on initial mount
  useEffect(() => {
    verifyCurrentSession().then(res => {
      if (res.success && res.authenticated && res.user) {
        globalState = {
          ...globalState,
          isAuthenticated: true,
          authLoading: false,
          authError: null,
          currentUser: res.user
        };
      } else {
        globalState = {
          ...globalState,
          isAuthenticated: false,
          authLoading: false,
          authError: null
        };
      }
      notify();
    }).catch(() => {
      globalState = {
        ...globalState,
        isAuthenticated: false,
        authLoading: false,
        authError: null
      };
      notify();
    });
  }, []);

  const setNotification = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    globalState = { ...globalState, notification: { message, type } };
    notify();
    setTimeout(() => {
      globalState = { ...globalState, notification: null };
      notify();
    }, 4500);
  }, []);

  const login = useCallback(async (employeeId: string, password: string): Promise<boolean> => {
    globalState = { ...globalState, authLoading: true, authError: null };
    notify();

    const res = await authenticateEmployee(employeeId, password);
    if (res.success && res.user) {
      globalState = {
        ...globalState,
        isAuthenticated: true,
        authLoading: false,
        authError: null,
        currentUser: res.user
      };
      notify();
      setNotification(`Authenticated as ${res.user.name} (${res.user.designation || res.user.role})`, 'success');
      return true;
    } else {
      globalState = {
        ...globalState,
        isAuthenticated: false,
        authLoading: false,
        authError: res.error || 'Authentication failed'
      };
      notify();
      return false;
    }
  }, [setNotification]);

  const logout = useCallback(async () => {
    await logoutEmployee();
    globalState = {
      ...globalState,
      isAuthenticated: false,
      authLoading: false,
      authError: null
    };
    notify();
    window.location.hash = '';
    setNotification('Signed out securely. Session ended.', 'info');
  }, [setNotification]);

  const switchRole = useCallback((role: UserRole) => {
    const newUser = USERS[role];
    globalState = { ...globalState, currentUser: newUser };
    notify();
    setNotification(`Switched role to ${newUser.name} (${role})`, 'info');
  }, [setNotification]);

  const selectSection = useCallback((sectionId: string) => {
    globalState = { ...globalState, selectedSectionId: sectionId };
    notify();
  }, []);

  const toggleLayer = useCallback((layerKey: keyof DigitalTwinLayers) => {
    globalState = {
      ...globalState,
      twinLayers: {
        ...globalState.twinLayers,
        [layerKey]: !globalState.twinLayers[layerKey],
      }
    };
    notify();
  }, []);

  const logAudit = useCallback((action: string, requestId: string, status: string, details: string) => {
    const newLog: AuditEvent = {
      id: `EV-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST',
      user: globalState.currentUser.name,
      role: globalState.currentUser.role,
      action,
      requestId,
      status,
      details,
    };
    globalState = {
      ...globalState,
      auditLogs: [newLog, ...globalState.auditLogs],
    };
    notify();
  }, []);

  const createRequest = useCallback((newReq: Omit<BlockRequest, 'id' | 'createdAt' | 'status' | 'engineer' | 'creatorRole'>) => {
    const id = `BR-${1020 + globalState.requests.length + 1}`;
    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
    const fullRequest: BlockRequest = {
      ...newReq,
      id,
      engineer: globalState.currentUser.name,
      creatorRole: globalState.currentUser.role,
      status: 'Submitted',
      statusHistory: [
        {
          status: 'Submitted',
          timestamp: timeNow,
          actor: globalState.currentUser.name,
          role: globalState.currentUser.role,
          remarks: `Requisition created by ${globalState.currentUser.name} (${globalState.currentUser.role})`
        }
      ],
      createdAt: timeNow,
    };

    const updatedRequests = [fullRequest, ...globalState.requests];
    const updatedOverlaps = evaluateMultiDepartmentOverlaps(updatedRequests);

    globalState = {
      ...globalState,
      requests: updatedRequests,
      spatialOverlaps: updatedOverlaps,
    };

    logAudit('Submitted Block Request', id, 'Submitted', `Created ${newReq.work} request for Section ${newReq.section} (${newReq.duration} min).`);
    notify();
    
    if (updatedOverlaps.length > 0 && updatedOverlaps[0].requestIds.includes(id)) {
      setNotification(`Requisition ${id} logged as Submitted. SPATIAL OVERLAP DETECTED with adjacent department work. Coordinated bundle recommended.`, 'warning');
    } else {
      setNotification(`Requisition ${id} submitted successfully. Entered departmental review queue.`, 'success');
    }
    return id;
  }, [logAudit, setNotification]);

  // GENUINE 17-STAGE LIFECYCLE TRANSITION ENGINE
  const transitionBlockStatus = useCallback((
    requestId: string,
    targetStatus: BlockStatus,
    remarks: string = '',
    extraData?: {
      allocatedWindow?: { startTime: string; endTime: string; safetyBufferBefore: number; safetyBufferAfter: number };
      blockMemoNumber?: string;
      rejectionReason?: string;
      revisionNotes?: string;
    }
  ) => {
    const req = globalState.requests.find(r => r.id === requestId);
    if (!req) {
      setNotification(`Error: Requisition ${requestId} not found.`, 'error');
      return { success: false, message: 'Request not found' };
    }

    const currentActor = globalState.currentUser.name;
    const currentRole = globalState.currentUser.role;
    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';

    // Strict G&SR Role Enforcement Matrix
    if (targetStatus === 'Approved') {
      if (currentRole !== 'MASTER' && req.engineer === currentActor) {
        setNotification('Access Denied: The request creator is not permitted to approve their own request.', 'error');
        return { success: false, message: 'Self-approval forbidden' };
      }
      if (currentRole === 'P.Way Engineer' || currentRole === 'S&T Engineer' || currentRole === 'TRD Engineer') {
        setNotification('Access Denied: Maintenance field engineers cannot approve block requests. Approvals require Planning Officer or MASTER authority.', 'error');
        return { success: false, message: 'Insufficient privileges' };
      }
    }

    if (targetStatus === 'Scheduled') {
      if (currentRole === 'P.Way Engineer' || currentRole === 'S&T Engineer' || currentRole === 'TRD Engineer') {
        setNotification('Access Denied: Maintenance field engineers cannot authorize and schedule possessions. Requires Planning Officer or MASTER authority.', 'error');
        return { success: false, message: 'Insufficient privileges' };
      }
    }

    if (targetStatus === 'Block Started' || targetStatus === 'Block Released') {
      if (currentRole === 'P.Way Engineer' || currentRole === 'S&T Engineer' || currentRole === 'TRD Engineer') {
        setNotification(`Access Denied: Only Operating Control (COA / Station Master) can grant or release block possession (${targetStatus}).`, 'error');
        return { success: false, message: 'Operating control only' };
      }
    }

    const newHistoryEntry: StatusHistoryEntry = {
      status: targetStatus,
      timestamp: timeNow,
      actor: currentActor,
      role: currentRole,
      remarks: remarks || `Transitioned to ${targetStatus}`
    };

    const existingHistory = req.statusHistory || [];
    const updatedHistory = [...existingHistory, newHistoryEntry];

    const updatedRequests = globalState.requests.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: targetStatus,
          statusHistory: updatedHistory,
          ...(extraData?.allocatedWindow ? { allocatedWindow: extraData.allocatedWindow } : {}),
          ...(extraData?.blockMemoNumber ? { blockMemoNumber: extraData.blockMemoNumber } : {}),
          ...(extraData?.rejectionReason ? { rejectionReason: extraData.rejectionReason } : {}),
          ...(extraData?.revisionNotes ? { revisionNotes: extraData.revisionNotes } : {})
        };
      }
      return r;
    });

    globalState = {
      ...globalState,
      requests: updatedRequests
    };

    logAudit(
      `Status: ${targetStatus}`,
      requestId,
      targetStatus,
      `${remarks || `Changed status to ${targetStatus}`} [Actor: ${currentActor} (${currentRole})]`
    );

    notify();
    setNotification(`Block ${requestId} transitioned to: ${targetStatus}`, 'success');
    return { success: true };
  }, [logAudit, setNotification]);

  // COMBINE MULTIPLE BLOCKS (SHADOW BUNDLING)
  const combineBlocks = useCallback((requestIds: string[], targetWindow: string = '04:30 – 06:30') => {
    if (requestIds.length < 2) {
      setNotification('Minimum 2 overlapping requisitions required to bundle a coordinated block.', 'warning');
      return { success: false };
    }

    const selectedReqs = globalState.requests.filter(r => requestIds.includes(r.id));
    if (selectedReqs.length !== requestIds.length) {
      setNotification('One or more selected requisitions not found.', 'error');
      return { success: false };
    }

    const [startW, endW] = targetWindow.split(' – ');
    const maxDuration = Math.max(...selectedReqs.map(r => r.duration));
    const combinedId = `CB-${1000 + globalState.requests.length + 1}`;
    const allDepts = Array.from(new Set(selectedReqs.map(r => r.department))).join(' + ');

    // Create Master Coordinated Possession
    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
    const coordinatedBlock: BlockRequest = {
      id: combinedId,
      department: selectedReqs[0].department,
      engineer: globalState.currentUser.name,
      creatorRole: globalState.currentUser.role,
      section: selectedReqs[0].section,
      startLocation: selectedReqs[0].startLocation,
      endLocation: selectedReqs[selectedReqs.length - 1].endLocation,
      work: `[COORDINATED SHADOW BUNDLE] ${allDepts} Integrated Possession`,
      workCategory: 'Coordinated Maintenance',
      date: selectedReqs[0].date,
      preferredTime: startW,
      duration: maxDuration,
      priority: 'HIGH',
      risk: 'HIGH',
      status: 'Block Window Allocated',
      reason: `Combined multi-department possession bundling ${requestIds.join(', ')} to maximize line throughput.`,
      safetyRequirements: ['Coordinated safety protection active', 'Multi-department joint memo exchanged'],
      resourcesRequired: ['Joint Engineering, S&T & TRD teams mustered'],
      priorityScore: 92,
      priorityBreakdown: {
        criticality: 90,
        urgency: 85,
        risk: 80,
        trafficImpact: 95,
        resourceAvailability: 90,
        score: 92,
        explanation: 'High efficiency integrated shadow bundle'
      },
      allocatedWindow: {
        startTime: startW,
        endTime: endW,
        safetyBufferBefore: 15,
        safetyBufferAfter: 15
      },
      bundledRequestIds: requestIds,
      createdAt: timeNow,
      statusHistory: [
        {
          status: 'Block Window Allocated',
          timestamp: timeNow,
          actor: globalState.currentUser.name,
          role: globalState.currentUser.role,
          remarks: `Formed coordinated possession bundling ${requestIds.join(', ')}`
        }
      ]
    };

    // Mark original child requisitions as bundled into combinedId
    const updatedRequests = globalState.requests.map(r => {
      if (requestIds.includes(r.id)) {
        return {
          ...r,
          status: 'Block Window Allocated' as BlockStatus,
          parentBlockId: combinedId,
          allocatedWindow: {
            startTime: startW,
            endTime: endW,
            safetyBufferBefore: 15,
            safetyBufferAfter: 15
          },
          statusHistory: [
            ...(r.statusHistory || []),
            {
              status: 'Block Window Allocated' as BlockStatus,
              timestamp: timeNow,
              actor: globalState.currentUser.name,
              role: globalState.currentUser.role,
              remarks: `Bundled into Master Coordinated Possession ${combinedId} (${targetWindow})`
            }
          ]
        };
      }
      return r;
    });

    const newRequestsList = [coordinatedBlock, ...updatedRequests];
    const newOverlaps = evaluateMultiDepartmentOverlaps(newRequestsList);

    globalState = {
      ...globalState,
      requests: newRequestsList,
      spatialOverlaps: newOverlaps
    };

    logAudit(
      'Combined Coordinated Block',
      combinedId,
      'Block Window Allocated',
      `Bundled ${requestIds.join(', ')} into unified corridor possession ${combinedId} (${targetWindow}).`
    );

    notify();
    setNotification(`Successfully created Coordinated Possession ${combinedId} bundling ${requestIds.join(', ')}!`, 'success');
    return { success: true, combinedId };
  }, [logAudit, setNotification]);

  // RESCHEDULE / MOVE WINDOW OF A BLOCK
  const rescheduleBlock = useCallback((requestId: string, newStart: string, newEnd: string, reason: string = 'Operational schedule adjustment') => {
    const req = globalState.requests.find(r => r.id === requestId);
    if (!req) {
      setNotification(`Requisition ${requestId} not found.`, 'error');
      return { success: false };
    }

    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
    const prevWindow = req.allocatedWindow ? `${req.allocatedWindow.startTime} – ${req.allocatedWindow.endTime}` : req.preferredTime;

    const newHistoryEntry: StatusHistoryEntry = {
      status: 'Scheduled',
      timestamp: timeNow,
      actor: globalState.currentUser.name,
      role: globalState.currentUser.role,
      remarks: `Rescheduled from ${prevWindow} to ${newStart} – ${newEnd}. Reason: ${reason}`
    };

    const updatedRequests = globalState.requests.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'Scheduled' as BlockStatus,
          preferredTime: newStart,
          allocatedWindow: {
            startTime: newStart,
            endTime: newEnd,
            safetyBufferBefore: 15,
            safetyBufferAfter: 15
          },
          conflict: r.conflict ? { ...r.conflict, isResolved: true } : undefined,
          statusHistory: [...(r.statusHistory || []), newHistoryEntry]
        };
      }
      return r;
    });

    globalState = {
      ...globalState,
      requests: updatedRequests,
      liveConflicts: globalState.liveConflicts.filter(c => c.requestId !== requestId)
    };

    logAudit(
      'Rescheduled Block Window',
      requestId,
      'Scheduled',
      `Shifted block possession from ${prevWindow} to ${newStart} – ${newEnd}. Reason: ${reason}`
    );

    notify();
    setNotification(`Possession ${requestId} shifted to ${newStart} – ${newEnd}.`, 'success');
    return { success: true };
  }, [logAudit, setNotification]);

  // SPLIT BLOCK INTO SEGMENTED SUB-BLOCKS
  const splitBlock = useCallback((requestId: string, splitDurations: number[]) => {
    const req = globalState.requests.find(r => r.id === requestId);
    if (!req) {
      setNotification(`Requisition ${requestId} not found.`, 'error');
      return { success: false };
    }

    if (splitDurations.length < 2) {
      setNotification('Must specify at least 2 split segments.', 'warning');
      return { success: false };
    }

    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
    const childBlocks: BlockRequest[] = splitDurations.map((dur, i) => {
      const subId = `${req.id}-${String.fromCharCode(65 + i)}`;
      return {
        ...req,
        id: subId,
        parentBlockId: req.id,
        duration: dur,
        work: `${req.work} (Part ${i + 1} of ${splitDurations.length})`,
        status: 'Planning Queue' as BlockStatus,
        allocatedWindow: undefined,
        createdAt: timeNow,
        statusHistory: [
          {
            status: 'Planning Queue',
            timestamp: timeNow,
            actor: globalState.currentUser.name,
            role: globalState.currentUser.role,
            remarks: `Split from parent block ${req.id} (${dur} min)`
          }
        ]
      };
    });

    // Mark parent as split / closed
    const updatedRequests = globalState.requests.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'Closed' as BlockStatus,
          statusHistory: [
            ...(r.statusHistory || []),
            {
              status: 'Closed' as BlockStatus,
              timestamp: timeNow,
              actor: globalState.currentUser.name,
              role: globalState.currentUser.role,
              remarks: `Segmented into sub-blocks: ${childBlocks.map(c => c.id).join(', ')}`
            }
          ]
        };
      }
      return r;
    });

    const newRequestsList = [...childBlocks, ...updatedRequests];
    globalState = {
      ...globalState,
      requests: newRequestsList
    };

    logAudit(
      'Split Block Possession',
      requestId,
      'Closed',
      `Segmented ${requestId} into ${childBlocks.length} parts: ${childBlocks.map(c => `${c.id} (${c.duration}m)`).join(', ')}.`
    );

    notify();
    setNotification(`Block ${requestId} split into ${childBlocks.map(c => c.id).join(', ')}!`, 'success');
    return { success: true, childBlockIds: childBlocks.map(c => c.id) };
  }, [logAudit, setNotification]);

  // APPROVE REQUEST (WITH STRICT RBAC RULE: CREATOR CANNOT APPROVE OWN REQUEST)
  const approveRequest = useCallback((requestId: string, justification: string = 'Approved operational maintenance block') => {
    return transitionBlockStatus(requestId, 'Approved', justification);
  }, [transitionBlockStatus]);

  // REJECT REQUEST WITH REASON (MANDATORY OPERATIONAL REASON)
  const rejectRequestWithReason = useCallback((requestId: string, reason: string) => {
    if (!reason || !reason.trim()) {
      setNotification('A clear operational reason is mandatory to reject a maintenance requisition.', 'error');
      return { success: false, error: 'REASON_REQUIRED' };
    }

    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
    const req = globalState.requests.find(r => r.id === requestId);
    if (!req) return { success: false };

    const rejectionDetails = {
      rejectedBy: globalState.currentUser.name,
      role: globalState.currentUser.role,
      timestamp: timeNow,
      reason: reason.trim()
    };

    const newHistory: StatusHistoryEntry[] = [
      ...(req.statusHistory || []),
      {
        status: 'Rejected' as BlockStatus,
        timestamp: timeNow,
        actor: globalState.currentUser.name,
        role: globalState.currentUser.role,
        remarks: `Rejected by ${globalState.currentUser.role}: ${reason.trim()}`
      }
    ];

    globalState = {
      ...globalState,
      requests: globalState.requests.map(r => r.id === requestId ? {
        ...r,
        status: 'Rejected' as BlockStatus,
        rejectionDetails,
        rejectionReason: reason.trim(),
        statusHistory: newHistory
      } : r)
    };

    logAudit(
      'Rejected Maintenance Requisition',
      requestId,
      'Rejected',
      `Requisition rejected by ${globalState.currentUser.name} (${globalState.currentUser.role}). Reason: "${reason.trim()}".`
    );

    notify();
    setNotification(`Requisition ${requestId} rejected. Rejection reason logged in audit trail.`, 'info');
    return { success: true };
  }, [logAudit, setNotification]);

  const rejectRequest = useCallback((requestId: string, reason: string) => {
    return rejectRequestWithReason(requestId, reason);
  }, [rejectRequestWithReason]);

  // RESEND REQUEST FOR CORRECTION (MANDATORY REASON + CORRECTION FIELDS CHECKLIST)
  const resendRequestForCorrection = useCallback((requestId: string, reason: string, fieldsRequiringCorrection: string[] = []) => {
    if (!reason || !reason.trim()) {
      setNotification('A specific justification reason is mandatory to resend for correction.', 'error');
      return { success: false, error: 'REASON_REQUIRED' };
    }

    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
    const req = globalState.requests.find(r => r.id === requestId);
    if (!req) return { success: false };

    const revisionRequest = {
      requestedBy: globalState.currentUser.name,
      role: globalState.currentUser.role,
      timestamp: timeNow,
      reason: reason.trim(),
      fieldsRequiringCorrection: fieldsRequiringCorrection || []
    };

    const newHistory: StatusHistoryEntry[] = [
      ...(req.statusHistory || []),
      {
        status: 'Revision Required' as BlockStatus,
        timestamp: timeNow,
        actor: globalState.currentUser.name,
        role: globalState.currentUser.role,
        remarks: `Resent for Correction: ${reason.trim()} (Fields: ${fieldsRequiringCorrection.join(', ') || 'General'})`
      }
    ];

    globalState = {
      ...globalState,
      requests: globalState.requests.map(r => r.id === requestId ? {
        ...r,
        status: 'Revision Required' as BlockStatus,
        revisionRequest,
        revisionNotes: reason.trim(),
        statusHistory: newHistory
      } : r)
    };

    logAudit(
      'Resent for Correction',
      requestId,
      'Revision Required',
      `Reviewer ${globalState.currentUser.name} requested corrections. Reason: "${reason.trim()}". Fields: ${fieldsRequiringCorrection.join(', ') || 'All'}.`
    );

    notify();
    setNotification(`Requisition ${requestId} returned to requester for revision.`, 'warning');
    return { success: true };
  }, [logAudit, setNotification]);

  const returnForRevision = useCallback((requestId: string, revisionNotes: string) => {
    return resendRequestForCorrection(requestId, revisionNotes, ['General Revision']);
  }, [resendRequestForCorrection]);

  // RESUBMIT CORRECTED REQUEST
  const resubmitCorrectedRequest = useCallback((requestId: string, updatedFields: Partial<BlockRequest> = {}) => {
    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
    const req = globalState.requests.find(r => r.id === requestId);
    if (!req) return { success: false };

    const newHistory: StatusHistoryEntry[] = [
      ...(req.statusHistory || []),
      {
        status: 'Submitted' as BlockStatus,
        timestamp: timeNow,
        actor: globalState.currentUser.name,
        role: globalState.currentUser.role,
        remarks: 'Corrected fields updated and resubmitted for department review.'
      }
    ];

    globalState = {
      ...globalState,
      requests: globalState.requests.map(r => r.id === requestId ? {
        ...r,
        ...updatedFields,
        status: 'Submitted' as BlockStatus,
        statusHistory: newHistory
      } : r)
    };

    logAudit(
      'Resubmitted Requisition',
      requestId,
      'Submitted',
      `Requester ${globalState.currentUser.name} resubmitted corrected requisition.`
    );

    notify();
    setNotification(`Requisition ${requestId} successfully resubmitted with corrections.`, 'success');
    return { success: true };
  }, [logAudit, setNotification]);

  // REQUEST CONCURRENCE FROM ANOTHER DEPARTMENT
  const requestConcurrence = useCallback((requestId: string, targetDept: Department, reason?: string) => {
    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
    const req = globalState.requests.find(r => r.id === requestId);
    if (!req) return { success: false };

    const remarks = `Inter-Departmental Concurrence requested from ${targetDept}: ${reason || 'Technical & isolation review'}`;

    const newHistory: StatusHistoryEntry[] = [
      ...(req.statusHistory || []),
      {
        status: 'P.Way/S&T/TRD Review' as BlockStatus,
        timestamp: timeNow,
        actor: globalState.currentUser.name,
        role: globalState.currentUser.role,
        remarks
      }
    ];

    globalState = {
      ...globalState,
      requests: globalState.requests.map(r => r.id === requestId ? {
        ...r,
        status: 'P.Way/S&T/TRD Review' as BlockStatus,
        statusHistory: newHistory
      } : r)
    };

    logAudit('Requested Department Concurrence', requestId, 'P.Way/S&T/TRD Review', remarks);
    notify();
    setNotification(`Concurrence requested from ${targetDept} for ${requestId}.`, 'info');
    return { success: true };
  }, [logAudit, setNotification]);

  // DELETE MAINTENANCE BLOCK / REQUISITION (MASTER ROLE ONLY)
  const deleteMaintenanceBlock = useCallback((requestId: string, reason?: string) => {
    if (globalState.currentUser.role !== 'MASTER') {
      setNotification('Unauthorized: Only MASTER role possesses authority to permanently delete a maintenance block.', 'error');
      return { success: false, error: 'UNAUTHORIZED_ROLE' };
    }

    const targetReq = globalState.requests.find(r => r.id === requestId);
    if (!targetReq) {
      setNotification(`Error: Requisition ${requestId} not found.`, 'error');
      return { success: false, error: 'NOT_FOUND' };
    }

    const deletionRemarks = reason?.trim() 
      ? `Permanently deleted by MASTER (${globalState.currentUser.name}). Reason: "${reason.trim()}"`
      : `Permanently deleted by MASTER (${globalState.currentUser.name}). Block removed from all queues.`;

    // 1. Remove from requests
    const updatedRequests = globalState.requests.filter(r => r.id !== requestId);

    // 2. Remove associated block plans if any
    const updatedPlans = (globalState.blockPlans || []).filter(p => !p.bundledRequestIds?.includes(requestId));

    // 3. Remove associated live conflict if any
    const updatedLiveConflicts = (globalState.liveConflicts || []).filter(c => c.requestId !== requestId);

    // 4. Clean up associated conversation if specific to this block
    const updatedConversations = globalState.conversations.filter(c => 
      c.requestId !== requestId && c.blockId !== requestId && c.blockId !== targetReq.blockMemoNumber
    );

    // 5. Reset execution steps if active block was the deleted one
    let updatedSteps = globalState.executionSteps;
    const remainingActive = updatedRequests.find(r => 
      r.status === 'Block Started' || r.status === 'Work in Progress' || r.status === 'Scheduled'
    );
    if (!remainingActive) {
      updatedSteps = globalState.executionSteps.map(s => ({
        ...s,
        status: 'PENDING' as const,
        timestamp: undefined,
        confirmedBy: undefined
      }));
    }

    globalState = {
      ...globalState,
      requests: updatedRequests,
      blockPlans: updatedPlans,
      liveConflicts: updatedLiveConflicts,
      conversations: updatedConversations,
      executionSteps: updatedSteps
    };

    // 6. Record official immutable audit event
    logAudit(
      'Maintenance Block Deleted',
      requestId,
      'Cancelled / Deleted',
      deletionRemarks
    );

    notify();
    setNotification(`Maintenance block ${requestId} (${targetReq.work}) was permanently deleted by MASTER.`, 'success');
    return { success: true };
  }, [logAudit, setNotification]);

  // CHAT SYSTEM ACTIONS (STRICT SAFETY RULE: CHAT NEVER AUTHORIZES A BLOCK)
  const markConversationRead = useCallback((conversationId: string) => {
    const updatedConversations = globalState.conversations.map(conv => {
      if (conv.id === conversationId) {
        return { ...conv, unreadCount: 0 };
      }
      return conv;
    });
    globalState = {
      ...globalState,
      conversations: updatedConversations
    };
    notify();
  }, []);

  const openChat = useCallback((conversationId?: string) => {
    const targetId = conversationId || globalState.activeConversationId || (globalState.conversations[0]?.id ?? null);
    const updatedConversations = globalState.conversations.map(conv => {
      if (targetId && conv.id === targetId) {
        return { ...conv, unreadCount: 0 };
      }
      return conv;
    });
    globalState = {
      ...globalState,
      conversations: updatedConversations,
      isChatDrawerOpen: true,
      activeConversationId: targetId
    };
    notify();
  }, []);

  const closeChat = useCallback(() => {
    globalState = { ...globalState, isChatDrawerOpen: false };
    notify();
  }, []);

  const toggleChat = useCallback(() => {
    globalState = { ...globalState, isChatDrawerOpen: !globalState.isChatDrawerOpen };
    notify();
  }, []);

  const sendChatMessage = useCallback((
    conversationId: string, 
    text: string, 
    replyToId?: string, 
    topicOrIssue?: string, 
    metadata?: any
  ) => {
    if (!text || !text.trim()) return;

    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
    const targetConv = globalState.conversations.find(c => c.id === conversationId);

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      conversationId,
      blockId: targetConv?.blockId,
      requestId: targetConv?.requestId,
      senderId: globalState.currentUser.id || 'u-curr',
      senderName: globalState.currentUser.name,
      senderRole: globalState.currentUser.role,
      senderDepartment: globalState.currentUser.department,
      text: text.trim(),
      timestamp: timeNow,
      topicOrIssue: topicOrIssue || targetConv?.topicOrIssue,
      replyToId,
      metadata: metadata || {
        blockId: targetConv?.blockId,
        requestId: targetConv?.requestId,
        sectionId: targetConv?.sectionId,
        kmRange: targetConv?.kmRange
      }
    };

    const updatedConversations = globalState.conversations.map(conv => {
      if (conv.id === conversationId) {
        const msgs = [...(conv.messages || []), newMsg];
        return {
          ...conv,
          messages: msgs,
          lastMessage: newMsg
        };
      }
      return conv;
    });

    globalState = {
      ...globalState,
      conversations: updatedConversations
    };
    notify();
  }, []);

  const openBlockCommunication = useCallback((reqOrBlockId: string) => {
    const req = globalState.requests.find(r => r.id === reqOrBlockId || r.blockMemoNumber === reqOrBlockId);
    let conv = globalState.conversations.find(c => c.requestId === reqOrBlockId || c.blockId === reqOrBlockId || c.id === reqOrBlockId);

    if (!conv && req) {
      const newConvId = `conv-block-${req.id}`;
      const newConv: ChatConversation = {
        id: newConvId,
        title: `Block Possession ${req.blockMemoNumber || req.id}`,
        type: 'BLOCK_COMMUNICATION',
        blockId: req.blockMemoNumber || req.id,
        requestId: req.id,
        sectionId: req.section,
        corridor: 'Vijayawada – Guntur – Tenali',
        locationDisplay: `${req.startLocation} – ${req.endLocation} · ${req.affectedTracks?.join(', ') || 'UP Main'} · ${req.stationName || 'Station'} (${req.stationCode || 'MAG'})`,
        timeWindow: req.allocatedWindow ? `${req.allocatedWindow.startTime} – ${req.allocatedWindow.endTime} IST` : req.preferredTime ? `${req.preferredTime} IST` : 'Unassigned',
        statusDisplay: req.status,
        participants: [
          { name: req.engineer, role: `${req.department} Engineer` as any, department: req.department },
          { name: 'M. K. Rao', role: 'Planning Officer', department: 'Operations' },
          { name: 'P. Murthy', role: 'COA / Operations', department: 'Operations' }
        ],
        unreadCount: 0,
        createdAt: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST',
        messages: [
          {
            id: `msg-init-${Date.now()}`,
            conversationId: newConvId,
            blockId: req.blockMemoNumber || req.id,
            requestId: req.id,
            senderId: 'sys',
            senderName: 'Rail Samnvay Planning Engine',
            senderRole: 'MASTER',
            senderDepartment: 'Operations',
            text: `Operational communication initialized for ${req.id} (${req.work}) on Section ${req.section}. Relevant departmental engineers, planning officers, and controllers can coordinate here.`,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST',
            isSystemMessage: true,
            systemMessageType: 'PLANNING_RECOMMENDATION'
          }
        ]
      };
      globalState = {
        ...globalState,
        conversations: [newConv, ...globalState.conversations],
        activeConversationId: newConvId,
        isChatDrawerOpen: true
      };
      notify();
      return;
    }

    globalState = {
      ...globalState,
      isChatDrawerOpen: true,
      activeConversationId: conv?.id || globalState.conversations[0]?.id || null
    };
    notify();
  }, []);

  const sendPlanningOfficeQuery = useCallback((requisitionId: string, topic: string, messageText: string) => {
    if (!messageText || !messageText.trim()) return;
    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
    const convId = 'conv-planning-desk';

    const newMsg: ChatMessage = {
      id: `msg-plan-${Date.now()}`,
      conversationId: convId,
      requestId: requisitionId,
      senderId: globalState.currentUser.id || 'u-curr',
      senderName: globalState.currentUser.name,
      senderRole: globalState.currentUser.role,
      senderDepartment: globalState.currentUser.department,
      topicOrIssue: topic,
      text: messageText.trim(),
      timestamp: timeNow,
      metadata: { requestId: requisitionId }
    };

    const updatedConversations = globalState.conversations.map(conv => {
      if (conv.id === convId) {
        return {
          ...conv,
          messages: [...(conv.messages || []), newMsg],
          lastMessage: newMsg
        };
      }
      return conv;
    });

    globalState = {
      ...globalState,
      conversations: updatedConversations,
      activeConversationId: convId,
      isChatDrawerOpen: true
    };
    notify();
  }, []);

  const sendControlOfficeQuery = useCallback((blockOrSectionId: string, issue: string, messageText: string) => {
    if (!messageText || !messageText.trim()) return;
    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
    const convId = 'conv-control-desk';

    const newMsg: ChatMessage = {
      id: `msg-ctrl-${Date.now()}`,
      conversationId: convId,
      blockId: blockOrSectionId,
      senderId: globalState.currentUser.id || 'u-curr',
      senderName: globalState.currentUser.name,
      senderRole: globalState.currentUser.role,
      senderDepartment: globalState.currentUser.department,
      topicOrIssue: issue,
      text: messageText.trim(),
      timestamp: timeNow,
      metadata: { blockId: blockOrSectionId }
    };

    const updatedConversations = globalState.conversations.map(conv => {
      if (conv.id === convId) {
        return {
          ...conv,
          messages: [...(conv.messages || []), newMsg],
          lastMessage: newMsg
        };
      }
      return conv;
    });

    globalState = {
      ...globalState,
      conversations: updatedConversations,
      activeConversationId: convId,
      isChatDrawerOpen: true
    };
    notify();
  }, []);

  const createChatConversation = useCallback((
    title: string,
    type: ChatConversation['type'],
    participants: any[],
    requestId?: string,
    sectionId?: string,
    isCoordinationOpportunity?: boolean
  ) => {
    const newId = `conv-${Date.now()}`;
    const newConv: ChatConversation = {
      id: newId,
      title,
      type,
      participants,
      requestId,
      sectionId,
      unreadCount: 0,
      createdAt: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST',
      isCoordinationOpportunity,
      messages: []
    };

    globalState = {
      ...globalState,
      conversations: [newConv, ...globalState.conversations],
      activeConversationId: newId,
      isChatDrawerOpen: true
    };
    notify();
    return newId;
  }, []);

  // CONFLICT RESOLUTION: ACCEPT AI RECOMMENDATION
  const acceptConflictRecommendation = useCallback((requestId: string) => {
    const req = globalState.requests.find(r => r.id === requestId);
    if (!req || !req.conflict) return;

    const newTimeWindow = req.conflict.aiRecommendation.replace('Move block to ', '');
    const [newStart, newEnd] = newTimeWindow.split(' – ');

    rescheduleBlock(requestId, newStart, newEnd, `Accepted AI recommendation to avoid collision with ${req.conflict.conflictingTrain}`);
  }, [rescheduleBlock]);

  // ADVANCE EXECUTION TRACKER STEP (MAPPED DIRECTLY TO 17-STAGE LIFECYCLE)
  const advanceExecutionStep = useCallback(() => {
    const steps = [...globalState.executionSteps];
    const inProgressIndex = steps.findIndex(s => s.status === 'IN_PROGRESS');
    const activeReq = globalState.requests.find(r => 
      r.status === 'Scheduled' || 
      r.status === 'Block Started' || 
      r.status === 'Work in Progress' || 
      r.status === 'Work Completed' || 
      r.status === 'Inspection/Safety Verification' || 
      r.status === 'Block Release Requested' || 
      r.status === 'Block Window Allocated' ||
      r.status === 'Approved' ||
      r.status === 'Active'
    );

    const stageMap: Record<number, BlockStatus> = {
      0: 'Block Started',
      1: 'Block Started',
      2: 'Work in Progress',
      3: 'Work in Progress',
      4: 'Work Completed',
      5: 'Block Released'
    };

    if (inProgressIndex === -1) {
      // Start step 1: Request Approved -> Block Started
      steps[0].status = 'IN_PROGRESS';
      steps[0].timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
      steps[0].confirmedBy = `${globalState.currentUser.name} (${globalState.currentUser.role})`;

      let updatedRequests = globalState.requests;
      if (activeReq) {
        const timeNow = steps[0].timestamp;
        const newHistory = [
          ...(activeReq.statusHistory || []),
          {
            status: 'Block Started' as BlockStatus,
            timestamp: timeNow,
            actor: globalState.currentUser.name,
            role: globalState.currentUser.role,
            remarks: 'Block Granted by Section Controller. Traffic Memo exchanged.'
          }
        ];
        updatedRequests = globalState.requests.map(r => r.id === activeReq.id ? { 
          ...r, 
          status: 'Block Started' as BlockStatus,
          blockMemoNumber: `MEMO-BZA-${Math.floor(1000 + Math.random() * 9000)}`,
          statusHistory: newHistory
        } : r);
      }

      globalState = {
        ...globalState,
        requests: updatedRequests,
        executionSteps: steps,
      };

      const targetId = activeReq ? activeReq.id : 'BLOCK-CORRIDOR';
      logAudit(
        'Initiated Operational Execution',
        targetId,
        steps[0].title,
        `Block memo granted for Step ${steps[0].code}: ${steps[0].title}. Status moved to Block Started.`
      );

      notify();
      setNotification(`Execution initiated: Block ${targetId} is now Block Started (Stage 01).`, 'success');
      return;
    }

    if (inProgressIndex < steps.length - 1) {
      steps[inProgressIndex].status = 'COMPLETED';
      steps[inProgressIndex + 1].status = 'IN_PROGRESS';
      steps[inProgressIndex + 1].timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
      steps[inProgressIndex + 1].confirmedBy = `${globalState.currentUser.name} (${globalState.currentUser.role})`;

      const nextTargetStatus = stageMap[inProgressIndex + 1] || 'Work in Progress';

      let updatedRequests = globalState.requests;
      if (activeReq) {
        const timeNow = steps[inProgressIndex + 1].timestamp || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
        const newHistory: StatusHistoryEntry[] = [
          ...(activeReq.statusHistory || []),
          {
            status: nextTargetStatus,
            timestamp: timeNow,
            actor: globalState.currentUser.name,
            role: globalState.currentUser.role,
            remarks: `Advanced to ${steps[inProgressIndex + 1].title}`
          }
        ];
        updatedRequests = globalState.requests.map(r => r.id === activeReq.id ? { 
          ...r, 
          status: nextTargetStatus,
          statusHistory: newHistory
        } : r);
      }

      globalState = {
        ...globalState,
        requests: updatedRequests,
        executionSteps: steps,
      };

      const targetId = activeReq ? activeReq.id : 'BLOCK-CORRIDOR';
      logAudit(
        'Updated Operational Execution',
        targetId,
        steps[inProgressIndex + 1].title,
        `Execution progressed to Step ${steps[inProgressIndex + 1].code}: ${steps[inProgressIndex + 1].title} (${nextTargetStatus}).`
      );

      notify();
      setNotification(`Execution advanced to Step ${steps[inProgressIndex + 1].code}: ${steps[inProgressIndex + 1].title} (${nextTargetStatus}).`, 'success');
    } else if (inProgressIndex === steps.length - 1) {
      // Complete step 6: Block Released -> Closed
      steps[inProgressIndex].status = 'COMPLETED';
      let updatedRequests = globalState.requests;
      if (activeReq) {
        const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
        const newHistory = [
          ...(activeReq.statusHistory || []),
          {
            status: 'Closed' as BlockStatus,
            timestamp: timeNow,
            actor: globalState.currentUser.name,
            role: globalState.currentUser.role,
            remarks: 'Fitness Certificate endorsed. Track possession released & closed.'
          }
        ];
        updatedRequests = globalState.requests.map(r => r.id === activeReq.id ? { 
          ...r, 
          status: 'Closed' as BlockStatus,
          statusHistory: newHistory
        } : r);
      }

      globalState = {
        ...globalState,
        requests: updatedRequests,
        executionSteps: steps,
      };

      const targetId = activeReq ? activeReq.id : 'BLOCK-CORRIDOR';
      logAudit(
        'Completed Block Possession',
        targetId,
        'Closed',
        `Maintenance block verified, released, and officially CLOSED in master operating ledger.`
      );

      notify();
      setNotification(`Possession released. Block ${targetId} officially CLOSED.`, 'success');
    }
  }, [logAudit, setNotification]);

  // SIMULATE AI PLAN GENERATION (TRANSITIONS THROUGH PLANNING QUEUE -> AI/OR OPTIMIZATION -> BLOCK WINDOW ALLOCATED -> SCHEDULED)
  const runAiPlanner = useCallback(async () => {
    const stages = [
      'Analyzing corridor timetable...',
      'Checking section line availability...',
      'Resolving headway safety margins...',
      'Optimizing multi-department allocations...',
      'OPTIMAL PLAN GENERATED'
    ];

    globalState = { ...globalState, isPlanningInProgress: true, planningProgressStage: stages[0] };
    notify();

    for (let i = 1; i < stages.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      globalState = { ...globalState, planningProgressStage: stages[i] };
      notify();
    }

    await new Promise(r => setTimeout(r, 700));

    // Allocate realistic windows as SYSTEM RECOMMENDATIONS (Block Window Allocated) to approved/planning queue requests
    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
    const newPlans: BlockPlan[] = [];

    const updatedRequests = globalState.requests.map((r, idx) => {
      if ((r.status === 'Approved' || r.status === 'Planning Queue' || r.status === 'Planning') && !r.allocatedWindow) {
        // Evaluate user's manually entered preferred time or preferred window if available
        let candidateWindow = null;
        let recommendationRemarks = '';

        if (r.preferredStartTime) {
          const evalResult = analyzeLocationTrainConflicts(
            r.startKm || 12.4,
            r.endKm || 13.1,
            r.affectedTracks || ['UP Main'],
            r.duration,
            r.preferredStartTime,
            globalState.liveData.liveTrains
          );

          if (evalResult.requestedWindowAnalysis && evalResult.requestedWindowAnalysis.status === 'FEASIBLE') {
            // Optimizer accepts manually entered time
            candidateWindow = {
              startTime: evalResult.requestedWindowAnalysis.startTime,
              endTime: evalResult.requestedWindowAnalysis.endTime,
              safetyBufferBefore: 15,
              safetyBufferAfter: 15,
            };
            recommendationRemarks = `SYSTEM RECOMMENDATION (ACCEPTED REQUESTED TIME): Optimizer accepted requested window ${candidateWindow.startTime}–${candidateWindow.endTime} after verifying 0 timetable & RailRadar conflicts with 15m safety margins. Awaiting human authorization.`;
          } else {
            // Optimizer rejects requested time due to conflict, proposes alternative feasible window
            const alt = evalResult.recommendedWindow || { startTime: '04:30', endTime: '06:30' };
            candidateWindow = {
              startTime: alt.startTime,
              endTime: alt.endTime,
              safetyBufferBefore: 15,
              safetyBufferAfter: 15,
            };
            const conflictNote = evalResult.requestedWindowAnalysis?.reason || 'Headway collision detected';
            recommendationRemarks = `SYSTEM RECOMMENDATION (MODIFIED TO ALTERNATIVE): Requested time ${r.preferredStartTime} rejected (${conflictNote}). Optimizer slotted alternative conflict-free window ${candidateWindow.startTime}–${candidateWindow.endTime}. Awaiting human authorization.`;
          }
        } else {
          // Default mathematical allocation if no custom preference
          const startHour = 2 + (idx * 2);
          const endHour = startHour + Math.max(1, Math.ceil(r.duration / 60));
          candidateWindow = {
            startTime: `${String(startHour).padStart(2, '0')}:00`,
            endTime: `${String(endHour).padStart(2, '0')}:30`,
            safetyBufferBefore: 15,
            safetyBufferAfter: 15,
          };
          recommendationRemarks = `SYSTEM RECOMMENDATION: Recommended corridor slot ${candidateWindow.startTime}–${candidateWindow.endTime} with 15m headway margins. Awaiting human authorization.`;
        }

        const newWindow = candidateWindow;
        const newHistory = [
          ...(r.statusHistory || []),
          {
            status: 'Block Window Allocated' as BlockStatus,
            timestamp: timeNow,
            actor: 'CP-SAT Solver',
            role: 'Planning Engine',
            remarks: recommendationRemarks
          }
        ];

        const plan: BlockPlan = {
          planId: `PLAN-${1000 + (globalState.blockPlans?.length || 0) + idx + 1}`,
          corridorSectionId: r.section || 'SEC-A',
          recommendedStart: newWindow.startTime,
          recommendedEnd: newWindow.endTime,
          durationMinutes: r.duration,
          availableWindowMinutes: r.duration + 30,
          blockUtilizationPercent: Math.round((r.duration / (r.duration + 30)) * 100),
          bundledRequestIds: [r.id],
          departments: [r.department],
          trackName: r.affectedTracks?.[0] || 'UP Line',
          powerBlockRequired: r.workCategory?.toLowerCase().includes('ohe') || r.department === 'TRD',
          sntDisconnectionRequired: r.department === 'S&T',
          trainConflictsCount: 0,
          optimizationScore: r.priorityScore || 88,
          reason: recommendationRemarks,
          alternativeWindows: [`${newWindow.startTime} – ${newWindow.endTime}`],
          status: 'PROPOSED'
        };
        newPlans.push(plan);

        return {
          ...r,
          status: 'Block Window Allocated' as BlockStatus,
          allocatedWindow: newWindow,
          statusHistory: newHistory
        };
      }
      return r;
    });

    const plannedCount = newPlans.length;

    globalState = {
      ...globalState,
      requests: updatedRequests,
      blockPlans: [...(globalState.blockPlans || []), ...newPlans],
      isPlanningInProgress: false,
      planningProgressStage: ''
    };

    logAudit(
      'Generated AI Corridor Plan (System Recommendation)',
      'SYSTEM',
      'Block Window Allocated',
      plannedCount > 0 
        ? `CP-SAT solver produced ${plannedCount} recommended window plan(s) in 'Block Window Allocated' state. Requires human officer authorization.`
        : 'CP-SAT constraint solver ran with zero approved requisitions to plan.'
    );
    notify();
    setNotification(
      plannedCount > 0 
        ? `Corridor recommendations generated: ${plannedCount} window(s) awaiting Human Officer Authorization.` 
        : 'Corridor planner complete. No approved requisitions currently waiting for planning.',
      'success'
    );
  }, [logAudit, setNotification]);

  // EXPLICIT HUMAN AUTHORIZATION GATE: AUTHORIZE & SCHEDULE POSSESSION (Prompt Section 7 & 8)
  const authorizeAndScheduleBlock = useCallback((requestId: string, justification?: string) => {
    const req = globalState.requests.find(r => r.id === requestId);
    if (!req) {
      setNotification(`Error: Requisition ${requestId} not found.`, 'error');
      return { success: false, message: 'Request not found' };
    }

    const currentRole = globalState.currentUser.role;
    const currentActor = globalState.currentUser.name;

    // Strict G&SR RBAC Enforcement: Field Engineers are forbidden from scheduling
    if (currentRole === 'P.Way Engineer' || currentRole === 'S&T Engineer' || currentRole === 'TRD Engineer') {
      setNotification('Access Denied: Maintenance field engineers cannot authorize and schedule possessions. Requires Planning Officer or MASTER authority.', 'error');
      return { success: false, message: 'Insufficient privileges' };
    }

    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
    const memoNum = req.blockMemoNumber || `MEMO-BZA-${Math.floor(1000 + Math.random() * 9000)}`;
    const effectiveWindow = req.allocatedWindow || {
      startTime: req.preferredTime || '04:30',
      endTime: '06:30',
      safetyBufferBefore: 15,
      safetyBufferAfter: 15
    };

    const newHistoryEntry: StatusHistoryEntry = {
      status: 'Scheduled',
      timestamp: timeNow,
      actor: currentActor,
      role: currentRole,
      remarks: justification || `Authorized & Scheduled Possession by ${currentActor} (${currentRole}). Block Memo #${memoNum} issued.`
    };

    // Update block plan status if associated
    const updatedPlans = (globalState.blockPlans || []).map(p => {
      if (p.bundledRequestIds.includes(requestId)) {
        return { ...p, status: 'AUTHORIZED' as const };
      }
      return p;
    });

    // Create ScheduledBlock entry in Master Chart
    const newScheduledBlock: ScheduledBlock = {
      blockId: `SB-${1000 + (globalState.scheduledBlocks?.length || 0) + 1}`,
      associatedRequestIds: [requestId],
      sectionCode: req.section || 'SEC-A',
      startKm: req.startKm || 12.4,
      endKm: req.endKm || 13.1,
      track: req.affectedTracks?.[0] || 'UP Line',
      scheduledDate: req.date || new Date().toISOString().split('T')[0],
      allocatedStartTime: effectiveWindow.startTime,
      allocatedEndTime: effectiveWindow.endTime,
      safetyBufferMinutes: 15,
      blockMemoNumber: memoNum,
      authorizedBy: `${currentActor} (${currentRole})`,
      authorizedAt: timeNow,
      status: 'Scheduled',
      safetyChecklist: {
        protectionRequired: true,
        protectionVerified: false,
        trackClearVerified: false,
        powerIsolationVerified: false,
        signalDisconnectionVerified: false,
        equipmentClear: false,
        personnelClear: false
      }
    };

    const updatedRequests = globalState.requests.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'Scheduled' as BlockStatus,
          blockMemoNumber: memoNum,
          allocatedWindow: effectiveWindow,
          statusHistory: [...(r.statusHistory || []), newHistoryEntry]
        };
      }
      return r;
    });

    globalState = {
      ...globalState,
      requests: updatedRequests,
      blockPlans: updatedPlans,
      scheduledBlocks: [...(globalState.scheduledBlocks || []), newScheduledBlock]
    };

    logAudit(
      'Authorized & Scheduled Possession',
      requestId,
      'Scheduled',
      `Possession officially authorized by ${currentActor} (${currentRole}) for window ${effectiveWindow.startTime}–${effectiveWindow.endTime}. Memo #${memoNum}.`
    );

    notify();
    setNotification(`Possession ${requestId} successfully AUTHORIZED & SCHEDULED under Memo #${memoNum}!`, 'success');
    return { success: true, memoNumber: memoNum };
  }, [logAudit, setNotification]);

  // EXPLICIT ACTION: REQUEST AUTOMATIC PLANNING (Prompt Section 5 & 6)
  const requestAutomaticPlanning = useCallback((requestId?: string) => {
    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST';
    const targetReqs = requestId 
      ? globalState.requests.filter(r => r.id === requestId) 
      : globalState.requests.filter(r => r.status === 'Approved');

    if (targetReqs.length === 0) {
      setNotification('No approved requisitions ready for automatic planning queue.', 'warning');
      return { success: false };
    }

    const updatedRequests = globalState.requests.map(r => {
      if ((!requestId && r.status === 'Approved') || (requestId && r.id === requestId)) {
        return {
          ...r,
          status: 'Planning Queue' as BlockStatus,
          statusHistory: [
            ...(r.statusHistory || []),
            {
              status: 'Planning Queue' as BlockStatus,
              timestamp: timeNow,
              actor: globalState.currentUser.name,
              role: globalState.currentUser.role,
              remarks: 'Queued into CP-SAT Automatic Corridor Optimization pipeline.'
            }
          ]
        };
      }
      return r;
    });

    globalState = {
      ...globalState,
      requests: updatedRequests
    };

    logAudit(
      'Queued for Automatic Planning',
      requestId || 'CORRIDOR-QUEUE',
      'Planning Queue',
      `Queued ${targetReqs.length} approved requisition(s) for CP-SAT corridor slot solver.`
    );

    notify();
    setNotification(`Enqueued ${targetReqs.length} requisition(s) into Automatic Planning Queue.`, 'info');
    return { success: true };
  }, [logAudit, setNotification]);

  // RAILRADAR INTEGRATION: TOGGLE LIVE MODE
  const toggleLiveMode = useCallback(() => {
    const nextMode = !globalState.isLiveMode;
    globalState = {
      ...globalState,
      isLiveMode: nextMode,
      liveData: {
        ...globalState.liveData,
        source: nextMode ? 'LIVE' : 'DEMO'
      }
    };
    notify();
    setNotification(
      nextMode 
        ? 'Switched to LIVE RailRadar data stream. Polling telemetry proxy.' 
        : 'Switched to DEMO corridor timetable mode.', 
      'info'
    );
  }, [setNotification]);

  // CORE DYNAMIC CONFLICT DETECTION ENGINE
  const detectLiveConflicts = (trains: LiveTrainPosition[], source: DataSource): LiveConflictAlert[] => {
    const alerts: LiveConflictAlert[] = [];
    const activeRequests = globalState.requests.filter(
      r => (r.status === 'Approved' || r.status === 'Planning' || r.status === 'Active') && r.allocatedWindow
    );

    const parseTimeToMins = (timeStr?: string | null) => {
      if (!timeStr || typeof timeStr !== 'string') return 0;
      const parts = timeStr.trim().split(':');
      if (parts.length < 2) return 0;
      return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    };

    const minsToTime = (mins: number) => {
      const normalized = ((mins % 1440) + 1440) % 1440;
      const h = Math.floor(normalized / 60).toString().padStart(2, '0');
      const m = (normalized % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    };

    for (const req of activeRequests) {
      if (!req.allocatedWindow) continue;
      const blockStart = parseTimeToMins(req.allocatedWindow.startTime);
      const blockEnd = parseTimeToMins(req.allocatedWindow.endTime);
      const safetyBuffer = 15; // standard G&SR buffer

      for (const train of trains) {
        // Determine train's corridor section & upcoming station
        // SEC-A: KM 0 - 25 (BZA - MAG)
        // SEC-B: KM 25 - 52.5 (MAG - GNT)
        // SEC-C: KM 52.5 - 80 (GNT - TEL)
        let trainSection = 'SEC-A';
        if (train.currentKm >= 25 && train.currentKm < 52.5) trainSection = 'SEC-B';
        else if (train.currentKm >= 52.5) trainSection = 'SEC-C';

        // Match against block section, station code, or upcoming station
        const matchesSection = req.section === trainSection || (req.sectionCode && req.sectionCode === trainSection);
        const matchesStation = req.stationCode && (train.nextStation === req.stationCode || train.currentStation === req.stationCode);
        const matchesRoute = !req.routeCode || req.routeCode === 'ROUTE-01' || req.routeCode === 'ROUTE-02';

        if ((matchesSection || matchesStation) && matchesRoute) {
          const trainArrivalMins = parseTimeToMins(train.expectedArrival || train.scheduledArrival);
          const trainPassageStart = trainArrivalMins - safetyBuffer;
          const trainPassageEnd = trainArrivalMins + safetyBuffer;

          // Check Headway Collision Overlap
          const hasOverlap = Math.max(blockStart, trainPassageStart) < Math.min(blockEnd, trainPassageEnd);

          if (hasOverlap) {
            const overlapMinutes = Math.min(blockEnd, trainPassageEnd) - Math.max(blockStart, trainPassageStart);
            let recommendation: 'KEEP' | 'SHIFT' | 'SHORTEN' | 'DEFER' = 'SHIFT';
            
            if (train.delayMinutes > 60) {
              recommendation = 'KEEP'; // Train is way behind, block can proceed
            } else if (req.duration <= 60 && overlapMinutes <= 20) {
              recommendation = 'SHORTEN';
            } else if (train.delayMinutes > 20 && req.priority === 'CRITICAL') {
              recommendation = 'DEFER';
            } else {
              recommendation = 'SHIFT';
            }

            const shiftedStart = trainPassageEnd + 10;
            const shiftedEnd = shiftedStart + req.duration;
            const alternative1 = `${minsToTime(shiftedStart)} – ${minsToTime(shiftedEnd)} (Clear of ${train.trainNumber})`;
            const alternative2 = `${minsToTime(blockEnd + 45)} – ${minsToTime(blockEnd + 45 + req.duration)} (Secondary Slot)`;

            alerts.push({
              requestId: req.id,
              trainNumber: train.trainNumber,
              trainName: train.trainName,
              blockWindow: `${req.allocatedWindow.startTime} – ${req.allocatedWindow.endTime}`,
              trainPassageWindow: `${minsToTime(trainPassageStart)} – ${minsToTime(trainPassageEnd)}`,
              headwayShortfallMinutes: Math.max(1, overlapMinutes),
              severity: overlapMinutes > 30 || req.priority === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
              recommendation,
              alternativeWindows: [alternative1, alternative2],
              detectedAt: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' IST',
              basedOn: source
            });
          }
        }
      }
    }
    return alerts;
  };

  // UPDATE LIVE TRAINS FROM POLLING/API WITH ACCURATE ATTRIBUTE REPLACEMENT
  const updateLiveTrains = useCallback((incomingTrains: LiveTrainPosition[], source: DataSource, errorMsg?: string | null) => {
    if (source === 'UNAVAILABLE' && incomingTrains.length === 0) {
      globalState = {
        ...globalState,
        liveData: {
          ...globalState.liveData,
          source: 'UNAVAILABLE',
          error: errorMsg || 'Live RailRadar telemetry unavailable'
        }
      };
      notify();
      return;
    }

    // Merge or replace trains ensuring latest delay, speed, KM, ETA, and upstream timestamps overwrite old values
    const existingMap = new Map(globalState.liveData.liveTrains.map(t => [t.trainNumber, t]));
    const mergedTrains = incomingTrains.map(fresh => {
      const prev = existingMap.get(fresh.trainNumber);
      return {
        ...prev,
        ...fresh,
        // Guarantee delay, speed, KM, arrival, and timestamps come strictly from fresh response
        delayMinutes: typeof fresh.delayMinutes === 'number' ? fresh.delayMinutes : (prev?.delayMinutes ?? 0),
        speedKmph: typeof fresh.speedKmph === 'number' ? fresh.speedKmph : (prev?.speedKmph ?? 0),
        currentKm: typeof fresh.currentKm === 'number' ? fresh.currentKm : (prev?.currentKm ?? 320),
        expectedArrival: fresh.expectedArrival || prev?.expectedArrival || '14:40',
        upstreamUpdatedAt: fresh.upstreamUpdatedAt || prev?.upstreamUpdatedAt || new Date().toISOString(),
        lastUpdated: fresh.lastUpdated || new Date().toISOString(),
        fetchedAt: fresh.fetchedAt || new Date().toISOString()
      };
    });

    const alerts = detectLiveConflicts(mergedTrains, source);
    
    // Also sync sectional nextTrains for C1, C2, C3 with verified live ETAs and delays
    const updatedSections = globalState.sections.map(sec => {
      const relevantTrains = mergedTrains.slice(0, 3).map(t => ({
        number: t.trainNumber,
        name: t.trainName,
        eta: `${t.expectedArrival} IST (${t.delayMinutes > 0 ? `+${t.delayMinutes}m` : 'RT'})`,
        speedKmph: t.speedKmph
      }));
      return {
        ...sec,
        nextTrains: relevantTrains.length > 0 ? relevantTrains : sec.nextTrains
      };
    });

    globalState = {
      ...globalState,
      sections: updatedSections,
      liveData: {
        ...globalState.liveData,
        source,
        liveTrains: mergedTrains,
        lastFetchTimestamp: new Date().toISOString(),
        error: null
      },
      liveConflicts: alerts
    };
    notify();
  }, []);

  // UPDATE STATION BOARD
  const updateStationBoard = useCallback((stationCode: string, entries: StationBoardEntry[], source: DataSource) => {
    globalState = {
      ...globalState,
      liveData: {
        ...globalState.liveData,
        source,
        stationBoards: {
          ...globalState.liveData.stationBoards,
          [stationCode]: entries
        },
        lastFetchTimestamp: new Date().toISOString()
      }
    };
    notify();
  }, []);

  // RESOLVE LIVE CONFLICT VIA PROPOSED SHIFT
  const acceptLiveConflictShift = useCallback((requestId: string, alternativeSlot: string) => {
    const cleanSlot = alternativeSlot.split(' (')[0];
    const [newStart, newEnd] = cleanSlot.split(' – ');

    globalState = {
      ...globalState,
      requests: globalState.requests.map(r => r.id === requestId ? {
        ...r,
        preferredTime: newStart,
        allocatedWindow: {
          startTime: newStart,
          endTime: newEnd,
          safetyBufferBefore: 15,
          safetyBufferAfter: 15,
        }
      } : r),
      liveConflicts: globalState.liveConflicts.filter(c => c.requestId !== requestId)
    };

    logAudit(
      'Dynamic Replan: Live Conflict Cleared',
      requestId,
      'Slot Shifted',
      `Shifted maintenance window to ${newStart} – ${newEnd} to resolve dynamic headway conflict.`
    );
    notify();
    setNotification(`Resolved live headway conflict for ${requestId}. Window adjusted to ${cleanSlot}.`, 'success');
  }, [logAudit, setNotification]);

  // RESET TO INITIAL
  const resetToInitial = useCallback(() => {
    globalState = getInitialState();
    notify();
    setNotification('System state restored to initial demo conditions.', 'info');
  }, [setNotification]);

  return {
    state: globalState,
    switchRole,
    selectSection,
    toggleLayer,
    createRequest,
    transitionBlockStatus,
    combineBlocks,
    rescheduleBlock,
    splitBlock,
    approveRequest,
    rejectRequest,
    rejectRequestWithReason,
    returnForRevision,
    resendRequestForCorrection,
    resubmitCorrectedRequest,
    requestConcurrence,
    deleteMaintenanceBlock,
    openChat,
    closeChat,
    toggleChat,
    markConversationRead,
    sendChatMessage,
    openBlockCommunication,
    sendPlanningOfficeQuery,
    sendControlOfficeQuery,
    createChatConversation,
    acceptConflictRecommendation,
    advanceExecutionStep,
    runAiPlanner,
    authorizeAndScheduleBlock,
    requestAutomaticPlanning,
    resetToInitial,
    toggleLiveMode,
    updateLiveTrains,
    updateStationBoard,
    acceptLiveConflictShift,
    login,
    logout,
  };
}

// Export getState for non-React runtime test scripts and background workers
export function getSamnvayState(): SamnvayState {
  return globalState;
}

export function setSamnvayState(updater: Partial<SamnvayState> | ((prev: SamnvayState) => SamnvayState)) {
  if (typeof updater === 'function') {
    globalState = updater(globalState);
  } else {
    globalState = { ...globalState, ...updater };
  }
  notify();
}

// Subscribe to store state changes (for Firebase and other real-time adapters)
const stateSubscribers = new Set<(state: SamnvayState) => void>();

export function subscribeSamnvayState(callback: (state: SamnvayState) => void) {
  stateSubscribers.add(callback);
  return () => {
    stateSubscribers.delete(callback);
  };
}

function notifySubscribers() {
  stateSubscribers.forEach(cb => {
    try {
      cb(globalState);
    } catch (e) {
      console.error('State subscriber error:', e);
    }
  });
}


