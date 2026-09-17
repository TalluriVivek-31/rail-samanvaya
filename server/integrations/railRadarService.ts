import { getDemoTrainStatus, getDemoStationBoard } from '../data/demoTrains.js';

export interface ServiceResponse {
  source: 'LIVE' | 'DEMO' | 'UNAVAILABLE';
  data: any;
  timestamp: string;
  upstreamUpdatedAt?: string;
  cached?: boolean;
  cacheExpiresAt?: string;
  error?: string;
}

interface CacheEntry {
  response: ServiceResponse;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<ServiceResponse>>();

const CACHE_TTL = 60 * 1000; // 60 seconds (prevents hitting 10 req/min rate limit across corridor trains)
const API_TIMEOUT = 8 * 1000; // 8 seconds timeout

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Clear cache for a specific key or entire cache
 */
export function clearRailRadarCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    cache.clear();
    console.log('[RailRadar] Entire cache invalidated');
  } else {
    for (const key of cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        cache.delete(key);
        console.log(`[RailRadar] Invalidation: Removed cache for ${key}`);
      }
    }
  }
}

/**
 * Helper to get date string formatted as YYYY-MM-DD in Asia/Kolkata (IST) timezone
 */
export function getISTDateString(offsetDays: number = 0): string {
  const now = new Date();
  if (offsetDays !== 0) {
    now.setDate(now.getDate() + offsetDays);
  }
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/**
 * Validates and normalizes raw RailRadar train live telemetry
 */
export function normalizeTrainData(raw: any, trainNumber: string, expectedDate?: string): any {
  if (!raw) return null;
  const t = raw.data || raw;
  if (!t || typeof t !== 'object') return null;

  // RULE 9: VERIFY TRAIN IDENTITY
  const returnedNumber = String(t.trainNumber || t.train_number || t.train?.number || '');
  if (returnedNumber && trainNumber && returnedNumber !== String(trainNumber)) {
    console.warn(`[RailRadar] Identity mismatch: requested ${trainNumber}, returned ${returnedNumber}`);
    return null;
  }

  const resolvedNumber = returnedNumber || String(trainNumber);

  // RUN/JOURNEY IDENTITY EXTRACTION (CASE B: explicit origin/service date)
  const rawStartDate = t.startDate || t.start_date || t.originDate || t.origin_date || t.serviceDate || t.service_date;
  const serviceDate = rawStartDate ? String(rawStartDate).split('T')[0] : undefined;

  // If a specific date was expected, verify the run identity matches
  if (expectedDate && serviceDate && serviceDate !== expectedDate) {
    console.warn(`[RailRadar] Run date mismatch for train ${trainNumber}: expected ${expectedDate}, returned ${serviceDate}`);
    return null;
  }

  // Find exact current and upcoming station from route sequence if present
  const currSeq = t.currentLocation?.sequence;
  const route = Array.isArray(t.route) ? t.route : [];
  const currStop = currSeq !== undefined ? route.find((r: any) => r.sequence === currSeq) : null;
  const nextStop = currSeq !== undefined ? route.find((r: any) => r.sequence === currSeq + 1) : null;
  const nextHalt = currSeq !== undefined ? route.find((r: any) => r.isHalt && r.sequence > currSeq) : null;

  // RULE 3 & 5: VERIFY DELAY UNIT & STORE CANONICAL DELAYSECONDS
  // RailRadar source provides delayMinutes (e.g. 103 minutes = 1h 43m)
  // Store both canonical delaySeconds and delayMinutes unambiguously
  let delayMinutes = 0;
  let delaySeconds = 0;

  if (typeof t.delaySeconds === 'number' && !isNaN(t.delaySeconds)) {
    delaySeconds = Math.round(t.delaySeconds);
    delayMinutes = Math.round(delaySeconds / 60);
  } else if (typeof t.delay_seconds === 'number' && !isNaN(t.delay_seconds)) {
    delaySeconds = Math.round(t.delay_seconds);
    delayMinutes = Math.round(delaySeconds / 60);
  } else if (typeof t.delay_in_seconds === 'number' && !isNaN(t.delay_in_seconds)) {
    delaySeconds = Math.round(t.delay_in_seconds);
    delayMinutes = Math.round(delaySeconds / 60);
  } else {
    const rawMin = typeof t.delayMinutes === 'number'
      ? t.delayMinutes
      : typeof t.delay_in_minutes === 'number' 
      ? t.delay_in_minutes 
      : typeof t.currentLocation?.delayMinutes === 'number'
      ? t.currentLocation.delayMinutes
      : typeof t.delay === 'number'
      ? t.delay
      : typeof currStop?.delayDeparture === 'number'
      ? currStop.delayDeparture
      : typeof currStop?.delayArrival === 'number'
      ? currStop.delayArrival
      : null;

    if (rawMin !== null && !isNaN(Number(rawMin))) {
      delayMinutes = Math.round(Number(rawMin));
      delaySeconds = delayMinutes * 60;
    }
  }

  // Extract speed: check speed_kmph, speedKmph, speedToNextStationKmph, or train avgSpeed
  let speed = typeof t.speed_kmph === 'number'
    ? t.speed_kmph
    : typeof t.speedKmph === 'number'
    ? t.speedKmph
    : typeof t.speed === 'number'
    ? t.speed
    : typeof currStop?.speedToNextStationKmph === 'number'
    ? Math.round(currStop.speedToNextStationKmph)
    : typeof nextStop?.speedToNextStationKmph === 'number'
    ? Math.round(nextStop.speedToNextStationKmph)
    : typeof t.train?.avgSpeed === 'number'
    ? Math.round(t.train.avgSpeed)
    : 0;

  speed = Math.max(0, typeof speed === 'number' && !isNaN(speed) ? speed : 0);

  const distanceTravelled = typeof t.currentLocation?.distanceFromOriginKm === 'number'
    ? t.currentLocation.distanceFromOriginKm
    : typeof t.current_km === 'number'
    ? t.current_km
    : typeof t.currentKm === 'number'
    ? t.currentKm
    : 0;

  const currentStation = t.currentLocation?.stationCode || t.current_station || t.currentStation || (currStop?.stationCode) || '—';
  const currentStationName = t.currentLocation?.stationName || (currStop?.stationName) || currentStation;

  // Next immediate station (block section ahead)
  const nextStation = (nextStop?.stationCode) || t.nextHalt?.stationCode || t.next_station || t.nextStation || '—';
  const nextStationName = (nextStop?.stationName) || (nextHalt?.stationName) || nextStation;

  // Next scheduled commercial halt
  const nextHaltStation = (nextHalt?.stationCode) || t.nextHalt?.stationCode || nextStation;

  const lastReportedStation = t.previousHalt?.stationCode || t.last_reported_station || t.lastReportedStation || currentStation;

  // Upstream RailRadar timestamp - strictly preserve upstream telemetry timestamp
  const rawUpstream = t.lastUpdatedAt || t.telemetry_updated_at || t.last_updated || t.lastUpdated || t.updated_at;
  let upstreamUpdated: string | undefined = undefined;
  if (rawUpstream) {
    const parsed = new Date(rawUpstream);
    if (!isNaN(parsed.getTime())) {
      upstreamUpdated = rawUpstream;
    }
  }

  // Extract scheduled and expected arrival time at next stop or halt
  let schArrival = '—';
  let expArrival = '—';

  // Format ISO timestamp to HH:MM in Indian Standard Time (Asia/Kolkata)
  const formatTime = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      }
    } catch {}
    return '';
  };

  const targetNext = nextStop || nextHalt;
  if (targetNext) {
    schArrival = formatTime(targetNext.scheduledArrival) || formatTime(targetNext.scheduledDeparture) || '—';
    expArrival = formatTime(targetNext.actualArrival) || formatTime(targetNext.actualDeparture) || schArrival;
  } else if (t.scheduled_arrival || t.scheduledArrival) {
    schArrival = String(t.scheduled_arrival || t.scheduledArrival);
    expArrival = String(t.expected_arrival || t.expectedArrival || schArrival);
  }

  // Scheduled and expected arrival at commercial halt
  let nextHaltEta = '—';
  if (nextHalt) {
    nextHaltEta = formatTime(nextHalt.actualArrival) || formatTime(nextHalt.scheduledArrival) || '—';
  }

  return {
    trainNumber: resolvedNumber,
    trainName: String(t.trainName || t.train_name || t.train?.name || `Train ${resolvedNumber}`),
    runId: t.runId || t.run_id || null,
    journeyId: t.journeyId || t.journey_id || null,
    serviceDate: serviceDate,
    originDate: serviceDate,
    startDate: serviceDate,
    telemetryTimestamp: upstreamUpdated,
    currentStation: String(currentStation),
    currentStationName: String(currentStationName),
    nextStation: String(nextStation),
    nextStationName: String(nextStationName),
    nextHaltStation: String(nextHaltStation),
    nextHaltName: String(nextHalt?.stationName || t.nextHalt?.stationName || nextHaltStation),
    nextHaltEta: String(nextHaltEta),
    lastReportedStation: String(lastReportedStation),
    direction: (t.direction === 'DN' ? 'DN' : 'UP') as 'UP' | 'DN',
    delayMinutes: delayMinutes,
    delaySeconds: delaySeconds,
    scheduledArrival: schArrival,
    expectedArrival: expArrival,
    currentKm: distanceTravelled,
    distanceTravelledKm: distanceTravelled,
    latitude: (typeof t.latitude === 'number' && !isNaN(t.latitude)) ? t.latitude : 
              (typeof t.currentLocation?.latitude === 'number' && !isNaN(t.currentLocation.latitude)) ? t.currentLocation.latitude :
              (typeof t.lat === 'number' && !isNaN(t.lat)) ? t.lat : undefined,
    longitude: (typeof t.longitude === 'number' && !isNaN(t.longitude)) ? t.longitude : 
               (typeof t.currentLocation?.longitude === 'number' && !isNaN(t.currentLocation.longitude)) ? t.currentLocation.longitude :
               (typeof t.lng === 'number' && !isNaN(t.lng)) ? t.lng :
               (typeof t.lon === 'number' && !isNaN(t.lon)) ? t.lon : undefined,
    speedKmph: speed,
    platform: (t.platform ? Number(t.platform) : null) || (targetNext?.platform ? Number(targetNext.platform) : null),
    status: String(t.status || t.currentLocation?.status || 'RUNNING').toUpperCase(),
    lastUpdated: upstreamUpdated || undefined,
    upstreamUpdatedAt: upstreamUpdated,
    fetchedAt: new Date().toISOString()
  };
}

