// Corridor Scheduled Movements & Fixed Planning Parameters
// Indian Railways · Automatic Block Planning Architecture (SIH 2026 PS 26027)

import { PlanningParameters } from '../types/samnvay';

export interface PlannedCorridorMovement {
  trainNumber: string;
  trainName: string;
  type: 'PASSENGER' | 'EXPRESS' | 'GOODS_FREIGHT' | 'SPECIAL';
  track: string;
  speedKmph: number;
  currentKm: number;
  passageTimeAtZone: string; // HH:MM
  timeMinutes: number; // Mins from 00:00
}

export const DEFAULT_PLANNING_PARAMETERS: PlanningParameters = {
  headwayBufferMinutes: 15,
  approachBufferMinutes: 10,
  clearanceBufferMinutes: 10,
  maxConcurrentPossessions: 2,
  planningHorizon: 'DAILY',
  allowCrossDepartmentBundling: true,
};

/**
 * Corridor scheduled movements + goods freight forecasts along Corridor C1 (Vijayawada – Mangalagiri – Guntur)
 */
export const SCHEDULED_CORRIDOR_MOVEMENTS: PlannedCorridorMovement[] = [
  {
    trainNumber: '12627',
    trainName: 'Karnataka Express',
    type: 'EXPRESS',
    track: 'UP Main',
    speedKmph: 110,
    currentKm: 8.5,
    passageTimeAtZone: '02:25',
    timeMinutes: 2 * 60 + 25, // 145 mins
  },
  {
    trainNumber: 'BZA-GOODS-412',
    trainName: 'Container Freight Rake (Goods Forecast)',
    type: 'GOODS_FREIGHT',
    track: 'DOWN Main',
    speedKmph: 75,
    currentKm: 14.0,
    passageTimeAtZone: '03:40',
    timeMinutes: 3 * 60 + 40,
  },
  {
    trainNumber: '12723',
    trainName: 'Telangana Express',
    type: 'EXPRESS',
    track: 'UP Main',
    speedKmph: 120,
    currentKm: 0.0,
    passageTimeAtZone: '06:45',
    timeMinutes: 6 * 60 + 45, // 405 mins
  },
  {
    trainNumber: '20834',
    trainName: 'Vande Bharat Express',
    type: 'EXPRESS',
    track: 'UP Main',
    speedKmph: 130,
    currentKm: 0.0,
    passageTimeAtZone: '07:15',
    timeMinutes: 7 * 60 + 15, // 435 mins
  },
  {
    trainNumber: '17011',
    trainName: 'Intercity Express',
    type: 'PASSENGER',
    track: 'DOWN Main',
    speedKmph: 95,
    currentKm: 28.0,
    passageTimeAtZone: '03:10',
    timeMinutes: 3 * 60 + 10,
  },
  {
    trainNumber: '12759',
    trainName: 'Charminar Express',
    type: 'EXPRESS',
    track: 'UP Main',
    speedKmph: 105,
    currentKm: 32.0,
    passageTimeAtZone: '07:30',
    timeMinutes: 7 * 60 + 30, // 450 mins
  },
  {
    trainNumber: 'BZA-FREIGHT-901',
    trainName: 'Coal Rake Freight (Goods Forecast)',
    type: 'GOODS_FREIGHT',
    track: 'UP Main',
    speedKmph: 65,
    currentKm: 21.0,
    passageTimeAtZone: '03:10',
    timeMinutes: 3 * 60 + 10,
  }
];
