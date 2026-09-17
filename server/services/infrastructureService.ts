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

  if (clean.includes('+')) {
    const [km, m] = clean.split('+');
    const kmNum = parseInt(km, 10);
    const mNum = parseInt(m, 10);
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

export function normalizeRailwayKm(input: string | number): { km: number; meters: number; formatted: string; isValid: boolean } {
  const km = parseKm(input);
  if (isNaN(km)) {
    return { km: NaN, meters: NaN, formatted: 'KM --/---', isValid: false };
  }
  const whole = Math.floor(km);
  const frac = Math.round((km - whole) * 1000);
  return {
    km,
    meters: Math.round(km * 1000),
    formatted: `KM ${whole}/${String(frac).padStart(3, '0')}`,
    isValid: true
  };
}

export function detectLocation(startInput: string | number, endInput: string | number) {
  const startNorm = normalizeRailwayKm(startInput);
  const endNorm = normalizeRailwayKm(endInput);

  if (!startNorm.isValid || !endNorm.isValid) {
    return {
      isValid: false,
      error: 'Invalid KM input. Use formats like 12/400, 12+400, or 12.400'
    };
  }

  const startKm = startNorm.km;
  const endKm = endNorm.km;

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

  const startMetres = startNorm.meters;
  const endMetres = endNorm.meters;
  const affectedLengthMeters = endMetres - startMetres;
  const affectedLengthKm = Math.round((endKm - startKm) * 1000) / 1000;

  // Sections - Interval intersection: max(startA, startB) < min(endA, endB)
  const detectedSections = SECTIONS.filter(sec => Math.max(sec.startKm, startKm) < Math.min(sec.endKm, endKm));
  const isCrossSection = detectedSections.length > 1;

  // Cross-section span breakdown
  const crossSectionBreakdown = detectedSections.map(sec => {
    const subStart = Math.max(sec.startKm, startKm);
    const subEnd = Math.min(sec.endKm, endKm);
    const subMeters = Math.round((subEnd - subStart) * 1000);
    return {
      sectionId: sec.sectionId,
      sectionName: sec.sectionName,
      startKm: subStart,
      endKm: subEnd,
      startKmDisplay: formatKm(subStart),
      endKmDisplay: formatKm(subEnd),
      lengthMeters: subMeters,
      display: `${sec.sectionId}: ${formatKm(subStart)} – ${formatKm(subEnd)} (${subMeters} m)`
    };
  });

  // Lines and Tracks present in interval
  const trackMap = new Map<string, TrackMaster>();
  const lineSet = new Set<string>();

  detectedSections.forEach(sec => {
    sec.tracks.forEach(trk => {
      if (Math.max(trk.startKm, startKm) < Math.min(trk.endKm, endKm) && !trackMap.has(trk.trackName)) {
        trackMap.set(trk.trackName, trk);
        lineSet.add(trk.lineName);
      }
    });
  });

  // Asset Discovery & Proximity Classification (Specification Section 16)
  // Classifications: WITHIN_RANGE, INTERSECTS_RANGE, NEARBY (<= 100m)
  const PROXIMITY_TOLERANCE_KM = 0.100; // 100 meters

  const classifiedAssets = ASSETS.map(asset => {
    const assetKm = asset.km;
    if (assetKm >= startKm && assetKm <= endKm) {
      return {
        ...asset,
        proximity: 'WITHIN_RANGE' as const,
        distanceMeters: 0,
        isAffected: true
      };
    } else if (Math.abs(assetKm - startKm) <= 0.005 || Math.abs(assetKm - endKm) <= 0.005) {
      return {
        ...asset,
        proximity: 'INTERSECTS_RANGE' as const,
        distanceMeters: Math.round(Math.min(Math.abs(assetKm - startKm), Math.abs(assetKm - endKm)) * 1000),
        isAffected: true
      };
    } else if (assetKm < startKm && (startKm - assetKm) <= PROXIMITY_TOLERANCE_KM) {
      const dist = Math.round((startKm - assetKm) * 1000);
      return {
        ...asset,
        proximity: 'NEARBY' as const,
        distanceMeters: dist,
        isAffected: false
      };
    } else if (assetKm > endKm && (assetKm - endKm) <= PROXIMITY_TOLERANCE_KM) {
      const dist = Math.round((assetKm - endKm) * 1000);
      return {
        ...asset,
        proximity: 'NEARBY' as const,
        distanceMeters: dist,
        isAffected: false
      };
    }
    return null;
  }).filter((a): a is NonNullable<typeof a> => a !== null);

  const affectedAssetsList = classifiedAssets.filter(a => a.isAffected);
  const nearbyAssetsList = classifiedAssets.filter(a => !a.isAffected);

  const byDepartment = {
    'P.Way': affectedAssetsList.filter(a => a.department === 'P.Way'),
    'S&T': affectedAssetsList.filter(a => a.department === 'S&T'),
    'TRD': affectedAssetsList.filter(a => a.department === 'TRD'),
  };

  // Station limits & Context (Specification Section 17)
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

  const stationLimitsAffected = STATIONS.filter(s => Math.max(s.yardLimitStartKm, startKm) < Math.min(s.yardLimitEndKm, endKm));
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

  let stationContextType: 'WITHIN_STATION_LIMITS' | 'BETWEEN_STATIONS' | 'CROSSING_STATION_LIMITS' | 'NEAR_STATION' = 'BETWEEN_STATIONS';
  if (stationLimitsAffected.length === 1 && startKm >= stationLimitsAffected[0].yardLimitStartKm && endKm <= stationLimitsAffected[0].yardLimitEndKm) {
    stationContextType = 'WITHIN_STATION_LIMITS';
  } else if (stationLimitsAffected.length > 1) {
    stationContextType = 'CROSSING_STATION_LIMITS';
  } else if (stationLimitsAffected.length === 1) {
    stationContextType = 'CROSSING_STATION_LIMITS';
  } else if (Math.min(...STATIONS.map(s => Math.min(Math.abs(s.km - startKm), Math.abs(s.km - endKm)))) < 1.0) {
    stationContextType = 'NEAR_STATION';
  }

  return {
    isValid: true,
    startKm,
    endKm,
    startMetres,
    endMetres,
    startKmDisplay: formatKm(startKm),
    endKmDisplay: formatKm(endKm),
    affectedLengthKm,
    affectedLengthMeters,
    isCrossSection,
    crossSectionBreakdown,
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
    stationContext: {
      type: stationContextType,
      display: isStationLimitIntersection 
        ? `Station Limit Intersection: ${stationLimitsAffected.map(s => `${s.name} (${s.code})`).join(', ')}` 
        : `Between ${betweenStations}`,
      primaryStationCode: primaryStation.code,
      primaryStationName: primaryStation.name,
      betweenStations,
      stationLimitsAffected: stationLimitsAffected.map(s => `${s.name} (${s.code})`)
    },
    assets: {
      total: affectedAssetsList.length,
      list: affectedAssetsList,
      nearby: nearbyAssetsList,
      byDepartment,
    },
    locationConfidence: 'HIGH' as const,
    source: 'INFRASTRUCTURE_MASTER' as const,
    provenance: {
      source: 'INFRASTRUCTURE_MASTER',
      authority: 'South Central Railway / Vijayawada Division (BZA)',
      verifiedAt: new Date().toISOString()
    }
  };
}

// Additional Service Query Functions (Specification Section 38)

export function getSections(corridorCode?: string): SectionMaster[] {
  if (!corridorCode) return SECTIONS;
  return SECTIONS.filter(s => s.corridorCode.toUpperCase() === corridorCode.toUpperCase());
}

export function resolveSections(startKm: number, endKm: number) {
  return SECTIONS.filter(sec => Math.max(sec.startKm, startKm) < Math.min(sec.endKm, endKm));
}

export function getLines(startKm?: number, endKm?: number): string[] {
  const lineSet = new Set<string>();
  SECTIONS.forEach(sec => {
    sec.tracks.forEach(trk => {
      if (startKm !== undefined && endKm !== undefined) {
        if (Math.max(trk.startKm, startKm) < Math.min(trk.endKm, endKm)) {
          lineSet.add(trk.lineName);
        }
      } else {
        lineSet.add(trk.lineName);
      }
    });
  });
  return Array.from(lineSet);
}

export function getTracks(startKm?: number, endKm?: number): TrackMaster[] {
  const trackMap = new Map<string, TrackMaster>();
  SECTIONS.forEach(sec => {
    sec.tracks.forEach(trk => {
      if (startKm !== undefined && endKm !== undefined) {
        if (Math.max(trk.startKm, startKm) < Math.min(trk.endKm, endKm) && !trackMap.has(trk.trackId)) {
          trackMap.set(trk.trackId, trk);
        }
      } else if (!trackMap.has(trk.trackId)) {
        trackMap.set(trk.trackId, trk);
      }
    });
  });
  return Array.from(trackMap.values());
}

export function getAssets(department?: string): InfrastructureAsset[] {
  if (!department) return ASSETS;
  return ASSETS.filter(a => a.department.toLowerCase() === department.toLowerCase());
}

export function getAssetsByRange(startKm: number, endKm: number, trackName?: string, department?: string) {
  return ASSETS.filter(a => {
    const inKm = a.km >= startKm && a.km <= endKm;
    const inTrack = !trackName || a.trackName.toLowerCase().includes(trackName.toLowerCase());
    const inDept = !department || a.department.toLowerCase() === department.toLowerCase();
    return inKm && inTrack && inDept;
  });
}

export function getStationsList() {
  return STATIONS;
}
