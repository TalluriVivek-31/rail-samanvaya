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
  CORRIDOR_SIGNALS,
  INDIA_ZONE_BOUNDS,
  getGeospatialMaintenanceZones,
  GeospatialMaintenanceZone,
  CorridorStationGeo
} from '../../utils/railwayGeospatial';
import type { LiveTrainPosition, BlockRequest } from '../../types/samnvay';
import { fetchTrainRouteCoordinates } from '../../services/railRadarClient';
import { buildRunIdentity, classifyTrainWorkInteraction, getNearbyTrainsForLocation } from '../../utils/trainIntelligence';
import { 
  Search, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  MapPin, 
  ChevronRight,
  AlertTriangle,
  Wrench,
  ShieldAlert,
  Radio,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  Cpu,
  X
} from 'lucide-react';

export interface RealRailwayMapProps {
  onStationSelect?: (stationCode: string) => void;
  onBlockSelect?: (blockId: string) => void;
  onRequestSelect?: (requestId: string) => void;
  onTrainSelect?: (train: LiveTrainPosition) => void;
  selectedTrainId?: string;
  selectedTrain?: LiveTrainPosition | null;
  mapFocus?: { lat: number; lng: number; zoom?: number } | null;
  selectedRequestId?: string;
  selectedStationCode?: string;
  defaultShowTwinLayers?: boolean;
  className?: string;
  height?: string;
}

