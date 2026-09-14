// src/components/twin/RealRailwayMap.tsx
// India-Wide Real Railway Geographic Map Engine
// Indian Railways · Rail Samanvaya (SIH PS 26027)
// Built with Leaflet, OpenRailwayMap, Real OSM Network Geometry, and RailRadar Telemetry

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSamnvayStore } from '../../store/useSamnvayStore';
import { 
  NATIONAL_RAILWAY_TRACKS, 
  NATIONAL_STATION_GEOS, 
  CORRIDOR_TRACKS,
  CORRIDOR_STATION_GEOS,
  INDIA_ZONE_BOUNDS,
  getGeospatialMaintenanceZones,
  GeospatialMaintenanceZone,
  CorridorStationGeo
} from '../../utils/railwayGeospatial';
import type { LiveTrainPosition } from '../../types/samnvay';
import { 
  Search, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  MapPin, 
  ChevronRight
} from 'lucide-react';

export interface RealRailwayMapProps {
  onStationSelect?: (stationCode: string) => void;
  onBlockSelect?: (blockId: string) => void;
  selectedStationCode?: string;
  className?: string;
  height?: string;
}

export const RealRailwayMap: React.FC<RealRailwayMapProps> = ({
  onStationSelect,
  onBlockSelect,
  selectedStationCode,
  className = '',
  height = '680px'
}) => {
  const { state } = useSamnvayStore();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Layer groups refs for efficient targeted DOM updates
  const baseTilesRef = useRef<L.TileLayer | null>(null);
  const ormTilesRef = useRef<L.TileLayer | null>(null);
  const trackLayersRef = useRef<L.LayerGroup | null>(null);
  const stationLayersRef = useRef<L.LayerGroup | null>(null);
  const trainLayersRef = useRef<L.LayerGroup | null>(null);
  const blockLayersRef = useRef<L.LayerGroup | null>(null);

  // Map state
  const [currentZoom, setCurrentZoom] = useState<number>(5);
  const [centerCoords, setCenterCoords] = useState<[number, number]>([22.5, 82.5]);
  const [isOrmEnabled, setIsOrmEnabled] = useState<boolean>(true);
  const [isTracksEnabled, setIsTracksEnabled] = useState<boolean>(true);
  const [isStationsEnabled, setIsStationsEnabled] = useState<boolean>(true);
  const [isLiveTrainsEnabled, setIsLiveTrainsEnabled] = useState<boolean>(true);
  const [isBlocksEnabled, setIsBlocksEnabled] = useState<boolean>(true);
  const [isLayerModalOpen, setIsLayerModalOpen] = useState<boolean>(false);
  const [activeZoneKey, setActiveZoneKey] = useState<string>('ALL_INDIA');

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);

  // Selected entities for HUD inspector
  const [selectedStationInfo, setSelectedStationInfo] = useState<any | null>(null);
  const [selectedTrainInfo, setSelectedTrainInfo] = useState<LiveTrainPosition | null>(null);
  const [selectedBlockInfo, setSelectedBlockInfo] = useState<GeospatialMaintenanceZone | null>(null);

  // Maintenance blocks derived from active store requests
  const maintenanceBlocks = useMemo(() => {
    return getGeospatialMaintenanceZones(state.requests || []);
  }, [state.requests]);

  // Combined stations list: Local corridor + Nationwide major stations
  const allStations = useMemo(() => {
    const combined: any[] = Object.values(NATIONAL_STATION_GEOS);
    Object.values(CORRIDOR_STATION_GEOS).forEach((cs: CorridorStationGeo) => {
      if (!combined.some(s => s.code === cs.code)) {
        combined.push({
          code: cs.code,
          name: cs.name,
          lat: cs.lat,
          lng: cs.lng,
          zone: 'SCR',
          division: 'BZA',
          state: 'Andhra Pradesh',
          platforms: cs.code === 'BZA' ? 10 : 4,
          isJunction: true
        });
      }
    });
    return combined;
  }, []);

  // ---------------------------------------------------------------------------
  // 1. Initialize Leaflet Map
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create Leaflet map centered on Indian Subcontinent
    const map = L.map(mapContainerRef.current, {
      center: [22.5, 82.5],
      zoom: 5,
      minZoom: 4,
      maxZoom: 18,
      zoomControl: false, // Custom controls
      attributionControl: false
    });

    // Clean base layer: OpenStreetMap standard tiles (or Carto Voyager if API key provided)
    const cartoKey = import.meta.env.VITE_CARTO_API_KEY;
    const tileUrl = cartoKey
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${cartoKey}`
      : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    const baseLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: cartoKey ? 'abcd' : 'abc',
      attribution: cartoKey
        ? '&copy; OpenStreetMap contributors &copy; CARTO'
        : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(map);
    baseTilesRef.current = baseLayer;

    // OpenRailwayMap overlay tile layer
    const ormLayer = L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
      maxZoom: 19,
      opacity: 0.85,
      attribution: '&copy; OpenRailwayMap &copy; OpenStreetMap'
    }).addTo(map);
    ormTilesRef.current = ormLayer;

    // Initialize layer groups
    trackLayersRef.current = L.layerGroup().addTo(map);
    stationLayersRef.current = L.layerGroup().addTo(map);
    trainLayersRef.current = L.layerGroup().addTo(map);
    blockLayersRef.current = L.layerGroup().addTo(map);

    // Track zoom and movement
    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });
    map.on('moveend', () => {
      const center = map.getCenter();
      setCenterCoords([Math.round(center.lat * 100) / 100, Math.round(center.lng * 100) / 100]);
    });

    mapRef.current = map;

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 2. Toggle OpenRailwayMap Tile Overlay
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current || !ormTilesRef.current) return;
    if (isOrmEnabled) {
      if (!mapRef.current.hasLayer(ormTilesRef.current)) {
        mapRef.current.addLayer(ormTilesRef.current);
      }
    } else {
      if (mapRef.current.hasLayer(ormTilesRef.current)) {
        mapRef.current.removeLayer(ormTilesRef.current);
      }
    }
  }, [isOrmEnabled]);

  // ---------------------------------------------------------------------------
  // 3. Render Real Structured Railway Tracks (Polylines)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current || !trackLayersRef.current) return;
    const group = trackLayersRef.current;
    group.clearLayers();

    if (!isTracksEnabled) return;

    // 1. National Trunk Corridors
    NATIONAL_RAILWAY_TRACKS.forEach(track => {
      const latlngs: L.LatLngExpression[] = track.coordinates.map(p => [p.lat, p.lng]);
      const isHighSpeed = track.speedLimitKmph >= 130;

      const polyline = L.polyline(latlngs, {
        color: isHighSpeed ? '#0284c7' : '#059669',
        weight: isHighSpeed ? 3.5 : 2.5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      });

      polyline.bindTooltip(`
        <div class="font-mono text-xs p-1">
          <div class="font-bold text-slate-900">${track.name}</div>
          <div class="text-slate-600">${track.type} • KM ${track.startKm} to ${track.endKm}</div>
          <div class="text-blue-700 font-semibold mt-0.5">Speed: ${track.speedLimitKmph} km/h • Broad Gauge</div>
          <div class="text-[10px] text-slate-500">Source: OpenStreetMap (OSM-Derived Geometry)</div>
        </div>
      `, { sticky: true });

      polyline.addTo(group);
    });

    // 2. Detailed BZA Corridor Tracks
    CORRIDOR_TRACKS.forEach(track => {
      const latlngs: L.LatLngExpression[] = track.coordinates.map(p => [p.lat, p.lng]);
      const isUp = track.name.includes('UP');
      const isLoop = track.name.includes('Loop');

      const polyline = L.polyline(latlngs, {
        color: isLoop ? '#eab308' : isUp ? '#0284c7' : '#2563eb',
        weight: isLoop ? 2.5 : 3.5,
        dashArray: isLoop ? '6, 6' : undefined,
        opacity: 0.9
      });

      polyline.bindTooltip(`
        <div class="font-mono text-xs p-1">
          <div class="font-bold text-slate-900">${track.name}</div>
          <div class="text-slate-600">KM ${track.startKm} to ${track.endKm}</div>
          <div class="text-emerald-700 font-semibold">Speed Limit: ${track.speedLimitKmph} km/h</div>
          <div class="text-[10px] text-slate-500">Rail Samanvaya Operational Master</div>
        </div>
      `, { sticky: true });

      polyline.addTo(group);
    });
  }, [isTracksEnabled]);

  // ---------------------------------------------------------------------------
  // 4. Render Railway Stations with Progressive Disclosure
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current || !stationLayersRef.current) return;
    const group = stationLayersRef.current;
    group.clearLayers();

    if (!isStationsEnabled) return;

    // Progressive disclosure filtering:
    // Zoom < 6: Major national junctions only
    // Zoom 6-9: Important division stations
    // Zoom >= 10: All stations & halts
    const visibleStations = allStations.filter(stn => {
      if (currentZoom < 6) {
        return ['NDLS', 'CSMT', 'HWH', 'MAS', 'BZA', 'SC', 'NGP', 'PNBE', 'ADI', 'GHY', 'SBC', 'LKO'].includes(stn.code);
      }
      if (currentZoom < 9) {
        return stn.isJunction || ['MAG', 'GNT', 'TEL', 'CNB', 'AGC', 'DLI', 'NZM', 'BPL', 'PUNE'].includes(stn.code);
      }
      return true;
    });

    visibleStations.forEach(stn => {
      const isSelected = selectedStationCode === stn.code || selectedStationInfo?.code === stn.code;
      const isHub = ['NDLS', 'CSMT', 'HWH', 'MAS', 'BZA', 'SC', 'NGP'].includes(stn.code);

      // Custom SVG Marker Icon
      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          <div class="absolute -inset-1 rounded-full ${isSelected ? 'bg-amber-400 animate-ping opacity-75' : isHub ? 'bg-blue-400 opacity-40' : 'bg-slate-400 opacity-20'}"></div>
          <div class="px-1.5 py-0.5 rounded shadow-md font-mono text-[10px] font-bold border flex items-center gap-1 transition-transform group-hover:scale-110 ${
            isSelected 
              ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400' 
              : isHub
              ? 'bg-slate-900 text-white border-blue-400 ring-1 ring-blue-500/50'
              : 'bg-white text-slate-800 border-slate-300'
          }">
            <span class="w-1.5 h-1.5 rounded-full ${isHub ? 'bg-blue-400' : 'bg-emerald-500'}"></span>
            <span>${stn.code}</span>
          </div>
        </div>
      `;

      const markerIcon = L.divIcon({
        html: iconHtml,
        className: 'station-div-icon',
        iconSize: [46, 22],
        iconAnchor: [23, 11]
      });

      const marker = L.marker([stn.lat, stn.lng], { icon: markerIcon });

      marker.on('click', () => {
        setSelectedStationInfo(stn);
        if (onStationSelect) {
          onStationSelect(stn.code);
        }
      });

      marker.bindTooltip(`
        <div class="font-mono text-xs p-1">
          <div class="font-bold text-slate-900">${stn.name} (${stn.code})</div>
          <div class="text-slate-600">${stn.division || 'Division'} • ${stn.zone || 'Zone'}</div>
          <div class="text-blue-700 mt-0.5">Platforms: ${stn.platforms || 4} • Coordinates: ${stn.lat.toFixed(4)}, ${stn.lng.toFixed(4)}</div>
          <div class="text-[10px] text-emerald-700 font-semibold mt-1">Click station to focus & inspect</div>
        </div>
      `, { direction: 'top', offset: [0, -10] });

      marker.addTo(group);
    });
  }, [isStationsEnabled, currentZoom, allStations, selectedStationCode, selectedStationInfo, onStationSelect]);

  // ---------------------------------------------------------------------------
  // 5. Render Live Trains (RailRadar Real Telemetry)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current || !trainLayersRef.current) return;
    const group = trainLayersRef.current;
    group.clearLayers();

    if (!isLiveTrainsEnabled) return;

    const liveTrains: LiveTrainPosition[] = state.liveData?.liveTrains || [];

    liveTrains.forEach((train: LiveTrainPosition) => {
      let lat = 16.48;
      let lng = 80.60;
      let positioningMethod = 'APPROXIMATED';
      let confidenceState = 'ESTIMATED';

      // 1. If real GPS telemetry coordinates are available from RailRadar, use them with highest fidelity
      if (typeof train.latitude === 'number' && !isNaN(train.latitude) && 
          typeof train.longitude === 'number' && !isNaN(train.longitude) &&
          train.latitude !== 0 && train.longitude !== 0) {
        lat = train.latitude;
        lng = train.longitude;
        positioningMethod = 'GPS_TELEMETRY';
        confidenceState = 'HIGH (GPS Telemetry)';
      } 
      // 2. If station match is found in allStations, position at or between stations
      else {
        const matchCurrent = allStations.find(s => s.code === train.currentStation);
        const matchNext = allStations.find(s => s.code === train.nextStation);

        if (matchCurrent && matchNext && matchCurrent.code !== matchNext.code) {
          // Progress between current and next station
          const progress = 0.5;
          lat = matchCurrent.lat + progress * (matchNext.lat - matchCurrent.lat);
          lng = matchCurrent.lng + progress * (matchNext.lng - matchCurrent.lng);
          positioningMethod = 'INTER_STATION_PROGRESS';
          confidenceState = `MEDIUM (Between ${matchCurrent.code} and ${matchNext.code})`;
        } else if (matchCurrent) {
          lat = matchCurrent.lat;
          lng = matchCurrent.lng;
          positioningMethod = 'STATION_SNAP';
          confidenceState = `MEDIUM (Snapped to ${matchCurrent.code})`;
        } else if (matchNext) {
          lat = matchNext.lat;
          lng = matchNext.lng;
          positioningMethod = 'STATION_SNAP';
          confidenceState = `MEDIUM (Approaching ${matchNext.code})`;
        } else if (train.currentKm != null && train.currentKm >= 0 && train.currentKm <= 85) {
          // SCR Vijayawada division fallback only if within local corridor chainage bounds
          const ratio = Math.max(0, Math.min(1, train.currentKm / 80.0));
          lat = 16.5193 - ratio * (16.5193 - 16.2430);
          lng = 80.6231 - ratio * (80.6231 - 80.6480);
          positioningMethod = 'LOCAL_CHAINAGE_SNAP';
          confidenceState = 'LOW (Inferred from Corridor KM)';
        }
      }

      const isDelayed = (train.delayMinutes || 0) > 15;
      const isSelected = selectedTrainInfo?.trainNumber === train.trainNumber;

      const trainIconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          <div class="absolute -inset-1 rounded-full ${isDelayed ? 'bg-rose-500 animate-ping opacity-60' : 'bg-emerald-500 animate-ping opacity-50'}"></div>
          <div class="px-2 py-1 rounded-full shadow-lg font-mono text-[10px] font-bold border flex items-center gap-1.5 transition-transform group-hover:scale-110 ${
            isSelected
              ? 'bg-amber-400 text-slate-950 border-amber-200 ring-2 ring-amber-500'
              : isDelayed
              ? 'bg-rose-900 text-rose-100 border-rose-500 ring-1 ring-rose-400'
              : 'bg-emerald-950 text-emerald-100 border-emerald-500 ring-1 ring-emerald-400'
          }">
            <span class="w-2 h-2 rounded-full ${isDelayed ? 'bg-rose-400' : 'bg-emerald-400'} animate-pulse"></span>
            <span>${train.trainNumber}</span>
            <span class="text-[9px] opacity-75">${train.speedKmph || 85}k</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: trainIconHtml,
        className: 'train-div-icon',
        iconSize: [64, 26],
        iconAnchor: [32, 13]
      });

      const marker = L.marker([lat, lng], { icon });

      marker.on('click', () => {
        setSelectedTrainInfo(train);
      });

      marker.bindTooltip(`
        <div class="font-mono text-xs p-1">
          <div class="font-bold text-slate-900">${train.trainName || train.trainNumber} (${train.trainNumber})</div>
          <div class="text-slate-600">${train.currentStation} → ${train.nextStation} (${train.direction} Main)</div>
          <div class="${isDelayed ? 'text-rose-600' : 'text-emerald-700'} font-semibold mt-0.5">
            ${isDelayed ? `Delayed by ${train.delayMinutes} min` : 'Right Time (RT)'} • Speed: ${train.speedKmph || 85} km/h
          </div>
          <div class="text-[10px] text-slate-500 mt-1 flex items-center justify-between gap-2 border-t border-slate-200 pt-1">
            <span>Fix: ${confidenceState}</span>
            <span>Coord: [${lat.toFixed(3)}, ${lng.toFixed(3)}]</span>
          </div>
        </div>
      `, { direction: 'top', offset: [0, -12] });

      marker.addTo(group);
    });
  }, [isLiveTrainsEnabled, state.liveData?.liveTrains, allStations, selectedTrainInfo]);

  // ---------------------------------------------------------------------------
  // 6. Render Maintenance Blocks (Possessions)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current || !blockLayersRef.current) return;
    const group = blockLayersRef.current;
    group.clearLayers();

    if (!isBlocksEnabled) return;

    maintenanceBlocks.forEach(blk => {
      // Use exact polyline points from track geometry when available
      const points: [number, number][] = (blk.polyline && blk.polyline.length > 0)
        ? blk.polyline.map(p => [p.lat, p.lng] as [number, number])
        : [
            [16.5193 - (blk.startKm / 80.0) * (16.5193 - 16.2430), 80.6231 - (blk.startKm / 80.0) * (80.6231 - 80.6480)],
            [16.5193 - (blk.endKm / 80.0) * (16.5193 - 16.2430), 80.6231 - (blk.endKm / 80.0) * (80.6231 - 80.6480)]
          ];

      const isActive = blk.status === 'ACTIVE';

      const polyline = L.polyline(points, {
        color: isActive ? '#dc2626' : '#d97706',
        weight: 6,
        opacity: 0.9,
        dashArray: '8, 8'
      });

      polyline.on('click', () => {
        setSelectedBlockInfo(blk);
        if (onBlockSelect) {
          onBlockSelect(blk.blockId);
        }
      });

      polyline.bindTooltip(`
        <div class="font-mono text-xs p-1">
          <div class="font-bold text-slate-900">${blk.workDescription} (${blk.department})</div>
          <div class="text-slate-600">KM ${blk.startKm} to ${blk.endKm} (${blk.trackName})</div>
          <div class="text-amber-700 font-semibold mt-0.5">Status: ${blk.status} • Priority: ${blk.priority}</div>
          <div class="text-[10px] text-rose-700 font-bold mt-1">Possession Zone Active • Click to Inspect</div>
        </div>
      `, { sticky: true });

      polyline.addTo(group);
    });
  }, [isBlocksEnabled, maintenanceBlocks, selectedBlockInfo, onBlockSelect]);

  // ---------------------------------------------------------------------------
  // 7. Fly to Station or Zone Preset
  // ---------------------------------------------------------------------------
  const flyToLocation = useCallback((lat: number, lng: number, zoom = 13) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([lat, lng], zoom, {
      duration: 1.4,
      easeLinearity: 0.25
    });
  }, []);

  const handleZoneSelect = useCallback((zoneKey: string) => {
    setActiveZoneKey(zoneKey);
    const bounds = INDIA_ZONE_BOUNDS[zoneKey];
    if (bounds && mapRef.current) {
      if (zoneKey === 'ALL_INDIA') {
        mapRef.current.flyTo([22.5, 82.5], 5, { duration: 1.2 });
      } else {
        mapRef.current.flyTo([bounds.centerLat, bounds.centerLng], Math.round(bounds.zoomLevel * 2.5), { duration: 1.2 });
      }
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 8. Station Autocomplete Search Handler
  // ---------------------------------------------------------------------------
  const handleSearchChange = async (val: string) => {
    setSearchQuery(val);
    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      setIsSearchDropdownOpen(false);
      return;
    }

    setIsSearching(true);
    setIsSearchDropdownOpen(true);

    try {
      const res = await fetch(`/api/infrastructure/stations/search?q=${encodeURIComponent(val)}&limit=8`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.stations)) {
          setSearchResults(json.stations);
          setIsSearching(false);
          return;
        }
      }
    } catch (e) {
      // Fallback
    }

    const q = val.toLowerCase().trim();
    const matches = allStations.filter(s => 
      s.code.toLowerCase().includes(q) || 
      s.name.toLowerCase().includes(q) ||
      (s.division && s.division.toLowerCase().includes(q))
    ).slice(0, 8);

    setSearchResults(matches);
    setIsSearching(false);
  };

  const handleSelectSearchResult = (stn: any) => {
    setSearchQuery(`${stn.name} (${stn.code || stn.railway_ref})`);
    setIsSearchDropdownOpen(false);
    setSelectedStationInfo(stn);
    const lat = stn.lat || stn.latitude;
    const lng = stn.lng || stn.longitude;
    if (lat && lng) {
      flyToLocation(lat, lng, 13);
    }
    if (onStationSelect) {
      onStationSelect(stn.code || stn.railway_ref);
    }
  };

  return (
    <div className={`relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl ${className}`}>
      {/* 1. Header Toolbar with Real-Time Search & Controls */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Station Search Bar */}
        <div className="relative pointer-events-auto w-72 sm:w-80 shadow-lg">
          <div className="relative flex items-center bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/80 px-3 py-2 text-slate-100 shadow-lg">
            <Search className="w-4 h-4 text-emerald-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search station (e.g. NDLS, Nagpur, BZA)..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setIsSearchDropdownOpen(true);
              }}
              className="bg-transparent border-none outline-none text-xs font-mono w-full placeholder:text-slate-400 text-slate-100"
            />
            {isSearching && (
              <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            )}
          </div>

          {/* Autocomplete Results Dropdown */}
          {isSearchDropdownOpen && searchResults.length > 0 && (
            <div className="absolute top-full mt-1.5 left-0 right-0 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-50">
              {searchResults.map((stn, idx) => {
                const code = stn.code || stn.railway_ref;
                const name = stn.name;
                const zone = stn.zone;
                const div = stn.division;
                const stateName = stn.state;

                return (
                  <button
                    key={`${code}-${idx}`}
                    onClick={() => handleSelectSearchResult(stn)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-950/60 transition border-b border-slate-800/60 last:border-b-0 flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-slate-200 group-hover:text-emerald-300 font-mono">
                        {name} <span className="text-emerald-400">({code})</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {div ? `${div} Div` : ''} • {zone || 'IR'} • {stateName || 'India'}
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Layer Controls & Zone Quick Jump Chips */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Zone Quick Preset Chips */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-xl border border-slate-700/80 shadow-lg text-[11px] font-mono">
            <span className="text-slate-400 font-semibold px-1">Zone:</span>
            {[
              { id: 'ALL_INDIA', label: '🇮🇳 All India' },
              { id: 'NORTHERN', label: 'NDLS' },
              { id: 'WESTERN', label: 'CSMT' },
              { id: 'EASTERN', label: 'HWH' },
              { id: 'SOUTHERN', label: 'MAS' },
              { id: 'PROTOTYPE', label: 'BZA/SCR' }
            ].map(chip => (
              <button
                key={chip.id}
                onClick={() => handleZoneSelect(chip.id)}
                className={`px-2 py-0.5 rounded-md transition ${
                  activeZoneKey === chip.id
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Layer Control Button */}
          <button
            onClick={() => setIsLayerModalOpen(!isLayerModalOpen)}
            className={`px-3 py-2 rounded-xl backdrop-blur-md border text-xs font-mono font-medium flex items-center gap-1.5 shadow-lg transition ${
              isLayerModalOpen 
                ? 'bg-emerald-600 text-white border-emerald-500' 
                : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:bg-slate-800'
            }`}
            title="Configure Map Layers"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Layers</span>
          </button>

          {/* Zoom Buttons */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700 shadow-lg p-0.5">
            <button
              onClick={() => mapRef.current?.zoomIn()}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => mapRef.current?.zoomOut()}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoneSelect('ALL_INDIA')}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Reset View to India"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Layer Toggle Modal / Flyout */}
      {isLayerModalOpen && (
        <div className="absolute top-16 right-3 z-[1000] w-64 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700 p-3 shadow-2xl text-xs font-mono space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 font-bold text-slate-200">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Map Layer Control</span>
            </span>
            <span className="text-[10px] text-emerald-400">OSM/GIS</span>
          </div>

          <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span>
              <span>OpenRailwayMap Overlay</span>
            </span>
            <input
              type="checkbox"
              checked={isOrmEnabled}
              onChange={(e) => setIsOrmEnabled(e.target.checked)}
              className="accent-emerald-500 rounded"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
              <span>Structured Track Polylines</span>
            </span>
            <input
              type="checkbox"
              checked={isTracksEnabled}
              onChange={(e) => setIsTracksEnabled(e.target.checked)}
              className="accent-emerald-500 rounded"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>
              <span>Railway Stations & Halts</span>
            </span>
            <input
              type="checkbox"
              checked={isStationsEnabled}
              onChange={(e) => setIsStationsEnabled(e.target.checked)}
              className="accent-emerald-500 rounded"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span>
              <span>Live Train Telemetry</span>
            </span>
            <input
              type="checkbox"
              checked={isLiveTrainsEnabled}
              onChange={(e) => setIsLiveTrainsEnabled(e.target.checked)}
              className="accent-emerald-500 rounded"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
              <span>Maintenance Possessions</span>
            </span>
            <input
              type="checkbox"
              checked={isBlocksEnabled}
              onChange={(e) => setIsBlocksEnabled(e.target.checked)}
              className="accent-emerald-500 rounded"
            />
          </label>
        </div>
      )}

      {/* 3. The Map Canvas Container */}
      <div 
        ref={mapContainerRef} 
        style={{ height, width: '100%' }} 
        className="z-0 relative"
      />

      {/* 4. Floating Entity Inspector HUD (Station / Train / Block) */}
      {(selectedStationInfo || selectedTrainInfo || selectedBlockInfo) && (
        <div className="absolute top-16 left-3 z-[1000] w-80 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/90 p-4 shadow-2xl text-xs font-mono space-y-2.5 text-slate-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                {selectedStationInfo ? 'Station Inspector' : selectedTrainInfo ? 'Train Telemetry' : 'Possession Hazard'}
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedStationInfo(null);
                setSelectedTrainInfo(null);
                setSelectedBlockInfo(null);
              }}
              className="text-slate-400 hover:text-white font-bold p-1"
            >
              ✕
            </button>
          </div>

          {/* Station Details */}
          {selectedStationInfo && (
            <div className="space-y-2">
              <div className="text-base font-bold text-emerald-400">
                {selectedStationInfo.name} ({selectedStationInfo.code || selectedStationInfo.railway_ref})
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-800/60 p-2 rounded-lg">
                <div>
                  <span className="text-slate-400 block">Zone / Div:</span>
                  <span className="font-semibold text-slate-200">{selectedStationInfo.zone || 'SCR'} / {selectedStationInfo.division || 'BZA'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">State:</span>
                  <span className="font-semibold text-slate-200">{selectedStationInfo.state || 'India'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Platforms:</span>
                  <span className="font-semibold text-slate-200">{selectedStationInfo.platforms || 4} Running Lines</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Coordinates:</span>
                  <span className="font-semibold text-slate-200">
                    {(selectedStationInfo.lat || selectedStationInfo.latitude)?.toFixed(4)}, {(selectedStationInfo.lng || selectedStationInfo.longitude)?.toFixed(4)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    const lat = selectedStationInfo.lat || selectedStationInfo.latitude;
                    const lng = selectedStationInfo.lng || selectedStationInfo.longitude;
                    if (lat && lng) flyToLocation(lat, lng, 14);
                  }}
                  className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center justify-center gap-1.5 text-xs shadow-xs"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Center On Station</span>
                </button>
              </div>
            </div>
          )}

          {/* Train Telemetry */}
          {selectedTrainInfo && (
            <div className="space-y-2">
              <div className="text-base font-bold text-cyan-400">
                {selectedTrainInfo.trainName || selectedTrainInfo.trainNumber} ({selectedTrainInfo.trainNumber})
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-800/60 p-2 rounded-lg">
                <div>
                  <span className="text-slate-400 block">Current Station:</span>
                  <span className="font-semibold text-slate-200">{selectedTrainInfo.currentStation}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Next Station:</span>
                  <span className="font-semibold text-slate-200">{selectedTrainInfo.nextStation}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Speed / Direction:</span>
                  <span className="font-semibold text-slate-200">{selectedTrainInfo.speedKmph || 85} km/h ({selectedTrainInfo.direction})</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Punctuality:</span>
                  <span className={`font-semibold ${(selectedTrainInfo.delayMinutes || 0) > 15 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {(selectedTrainInfo.delayMinutes || 0) > 0 ? `+${selectedTrainInfo.delayMinutes}m Late` : 'On Time (RT)'}
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 italic">
                Upstream Telemetry Source: RailRadar API Engine (20-Min Synchronized)
              </div>
            </div>
          )}

          {/* Possession Block Details */}
          {selectedBlockInfo && (
            <div className="space-y-2">
              <div className="text-base font-bold text-amber-400">
                {selectedBlockInfo.workDescription} ({selectedBlockInfo.department})
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-800/60 p-2 rounded-lg">
                <div>
                  <span className="text-slate-400 block">Location:</span>
                  <span className="font-semibold text-slate-200">{selectedBlockInfo.trackName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Chainage:</span>
                  <span className="font-semibold text-slate-200">KM {selectedBlockInfo.startKm} – {selectedBlockInfo.endKm}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Priority:</span>
                  <span className="font-semibold text-slate-200">{selectedBlockInfo.priority}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Status:</span>
                  <span className="font-semibold text-rose-400">{selectedBlockInfo.status}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Bottom Provenance & Integrity HUD Watermark */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] pointer-events-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] font-mono">
        {/* Left: Transparent Provenance Badge */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-slate-300 shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-bold text-slate-100">RAIL SAMNVAY GEOSPATIAL ENGINE</span>
          <span className="text-slate-500">|</span>
          <span>GEOMETRY: <strong className="text-emerald-400">OSM-DERIVED (WGS84)</strong></span>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="hidden md:inline">TILES: <strong className="text-blue-400">OPENRAILWAYMAP</strong></span>
          <span className="hidden lg:inline text-slate-500">|</span>
          <span className="hidden lg:inline">TELEMETRY: <strong className="text-amber-400">RAILRADAR</strong></span>
        </div>

        {/* Right: Subcontinent Coordinates & Zoom Indicator */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-slate-400 shadow-lg flex items-center gap-3">
          <span>CENTER: <strong className="text-slate-200">{centerCoords[0].toFixed(2)}°N, {centerCoords[1].toFixed(2)}°E</strong></span>
          <span>ZOOM: <strong className="text-emerald-400">{currentZoom}</strong></span>
          <span className="hidden sm:inline">PROJECTION: <strong className="text-slate-200">EPSG:3857</strong></span>
        </div>
      </div>
    </div>
  );
};
