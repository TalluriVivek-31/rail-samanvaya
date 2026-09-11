interface TrainStatus {
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
  platform: number | null;
  status: 'RUNNING' | 'AT_PLATFORM' | 'DEPARTED' | 'CANCELLED' | 'DIVERTED';
  lastUpdated: string;
}

interface StationBoardEntry {
  trainNumber: string;
  trainName: string;
  type: 'ARRIVAL' | 'DEPARTURE';
  scheduledTime: string;
  expectedTime: string;
  delayMinutes: number;
  platform: number | null;
  status: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'DIVERTED';
  direction: 'UP' | 'DN';
}

const trains: Record<string, TrainStatus> = {
  '12627': {
    trainNumber: '12627',
    trainName: 'Karnataka Express',
    currentStation: 'BPP',
    nextStation: 'CLX',
    lastReportedStation: 'APL',
    direction: 'UP',
    delayMinutes: 12,
    scheduledArrival: '14:30',
    expectedArrival: '14:42',
    currentKm: 319,
    speedKmph: 110,
    platform: null,
    status: 'RUNNING',
    lastUpdated: new Date().toISOString(),
  },
  '12723': {
    trainNumber: '12723',
    trainName: 'Telangana Express',
    currentStation: 'CLX',
    nextStation: 'VTM',
    lastReportedStation: 'BPP',
    direction: 'UP',
    delayMinutes: 0,
    scheduledArrival: '15:00',
    expectedArrival: '15:00',
    currentKm: 331,
    speedKmph: 125,
    platform: null,
    status: 'RUNNING',
    lastUpdated: new Date().toISOString(),
  },
  '17011': {
    trainNumber: '17011',
    trainName: 'Hyderabad Intercity',
    currentStation: 'APL',
    nextStation: 'BPP',
    lastReportedStation: 'CLX',
    direction: 'DN',
    delayMinutes: 5,
    scheduledArrival: '15:10',
    expectedArrival: '15:15',
    currentKm: 314,
    speedKmph: 95,
    platform: null,
    status: 'RUNNING',
    lastUpdated: new Date().toISOString(),
  },
  '20834': {
    trainNumber: '20834',
    trainName: 'Vande Bharat Express',
    currentStation: 'VTM',
    nextStation: 'CLX',
    lastReportedStation: 'VTM',
    direction: 'UP',
    delayMinutes: 0,
    scheduledArrival: '15:30',
    expectedArrival: '15:30',
    currentKm: 340,
    speedKmph: 130,
    platform: 1,
    status: 'AT_PLATFORM',
    lastUpdated: new Date().toISOString(),
  },
  '12711': {
    trainNumber: '12711',
    trainName: 'Pinakini Express',
    currentStation: 'BPP',
    nextStation: 'APL',
    lastReportedStation: 'CLX',
    direction: 'DN',
    delayMinutes: 8,
    scheduledArrival: '16:00',
    expectedArrival: '16:08',
    currentKm: 322,
    speedKmph: 105,
    platform: null,
    status: 'RUNNING',
    lastUpdated: new Date().toISOString(),
  },
  '12615': {
    trainNumber: '12615',
    trainName: 'Grand Trunk Express',
    currentStation: 'CLX',
    nextStation: 'VTM',
    lastReportedStation: 'BPP',
    direction: 'UP',
    delayMinutes: 22,
    scheduledArrival: '16:30',
    expectedArrival: '16:52',
    currentKm: 333,
    speedKmph: 100,
    platform: null,
    status: 'RUNNING',
    lastUpdated: new Date().toISOString(),
  },
};

