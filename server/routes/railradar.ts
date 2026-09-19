import { Router, Request, Response } from 'express';
import { 
  getLiveTrainStatus, 
  getLiveStationBoard, 
  getLiveTrainRoute, 
  getTrainSchedule,
  getTrainsBetweenStations,
  getStationTimetable,
  searchRailRadarStations,
  searchRailRadarTrains,
  getStationDirectory,
  getTrainDirectory,
  clearRailRadarCache,
  getRailRadarMetrics,
  getRailRadarHealth,
  railRadarGovernor,
  ServiceResponse
} from '../integrations/railRadarService.js';

const router = Router();

// GET /api/railradar/metrics (Section 30 Request Metrics)
router.get('/metrics', (req: Request, res: Response): void => {
  res.json({
    success: true,
    data: getRailRadarMetrics(),
    timestamp: new Date().toISOString()
  });
});

// POST /api/railradar/cache/clear
router.post('/cache/clear', (req: Request, res: Response): void => {
  const { trainNumber, stationCode } = req.body || {};
  if (trainNumber) {
    clearRailRadarCache(`train:${trainNumber}`);
  } else if (stationCode) {
    clearRailRadarCache(`station:${stationCode.toUpperCase()}`);
  } else {
    clearRailRadarCache();
  }
  res.json({ success: true, message: 'Cache cleared successfully' });
});

// GET /api/railradar/health
// Diagnostic endpoint: Reports configured status, backend availability, and provider reachability without exhausting quota (Section 21)
router.get('/health', (req: Request, res: Response): void => {
  try {
    const rawKey = process.env.RAILRADAR_API_KEY || '';
    const apiKey = rawKey.trim().replace(/^Bearer\s+/i, '');
    const isConfigured = Boolean(apiKey && apiKey.length > 5);

    if (!isConfigured) {
      res.json({
        provider: 'RailRadar',
        configured: false,
        backend: 'available',
        providerReachable: false,
        status: 'not_configured',
        failureState: 'NOT_CONFIGURED',
        timestamp: new Date().toISOString(),
        message: 'RAILRADAR_API_KEY is not configured on the server. Live telemetry is unavailable.'
      });
      return;
    }

    const health = getRailRadarHealth();

    res.json({
      provider: 'RailRadar',
      configured: true,
      backend: 'available',
      providerReachable: health.providerStatus === 'ready',
      providerStatus: health.providerStatus,
      status: health.providerStatus,
      failureState: health.failureState,
      httpStatus: health.httpStatus,
      backoffActive: health.backoffActive,
      remainingBackoffSeconds: health.remainingBackoffSeconds,
      timestamp: new Date().toISOString(),
      message: health.message
    });
  } catch (error) {
    res.status(500).json({
      provider: 'RailRadar',
      configured: false,
      backend: 'available',
      providerReachable: false,
      status: 'error',
      failureState: 'BACKEND_UNAVAILABLE',
      timestamp: new Date().toISOString(),
      message: 'Internal server error evaluating RailRadar health'
    });
  }
});