/**
 * Validates and normalizes raw RailRadar station board telemetry
 */
function normalizeStationData(raw: any): any[] {
  if (!raw) return [];
  const payload = raw.data || raw;
  const list = Array.isArray(payload) ? payload : (payload.trains || []);
  if (!Array.isArray(list)) return [];

  return list.map((item: any) => {
    if (item.trainNumber && item.scheduledTime) {
      return item;
    }

    const train = item.train || {};
    const stop = item.stop || {};
    const live = item.live || {};

    const delay = typeof live.delayMinutes === 'number'
      ? live.delayMinutes
      : typeof live.delay === 'number'
      ? live.delay
      : parseInt(live.delayMinutes || live.delay, 10) || 0;

    const schTime = stop.arrival || stop.departure || '14:30';
    let expTime = schTime;
    if (live.expectedArrivalTime) {
      try {
        const d = new Date(live.expectedArrivalTime);
        if (!isNaN(d.getTime())) {
          expTime = d.toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        }
      } catch {}
    } else if (live.expectedDepartureTime) {
      try {
        const d = new Date(live.expectedDepartureTime);
        if (!isNaN(d.getTime())) {
          expTime = d.toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        }
      } catch {}
    }

    const platformNum = stop.platform ? parseInt(stop.platform, 10) : null;

    return {
      trainNumber: String(train.number || train.trainNumber || item.trainNumber || '00000'),
      trainName: String(train.name || train.trainName || item.trainName || 'Express'),
      type: (stop.departure && !stop.arrival) ? 'DEPARTURE' : 'ARRIVAL',
      scheduledTime: schTime,
      expectedTime: expTime,
      delayMinutes: delay,
      platform: (platformNum !== null && !isNaN(platformNum)) ? platformNum : null,
      status: delay > 0 ? 'DELAYED' : 'ON_TIME',
      direction: (item.direction === 'DN' || train.direction === 'DN') ? 'DN' : 'UP'
    };
  });
}

