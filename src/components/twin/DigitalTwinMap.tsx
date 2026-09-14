// High-Precision Geospatial Railway Digital Twin Map
// Indian Railways · National Digital Twin Network
// Interactive 2D Tactical GIS Map with WGS84 track geometries, national trunk corridors,
// direction-aware map-matching across India, maintenance possession hazard slicing,
// dynamic train approach ETAs, and interactive nationwide inspectors.

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSamnvayStore } from '../../store/useSamnvayStore';
import { 
  INDIA_BOUNDS,
  INDIA_ZONE_BOUNDS,
  INDIA_BOUNDARY_COORDS,
  NATIONAL_RAILWAY_TRACKS,
  NATIONAL_STATION_GEOS,
  ALL_TRACKS,
  CORRIDOR_TRACKS, 
  CORRIDOR_STATION_GEOS, 
  CORRIDOR_SIGNALS,
  mapMatchTrainToTrack,
  getGeospatialMaintenanceZones,
  evaluateTrainBlockApproach,
  MapMatchedTrain,
  GeospatialMaintenanceZone,
  CorridorStationGeo,
  CorridorSignalGeo
} from '../../utils/railwayGeospatial';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  Crosshair, 
  Wrench, 
  AlertTriangle, 
  Clock, 
  Train as TrainIcon,
  ShieldCheck, 
  Activity, 
  X, 
  Compass,
  Radio,
  MapPin,
  ExternalLink,
  ChevronRight,
  Info,
  Search,
  Globe
} from 'lucide-react';
import { formatIndianTime, formatDelay } from '../../utils/dateTime';
import { fetchLiveTrainStatus } from '../../services/railRadarClient';
import type { LiveTrainPosition } from '../../types/samnvay';
import indiaOutlineSrc from '../../assets/india_map_outline.png';

