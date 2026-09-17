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
  clearRailRadarCache 
} from '../integrations/railRadarService.js';

const router = Router();

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
// Diagnostic endpoint: Reports configured status, backend availability, and provider reachability without exposing secrets
let cachedHealthProbe: { timestamp: number; result: any } | null = null;
const HEALTH_CACHE_TTL = 300_000; // 5 minutes

router.get('/health', async (req: Request, res: Response): Promise<void> => {
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

    // Use cached probe to avoid exhausting monthly quota
    const now = Date.now();
    if (cachedHealthProbe && (now - cachedHealthProbe.timestamp) < HEALTH_CACHE_TTL) {
      res.json(cachedHealthProbe.result);
      return;
    }

    let providerReachable = false;
    let providerStatus = 'unknown';
    let failureState = 'UNKNOWN';
    let httpStatus = 0;
    let message = '';

    try {
      const probeController = new AbortController();
      const probeTimeout = setTimeout(() => probeController.abort(), 4000);
      const probeRes = await fetch('https://api.railradar.in/v1/trains/12627/live', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'x-api-key': apiKey,
          'Accept': 'application/json'
        },
        signal: probeController.signal
      });
      clearTimeout(probeTimeout);

      httpStatus = probeRes.status;
      providerReachable = true;

      if (probeRes.status === 200) {
        providerStatus = 'ready';
        failureState = 'LIVE';
        message = 'RailRadar provider reachable and telemetry available.';
      } else if (probeRes.status === 429) {
        providerStatus = 'rate_limited';
        failureState = 'PROVIDER_UNAVAILABLE';
        message = 'Upstream RailRadar quota exceeded (HTTP 429 Too Many Requests). Use DEMO mode or wait for quota reset.';
      } else if (probeRes.status === 401 || probeRes.status === 403) {
        providerStatus = 'auth_failed';
        failureState = 'AUTHENTICATION_FAILED';
        message = 'RailRadar authentication failed (invalid API key).';
      } else {
        providerStatus = 'degraded';
        failureState = 'PROVIDER_UNAVAILABLE';
        message = `Upstream RailRadar returned HTTP ${probeRes.status}.`;
      }
    } catch (probeErr: any) {
      providerReachable = false;
      providerStatus = 'unreachable';
      failureState = probeErr?.name === 'AbortError' ? 'REQUEST_TIMEOUT' : 'PROVIDER_UNAVAILABLE';
      message = probeErr?.name === 'AbortError' 
        ? 'Request timeout connecting to upstream RailRadar API.' 
        : `Network error connecting to RailRadar provider: ${probeErr?.message || 'Connection failed'}`;
    }

    const payload = {
      provider: 'RailRadar',
      configured: true,
      backend: 'available',
      providerReachable,
      providerStatus,
      status: providerStatus,
      failureState,
      httpStatus,
      timestamp: new Date().toISOString(),
      message
    };

    cachedHealthProbe = { timestamp: now, result: payload };
    res.json(payload);
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
      res.status(404).json({
        success: false,
        error: result.error || 'Train data unavailable',
        source: result.source,
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
      timestamp: result.timestamp,
      upstreamUpdatedAt: result.upstreamUpdatedAt,
      meta: { cached: !!result.cached, cacheExpiresAt: result.cacheExpiresAt }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error processing live train status',
      source: 'UNAVAILABLE',
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
      res.status(result.source === 'UNAVAILABLE' ? 503 : 404).json({
        success: false,
        error: result.error || 'Station board telemetry unavailable',
        source: result.source,
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
      timestamp: result.timestamp,
      upstreamUpdatedAt: result.upstreamUpdatedAt,
      meta: { cached: !!result.cached, cacheExpiresAt: result.cacheExpiresAt }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error processing live station board',
      source: 'UNAVAILABLE',
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
      res.status(result.source === 'UNAVAILABLE' ? 503 : 404).json({
        success: false,
        error: result.error || 'Train route telemetry unavailable',
        source: result.source,
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
      timestamp: result.timestamp,
      upstreamUpdatedAt: result.upstreamUpdatedAt,
      meta: { cached: !!result.cached, cacheExpiresAt: result.cacheExpiresAt }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error processing train route',
      source: 'UNAVAILABLE',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/railradar/corridor/live
// Safely aggregates live telemetry for Vijayawada Division corridor trains using existing RailRadar service
const CORRIDOR_TRAIN_NUMBERS = ['12627', '12723', '17011', '20834', '12711', '12615'];

router.get('/corridor/live', async (req: Request, res: Response): Promise<void> => {
  try {
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const mode = (req.query.mode === 'live' ? 'live' : 'demo') as 'live' | 'demo';

    const results = await Promise.all(
      CORRIDOR_TRAIN_NUMBERS.map(num => getLiveTrainStatus(num, { forceRefresh, mode }))
    );

    const trains: any[] = [];
    let liveCount = 0;
    let demoCount = 0;
    let latestUpstreamUpdate: string | undefined;

    for (const r of results) {
      if (r.data) {
        trains.push(r.data);
        if (r.upstreamUpdatedAt && (!latestUpstreamUpdate || r.upstreamUpdatedAt > latestUpstreamUpdate)) {
          latestUpstreamUpdate = r.upstreamUpdatedAt;
        }
      }
      if (r.source === 'LIVE') liveCount++;
      if (r.source === 'DEMO') demoCount++;
    }

    const source = mode === 'live' ? (liveCount > 0 ? 'LIVE' : 'UNAVAILABLE') : 'DEMO';

    res.json({
      success: source !== 'UNAVAILABLE',
      source,
      trains,
      timestamp: new Date().toISOString(),
      upstreamUpdatedAt: latestUpstreamUpdate,
      cycleCadenceMinutes: 20,
      corridor: 'BPP-CLX-BZA Trunk Corridor'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error processing corridor live trains',
      source: 'UNAVAILABLE',
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
    res.json({
      success: result.source !== 'UNAVAILABLE',
      data: result.data,
      source: result.source,
      timestamp: result.timestamp,
      upstreamUpdatedAt: result.upstreamUpdatedAt,
      meta: { cached: !!result.cached, cacheExpiresAt: result.cacheExpiresAt }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error processing train schedule',
      source: 'UNAVAILABLE',
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
    res.json({
      success: result.source !== 'UNAVAILABLE',
      data: result.data,
      source: result.source,
      timestamp: result.timestamp,
      upstreamUpdatedAt: result.upstreamUpdatedAt,
      meta: { cached: !!result.cached, cacheExpiresAt: result.cacheExpiresAt }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error processing trains between stations',
      source: 'UNAVAILABLE',
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
    res.json({
      success: result.source !== 'UNAVAILABLE',
      data: result.data,
      source: result.source,
      timestamp: result.timestamp,
      upstreamUpdatedAt: result.upstreamUpdatedAt,
      meta: { cached: !!result.cached, cacheExpiresAt: result.cacheExpiresAt }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error processing station timetable',
      source: 'UNAVAILABLE',
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
    res.json({
      success: true,
      data: result.data,
      source: result.source,
      timestamp: result.timestamp
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error searching stations',
      source: 'UNAVAILABLE',
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
    res.json({
      success: true,
      data: result.data,
      source: result.source,
      timestamp: result.timestamp
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error searching trains',
      source: 'UNAVAILABLE',
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