/**
 * Retrieves live train status with strictly enforced 30s TTL and no fallback leakage
 */
export async function getLiveTrainStatus(
  trainNumber: string, 
  options: { forceRefresh?: boolean; mode?: 'live' | 'demo'; date?: string } = {}
): Promise<ServiceResponse> {
  const { forceRefresh = false, mode = 'live', date } = options;
  const cacheKey = date ? `train:${trainNumber}:${date}` : `train:${trainNumber}:current`;

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[RailRadar] Cache HIT: ${cacheKey} (expires in ${Math.round((cached.expiresAt - Date.now()) / 1000)}s)`);
      return { 
        ...cached.response, 
        cached: true,
        cacheExpiresAt: new Date(cached.expiresAt).toISOString()
      };
    }
  } else {
    clearRailRadarCache(`train:${trainNumber}`);
    console.log(`[RailRadar] Manual Invalidation: Evicted all cache entries for train:${trainNumber}`);
  }

  if (inFlightRequests.has(cacheKey)) {
    console.log(`[RailRadar] Joining in-flight request for: ${cacheKey}`);
    return inFlightRequests.get(cacheKey) as Promise<ServiceResponse>;
  }

  const promise = (async (): Promise<ServiceResponse> => {
    const rawKey = process.env.RAILRADAR_API_KEY || '';
    const apiKey = rawKey.trim().replace(/^Bearer\s+/i, '');

    if (mode === 'demo') {
      const demo = getDemoTrainStatus(trainNumber);
      if (demo) {
        const demoMins = typeof (demo as any).delayMinutes === 'number' ? (demo as any).delayMinutes : 0;
        return {
          source: 'DEMO',
          data: {
            ...demo,
            delayMinutes: demoMins,
            delaySeconds: demoMins * 60
          },
          timestamp: new Date().toISOString(),
          upstreamUpdatedAt: (demo as any).upstreamUpdatedAt || new Date().toISOString(),
          cached: false
        };
      }
      // Strictly return 'Train data unavailable' if train is not part of the demo dataset
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: new Date().toISOString(),
        error: 'Train data unavailable'
      };
    }

    if (!apiKey) {
      console.warn(`[RailRadar] LIVE mode requested for ${trainNumber} but RAILRADAR_API_KEY is not configured.`);
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: new Date().toISOString(),
        error: 'RAILRADAR_API_KEY not configured on server. Live RailRadar telemetry is unavailable.'
      };
    }

    try {
      const fetchUpstreamDate = async (targetDate?: string): Promise<{ json: any; normalized: any } | null> => {
        const url = targetDate 
          ? `https://api.railradar.in/v1/trains/${encodeURIComponent(trainNumber)}/live?date=${encodeURIComponent(targetDate)}`
          : `https://api.railradar.in/v1/trains/${encodeURIComponent(trainNumber)}/live`;

        console.log(`[RailRadar] Upstream request started: GET ${url}`);
        
        const response = await fetchWithTimeout(
          url,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'x-api-key': apiKey,
              'Accept': 'application/json'
            }
          },
          API_TIMEOUT
        );

        if (!response.ok) {
          console.warn(`[RailRadar] Upstream HTTP ${response.status} for train ${trainNumber} (date=${targetDate || 'default'})`);
          return null;
        }

        const json = await response.json();
        if (!json || json.success === false || !json.data) {
          return null;
        }

        const normalized = normalizeTrainData(json, trainNumber, targetDate);
        if (!normalized) {
          return null;
        }

        return { json, normalized };
      };

      let activeResult: { json: any; normalized: any } | null = null;

      if (date) {
        // Explicit date requested: fetch that specific journey run
        activeResult = await fetchUpstreamDate(date);
      } else {
        // Automatic Run Resolution: "Which train is currently running?"
        // Step 1: Check today's service date in Asia/Kolkata (IST)
        const todayIST = getISTDateString(0);
        const todayResult = await fetchUpstreamDate(todayIST);

        if (todayResult) {
          const status = (todayResult.normalized.status || '').toUpperCase();
          const isRunning = status === 'RUNNING' || status === 'IN_TRANSIT' || status === 'DEPARTED';
          if (isRunning) {
            // Today's train has departed and is actively running on the tracks
            activeResult = todayResult;
          }
        }

        // Step 2: If today's train is not actively running (e.g. not-started, scheduled, or 404 for today),
        // check yesterday's date in IST (multi-day or overnight trains originating yesterday)
        if (!activeResult) {
          const yesterdayIST = getISTDateString(-1);
          const yesterdayResult = await fetchUpstreamDate(yesterdayIST);
          if (yesterdayResult) {
            const statusYest = (yesterdayResult.normalized.status || '').toUpperCase();
            const isYestRunning = statusYest === 'RUNNING' || statusYest === 'IN_TRANSIT' || statusYest === 'DEPARTED';
            if (isYestRunning) {
              // Yesterday's train is actively running right now (e.g. overnight cross-midnight or multi-day)
              activeResult = yesterdayResult;
            } else if (todayResult) {
              // If yesterday is completed, but today has a valid scheduled run (not-started), use today's run
              activeResult = todayResult;
            }
          } else if (todayResult) {
            // Yesterday had no route, but today has a scheduled run
            activeResult = todayResult;
          }
        }

        // Step 3 (Fallback): If date-parameterized queries were unavailable, query unparameterized endpoint
        if (!activeResult) {
          const fallbackResult = await fetchUpstreamDate();
          if (fallbackResult) {
            activeResult = fallbackResult;
          }
        }
      }

      if (!activeResult || !activeResult.normalized) {
        return {
          source: 'UNAVAILABLE',
          data: null,
          timestamp: new Date().toISOString(),
          error: 'Train data unavailable'
        };
      }

      const normalized = activeResult.normalized;
      console.log(`[RailRadar] Upstream resolved run for ${trainNumber}: Originated = ${normalized.startDate}, Status = ${normalized.status}, Delay = ${normalized.delayMinutes}m, Speed = ${normalized.speedKmph} km/h, Location = ${normalized.currentStationName}, Updated = ${normalized.upstreamUpdatedAt}`);

      return {
        source: 'LIVE',
        data: normalized,
        timestamp: new Date().toISOString(),
        upstreamUpdatedAt: normalized.upstreamUpdatedAt,
        cached: false
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Network error';
      console.error(`[RailRadar] Upstream fetch failed for train ${trainNumber}:`, msg);
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: new Date().toISOString(),
        error: 'Train data unavailable'
      };
    }
  })();

  inFlightRequests.set(cacheKey, promise);

  try {
    const result = await promise;
    if (result.source === 'LIVE' && result.data !== null) {
      const expiresAt = Date.now() + CACHE_TTL;
      const actualDate = result.data.startDate || result.data.serviceDate;
      // Store under canonical cacheKey (current or date-specific)
      cache.set(cacheKey, {
        response: result,
        expiresAt
      });
      // Also cache under train:${trainNumber}:${actualDate} if different from cacheKey
      if (actualDate && cacheKey !== `train:${trainNumber}:${actualDate}`) {
        cache.set(`train:${trainNumber}:${actualDate}`, {
          response: result,
          expiresAt
        });
      }
      result.cacheExpiresAt = new Date(expiresAt).toISOString();
    }
    return result;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

/**
 * Retrieves live station board with 30s TTL
 */
export async function getLiveStationBoard(
  stationCode: string,
  options: { forceRefresh?: boolean; mode?: 'live' | 'demo' } = {}
): Promise<ServiceResponse> {
  const { forceRefresh = false, mode = 'live' } = options;
  const cacheKey = `station:${stationCode.toUpperCase()}`;

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.response, cached: true, cacheExpiresAt: new Date(cached.expiresAt).toISOString() };
    }
  } else {
    cache.delete(cacheKey);
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<ServiceResponse>;
  }

  const promise = (async (): Promise<ServiceResponse> => {
    const rawKey = process.env.RAILRADAR_API_KEY || '';
    const apiKey = rawKey.trim().replace(/^Bearer\s+/i, '');

    if (mode === 'demo') {
      const demo = getDemoStationBoard(stationCode.toUpperCase());
      const defaultBoard = [
        { trainNumber: '12627', trainName: 'Karnataka Express', type: 'ARRIVAL', scheduledTime: '14:20', expectedTime: '14:32', delayMinutes: 12, platform: 1, status: 'DELAYED', direction: 'UP' },
        { trainNumber: '12723', trainName: 'Telangana Express', type: 'DEPARTURE', scheduledTime: '14:40', expectedTime: '14:40', delayMinutes: 0, platform: 1, status: 'ON_TIME', direction: 'UP' },
        { trainNumber: '20834', trainName: 'Vande Bharat Express', type: 'ARRIVAL', scheduledTime: '15:30', expectedTime: '15:30', delayMinutes: 0, platform: 2, status: 'ON_TIME', direction: 'UP' }
      ];
      return {
        source: 'DEMO',
        data: demo || defaultBoard,
        timestamp: new Date().toISOString(),
        upstreamUpdatedAt: new Date().toISOString(),
        cached: false
      };
    }

    if (!apiKey) {
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: new Date().toISOString(),
        error: 'RAILRADAR_API_KEY not configured on server. Live RailRadar telemetry is unavailable.'
      };
    }

    try {
      const response = await fetchWithTimeout(
        `https://api.railradar.in/v1/stations/${encodeURIComponent(stationCode.toUpperCase())}/live`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'x-api-key': apiKey,
            'Accept': 'application/json'
          }
        },
        API_TIMEOUT
      );

      if (!response.ok) {
        return {
          source: 'UNAVAILABLE',
          data: null,
          timestamp: new Date().toISOString(),
          error: `Upstream RailRadar station board returned HTTP ${response.status} ${response.statusText}`
        };
      }

      const json = await response.json();
      const normalized = normalizeStationData(json);

      return {
        source: 'LIVE',
        data: normalized,
        timestamp: new Date().toISOString(),
        cached: false
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Network error';
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: new Date().toISOString(),
        error: `Failed to connect to RailRadar station board: ${msg}`
      };
    }
  })();

  inFlightRequests.set(cacheKey, promise);

  try {
    const result = await promise;
    if (result.source === 'LIVE' && result.data !== null) {
      cache.set(cacheKey, {
        response: result,
        expiresAt: Date.now() + CACHE_TTL
      });
    }
    return result;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

/**
 * Retrieves train route with cache
 */
export async function getLiveTrainRoute(
  trainNumber: string,
  options: { forceRefresh?: boolean; mode?: 'live' | 'demo' } = {}
): Promise<ServiceResponse> {
  const { forceRefresh = false, mode = 'live' } = options;
  const cacheKey = `route:${trainNumber}:${mode}`;

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.response, cached: true, cacheExpiresAt: new Date(cached.expiresAt).toISOString() };
    }
  } else {
    cache.delete(cacheKey);
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<ServiceResponse>;
  }

  const promise = (async (): Promise<ServiceResponse> => {
    const rawKey = process.env.RAILRADAR_API_KEY || '';
    const apiKey = rawKey.trim().replace(/^Bearer\s+/i, '');

    if (mode === 'demo') {
      const simulatedRoute = {
        trainNumber,
        trainName: 'Express Service',
        origin: 'BZA',
        destination: 'MAS',
        stations: [
          { stationCode: 'BZA', stationName: 'Vijayawada Jn', arrival: null, departure: '14:00', haltMinutes: 0, distanceKm: 0 },
          { stationCode: 'KCC', stationName: 'Krishna Canal Jn', arrival: '14:08', departure: '14:10', haltMinutes: 2, distanceKm: 5.2 },
          { stationCode: 'MAG', stationName: 'Mangalagiri', arrival: '14:22', departure: '14:24', haltMinutes: 2, distanceKm: 12.4 },
          { stationCode: 'DIG', stationName: 'Duggirala', arrival: '14:38', departure: '14:40', haltMinutes: 2, distanceKm: 22.1 },
          { stationCode: 'TEL', stationName: 'Tenali Jn', arrival: '14:52', departure: '14:55', haltMinutes: 3, distanceKm: 31.5 },
          { stationCode: 'BPP', stationName: 'Bapatla', arrival: '15:28', departure: '15:30', haltMinutes: 2, distanceKm: 74.0 },
          { stationCode: 'CLX', stationName: 'Chirala', arrival: '15:43', departure: '15:45', haltMinutes: 2, distanceKm: 89.2 },
          { stationCode: 'OGL', stationName: 'Ongole', arrival: '16:28', departure: '16:30', haltMinutes: 2, distanceKm: 138.5 }
        ]
      };
      return {
        source: 'DEMO',
        data: simulatedRoute,
        timestamp: new Date().toISOString(),
        cached: false
      };
    }

    if (!apiKey) {
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: new Date().toISOString(),
        error: 'RAILRADAR_API_KEY not configured on server. Live RailRadar route telemetry is unavailable.'
      };
    }

    try {
      const response = await fetchWithTimeout(
        `https://api.railradar.in/v1/trains/${encodeURIComponent(trainNumber)}/route`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'x-api-key': apiKey,
            'Accept': 'application/json'
          }
        },
        API_TIMEOUT
      );

      if (!response.ok) {
        return {
          source: 'UNAVAILABLE',
          data: null,
          timestamp: new Date().toISOString(),
          error: `Upstream RailRadar route returned HTTP ${response.status} ${response.statusText}`
        };
      }

      const json = await response.json();
      return {
        source: 'LIVE',
        data: json.data || json,
        timestamp: new Date().toISOString(),
        upstreamUpdatedAt: json.updated_at || new Date().toISOString()
      };
    } catch (error) {
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  })();

  inFlightRequests.set(cacheKey, promise);

  try {
    const result = await promise;
    if (result.source === 'LIVE' && result.data !== null) {
      cache.set(cacheKey, {
        response: result,
        expiresAt: Date.now() + CACHE_TTL * 10 // Route data changes infrequently, 5m TTL
      });
    }
    return result;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

/**
 * Normalized Train Intelligence Interface (Specification Section 5)
 */
export interface NormalizedTrainIntelligence {
  trainNumber: string;
  trainName: string;
  runDate?: string;
  runIdentity?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  currentSpeed?: number;
  delayMinutes: number;
  lastTelemetryTime: string;
  currentStation?: string;
  previousStation?: string;
  nextStation?: string;
  routeStations?: any[];
  routeGeometry?: any;
  currentRouteSegment?: string;
  movementDirection: 'UP' | 'DN' | 'UNKNOWN';
  status: string;
  telemetryState: 'LIVE' | 'STALE' | 'UNAVAILABLE' | 'DEMO';
  locationConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
}

/**
 * Train Schedule & Timetable API
 * Calls GET /v1/trains/{number}?haltsOnly=true
 */
export async function getTrainSchedule(
  trainNumber: string,
  options: { forceRefresh?: boolean; haltsOnly?: boolean } = {}
): Promise<ServiceResponse> {
  const { forceRefresh = false, haltsOnly = false } = options;
  const cacheKey = `schedule:${trainNumber}:${haltsOnly ? 'halts' : 'all'}`;

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.response, cached: true, cacheExpiresAt: new Date(cached.expiresAt).toISOString() };
    }
  }

  const rawKey = process.env.RAILRADAR_API_KEY || '';
  const apiKey = rawKey.trim().replace(/^Bearer\s+/i, '');

  if (!apiKey) {
    return {
      source: 'DEMO',
      data: {
        trainNumber,
        trainName: `Train ${trainNumber}`,
        schedule: [
          { stationCode: 'BZA', stationName: 'Vijayawada Jn', arrivalTime: '02:00', departureTime: '02:15', haltMinutes: 15, day: 1, distanceKm: 0 },
          { stationCode: 'MAG', stationName: 'Mangalagiri', arrivalTime: '02:32', departureTime: '02:34', haltMinutes: 2, day: 1, distanceKm: 13 },
          { stationCode: 'GNT', stationName: 'Guntur Jn', arrivalTime: '03:05', departureTime: '03:15', haltMinutes: 10, day: 1, distanceKm: 32 }
        ]
      },
      timestamp: new Date().toISOString()
    };
  }

  try {
    const url = `https://api.railradar.in/v1/trains/${encodeURIComponent(trainNumber)}${haltsOnly ? '?haltsOnly=true' : ''}`;
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'x-api-key': apiKey,
          'Accept': 'application/json'
        }
      },
      API_TIMEOUT
    );

    if (!response.ok) {
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: new Date().toISOString(),
        error: `Upstream RailRadar schedule returned HTTP ${response.status} ${response.statusText}`
      };
    }

    const json = await response.json();
    const result: ServiceResponse = {
      source: 'LIVE',
      data: json.data || json,
      timestamp: new Date().toISOString(),
      upstreamUpdatedAt: json.updated_at || new Date().toISOString()
    };

    cache.set(cacheKey, { response: result, expiresAt: Date.now() + CACHE_TTL * 15 });
    return result;
  } catch (error: any) {
    return {
      source: 'UNAVAILABLE',
      data: null,
      timestamp: new Date().toISOString(),
      error: error?.message || 'Network error fetching train schedule'
    };
  }
}

