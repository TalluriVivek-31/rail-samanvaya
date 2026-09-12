import { Router, Request, Response } from 'express';
import { getLiveTrainStatus, getLiveStationBoard, getLiveTrainRoute, clearRailRadarCache } from '../services/railRadarService.js';

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

// GET /api/railradar/train/:number/live
router.get('/train/:number/live', async (req: Request, res: Response): Promise<void> => {
  try {
    const { number } = req.params;
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const mode = (req.query.mode === 'live' ? 'live' : 'demo') as 'live' | 'demo';
    const date = req.query.date as string | undefined;

    const result = await getLiveTrainStatus(number, { forceRefresh, mode, date });
    
    if (result.source === 'UNAVAILABLE' || !result.data) {
      res.status(result.source === 'UNAVAILABLE' ? 503 : 404).json({
        success: false,
        error: result.error || 'Train telemetry unavailable',
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

    const result = await getLiveStationBoard(code.toUpperCase(), { forceRefresh, mode });
    
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

    const result = await getLiveTrainRoute(number, { forceRefresh });
    
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

export default router;
