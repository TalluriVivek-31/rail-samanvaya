// Interactive Railway Network Corridor Visualization with Circular Controls
import React, { useState } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Crosshair, 
  Layers, 
  Maximize2, 
  Train, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  ArrowRight,
  Info
} from 'lucide-react';

interface RailwaySectionData {
  id: string;
  name: string;
  corridor: string;
  kmRange: string;
  stationNear: string;
  status: 'Available' | 'Active Block' | 'Caution Order';
  traffic: 'High' | 'Medium' | 'Low';
  nextTrain: string;
  nextTrainEta: string;
  suggestedWindow: string;
  windowDuration: string;
  oheStatus: string;
  speedLimit: string;
  conflicts: number;
}

const SECTIONS_DATA: Record<string, RailwaySectionData> = {
  'SEC-01': {
    id: 'SEC-01',
    name: 'Vijayawada North Yard',
    corridor: 'C1',
    kmRange: 'KM 0.0 – 14.5',
    stationNear: 'BZA',
    status: 'Caution Order',
    traffic: 'High',
    nextTrain: 'Exp 12711 Pinakini Express',
    nextTrainEta: '13:58 IST',
    suggestedWindow: '16:00 – 17:30',
    windowDuration: '90 min',
    oheStatus: '25kV AC Live (Section Isolator #1)',
    speedLimit: '50 km/h (Yard restriction)',
    conflicts: 0,
  },
  'SEC-02': {
    id: 'SEC-02',
    name: 'Kondapalli – Cheruvu Madhavaram',
    corridor: 'C1',
    kmRange: 'KM 14.5 – 32.0',
    stationNear: 'KI',
    status: 'Available',
    traffic: 'High',
    nextTrain: 'Freight BCN/E Coal Rake',
    nextTrainEta: '14:10 IST',
    suggestedWindow: '14:30 – 16:00',
    windowDuration: '90 min',
    oheStatus: '25kV AC Live',
    speedLimit: '110 km/h',
    conflicts: 0,
  },
  'SEC-03': {
    id: 'SEC-03',
    name: 'Errupalem Block Section',
    corridor: 'C1',
    kmRange: 'KM 32.0 – 49.5',
    stationNear: 'ERP',
    status: 'Available',
    traffic: 'Medium',
    nextTrain: 'Exp 12723 Telangana Exp',
    nextTrainEta: '14:40 IST',
    suggestedWindow: '15:15 – 17:15',
    windowDuration: '120 min',
    oheStatus: '25kV AC Live',
    speedLimit: '130 km/h',
    conflicts: 0,
  },
  'SEC-04': {
    id: 'SEC-04',
    name: 'Madhira Intermediate Section',
    corridor: 'C1',
    kmRange: 'KM 49.5 – 68.0',
    stationNear: 'MDR',
    status: 'Available',
    traffic: 'High',
    nextTrain: 'Train 12002 Shatabdi Express',
    nextTrainEta: '14:25 IST',
    suggestedWindow: '14:45 – 16:15',
    windowDuration: '90 min',
    oheStatus: 'Energized (Ready for scheduled isolation)',
    speedLimit: '110 km/h baseline',
    conflicts: 1,
  },
  'SEC-05': {
    id: 'SEC-05',
    name: 'Bonakalu Block Section',
    corridor: 'C1',
    kmRange: 'KM 68.0 – 86.5',
    stationNear: 'BKL',
    status: 'Available',
    traffic: 'Medium',
    nextTrain: 'Exp 12764 Padmavati Exp',
    nextTrainEta: '14:55 IST',
    suggestedWindow: '15:30 – 17:00',
    windowDuration: '90 min',
    oheStatus: '25kV AC Live',
    speedLimit: '110 km/h',
    conflicts: 0,
  },
  'SEC-06': {
    id: 'SEC-06',
    name: 'Khammam Junction West',
    corridor: 'C1',
    kmRange: 'KM 86.5 – 105.0',
    stationNear: 'KMT',
    status: 'Active Block',
    traffic: 'High',
    nextTrain: 'Exp 12615 Grand Trunk Express',
    nextTrainEta: '15:15 IST',
    suggestedWindow: '17:30 – 19:30',
    windowDuration: '120 min',
    oheStatus: 'Isolated (OHE Maintenance Block in progress)',
    speedLimit: '20 km/h (Work spot restriction)',
    conflicts: 0,
  },
  'SEC-07': {
    id: 'SEC-07',
    name: 'Dornakal Junction Junction',
    corridor: 'C1',
    kmRange: 'KM 105.0 – 123.5',
    stationNear: 'DKJ',
    status: 'Available',
    traffic: 'High',
    nextTrain: 'Freight Container Flat rake',
    nextTrainEta: '15:35 IST',
    suggestedWindow: '16:00 – 17:45',
    windowDuration: '105 min',
    oheStatus: '25kV AC Live',
    speedLimit: '110 km/h',
    conflicts: 0,
  },
  'SEC-08': {
    id: 'SEC-08',
    name: 'Mahbubabad North Segment',
    corridor: 'C1',
    kmRange: 'KM 123.5 – 142.0',
    stationNear: 'MABD',
    status: 'Available',
    traffic: 'Medium',
    nextTrain: 'Exp 12707 AP Sampark Kranti',
    nextTrainEta: '16:10 IST',
    suggestedWindow: '16:45 – 18:45',
    windowDuration: '120 min',
    oheStatus: '25kV AC Live',
    speedLimit: '130 km/h',
    conflicts: 0,
  },
};