/**
 * Train Route Geometry (GIS) API
 * Wraps getLiveTrainRoute with geometry normalization
 */
export async function getTrainRouteGeometry(
  trainNumber: string,
  options: { forceRefresh?: boolean; mode?: 'live' | 'demo' } = {}
): Promise<ServiceResponse> {
  return getLiveTrainRoute(trainNumber, options);
}

/**
 * Trains Between Stations API
 * Calls GET /v1/trains/between/{from}/{to}
 */
export async function getTrainsBetweenStations(
  fromStation: string,
  toStation: string,
  date?: string,
  options: { live?: boolean; forceRefresh?: boolean } = {}
): Promise<ServiceResponse> {
  const { live = false, forceRefresh = false } = options;
  const cacheKey = `between:${fromStation}:${toStation}:${date || 'today'}:${live ? 'live' : 'static'}`;

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.response, cached: true, cacheExpiresAt: new Date(cached.expiresAt).toISOString() };
    }
  }

  const rawKey = process.env.RAILRADAR_API_KEY || '';
  const apiKey = rawKey.trim().replace(/^Bearer\s+/i, '');

  if (!apiKey) {
    return {
      source: 'DEMO',
      data: [
        { trainNumber: '12627', trainName: 'Karnataka Express', from: fromStation, to: toStation, departure: '02:00', arrival: '03:15' },
        { trainNumber: '12723', trainName: 'Telangana Express', from: fromStation, to: toStation, departure: '06:00', arrival: '07:10' }
      ],
      timestamp: new Date().toISOString()
    };
  }

  try {
    const queryParams = new URLSearchParams();
    if (date) queryParams.set('date', date);
    if (live) queryParams.set('live', 'true');
    const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

    const url = `https://api.railradar.in/v1/trains/between/${encodeURIComponent(fromStation)}/${encodeURIComponent(toStation)}${qs}`;
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'x-api-key': apiKey,
          'Accept': 'application/json'
        }
      },
      API_TIMEOUT
    );

    if (!response.ok) {
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: new Date().toISOString(),
        error: `Upstream RailRadar between-stations returned HTTP ${response.status} ${response.statusText}`
      };
    }

    const json = await response.json();
    const result: ServiceResponse = {
      source: 'LIVE',
      data: json.data || json,
      timestamp: new Date().toISOString(),
      upstreamUpdatedAt: json.updated_at || new Date().toISOString()
    };

    cache.set(cacheKey, { response: result, expiresAt: Date.now() + CACHE_TTL * 5 });
    return result;
  } catch (error: any) {
    return {
      source: 'UNAVAILABLE',
      data: null,
      timestamp: new Date().toISOString(),
      error: error?.message || 'Network error fetching trains between stations'
    };
  }
}

