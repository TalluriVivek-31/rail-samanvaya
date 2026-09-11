// Railway Corridor Data - South Central Railway, Vijayawada Division
// Focus Section: Bapatla (BPP) – Appikatla (APL) – Chirala (CLX) – Vetapalem (VTM)
// High-density Grand Trunk / Golden Diagonal corridor

export interface StationNode {
  code: string;
  name: string;
  km: number;
  platforms: number;
  hasLoopLine: boolean;
  x: number; // 3D twin X coordinate
}

export interface SignalNode {
  id: string;
  station: string;
  line: 'UP' | 'DN';
  km: number;
  type: 'HOME' | 'STARTER' | 'ADVANCED_STARTER' | 'DISTANT';
  aspect: 'GREEN' | 'DOUBLE_YELLOW' | 'YELLOW' | 'RED';
  x: number;
}

export const CORRIDOR_INFO = {
  zone: 'South Central Railway (SCR)',
  division: 'Vijayawada (BZA)',
  sectionName: 'Bapatla – Chirala Corridor (Grand Trunk Route)',
  totalKm: 35, // KM 310 to KM 345
  trackGauge: '1676 mm (Broad Gauge)',
  electrification: '25 kV AC 50 Hz OHE',
  signalling: 'Automatic Block Signalling (ABS) with MACLS 4-Aspect',
  rulingGradient: '1 in 200',
  maxSectionSpeedKmph: 130,
};

export const STATIONS: StationNode[] = [
  { code: 'APL', name: 'Appikatla', km: 312.4, platforms: 2, hasLoopLine: true, x: -160 },
  { code: 'BPP', name: 'Bapatla', km: 320.8, platforms: 3, hasLoopLine: true, x: -70 },
  { code: 'CLX', name: 'Chirala', km: 332.6, platforms: 4, hasLoopLine: true, x: 60 },
  { code: 'VTM', name: 'Vetapalem', km: 341.2, platforms: 2, hasLoopLine: false, x: 160 },
];

export const SIGNALS: SignalNode[] = [
  { id: 'SIG-UP-BPP-1', station: 'Bapatla', line: 'UP', km: 319.2, type: 'HOME', aspect: 'GREEN', x: -85 },
  { id: 'SIG-UP-BPP-2', station: 'Bapatla', line: 'UP', km: 321.4, type: 'STARTER', aspect: 'GREEN', x: -55 },
  { id: 'SIG-UP-CLX-1', station: 'Chirala', line: 'UP', km: 331.0, type: 'HOME', aspect: 'DOUBLE_YELLOW', x: 45 },
  { id: 'SIG-UP-CLX-2', station: 'Chirala', line: 'UP', km: 333.2, type: 'STARTER', aspect: 'GREEN', x: 75 },
  { id: 'SIG-DN-CLX-1', station: 'Chirala', line: 'DN', km: 334.0, type: 'HOME', aspect: 'GREEN', x: 80 },
  { id: 'SIG-DN-BPP-1', station: 'Bapatla', line: 'DN', km: 322.0, type: 'HOME', aspect: 'GREEN', x: -50 },
];
