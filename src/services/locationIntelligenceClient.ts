// src/services/locationIntelligenceClient.ts
// Frontend Client for Rail Samnvay Location Intelligence Engine (SIH PS 26027)
// Dynamically queries the backend proxy endpoint at /api/infrastructure/location-intelligence
// Combines Infrastructure Master + OpenRailwayMap GIS + RailRadar Live Train Movements

import type { LocationIntelligenceData } from '../types/infrastructure';
import type { LiveTrainPosition } from '../types/samnvay';

export interface LocationIntelligenceResponse {
  success: boolean;
  data: LocationIntelligenceData | null;
  error?: string;
  timestamp: string;
}

/**
 * Fetch unified railway location intelligence from backend engine.
 */
export async function fetchLocationIntelligence(
  startLocation: string,
  endLocation: string,
  track: string = 'UP Main',
  liveTrains: LiveTrainPosition[] = []
): Promise<LocationIntelligenceData | null> {
  try {
    const res = await fetch('/api/infrastructure/location-intelligence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startLocation,
        endLocation,
        track,
        liveTrains
      })
    });

    if (!res.ok) {
      console.warn(`[LocationIntelligence] HTTP ${res.status}`);
      return null;
    }

    const json: LocationIntelligenceResponse = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error('[LocationIntelligence] Failed to query location intelligence service:', err);
    return null;
  }
}