const stationBoards: Record<string, StationBoardEntry[]> = {
  BPP: [
    { trainNumber: '12627', trainName: 'Karnataka Express', type: 'ARRIVAL', scheduledTime: '14:20', expectedTime: '14:32', delayMinutes: 12, platform: 1, status: 'DELAYED', direction: 'UP' },
    { trainNumber: '12711', trainName: 'Pinakini Express', type: 'DEPARTURE', scheduledTime: '16:00', expectedTime: '16:08', delayMinutes: 8, platform: 2, status: 'DELAYED', direction: 'DN' },
    { trainNumber: '12723', trainName: 'Telangana Express', type: 'DEPARTURE', scheduledTime: '14:40', expectedTime: '14:40', delayMinutes: 0, platform: 1, status: 'ON_TIME', direction: 'UP' },
    { trainNumber: '17011', trainName: 'Hyderabad Intercity', type: 'ARRIVAL', scheduledTime: '15:10', expectedTime: '15:15', delayMinutes: 5, platform: 2, status: 'DELAYED', direction: 'DN' },
  ],
  APL: [
    { trainNumber: '17011', trainName: 'Hyderabad Intercity', type: 'DEPARTURE', scheduledTime: '15:00', expectedTime: '15:05', delayMinutes: 5, platform: 1, status: 'DELAYED', direction: 'DN' },
    { trainNumber: '12711', trainName: 'Pinakini Express', type: 'ARRIVAL', scheduledTime: '16:15', expectedTime: '16:23', delayMinutes: 8, platform: 1, status: 'DELAYED', direction: 'DN' },
    { trainNumber: '12627', trainName: 'Karnataka Express', type: 'DEPARTURE', scheduledTime: '14:10', expectedTime: '14:22', delayMinutes: 12, platform: 2, status: 'DELAYED', direction: 'UP' },
    { trainNumber: '12615', trainName: 'Grand Trunk Express', type: 'ARRIVAL', scheduledTime: '16:20', expectedTime: '16:42', delayMinutes: 22, platform: 2, status: 'DELAYED', direction: 'UP' },
  ],
  CLX: [
    { trainNumber: '12723', trainName: 'Telangana Express', type: 'ARRIVAL', scheduledTime: '15:00', expectedTime: '15:00', delayMinutes: 0, platform: 1, status: 'ON_TIME', direction: 'UP' },
    { trainNumber: '12615', trainName: 'Grand Trunk Express', type: 'DEPARTURE', scheduledTime: '16:30', expectedTime: '16:52', delayMinutes: 22, platform: 1, status: 'DELAYED', direction: 'UP' },
    { trainNumber: '20834', trainName: 'Vande Bharat Express', type: 'ARRIVAL', scheduledTime: '15:45', expectedTime: '15:45', delayMinutes: 0, platform: 2, status: 'ON_TIME', direction: 'UP' },
    { trainNumber: '12627', trainName: 'Karnataka Express', type: 'ARRIVAL', scheduledTime: '14:45', expectedTime: '14:57', delayMinutes: 12, platform: 1, status: 'DELAYED', direction: 'UP' },
  ],
  VTM: [
    { trainNumber: '20834', trainName: 'Vande Bharat Express', type: 'DEPARTURE', scheduledTime: '15:30', expectedTime: '15:30', delayMinutes: 0, platform: 1, status: 'ON_TIME', direction: 'UP' },
    { trainNumber: '12723', trainName: 'Telangana Express', type: 'ARRIVAL', scheduledTime: '15:15', expectedTime: '15:15', delayMinutes: 0, platform: 1, status: 'ON_TIME', direction: 'UP' },
    { trainNumber: '12615', trainName: 'Grand Trunk Express', type: 'ARRIVAL', scheduledTime: '16:45', expectedTime: '17:07', delayMinutes: 22, platform: 1, status: 'DELAYED', direction: 'UP' },
    { trainNumber: '12711', trainName: 'Pinakini Express', type: 'ARRIVAL', scheduledTime: '15:45', expectedTime: '15:53', delayMinutes: 8, platform: 2, status: 'DELAYED', direction: 'DN' },
  ],
};

/**
 * Returns demo train status data
 * @param trainNumber The train number
 */
export function getDemoTrainStatus(trainNumber: string): object | null {
  return trains[trainNumber] || null;
}

/**
 * Returns demo station board data
 * @param stationCode The station code
 */
export function getDemoStationBoard(stationCode: string): object | null {
  return stationBoards[stationCode] || null;
}