export const RailwayNetworkSection: React.FC = () => {
  const [selectedCorridor, setSelectedCorridor] = useState<'C1' | 'C2' | 'C3'>('C1');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('SEC-04');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showLayers, setShowLayers] = useState<boolean>(true);

  const selectedData = SECTIONS_DATA[selectedSectionId] || SECTIONS_DATA['SEC-04'];

  const sectionKeys = ['SEC-01', 'SEC-02', 'SEC-03', 'SEC-04', 'SEC-05', 'SEC-06', 'SEC-07', 'SEC-08'];

  return (
    <section id="network" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="space-y-12">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-railway-canvasMuted text-railway-forest text-xs font-mono font-semibold tracking-wider uppercase border border-railway-border">
              <span>Sectional Topography</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-railway-textPrimary font-sans">
              See the railway before scheduling the work.
            </h2>
          </div>
          <p className="text-base text-railway-textSecondary max-w-md">
            Click any section along Corridor C1 to inspect immediate track status, train headway, OHE electrification status, and conflict-free maintenance windows.
          </p>
        </div>

        {/* Master Interactive Network Container */}
        <div className="rounded-[28px] bg-white border border-railway-border shadow-[0_12px_40px_rgba(0,0,0,0.04)] overflow-hidden">
          
          {/* Top Control Bar with Corridor Selector & Circular Action Buttons */}
          <div className="px-6 py-4 border-b border-railway-border flex flex-wrap items-center justify-between gap-4 bg-railway-canvas/50">
            {/* Corridor Tabs */}
            <div className="flex items-center space-x-2 bg-white p-1 rounded-full border border-railway-border shadow-xs">
              {(['C1', 'C2', 'C3'] as const).map((cId) => (
                <button
                  key={cId}
                  onClick={() => setSelectedCorridor(cId)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    selectedCorridor === cId
                      ? 'bg-railway-forest text-white shadow-xs'
                      : 'text-railway-textSecondary hover:text-railway-textPrimary hover:bg-railway-canvas'
                  }`}
                >
                  CORRIDOR {cId}
                  {cId === 'C1' && ' (BZA - KZJ)'}
                </button>
              ))}
            </div>

            {/* Circular Controls (Prompt Specification: zoom, center, expand, layers) */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 15, 145))}
                title="Zoom In"
                aria-label="Zoom in on railway corridor"
                className="w-10 h-10 rounded-full border border-railway-border bg-white hover:bg-railway-canvas text-railway-textSecondary hover:text-railway-textPrimary flex items-center justify-center transition shadow-xs active:scale-95"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 15, 85))}
                title="Zoom Out"
                aria-label="Zoom out of railway corridor"
                className="w-10 h-10 rounded-full border border-railway-border bg-white hover:bg-railway-canvas text-railway-textSecondary hover:text-railway-textPrimary flex items-center justify-center transition shadow-xs active:scale-95"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setSelectedSectionId('SEC-04');
                  setZoomLevel(100);
                }}
                title="Center on SEC-04"
                aria-label="Center camera on selected section"
                className="w-10 h-10 rounded-full border border-railway-border bg-white hover:bg-railway-canvas text-railway-textSecondary hover:text-railway-textPrimary flex items-center justify-center transition shadow-xs active:scale-95"
              >
                <Crosshair className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowLayers(!showLayers)}
                title="Toggle Layers"
                aria-label="Toggle network overlay layers"
                className={`w-10 h-10 rounded-full border border-railway-border flex items-center justify-center transition shadow-xs active:scale-95 ${
                  showLayers ? 'bg-railway-forest text-white' : 'bg-white text-railway-textSecondary'
                }`}
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Visualization Canvas & Detail Inspection Card Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12">
            
            {/* Left/Center: Interactive Track Diagram */}
            <div className="lg:col-span-8 p-6 sm:p-8 bg-railway-canvas/30 border-b lg:border-b-0 lg:border-r border-railway-border flex flex-col justify-between">
              
              {/* Interactive Corridor Track Bar */}
              <div className="space-y-6">
                <div className="flex items-center justify-between text-xs font-mono text-railway-textMuted">
                  <span className="font-bold text-railway-textPrimary">BZA DIVISION MAIN CORRIDOR C1</span>
                  <span>DOUBLE ELECTRIFIED TRACK · BROAD GAUGE</span>
                </div>

                {/* Horizontal Interactive Track Schematics */}
                <div 
                  className="relative py-8 overflow-x-auto transition-transform duration-300"
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'left center' }}
                >
                  {/* Track Rails Line */}
                  <div className="h-3 bg-neutral-300 rounded-full relative mx-4">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-neutral-400" />
                    
                    {/* Active highlight on selected section */}
                    <div className="absolute top-0 bottom-0 left-[37.5%] w-[12.5%] bg-railway-forest/30 border border-railway-forest rounded" />
                  </div>

                  {/* Clickable Section Nodes */}
                  <div className="grid grid-cols-8 gap-2 mt-4 px-2">
                    {sectionKeys.map((secKey) => {
                      const sec = SECTIONS_DATA[secKey];
                      const isSelected = selectedSectionId === secKey;
                      const isBlocked = sec.status === 'Active Block';
                      const isCaution = sec.status === 'Caution Order';

                      return (
                        <button
                          key={secKey}
                          onClick={() => setSelectedSectionId(secKey)}
                          className={`group flex flex-col items-center text-center p-2 rounded-xl transition-all ${
                            isSelected 
                              ? 'bg-railway-forest text-white shadow-md scale-105 ring-2 ring-railway-signalGreen' 
                              : 'bg-white hover:bg-neutral-100 text-railway-textPrimary border border-railway-border shadow-xs'
                          }`}
                        >
                          {/* Indicator Pip */}
                          <div className={`w-3 h-3 rounded-full mb-1.5 transition-transform group-hover:scale-125 ${
                            isBlocked ? 'bg-railway-operationalRed' :
                            isCaution ? 'bg-railway-safetyAmber' :
                            'bg-railway-signalGreen'
                          }`} />
                          
                          <span className={`text-xs font-bold font-mono ${isSelected ? 'text-white' : 'text-railway-textPrimary'}`}>
                            {secKey}
                          </span>
                          
                          <span className={`text-[10px] font-mono mt-0.5 truncate w-full ${isSelected ? 'text-white/80' : 'text-railway-textMuted'}`}>
                            {sec.stationNear}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Track Status Legend */}
                {showLayers && (
                  <div className="pt-4 border-t border-railway-border flex flex-wrap items-center gap-6 text-xs text-railway-textSecondary">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-railway-signalGreen" />
                      <span>Track Available (Clear)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-railway-safetyAmber" />
                      <span>Caution Order Imposed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-railway-operationalRed" />
                      <span>Active Block Occupied</span>
                    </div>
                  </div>
                )}
              </div>

              {/* In-view Operational Note */}
              <div className="mt-8 p-4 rounded-2xl bg-white border border-railway-border flex items-start gap-3 text-xs text-railway-textSecondary shadow-xs">
                <Info className="w-4 h-4 text-railway-forest flex-shrink-0 mt-0.5" />
                <p>
                  Automatic block signalling coordinates track circuits every 1.0 km. Suggested maintenance windows reflect verified gaps between scheduled passenger trains and freight paths.
                </p>
              </div>

            </div>

            {/* Right: Clean Information Card (SEC-04 · C1) */}
            <div className="lg:col-span-4 p-6 sm:p-8 bg-white flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                
                {/* Section Header & Status */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase text-railway-forest tracking-wider">
                      {selectedData.kmRange}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono tracking-wide ${
                      selectedData.status === 'Available' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      selectedData.status === 'Caution Order' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                      'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      {selectedData.status}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-railway-textPrimary tracking-tight mt-1">
                    {selectedData.id} · Corridor {selectedData.corridor}
                  </h3>
                  <p className="text-xs text-railway-textMuted font-mono mt-0.5">
                    {selectedData.name} ({selectedData.stationNear} Station)
                  </p>
                </div>

                {/* Key Operational Indicators (Prompt Specification: Status, Traffic, Next Train, Suggested Window) */}
                <div className="space-y-3 divide-y divide-railway-border text-sm">
                  
                  <div className="flex items-center justify-between pt-3">
                    <span className="text-railway-textMuted font-medium">Traffic Density</span>
                    <span className="font-bold text-railway-textPrimary font-mono">
                      {selectedData.traffic} (24 Trains/Day)
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <span className="text-railway-textMuted font-medium">Next Train</span>
                    <div className="text-right">
                      <div className="font-bold text-railway-textPrimary font-mono">
                        {selectedData.nextTrainEta}
                      </div>
                      <div className="text-[11px] text-railway-textMuted">
                        {selectedData.nextTrain}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-railway-textMuted font-medium">Suggested Window</span>
                      <span className="text-xs font-mono font-bold text-railway-signalGreen bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {selectedData.windowDuration} Free
                      </span>
                    </div>
                    <div className="font-bold text-lg text-railway-forest font-mono tracking-tight">
                      {selectedData.suggestedWindow} IST
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <span className="text-railway-textMuted font-medium">OHE Traction</span>
                    <span className="text-xs font-mono text-railway-textSecondary text-right max-w-[180px] truncate">
                      {selectedData.oheStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <span className="text-railway-textMuted font-medium">Speed Restriction</span>
                    <span className="font-mono text-xs text-railway-textPrimary">
                      {selectedData.speedLimit}
                    </span>
                  </div>

                </div>

              </div>

              {/* Action Button inside Card */}
              <div className="pt-4 border-t border-railway-border">
                <a
                  href="#requests"
                  className="w-full py-3 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition active:scale-98"
                >
                  <span>Request Block on {selectedData.id}</span>
                  <ArrowRight className="w-4 h-4 text-railway-signalGreenLight" />
                </a>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
