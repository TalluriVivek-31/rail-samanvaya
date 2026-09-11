// Core Type Definitions for Rail Samnvay (Indian Railways AI Block Planning Platform)

export type UserRole = 
  | 'MASTER' 
  | 'Planning Officer' 
  | 'COA / Operations' 
  | 'Section Controller'
  | 'P.Way Engineer' 
  | 'S&T Engineer' 
  | 'TRD Engineer';

export interface User {
  id?: string;
  name: string;
  role: UserRole;
  employeeId: string;
  department: 'P.Way' | 'S&T' | 'TRD' | 'Operations' | 'All';
  designation?: string;
  avatarInitials: string;
  permissions?: string[];
  authenticated?: boolean;
}

export type SamnvayPage = 
  | 'overview' 
  | 'live-trains'
  | 'requests' 
  | 'approval' 
  | 'planning' 
  | 'conflict' 
  | 'execution' 
  | 'communication'
  | 'audit';

export type Department = 'P.Way' | 'S&T' | 'TRD';

export type BlockPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type BlockStatus = 
  // 17 Deterministic Sequential Lifecycle States
  | 'Draft' 
  | 'Submitted' 
  | 'P.Way/S&T/TRD Review' 
  | 'Verified' 
  | 'Approval Pending' 
  | 'Approved' 
  | 'Planning Queue' 
  | 'AI/OR Optimization' 
  | 'Block Window Allocated' 
  | 'Scheduled' 
  | 'Block Started' 
  | 'Work in Progress' 
  | 'Work Completed' 
  | 'Inspection/Safety Verification' 
  | 'Block Release Requested' 
  | 'Block Released' 
  | 'Closed'
  // Exception & Operational Branching States
  | 'Pending'  // Legacy compatibility alias
  | 'Review'   // Legacy compatibility alias
  | 'Planning' // Legacy compatibility alias
  | 'Active'   // Legacy compatibility alias
  | 'Completed'// Legacy compatibility alias
  | 'Rejected' 
  | 'Revision' 
  | 'Revision Required'
  | 'Delayed / Headway Conflict'
  | 'Unsafe / Cancelled'
  | 'Rescheduled';

export interface StatusHistoryEntry {
  status: BlockStatus;
  timestamp: string;
  actor: string;
  role: string;
  remarks: string;
}

export interface PriorityBreakdown {
  criticality: number;      // 35%
  urgency: number;          // 25%
  risk: number;             // 20%
  trafficImpact: number;    // 10%
  resourceAvailability: number; // 10%
  score: number;            // 0-100
  explanation: string;
}

export interface BlockRequest {
  id: string; // e.g. BR-1024, BR-1025, BR-1026
  department: Department;
  engineer: string; // Creator name
  creatorRole: UserRole;
  section: string; // e.g. C1, C2, C3
  startLocation: string; // e.g. KM 214/3
  endLocation: string; // e.g. KM 217/8
  work: string; // e.g. Rail grinding, Signal inspection, OHE maintenance
  workCategory: string;
  date: string; // YYYY-MM-DD
  preferredTime: string; // HH:MM
  preferredStartTime?: string; // HH:MM (manual or candidate selection)
  preferredEndTime?: string;   // HH:MM (manual or candidate selection)
  duration: number; // minutes
  priority: BlockPriority;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: BlockStatus;
  reason: string;
  safetyRequirements: string[];
  resourcesRequired: string[];
  priorityScore: number;
  priorityBreakdown: PriorityBreakdown;
  startKm?: number;
  endKm?: number;
  affectedLengthMeters?: number;
  affectedTracks?: string[];
  lineName?: string;
  
  // Authoritative Station & Route Identification
  stationId?: string;
  stationCode?: string;       // e.g. "MAG"
  stationName?: string;       // e.g. "Mangalagiri"
  sectionId?: string;         // e.g. "SEC-A"
  sectionCode?: string;       // e.g. "SEC-A"
  sectionName?: string;       // e.g. "BZA – MAG Section"
  routeId?: string;           // e.g. "RT-01"
  routeCode?: string;         // e.g. "ROUTE-01"
  routeName?: string;         // e.g. "Vijayawada – Guntur Trunk Route"
  betweenStations?: string;   // e.g. "Krishna Canal Jn (KCC) → Mangalagiri (MAG)"
  isStationLimitIntersection?: boolean;
  stationAffected?: boolean;

  // OpenRailwayMap GIS & Location Intelligence Context
  locationIntelligence?: import('./infrastructure').LocationIntelligenceData;
  conflictCategory?: import('./infrastructure').ConflictCategory;

