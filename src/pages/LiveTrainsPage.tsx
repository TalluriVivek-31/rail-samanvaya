// src/pages/LiveTrainsPage.tsx
// Rail Samnvay: Unified Live Railway Operations Workspace
// Combines Live Operations Map, Compact Radar Grid, Intelligent Train Search, and Bidirectional Maintenance Intelligence

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrainTrack, 
  Search, 
  RefreshCw, 
  Radio, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  Activity, 
  ShieldCheck, 
  Gauge, 
  Calendar, 
  ExternalLink,
  Layers,
  Map as MapIcon,
  LayoutGrid,
  Wrench,
  ShieldAlert,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Filter,
  Navigation,
  HelpCircle,
  X,
  Cpu
} from 'lucide-react';
import { useSamnvayStore } from '../store/useSamnvayStore';
import { useCorridorTrains, useStationBoard, useLiveTrainSearch } from '../hooks/useRailRadar';
import type { LiveTrainPosition, StationBoardEntry, BlockRequest } from '../types/samnvay';
import type { CandidatePlanningWindow } from '../types/infrastructure';
import { RealRailwayMap } from '../components/twin/RealRailwayMap';
import { checkRailRadarHealth, RailRadarHealthStatus } from '../services/railRadarClient';
import { useLiveClock, formatIndianTime, formatDelay } from '../utils/dateTime';
import { LiveTrainDetailPanel } from '../components/samnvay/LiveTrainDetailPanel';
import { StationTimetableWidget } from '../components/samnvay/StationTimetableWidget';
import { TrainsBetweenStationsWidget } from '../components/samnvay/TrainsBetweenStationsWidget';
import { NearbyTrainIntelligenceWidget } from '../components/samnvay/NearbyTrainIntelligenceWidget';
import { CandidateWindowComparisonMatrix } from '../components/samnvay/CandidateWindowComparisonMatrix';
import { buildRunIdentity, classifyTrainWorkInteraction } from '../utils/trainIntelligence';
import { analyzeLocationTrainConflicts } from '../optimization/conflictEngine';
import { DEFAULT_PLANNING_PARAMETERS } from '../optimization/corridorSchedule';
import { CORRIDOR_STATION_GEOS, NATIONAL_STATION_GEOS, CorridorStationGeo } from '../utils/railwayGeospatial';
import { EditorialHero } from '../components/common/EditorialHero';
import { RailRadarDiagnosticsDrawer } from '../components/common/RailRadarDiagnosticsDrawer';

const MAJOR_STATION_CHIPS = [
  { code: 'BZA', name: 'Vijayawada' },
  { code: 'NDLS', name: 'New Delhi' },
  { code: 'HWH', name: 'Howrah' },
  { code: 'MAS', name: 'Chennai' },
  { code: 'SC', name: 'Secunderabad' },
  { code: 'MMCT', name: 'Mumbai' },
  { code: 'BPP', name: 'Bapatla' },
  { code: 'CLX', name: 'Chirala' },
];

