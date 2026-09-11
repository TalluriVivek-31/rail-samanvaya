// Server Infrastructure Service & Dynamic Location Detection
// Indian Railways · South Central Railway (Vijayawada Division)

export interface TrackMaster {
  trackId: string;
  trackName: string;
  lineId: string;
  lineName: string;
  startKm: number;
  endKm: number;
  electrified: boolean;
  speedLimitKmph: number;
}

export interface SectionMaster {
  sectionId: string;
  sectionName: string;
  corridorCode: string;
  startKm: number;
  endKm: number;
  startStation: string;
  endStation: string;
  totalKm: number;
  doubleTrack: boolean;
  tracks: TrackMaster[];
}

export interface InfrastructureAsset {
  assetId: string;
  assetType: string;
  name: string;
  department: 'P.Way' | 'S&T' | 'TRD';
  km: number;
  kmDisplay: string;
  trackId: string;
  trackName: string;
  status: 'OPERATIONAL' | 'NEEDS_MAINTENANCE' | 'CRITICAL_WATCH';
}

export const CORRIDOR = {
  name: 'Vijayawada – Guntur – Tenali High-Density Corridor',
  zone: 'South Central Railway (SCR)',
  division: 'Vijayawada (BZA)',
  startKm: 0.0,
  endKm: 80.0,
};

export const SECTIONS: SectionMaster[] = [
  {
    sectionId: 'SEC-A',
    sectionName: 'BZA – MAG Section (Vijayawada – Mangalagiri)',
    corridorCode: 'CORR-01',
    startKm: 0.0,
    endKm: 25.0,
    startStation: 'Vijayawada Jn (BZA)',
    endStation: 'Mangalagiri (MAG)',
    totalKm: 25.0,
    doubleTrack: true,
    tracks: [
      {
        trackId: 'TRK-A-UP',
        trackName: 'UP Main',
        lineId: 'LINE-A-MAIN',
        lineName: 'BZA–MAG UP Main Line',
        startKm: 0.0,
        endKm: 25.0,
        electrified: true,
        speedLimitKmph: 130,
      },
      {
        trackId: 'TRK-A-DN',
        trackName: 'DOWN Main',
        lineId: 'LINE-A-MAIN',
        lineName: 'BZA–MAG DOWN Main Line',
        startKm: 0.0,
        endKm: 25.0,
        electrified: true,
        speedLimitKmph: 130,
      },
      {
        trackId: 'TRK-A-LOOP',
        trackName: 'Loop Line',
        lineId: 'LINE-A-LOOP',
        lineName: 'Mangalagiri Station Loop',
        startKm: 10.5,
        endKm: 15.2,
        electrified: true,
        speedLimitKmph: 50,
      },
      {
        trackId: 'TRK-A-SIDING',
        trackName: 'Goods Siding',
        lineId: 'LINE-A-SIDING',
        lineName: 'KCC Freight Siding',
        startKm: 11.8,
        endKm: 13.5,
        electrified: false,
        speedLimitKmph: 30,
      },
    ],
  },
  {
    sectionId: 'SEC-B',
    sectionName: 'MAG – GNT Section (Mangalagiri – Guntur Jn)',
    corridorCode: 'CORR-02',
    startKm: 25.0,
    endKm: 52.5,
    startStation: 'Mangalagiri (MAG)',
    endStation: 'Guntur Jn (GNT)',
    totalKm: 27.5,
    doubleTrack: true,
    tracks: [
      {
        trackId: 'TRK-B-UP',
        trackName: 'UP Main',
        lineId: 'LINE-B-MAIN',
        lineName: 'MAG–GNT UP Main Line',
        startKm: 25.0,
        endKm: 52.5,
        electrified: true,
        speedLimitKmph: 130,
      },
      {
        trackId: 'TRK-B-DN',
        trackName: 'DOWN Main',
        lineId: 'LINE-B-MAIN',
        lineName: 'MAG–GNT DOWN Main Line',
        startKm: 25.0,
        endKm: 52.5,
        electrified: true,
        speedLimitKmph: 130,
      },
      {
        trackId: 'TRK-B-LOOP',
        trackName: 'Common Loop',
        lineId: 'LINE-B-LOOP',
        lineName: 'Guntur West Bypass Loop',
        startKm: 47.5,
        endKm: 52.0,
        electrified: true,
        speedLimitKmph: 50,
      },
    ],
  },
  {
    sectionId: 'SEC-C',
    sectionName: 'GNT – TEL Section (Guntur Jn – Tenali Jn)',
    corridorCode: 'CORR-03',
    startKm: 52.5,
    endKm: 80.0,
    startStation: 'Guntur Jn (GNT)',
    endStation: 'Tenali Jn (TEL)',
    totalKm: 27.5,
    doubleTrack: true,
    tracks: [
      {
        trackId: 'TRK-C-UP',
        trackName: 'UP Main',
        lineId: 'LINE-C-MAIN',
        lineName: 'GNT–TEL UP Main Line',
        startKm: 52.5,
        endKm: 80.0,
        electrified: true,
        speedLimitKmph: 130,
      },
      {
        trackId: 'TRK-C-DN',
        trackName: 'DOWN Main',
        lineId: 'LINE-C-MAIN',
        lineName: 'GNT–TEL DOWN Main Line',
        startKm: 52.5,
        endKm: 80.0,
        electrified: true,
        speedLimitKmph: 130,
      },
      {
        trackId: 'TRK-C-LOOP',
        trackName: 'Loop Line',
        lineId: 'LINE-C-LOOP',
        lineName: 'Vejandla Station Loop',
        startKm: 61.5,
        endKm: 65.5,
        electrified: true,
        speedLimitKmph: 50,
      },
    ],
  },
];

