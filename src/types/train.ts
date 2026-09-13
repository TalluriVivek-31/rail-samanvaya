// Train data model with simulated telemetry and timetable

export type TrainType = 'VANDE_BHARAT' | 'SUPERFAST' | 'EXPRESS' | 'PASSENGER' | 'FREIGHT';

export type TrainDirection = 'UP' | 'DN';

export type TrainStatus = 
  | 'ON_TIME'
  | 'DELAYED'
  | 'APPROACHING'
  | 'BLOCKING_WINDOW'
  | 'PASSED'
  | 'CANCELLED';

export interface TrainMovement {
  train_number: string;
  train_name: string;
  train_type: TrainType;
  direction: TrainDirection;
  section: string;
  line: 'UP' | 'DN';
  current_location: string; // e.g. "Approaching Bapatla KM 318" or "Chirala Platform 1"
  position_km: number; // KM marker along the corridor (e.g. 310 to 345)
  scheduled_arrival: string; // HH:MM
  predicted_arrival: string; // HH:MM (dynamically adjusted by delay)
  delay_minutes: number;
  speed_kmph: number;
  max_permissible_speed_kmph: number;
  status: TrainStatus;
  occupying_section: boolean;
  rakes_count?: number;
  priority_tier: number; // 1 = highest (e.g. Vande Bharat / Rajdhani), 5 = lowest (freight)
}