/**
 * Station Timetable Board API
 * Calls GET /v1/stations/{code}/trains
 */
export async function getStationTimetable(
  stationCode: string,
  date?: string,
  options: { forceRefresh?: boolean } = {}
): Promise<ServiceResponse> {
  const { forceRefresh = false } = options;
  const cacheKey = `timetable:${stationCode}:${date || 'today'}`;

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.response, cached: true, cacheExpiresAt: new Date(cached.expiresAt).toISOString() };
    }
  }

  const rawKey = process.env.RAILRADAR_API_KEY || '';
  const apiKey = rawKey.trim().replace(/^Bearer\s+/i, '');

  if (!apiKey) {
    return {
      source: 'DEMO',
      data: {
        stationCode,
        trains: [
          { trainNumber: '12627', trainName: 'Karnataka Express', scheduledArrival: '02:00', scheduledDeparture: '02:15', platform: '1' },
          { trainNumber: '12723', trainName: 'Telangana Express', scheduledArrival: '06:00', scheduledDeparture: '06:10', platform: '2' }
        ]
      },
      timestamp: new Date().toISOString()
    };
  }

  try {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    const url = `https://api.railradar.in/v1/stations/${encodeURIComponent(stationCode)}/trains${qs}`;
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'x-api-key': apiKey,
          'Accept': 'application/json'
        }
      },
      API_TIMEOUT
    );

    if (!response.ok) {
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: new Date().toISOString(),
        error: `Upstream RailRadar station timetable returned HTTP ${response.status} ${response.statusText}`
      };
    }

    const json = await response.json();
    const result: ServiceResponse = {
      source: 'LIVE',
      data: json.data || json,
      timestamp: new Date().toISOString(),
      upstreamUpdatedAt: json.updated_at || new Date().toISOString()
    };

    cache.set(cacheKey, { response: result, expiresAt: Date.now() + CACHE_TTL * 10 });
    return result;
  } catch (error: any) {
    return {
      source: 'UNAVAILABLE',
      data: null,
      timestamp: new Date().toISOString(),
      error: error?.message || 'Network error fetching station timetable'
    };
  }
}