  trafficBlockRequired?: boolean;
  powerBlockRequired?: boolean;
  sntDisconnectionRequired?: boolean;
  speedRestrictionRequired?: boolean;
  affectedAssets?: string[];
  isCrossSection?: boolean;
  crossSections?: string[];
  conflict?: {
    conflictingTrain: string;
    conflictingTrainNumber: string;
    conflictWindow: string;
    aiRecommendation: string;
    alternativeWindows: string[];
    isResolved: boolean;
  };
  allocatedWindow?: {
    startTime: string; // e.g. 08:30
    endTime: string;   // e.g. 10:00
    safetyBufferBefore: number; // 15 min
    safetyBufferAfter: number;  // 15 min
  };
  statusHistory?: StatusHistoryEntry[];
  parentBlockId?: string;
  bundledRequestIds?: string[];
  spatialOverlapWith?: string[];
  // Work & Defect Specification
  workType?: string;
  maintenanceCategory?: 'Preventive' | 'Corrective' | 'Emergency';
  assetId?: string;
  assetName?: string;
  defectDetails?: string;
  inspectionReference?: string;

  // Resource & Department Dependencies
  workforceCount?: number;
  machines?: string[];
  materials?: string[];
  dependencies?: string[];
  otherDepartmentsInvolved?: Department[];
  specialOperatingRestrictions?: string;

  // Preferred Schedule Flexibility
  flexibleTiming?: boolean;
  earliestAcceptableTime?: string;
  latestAcceptableTime?: string;
  additionalNotes?: string;
  attachments?: string[];

  // Revision & Rejection Details
  revisionRequest?: {
    requestedBy: string;
    role: string;
    timestamp: string;
    reason: string;
    fieldsRequiringCorrection: string[];
  };
  rejectionDetails?: {
    rejectedBy: string;
    role: string;
    timestamp: string;
    reason: string;
  };

  // Legacy & Traceability Fields
  blockMemoNumber?: string;
  rejectionReason?: string;
  revisionNotes?: string;
  externalSystem?: 'TMS' | 'SMMS' | 'TDMS' | 'COA';
  externalAssetRef?: string;
  totalRequiredDuration?: number;
  completedDuration?: number;
  remainingDuration?: number;
  childBlockIds?: string[];
  parentRequirementId?: string;
  safetyChecklist?: SafetyChecklist;

  createdAt: string;
}

export interface SectionData {
  id: string; // C1, C2, C3
  name: string;
  kmRange: string;
  trafficDensity: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'Available' | 'Occupied' | 'Maintenance' | 'Caution';
  maxSpeedKmph: number;
  activeTSR?: {
    speedKmph: number;
    reason: string;
  };
  nextTrains: {
    number: string;
    name: string;
    eta: string;
    speedKmph: number;
  }[];
}

export interface ExecutionStep {
  stepNumber: number; // 1 to 6
  title: string;
  code: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
  timestamp?: string;
  confirmedBy?: string;
  details: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  requestId: string;
  status: string;
  details: string;
}

// ── RailRadar Integration Types ──

export type DataSource = 'LIVE' | 'LAST_KNOWN' | 'DEMO' | 'UNAVAILABLE';

export interface LiveTrainPosition {
  trainNumber: string;
  trainName: string;
  currentStation: string;
  nextStation: string;
  lastReportedStation: string;
  direction: 'UP' | 'DN';
  delayMinutes: number;
  scheduledArrival: string;
  expectedArrival: string;
  currentKm: number;
  speedKmph: number;
  platform?: number;
  status: 'RUNNING' | 'AT_PLATFORM' | 'DEPARTED' | 'CANCELLED' | 'DIVERTED';
  lastUpdated: string;
  upstreamUpdatedAt?: string;
  fetchedAt?: string;
}

export interface StationBoardEntry {
  trainNumber: string;
  trainName: string;
  type: 'ARRIVAL' | 'DEPARTURE';
  scheduledTime: string;
  expectedTime: string;
  delayMinutes: number;
  platform?: number;
  status: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'DIVERTED';
  direction: 'UP' | 'DN';
}

export interface LiveDataState {
  source: DataSource;
  lastFetchTimestamp: string | null;
  isPolling: boolean;
  error: string | null;
  liveTrains: LiveTrainPosition[];
  stationBoards: Record<string, StationBoardEntry[]>;
}

export interface LiveConflictAlert {
  requestId: string;
  trainNumber: string;
  trainName: string;
  blockWindow: string;
  trainPassageWindow: string;
  headwayShortfallMinutes: number;
  severity: 'CRITICAL' | 'WARNING';
  recommendation: 'KEEP' | 'SHIFT' | 'SHORTEN' | 'DEFER';
  alternativeWindows: string[];
  detectedAt: string;
  basedOn: DataSource;
}