export const ROUTES = [
  { routeId: 'RT-01', routeCode: 'ROUTE-01', routeName: 'Vijayawada – Guntur Trunk Route', startStation: 'BZA', endStation: 'GNT' },
  { routeId: 'RT-02', routeCode: 'ROUTE-02', routeName: 'Guntur – Tenali Chord Route', startStation: 'GNT', endStation: 'TEL' }
];

export const STATIONS = [
  { code: 'BZA', name: 'Vijayawada Junction', km: 0.0, sectionId: 'SEC-A', routeCode: 'ROUTE-01', yardLimitStartKm: 0.0, yardLimitEndKm: 2.5 },
  { code: 'KCC', name: 'Krishna Canal Junction', km: 5.2, sectionId: 'SEC-A', routeCode: 'ROUTE-01', yardLimitStartKm: 4.5, yardLimitEndKm: 6.2 },
  { code: 'MAG', name: 'Mangalagiri', km: 12.5, sectionId: 'SEC-A', routeCode: 'ROUTE-01', yardLimitStartKm: 11.8, yardLimitEndKm: 13.2 },
  { code: 'NBR', name: 'Namburu', km: 36.8, sectionId: 'SEC-B', routeCode: 'ROUTE-01', yardLimitStartKm: 35.5, yardLimitEndKm: 37.8 },
  { code: 'GNT', name: 'Guntur Junction', km: 50.0, sectionId: 'SEC-B', routeCode: 'ROUTE-01', yardLimitStartKm: 48.2, yardLimitEndKm: 52.5 },
  { code: 'VJA', name: 'Vejandla', km: 63.4, sectionId: 'SEC-C', routeCode: 'ROUTE-02', yardLimitStartKm: 62.0, yardLimitEndKm: 64.8 },
  { code: 'TEL', name: 'Tenali Junction', km: 78.5, sectionId: 'SEC-C', routeCode: 'ROUTE-02', yardLimitStartKm: 76.8, yardLimitEndKm: 80.0 },
];

