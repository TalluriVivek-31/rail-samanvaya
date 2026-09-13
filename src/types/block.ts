// Block window model and feasibility result types
import { DepartmentType } from './task';

export type BlockStatus = 
  | 'AVAILABLE'
  | 'REQUESTED'
  | 'GRANTED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'BURST'
  | 'CANCELLED';

export interface TrainConstraint {
  train_number: string;
  train_name: string;
  estimated_crossing_time: string; // HH:MM
  headway_clearance_minutes: number; // minimum buffer required (e.g. 15 mins)
  conflict: boolean;
  conflict_details?: string;
}

export interface CorridorBlock {
  block_id: string;
  section: string;
  line: 'UP' | 'DN' | 'BOTH';
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  start_minutes: number; // minutes from 00:00 (e.g. 11:00 = 660)
  end_minutes: number; // minutes from 00:00 (e.g. 13:00 = 780)
  duration: number; // duration in minutes
  affected_departments: DepartmentType[];
  status: BlockStatus;
  train_constraints: TrainConstraint[];
  assigned_task_ids: string[];
  granted_by?: string; // Controller name / role
  granted_at?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  is_shadow_block?: boolean; // Can be bundled with another parallel block
}

export interface CandidateBlockEvaluation {
  block: CorridorBlock;
  is_feasible: boolean;
  score: number; // 0 - 100
  duration_sufficient: boolean;
  conflicting_trains: TrainConstraint[];
  department_ready: boolean;
  resource_ready: boolean;
  isolation_supported: boolean;
  mobilization_feasible: boolean;
  selection_reasons: string[];
  rejection_reasons: string[];
}
