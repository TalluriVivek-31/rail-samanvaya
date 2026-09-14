// Railway Location & Chainage Utility Functions
// Indian Railways Standard: KM Chainage (e.g. "KM 12/400" = 12.400 km)

/**
 * Parses user input in formats like:
 * - "12/400" -> 12.400
 * - "KM 12/400" -> 12.400
 * - "12.400" -> 12.400
 * - "12+400" -> 12.400
 * - "12" -> 12.000
 * Returns NaN if input is invalid.
 */
export function parseRailwayKm(input: string | number): number {
  if (typeof input === 'number') {
    return isNaN(input) ? NaN : Math.round(input * 1000) / 1000;
  }
  if (!input || typeof input !== 'string') return NaN;

  // Clean string: trim, remove "KM", "km", spaces
  let clean = input.trim().replace(/^km\s*/i, '').replace(/\s+/g, '');
  if (!clean) return NaN;

  // Format 1: Slash format e.g. "12/400", "12/4"
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 2) {
      const kmPart = parseInt(parts[0], 10);
      let meterPartStr = parts[1];
      if (isNaN(kmPart)) return NaN;

      // Handle meter fractions: "12/4" -> 12.400, "12/40" -> 12.400, "12/400" -> 12.400
      let meters = 0;
      if (meterPartStr.length === 1) meters = parseInt(meterPartStr, 10) * 100;
      else if (meterPartStr.length === 2) meters = parseInt(meterPartStr, 10) * 10;
      else meters = parseInt(meterPartStr.slice(0, 3), 10);

      if (isNaN(meters)) return NaN;
      return kmPart + meters / 1000;
    }
  }

  // Format 2: Plus format e.g. "12+400"
  if (clean.includes('+')) {
    const parts = clean.split('+');
    if (parts.length === 2) {
      const kmPart = parseInt(parts[0], 10);
      const meters = parseInt(parts[1], 10);
      if (isNaN(kmPart) || isNaN(meters)) return NaN;
      return kmPart + meters / 1000;
    }
  }

  // Format 3: Decimal or integer e.g. "12.400", "12"
  const val = parseFloat(clean);
  return isNaN(val) ? NaN : Math.round(val * 1000) / 1000;
}

/**
 * Formats a decimal KM to standard Indian Railways chainage string
 * e.g. 12.400 -> "KM 12/400"
 * e.g. 25.050 -> "KM 25/050"
 */
export function formatRailwayKm(km: number, prefix: boolean = true): string {
  if (isNaN(km) || km === null || km === undefined) return 'KM --/---';
  const kmInt = Math.floor(km);
  const meters = Math.round((km - kmInt) * 1000);
  const paddedMeters = String(meters).padStart(3, '0');
  return prefix ? `KM ${kmInt}/${paddedMeters}` : `${kmInt}/${paddedMeters}`;
}

/**
 * Calculates affected length in both kilometers and meters
 */
export function calculateAffectedLength(startKm: number, endKm: number): {
  lengthKm: number;
  lengthMeters: number;
  display: string;
} {
  if (isNaN(startKm) || isNaN(endKm)) {
    return { lengthKm: 0, lengthMeters: 0, display: '0 m' };
  }
  const diff = Math.abs(endKm - startKm);
  const lengthKm = Math.round(diff * 1000) / 1000;
  const lengthMeters = Math.round(lengthKm * 1000);

  let display = '';
  if (lengthMeters >= 1000) {
    display = `${lengthKm.toFixed(3)} km (${lengthMeters.toLocaleString()} m)`;
  } else {
    display = `${lengthMeters} m`;
  }

  return { lengthKm, lengthMeters, display };
}

/**
 * Validates KM range against corridor bounds and standard railway safety rules
 */
export function validateKmRange(
  startKm: number, 
  endKm: number, 
  minCorridorKm: number = 0.0, 
  maxCorridorKm: number = 3000.0
): { isValid: boolean; errorMessage?: string } {
  if (isNaN(startKm) || isNaN(endKm)) {
    return { isValid: false, errorMessage: 'Please enter valid Start and End KM chainage numbers.' };
  }

  if (startKm < minCorridorKm || endKm > maxCorridorKm) {
    return {
      isValid: false,
      errorMessage: `Location outside configured railway infrastructure (KM ${minCorridorKm.toFixed(3)} – KM ${maxCorridorKm.toFixed(3)}). Please enter a valid railway KM.`
    };
  }

  if (startKm >= endKm) {
    return {
      isValid: false,
      errorMessage: `Start KM (${formatRailwayKm(startKm)}) must be strictly less than End KM (${formatRailwayKm(endKm)}).`
    };
  }

  const diffMeters = (endKm - startKm) * 1000;
  if (diffMeters < 10) {
    return {
      isValid: false,
      errorMessage: 'Maintenance work span must be at least 10 metres.'
    };
  }

  if (diffMeters > 35000) {
    return {
      isValid: false,
      errorMessage: 'Single block request cannot exceed 35 km length. Split into multiple sectional possessions.'
    };
  }

  return { isValid: true };
}

export interface CrossSectionAnalysis {
  isCrossSection: boolean;
  sections: string[];
  sectionNames: string[];
  boundaryKms: number[];
  warningMessage?: string;
  coordinationProtocol?: string;
}

export const CORRIDOR_SECTIONS = [
  { id: 'SEC-A', name: 'SEC-A (Vijayawada – Mangalagiri)', startKm: 0.0, endKm: 25.0 },
  { id: 'SEC-B', name: 'SEC-B (Mangalagiri – Guntur Jn)', startKm: 25.0, endKm: 52.5 },
  { id: 'SEC-C', name: 'SEC-C (Guntur Jn – Tenali Jn)', startKm: 52.5, endKm: 80.0 }
];

/**
 * Detects whether a maintenance work zone crosses sectional boundaries between
 * adjacent railway sections (e.g. KM 24/800 to 26/200 spanning SEC-A and SEC-B).
 * Automatically identifies all spanned sections and flags multi-station master /
 * dual section controller coordination requirements.
 */
export function detectCrossSectionSpans(startKm: number, endKm: number): CrossSectionAnalysis {
  if (isNaN(startKm) || isNaN(endKm) || startKm >= endKm) {
    return {
      isCrossSection: false,
      sections: [],
      sectionNames: [],
      boundaryKms: []
    };
  }

  const spanned = CORRIDOR_SECTIONS.filter(sec => {
    return Math.max(startKm, sec.startKm) < Math.min(endKm, sec.endKm);
  });

  const sections = spanned.map(s => s.id);
  const sectionNames = spanned.map(s => s.name);
  const isCrossSection = sections.length > 1;

  const boundaryKms: number[] = [];
  if (isCrossSection) {
    for (let i = 0; i < spanned.length - 1; i++) {
      boundaryKms.push(spanned[i].endKm);
    }
  }

  let warningMessage: string | undefined;
  let coordinationProtocol: string | undefined;

  if (isCrossSection) {
    const boundaryStr = boundaryKms.map(km => formatRailwayKm(km)).join(', ');
    warningMessage = `CROSS-SECTION SPAN: Maintenance work spans multiple railway operational sections (${sections.join(' & ')} across boundary at ${boundaryStr}).`;
    coordinationProtocol = `Dual Section Controller protocol mandated under G&SR Chapter XV. Block memo exchange required across both adjacent Station Masters and Divisional Train Control Desks (${sections.join(', ')}).`;
  }

  return {
    isCrossSection,
    sections,
    sectionNames,
    boundaryKms,
    warningMessage,
    coordinationProtocol
  };
}