/**
 * Station Autocomplete Search API
 * Calls GET /v1/lookup/search/stations?q={query}
 */
export async function searchRailRadarStations(
  query: string,
  options: { forceRefresh?: boolean } = {}
): Promise<ServiceResponse> {
  const { forceRefresh = false } = options;
  const q = query.trim().toLowerCase();
  const cacheKey = `search:stations:${q}`;

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.response, cached: true, cacheExpiresAt: new Date(cached.expiresAt).toISOString() };
    }
  }

  const rawKey = process.env.RAILRADAR_API_KEY || '';
  const apiKey = rawKey.trim().replace(/^Bearer\s+/i, '');

  if (apiKey) {
    try {
      const url = `https://api.railradar.in/v1/lookup/search/stations?q=${encodeURIComponent(q)}`;
      const response = await fetchWithTimeout(
        url,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'x-api-key': apiKey,
            'Accept': 'application/json'
          }
        },
        API_TIMEOUT
      );

      if (response.ok) {
        const json = await response.json();
        const result: ServiceResponse = {
          source: 'LIVE',
          data: json.data || json,
          timestamp: new Date().toISOString()
        };
        cache.set(cacheKey, { response: result, expiresAt: Date.now() + CACHE_TTL * 30 });
        return result;
      }
    } catch {}
  }

  // Fallback to local station search
  return {
    source: 'DEMO',
    data: [
      { code: 'BZA', name: 'Vijayawada Junction', division: 'BZA', zone: 'SCR' },
      { code: 'MAG', name: 'Mangalagiri', division: 'BZA', zone: 'SCR' },
      { code: 'GNT', name: 'Guntur Junction', division: 'GNT', zone: 'SCR' },
      { code: 'TEL', name: 'Tenali Junction', division: 'BZA', zone: 'SCR' },
      { code: 'NDLS', name: 'New Delhi', division: 'DLI', zone: 'NR' },
      { code: 'HWH', name: 'Howrah Junction', division: 'HWH', zone: 'ER' },
      { code: 'MAS', name: 'Chennai Central', division: 'MAS', zone: 'SR' }
    ].filter(s => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)),
    timestamp: new Date().toISOString()
  };
}