export const RealRailwayMap: React.FC<RealRailwayMapProps> = ({
  onStationSelect,
  onBlockSelect,
  onRequestSelect,
  onTrainSelect,
  selectedTrainId,
  selectedTrain,
  mapFocus,
  selectedRequestId,
  selectedStationCode,
  defaultShowTwinLayers = true,
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
  const routeLayersRef = useRef<L.LayerGroup | null>(null);
  const assetLayersRef = useRef<L.LayerGroup | null>(null);
  const workZoneLayersRef = useRef<L.LayerGroup | null>(null);
  const conflictLayersRef = useRef<L.LayerGroup | null>(null);
  const candidateLayersRef = useRef<L.LayerGroup | null>(null);

  // Map state
  const [currentZoom, setCurrentZoom] = useState<number>(5);
  const [centerCoords, setCenterCoords] = useState<[number, number]>([22.5, 82.5]);
  const [isOrmEnabled, setIsOrmEnabled] = useState<boolean>(true);
  const [isTracksEnabled, setIsTracksEnabled] = useState<boolean>(true);
  const [isStationsEnabled, setIsStationsEnabled] = useState<boolean>(true);
  const [isLiveTrainsEnabled, setIsLiveTrainsEnabled] = useState<boolean>(true);
  const [isRoutesEnabled, setIsRoutesEnabled] = useState<boolean>(true);
  const [isAssetsEnabled, setIsAssetsEnabled] = useState<boolean>(defaultShowTwinLayers);
  const [isWorkZonesEnabled, setIsWorkZonesEnabled] = useState<boolean>(defaultShowTwinLayers);
  const [isBlocksEnabled, setIsBlocksEnabled] = useState<boolean>(true);
  const [isConflictsEnabled, setIsConflictsEnabled] = useState<boolean>(defaultShowTwinLayers);
  const [isCandidateWindowsEnabled, setIsCandidateWindowsEnabled] = useState<boolean>(false);
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
  const [selectedRequestInfo, setSelectedRequestInfo] = useState<BlockRequest | null>(null);
  const [selectedAssetInfo, setSelectedAssetInfo] = useState<any | null>(null);
  const [selectedConflictInfo, setSelectedConflictInfo] = useState<any | null>(null);
  const [routeGeometryInfo, setRouteGeometryInfo] = useState<{ waypointsCount: number } | null>(null);

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
    routeLayersRef.current = L.layerGroup().addTo(map);
    assetLayersRef.current = L.layerGroup().addTo(map);
    workZoneLayersRef.current = L.layerGroup().addTo(map);
    conflictLayersRef.current = L.layerGroup().addTo(map);
    candidateLayersRef.current = L.layerGroup().addTo(map);

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

    const baseTrains: LiveTrainPosition[] = state.liveData?.liveTrains || [];
    const liveTrains: LiveTrainPosition[] = [...baseTrains];
    if (selectedTrain && !liveTrains.some(t => t.trainNumber === selectedTrain.trainNumber)) {
      liveTrains.push(selectedTrain);
    }

    liveTrains.forEach((train: LiveTrainPosition) => {
      let lat = 16.48;
      let lng = 80.60;
      let positioningMethod = 'APPROXIMATED';
      let confidenceState = 'ESTIMATED';
      let hasValidCoords = false;

      // 1. If real GPS telemetry coordinates are available from RailRadar, use them with highest fidelity
      if (
        typeof train.latitude === 'number' && 
        typeof train.longitude === 'number' &&
        Number.isFinite(train.latitude) && 
        Number.isFinite(train.longitude) &&
        train.latitude >= -90 && train.latitude <= 90 &&
        train.longitude >= -180 && train.longitude <= 180 &&
        (train.latitude !== 0 || train.longitude !== 0)
      ) {
        lat = train.latitude;
        lng = train.longitude;
        positioningMethod = 'GPS_TELEMETRY';
        confidenceState = 'HIGH (GPS Telemetry)';
        hasValidCoords = true;
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
          hasValidCoords = true;
        } else if (matchCurrent) {
          lat = matchCurrent.lat;
          lng = matchCurrent.lng;
          positioningMethod = 'STATION_SNAP';
          confidenceState = `MEDIUM (Snapped to ${matchCurrent.code})`;
          hasValidCoords = true;
        } else if (matchNext) {
          lat = matchNext.lat;
          lng = matchNext.lng;
          positioningMethod = 'STATION_SNAP';
          confidenceState = `MEDIUM (Approaching ${matchNext.code})`;
          hasValidCoords = true;
        }
      }

      // If train has no valid coordinates at all, skip plotting marker to avoid fabricating fake locations
      if (!hasValidCoords) return;

      const isDelayed = (train.delayMinutes || 0) > 15;
      const isSelected = selectedTrainInfo?.trainNumber === train.trainNumber || 
        selectedTrain?.trainNumber === train.trainNumber ||
        (selectedTrainId && (
          selectedTrainId === train.trainNumber || 
          selectedTrainId === train.runId || 
          selectedTrainId === `${train.trainNumber}-${train.startDate || train.serviceDate}`
        ));

      const trainIconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          <div class="absolute -inset-1 rounded-full ${isDelayed ? 'bg-rose-500 animate-ping opacity-60' : 'bg-emerald-500 animate-ping opacity-50'}"></div>
          <div class="px-2 py-1 rounded-full shadow-lg font-mono text-[10px] font-bold border flex items-center gap-1.5 transition-transform group-hover:scale-110 ${
            isSelected
              ? 'bg-amber-400 text-slate-950 border-amber-200 ring-2 ring-amber-500 shadow-md scale-105'
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
        try {
          setSelectedTrainInfo(train);
          if (typeof onTrainSelect === 'function') {
            onTrainSelect(train);
          }
        } catch (err) {
          console.error('Error handling train selection:', err);
        }
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
  }, [isLiveTrainsEnabled, state.liveData?.liveTrains, allStations, selectedTrainInfo, selectedTrainId, selectedTrain, onTrainSelect]);

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
  // 6b. Render Train Route Geometry (when a train is selected)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current || !routeLayersRef.current) return;
    const group = routeLayersRef.current;
    group.clearLayers();

    if (!selectedTrainInfo) {
      setRouteGeometryInfo(null);
      return;
    }

    let isMounted = true;
    fetchTrainRouteCoordinates(selectedTrainInfo.trainNumber)
      .then(routeData => {
        if (!isMounted || !mapRef.current) return;
        if (routeData && Array.isArray(routeData.coordinates) && routeData.coordinates.length > 0) {
          const count = routeData.waypointsCount || routeData.coordinates.length;
          setRouteGeometryInfo({ waypointsCount: count });
          const polyline = L.polyline(routeData.coordinates, {
            color: '#06b6d4',
            weight: 4,
            opacity: 0.85,
            dashArray: '6, 6'
          });
          polyline.bindTooltip(`
            <div class="font-mono text-xs p-1">
              <div class="font-bold text-cyan-400">Route: ${selectedTrainInfo.trainNumber}</div>
              <div class="text-slate-300">${count.toLocaleString()} Waypoints (Real Track Path)</div>
            </div>
          `, { sticky: true });
          polyline.addTo(group);
        } else {
          setRouteGeometryInfo(null);
        }
      })
      .catch(err => {
        console.warn('Failed to load train route geometry:', err);
        if (isMounted) setRouteGeometryInfo(null);
      });

    return () => {
      isMounted = false;
      group.clearLayers();
    };
  }, [selectedTrainInfo]);

  // ---------------------------------------------------------------------------
  // 6c. Render Railway Infrastructure Assets (Signals, Switches, OHE, Cabins, Bridges)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current || !assetLayersRef.current) return;
    const group = assetLayersRef.current;
    group.clearLayers();

    if (!isAssetsEnabled) return;

    // A. Signals along the corridor
    CORRIDOR_SIGNALS.forEach(sig => {
      const aspectColor = 
        sig.defaultAspect === 'GREEN' ? '#10b981' :
        sig.defaultAspect === 'RED' ? '#ef4444' :
        sig.defaultAspect === 'DOUBLE_YELLOW' ? '#f59e0b' : '#eab308';

      const signalIconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group" title="${sig.name}">
          <div class="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-500 flex items-center justify-center shadow-md">
            <span class="w-2 h-2 rounded-full animate-pulse" style="background-color: ${aspectColor}; box-shadow: 0 0 6px ${aspectColor};"></span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: signalIconHtml,
        className: 'asset-signal-icon',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = L.marker([sig.lat, sig.lng], { icon });

      marker.on('click', () => {
        setSelectedAssetInfo({
          id: sig.id,
          name: sig.name,
          type: 'Automatic Block Signal',
          department: 'S&T',
          track: sig.trackId,
          km: sig.km,
          lat: sig.lat,
          lng: sig.lng,
          aspect: sig.defaultAspect,
          direction: sig.direction,
          status: 'OPERATIONAL'
        });
      });

      marker.bindTooltip(`
        <div class="font-mono text-xs p-1">
          <div class="font-bold text-slate-900">${sig.name}</div>
          <div class="text-slate-600">KM ${sig.km} • Track: ${sig.trackId} (${sig.direction})</div>
          <div class="font-semibold mt-0.5" style="color: ${aspectColor};">
            Aspect: ${sig.defaultAspect} • S&amp;T Asset
          </div>
        </div>
      `, { direction: 'top', offset: [0, -8] });

      marker.addTo(group);
    });

    // B. Key Infrastructure Facilities (RRI Cabins, 25kV TSS, Turnouts, Bridges)
    const facilities = [
      { id: 'FAC-BZA-RRI', name: 'Vijayawada Central Route Relay Interlocking (RRI Cabin)', type: 'Interlocking Cabin', department: 'S&T', lat: 16.5200, lng: 80.6240, km: 0.2, status: 'OPERATIONAL' },
      { id: 'FAC-BZA-ELS', name: 'BZA Electric Loco Shed & Marshalling Yard', type: 'Loco Shed & Yard', department: 'TRD', lat: 16.5220, lng: 80.6280, km: 1.5, status: 'OPERATIONAL' },
      { id: 'FAC-BRG-KCC', name: 'Krishna River Major Rail Bridge (12 Spans)', type: 'Railway Bridge', department: 'P.Way', lat: 16.4950, lng: 80.6120, km: 3.5, status: 'OPERATIONAL' },
      { id: 'FAC-KCC-CAB', name: 'Krishna Canal Junction Cabin & Freight Siding', type: 'Signal Box & Cabin', department: 'Operations', lat: 16.4855, lng: 80.6015, km: 7.8, status: 'OPERATIONAL' },
      { id: 'FAC-MAG-SW', name: 'Mangalagiri Station Loop Switch 12A Turnout', type: 'Turnout / Point Machine', department: 'P.Way', lat: 16.4352, lng: 80.5648, km: 12.45, status: 'OPERATIONAL' },
      { id: 'FAC-MAG-TSS', name: 'Mangalagiri 25kV Traction Substation (TSS)', type: 'Traction Substation', department: 'TRD', lat: 16.4380, lng: 80.5670, km: 12.8, status: 'OPERATIONAL' },
      { id: 'FAC-GNT-BOX', name: 'Guntur West Bypass Interlocking Cabin', type: 'Interlocking Cabin', department: 'S&T', lat: 16.2995, lng: 80.4425, km: 49.5, status: 'OPERATIONAL' },
      { id: 'FAC-TEL-RRI', name: 'Tenali Junction Route Relay Interlocking (RRI Cabin)', type: 'Interlocking Cabin', department: 'S&T', lat: 16.2435, lng: 80.6475, km: 78.5, status: 'OPERATIONAL' }
    ];

    facilities.forEach(fac => {
      const isElec = fac.department === 'TRD';
      const isST = fac.department === 'S&T';
      const isBridge = fac.type.includes('Bridge');

      const badgeBg = isElec ? 'bg-amber-700' : isST ? 'bg-indigo-700' : isBridge ? 'bg-sky-700' : 'bg-emerald-800';

      const facIconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group" title="${fac.name}">
          <div class="px-1.5 py-0.5 rounded shadow-md font-mono text-[9px] font-bold text-white ${badgeBg} border border-white/30 flex items-center gap-1 transition-transform group-hover:scale-110">
            <span>${isBridge ? '🌉' : isElec ? '⚡' : isST ? '📡' : '🔧'}</span>
            <span>${fac.type.split(' ')[0]}</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: facIconHtml,
        className: 'facility-marker-icon',
        iconSize: [48, 18],
        iconAnchor: [24, 9]
      });

      const marker = L.marker([fac.lat, fac.lng], { icon });

      marker.on('click', () => {
        setSelectedAssetInfo(fac);
      });

      marker.bindTooltip(`
        <div class="font-mono text-xs p-1">
          <div class="font-bold text-slate-900">${fac.name}</div>
          <div class="text-slate-600">${fac.type} • KM ${fac.km}</div>
          <div class="text-blue-700 mt-0.5">Department: ${fac.department} • Status: ${fac.status}</div>
          <div class="text-[10px] text-slate-500">Source: Rail Samanvaya Infrastructure Master</div>
        </div>
      `, { direction: 'top', offset: [0, -10] });

      marker.addTo(group);
    });
  }, [isAssetsEnabled]);

  // ---------------------------------------------------------------------------
  // 6d. Render Maintenance Requests & Work Zones
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current || !workZoneLayersRef.current) return;
    const group = workZoneLayersRef.current;
    group.clearLayers();

    if (!isWorkZonesEnabled) return;

    const requests: BlockRequest[] = state.requests || [];

    requests.forEach(req => {
      const sKm = req.startKm ?? 12.4;
      const eKm = req.endKm ?? 13.1;
      const track = req.affectedTracks?.[0] || 'UP Main';
      const dept = req.department || 'P.Way';

      const color = 
        dept === 'P.Way' ? '#10b981' :
        dept === 'S&T' ? '#f59e0b' : '#ef4444';

      const p1: [number, number] = [
        16.5193 - (sKm / 80.0) * (16.5193 - 16.2430),
        80.6231 - (sKm / 80.0) * (80.6231 - 80.6480)
      ];
      const p2: [number, number] = [
        16.5193 - (eKm / 80.0) * (16.5193 - 16.2430),
        80.6231 - (eKm / 80.0) * (80.6231 - 80.6480)
      ];

      const polyline = L.polyline([p1, p2], {
        color,
        weight: 8,
        opacity: 0.75,
        lineCap: 'round'
      });

      polyline.on('click', () => {
        setSelectedRequestInfo(req);
        if (onRequestSelect) {
          onRequestSelect(req.id);
        }
      });

      polyline.bindTooltip(`
        <div class="font-mono text-xs p-1">
          <div class="font-bold text-slate-900">${req.id}: ${req.work}</div>
          <div class="text-slate-600">KM ${sKm} – ${eKm} (${track}) • ${dept}</div>
          <div class="text-emerald-700 font-semibold mt-0.5">
            Duration: ${req.duration}m • Priority: ${req.priority || 'NORMAL'}
          </div>
          <div class="text-[10px] text-slate-500 mt-1">Status: ${req.status} • Window: ${req.allocatedWindow ? `${req.allocatedWindow.startTime}–${req.allocatedWindow.endTime}` : 'Pending'}</div>
        </div>
      `, { sticky: true });

      polyline.addTo(group);

      const kmStartIcon = L.divIcon({
        html: `<div class="px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-slate-900 text-white border border-slate-600 shadow">${sKm}</div>`,
        className: 'km-post-icon',
        iconSize: [28, 14],
        iconAnchor: [14, 7]
      });
      L.marker(p1, { icon: kmStartIcon }).addTo(group);
    });
  }, [isWorkZonesEnabled, state.requests, onRequestSelect]);

  // ---------------------------------------------------------------------------
  // 6e. Render Conflict Areas & Nearby Train Interaction Hazards
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current || !conflictLayersRef.current) return;
    const group = conflictLayersRef.current;
    group.clearLayers();

    if (!isConflictsEnabled) return;

    const liveTrains: LiveTrainPosition[] = state.liveData?.liveTrains || [];
    const requests: BlockRequest[] = (state.requests || []).filter(
      r => r.status === 'Block Window Allocated' || r.status === 'Planning Queue' || r.status === 'Approved'
    );

    requests.forEach(req => {
      const sKm = req.startKm ?? 12.4;
      const eKm = req.endKm ?? 13.1;
      const track = req.affectedTracks?.[0] || 'UP Main';

      const midKm = (sKm + eKm) / 2;
      const workCenter: [number, number] = [
        16.5193 - (midKm / 80.0) * (16.5193 - 16.2430),
        80.6231 - (midKm / 80.0) * (80.6231 - 80.6480)
      ];

      liveTrains.forEach(train => {
        const interaction = classifyTrainWorkInteraction(
          train,
          {
            id: req.id,
            requestId: req.id,
            startKm: sKm,
            endKm: eKm,
            track,
            sectionId: req.section || req.sectionId,
            proximityThresholdKm: 30.0,
            isActiveNow: req.status === 'Active' || req.status === 'Work in Progress',
            blockStartTime: req.allocatedWindow?.startTime || '04:30',
            blockEndTime: req.allocatedWindow?.endTime || '06:30'
          },
          state.liveData?.source || 'LIVE'
        );

        if (interaction.state === 'IN_AFFECTED_RANGE') {
          // Hard Conflict: Train inside work zone
          const hazardCircle = L.circle(workCenter, {
            radius: 450,
            color: '#dc2626',
            fillColor: '#ef4444',
            fillOpacity: 0.35,
            weight: 3,
            dashArray: '4, 4'
          });

          hazardCircle.bindTooltip(`
            <div class="font-mono text-xs p-1 text-rose-900 font-bold">
              ⚠️ HARD CONFLICT: Train ${train.trainNumber} occupied inside active work zone KM ${sKm}–${eKm}!
            </div>
          `, { sticky: true });

          hazardCircle.on('click', () => {
            setSelectedConflictInfo({
              type: 'HARD_CONFLICT',
              train,
              request: req,
              interaction,
              message: `Train ${train.trainNumber} is physically within maintenance boundaries KM ${sKm}–${eKm}. Immediate clearance protocol required.`
            });
          });

          hazardCircle.addTo(group);
        } else if (interaction.state === 'APPROACHING') {
          // Approaching movement
          const trainLat = typeof train.latitude === 'number' && !isNaN(train.latitude) && train.latitude !== 0 ? train.latitude : 16.48;
          const trainLng = typeof train.longitude === 'number' && !isNaN(train.longitude) && train.longitude !== 0 ? train.longitude : 80.60;

          const approachLine = L.polyline([[trainLat, trainLng], workCenter], {
            color: '#f59e0b',
            weight: 2,
            opacity: 0.85,
            dashArray: '5, 5'
          });

          approachLine.bindTooltip(`
            <div class="font-mono text-xs p-1">
              <div class="font-bold text-amber-700">Approaching Movement: Train ${train.trainNumber}</div>
              <div>Distance: ${interaction.distanceKm} km • ETA: ${interaction.etaMinutes} mins</div>
              <div class="text-[10px] text-slate-600">Target: ${req.work} (${req.id})</div>
            </div>
          `, { sticky: true });

          approachLine.on('click', () => {
            setSelectedConflictInfo({
              type: 'APPROACHING',
              train,
              request: req,
              interaction,
              message: `Train ${train.trainNumber} approaching KM ${sKm} with ETA ${interaction.etaMinutes}m.`
            });
          });

          approachLine.addTo(group);
        } else if (interaction.state === 'UNKNOWN') {
          // Safety Invariant: UNKNOWN != NO_CONFLICT
          const unknownIcon = L.divIcon({
            html: `
              <div class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/80 shadow flex items-center gap-1">
                <span>⚠️</span>
                <span>UNKNOWN</span>
              </div>
            `,
            className: 'unknown-telemetry-icon',
            iconSize: [64, 18],
            iconAnchor: [32, 9]
          });

          const unknownMarker = L.marker(workCenter, { icon: unknownIcon });
          unknownMarker.bindTooltip(`
            <div class="font-mono text-xs p-1 text-amber-900">
              <div class="font-bold">UNKNOWN TELEMETRY WARNING</div>
              <div class="text-xs mt-0.5">Train ${train.trainNumber} telemetry is unverified or stale.</div>
              <div class="text-[10px] text-rose-700 font-bold mt-1">Rule: UNKNOWN != NO_CONFLICT. Manual officer verification required.</div>
            </div>
          `, { sticky: true });

          unknownMarker.on('click', () => {
            setSelectedConflictInfo({
              type: 'UNKNOWN_TELEMETRY',
              train,
              request: req,
              interaction,
              message: `Telemetry unverified for train ${train.trainNumber}. System enforces safety invariant: UNKNOWN != NO_CONFLICT.`
            });
          });

          unknownMarker.addTo(group);
        }
      });
    });
  }, [isConflictsEnabled, state.liveData?.liveTrains, state.liveData?.source, state.requests]);

  // ---------------------------------------------------------------------------
  // 6f. Render Candidate Planning Windows
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current || !candidateLayersRef.current) return;
    const group = candidateLayersRef.current;
    group.clearLayers();

    if (!isCandidateWindowsEnabled) return;

    const targetReq = state.requests.find(r => r.status === 'Block Window Allocated' || r.status === 'Planning Queue') || state.requests[0];
    if (!targetReq) return;

    const sKm = targetReq.startKm ?? 12.4;
    const eKm = targetReq.endKm ?? 13.1;
    const p1: [number, number] = [
      16.5193 - (sKm / 80.0) * (16.5193 - 16.2430),
      80.6231 - (sKm / 80.0) * (80.6231 - 80.6480)
    ];
    const p2: [number, number] = [
      16.5193 - (eKm / 80.0) * (16.5193 - 16.2430),
      80.6231 - (eKm / 80.0) * (80.6231 - 80.6480)
    ];

    const polyline = L.polyline([p1, p2], {
      color: '#06b6d4',
      weight: 7,
      opacity: 0.85,
      dashArray: '6, 6'
    });

    polyline.bindTooltip(`
      <div class="font-mono text-xs p-1">
        <div class="font-bold text-cyan-700">CANDIDATE PLANNING OVERLAY: ${targetReq.id}</div>
        <div class="text-slate-700">${targetReq.work} • Required: ${targetReq.duration} mins</div>
        <div class="text-emerald-700 font-semibold mt-0.5">Recommended: 04:30–06:30 IST (120m)</div>
        <div class="text-neutral-500 text-[10px]">Alternative: 01:30–03:30 (Feasible) • 11:30–13:30 (Conflict)</div>
      </div>
    `, { sticky: true });

    polyline.addTo(group);
  }, [isCandidateWindowsEnabled, state.requests]);

  // ---------------------------------------------------------------------------
  // 7. Fly to Station or Zone Preset
  // ---------------------------------------------------------------------------
  const flyToLocation = useCallback((lat: number, lng: number, zoom = 13) => {
    if (!mapRef.current) return;
    try {
      if (typeof lat !== 'number' || isNaN(lat) || typeof lng !== 'number' || isNaN(lng)) return;
      mapRef.current.flyTo([lat, lng], zoom, {
        duration: 1.4,
        easeLinearity: 0.25
      });
    } catch (err) {
      console.warn('Leaflet flyTo safely caught:', err);
    }
  }, []);

  // Automatically fly to and select maintenance request if selectedRequestId is passed
  useEffect(() => {
    if (!selectedRequestId || !mapRef.current) return;
    const req = (state.requests || []).find(r => r.id === selectedRequestId);
    if (req) {
      setSelectedRequestInfo(req);
      const sKm = req.startKm ?? 12.4;
      const eKm = req.endKm ?? 13.1;
      const midKm = (sKm + eKm) / 2;
      const lat = 16.5193 - (midKm / 80.0) * (16.5193 - 16.2430);
      const lng = 80.6231 - (midKm / 80.0) * (80.6231 - 80.6480);
      flyToLocation(lat, lng, 14);
    }
  }, [selectedRequestId, state.requests, flyToLocation]);

  // Automatically fly to mapFocus if passed with valid coordinates
  useEffect(() => {
    if (!mapFocus || !mapRef.current) return;
    if (Number.isFinite(mapFocus.lat) && Number.isFinite(mapFocus.lng)) {
      flyToLocation(mapFocus.lat, mapFocus.lng, mapFocus.zoom || 14);
    }
  }, [mapFocus, flyToLocation]);

  // Automatically fly to and focus train if selectedTrainId or selectedTrain is passed
  useEffect(() => {
    if ((!selectedTrainId && !selectedTrain) || !mapRef.current) return;
    const liveTrains: LiveTrainPosition[] = state.liveData?.liveTrains || [];
    const targetId = selectedTrainId || selectedTrain?.trainNumber || selectedTrain?.runId;
    const train = (selectedTrain && (
      !targetId ||
      selectedTrain.trainNumber === targetId ||
      selectedTrain.runId === targetId ||
      `${selectedTrain.trainNumber}-${selectedTrain.startDate || selectedTrain.serviceDate}` === targetId
    )) ? selectedTrain : liveTrains.find(t => 
      t.trainNumber === targetId || 
      t.runId === targetId ||
      `${t.trainNumber}-${t.startDate || t.serviceDate}` === targetId
    );
    if (train) {
      setSelectedTrainInfo(train);
      let lat: number | null = null;
      let lng: number | null = null;
      if (typeof train.latitude === 'number' && Number.isFinite(train.latitude) && 
          typeof train.longitude === 'number' && Number.isFinite(train.longitude) &&
          train.latitude !== 0 && train.longitude !== 0) {
        lat = train.latitude;
        lng = train.longitude;
      } else {
        const matchCurrent = allStations.find(s => s.code === train.currentStation);
        const matchNext = allStations.find(s => s.code === train.nextStation);
        if (matchCurrent && matchNext && matchCurrent.code !== matchNext.code) {
          lat = matchCurrent.lat + 0.5 * (matchNext.lat - matchCurrent.lat);
          lng = matchCurrent.lng + 0.5 * (matchNext.lng - matchCurrent.lng);
        } else if (matchCurrent) {
          lat = matchCurrent.lat;
          lng = matchCurrent.lng;
        }
      }
      if (lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng)) {
        flyToLocation(lat, lng, 14);
      }
    }
  }, [selectedTrainId, selectedTrain, state.liveData?.liveTrains, allStations, flyToLocation]);

  // Bidirectional Inspection: calculate train interactions with maintenance requests
  const trainInteractions = useMemo(() => {
    if (!selectedTrainInfo) return [];
    const source = state.liveData?.source || 'LIVE';
    return (state.requests || []).map(req => {
      const sKm = req.startKm ?? 12.4;
      const eKm = req.endKm ?? 13.1;
      const track = req.affectedTracks?.[0] || 'UP Main';
      const interaction = classifyTrainWorkInteraction(
        selectedTrainInfo,
        {
          id: req.id,
          requestId: req.id,
          startKm: sKm,
          endKm: eKm,
          track,
          sectionId: req.section || req.sectionId,
          proximityThresholdKm: 30.0,
          isActiveNow: req.status === 'Active' || req.status === 'Work in Progress',
          blockStartTime: req.allocatedWindow?.startTime || '04:30',
          blockEndTime: req.allocatedWindow?.endTime || '06:30'
        },
        source
      );
      return { req, interaction };
    });
  }, [selectedTrainInfo, state.requests, state.liveData?.source]);

  const primaryTrainInteraction = useMemo(() => {
    if (!trainInteractions || trainInteractions.length === 0) return null;
    const inRange = trainInteractions.find(i => i.interaction.state === 'IN_AFFECTED_RANGE');
    if (inRange) return inRange;
    const approaching = trainInteractions.find(i => i.interaction.state === 'APPROACHING');
    if (approaching) return approaching;
    const potential = trainInteractions.find(i => i.interaction.state === 'POTENTIAL_CONFLICT');
    if (potential) return potential;
    return trainInteractions[0];
  }, [trainInteractions]);

  // Bidirectional Inspection: calculate nearby trains for selected request
  const requestNearbyTrains = useMemo(() => {
    if (!selectedRequestInfo) return [];
    const sKm = selectedRequestInfo.startKm ?? 12.4;
    const eKm = selectedRequestInfo.endKm ?? 13.1;
    const track = selectedRequestInfo.affectedTracks?.[0] || 'UP Main';
    return getNearbyTrainsForLocation(
      {
        startKm: sKm,
        endKm: eKm,
        track,
        sectionId: selectedRequestInfo.section,
        blockStartTime: selectedRequestInfo.allocatedWindow?.startTime || '04:30',
        blockEndTime: selectedRequestInfo.allocatedWindow?.endTime || '06:30'
      },
      state.liveData?.liveTrains || [],
      state.liveData?.source || 'LIVE'
    );
  }, [selectedRequestInfo, state.liveData?.liveTrains, state.liveData?.source]);

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
        <div className="absolute top-16 right-3 z-[1000] w-72 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700 p-3.5 shadow-2xl text-xs font-mono space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 font-bold text-slate-200">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Map Layer Control</span>
            </span>
            <button
              onClick={() => setIsLayerModalOpen(false)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span>Live Trains (RailRadar)</span>
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
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span>Train Routes Geometry</span>
              </span>
              <input
                type="checkbox"
                checked={isRoutesEnabled}
                onChange={(e) => setIsRoutesEnabled(e.target.checked)}
                className="accent-emerald-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span>Stations &amp; Halts</span>
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
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span>Track Infrastructure (OSM)</span>
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
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                <span>Railway Assets (Signals/OHE)</span>
              </span>
              <input
                type="checkbox"
                checked={isAssetsEnabled}
                onChange={(e) => setIsAssetsEnabled(e.target.checked)}
                className="accent-emerald-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
                <span>Maintenance Work Zones</span>
              </span>
              <input
                type="checkbox"
                checked={isWorkZonesEnabled}
                onChange={(e) => setIsWorkZonesEnabled(e.target.checked)}
                className="accent-emerald-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Block / Possession Zones</span>
              </span>
              <input
                type="checkbox"
                checked={isBlocksEnabled}
                onChange={(e) => setIsBlocksEnabled(e.target.checked)}
                className="accent-emerald-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                <span>Conflict Areas &amp; Hazards</span>
              </span>
              <input
                type="checkbox"
                checked={isConflictsEnabled}
                onChange={(e) => setIsConflictsEnabled(e.target.checked)}
                className="accent-emerald-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-300"></span>
                <span>Candidate Windows</span>
              </span>
              <input
                type="checkbox"
                checked={isCandidateWindowsEnabled}
                onChange={(e) => setIsCandidateWindowsEnabled(e.target.checked)}
                className="accent-emerald-500 rounded"
              />
            </label>
          </div>
        </div>
      )}

      {/* 3. The Map Canvas Container */}
      <div 
        ref={mapContainerRef} 
        style={{ height, width: '100%' }} 
        className="z-0 relative"
      />

      {/* 4. Floating Entity Inspector HUD */}
      {(selectedStationInfo || selectedTrainInfo || selectedBlockInfo || selectedRequestInfo || selectedAssetInfo || selectedConflictInfo) && (
        <div className="absolute top-16 left-3 z-[1000] w-84 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/90 p-4 shadow-2xl text-xs font-mono space-y-2.5 text-slate-200 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                {selectedStationInfo ? 'Station Inspector' : 
                 selectedTrainInfo ? 'Train Telemetry' : 
                 selectedRequestInfo ? 'Maintenance Request' :
                 selectedAssetInfo ? 'Railway Asset' :
                 selectedConflictInfo ? 'Conflict Alert' : 'Possession Hazard'}
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedStationInfo(null);
                setSelectedTrainInfo(null);
                setSelectedBlockInfo(null);
                setSelectedRequestInfo(null);
                setSelectedAssetInfo(null);
                setSelectedConflictInfo(null);
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
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-base font-bold text-cyan-400">
                    {selectedTrainInfo.trainName || selectedTrainInfo.trainNumber} ({selectedTrainInfo.trainNumber})
                  </div>
                  <div className="text-[10px] font-mono text-cyan-300/80 mt-0.5">
                    ID: {buildRunIdentity(selectedTrainInfo)}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                  selectedTrainInfo.confidence === 'HIGH'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                    : selectedTrainInfo.confidence === 'MEDIUM'
                    ? 'bg-amber-950 text-amber-300 border border-amber-600/50'
                    : selectedTrainInfo.confidence === 'LOW'
                    ? 'bg-orange-950 text-orange-300 border border-orange-600/50'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {selectedTrainInfo.confidence || 'UNKNOWN'} CONFIDENCE
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-800/60 p-2 rounded-lg">
                <div>
                  <span className="text-slate-400 block">Current Station:</span>
                  <span className="font-semibold text-slate-200">{selectedTrainInfo.currentStation || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Next Station:</span>
                  <span className="font-semibold text-slate-200">{selectedTrainInfo.nextStation || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Speed / Direction:</span>
                  <span className="font-semibold text-slate-200">{selectedTrainInfo.speedKmph || 85} km/h ({selectedTrainInfo.direction || 'UP'})</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Punctuality:</span>
                  <span className={`font-semibold ${(selectedTrainInfo.delayMinutes || 0) > 15 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {(selectedTrainInfo.delayMinutes || 0) > 0 ? `+${selectedTrainInfo.delayMinutes}m Late` : 'On Time (RT)'}
                  </span>
                </div>
              </div>

              {/* Route Geometry State */}
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-[10px]">
                {routeGeometryInfo ? (
                  <div className="text-cyan-400 flex items-center justify-between font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                      Real Route Geometry Plotted
                    </span>
                    <span className="text-slate-400">{routeGeometryInfo.waypointsCount.toLocaleString()} track points</span>
                  </div>
                ) : (
                  <div className="text-slate-500 font-mono italic">
                    Route geometry unavailable (no straight lines fabricated)
                  </div>
                )}
              </div>

              {/* Bidirectional Maintenance Work Impact */}
              <div className="p-2.5 rounded-lg border bg-slate-950/80 border-slate-800 text-[11px] space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Work Zone Proximity</span>
                  {primaryTrainInteraction && (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      primaryTrainInteraction.interaction.state === 'IN_AFFECTED_RANGE'
                        ? 'bg-red-900 text-red-200 border border-red-600'
                        : primaryTrainInteraction.interaction.state === 'APPROACHING'
                        ? 'bg-amber-900 text-amber-200 border border-amber-600'
                        : primaryTrainInteraction.interaction.state === 'POTENTIAL_CONFLICT'
                        ? 'bg-orange-900 text-orange-200 border border-orange-600'
                        : primaryTrainInteraction.interaction.state === 'UNKNOWN'
                        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {primaryTrainInteraction.interaction.state}
                    </span>
                  )}
                </div>
                {primaryTrainInteraction ? (
                  <div className="space-y-0.5 text-[10px]">
                    <div className="text-slate-200 font-medium">
                      Nearest: <strong className="text-white">{primaryTrainInteraction.req.id}</strong> ({primaryTrainInteraction.req.work})
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>KM {primaryTrainInteraction.req.startKm}–{primaryTrainInteraction.req.endKm}</span>
                      <span>
                        {primaryTrainInteraction.interaction.distanceKm != null ? `${primaryTrainInteraction.interaction.distanceKm} km away` : ''}
                        {primaryTrainInteraction.interaction.etaMinutes != null ? ` (ETA ${primaryTrainInteraction.interaction.etaMinutes}m)` : ''}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-emerald-400 text-[10px]">Clear of planned work areas</div>
                )}
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

          {/* Maintenance Request Inspector */}
          {selectedRequestInfo && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-emerald-400">
                  {selectedRequestInfo.id}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-600">
                  {selectedRequestInfo.department}
                </span>
              </div>
              <div className="text-slate-100 font-semibold">{selectedRequestInfo.work}</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-800/60 p-2 rounded-lg">
                <div>
                  <span className="text-slate-400 block">Section / Track:</span>
                  <span className="font-semibold text-slate-200">{selectedRequestInfo.section} ({selectedRequestInfo.affectedTracks?.join(', ') || 'UP Main'})</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Chainage:</span>
                  <span className="font-semibold text-slate-200">KM {selectedRequestInfo.startKm} – {selectedRequestInfo.endKm}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Duration:</span>
                  <span className="font-semibold text-slate-200">{selectedRequestInfo.duration} minutes</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Status:</span>
                  <span className="font-semibold text-amber-300">{selectedRequestInfo.status}</span>
                </div>
              </div>
              {selectedRequestInfo.allocatedWindow && (
                <div className="p-2 rounded bg-emerald-950/60 border border-emerald-700/50 text-[10px] text-emerald-300">
                  Allocated Window: <strong>{selectedRequestInfo.allocatedWindow.startTime} – {selectedRequestInfo.allocatedWindow.endTime} IST</strong>
                </div>
              )}

              {/* Correlated Live Trains Proximity Radar */}
              <div className="p-2.5 rounded-lg border bg-slate-950/80 border-slate-800 text-[11px] space-y-1.5">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Correlated Live Trains</span>
                  <span className="text-cyan-400 font-mono">{requestNearbyTrains.length} Monitored</span>
                </div>
                {requestNearbyTrains.length > 0 ? (
                  <div className="space-y-1">
                    {requestNearbyTrains.slice(0, 3).map(nt => (
                      <div 
                        key={nt.trainNumber}
                        onClick={() => {
                          const trainObj = (state.liveData?.liveTrains || []).find(t => t.trainNumber === nt.trainNumber);
                          if (trainObj) setSelectedTrainInfo(trainObj);
                        }}
                        className="p-1.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-[10px] hover:border-cyan-500 cursor-pointer transition"
                        title="Click to view train details on map"
                      >
                        <div className="truncate pr-2">
                          <strong className="text-cyan-300 font-mono">{nt.trainNumber}</strong>
                          <span className="text-slate-300 ml-1.5 truncate">{nt.trainName}</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                          nt.interactionState === 'IN_AFFECTED_RANGE' ? 'bg-red-900 text-red-200 border border-red-600' :
                          nt.interactionState === 'APPROACHING' ? 'bg-amber-900 text-amber-200 border border-amber-600' :
                          nt.interactionState === 'POTENTIAL_CONFLICT' ? 'bg-orange-900 text-orange-200 border border-orange-600' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {nt.interactionState}
                        </span>
                      </div>
                    ))}
                    {requestNearbyTrains.length > 3 && (
                      <div className="text-[9px] text-slate-500 text-right">+{requestNearbyTrains.length - 3} more trains in sector</div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 text-[10px]">No trains detected in section range</div>
                )}
              </div>
            </div>
          )}

          {/* Railway Infrastructure Asset Inspector */}
          {selectedAssetInfo && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-indigo-400">
                  {selectedAssetInfo.name}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-600">
                  {selectedAssetInfo.department}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-800/60 p-2 rounded-lg">
                <div>
                  <span className="text-slate-400 block">Asset Type:</span>
                  <span className="font-semibold text-slate-200">{selectedAssetInfo.type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Chainage:</span>
                  <span className="font-semibold text-slate-200">KM {selectedAssetInfo.km || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Status:</span>
                  <span className="font-semibold text-emerald-400">{selectedAssetInfo.status || 'OPERATIONAL'}</span>
                </div>
                {selectedAssetInfo.aspect && (
                  <div>
                    <span className="text-slate-400 block">Aspect:</span>
                    <span className="font-semibold text-amber-300">{selectedAssetInfo.aspect}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conflict / Proximity Alert Inspector */}
          {selectedConflictInfo && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                <span className="text-base font-bold text-rose-400">
                  {selectedConflictInfo.type}
                </span>
              </div>
              <p className="text-[11px] text-slate-200 bg-rose-950/50 p-2 rounded-lg border border-rose-800">
                {selectedConflictInfo.message}
              </p>
              {selectedConflictInfo.interaction && (
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-800/60 p-2 rounded-lg">
                  <div>
                    <span className="text-slate-400 block">Interaction State:</span>
                    <span className="font-bold text-rose-400">{selectedConflictInfo.interaction.state}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Distance / ETA:</span>
                    <span className="font-semibold text-slate-200">
                      {selectedConflictInfo.interaction.distanceKm != null ? `${selectedConflictInfo.interaction.distanceKm} km` : 'N/A'} ({selectedConflictInfo.interaction.etaMinutes != null ? `${selectedConflictInfo.interaction.etaMinutes}m` : 'N/A'})
                    </span>
                  </div>
                </div>
              )}
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
