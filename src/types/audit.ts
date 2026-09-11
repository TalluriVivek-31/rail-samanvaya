// Audit trail data model for human-in-the-loop and operational actions

export type UserRole = 
  | 'CHIEF_CONTROLLER' 
  | 'SECTION_CONTROLLER' 
  | 'P_WAY_PLANNER' 
  | 'S_T_ENGINEER' 
  | 'TRD_SUPERVISOR' 
  | 'AI_SYSTEM';

export type AuditAction = 
  | 'CREATE_TASK'
  | 'AUTO_OPTIMIZE'
  | 'APPROVE_BLOCK'
  | 'MODIFY_BLOCK'
  | 'OVERRIDE_BLOCK'
  | 'DEFER_TASK'
  | 'CANCEL_BLOCK'
  | 'RECORD_BLOCK_BURST'
  | 'RESCHEDULE_TASK'
  | 'ISSUE_TSR'
  | 'CLEAR_TSR'
  | 'SIMULATE_TRAIN_DELAY'
  | 'DYNAMIC_REPLAN';

export interface AuditRecord {
  id: string;
  timestamp: string; // ISO or formatted HH:mm:ss
  user: string;
  role: UserRole;
  action: AuditAction;
  target_id: string; // Task ID or Block ID or TSR ID
  old_value: string;
  new_value: string;
  reason: string;
}