/**
 * Train Autocomplete Search API
 * Calls GET /v1/lookup/search/trains?q={query}
 */
export async function searchRailRadarTrains(
  query: string,
  options: { forceRefresh?: boolean } = {}
): Promise<ServiceResponse> {
  const { forceRefresh = false } = options;
  const q = query.trim().toLowerCase();
  const cacheKey = `search:trains:${q}`;

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.response, cached: true, cacheExpiresAt: new Date(cached.expiresAt).toISOString() };
    }
  }

  const rawKey = process.env.RAILRADAR_API_KEY || '';
  const apiKey = rawKey.trim().replace(/^Bearer\s+/i, '');

  if (apiKey) {
    try {
      const url = `https://api.railradar.in/v1/lookup/search/trains?q=${encodeURIComponent(q)}`;
      const response = await fetchWithTimeout(
        url,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'x-api-key': apiKey,
            'Accept': 'application/json'
          }
        },
        API_TIMEOUT
      );

      if (response.ok) {
        const json = await response.json();
        const result: ServiceResponse = {
          source: 'LIVE',
          data: json.data || json,
          timestamp: new Date().toISOString()
        };
        cache.set(cacheKey, { response: result, expiresAt: Date.now() + CACHE_TTL * 30 });
        return result;
      }
    } catch {}
  }

  return {
    source: 'DEMO',
    data: [
      { number: '12627', name: 'Karnataka Express', from: 'SBC', to: 'NDLS' },
      { number: '12723', name: 'Telangana Express', from: 'HYB', to: 'NDLS' },
      { number: '17011', name: 'Intercity Express', from: 'HYB', to: 'SKZR' },
      { number: '20834', name: 'Vande Bharat Express', from: 'SC', to: 'VSKP' },
      { number: '12711', name: 'Pinakini Express', from: 'BZA', to: 'MAS' },
      { number: '12615', name: 'Grand Trunk Express', from: 'MAS', to: 'NDLS' }
    ].filter(t => t.number.includes(q) || t.name.toLowerCase().includes(q)),
    timestamp: new Date().toISOString()
  };
}