export const DigitalTwinMap: React.FC = () => {
  const { state, toggleLayer } = useSamnvayStore();
  const svgRef = useRef<SVGSVGElement>(null);

  // Pan & Zoom viewport state (defaults to full India at zoom 1.0)
  const [zoom, setZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Inspector states
  const [selectedTrain, setSelectedTrain] = useState<MapMatchedTrain | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<GeospatialMaintenanceZone | null>(null);
  const [selectedStation, setSelectedStation] = useState<CorridorStationGeo | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<{ type: string; name: string; info: string; x: number; y: number } | null>(null);
  const [isLayerControlOpen, setIsLayerControlOpen] = useState(false);
  const [searchTrainText, setSearchTrainText] = useState('');
  const [correlatedBlockId, setCorrelatedBlockId] = useState<string | null>(null);

  // Dynamically searched trains stored for live nationwide map rendering
  const [dynamicallySearchedTrains, setDynamicallySearchedTrains] = useState<LiveTrainPosition[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [searchStatusMsg, setSearchStatusMsg] = useState<string | null>(null);

  // SVG canvas dimensions (ample height for Indian subcontinent aspect ratio)
  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 760;
  const PADDING = 45;

  // Convert WGS84 GPS (lat, lng) to SVG pixel coordinates using equirectangular India projection
  const project = (lat: number, lng: number): { x: number; y: number } => {
    const normX = (lng - INDIA_BOUNDS.minLng) / (INDIA_BOUNDS.maxLng - INDIA_BOUNDS.minLng);
    const normY = (INDIA_BOUNDS.maxLat - lat) / (INDIA_BOUNDS.maxLat - INDIA_BOUNDS.minLat);

    const baseWidth = SVG_WIDTH - 2 * PADDING;
    const baseHeight = SVG_HEIGHT - 2 * PADDING;

    const rawX = PADDING + normX * baseWidth;
    const rawY = PADDING + normY * baseHeight;

    // Apply zoom around center and pan offset
    const centerX = SVG_WIDTH / 2;
    const centerY = SVG_HEIGHT / 2;

    const zoomedX = centerX + (rawX - centerX) * zoom + panOffset.x;
    const zoomedY = centerY + (rawY - centerY) * zoom + panOffset.y;

    return { x: Math.round(zoomedX * 10) / 10, y: Math.round(zoomedY * 10) / 10 };
  };

  // Convert polyline to SVG path 'd' string
  const polylineToSvgPath = (points: { lat: number; lng: number }[]): string => {
    if (points.length === 0) return '';
    const first = project(points[0].lat, points[0].lng);
    let d = `M ${first.x} ${first.y}`;
    for (let i = 1; i < points.length; i++) {
      const pt = project(points[i].lat, points[i].lng);
      d += ` L ${pt.x} ${pt.y}`;
    }
    return d;
  };

  // Smooth centering onto any WGS84 coordinate at a desired zoom factor
  const centerOnCoord = (lat: number, lng: number, targetZoom: number) => {
    const normX = (lng - INDIA_BOUNDS.minLng) / (INDIA_BOUNDS.maxLng - INDIA_BOUNDS.minLng);
    const normY = (INDIA_BOUNDS.maxLat - lat) / (INDIA_BOUNDS.maxLat - INDIA_BOUNDS.minLat);
    const baseWidth = SVG_WIDTH - 2 * PADDING;
    const baseHeight = SVG_HEIGHT - 2 * PADDING;
    const rawX = PADDING + normX * baseWidth;
    const rawY = PADDING + normY * baseHeight;
    const centerX = SVG_WIDTH / 2;
    const centerY = SVG_HEIGHT / 2;

    setZoom(targetZoom);
    setPanOffset({
      x: -(rawX - centerX) * targetZoom,
      y: -(rawY - centerY) * targetZoom
    });
  };

  // Center on designated railway zone
  const centerOnZone = (zoneId: string) => {
    const zone = INDIA_ZONE_BOUNDS[zoneId];
    if (zone) {
      centerOnCoord(zone.centerLat, zone.centerLng, zone.zoomLevel);
    }
  };

  // Major national railway hubs and junction codes for high-level India view
  const MAJOR_NATIONAL_STATION_CODES = useMemo(() => new Set([
    'NDLS', 'BCT', 'MMCT', 'HWH', 'MAS', 'SBC', 'SC', 'GHY', 'PNBE', 'ADI', 
    'BZA', 'GNT', 'NGP', 'BPL', 'CNB', 'LKO', 'VGLJ', 'AGC', 'JAT', 'SVDK', 
    'BBS', 'VSKP', 'MAO', 'ERS', 'TVC', 'JP', 'RTM', 'BSB', 'PBR', 'ROU', 
    'TATA', 'DDU', 'KOTA', 'ED', 'MYS', 'AII', 'UMB', 'LDH', 'BPP', 'CLX', 'TEL'
  ]), []);

  // Cardinal metro gateways & zone capitals for low-zoom uncluttered overview
  const KEY_METRO_STATION_CODES = useMemo(() => new Set([
    'NDLS', 'BCT', 'HWH', 'MAS', 'SBC', 'SC', 'GHY', 'ADI', 'TVC', 'SVDK', 'BZA', 'NGP'
  ]), []);

  // Unified stations across India (National trunk network + Prototype corridor)
  const allStations = useMemo(() => {
    const map = new Map<string, CorridorStationGeo>();
    for (const [code, stn] of Object.entries(NATIONAL_STATION_GEOS)) {
      map.set(code, stn);
    }
    for (const [code, stn] of Object.entries(CORRIDOR_STATION_GEOS)) {
      map.set(code, stn);
    }
    return Array.from(map.values());
  }, []);

  // Sliced Maintenance Possession Zones (evaluated against all tracks)
  const maintenanceZones = useMemo(() => {
    return getGeospatialMaintenanceZones(state.requests, ALL_TRACKS);
  }, [state.requests]);

  // Map-matched digital trains across India
  const matchedTrains = useMemo(() => {
    const rawTrains = [...(state.liveData.liveTrains || []), ...dynamicallySearchedTrains];
    // Deduplicate by trainNumber
    const uniqueTrains = Array.from(new Map(rawTrains.map(t => [t.trainNumber, t])).values());

    return uniqueTrains.map(train => {
      const matched = mapMatchTrainToTrack(train, ALL_TRACKS);
      
      // Evaluate proximity to any active maintenance zones
      if (maintenanceZones.length > 0) {
        for (const zone of maintenanceZones) {
          const approach = evaluateTrainBlockApproach(matched, zone);
          if (approach && approach.status !== 'CLEAR') {
            matched.approachBlock = approach;
            break;
          }
        }
      }
      return matched;
    });
  }, [state.liveData.liveTrains, dynamicallySearchedTrains, maintenanceZones]);

  // Mouse interaction handlers for smooth dragging & zooming
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // primary click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom(prev => Math.min(Math.max(prev * zoomFactor, 0.7), 4.5));
  };

  // Focus directly on a specific station
  const focusStation = (stn: CorridorStationGeo) => {
    setSelectedStation(stn);
    centerOnCoord(stn.lat, stn.lng, 3.2);
  };

  // Focus directly on a specific train anywhere in India
  const focusTrain = (mt: MapMatchedTrain) => {
    setSelectedTrain(mt);
    centerOnCoord(mt.snappedCoord.lat, mt.snappedCoord.lng, 2.8);
  };

  // Handle nationwide train search
  const handleTrainSearch = async (queryText: string) => {
    const q = queryText.trim().toLowerCase();
    if (!q) return;
    setSearchStatusMsg(null);

    // 1. Search locally in active store / existing trains
    const foundLocal = matchedTrains.find(t => 
      t.train.trainNumber.toLowerCase().includes(q) || 
      t.train.trainName.toLowerCase().includes(q)
    );
    if (foundLocal) {
      focusTrain(foundLocal);
      setSearchStatusMsg(`Located: ${foundLocal.train.trainNumber} ${foundLocal.train.trainName}`);
      return;
    }

    // 2. Query live telemetry via server RailRadar proxy
    setIsSearchingOnline(true);
    setSearchStatusMsg(`Searching nationwide telemetry for ${q}...`);
    try {
      const res = await fetchLiveTrainStatus(q, { mode: state.isLiveMode ? 'live' : 'demo' });
      if (res.data) {
        setDynamicallySearchedTrains(prev => [...prev.filter(t => t.trainNumber !== res.data!.trainNumber), res.data!]);
        const matched = mapMatchTrainToTrack(res.data, ALL_TRACKS);
        focusTrain(matched);
        setSearchStatusMsg(`Located: ${res.data.trainNumber} ${res.data.trainName}`);
      } else {
        setSearchStatusMsg(`Train ${q} not currently reporting active telemetry.`);
      }
    } catch {
      setSearchStatusMsg(`Could not resolve telemetry for ${q}`);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  // Active Correlated Maintenance Zone
  const correlatedBlock = useMemo(() => {
    if (correlatedBlockId) {
      return maintenanceZones.find(z => z.blockId === correlatedBlockId) || null;
    }
    if (selectedBlock) return selectedBlock;
    if (selectedTrain?.approachBlock) {
      return maintenanceZones.find(z => z.blockId === selectedTrain.approachBlock?.blockId) || null;
    }
    return null;
  }, [correlatedBlockId, selectedBlock, selectedTrain, maintenanceZones]);

  // Train ↔ Maintenance Distance & Dynamic ETA Evaluation
  const correlationApproach = useMemo(() => {
    if (selectedTrain && correlatedBlock) {
      return evaluateTrainBlockApproach(selectedTrain, correlatedBlock);
    }
    return null;
  }, [selectedTrain, correlatedBlock]);

  const resetView = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
    setSelectedTrain(null);
    setSelectedBlock(null);
    setSelectedStation(null);
    setCorrelatedBlockId(null);
    setSearchStatusMsg(null);
  };

  return (
    <div className="relative w-full h-[780px] bg-[#FDFDFF] rounded-2xl border border-slate-200 shadow-lg overflow-hidden select-none font-sans text-slate-800">
      
      {/* 1. TOP COMMAND TELEMETRY BAR */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-3 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${
              state.liveData.source === 'LIVE' ? 'bg-[#62929E] animate-pulse' : 
              state.liveData.source === 'UNAVAILABLE' ? 'bg-rose-500' : 'bg-slate-400'
            }`} />
            <span className="font-bold text-[#546A7B]">GEOSPATIAL TWIN:</span>
            <span className="text-slate-700">INDIAN RAILWAYS · NATIONAL NETWORK</span>
          </div>

          <span className="text-slate-300">|</span>

          <div className="flex items-center space-x-1.5 text-slate-600 text-[11px]">
            <span className="text-slate-400">FEED:</span>
            <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
              state.liveData.source === 'LIVE' ? 'bg-[#62929E]/10 text-[#62929E] border border-[#62929E]/30' :
              state.liveData.source === 'UNAVAILABLE' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
              'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
              {state.liveData.source === 'LIVE' ? 'RailRadar™ LIVE' :
               state.liveData.source === 'UNAVAILABLE' ? 'LIVE DATA UNAVAILABLE' : 'DEMO / SIMULATED'}
            </span>
          </div>

          <span className="text-slate-300">|</span>

          <div className="text-slate-500 text-[11px] hidden md:flex items-center gap-2">
            <span>TRAINS: <strong className="text-slate-800">{matchedTrains.length}</strong></span>
            <span>•</span>
            <span>POSSESSIONS: <strong className="text-[#62929E]">{maintenanceZones.length}</strong></span>
            <span>•</span>
            <span>CORRIDORS: <strong className="text-[#546A7B]">{ALL_TRACKS.length}</strong></span>
          </div>
        </div>

        {/* Railway Zone View Navigators */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-400 uppercase font-semibold mr-1">Zone / View:</span>
          <button
            onClick={resetView}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
              zoom === 1.0 && panOffset.x === 0 && panOffset.y === 0
                ? 'bg-[#546A7B] text-white shadow-sm' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            ALL INDIA
          </button>
          {[
            { id: 'NORTHERN', label: 'NORTH' },
            { id: 'WESTERN', label: 'WEST' },
            { id: 'CENTRAL', label: 'CENTRAL' },
            { id: 'EASTERN', label: 'EAST' },
            { id: 'SOUTHERN', label: 'SOUTH' },
            { id: 'NORTHEAST', label: 'NE' },
            { id: 'PROTOTYPE', label: 'PROTOTYPE CORRIDOR' },
          ].map(z => (
            <button
              key={z.id}
              onClick={() => centerOnZone(z.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                z.id === 'PROTOTYPE'
                  ? 'bg-[#62929E]/15 hover:bg-[#62929E]/25 text-[#546A7B] border border-[#62929E]/40'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1B. SECONDARY SEARCH & TRAIN-MAINTENANCE CORRELATION TOOLBAR */}
      <div className="absolute top-14 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-3 bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-xs font-mono">
        {/* Train Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#546A7B] font-bold flex items-center gap-1">
            <Search className="w-3.5 h-3.5" />
            <span>Search Train:</span>
          </span>
          <div className="relative flex items-center gap-1.5">
            <div className="relative">
              <input
                type="text"
                value={searchTrainText}
                onChange={e => setSearchTrainText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleTrainSearch(searchTrainText);
                  }
                }}
                placeholder="Train # or Name across India..."
                className="bg-slate-50 text-slate-800 placeholder-slate-400 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-mono focus:outline-none focus:border-[#546A7B] w-48"
              />
              {searchTrainText && (
                <button 
                  onClick={() => {
                    setSearchTrainText('');
                    setSearchStatusMsg(null);
                  }} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-[10px]"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              onClick={() => handleTrainSearch(searchTrainText)}
              disabled={isSearchingOnline}
              className="px-2.5 py-1 rounded-lg bg-[#546A7B] hover:bg-[#435563] disabled:opacity-50 text-white font-bold text-[11px] transition cursor-pointer shadow-sm"
            >
              {isSearchingOnline ? 'Locating...' : 'FIND'}
            </button>
          </div>

          {/* Quick chips for major Indian trains */}
          <div className="hidden xl:flex items-center gap-1 text-[10px]">
            <span className="text-slate-400">Quick:</span>
            {['12627', '12951', '12301', '20834'].map(tNo => (
              <button
                key={tNo}
                onClick={() => {
                  setSearchTrainText(tNo);
                  handleTrainSearch(tNo);
                }}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[#546A7B] border border-slate-200 font-mono cursor-pointer"
              >
                {tNo}
              </button>
            ))}
          </div>

          {searchStatusMsg && (
            <span className="text-[11px] text-[#62929E] font-semibold ml-1">
              {searchStatusMsg}
            </span>
          )}
        </div>

        {/* Maintenance Possession Correlation Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[#62929E] font-bold flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5" />
            <span>Correlate Work:</span>
          </span>
          <select
            value={correlatedBlockId || ''}
            onChange={e => setCorrelatedBlockId(e.target.value || null)}
            className="bg-slate-50 text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-[#62929E] max-w-[260px] truncate"
          >
            <option value="">-- None (View All Work) --</option>
            {maintenanceZones.map(z => (
              <option key={z.blockId} value={z.blockId}>
                {z.blockId}: {z.department} (KM {z.startKm}-{z.endKm})
              </option>
            ))}
          </select>
        </div>

        {/* Active Correlation Summary Pill */}
        {correlatedBlock && selectedTrain ? (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px]">
            <span className="text-[#546A7B] font-bold">{selectedTrain.train.trainNumber}</span>
            <span className="text-slate-400">↔</span>
            <span className="text-[#62929E] font-bold">{correlatedBlock.blockId}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">
              {correlationApproach?.distanceKm !== undefined && correlationApproach.distanceKm < 900
                ? `${correlationApproach.distanceKm} km · ETA ${correlationApproach.dynamicEtaMinutes}m`
                : 'Adjacent line'}
            </span>
            <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
              correlationApproach?.status === 'INSIDE_BLOCK_ZONE' ? 'bg-red-100 text-red-700 border border-red-200' :
              correlationApproach?.status === 'IMMINENT_APPROACH' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
              'bg-[#62929E]/15 text-[#546A7B] border border-[#62929E]/30'
            }`}>
              {correlationApproach?.status || 'CLEAR'}
            </span>
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 hidden lg:block">
            Tip: Select any train or maintenance block across India to inspect spatial relationship and dynamic ETA
          </div>
        )}
      </div>

      {/* 2. MAP VIEWPORT & SVG CANVAS */}
      <div 
        className="w-full h-full cursor-grab active:cursor-grabbing relative overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Grid Pattern for Command Center Grid */}
            <pattern id="twinGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="2,2" />
            </pattern>

            {/* Maintenance Zone Hazard Diagonal Stripes Pattern */}
            <pattern id="hazardStripe" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="12" stroke="#62929E" strokeWidth="4" strokeOpacity="0.8" />
              <line x1="6" y1="0" x2="6" y2="12" stroke="#94A3B8" strokeWidth="4" strokeOpacity="0.4" />
            </pattern>

            {/* Red Imminent Hazard Pattern */}
            <pattern id="hazardStripeRed" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="12" stroke="#EF4444" strokeWidth="4" strokeOpacity="0.85" />
              <line x1="6" y1="0" x2="6" y2="12" stroke="#DC2626" strokeWidth="4" strokeOpacity="0.5" />
            </pattern>

            {/* Arrow Marker for Track Direction */}
            <marker id="arrowUp" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#546A7B" />
            </marker>
          </defs>

          {/* Background Canvas: Clean White #FDFDFF with Subtle Engineering Grid */}
          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="#FDFDFF" />
          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#twinGrid)" />

          {/* LAYER 0: INDIA SUB-CONTINENT GEOGRAPHY FROM REFERENCE IMAGE */}
          <g id="layer-subcontinent">
            {(() => {
              const imgTL = project(37.1, 68.1);
              const imgBR = project(8.08, 97.4);
              const imgW = Math.max(1, imgBR.x - imgTL.x);
              const imgH = Math.max(1, imgBR.y - imgTL.y);

              return (
                <image
                  href={indiaOutlineSrc}
                  x={imgTL.x}
                  y={imgTL.y}
                  width={imgW}
                  height={imgH}
                  preserveAspectRatio="none"
                  className="pointer-events-none select-none"
                  style={{ opacity: 0.95 }}
                />
              );
            })()}
            
            {/* India Subcontinent Watermark (subtle background label) */}
            {zoom <= 1.4 && (
              <text
                x={project(22.0, 79.5).x}
                y={project(22.0, 79.5).y}
                textAnchor="middle"
                fill="#94A3B8"
                fillOpacity={0.35}
                fontSize={22}
                fontWeight="800"
                letterSpacing={6}
                fontFamily="sans-serif"
                className="pointer-events-none select-none"
              >
                INDIAN RAILWAYS
              </text>
            )}
          </g>

          {/* LAYER 1: TRACK GEOMETRIES (PROFESSIONAL RAILWAY BLUE #546A7B + TEAL #62929E) */}
          {state.twinLayers.tracks && (
            <g id="layer-tracks">
              {ALL_TRACKS.map(track => {
                const pathD = polylineToSvgPath(track.coordinates);
                const isSelected = selectedTrain?.trackName === track.name || selectedBlock?.trackName === track.name;
                const isLoop = track.type === 'Loop Line';
                const isSiding = track.type === 'Goods Siding';

                // Professional Railway Blue #546A7B, Active/Selected in UI shade #62929E
                let strokeColor = isSelected ? '#62929E' : '#546A7B';
                let strokeWidth = isSelected ? 3.6 : (zoom < 1.3 ? 2.0 : 2.6);
                let strokeDash = 'none';
                let strokeOpacity = isSelected ? 1.0 : 0.92;

                if (isLoop) {
                  strokeDash = '5,4';
                  strokeWidth = 1.2;
                  strokeOpacity = 0.75;
                } else if (isSiding) {
                  strokeDash = '3,3';
                  strokeWidth = 1.0;
                  strokeOpacity = 0.65;
                }

                return (
                  <g key={track.id} className="group">
                    {/* Selected track halo */}
                    {isSelected && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#62929E"
                        strokeWidth={strokeWidth + 3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeOpacity={0.25}
                      />
                    )}

                    {/* Active Track Line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDash}
                      strokeOpacity={strokeOpacity}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-200"
                    />

                    {/* Interactive hit area */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={16}
                      className="cursor-pointer"
                      onMouseEnter={e => setHoveredEntity({
                        type: 'Track Corridor',
                        name: track.name,
                        info: `Speed Limit: ${track.speedLimitKmph} km/h | Chainage: KM ${track.startKm} - ${track.endKm}`,
                        x: e.clientX,
                        y: e.clientY
                      })}
                      onMouseLeave={() => setHoveredEntity(null)}
                    />
                  </g>
                );
              })}

              {/* CONFIGURED PROTOTYPE INFRASTRUCTURE BADGE & PERIMETER */}
              {(() => {
                const pCenter = project(16.38, 80.55);

                return (
                  <g id="prototype-infrastructure-badge" className="cursor-pointer" onClick={() => centerOnZone('PROTOTYPE')}>
                    {/* Ring around prototype area */}
                    <circle
                      cx={pCenter.x}
                      cy={pCenter.y}
                      r={zoom < 1.4 ? 14 : 55}
                      fill="none"
                      stroke="#62929E"
                      strokeWidth={1.2}
                      strokeDasharray="4,4"
                      className="opacity-75"
                    />
                    
                    {/* Pill label - displayed when zoomed in to avoid obstructing national view */}
                    {zoom >= 1.4 && (
                      <g transform={`translate(${pCenter.x}, ${pCenter.y - 65})`}>
                        <rect
                          x={-90}
                          y={-12}
                          width={180}
                          height={24}
                          rx={6}
                          fill="#FFFFFF"
                          fillOpacity={0.96}
                          stroke="#62929E"
                          strokeWidth={1.2}
                          className="shadow-sm"
                        />
                        <text
                          x={0}
                          y={-1}
                          textAnchor="middle"
                          fill="#546A7B"
                          fontSize={8.5}
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          ⚡ CONFIGURED PROTOTYPE
                        </text>
                        <text
                          x={0}
                          y={8}
                          textAnchor="middle"
                          fill="#62929E"
                          fontSize={7.5}
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          BZA–GNT–TEL · BPP–CLX (HIGH RES)
                        </text>
                      </g>
                    )}
                  </g>
                );
              })()}
            </g>
          )}

          {/* LAYER 2: MAINTENANCE POSSESSION ZONES (SECONDARY TEAL #62929E) */}
          {state.twinLayers.maintenanceBlocks && (
            <g id="layer-maintenance">
              {maintenanceZones.map(zone => {
                const pathD = polylineToSvgPath(zone.polyline);
                const isSelected = selectedBlock?.blockId === zone.blockId;

                return (
                  <g 
                    key={zone.blockId}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBlock(zone);
                      setSelectedTrain(null);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Zone Highlight Area */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#62929E"
                      strokeWidth={14}
                      strokeLinecap="round"
                      strokeOpacity={isSelected ? 0.35 : 0.18}
                    />

                    {/* Striped Possession Zone */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="url(#hazardStripe)"
                      strokeWidth={8}
                      strokeLinecap="round"
                    />

                    {/* Possession Center Marker */}
                    {(() => {
                      const centerProj = project(zone.centerCoord.lat, zone.centerCoord.lng);
                      return (
                        <g transform={`translate(${centerProj.x}, ${centerProj.y})`}>
                          <circle r={9} fill="#FFFFFF" stroke="#62929E" strokeWidth={2} className="shadow-sm" />
                          <text
                            y={3.5}
                            textAnchor="middle"
                            fill="#62929E"
                            fontSize={9}
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            ⚠️
                          </text>
                          <g transform="translate(0, -14)">
                            <rect
                              x={-45}
                              y={-9}
                              width={90}
                              height={16}
                              rx={3}
                              fill="#FFFFFF"
                              fillOpacity={0.96}
                              stroke="#62929E"
                              strokeWidth={1}
                              className="shadow-sm"
                            />
                            <text
                              x={0}
                              y={3}
                              textAnchor="middle"
                              fill="#546A7B"
                              fontSize={8.5}
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {zone.blockId} ({zone.department})
                            </text>
                          </g>
                        </g>
                      );
                    })()}
                  </g>
                );
              })}
            </g>
          )}

          {/* LAYER 3: AUTOMATIC BLOCK SIGNALS */}
          {state.twinLayers.signals && (
            <g id="layer-signals">
              {CORRIDOR_SIGNALS.map(sig => {
                const proj = project(sig.lat, sig.lng);
                let aspectColor = '#10b981'; // GREEN
                if (sig.defaultAspect === 'YELLOW') aspectColor = '#f59e0b';
                else if (sig.defaultAspect === 'DOUBLE_YELLOW') aspectColor = '#fbbf24';
                else if (sig.defaultAspect === 'RED') aspectColor = '#ef4444';

                // Check if an active maintenance block is near this signal, switch aspect to RED
                const isBlockedByWork = maintenanceZones.some(z => 
                  Math.abs(z.startKm - sig.km) <= 1.5 || Math.abs(z.endKm - sig.km) <= 1.5
                );
                if (isBlockedByWork) aspectColor = '#ef4444';

                return (
                  <g 
                    key={sig.id} 
                    transform={`translate(${proj.x}, ${proj.y})`}
                    className="cursor-pointer"
                    onMouseEnter={e => setHoveredEntity({
                      type: 'Auto Block Signal',
                      name: sig.name,
                      info: `KM ${sig.km} · Direction ${sig.direction} · Aspect: ${isBlockedByWork ? 'RED (BLOCKED)' : sig.defaultAspect}`,
                      x: e.clientX,
                      y: e.clientY
                    })}
                    onMouseLeave={() => setHoveredEntity(null)}
                  >
                    {/* Signal Mast Post */}
                    <line x1={0} y1={0} x2={0} y2={-10} stroke="#64748b" strokeWidth={1.5} />
                    {/* Signal Lamp Housing */}
                    <circle cx={0} cy={-12} r={4.5} fill="#334155" stroke="#FFFFFF" strokeWidth={1} />
                    {/* Lamp */}
                    <circle cx={0} cy={-12} r={3} fill={aspectColor} />
                  </g>
                );
              })}
            </g>
          )}

          {/* LAYER 4: STATIONS & JUNCTIONS ACROSS INDIA */}
          <g id="layer-stations">
            {allStations
              .filter(stn => zoom >= 1.6 || MAJOR_NATIONAL_STATION_CODES.has(stn.code) || selectedStation?.code === stn.code)
              .map(stn => {
                const proj = project(stn.lat, stn.lng);
                const isSelected = selectedStation?.code === stn.code;
                const isMajorHub = MAJOR_NATIONAL_STATION_CODES.has(stn.code);
                const isKeyMetro = KEY_METRO_STATION_CODES.has(stn.code);
                const showCodePill = isSelected || (zoom < 1.3 ? isKeyMetro : isMajorHub);

                return (
                  <g
                    key={stn.code}
                    transform={`translate(${proj.x}, ${proj.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      focusStation(stn);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Station Yard Radius */}
                    <circle
                      r={isSelected ? 18 : isMajorHub ? (zoom < 1.4 ? 5 : 10) : 6}
                      fill={isSelected ? '#62929E' : '#546A7B'}
                      fillOpacity={isSelected ? 0.2 : 0.08}
                      stroke={isSelected ? '#62929E' : '#94A3B8'}
                      strokeWidth={isSelected ? 1.8 : 0.8}
                      className="transition-all"
                    />

                    {/* Core Station Marker */}
                    <circle
                      r={isMajorHub ? 3.2 : 2.2}
                      fill={isSelected ? '#62929E' : '#546A7B'}
                      stroke="#FFFFFF"
                      strokeWidth={1.2}
                    />

                    {/* Station Code Label (Tiered for clean, uncluttered national overview) */}
                    {showCodePill && (
                      <g transform="translate(0, 4)">
                        <rect
                          x={-15}
                          y={2}
                          width={30}
                          height={13}
                          rx={3}
                          fill="#FFFFFF"
                          fillOpacity={0.95}
                          stroke={isSelected ? '#62929E' : '#CBD5E1'}
                          strokeWidth={1}
                          className="shadow-sm"
                        />
                        <text
                          x={0}
                          y={11.5}
                          textAnchor="middle"
                          fill={isSelected ? '#62929E' : '#334155'}
                          fontSize={8}
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {stn.code}
                        </text>
                      </g>
                    )}

                    {/* Station Name & KM on hover or selection */}
                    {(isSelected || zoom > 2.0) && (
                      <text
                        x={0}
                        y={-14}
                        textAnchor="middle"
                        fill="#475569"
                        fontSize={8.5}
                        fontFamily="sans-serif"
                        fontWeight="600"
                      >
                        {stn.name} {stn.km !== undefined && stn.km > 0 ? `(KM ${stn.km})` : ''}
                      </text>
                    )}
                  </g>
                );
              })}
          </g>

          {/* LAYER 5: DIGITAL TRAINS (MAP-MATCHED) */}
          {state.twinLayers.trains && (
            <g id="layer-trains">
              {matchedTrains.map(mt => {
                const proj = project(mt.snappedCoord.lat, mt.snappedCoord.lng);
                const isSelected = selectedTrain?.train.trainNumber === mt.train.trainNumber;
                const hasApproach = mt.approachBlock && mt.approachBlock.status !== 'CLEAR';

                return (
                  <g
                    key={mt.train.trainNumber}
                    transform={`translate(${proj.x}, ${proj.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTrain(mt);
                      setSelectedBlock(null);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Live Train Beacon Pulse */}
                    {mt.isLive && (
                      <circle
                        r={16}
                        fill="#62929E"
                        fillOpacity={0.2}
                        className="animate-ping"
                      />
                    )}

                    {/* Threat / Imminent Hazard Zone Ring */}
                    {hasApproach && (
                      <circle
                        r={20}
                        fill="#ef4444"
                        fillOpacity={0.15}
                        stroke="#ef4444"
                        strokeWidth={1.5}
                        strokeDasharray="3,3"
                        className="animate-spin"
                        style={{ animationDuration: '6s' }}
                      />
                    )}

                    {/* Train Locomotive Marker rotated along track bearing */}
                    <g transform={`rotate(${mt.bearingDegrees})`}>
                      {/* Train Body */}
                      <rect
                        x={-5}
                        y={-13}
                        width={10}
                        height={26}
                        rx={3}
                        fill={hasApproach ? '#ef4444' : isSelected ? '#62929E' : mt.train.direction === 'UP' ? '#546A7B' : '#62929E'}
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        className="shadow-sm"
                      />
                      {/* Headlight Cab */}
                      <circle cx={0} cy={-9} r={1.8} fill="#fef08a" />
                    </g>

                    {/* Train Tag Label */}
                    <g transform="translate(14, -10)">
                      <rect
                        x={0}
                        y={0}
                        width={112}
                        height={24}
                        rx={4}
                        fill="#FFFFFF"
                        fillOpacity={0.96}
                        stroke={hasApproach ? '#ef4444' : isSelected ? '#62929E' : '#CBD5E1'}
                        strokeWidth={1.2}
                        className="shadow-sm"
                      />
                      <text
                        x={6}
                        y={11}
                        fill="#1E293B"
                        fontSize={9.5}
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {mt.train.trainNumber} {mt.train.direction}
                      </text>
                      <text
                        x={6}
                        y={20}
                        fill={hasApproach ? '#dc2626' : '#64748b'}
                        fontSize={8}
                        fontFamily="monospace"
                      >
                        {mt.train.speedKmph} km/h · {formatDelay(mt.train.delaySeconds, mt.train.delayMinutes).text}
                      </text>
                    </g>

                    {/* Approaching Hazard Tag */}
                    {hasApproach && (
                      <g transform="translate(14, 18)">
                        <rect
                          x={0}
                          y={0}
                          width={115}
                          height={16}
                          rx={3}
                          fill="#FEF2F2"
                          stroke="#EF4444"
                          strokeWidth={1}
                        />
                        <text
                          x={6}
                          y={11}
                          fill="#991B1B"
                          fontSize={8}
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          ⚠️ {mt.approachBlock?.status === 'INSIDE_BLOCK_ZONE' ? 'IN BLOCK' : `ETA ${mt.approachBlock?.dynamicEtaMinutes}m (${mt.approachBlock?.distanceKm}km)`}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* LAYER 6: TRAIN ↔ MAINTENANCE CORRELATION VECTOR */}
          {selectedTrain && correlatedBlock && (
            <g id="layer-correlation-vector">
              {(() => {
                const pTrain = project(selectedTrain.snappedCoord.lat, selectedTrain.snappedCoord.lng);
                const pBlock = project(correlatedBlock.centerCoord.lat, correlatedBlock.centerCoord.lng);
                const midX = (pTrain.x + pBlock.x) / 2;
                const midY = (pTrain.y + pBlock.y) / 2;
                const isThreat = correlationApproach?.status === 'IMMINENT_APPROACH' || correlationApproach?.status === 'INSIDE_BLOCK_ZONE';
                const isApproaching = correlationApproach?.status === 'APPROACHING';
                const strokeColor = isThreat ? '#ef4444' : isApproaching ? '#f59e0b' : '#62929E';

                return (
                  <g className="transition-all duration-300">
                    {/* Connecting dashed approach vector */}
                    <line
                      x1={pTrain.x}
                      y1={pTrain.y}
                      x2={pBlock.x}
                      y2={pBlock.y}
                      stroke={strokeColor}
                      strokeWidth={2.2}
                      strokeDasharray="6,4"
                      className="animate-pulse"
                    />

                    {/* Train Endpoint Ring */}
                    <circle
                      cx={pTrain.x}
                      cy={pTrain.y}
                      r={10}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={2}
                      strokeDasharray="4,2"
                      className="animate-spin"
                      style={{ animationDuration: '4s' }}
                    />

                    {/* Block Possession Endpoint Ring */}
                    <circle
                      cx={pBlock.x}
                      cy={pBlock.y}
                      r={14}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={2}
                      strokeDasharray="4,2"
                    />

                    {/* Mid-point Dynamic Badge */}
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x={-95}
                        y={-20}
                        width={190}
                        height={40}
                        rx={8}
                        fill="#FFFFFF"
                        fillOpacity={0.98}
                        stroke={strokeColor}
                        strokeWidth={1.5}
                        className="shadow-md"
                      />
                      <text
                        x={0}
                        y={-5}
                        textAnchor="middle"
                        fill={isThreat ? '#DC2626' : isApproaching ? '#D97706' : '#546A7B'}
                        fontSize={9.5}
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {isThreat ? '⚠️ IMMINENT CONFLICT' : isApproaching ? '⚡ APPROACHING WORK ZONE' : '🔗 CORRELATED TRAIN ↔ BLOCK'}
                      </text>
                      <text
                        x={0}
                        y={10}
                        textAnchor="middle"
                        fill="#475569"
                        fontSize={8.5}
                        fontFamily="monospace"
                      >
                        {correlationApproach?.status === 'INSIDE_BLOCK_ZONE'
                          ? 'TRAIN CURRENTLY INSIDE POSSESSION LIMITS'
                          : correlationApproach?.distanceKm !== undefined && correlationApproach.distanceKm < 999
                          ? `Dist: ${correlationApproach.distanceKm} km · Dynamic ETA: ${correlationApproach.dynamicEtaMinutes ?? '—'}m`
                          : `Correlated (${correlatedBlock.blockId})`}
                      </text>
                    </g>
                  </g>
                );
              })()}
            </g>
          )}
        </svg>

        {/* Hover Tooltip */}
        {hoveredEntity && (
          <div
            style={{ left: `${hoveredEntity.x + 12}px`, top: `${hoveredEntity.y - 45}px` }}
            className="fixed z-50 pointer-events-none bg-white/95 backdrop-blur-md border border-slate-300 rounded-lg p-2.5 text-xs font-mono shadow-xl min-w-[180px] text-slate-800"
          >
            <div className="text-[10px] text-[#546A7B] font-bold uppercase">{hoveredEntity.type}</div>
            <div className="font-bold text-slate-900">{hoveredEntity.name}</div>
            <div className="text-[11px] text-slate-600 mt-0.5">{hoveredEntity.info}</div>
          </div>
        )}
      </div>

      {/* 3. FLOATING VIEW CONTROLS & LAYER TOGGLES (TOP RIGHT) */}
      <div className="absolute top-16 right-4 z-30 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setZoom(prev => Math.min(prev * 1.25, 4.5))}
            title="Zoom In"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(prev * 0.8, 0.7))}
            title="Zoom Out"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            title="Fit Entire India Network"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            title="Reset to All India View"
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#546A7B] text-[10px] font-bold font-mono border border-slate-200 transition"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>INDIA VIEW</span>
          </button>
          
          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          {/* Layer Selector */}
          <div className="relative">
            <button
              onClick={() => setIsLayerControlOpen(!isLayerControlOpen)}
              title="Toggle GIS Layers"
              className={`p-1.5 rounded-lg transition ${
                isLayerControlOpen ? 'bg-[#546A7B] text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
            </button>

            {isLayerControlOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl p-3 shadow-xl z-50 space-y-2 text-xs font-mono">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider border-b border-slate-100 pb-1 flex justify-between items-center">
                  <span>GIS Display Layers</span>
                  <button onClick={() => setIsLayerControlOpen(false)}>
                    <X className="w-3 h-3 text-slate-400 hover:text-slate-700" />
                  </button>
                </div>
                {[
                  { key: 'tracks', label: 'Tracks & Curvature' },
                  { key: 'trains', label: 'Live Digital Trains' },
                  { key: 'signals', label: 'Automatic Signals' },
                  { key: 'maintenanceBlocks', label: 'Maintenance Possessions' },
                ].map(l => (
                  <label key={l.key} className="flex items-center space-x-2 cursor-pointer text-slate-700 hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={(state.twinLayers as any)[l.key]}
                      onChange={() => toggleLayer(l.key as any)}
                      className="accent-[#546A7B] rounded"
                    />
                    <span>{l.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. COMPACT OPERATIONAL MAP LEGEND */}
      <div className="absolute bottom-3 left-3 z-30 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 text-[11px] font-mono shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#546A7B]" />
          <span className="text-slate-700 font-medium">Live Train</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-0.5 bg-[#546A7B]" />
          <span className="text-slate-700 font-medium">Railway Network</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-0.5 bg-[#62929E]" />
          <span className="text-slate-700 font-medium">Active / Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-2 bg-[#62929E]/20 rounded border border-[#62929E]" />
          <span className="text-[#546A7B] font-medium">Maintenance Area</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[#546A7B] text-xs">◆</span>
          <span className="text-slate-700 font-medium">Station / Junction</span>
        </div>
      </div>

      {/* 5. INTERACTIVE DIGITAL TRAIN INSPECTOR (DRAWER / MODAL) */}
      {selectedTrain && (
        <div className="absolute top-16 left-4 z-40 w-96 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl p-5 shadow-2xl font-mono text-xs animate-fadeIn space-y-4 text-slate-800">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#546A7B]/10 text-[#546A7B] border border-[#546A7B]/30 font-bold">
                  {selectedTrain.train.trainNumber}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  selectedTrain.train.direction === 'UP' ? 'bg-[#546A7B]/15 text-[#546A7B]' : 'bg-[#62929E]/15 text-[#62929E]'
                }`}>
                  {selectedTrain.train.direction} LINE
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm mt-1">{selectedTrain.train.trainName}</h3>
            </div>
            <button
              onClick={() => setSelectedTrain(null)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conflict Alert Banner inside Inspector */}
          {selectedTrain.approachBlock && selectedTrain.approachBlock.status !== 'CLEAR' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-red-700">
                <AlertTriangle className="w-4 h-4" />
                <span>APPROACH CONFLICT ALERT</span>
              </div>
              <p className="text-[11px] leading-relaxed">{selectedTrain.approachBlock.message}</p>
            </div>
          )}

          {/* Location & Track Resolution */}
          <div className="space-y-2 bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Track & Position Resolution</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400">Current Station:</span>
                <div className="font-bold text-slate-800">{selectedTrain.train.currentStation}</div>
              </div>
              <div>
                <span className="text-slate-400">Next Station:</span>
                <div className="font-bold text-slate-800">{selectedTrain.train.nextStation}</div>
              </div>
              <div>
                <span className="text-slate-400">Chainage:</span>
                <div className="font-bold text-[#546A7B]">KM {selectedTrain.trackKm}</div>
              </div>
              <div>
                <span className="text-slate-400">Matched Track:</span>
                <div className="font-bold text-slate-800 truncate">{selectedTrain.trackName}</div>
              </div>
            </div>
          </div>

          {/* Speed, Delay & Telemetry Data */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
              <span className="text-slate-400 text-[10px] block">Live Speed</span>
              <span className="text-base font-bold text-[#546A7B]">{selectedTrain.train.speedKmph}</span>
              <span className="text-slate-400 text-[10px] ml-1">km/h</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
              <span className="text-slate-400 text-[10px] block">Delay Status</span>
              <span className={`text-base font-bold ${selectedTrain.train.delayMinutes > 0 ? 'text-amber-600' : 'text-[#62929E]'}`}>
                {formatDelay(selectedTrain.train.delaySeconds, selectedTrain.train.delayMinutes).text}
              </span>
            </div>
          </div>

          {/* Geospatial Confidence & Map-Matching Standards */}
          <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">GPS Confidence:</span>
              <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                selectedTrain.confidence === 'HIGH' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                selectedTrain.confidence === 'LOW' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {selectedTrain.confidence === 'HIGH' ? 'HIGH (< 200m)' :
                 selectedTrain.confidence === 'LOW' ? 'LOW (> 200m DEVIATION)' : 'INFERRED FROM KM'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Track Deviation:</span>
              <span className="font-mono text-slate-800">{selectedTrain.deviationMeters} m</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Bearing Angle:</span>
              <span className="font-mono text-slate-800">{selectedTrain.bearingDegrees}°</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Service Date:</span>
              <span className="font-mono text-slate-800">{selectedTrain.train.serviceDate || selectedTrain.train.startDate || 'N/A'}</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between items-center">
            <span>Last Telemetry: {selectedTrain.train.lastUpdated ? formatIndianTime(selectedTrain.train.lastUpdated) : 'Live'}</span>
            <span className="text-[#546A7B] font-bold">{selectedTrain.isLive ? 'LIVE RADAR' : 'SIMULATED'}</span>
          </div>
        </div>
      )}

      {/* 6. INTERACTIVE MAINTENANCE POSSESSION INSPECTOR (DRAWER / MODAL) */}
      {selectedBlock && (
        <div className="absolute top-16 left-4 z-40 w-96 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl p-5 shadow-2xl font-mono text-xs animate-fadeIn space-y-4 text-slate-800">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#62929E]/15 text-[#62929E] border border-[#62929E]/30 font-bold">
                  {selectedBlock.blockId}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                  {selectedBlock.department}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[#546A7B] text-[10px] font-bold">
                  {selectedBlock.status}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm mt-1">{selectedBlock.workDescription}</h3>
            </div>
            <button
              onClick={() => setSelectedBlock(null)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Physical Chainage Limits */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Possession Limits & Track</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400">Start Location:</span>
                <div className="font-bold text-[#62929E]">KM {selectedBlock.startKm}</div>
              </div>
              <div>
                <span className="text-slate-400">End Location:</span>
                <div className="font-bold text-[#62929E]">KM {selectedBlock.endKm}</div>
              </div>
              <div>
                <span className="text-slate-400">Affected Track:</span>
                <div className="font-bold text-slate-800 truncate">{selectedBlock.trackName}</div>
              </div>
              <div>
                <span className="text-slate-400">Total Length:</span>
                <div className="font-bold text-slate-800">{((selectedBlock.endKm - selectedBlock.startKm) * 1000).toFixed(0)} m</div>
              </div>
            </div>
          </div>

          {/* Approaching Trains Impact Analysis */}
          <div className="space-y-2">
            <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center justify-between">
              <span>Approaching Rakes & Conflict</span>
              <span className="text-[#546A7B] font-bold">{matchedTrains.length} monitored</span>
            </div>

            {(() => {
              const approachingList = matchedTrains
                .map(mt => ({ train: mt, approach: evaluateTrainBlockApproach(mt, selectedBlock) }))
                .filter(item => item.approach && item.approach.status !== 'CLEAR');

              if (approachingList.length === 0) {
                return (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>No train currently in approaching conflict window.</span>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  {approachingList.map(({ train, approach }) => (
                    <div
                      key={train.train.trainNumber}
                      className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{train.train.trainNumber} {train.train.trainName}</span>
                        <span className="text-red-700">ETA: {approach?.dynamicEtaMinutes} min</span>
                      </div>
                      <div className="text-[10px] text-red-600">
                        Distance: {approach?.distanceKm} km · Speed: {train.train.speedKmph} km/h
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between items-center">
            <span>Isolation: {selectedBlock.powerBlockRequired ? '⚡ Power Block Required' : 'Track Only'}</span>
            <span className="text-[#62929E] font-bold">{selectedBlock.priority} PRIORITY</span>
          </div>
        </div>
      )}

      {/* 7. BOTTOM CORRIDOR OVERVIEW SUMMARY */}
      <div className="absolute bottom-3 right-3 z-30 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-[10px] font-mono text-slate-500 shadow-sm flex items-center gap-3">
        <span>Indian Railways National Rail Network</span>
        <span>•</span>
        <span>Broad Gauge (1676mm)</span>
        <span>•</span>
        <span>25kV AC 50Hz Traction</span>
        <span>•</span>
        <span>National Traffic Integration</span>
      </div>
    </div>
  );
};
