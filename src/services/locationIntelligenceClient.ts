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
 * Fetch unified railway location intelligence from backend engine with safe JSON checking.
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

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const json: LocationIntelligenceResponse = await res.json();
      return json.success ? json.data : null;
    }
    return null;
  } catch (err) {
    console.warn('[LocationIntelligence] Offline or static hosting detected, using client-side infrastructure master.');
    return null;
  }
}