/**
 * Station Directory Lookup API
 * Calls GET /v1/lookup/stations
 */
export async function getStationDirectory(
  options: { forceRefresh?: boolean } = {}
): Promise<ServiceResponse> {
  const { forceRefresh = false } = options;
  const cacheKey = 'directory:stations';

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.response, cached: true, cacheExpiresAt: new Date(cached.expiresAt).toISOString() };
    }
  }

  const rawKey = process.env.RAILRADAR_API_KEY || '';
  const apiKey = rawKey.trim().replace(/^Bearer\s+/i, '');

  if (apiKey) {
    try {
      const url = `https://api.railradar.in/v1/lookup/stations`;
      const response = await fetchWithTimeout(
        url,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'x-api-key': apiKey,
            'Accept': 'application/json'
          }
        },
        API_TIMEOUT
      );

      if (response.ok) {
        const json = await response.json();
        const result: ServiceResponse = {
          source: 'LIVE',
          data: json.data || json,
          timestamp: new Date().toISOString()
        };
        cache.set(cacheKey, { response: result, expiresAt: Date.now() + CACHE_TTL * 60 });
        return result;
      }
    } catch {}
  }

  return {
    source: 'DEMO',
    data: {
      BZA: { name: 'Vijayawada Junction', zone: 'SCR', division: 'BZA' },
      MAG: { name: 'Mangalagiri', zone: 'SCR', division: 'BZA' },
      GNT: { name: 'Guntur Junction', zone: 'SCR', division: 'GNT' },
      TEL: { name: 'Tenali Junction', zone: 'SCR', division: 'BZA' }
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Train Directory Lookup API
 * Calls GET /v1/lookup/trains
 */
export async function getTrainDirectory(
  options: { forceRefresh?: boolean } = {}
): Promise<ServiceResponse> {
  const { forceRefresh = false } = options;
  const cacheKey = 'directory:trains';

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.response, cached: true, cacheExpiresAt: new Date(cached.expiresAt).toISOString() };
    }
  }

  const rawKey = process.env.RAILRADAR_API_KEY || '';
  const apiKey = rawKey.trim().replace(/^Bearer\s+/i, '');

  if (apiKey) {
    try {
      const url = `https://api.railradar.in/v1/lookup/trains`;
      const response = await fetchWithTimeout(
        url,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'x-api-key': apiKey,
            'Accept': 'application/json'
          }
        },
        API_TIMEOUT
      );

      if (response.ok) {
        const json = await response.json();
        const result: ServiceResponse = {
          source: 'LIVE',
          data: json.data || json,
          timestamp: new Date().toISOString()
        };
        cache.set(cacheKey, { response: result, expiresAt: Date.now() + CACHE_TTL * 60 });
        return result;
      }
    } catch {}
  }

  return {
    source: 'DEMO',
    data: {
      '12627': 'Karnataka Express',
      '12723': 'Telangana Express',
      '17011': 'Intercity Express',
      '20834': 'Vande Bharat Express',
      '12711': 'Pinakini Express',
      '12615': 'Grand Trunk Express'
    },
    timestamp: new Date().toISOString()
  };
}
