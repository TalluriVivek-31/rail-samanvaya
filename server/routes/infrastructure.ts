import { Router, Request, Response } from 'express';
import { 
  CORRIDOR, 
  SECTIONS, 
  STATIONS, 
  ASSETS, 
  detectLocation 
} from '../services/infrastructureService.js';
import { resolveLocationIntelligence } from '../services/locationIntelligenceService.js';
import { 
  searchStations, 
  getStationDetails, 
  getTracksInBoundingBox, 
  resolveMaintenanceLocation 
} from '../services/railwayGeospatialService.js';

const router = Router();

// GET /api/infrastructure/master
router.get('/master', (req: Request, res: Response): void => {
  res.json({
    success: true,
    corridor: CORRIDOR,
    sections: SECTIONS,
    stations: STATIONS,
    assetsCount: ASSETS.length,
    timestamp: new Date().toISOString()
  });
});

// GET /api/infrastructure/stations/search?q=...&limit=...
router.get('/stations/search', (req: Request, res: Response): void => {
  const q = (req.query.q as string) || '';
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
  const stations = searchStations(q, limit);
  res.json({
    success: true,
    count: stations.length,
    stations,
    source: 'OSM',
    timestamp: new Date().toISOString()
  });
});

// GET /api/infrastructure/stations/:code
router.get('/stations/:code', (req: Request, res: Response): void => {
  const code = String(req.params.code || '');
  const result = getStationDetails(code);
  if (!result.station) {
    res.status(404).json({
      success: false,
      error: `Station '${code}' not found in national railway dataset.`,
      timestamp: new Date().toISOString()
    });
    return;
  }
  res.json({
    success: true,
    ...result,
    source: 'OSM',
    timestamp: new Date().toISOString()
  });
});

// GET /api/infrastructure/tracks?bbox=minLat,minLng,maxLat,maxLng&zoom=...
router.get('/tracks', (req: Request, res: Response): void => {
  const bboxQuery = req.query.bbox as string;
  const zoom = req.query.zoom ? parseInt(req.query.zoom as string, 10) : 6;
  
  let bbox: [number, number, number, number] = [6.0, 68.0, 37.5, 97.5]; // Default all-India bounds
  if (bboxQuery) {
    const parts = bboxQuery.split(',').map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      bbox = [parts[0], parts[1], parts[2], parts[3]];
    }
  }

  const tracks = getTracksInBoundingBox(bbox, zoom);
  res.json({
    success: true,
    count: tracks.length,
    tracks,
    source: 'OSM',
    timestamp: new Date().toISOString()
  });
});

// POST /api/infrastructure/detect-location
router.post('/detect-location', (req: Request, res: Response): void => {
  const { startLocation, endLocation } = req.body || {};
  const result = detectLocation(startLocation, endLocation);

  if (!result.isValid) {
    res.status(400).json({
      success: false,
      error: result.error,
      timestamp: new Date().toISOString()
    });
    return;
  }

  res.json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
});

// POST /api/infrastructure/analyze-conflicts
router.post('/analyze-conflicts', (req: Request, res: Response): void => {
  const { startKm, endKm, tracks, duration, requestedTime } = req.body || {};
  const dur = Number(duration) || 120;

  // Simulate train passage conflict against Karnataka Express at 02:25
  const hasConflictAtNight = tracks && tracks.some((t: string) => t.includes('UP') || t.includes('Main'));

  const candidateWindows = [
    {
      slotId: 'SLOT-01',
      startTime: '02:00',
      endTime: '04:00',
      durationMinutes: dur,
      status: hasConflictAtNight ? 'CONFLICT' : 'FEASIBLE',
      conflictingTrain: hasConflictAtNight ? {
        trainNumber: '12627',
        trainName: 'Karnataka Express',
        estimatedArrivalAtKm: '02:25 IST (Passing KM 12/600)',
        delayMinutes: 0
      } : undefined,
      reason: hasConflictAtNight 
        ? 'Headway Collision Overlap: Train 12627 scheduled passage at 02:25 IST violates G&SR 15-min safety isolation.'
        : 'Feasible slot.',
    },
    {
      slotId: 'SLOT-02',
      startTime: '04:30',
      endTime: '06:30',
      durationMinutes: dur,
      status: 'FEASIBLE',
      isRecommended: true,
      reason: 'Feasible maintenance window with no projected train conflict and compatible overlapping maintenance activities.',
    },
    {
      slotId: 'SLOT-03',
      startTime: '07:00',
      endTime: '08:00',
      durationMinutes: 60,
      status: dur > 60 ? 'INSUFFICIENT_DURATION' : 'FEASIBLE',
      reason: dur > 60 
        ? `Slot duration (60 min) is insufficient for requested ${dur} min work.`
        : 'Short feasible maintenance slot.',
    }
  ];

  res.json({
    success: true,
    candidateWindows,
    recommendedWindow: candidateWindows[1],
    timestamp: new Date().toISOString()
  });
});

// POST /api/infrastructure/location-intelligence
// Combines Infrastructure Master + OpenRailwayMap / OSM GIS + RailRadar train approach
router.post('/location-intelligence', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startLocation, endLocation, track, liveTrains, stationCode } = req.body || {};
    const result = await resolveLocationIntelligence(
      startLocation || '12/400',
      endLocation || '13/100',
      track || 'UP Main',
      liveTrains || [],
      stationCode
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Location Intelligence Route Error]', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve location intelligence: ' + (error?.message || 'Internal error'),
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