export const LiveTrainsPage: React.FC = () => {
  const { 
    state, 
    toggleLiveMode, 
    updateLiveTrains, 
    updateStationBoard,
    rescheduleBlock,
    authorizeAndScheduleBlock,
    sendToControl
  } = useSamnvayStore();

  const [selectedStation, setSelectedStation] = useState<string>('BZA');
  const [healthStatus, setHealthStatus] = useState<RailRadarHealthStatus | null>(null);

  // 1. Shared Unified Train Selection State across Map, Radar Grid, Search, and Detail Panel
  const [selectedTrainId, setSelectedTrainId] = useState<string | null>(null);
  const [selectedTrainForPanel, setSelectedTrainForPanel] = useState<LiveTrainPosition | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState<boolean>(false);

  // 2. Intelligent Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);

  // 3. Radar Grid Filter State
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'APPROACHING' | 'INSIDE' | 'CONFLICT' | 'NONE' | 'UNKNOWN'>('ALL');

  // 4. Map Camera Focus & Telemetry Locate Status State
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [locateStatus, setLocateStatus] = useState<{
    status: 'IDLE' | 'LOCATING' | 'LOCATED' | 'OUTSIDE_CORRIDOR' | 'LOCATION_UNAVAILABLE' | 'TRAIN_NOT_FOUND';
    message?: string;
    trainNumber?: string;
    trainName?: string;
  } | null>(null);

  // Error Banner Dismissal State (prevents repeated popups across 30s polls unless error changes)
  const [dismissedErrorHash, setDismissedErrorHash] = useState<string | null>(null);

  // Maintenance Request Selection State for Master Map Focusing
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [showCandidateWindows, setShowCandidateWindows] = useState<boolean>(true);

  // Station Electronic Display Board Dynamic Search State
  const [stationTab, setStationTab] = useState<'live-board' | 'timetable'>('live-board');
  const [boardSearchQuery, setBoardSearchQuery] = useState('');
  const [boardSearchSuggestions, setBoardSearchSuggestions] = useState<Array<{ name: string; railway_ref: string; zone: string }>>([]);
  const [isSearchingBoardStation, setIsSearchingBoardStation] = useState(false);
  const [isBoardSearchOpen, setIsBoardSearchOpen] = useState(false);

  // Diagnostics Drawer State
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);
  const [refreshCooldown, setRefreshCooldown] = useState<number>(0);

  // Refresh cooldown timer (10s lock)
  useEffect(() => {
    if (refreshCooldown <= 0) return;
    const timer = setTimeout(() => setRefreshCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(timer);
  }, [refreshCooldown]);

  // True runtime current clock (Asia/Kolkata IST) updating every second
  const { formattedDateTime: currentLiveDateTime } = useLiveClock(1000);

  // Corridor live tracking hook with 30s interval
  const { 
    trains, 
    source, 
    lastUpdated, 
    upstreamUpdatedAt, 
    lastSuccessfulSync,
    lastAttempt,
    isLoading, 
    refetch, 
    isBackingOff,
    backoffRemainingMs,
    error: corridorError 
  } = useCorridorTrains(state.isLiveMode, true, 30_000);
  
  // Station live board hook (manual on-demand fetch only; no background poller)
  const { 
    entries: stationEntries, 
    isLoading: isStationLoading, 
    refetch: refetchStation 
  } = useStationBoard(selectedStation, state.isLiveMode, false, 0);

  // Single train lookup tied to current live mode for trains outside corridor fleet
  const { 
    train: searchedTrain, 
    isLoading: isSearching, 
    searchState,
    searchMessage,
    search, 
    clear: clearSearch, 
    error: searchError 
  } = useLiveTrainSearch(state.isLiveMode);

  // 250ms Debounce for train search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Check health on mount / mode toggle
  useEffect(() => {
    checkRailRadarHealth().then(setHealthStatus);
  }, [state.isLiveMode]);

  // Sync Station dynamic search suggestions
  useEffect(() => {
    if (!boardSearchQuery.trim()) {
      setBoardSearchSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingBoardStation(true);
      try {
        const res = await fetch(`/api/infrastructure/stations/search?q=${encodeURIComponent(boardSearchQuery.trim())}&limit=6`);
        const json = await res.json();
        if (json.success && json.data) {
          setBoardSearchSuggestions(json.data);
        }
      } catch (err) {
        console.error('Failed to search stations for display board', err);
      } finally {
        setIsSearchingBoardStation(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [boardSearchQuery]);

  // Sync with Samnvay Store whenever trains update
  useEffect(() => {
    if (trains && trains.length > 0) {
      updateLiveTrains(trains, source, corridorError);
    } else if (source === 'UNAVAILABLE') {
      updateLiveTrains([], 'UNAVAILABLE', corridorError);
    }
  }, [trains, source, corridorError, updateLiveTrains]);

  // Sync Station Board with Store
  useEffect(() => {
    if (stationEntries && stationEntries.length > 0) {
      updateStationBoard(selectedStation, stationEntries, source);
    }
  }, [stationEntries, selectedStation, source, updateStationBoard]);

  const safeTrains = useMemo(() => (Array.isArray(trains) ? trains : []), [trains]);
  const safeStationEntries = useMemo(() => (Array.isArray(stationEntries) ? stationEntries : []), [stationEntries]);

  // Combined stations list for coordinate lookup
  const allKnownStations = useMemo(() => {
    const combined: any[] = Object.values(NATIONAL_STATION_GEOS);
    Object.values(CORRIDOR_STATION_GEOS).forEach((cs: CorridorStationGeo) => {
      if (!combined.some(s => s.code === cs.code)) {
        combined.push(cs);
      }
    });
    return combined;
  }, []);

  // Format KM utility
  const formatKm = (km: any) => {
    const num = typeof km === 'number' ? km : parseFloat(km);
    return isNaN(num) ? '320.0' : num.toFixed(1);
  };

  // Unified select handler to keep Map, Radar Grid, Search and Detail Panel in lockstep
  const selectTrain = useCallback((train: LiveTrainPosition, openFullModal: boolean = false) => {
    const stableId = train.runId || train.trainNumber;
    setSelectedTrainId(stableId);
    setSelectedTrainForPanel(train);
    if (openFullModal) {
      setIsDetailPanelOpen(true);
    }

    if (typeof train.latitude === 'number' && Number.isFinite(train.latitude) && train.latitude !== 0 &&
        typeof train.longitude === 'number' && Number.isFinite(train.longitude) && train.longitude !== 0) {
      setMapFocus({ lat: train.latitude, lng: train.longitude, zoom: 14 });
      setLocateStatus({
        status: 'LOCATED',
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        message: `Located train ${train.trainNumber} (${train.trainName || ''}) at coordinates [${train.latitude.toFixed(4)}, ${train.longitude.toFixed(4)}]`
      });
    } else {
      const match = allKnownStations.find(s => s.code === train.currentStation);
      if (match && Number.isFinite(match.lat) && Number.isFinite(match.lng)) {
        setMapFocus({ lat: match.lat, lng: match.lng, zoom: 14 });
        setLocateStatus({
          status: 'LOCATED',
          trainNumber: train.trainNumber,
          trainName: train.trainName,
          message: `Located train ${train.trainNumber} at station ${train.currentStation} [${match.lat.toFixed(4)}, ${match.lng.toFixed(4)}]`
        });
      } else {
        setLocateStatus({
          status: 'LOCATION_UNAVAILABLE',
          trainNumber: train.trainNumber,
          trainName: train.trainName,
          message: `Live telemetry present for train ${train.trainNumber}, but exact GPS coordinates are currently unmapped.`
        });
      }
    }
  }, [allKnownStations]);

  // Performance-optimized precomputed train-work interactions
  const evaluatedTrains = useMemo(() => {
    const reqs = state.requests || [];
    return safeTrains.map(train => {
      let primary = null;
      for (const req of reqs) {
        const sKm = req.startKm ?? 12.4;
        const eKm = req.endKm ?? 13.1;
        const track = req.affectedTracks?.[0] || 'UP Main';
        const inter = classifyTrainWorkInteraction(
          train,
          {
            id: req.id,
            requestId: req.id,
            startKm: sKm,
            endKm: eKm,
            track,
            sectionId: req.section || req.sectionId,
            isActiveNow: req.status === 'Active' || req.status === 'Work in Progress',
            blockStartTime: req.allocatedWindow?.startTime || '04:30',
            blockEndTime: req.allocatedWindow?.endTime || '06:30'
          },
          source
        );

        if (inter.state === 'IN_AFFECTED_RANGE') {
          primary = { req, interaction: inter };
          break;
        } else if (inter.state === 'APPROACHING') {
          if (!primary || primary.interaction.state !== 'IN_AFFECTED_RANGE') {
            primary = { req, interaction: inter };
          }
        } else if (inter.state === 'POTENTIAL_CONFLICT') {
          if (!primary || (primary.interaction.state !== 'IN_AFFECTED_RANGE' && primary.interaction.state !== 'APPROACHING')) {
            primary = { req, interaction: inter };
          }
        } else if (inter.state === 'UNKNOWN') {
          if (!primary) {
            primary = { req, interaction: inter };
          }
        } else if (!primary) {
          primary = { req, interaction: inter };
        }
      }

      return {
        train,
        interaction: primary?.interaction || {
          state: 'NO_INTERACTION' as const,
          distanceKm: null,
          etaMinutes: null,
          projectedEta: null,
          severity: 'NONE' as const,
          reason: 'CLEAR_OF_POSSESSIONS'
        },
        targetRequest: primary?.req || null
      };
    });
  }, [safeTrains, state.requests, source]);

  // Intelligent Search Matches (Exact number, Partial number, Name, Semantic Station relation)
  const searchMatches = useMemo(() => {
    if (!debouncedSearchQuery) return [];
    const q = debouncedSearchQuery.toUpperCase();

    return safeTrains.map(train => {
      const numMatch = train.trainNumber.toUpperCase().includes(q);
      const nameMatch = (train.trainName || '').toUpperCase().includes(q);
      let relation: string | null = null;

      if (train.currentStation && train.currentStation.toUpperCase() === q) {
        relation = `CURRENT AT ${q}`;
      } else if (train.nextStation && train.nextStation.toUpperCase() === q) {
        relation = `APPROACHING ${q}`;
      } else if (train.destinationStation && train.destinationStation.toUpperCase() === q) {
        relation = `DESTINATION ${q}`;
      } else if (train.lastReportedStation && train.lastReportedStation.toUpperCase() === q) {
        relation = `PASSED ${q}`;
      }

      const matches = numMatch || nameMatch || relation !== null;
      return matches ? { train, relation, exactNumber: train.trainNumber.toUpperCase() === q } : null;
    }).filter(Boolean) as Array<{ train: LiveTrainPosition; relation: string | null; exactNumber: boolean }>;
  }, [debouncedSearchQuery, safeTrains]);

  // Single-match auto-select behaviour
  useEffect(() => {
    if (searchMatches.length === 1 && debouncedSearchQuery.length >= 2) {
      const match = searchMatches[0].train;
      const stableId = match.runId || match.trainNumber;
      if (selectedTrainId !== stableId) {
        setSelectedTrainId(stableId);
        setSelectedTrainForPanel(match);
        setIsDetailPanelOpen(true);
      }
    }
  }, [searchMatches, debouncedSearchQuery, selectedTrainId]);

  // Handle live search state transitions and locate status banner
  useEffect(() => {
    if (searchState === 'SEARCHING') {
      setLocateStatus({
        status: 'LOCATING',
        message: 'Fetching live RailRadar data...'
      });
    } else if (searchState === 'FOUND' && searchedTrain) {
      const stableId = searchedTrain.runId || searchedTrain.trainNumber;
      setSelectedTrainId(stableId);
      setSelectedTrainForPanel(searchedTrain);

      if (typeof searchedTrain.latitude === 'number' && Number.isFinite(searchedTrain.latitude) && searchedTrain.latitude !== 0 &&
          typeof searchedTrain.longitude === 'number' && Number.isFinite(searchedTrain.longitude) && searchedTrain.longitude !== 0) {
        setMapFocus({ lat: searchedTrain.latitude, lng: searchedTrain.longitude, zoom: 14 });
        setLocateStatus({
          status: 'LOCATED',
          trainNumber: searchedTrain.trainNumber,
          trainName: searchedTrain.trainName,
          message: `LIVE: Train ${searchedTrain.trainNumber} (${searchedTrain.trainName || ''}) active at [${searchedTrain.latitude.toFixed(4)}, ${searchedTrain.longitude.toFixed(4)}]`
        });
      } else {
        const match = allKnownStations.find(s => s.code === searchedTrain.currentStation);
        if (match && Number.isFinite(match.lat) && Number.isFinite(match.lng)) {
          setMapFocus({ lat: match.lat, lng: match.lng, zoom: 14 });
          setLocateStatus({
            status: 'LOCATED',
            trainNumber: searchedTrain.trainNumber,
            trainName: searchedTrain.trainName,
            message: `LIVE: Train ${searchedTrain.trainNumber} (${searchedTrain.trainName || ''}) active at station ${searchedTrain.currentStation}.`
          });
        } else {
          setLocateStatus({
            status: 'LOCATION_UNAVAILABLE',
            trainNumber: searchedTrain.trainNumber,
            trainName: searchedTrain.trainName,
            message: 'LOCATION UNAVAILABLE'
          });
        }
      }
    } else if (searchState === 'TRAIN_NOT_FOUND') {
      setLocateStatus({
        status: 'TRAIN_NOT_FOUND',
        message: 'TRAIN NOT FOUND'
      });
    } else if (searchState === 'LIVE_DATA_UNAVAILABLE' || searchState === 'ERROR') {
      setLocateStatus({
        status: 'TRAIN_NOT_FOUND',
        message: 'LIVE DATA UNAVAILABLE'
      });
    }
  }, [searchState, searchedTrain, allKnownStations]);

  // Preserve selected train across 30s polling intervals
  useEffect(() => {
    if (!selectedTrainId || !safeTrains || safeTrains.length === 0) return;
    const current = safeTrains.find(t => 
      t.trainNumber === selectedTrainId || 
      t.runId === selectedTrainId ||
      `${t.trainNumber}-${t.startDate || t.serviceDate}` === selectedTrainId
    );
    if (current) {
      setSelectedTrainForPanel(current);
    }
  }, [safeTrains, selectedTrainId]);

  // Handle Search Submission: Directly queries live RailRadar backend
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setLocateStatus({
      status: 'LOCATING',
      message: 'Fetching live RailRadar data...'
    });
    search(query, true);
    setIsSearchDropdownOpen(false);
  };

  // Filtered Trains for Radar Grid based on active filter chip + search query
  const filteredRadarTrains = useMemo(() => {
    let result = evaluatedTrains;

    // 1. Filter by Maintenance Interaction Status
    if (activeFilter === 'APPROACHING') {
      result = result.filter(item => item.interaction.state === 'APPROACHING');
    } else if (activeFilter === 'INSIDE') {
      result = result.filter(item => item.interaction.state === 'IN_AFFECTED_RANGE');
    } else if (activeFilter === 'CONFLICT') {
      result = result.filter(item => item.interaction.state === 'POTENTIAL_CONFLICT');
    } else if (activeFilter === 'NONE') {
      result = result.filter(item => item.interaction.state === 'NO_INTERACTION');
    } else if (activeFilter === 'UNKNOWN') {
      result = result.filter(item => item.interaction.state === 'UNKNOWN');
    }

    // 2. Filter by Search Query if present
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toUpperCase();
      result = result.filter(item => {
        const t = item.train;
        return (
          t.trainNumber.toUpperCase().includes(q) ||
          (t.trainName || '').toUpperCase().includes(q) ||
          (t.currentStation || '').toUpperCase().includes(q) ||
          (t.nextStation || '').toUpperCase().includes(q)
        );
      });
    }

    return result;
  }, [evaluatedTrains, activeFilter, debouncedSearchQuery]);

  // Selected Maintenance Request Object
  const selectedRequest = useMemo(() => {
    if (!selectedRequestId) return null;
    return (state.requests || []).find(r => r.id === selectedRequestId) || null;
  }, [selectedRequestId, state.requests]);

  // Conflict and Candidate Windows Analysis for Selected Request
  const candidateAnalysis = useMemo(() => {
    if (!selectedRequest) return null;
    const sKm = selectedRequest.startKm ?? 12.4;
    const eKm = selectedRequest.endKm ?? 13.1;
    const track = selectedRequest.affectedTracks || ['UP Main'];
    const dur = selectedRequest.duration || 120;
    const reqTime = selectedRequest.allocatedWindow?.startTime || selectedRequest.preferredStartTime || '04:30';
    return analyzeLocationTrainConflicts(
      sKm,
      eKm,
      track,
      dur,
      reqTime,
      safeTrains,
      DEFAULT_PLANNING_PARAMETERS,
      source,
      lastUpdated
    );
  }, [selectedRequest, safeTrains, source, lastUpdated]);

  // Critical Approaching Train Alerts (Genuine LIVE Telemetry only)
  const approachingAlerts = useMemo(() => {
    if (source !== 'LIVE') return [];
    return evaluatedTrains.filter(item => {
      const { train, interaction, targetRequest } = item;
      if (!targetRequest) return false;
      if (train.journeyCompleted || train.isTerminated) return false;
      if (interaction.cannotGenerateLiveAlert) return false;
      return (
        interaction.state === 'IN_AFFECTED_RANGE' ||
        interaction.state === 'APPROACHING' ||
        interaction.state === 'POTENTIAL_CONFLICT'
      );
    });
  }, [evaluatedTrains, source]);

  // Data freshness badge helper
  const renderFreshnessPill = () => {
    if (!state.isLiveMode) {
      return (
        <div className="px-3 py-1 rounded-full border text-xs font-mono font-medium flex items-center gap-2 bg-amber-50 text-amber-700 border-amber-200 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>RAILRADAR ● DEMO TIMETABLE</span>
        </div>
      );
    }
    if (source === 'LIVE') {
      return (
        <div className="px-3 py-1 rounded-full border text-xs font-mono font-medium flex items-center gap-2 bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>● LIVE (RailRadar API)</span>
        </div>
      );
    }
    if (source === 'UNAVAILABLE') {
      return (
        <div className="px-3 py-1 rounded-full border text-xs font-mono font-medium flex items-center gap-2 bg-rose-50 text-rose-700 border-rose-200 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>LIVE DATA UNAVAILABLE</span>
        </div>
      );
    }
    return (
      <div className="px-3 py-1 rounded-full border text-xs font-mono font-medium flex items-center gap-2 bg-slate-50 text-slate-700 border-slate-200 shadow-xs">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        <span>STATUS: {source}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Master Editorial Hero */}
      <EditorialHero
        category="Telemetry & Operational Radar"
        titleLines={['LIVE RAILWAY', 'MOVEMENT']}
        subtitle="Real-time corridor train movements, dynamic GPS telemetry, approaching work zone alerts, and nationwide locator."
        badges={[
          { label: state.isLiveMode ? (source === 'UNAVAILABLE' ? 'LIVE MODE (UNAVAILABLE)' : 'LIVE RAILRADAR') : 'DEMO MODE', variant: state.isLiveMode ? (source === 'UNAVAILABLE' ? 'rose' : 'green') : 'amber' },
          { label: (state.isLiveMode && source === 'UNAVAILABLE') ? 'LIVE TRAIN POSITIONS UNAVAILABLE' : `${safeTrains.length} TRACKED IN CORRIDOR`, variant: (state.isLiveMode && source === 'UNAVAILABLE') ? 'rose' : 'teal' },
          { label: 'SCR BZA DIVISION', variant: 'steel' },
        ]}
        actionSlot={renderFreshnessPill()}
        bgMotif="grid"
      />

      {/* 2. Control Bar with Prominent Train Search */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-railway-border shadow-xs flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#546A7B]">
              Corridor Telemetry Search
            </span>
          </div>

          {/* Prominent Train Search Bar */}
          <div className="relative flex-1 max-w-xl">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="w-4 h-4 text-railway-textSecondary absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search train number, train name or station (e.g. 12704, Falaknuma, GNT)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchDropdownOpen(true);
                }}
                onFocus={() => setIsSearchDropdownOpen(true)}
                className="w-full pl-10 pr-24 py-2.5 bg-railway-canvas border border-railway-border rounded-full text-xs font-mono focus:outline-none focus:border-railway-forest shadow-xs"
              />
              <div className="absolute right-2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      clearSearch();
                      setIsSearchDropdownOpen(false);
                    }}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-3.5 py-1.5 rounded-full bg-railway-forest hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>

            {/* Interactive Search Matches Dropdown */}
            {isSearchDropdownOpen && searchMatches.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-railway-border shadow-xl p-2 z-50 max-h-72 overflow-y-auto font-mono text-xs animate-in fade-in">
                <div className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                  <span>Matching Corridor Trains ({searchMatches.length})</span>
                  <span className="text-[9px] text-slate-400">Click to focus on map</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {searchMatches.map(({ train, relation }) => (
                    <button
                      key={train.trainNumber}
                      type="button"
                      onClick={() => {
                        selectTrain(train);
                        setIsSearchDropdownOpen(false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-railway-canvas flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-800">{train.trainNumber}</span>
                          <span className="font-sans font-semibold text-slate-900">{train.trainName}</span>
                          {relation && (
                            <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 text-[10px] font-bold border border-cyan-200">
                              {relation}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-sans">
                          {train.currentStation} → {train.nextStation} ({train.direction || 'UP'} Main) • {train.speedKmph || 85} km/h
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-700">
                          {train.delayMinutes === 0 ? 'Right Time' : `+${train.delayMinutes}m`}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {renderFreshnessPill()}

            <button
              onClick={toggleLiveMode}
              className={`px-3 py-1 rounded-full border text-xs font-mono font-medium flex items-center gap-2 shadow-xs transition-all ${
                state.isLiveMode
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
              title="Toggle between LIVE RailRadar feed and DEMO simulation mode"
            >
              <span className={`w-2 h-2 rounded-full ${state.isLiveMode ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{state.isLiveMode ? 'MODE: LIVE' : 'MODE: DEMO'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDiagnosticsOpen(true)}
              className="px-3 py-1 rounded-full border border-slate-300 bg-white text-slate-700 font-semibold text-xs hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Open RailRadar Request Governor Diagnostics & Telemetry Pipeline"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              <span>Diagnostics</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                if (isLoading || isStationLoading || refreshCooldown > 0 || isBackingOff) return;
                setRefreshCooldown(10);
                await Promise.all([refetch(), refetchStation()]);
              }}
              disabled={isLoading || isStationLoading || refreshCooldown > 0 || isBackingOff}
              className="px-3.5 py-1 rounded-full border border-railway-border text-railway-textPrimary font-semibold text-xs hover:text-railway-forest hover:bg-railway-canvas transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
              title={isBackingOff ? `Upstream rate-limited. Retry in ${Math.ceil(backoffRemainingMs / 1000)}s` : refreshCooldown > 0 ? `Cooldown active (${refreshCooldown}s remaining)` : "Request fresh upstream RailRadar telemetry"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(isLoading || isStationLoading) ? 'animate-spin text-railway-forest' : 'text-railway-textSecondary'}`} />
              <span>
                {isBackingOff
                  ? `Backoff (${Math.ceil(backoffRemainingMs / 1000)}s)`
                  : refreshCooldown > 0
                  ? `Wait (${refreshCooldown}s)`
                  : 'Refresh'}
              </span>
            </button>
          </div>
        </div>

        {/* Technical Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="p-3 bg-railway-canvas rounded-2xl border border-railway-border">
            <div className="text-[10px] uppercase tracking-wider text-railway-textMuted flex items-center gap-1.5 font-bold">
              <Clock className="w-3 h-3 text-railway-forest animate-pulse" />
              <span>Current Time</span>
            </div>
            <div className="font-bold text-railway-textPrimary mt-1 text-xs sm:text-sm text-emerald-800 tracking-tight">
              {currentLiveDateTime}
            </div>
          </div>

          <div className="p-3 bg-railway-canvas rounded-2xl border border-railway-border">
            <div className="text-[10px] uppercase tracking-wider text-railway-textMuted flex items-center gap-1.5 font-bold">
              <Activity className="w-3 h-3 text-railway-textSecondary" />
              <span>Polling Rate</span>
            </div>
            <div className="font-bold text-railway-textPrimary mt-1 text-xs sm:text-sm">
              {isBackingOff ? `BACKOFF • retry in ${Math.ceil(backoffRemainingMs / 1000)}s` : '30s Cycle'}
            </div>
          </div>

          <div className="p-3 bg-railway-canvas rounded-2xl border border-railway-border">
            <div className="text-[10px] uppercase tracking-wider text-railway-textMuted flex items-center gap-1.5 font-bold">
              <Radio className="w-3 h-3 text-railway-textSecondary" />
              <span>Last Sync</span>
            </div>
            <div className="font-bold text-railway-textPrimary mt-1 text-xs">
              <div>Last successful sync: {lastSuccessfulSync ? formatIndianTime(lastSuccessfulSync) : 'Never'}</div>
              {lastAttempt && (
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">Last attempt: {formatIndianTime(lastAttempt)}</div>
              )}
            </div>
          </div>

          <div className="p-3 bg-railway-canvas rounded-2xl border border-railway-border">
            <div className="text-[10px] uppercase tracking-wider text-railway-textMuted flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-3 h-3 text-railway-textSecondary" />
              <span>Active Fleet</span>
            </div>
            <div className="font-bold text-railway-textPrimary mt-1 text-xs sm:text-sm">
              {state.isLiveMode && source === 'UNAVAILABLE' ? (
                <div>
                  <div className="text-rose-600 font-bold text-xs sm:text-sm">UNKNOWN</div>
                  <div className="text-[10px] text-slate-500 font-normal">Live train positions: UNAVAILABLE</div>
                </div>
              ) : (
                `${safeTrains.length} Corridor Trains`
              )}
            </div>
          </div>
        </div>

        {/* Upstream source timestamp indicator */}
        {upstreamUpdatedAt && (
          <div className="text-[11px] font-mono text-railway-textMuted flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Upstream Telemetry: <strong className="text-railway-textPrimary">{formatIndianTime(upstreamUpdatedAt)}</strong></span>
          </div>
        )}
      </div>

      {/* Upstream closable error notice banner with dismissedErrorHash anti-spam tracking */}
      {(() => {
        const currentError = (state.isLiveMode && source === 'UNAVAILABLE')
          ? (corridorError || 'RailRadar live telemetry is currently unavailable. No fabricated train markers are plotted in live mode.')
          : (corridorError || null);
        const currentErrorHash = currentError ? `${currentError}_${source}` : null;
        const isErrorDismissed = dismissedErrorHash !== null && dismissedErrorHash === currentErrorHash;

        if (!currentError || isErrorDismissed) return null;

        return (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-start sm:items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-rose-900">RAILRADAR TELEMETRY NOTICE:</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-mono font-bold">
                    {source}
                  </span>
                </div>
                <div className="text-rose-800 mt-0.5">{currentError}</div>
                <div className="text-[10px] text-rose-600 font-mono mt-1">
                  Zero fabricated train markers are plotted while live telemetry is unavailable.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              {state.isLiveMode && (
                <button
                  onClick={toggleLiveMode}
                  className="px-3 py-1 rounded-full bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800 transition shadow-xs"
                >
                  Switch to Demo Mode
                </button>
              )}
              <button
                onClick={async () => {
                  await Promise.all([refetch(), refetchStation()]);
                }}
                className="px-3 py-1 rounded-full bg-white border border-rose-300 text-rose-800 text-xs font-semibold hover:bg-rose-50 transition shadow-xs"
              >
                Retry
              </button>
              <button
                onClick={() => setDismissedErrorHash(currentErrorHash)}
                className="p-1.5 rounded-full text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition"
                title="Dismiss notification"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* Telemetry Locate Status Banner */}
      {locateStatus && locateStatus.status !== 'IDLE' && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-mono transition-all animate-fadeIn ${
          locateStatus.status === 'LOCATED' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
            : locateStatus.status === 'LOCATING'
            ? 'bg-blue-50 text-blue-900 border-blue-300'
            : locateStatus.status === 'LOCATION_UNAVAILABLE'
            ? 'bg-amber-50 text-amber-900 border-amber-300'
            : 'bg-rose-50 text-rose-900 border-rose-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {locateStatus.status === 'LOCATED' && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
            {locateStatus.status === 'LOCATING' && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />}
            {locateStatus.status === 'LOCATION_UNAVAILABLE' && <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />}
            {locateStatus.status === 'TRAIN_NOT_FOUND' && <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
            <div>
              <span className="font-bold uppercase tracking-wider text-[11px] mr-2">
                [{locateStatus.status}]:
              </span>
              <span>{locateStatus.message}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLocateStatus(null)}
            className="p-1 rounded-full hover:bg-black/5 text-slate-500 hover:text-slate-800 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. LIVE OPERATIONS MAP (Master Railway Operations Map) */}
      <div className="space-y-4">
        {/* Approaching Train Safety Alerts Banner */}
        {approachingAlerts.length > 0 && (
          <div className="bg-rose-50 border-2 border-rose-400 rounded-3xl p-5 shadow-soft space-y-3 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200 pb-3">
              <div className="flex items-center gap-2.5 text-rose-950 font-bold text-sm font-sans">
                <ShieldAlert className="w-5 h-5 text-rose-600 animate-bounce flex-shrink-0" />
                <span>OPERATIONAL SAFETY ALERT: LIVE TRAIN APPROACHING MAINTENANCE WORK ZONE</span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-600 text-white">
                {approachingAlerts.length} Critical Event{approachingAlerts.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {approachingAlerts.map(({ train, interaction, targetRequest }, idx) => (
                <div 
                  key={`${train.trainNumber}-${idx}`} 
                  className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs flex flex-col justify-between gap-3 text-xs font-mono"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-200 font-bold text-xs">
                        TRAIN {train.trainNumber}
                      </span>
                      <span className="font-sans font-bold text-slate-900 text-sm truncate max-w-[180px]">
                        {train.trainName}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        interaction.state === 'IN_AFFECTED_RANGE' ? 'bg-red-600 text-white animate-pulse' : 'bg-amber-500 text-white'
                      }`}>
                        {interaction.state}
                      </span>
                    </div>

                    <div className="text-slate-600 text-[11px] leading-tight">
                      Target Work: <strong className="text-slate-900">{targetRequest?.id}</strong> ({targetRequest?.work})
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-rose-900 text-[11px] pt-1">
                      <span>Sector: <strong>KM {targetRequest?.startKm}–{targetRequest?.endKm}</strong></span>
                      <span>•</span>
                      <span>Distance: <strong>{interaction.distanceKm != null ? `${interaction.distanceKm} km` : 'Imminent'}</strong></span>
                      <span>•</span>
                      <span>ETA: <strong>{interaction.etaMinutes != null ? `${interaction.etaMinutes}m` : '<10m'}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (targetRequest) setSelectedRequestId(targetRequest.id);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Focus Work Zone</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectTrain(train)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-[11px] transition cursor-pointer"
                    >
                      Inspect Train
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Master Map Toolbar & Work Zone Filter Dropdown */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-railway-border shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-xs">
              <MapIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-railway-textPrimary font-sans">
                  Live Operations Map
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 font-bold border border-emerald-300">
                  REAL NETWORK GEOMETRY
                </span>
              </div>
              <p className="text-xs text-railway-textSecondary font-sans">
                Real-time train vectors, physical tracks, stations, signals, and active maintenance possession envelopes
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-railway-textPrimary whitespace-nowrap">Focus Work Zone:</span>
            </div>
            <select
              value={selectedRequestId || ''}
              onChange={(e) => setSelectedRequestId(e.target.value ? e.target.value : null)}
              className="px-3.5 py-2 bg-railway-canvas border border-railway-border rounded-2xl text-xs font-mono font-semibold text-railway-textPrimary focus:outline-none focus:border-railway-forest shadow-xs max-w-[280px] sm:max-w-[340px] truncate"
            >
              <option value="">-- All Requests / Full Corridor View --</option>
              {(state.requests || []).map(req => (
                <option key={req.id} value={req.id}>
                  {req.id}: {req.work} (KM {req.startKm}–{req.endKm}) · [{req.status}]
                </option>
              ))}
            </select>
            {selectedRequestId && (
              <button
                type="button"
                onClick={() => setSelectedRequestId(null)}
                className="px-3 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-mono font-semibold transition"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Master Leaflet Railway Map */}
        <RealRailwayMap 
          selectedTrainId={selectedTrainId || undefined}
          selectedTrain={selectedTrainForPanel}
          mapFocus={mapFocus}
          onTrainSelect={selectTrain}
          onStationSelect={(code) => setSelectedStation(code)}
          selectedStationCode={selectedStation}
          selectedRequestId={selectedRequestId || undefined}
          onRequestSelect={(id) => setSelectedRequestId(id)}
        />

        {/* Nearby Train Intelligence & Candidate Matrices when a Work Zone is Selected */}
        {selectedRequest && (
          <div className="space-y-6 pt-2 animate-fadeIn">
            <NearbyTrainIntelligenceWidget
              request={selectedRequest}
              liveTrains={safeTrains}
              dataSource={source}
              onSelectTrain={(trainNumber) => {
                const tr = safeTrains.find(t => t.trainNumber === trainNumber);
                if (tr) selectTrain(tr);
              }}
            />

            {candidateAnalysis?.candidateWindows && candidateAnalysis.candidateWindows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-base font-bold text-railway-textPrimary font-sans">
                      Candidate Possession Windows · Decision Support Matrix
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-50 text-cyan-800 border border-cyan-200 font-bold">
                      {candidateAnalysis.candidateWindows.length} Feasible Windows
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCandidateWindows(!showCandidateWindows)}
                    className="text-xs font-mono text-railway-forest hover:underline font-semibold cursor-pointer"
                  >
                    {showCandidateWindows ? 'Hide Decision Matrix' : 'Show Decision Matrix'}
                  </button>
                </div>

                {showCandidateWindows && (
                  <CandidateWindowComparisonMatrix
                    request={selectedRequest}
                    candidateWindows={candidateAnalysis.candidateWindows}
                    onSelectWindow={(cand: CandidatePlanningWindow) => {
                      rescheduleBlock(selectedRequest.id, cand.startTime, cand.endTime, `Controller selected candidate window ${cand.slotId}: ${cand.startTime}–${cand.endTime}`);
                    }}
                    onAuthorizeWindow={(cand: CandidatePlanningWindow) => {
                      if (state.currentUser.role === 'Planning Officer') {
                        sendToControl(selectedRequest.id, `Recommended window ${cand.startTime}–${cand.endTime} accepted by Planning Officer`);
                      } else {
                        authorizeAndScheduleBlock(selectedRequest.id, `Possession authorized in recommended candidate window ${cand.startTime}–${cand.endTime}`);
                      }
                    }}
                    userRole={state.currentUser.role}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2.5 SELECTED TRAIN OPERATIONS CARD (In normal document flow, no overlap) */}
      {selectedTrainForPanel && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-emerald-500/40 shadow-soft space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-railway-border pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
                {selectedTrainForPanel.trainNumber.slice(-2)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-emerald-800 text-sm">
                    TRAIN {selectedTrainForPanel.trainNumber}
                  </span>
                  <span className="font-sans font-bold text-slate-900 text-base">
                    {selectedTrainForPanel.trainName || `Express ${selectedTrainForPanel.trainNumber}`}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
                    {selectedTrainForPanel.status || 'RUNNING'}
                  </span>
                  {/* Bug 4 Fix: Telemetry freshness badge */}
                  {(selectedTrainForPanel as any).dataFreshness === 'EXPIRED' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-400 flex items-center gap-1" title="Provider telemetry is older than 60 minutes">
                      <span>⚠ STALE DATA</span>
                    </span>
                  ) : (selectedTrainForPanel as any).dataFreshness === 'STALE' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300" title="Provider telemetry is 15–60 minutes old">
                      STALE
                    </span>
                  ) : null}
                  {selectedTrainForPanel.direction && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      {selectedTrainForPanel.direction} LINE
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 font-sans mt-0.5">
                  Route: <strong>{selectedTrainForPanel.originStation || 'Origin'}</strong> → <strong>{selectedTrainForPanel.destinationStation || 'Destination'}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setIsDetailPanelOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-mono font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                <span>Full Telemetry Analysis</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTrainId(null);
                  setSelectedTrainForPanel(null);
                }}
                className="p-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition cursor-pointer"
                title="Deselect Train"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono text-xs">
            <div className="p-2.5 bg-railway-canvas rounded-xl border border-railway-border">
              <span className="text-slate-400 text-[10px] block uppercase font-bold">Current Location</span>
              <strong className="text-slate-900 text-xs block truncate mt-0.5">
                {selectedTrainForPanel.currentStationName || selectedTrainForPanel.currentStation || `KM ${selectedTrainForPanel.currentKm || '—'}`}
              </strong>
            </div>

            <div className="p-2.5 bg-railway-canvas rounded-xl border border-railway-border">
              <span className="text-slate-400 text-[10px] block uppercase font-bold">Next Route Stop</span>
              <strong className="text-slate-900 text-xs block truncate mt-0.5">
                {selectedTrainForPanel.nextStationName || selectedTrainForPanel.nextStation || '—'}
              </strong>
            </div>

            <div className="p-2.5 bg-railway-canvas rounded-xl border border-railway-border">
              <span className="text-slate-400 text-[10px] block uppercase font-bold">Next Halt</span>
              <strong className="text-cyan-800 text-xs block truncate mt-0.5">
                {selectedTrainForPanel.nextHaltName || selectedTrainForPanel.nextHaltStation || '—'}
              </strong>
            </div>

            <div className="p-2.5 bg-railway-canvas rounded-xl border border-railway-border">
              <span className="text-slate-400 text-[10px] block uppercase font-bold">Speed</span>
              <strong className="text-slate-900 text-xs block mt-0.5">
                {selectedTrainForPanel.speedKmph != null ? `${selectedTrainForPanel.speedKmph} km/h` : '85 km/h'}
              </strong>
            </div>

            <div className="p-2.5 bg-railway-canvas rounded-xl border border-railway-border">
              <span className="text-slate-400 text-[10px] block uppercase font-bold">Delay / Punctuality</span>
              <strong className={`text-xs block mt-0.5 ${(selectedTrainForPanel.delayMinutes || 0) > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {(selectedTrainForPanel.delayMinutes || 0) > 0 ? `+${selectedTrainForPanel.delayMinutes}m Late` : 'Right Time'}
              </strong>
            </div>

            <div className="p-2.5 bg-railway-canvas rounded-xl border border-railway-border">
              <span className="text-slate-400 text-[10px] block uppercase font-bold">Confidence</span>
              <strong className={`text-xs block mt-0.5 ${
                selectedTrainForPanel.confidence === 'HIGH' ? 'text-emerald-700' :
                selectedTrainForPanel.confidence === 'MEDIUM' ? 'text-cyan-700' : 'text-amber-700'
              }`}>
                {selectedTrainForPanel.confidence || 'STATION_VERIFIED'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* 3. RADAR GRID (Tabular View directly integrated in the same workspace) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-railway-border shadow-soft space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-railway-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-railway-textPrimary font-sans">
                Radar Grid · Active Corridor Movements
              </h2>
            </div>
            <p className="text-xs text-railway-textSecondary font-sans">
              Click any train row to synchronize and focus on the Live Operations Map
            </p>
          </div>

          {/* Operational Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                activeFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              ALL ({evaluatedTrains.length})
            </button>
            <button
              onClick={() => setActiveFilter('APPROACHING')}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                activeFilter === 'APPROACHING'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              APPROACHING WORK ({evaluatedTrains.filter(t => t.interaction.state === 'APPROACHING').length})
            </button>
            <button
              onClick={() => setActiveFilter('INSIDE')}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                activeFilter === 'INSIDE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              INSIDE WORK ZONE ({evaluatedTrains.filter(t => t.interaction.state === 'IN_AFFECTED_RANGE').length})
            </button>
            <button
              onClick={() => setActiveFilter('CONFLICT')}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                activeFilter === 'CONFLICT'
                  ? 'bg-yellow-400 text-slate-950 shadow-xs'
                  : 'bg-yellow-50 text-yellow-800 border border-yellow-200 hover:bg-yellow-100'
              }`}
            >
              POTENTIAL CONFLICT ({evaluatedTrains.filter(t => t.interaction.state === 'POTENTIAL_CONFLICT').length})
            </button>
            <button
              onClick={() => setActiveFilter('NONE')}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                activeFilter === 'NONE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              NO INTERACTION ({evaluatedTrains.filter(t => t.interaction.state === 'NO_INTERACTION').length})
            </button>
            <button
              onClick={() => setActiveFilter('UNKNOWN')}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                activeFilter === 'UNKNOWN'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
              }`}
            >
              UNKNOWN ({evaluatedTrains.filter(t => t.interaction.state === 'UNKNOWN').length})
            </button>
          </div>
        </div>

        {/* Tabular Display — scrolls horizontally on mobile */}
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full min-w-[700px] text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-railway-border text-railway-textSecondary text-[11px] uppercase tracking-wider">
                <th className="pb-3 pl-3 font-semibold">Train</th>
                <th className="pb-3 font-semibold">Name</th>
                <th className="pb-3 font-semibold">Location</th>
                <th className="pb-3 font-semibold">Section / Next</th>
                <th className="pb-3 font-semibold">Track</th>
                <th className="pb-3 font-semibold">Direction</th>
                <th className="pb-3 font-semibold">Speed</th>
                <th className="pb-3 font-semibold">Delay</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Maintenance Interaction</th>
                <th className="pb-3 font-semibold text-right pr-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-railway-border/60">
              {filteredRadarTrains.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 font-sans">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-700">
                        {safeTrains.length === 0 ? 'NO LIVE TRAIN DATA' : 'No trains match current filter and search criteria'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {safeTrains.length === 0 
                          ? 'RailRadar live operational fleet data is currently unavailable or empty.' 
                          : 'Try selecting [ ALL ] or clearing your search query'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRadarTrains.map(({ train, interaction, targetRequest }) => {
                  const isSelected = selectedTrainId === (train.runId || train.trainNumber);
                  const delayInfo = formatDelay(train.delaySeconds, train.delayMinutes);

                  return (
                    <tr 
                      key={train.trainNumber}
                      onClick={() => selectTrain(train, false)}
                      className={`cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-cyan-50/90 ring-2 ring-cyan-500 font-medium' 
                          : 'hover:bg-railway-canvas/70'
                      }`}
                    >
                      {/* Train Number */}
                      <td className="py-3 pl-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-600 animate-ping' : 'bg-emerald-500'}`} />
                          <span className="font-bold text-railway-forest text-xs">{train.trainNumber}</span>
                        </div>
                      </td>

                      {/* Name */}
                      <td className="py-3 font-sans font-semibold text-slate-900 max-w-[160px] truncate">
                        {train.trainName || 'Express'}
                      </td>

                      {/* Location */}
                      <td className="py-3 text-slate-700">
                        {train.currentStationName || train.currentStation || `KM ${formatKm(train.currentKm)}`}
                      </td>

                      {/* Section / Next */}
                      <td className="py-3 text-slate-600">
                        {train.nextStationName || train.nextStation || '—'}
                      </td>

                      {/* Track */}
                      <td className="py-3 text-slate-600">
                        {train.platform ? `PF-${train.platform}` : 'Main'}
                      </td>

                      {/* Direction */}
                      <td className="py-3 text-slate-700 font-bold">
                        {train.direction || 'UP'}
                      </td>

                      {/* Speed */}
                      <td className="py-3 text-slate-900">
                        {train.speedKmph != null ? `${train.speedKmph} km/h` : '85 km/h'}
                      </td>

                      {/* Delay */}
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${delayInfo.colorClass}`}>
                          {delayInfo.text}
                        </span>
                      </td>

                      {/* Status + Freshness */}
                      <td className="py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] uppercase font-bold text-slate-600">
                            {train.status || 'RUNNING'}
                          </span>
                          {/* Bug 4 Fix: Show telemetry freshness badge */}
                          {(train as any).dataFreshness === 'EXPIRED' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300 w-fit">
                              STALE DATA
                            </span>
                          ) : (train as any).dataFreshness === 'STALE' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 w-fit">
                              STALE
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Maintenance Interaction */}
                      <td className="py-3">
                        {interaction.state === 'IN_AFFECTED_RANGE' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white flex items-center gap-1 w-fit animate-pulse">
                            <ShieldAlert className="w-3 h-3" />
                            <span>INSIDE WORK ZONE</span>
                          </span>
                        ) : interaction.state === 'APPROACHING' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            <span>APPROACHING</span>
                          </span>
                        ) : interaction.state === 'POTENTIAL_CONFLICT' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400 text-slate-950 flex items-center gap-1 w-fit border border-yellow-500">
                            <Clock className="w-3 h-3" />
                            <span>POTENTIAL CONFLICT</span>
                          </span>
                        ) : interaction.state === 'UNKNOWN' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 flex items-center gap-1 w-fit">
                            <HelpCircle className="w-3 h-3 text-slate-500" />
                            <span>UNKNOWN</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>NO INTERACTION</span>
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 text-right pr-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectTrain(train, true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-emerald-50 text-neutral-700 hover:text-emerald-800 border border-neutral-300 hover:border-emerald-300 text-[10px] font-bold transition shadow-xs"
                          title="Open full telemetry analysis"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Live Station Electronic Display Board & Timetable */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-railway-border shadow-soft space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-railway-border pb-5">
          <div>
            <h2 className="text-base font-bold text-railway-textPrimary font-sans">
              Station Electronic Display Board
            </h2>
            <p className="text-xs text-railway-textSecondary font-sans">
              Live station platform indicator synchronized with railway signalling feeds
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center p-1 bg-neutral-100 rounded-full border border-neutral-200 text-xs font-semibold">
              <button
                onClick={() => setStationTab('live-board')}
                className={`px-3 py-1.5 rounded-full transition ${
                  stationTab === 'live-board'
                    ? 'bg-emerald-700 text-white shadow-xs font-bold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                LIVE BOARD
              </button>
              <button
                onClick={() => setStationTab('timetable')}
                className={`px-3 py-1.5 rounded-full transition ${
                  stationTab === 'timetable'
                    ? 'bg-purple-700 text-white shadow-xs font-bold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                STATION TIMETABLE
              </button>
            </div>

            <div className="flex flex-wrap gap-1 bg-railway-canvas p-1 rounded-2xl border border-railway-border">
              {MAJOR_STATION_CHIPS.map((stn) => (
                <button
                  key={stn.code}
                  onClick={() => {
                    setSelectedStation(stn.code);
                    setBoardSearchQuery('');
                    setIsBoardSearchOpen(false);
                  }}
                  className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-xl transition-all ${
                    selectedStation === stn.code
                      ? 'bg-railway-forest text-white shadow-xs'
                      : 'text-railway-textSecondary hover:text-railway-textPrimary'
                  }`}
                  title={stn.name}
                >
                  {stn.code}
                </button>
              ))}
            </div>

            <div className="relative">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-railway-canvas rounded-full border border-railway-border text-xs">
                <Search className="w-3.5 h-3.5 text-railway-textSecondary" />
                <input
                  type="text"
                  placeholder="Search station / code..."
                  value={boardSearchQuery}
                  onChange={(e) => {
                    setBoardSearchQuery(e.target.value);
                    setIsBoardSearchOpen(true);
                  }}
                  onFocus={() => setIsBoardSearchOpen(true)}
                  className="bg-transparent text-railway-textPrimary placeholder:text-railway-textSecondary/60 focus:outline-none w-32 sm:w-44 font-mono text-xs"
                />
                {isSearchingBoardStation && (
                  <RefreshCw className="w-3 h-3 text-railway-forest animate-spin" />
                )}
              </div>

              {isBoardSearchOpen && boardSearchSuggestions.length > 0 && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-railway-border p-1.5 z-50">
                  <div className="text-[10px] font-mono text-railway-textSecondary px-2 py-1 font-semibold uppercase">
                    National Stations ({boardSearchSuggestions.length})
                  </div>
                  {boardSearchSuggestions.map((stn) => (
                    <button
                      key={stn.railway_ref}
                      onClick={() => {
                        setSelectedStation(stn.railway_ref);
                        setBoardSearchQuery('');
                        setIsBoardSearchOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-railway-canvas flex items-center justify-between text-xs transition"
                    >
                      <div>
                        <div className="font-bold text-railway-textPrimary">{stn.name}</div>
                        <div className="text-[10px] text-railway-textSecondary font-mono">{stn.zone} Zone</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-railway-forest/10 text-railway-forest font-mono font-bold text-xs">
                        {stn.railway_ref}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {stationTab === 'timetable' ? (
          <StationTimetableWidget stationCode={selectedStation} />
        ) : (
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[480px] text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-railway-border text-railway-textSecondary text-[11px] uppercase tracking-wider">
                  <th className="pb-3 pl-3 font-semibold">Train No / Name</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Dir</th>
                  <th className="pb-3 font-semibold">Sch. Time</th>
                  <th className="pb-3 font-semibold">Expected</th>
                  <th className="pb-3 font-semibold">PF</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-railway-border/60">
                {safeStationEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-railway-textSecondary font-sans">
                      No scheduled arrivals or departures for station {selectedStation} in this time window.
                    </td>
                  </tr>
                ) : (
                  safeStationEntries.map((e: StationBoardEntry, idx: number) => (
                    <tr key={`${e.trainNumber}-${idx}`} className="hover:bg-railway-canvas/60 transition-colors">
                      <td className="py-3.5 pl-3">
                        <div className="flex items-center gap-2 font-sans">
                          <span className="font-mono font-bold text-railway-forest">{e.trainNumber}</span>
                          <span className="font-medium text-railway-textPrimary">{e.trainName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-railway-textSecondary">{e.type}</td>
                      <td className="py-3.5 text-railway-textSecondary">{e.direction}</td>
                      <td className="py-3.5 text-railway-textSecondary">{e.scheduledTime}</td>
                      <td className="py-3.5 font-bold text-railway-textPrimary">{e.expectedTime}</td>
                      <td className="py-3.5 font-bold text-railway-forest">{e.platform ? `PF-${e.platform}` : '—'}</td>
                      <td className="py-3.5">
                        {(() => {
                          const delayInfo = formatDelay(null, e.delayMinutes);
                          return (
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${delayInfo.colorClass}`}>
                              {delayInfo.text}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Trains Between Stations Planning Utility */}
      <TrainsBetweenStationsWidget />

      {/* 6. System & Advisory Attribution Footer */}
      <div className="p-3.5 rounded-2xl bg-railway-canvas border border-railway-border text-xs text-railway-textSecondary flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-railway-forest flex-shrink-0" />
          <span className="font-bold text-railway-textPrimary">RAIL SAMNVAY ● UNIFIED LIVE OPERATIONS WORKSPACE</span>
          <span className="text-neutral-300">|</span>
          <span className="text-railway-textMuted font-sans">External telemetry from RailRadar synchronized for operational decision support.</span>
        </div>
        <div className="text-[11px] text-railway-textMuted">
          SIH PS 26027 · Automated Possession Planning & Dynamicheadway Safety
        </div>
      </div>

      {/* Compact Live Train Detail Panel */}
      <LiveTrainDetailPanel
        isOpen={isDetailPanelOpen}
        onClose={() => setIsDetailPanelOpen(false)}
        train={selectedTrainForPanel}
        source={source}
        routeGeometry={selectedTrainForPanel?.routeGeometry}
      />

      {/* RailRadar Request Governor & Pipeline Diagnostics Drawer */}
      <RailRadarDiagnosticsDrawer
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        selectedTrain={selectedTrainForPanel}
        isLiveMode={state.isLiveMode}
      />
    </div>
  );
};