export const ASSETS: InfrastructureAsset[] = [
  // KM 12.400 - 13.100 Cluster
  {
    assetId: 'RS-12',
    assetType: 'Rail Section',
    name: '60kg 90UTS Welded Rail Section KM 12/400–13/100',
    department: 'P.Way',
    km: 12.75,
    kmDisplay: 'KM 12/750',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'NEEDS_MAINTENANCE',
  },
  {
    assetId: 'T-124',
    assetType: 'Turnout',
    name: 'Turnout 1:12 Curved Switch (UP Main to Loop)',
    department: 'P.Way',
    km: 12.45,
    kmDisplay: 'KM 12/450',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'TG-01',
    assetType: 'Track Geometry Zone',
    name: 'Track Alignment & Gauge Monitoring Zone 12A',
    department: 'P.Way',
    km: 12.8,
    kmDisplay: 'KM 12/800',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'NEEDS_MAINTENANCE',
  },
  {
    assetId: 'T-125',
    assetType: 'Turnout',
    name: 'Goods Siding Derailing Switch',
    department: 'P.Way',
    km: 13.05,
    kmDisplay: 'KM 13/050',
    trackId: 'TRK-A-SIDING',
    trackName: 'Goods Siding',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'S-127',
    assetType: 'Signal',
    name: '4-Aspect Color Light Starter Signal S-127',
    department: 'S&T',
    km: 12.6,
    kmDisplay: 'KM 12/600',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'PM-128',
    assetType: 'Point Machine',
    name: 'Dual-Control Electric Point Machine PM-128',
    department: 'S&T',
    km: 12.85,
    kmDisplay: 'KM 12/850',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'TC-129',
    assetType: 'Track Circuit',
    name: 'Audio-Frequency Track Circuit (AFTC) TC-129',
    department: 'S&T',
    km: 12.9,
    kmDisplay: 'KM 12/900',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'NEEDS_MAINTENANCE',
  },
  {
    assetId: 'AC-125',
    assetType: 'Axle Counter',
    name: 'High-Integrity Dual Electronic Axle Counter Unit',
    department: 'S&T',
    km: 12.42,
    kmDisplay: 'KM 12/420',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'M-125',
    assetType: 'OHE Mast',
    name: 'Traction Portal Mast M-125 (25kV AC)',
    department: 'TRD',
    km: 12.5,
    kmDisplay: 'KM 12/500',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'M-126',
    assetType: 'OHE Mast',
    name: 'Cantilever Catenary Support Mast M-126',
    department: 'TRD',
    km: 12.75,
    kmDisplay: 'KM 12/750',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'NEEDS_MAINTENANCE',
  },
  {
    assetId: 'SP-12',
    assetType: 'Sectioning Post',
    name: 'Sectioning & Paralleling Post SP-12 Isolator Switch',
    department: 'TRD',
    km: 12.8,
    kmDisplay: 'KM 12/800',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'CAT-12',
    assetType: 'Catenary Wire',
    name: '107 sq mm Hard-Drawn Grooved Copper Contact Wire',
    department: 'TRD',
    km: 12.88,
    kmDisplay: 'KM 12/880',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'NEEDS_MAINTENANCE',
  },
  // Section Boundary KM 25
  {
    assetId: 'T-201',
    assetType: 'Turnout',
    name: 'Namburu West Facing Points',
    department: 'P.Way',
    km: 24.9,
    kmDisplay: 'KM 24/900',
    trackId: 'TRK-A-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'S-205',
    assetType: 'Signal',
    name: 'Boundary Automatic Signal S-205',
    department: 'S&T',
    km: 25.15,
    kmDisplay: 'KM 25/150',
    trackId: 'TRK-B-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
  {
    assetId: 'M-201',
    assetType: 'OHE Mast',
    name: 'Section-Boundary OHE Tensioner Mast M-201',
    department: 'TRD',
    km: 25.3,
    kmDisplay: 'KM 25/300',
    trackId: 'TRK-B-UP',
    trackName: 'UP Main',
    status: 'OPERATIONAL',
  },
];

export function parseKm(input: string | number): number {
  if (typeof input === 'number') return isNaN(input) ? NaN : Math.round(input * 1000) / 1000;
  if (!input || typeof input !== 'string') return NaN;
  const clean = input.trim().replace(/^km\s*/i, '').replace(/\s+/g, '');
  if (!clean) return NaN;

  if (clean.includes('/')) {
    const [km, m] = clean.split('/');
    const kmNum = parseInt(km, 10);
    let mNum = 0;
    if (m.length === 1) mNum = parseInt(m, 10) * 100;
    else if (m.length === 2) mNum = parseInt(m, 10) * 10;
    else mNum = parseInt(m.slice(0, 3), 10);
    return isNaN(kmNum) || isNaN(mNum) ? NaN : kmNum + mNum / 1000;
  }

  const val = parseFloat(clean);
  return isNaN(val) ? NaN : Math.round(val * 1000) / 1000;
}

export function formatKm(km: number): string {
  if (isNaN(km)) return 'KM --/---';
  const kmInt = Math.floor(km);
  const meters = Math.round((km - kmInt) * 1000);
  return `KM ${kmInt}/${String(meters).padStart(3, '0')}`;
}

export function detectLocation(startInput: string | number, endInput: string | number) {
  const startKm = parseKm(startInput);
  const endKm = parseKm(endInput);

  if (isNaN(startKm) || isNaN(endKm)) {
    return {
      isValid: false,
      error: 'Invalid KM input. Use formats like 12/400 or 12.400'
    };
  }

  if (startKm < CORRIDOR.startKm || endKm > CORRIDOR.endKm) {
    return {
      isValid: false,
      error: `Location outside configured railway infrastructure. Corridor spans KM ${CORRIDOR.startKm.toFixed(3)} to KM ${CORRIDOR.endKm.toFixed(3)}.`
    };
  }

  if (startKm >= endKm) {
    return {
      isValid: false,
      error: `Start KM (${formatKm(startKm)}) must be strictly less than End KM (${formatKm(endKm)}).`
    };
  }

  const affectedLengthKm = Math.round((endKm - startKm) * 1000) / 1000;
  const affectedLengthMeters = Math.round(affectedLengthKm * 1000);

  // Sections
  const detectedSections = SECTIONS.filter(sec => sec.startKm < endKm && sec.endKm > startKm);
  const isCrossSection = detectedSections.length > 1;

  // Tracks
  const trackMap = new Map<string, TrackMaster>();
  const lineSet = new Set<string>();

  detectedSections.forEach(sec => {
    sec.tracks.forEach(trk => {
      if (trk.startKm < endKm && trk.endKm > startKm && !trackMap.has(trk.trackName)) {
        trackMap.set(trk.trackName, trk);
        lineSet.add(trk.lineName);
      }
    });
  });

  // Assets
  const assetsInRange = ASSETS.filter(a => a.km >= startKm - 0.05 && a.km <= endKm + 0.05);
  const byDepartment = {
    'P.Way': assetsInRange.filter(a => a.department === 'P.Way'),
    'S&T': assetsInRange.filter(a => a.department === 'S&T'),
    'TRD': assetsInRange.filter(a => a.department === 'TRD'),
  };

  // Station Identification
  const midKm = (startKm + endKm) / 2;
  let primaryStation = STATIONS[0];
  let minDiff = Infinity;
  STATIONS.forEach(s => {
    const diff = Math.abs(s.km - midKm);
    if (diff < minDiff) {
      minDiff = diff;
      primaryStation = s;
    }
  });

  // Station limits intersection
  const stationLimitsAffected = STATIONS.filter(s => s.yardLimitStartKm < endKm && s.yardLimitEndKm > startKm);
  const isStationLimitIntersection = stationLimitsAffected.length > 0;
  if (isStationLimitIntersection) {
    primaryStation = stationLimitsAffected[0];
  }

  // Between stations
  let prevStation = STATIONS[0];
  let nextStation = STATIONS[STATIONS.length - 1];
  for (let i = 0; i < STATIONS.length; i++) {
    if (STATIONS[i].km <= startKm) prevStation = STATIONS[i];
  }
  for (let i = STATIONS.length - 1; i >= 0; i--) {
    if (STATIONS[i].km >= endKm) nextStation = STATIONS[i];
  }

  const betweenStations = `${prevStation.name} (${prevStation.code}) → ${nextStation.name} (${nextStation.code})`;

  return {
    isValid: true,
    startKm,
    endKm,
    startKmDisplay: formatKm(startKm),
    endKmDisplay: formatKm(endKm),
    affectedLengthKm,
    affectedLengthMeters,
    isCrossSection,
    detectedSections,
    detectedLines: Array.from(lineSet),
    availableTracks: Array.from(trackMap.values()),
    primaryStation,
    stationCode: primaryStation.code,
    stationName: primaryStation.name,
    sectionCode: detectedSections[0]?.sectionId || 'SEC-A',
    sectionName: detectedSections[0]?.sectionName || 'BZA – MAG Section',
    routeCode: primaryStation.routeCode || 'ROUTE-01',
    betweenStations,
    isStationLimitIntersection,
    stationLimitsAffected: stationLimitsAffected.map(s => `${s.name} (${s.code})`),
    assets: {
      total: assetsInRange.length,
      list: assetsInRange,
      byDepartment,
    }
  };
}