// GET /api/railradar/train/:number/live
router.get('/train/:number/live', async (req: Request, res: Response): Promise<void> => {
  try {
    const { number } = req.params;
    const trainNumber = Array.isArray(number) ? number[0] : (number ?? '');
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const mode = (req.query.mode === 'live' ? 'live' : 'demo') as 'live' | 'demo';
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;

    const result = await getLiveTrainStatus(trainNumber, { forceRefresh, mode, date });
    
    if (result.source === 'UNAVAILABLE' || !result.data) {
      const statusCode = result.errorCode === 'AUTHENTICATION_FAILED' ? 401
        : result.errorCode === 'RATE_LIMITED' ? 429
        : result.errorCode === 'NOT_CONFIGURED' ? 503
        : result.errorCode === 'TRAIN_NOT_FOUND' ? 404
        : 503;

      res.status(statusCode).json({
        success: false,
        source: 'RAILRADAR',
        status: result.status || 'UNAVAILABLE',
        errorCode: result.errorCode || 'PROVIDER_UNAVAILABLE',
        upstreamStatus: result.upstreamStatus || statusCode,
        message: result.message || result.error || 'Live train telemetry unavailable',
        error: result.error || 'Live train telemetry unavailable',
        data: null,
        timestamp: result.timestamp,
        upstreamUpdatedAt: result.upstreamUpdatedAt,
        meta: { cached: !!result.cached, cacheExpiresAt: result.cacheExpiresAt }
      });
      return;
    }

    res.json({
      success: true,
      source: result.source,
      status: result.status || 'READY',
      data: result.data,
      timestamp: result.timestamp,
      upstreamUpdatedAt: result.upstreamUpdatedAt,
      meta: { cached: !!result.cached, cacheExpiresAt: result.cacheExpiresAt }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      source: 'RAILRADAR',
      status: 'ERROR',
      errorCode: 'PROVIDER_UNAVAILABLE',
      error: 'Internal server error processing live train status',
      message: error?.message || 'Internal server error processing live train status',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/railradar/station/:code/live
router.get('/station/:code/live', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const mode = (req.query.mode === 'live' ? 'live' : 'demo') as 'live' | 'demo';

    const stationCode = (Array.isArray(code) ? code[0] : (code ?? '')).toUpperCase();
    const result = await getLiveStationBoard(stationCode, { forceRefresh, mode });
    
    if (result.source === 'UNAVAILABLE' || !result.data) {
      const statusCode = result.errorCode === 'AUTHENTICATION_FAILED' ? 401
        : result.errorCode === 'RATE_LIMITED' ? 429
        : result.errorCode === 'NOT_CONFIGURED' ? 503
        : result.errorCode === 'STATION_NOT_FOUND' ? 404
        : 503;

      res.status(statusCode).json({
        success: false,
        source: 'RAILRADAR',
        status: result.status || 'UNAVAILABLE',
        errorCode: result.errorCode || 'PROVIDER_UNAVAILABLE',
        upstreamStatus: result.upstreamStatus || statusCode,
        message: result.message || result.error || 'Station board telemetry unavailable',
        error: result.error || 'Station board telemetry unavailable',
        data: null,
        timestamp: result.timestamp,
        upstreamUpdatedAt: result.upstreamUpdatedAt,
        meta: { cached: !!result.cached, cacheExpiresAt: result.cacheExpiresAt }
      });
      return;
    }

    res.json({
      success: true,
      source: result.source,
      status: result.status || 'READY',
      data: result.data,
      timestamp: result.timestamp,
      upstreamUpdatedAt: result.upstreamUpdatedAt,
      meta: { cached: !!result.cached, cacheExpiresAt: result.cacheExpiresAt }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      source: 'RAILRADAR',
      status: 'ERROR',
      errorCode: 'PROVIDER_UNAVAILABLE',
      error: 'Internal server error processing live station board',
      message: error?.message || 'Internal server error processing live station board',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/railradar/train/:number/route
router.get('/train/:number/route', async (req: Request, res: Response): Promise<void> => {
  try {
    const { number } = req.params;
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const mode = (req.query.mode === 'live' ? 'live' : 'demo') as 'live' | 'demo';

    const trainNumber = Array.isArray(number) ? number[0] : (number ?? '');
    const result = await getLiveTrainRoute(trainNumber, { forceRefresh, mode });
    
    if (result.source === 'UNAVAILABLE' || !result.data) {
      const statusCode = result.errorCode === 'AUTHENTICATION_FAILED' ? 401
        : result.errorCode === 'RATE_LIMITED' ? 429
        : result.errorCode === 'NOT_CONFIGURED' ? 503
        : 503;

      res.status(statusCode).json({
        success: false,
        source: 'RAILRADAR',
        status: result.status || 'UNAVAILABLE',
        errorCode: result.errorCode || 'PROVIDER_UNAVAILABLE',
        upstreamStatus: result.upstreamStatus || statusCode,
        message: result.message || result.error || 'Train route telemetry unavailable',
        error: result.error || 'Train route telemetry unavailable',
        data: null,
        timestamp: result.timestamp,
        upstreamUpdatedAt: result.upstreamUpdatedAt,
        meta: { cached: !!result.cached, cacheExpiresAt: result.cacheExpiresAt }
      });
      return;
    }

    res.json({
      success: true,
      source: result.source,
      status: result.status || 'READY',
      data: result.data,
      timestamp: result.timestamp,
      upstreamUpdatedAt: result.upstreamUpdatedAt,
      meta: { cached: !!result.cached, cacheExpiresAt: result.cacheExpiresAt }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      source: 'RAILRADAR',
      status: 'ERROR',
      errorCode: 'PROVIDER_UNAVAILABLE',
      error: 'Internal server error processing train route',
      message: error?.message || 'Internal server error processing train route',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/railradar/corridor/live
// Discovers and aggregates live telemetry for Vijayawada Division corridor trains
const BASE_CORRIDOR_TRAINS = ['12627', '12723', '12704', '12615', '12728'];

router.get('/corridor/live', async (req: Request, res: Response): Promise<void> => {
  try {
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const mode = (req.query.mode === 'live' ? 'live' : 'demo') as 'live' | 'demo';

    // Train discovery: accept custom trains query param or base corridor pool
    let trainCandidates: string[] = [];
    if (typeof req.query.trains === 'string' && req.query.trains.trim().length > 0) {
      trainCandidates = req.query.trains.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      trainCandidates = [...BASE_CORRIDOR_TRAINS];
    }
    const uniqueTrainNumbers = Array.from(new Set(trainCandidates));

    // DEMO mode: fast-path execution without touching upstream API or governor backoff
    if (mode === 'demo') {
      const results: any[] = [];
      for (const num of uniqueTrainNumbers) {
        const r = await getLiveTrainStatus(num, { forceRefresh, mode: 'demo' });
        results.push(r);
      }
      const trains = results.filter(r => r.data).map(r => r.data);
      res.json({
        success: true,
        source: 'DEMO',
        status: 'READY',
        trains,
        activeCount: trains.length,
        timestamp: new Date().toISOString(),
        cycleCadenceMinutes: 20,
        corridor: 'BPP-CLX-BZA Trunk Corridor'
      });
      return;
    }

    // STEP 4: Single-flight lock for key corridor-live:BZA-GNT-TEL
    const isBasePool = uniqueTrainNumbers.length === BASE_CORRIDOR_TRAINS.length &&
      uniqueTrainNumbers.every((t, i) => t === BASE_CORRIDOR_TRAINS[i]);
    const requestKey = isBasePool 
      ? 'corridor-live:BZA-GNT-TEL' 
      : `corridor-live:BZA-GNT-TEL:${uniqueTrainNumbers.sort().join(',')}`;

    const corridorResponse = await railRadarGovernor.executeRequest({
      requestKey,
      endpoint: '/api/railradar/corridor/live',
      caller: 'corridor-live',
      ttlMs: 60000,
      forceRefresh,
      fetchFn: async (): Promise<ServiceResponse> => {
        const results: any[] = [];
        for (const num of uniqueTrainNumbers) {
          if (railRadarGovernor.isBackingOff()) {
            console.warn(`[Corridor Live] Backoff triggered during train processing. Stopping further fetches.`);
            break;
          }
          const r = await getLiveTrainStatus(num, { forceRefresh, mode: 'live' });
          results.push(r);
        }

        const seenRunIds = new Set<string>();
        const activeTrains: any[] = [];
        const terminatedTrains: any[] = [];
        let liveCount = 0;
        let latestUpstreamUpdate: string | undefined;
        let firstError: any = null;

        const TERMINAL_STATUSES = new Set([
          'TERMINATED', 'ARRIVED', 'COMPLETED', 'JOURNEY_COMPLETED',
          'AT_DESTINATION', 'FINISHED', 'TERMINAL'
        ]);

        for (const r of results) {
          if (r.data) {
            const runKey = r.data.runId || r.data.trainId || `${r.data.trainNumber}_${r.data.startDate || ''}`;
            if (!seenRunIds.has(runKey)) {
              seenRunIds.add(runKey);
              // BUG 2 FIX: Separate completed/terminated trains from active trains
              const status = String(r.data.runningStatus || r.data.status || '').toUpperCase();
              const isTerminated = r.data.isTerminated === true || r.data.journeyCompleted === true || TERMINAL_STATUSES.has(status);
              if (isTerminated) {
                terminatedTrains.push(r.data);
                console.log(`[Corridor Live] Train ${r.data.trainNumber} excluded from active list (status: ${status}, terminated: ${isTerminated})`);
              } else {
                activeTrains.push(r.data);
              }
            }
            if (r.upstreamUpdatedAt && (!latestUpstreamUpdate || r.upstreamUpdatedAt > latestUpstreamUpdate)) {
              latestUpstreamUpdate = r.upstreamUpdatedAt;
            }
          } else if (!firstError && (r.errorCode || r.error)) {
            firstError = r;
          }

          if (r.source === 'LIVE') liveCount++;
        }

        if (liveCount === 0) {
          const statusCode = firstError?.errorCode === 'AUTHENTICATION_FAILED' ? 401
            : firstError?.errorCode === 'RATE_LIMIT_EXCEEDED' || firstError?.upstreamStatus === 429 ? 429
            : firstError?.errorCode === 'NOT_CONFIGURED' ? 503
            : 503;

          return {
            source: 'UNAVAILABLE',
            status: 'UNAVAILABLE',
            errorCode: firstError?.errorCode || (statusCode === 429 ? 'RATE_LIMIT_EXCEEDED' : 'PROVIDER_UNAVAILABLE'),
            upstreamStatus: firstError?.upstreamStatus || statusCode,
            message: firstError?.message || firstError?.error || 'RailRadar live telemetry is unavailable for corridor.',
            error: firstError?.error || 'RailRadar live telemetry is unavailable for corridor.',
            backoffSeconds: firstError?.backoffSeconds,
            nextRetryAt: firstError?.nextRetryAt,
            data: null,
            timestamp: new Date().toISOString()
          };
        }

        return {
          source: 'LIVE',
          status: 'READY',
          data: {
            trains: activeTrains,
            terminatedTrains,
            activeCount: activeTrains.length,
            terminatedCount: terminatedTrains.length,
            upstreamUpdatedAt: latestUpstreamUpdate,
            cycleCadenceMinutes: 20,
            corridor: 'BPP-CLX-BZA Trunk Corridor'
          },
          timestamp: new Date().toISOString()
        };
      }
    });

    if (corridorResponse.status === 'UNAVAILABLE' || corridorResponse.source === 'UNAVAILABLE') {
      const statusCode = corridorResponse.errorCode === 'AUTHENTICATION_FAILED' ? 401
        : corridorResponse.errorCode === 'RATE_LIMIT_EXCEEDED' || corridorResponse.upstreamStatus === 429 ? 429
        : corridorResponse.errorCode === 'NOT_CONFIGURED' ? 503
        : 503;
      const remainingSec = railRadarGovernor.getRemainingBackoffSeconds();
      const backoffUntil = railRadarGovernor.getBackoffUntil();

      res.status(statusCode).json({
        success: false,
        source: 'RAILRADAR',
        status: 'UNAVAILABLE',
        errorCode: corridorResponse.errorCode || (statusCode === 429 ? 'RATE_LIMIT_EXCEEDED' : 'PROVIDER_UNAVAILABLE'),
        upstreamStatus: corridorResponse.upstreamStatus || statusCode,
        message: corridorResponse.message || 'RailRadar live telemetry is unavailable for corridor.',
        error: corridorResponse.error || corridorResponse.message || 'RailRadar live telemetry is unavailable for corridor.',
        backoffSeconds: remainingSec || corridorResponse.backoffSeconds || undefined,
        nextRetryAt: backoffUntil || corridorResponse.nextRetryAt || undefined,
        trains: [],
        timestamp: new Date().toISOString(),
        corridor: 'BPP-CLX-BZA Trunk Corridor'
      });
      return;
    }

    const data = corridorResponse.data || {};
    res.json({
      success: true,
      source: 'LIVE',
      status: 'READY',
      trains: data.trains || [],
      activeCount: (data.trains || []).length,
      timestamp: new Date().toISOString(),
      upstreamUpdatedAt: data.upstreamUpdatedAt,
      cycleCadenceMinutes: data.cycleCadenceMinutes || 20,
      corridor: 'BPP-CLX-BZA Trunk Corridor'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      source: 'RAILRADAR',
      status: 'ERROR',
      errorCode: 'PROVIDER_UNAVAILABLE',
      error: 'Internal server error processing corridor live trains',
      message: error?.message || 'Internal server error processing corridor live trains',
      trains: [],
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/railradar/train/:number/schedule
router.get('/train/:number/schedule', async (req: Request, res: Response): Promise<void> => {
  try {
    const { number } = req.params;
    const trainNumber = Array.isArray(number) ? number[0] : (number ?? '');
    const haltsOnly = req.query.haltsOnly === 'true' || req.query.haltsOnly === '1';
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';

    const result = await getTrainSchedule(trainNumber, { haltsOnly, forceRefresh });

    if (result.source === 'UNAVAILABLE' || !result.data) {
      const statusCode = result.errorCode === 'AUTHENTICATION_FAILED' ? 401
        : result.errorCode === 'RATE_LIMITED' ? 429
        : result.errorCode === 'NOT_CONFIGURED' ? 503
        : result.errorCode === 'TRAIN_NOT_FOUND' ? 404
        : 503;

      res.status(statusCode).json({
        success: false,
        source: 'RAILRADAR',
        status: result.status || 'UNAVAILABLE',
        errorCode: result.errorCode || 'PROVIDER_UNAVAILABLE',
        upstreamStatus: result.upstreamStatus || statusCode,
        message: result.message || result.error || 'Train schedule telemetry unavailable',
        error: result.error || 'Train schedule telemetry unavailable',
        data: null,
        timestamp: result.timestamp,
        upstreamUpdatedAt: result.upstreamUpdatedAt,
        meta: { cached: !!result.cached, cacheExpiresAt: result.cacheExpiresAt }
      });
      return;
    }

    res.json({
      success: true,
      data: result.data,
      source: result.source,
      status: result.status || 'READY',
      timestamp: result.timestamp,
      upstreamUpdatedAt: result.upstreamUpdatedAt,
      meta: { cached: !!result.cached, cacheExpiresAt: result.cacheExpiresAt }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      source: 'RAILRADAR',
      status: 'ERROR',
      errorCode: 'PROVIDER_UNAVAILABLE',
      error: 'Internal server error processing train schedule',
      message: error?.message || 'Internal server error processing train schedule',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/railradar/trains/between/:from/:to
router.get('/trains/between/:from/:to', async (req: Request, res: Response): Promise<void> => {
  try {
    const fromStation = String(req.params.from || '').toUpperCase();
    const toStation = String(req.params.to || '').toUpperCase();
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const live = req.query.live === 'true' || req.query.live === '1';
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';

    const result = await getTrainsBetweenStations(fromStation, toStation, date, { live, forceRefresh });

    if (result.source === 'UNAVAILABLE' || !result.data) {
      const statusCode = result.errorCode === 'AUTHENTICATION_FAILED' ? 401
        : result.errorCode === 'RATE_LIMITED' ? 429
        : result.errorCode === 'NOT_CONFIGURED' ? 503
        : 503;

      res.status(statusCode).json({
        success: false,
        source: 'RAILRADAR',
        status: result.status || 'UNAVAILABLE',
        errorCode: result.errorCode || 'PROVIDER_UNAVAILABLE',
        upstreamStatus: result.upstreamStatus || statusCode,
        message: result.message || result.error || 'Trains between stations unavailable',
        error: result.error || 'Trains between stations unavailable',
        data: null,
        timestamp: result.timestamp,
        upstreamUpdatedAt: result.upstreamUpdatedAt,
        meta: { cached: !!result.cached, cacheExpiresAt: result.cacheExpiresAt }
      });
      return;
    }

    res.json({
      success: true,
      data: result.data,
      source: result.source,
      status: result.status || 'READY',
      timestamp: result.timestamp,
      upstreamUpdatedAt: result.upstreamUpdatedAt,
      meta: { cached: !!result.cached, cacheExpiresAt: result.cacheExpiresAt }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      source: 'RAILRADAR',
      status: 'ERROR',
      errorCode: 'PROVIDER_UNAVAILABLE',
      error: 'Internal server error processing trains between stations',
      message: error?.message || 'Internal server error processing trains between stations',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/railradar/station/:code/timetable
router.get('/station/:code/timetable', async (req: Request, res: Response): Promise<void> => {
  try {
    const stationCode = String(req.params.code || '').toUpperCase();
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';

    const result = await getStationTimetable(stationCode, date, { forceRefresh });

    if (result.source === 'UNAVAILABLE' || !result.data) {
      const statusCode = result.errorCode === 'AUTHENTICATION_FAILED' ? 401
        : result.errorCode === 'RATE_LIMITED' ? 429
        : result.errorCode === 'NOT_CONFIGURED' ? 503
        : result.errorCode === 'STATION_NOT_FOUND' ? 404
        : 503;

      res.status(statusCode).json({
        success: false,
        source: 'RAILRADAR',
        status: result.status || 'UNAVAILABLE',
        errorCode: result.errorCode || 'PROVIDER_UNAVAILABLE',
        upstreamStatus: result.upstreamStatus || statusCode,
        message: result.message || result.error || 'Station timetable telemetry unavailable',
        error: result.error || 'Station timetable telemetry unavailable',
        data: null,
        timestamp: result.timestamp,
        upstreamUpdatedAt: result.upstreamUpdatedAt,
        meta: { cached: !!result.cached, cacheExpiresAt: result.cacheExpiresAt }
      });
      return;
    }

    res.json({
      success: true,
      data: result.data,
      source: result.source,
      status: result.status || 'READY',
      timestamp: result.timestamp,
      upstreamUpdatedAt: result.upstreamUpdatedAt,
      meta: { cached: !!result.cached, cacheExpiresAt: result.cacheExpiresAt }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      source: 'RAILRADAR',
      status: 'ERROR',
      errorCode: 'PROVIDER_UNAVAILABLE',
      error: 'Internal server error processing station timetable',
      message: error?.message || 'Internal server error processing station timetable',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/railradar/search/stations
router.get('/search/stations', async (req: Request, res: Response): Promise<void> => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';

    const result = await searchRailRadarStations(q, { forceRefresh });

    if (result.source === 'UNAVAILABLE' && (!result.data || (Array.isArray(result.data) && result.data.length === 0))) {
      const statusCode = result.errorCode === 'AUTHENTICATION_FAILED' ? 401
        : result.errorCode === 'RATE_LIMITED' ? 429
        : result.errorCode === 'NOT_CONFIGURED' ? 503
        : 503;

      res.status(statusCode).json({
        success: false,
        source: 'RAILRADAR',
        status: result.status || 'UNAVAILABLE',
        errorCode: result.errorCode || 'PROVIDER_UNAVAILABLE',
        upstreamStatus: result.upstreamStatus || statusCode,
        message: result.message || result.error || 'Station search unavailable',
        error: result.error || 'Station search unavailable',
        data: [],
        timestamp: result.timestamp
      });
      return;
    }

    res.json({
      success: true,
      data: result.data || [],
      source: result.source,
      status: result.status || 'READY',
      timestamp: result.timestamp
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      source: 'RAILRADAR',
      status: 'ERROR',
      errorCode: 'PROVIDER_UNAVAILABLE',
      error: 'Internal server error searching stations',
      message: error?.message || 'Internal server error searching stations',
      data: [],
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/railradar/search/trains
router.get('/search/trains', async (req: Request, res: Response): Promise<void> => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';

    const result = await searchRailRadarTrains(q, { forceRefresh });

    if (result.source === 'UNAVAILABLE' && (!result.data || (Array.isArray(result.data) && result.data.length === 0))) {
      const statusCode = result.errorCode === 'AUTHENTICATION_FAILED' ? 401
        : result.errorCode === 'RATE_LIMITED' ? 429
        : result.errorCode === 'NOT_CONFIGURED' ? 503
        : 503;

      res.status(statusCode).json({
        success: false,
        source: 'RAILRADAR',
        status: result.status || 'UNAVAILABLE',
        errorCode: result.errorCode || 'PROVIDER_UNAVAILABLE',
        upstreamStatus: result.upstreamStatus || statusCode,
        message: result.message || result.error || 'Train search unavailable',
        error: result.error || 'Train search unavailable',
        data: [],
        timestamp: result.timestamp
      });
      return;
    }

    res.json({
      success: true,
      data: result.data || [],
      source: result.source,
      status: result.status || 'READY',
      timestamp: result.timestamp
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      source: 'RAILRADAR',
      status: 'ERROR',
      errorCode: 'PROVIDER_UNAVAILABLE',
      error: 'Internal server error searching trains',
      message: error?.message || 'Internal server error searching trains',
      data: [],
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/railradar/directory/stations
router.get('/directory/stations', async (req: Request, res: Response): Promise<void> => {
  try {
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const result = await getStationDirectory({ forceRefresh });
    res.json({
      success: true,
      data: result.data,
      source: result.source,
      timestamp: result.timestamp
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error fetching station directory',
      source: 'UNAVAILABLE',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/railradar/directory/trains
router.get('/directory/trains', async (req: Request, res: Response): Promise<void> => {
  try {
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const result = await getTrainDirectory({ forceRefresh });
    res.json({
      success: true,
      data: result.data,
      source: result.source,
      timestamp: result.timestamp
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error fetching train directory',
      source: 'UNAVAILABLE',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;