export interface PlanningParameters {
  headwayBufferMinutes: number; // Configurable planning safety margin (default 15)
  approachBufferMinutes: number; // default 10
  clearanceBufferMinutes: number; // default 10
  maxConcurrentPossessions: number;
  planningHorizon: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  allowCrossDepartmentBundling: boolean;
}

export interface SafetyChecklist {
  protectionRequired: boolean;
  protectionVerified: boolean;
  trackClearVerified: boolean;
  powerIsolationVerified: boolean;
  signalDisconnectionVerified: boolean;
  equipmentClear: boolean;
  personnelClear: boolean;
  fitnessCertificateId?: string;
  inspectingOfficer?: string;
  verificationTimestamp?: string;
}

// Dedicated Decoupled Entity: BlockPlan (CP-SAT Solver Output)
export interface BlockPlan {
  planId: string;
  corridorSectionId: string;
  recommendedStart: string;
  recommendedEnd: string;
  durationMinutes: number;
  availableWindowMinutes: number;
  blockUtilizationPercent: number;
  aggregateWorkDensityPercent?: number;
  bundledRequestIds: string[];
  departments: Department[];
  trackName: string;
  powerBlockRequired: boolean;
  sntDisconnectionRequired: boolean;
  trainConflictsCount: number;
  optimizationScore: number;
  reason: string;
  alternativeWindows: string[];
  status: 'PROPOSED' | 'AUTHORIZED' | 'REJECTED';
}

// Dedicated Decoupled Entity: ScheduledBlock (Authorized Possession in Master Chart)
export interface ScheduledBlock {
  blockId: string;
  planId?: string;
  associatedRequestIds: string[];
  sectionCode: string;
  startKm: number;
  endKm: number;
  track: string;
  scheduledDate: string;
  allocatedStartTime: string;
  allocatedEndTime: string;
  safetyBufferMinutes: number;
  blockMemoNumber: string;
  authorizedBy: string;
  authorizedAt: string;
  status: BlockStatus;
  safetyChecklist: SafetyChecklist;
}

// -----------------------------------------------------------------------------
// Railway-Aware Chat & Multi-Department Coordination Models
// -----------------------------------------------------------------------------
export type SystemMessageType = 
  | 'COORDINATION_OPPORTUNITY' 
  | 'CONFLICT_ALERT' 
  | 'APPROVAL_UPDATE' 
  | 'REVISION_REQUEST' 
  | 'PLANNING_RECOMMENDATION'
  | 'SAFETY_NOTICE';

export interface ChatMessage {
  id: string;
  conversationId: string;
  blockId?: string;
  requestId?: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderDepartment: Department | 'Operations' | 'All';
  text: string;
  timestamp: string; // e.g. "10:24 IST" or ISO
  topicOrIssue?: string;
  isSystemMessage?: boolean;
  systemMessageType?: SystemMessageType;
  replyToId?: string;
  metadata?: {
    requestId?: string;
    blockId?: string;
    stationCode?: string;
    sectionId?: string;
    kmRange?: string;
  };
}

export interface ChatConversation {
  id: string;
  title: string;
  type: 'BLOCK_COMMUNICATION' | 'PLANNING_OFFICE_QUERY' | 'CONTROL_OFFICE_QUERY' | 'DEPARTMENT_COORDINATION' | 'DIRECT' | 'REQUEST_THREAD' | 'SECTION_OPS';
  blockId?: string;
  requestId?: string;
  sectionId?: string;
  corridor?: string;
  locationDisplay?: string;
  timeWindow?: string;
  statusDisplay?: string;
  topicOrIssue?: string;
  kmRange?: string;
  participants: {
    name: string;
    role: UserRole;
    department: Department | 'Operations' | 'All';
  }[];
  unreadCount: number;
  lastMessage?: ChatMessage;
  createdAt: string;
  isCoordinationOpportunity?: boolean;
  messages?: ChatMessage[];
}

// -----------------------------------------------------------------------------
// CPM Dependency & Activity Network Models
// -----------------------------------------------------------------------------
export interface CpmActivity {
  id: string;
  name: string;
  department: Department | 'Operations';
  durationMinutes: number;
  prerequisites: string[]; // Activity IDs that must finish before this starts
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;
  isCritical: boolean;
}

export interface CpmAnalysisResult {
  activities: CpmActivity[];
  parallelActivityCount: number;
  sequentialDependencyCount: number;
  criticalPathDuration: number;
  criticalActivities: string[];
  nonCriticalActivities: { name: string; floatMinutes: number }[];
  availableWindowMinutes: number;
  blockUtilizationPercent: number;
  aggregateWorkDensityPercent: number;
}

