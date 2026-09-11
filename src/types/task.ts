// Core types for RailBlock AI - Maintenance Task Data Model

export type DepartmentType = 'P_WAY' | 'S_T' | 'TRD_OHE' | 'OPERATING';

export type TaskSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type TaskUrgency = 'EMERGENCY' | 'URGENT' | 'ROUTINE' | 'DEFERRED';

export type ResourceStatus = 'READY' | 'PARTIALLY_READY' | 'NOT_READY';

export type RequiredIsolation = 
  | 'NONE'
  | 'TRAFFIC_BLOCK'
  | 'POWER_BLOCK_OHE'
  | 'DISCONNECTION_ST'
  | 'COMBINED_TRAFFIC_POWER'
  | 'FULL_CORRIDOR_ISOLATION';

export type TaskStatus = 
  | 'IDENTIFIED'
  | 'PRIORITIZED'
  | 'PLANNED'
  | 'BLOCK_REQUESTED'
  | 'BLOCK_GRANTED'
  | 'READY'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'BLOCK_BURST'
  | 'DEFERRED'
  | 'CANCELLED';

export interface TemporarySpeedRestriction {
  id: string;
  speed_kmph: number; // Configurable operational value (e.g. 30 km/h is an interview-based example)
  reason: string;
  location: string;
  section: string;
  line: 'UP' | 'DN' | 'BOTH';
  issued_by: string; // e.g. "SSE / P.Way / Bapatla"
  start_time: string;
  expiry_condition: string; // e.g. "Permanent rail replacement & joint welding certified fit"
  status: 'ACTIVE' | 'CLEARED';
  source: string; // "Field Inspection / Ultrasonic Flaw Detection (USFD)"
}

export interface PriorityBreakdown {
  criticalityScore: number; // 0-100 (weight: 35%)
  urgencyScore: number;     // 0-100 (weight: 25%)
  riskScore: number;        // 0-100 (weight: 20%)
  trafficImpactScore: number; // 0-100 (weight: 10%)
  resourceReadinessScore: number; // 0-100 (weight: 10%)
  finalScore: number;       // 0-100
  explanation: {
    criticalityText: string;
    urgencyText: string;
    riskText: string;
    trafficImpactText: string;
    resourcesText: string;
    summaryText: string;
  };
}

export interface MaintenanceTask {
  task_id: string;
  asset_id: string;
  asset_type: 'RAIL' | 'POINT' | 'TRACK_CIRCUIT' | 'AXLE_COUNTER' | 'OHE_MAST' | 'SIGNAL' | 'SLEEPER' | 'TURNOUT';
  department: DepartmentType; // Primary department
  supporting_departments: DepartmentType[]; // Required joint departments
  location: string; // e.g. "KM 324/14 - 324/18"
  section: string; // e.g. "Bapatla–Chirala"
  line: 'UP' | 'DN' | 'BOTH';
  defect_type: string; // e.g. "Broken rail", "Track circuit drop", "OHE contact wire wear"
  severity: TaskSeverity;
  urgency: TaskUrgency;
  priority_score: number; // 0 - 100
  priority_breakdown?: PriorityBreakdown;
  
  // Timing & Mobilization
  estimated_execution_duration: number; // minutes
  setup_duration: number; // minutes
  mobilization_duration: number; // travel & muster time (minutes)
  required_block_duration: number; // setup + execution + safety margin (minutes)
  
  // Requirements & Resources
  required_isolation: RequiredIsolation;
  equipment_required: string[];
  material_required: string[];
  resource_status: ResourceStatus;
  dependency_tasks: string[]; // task IDs
  
  // Restrictions & Planning
  temporary_speed_restriction: TemporarySpeedRestriction | null;
  deadline: string;
  status: TaskStatus;
  
  // Block assignment
  allocated_block_id?: string;
  allocated_start_time?: string;
  allocated_end_time?: string;
  burst_reason?: string;
  rescheduled_from_task_id?: string;
  notes?: string;
}
