// Vertex-inspired Premium Hero Container for Rail Samnvay
import React, { useState } from 'react';
import { ArrowRight, Compass, Shield, Activity, Train, Zap, Layers, CheckCircle2 } from 'lucide-react';

interface VertexHeroProps {
  onCreateBlockClick: () => void;
  onExploreNetworkClick: () => void;
}

export const VertexHero: React.FC<VertexHeroProps> = ({
  onCreateBlockClick,
  onExploreNetworkClick
}) => {
  const [activeTab, setActiveTab] = useState<'realtime' | 'safety' | 'telemetry'>('realtime');

  return (
    <section className="pt-24 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Signature Vertex-style Large Rounded Container */}
      <div className="relative overflow-hidden rounded-[28px] md:rounded-[32px] bg-railway-forest text-white p-8 sm:p-12 lg:p-16 shadow-[0_20px_50px_rgba(20,52,43,0.25)] border border-railway-forestLight/40">
        
        {/* Subtle Background Railway Coordinate Grid */}
        <div 
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />

        {/* Ambient Gradient Glow */}
        <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-railway-signalGreen/15 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-railway-forestLight/30 rounded-full blur-3xl pointer-events-none" />

        {/* Hero Content Grid (Split Layout) */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Editorial Typography & Actions */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-8">
            
            {/* Status & Trust Area (Inspired by Vertex rating element) */}
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-medium text-white/90">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-railway-signalGreenLight opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-railway-signalGreenLight"></span>
              </span>
              <span className="font-semibold tracking-wide">Railway Operations Control</span>
              <span className="text-white/40">|</span>
              <span className="text-white/80 font-mono text-[11px]">Coordinated Maintenance Planning</span>
            </div>

            {/* Editorial Headline */}
            <div className="space-y-3">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.06] font-sans">
                Plan the work.<br />
                <span className="text-railway-signalGreenLight/90">Protect the network.</span>
              </h1>
              
              {/* Supporting Copy */}
              <p className="text-lg sm:text-xl text-white/85 max-w-xl font-normal leading-relaxed">
                Coordinate railway maintenance blocks, operating windows and train movement through one unified operational environment.
              </p>
            </div>

            {/* Primary & Secondary CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onCreateBlockClick}
                className="group inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-white text-railway-forest font-semibold text-base shadow-lg shadow-black/10 hover:bg-neutral-100 active:scale-[0.98] transition-all duration-200"
              >
                <span>Create Block Request</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 text-railway-forest" />
              </button>

              <button
                onClick={onExploreNetworkClick}
                className="group inline-flex items-center gap-2 px-6 py-4 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 text-white font-medium text-base active:scale-[0.98] transition-all duration-200"
              >
                <Compass className="w-4 h-4 text-railway-signalGreenLight" />
                <span>Explore Network</span>
              </button>
            </div>

            {/* Trust and Operational Metadata */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-white/70 font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-railway-signalGreenLight" />
                <span>Zero Timetable Conflicts</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-railway-signalGreenLight" />
                <span>Standard 15m Safety Buffer</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-0.5 rounded bg-railway-safetyAmber/20 border border-railway-safetyAmber/40 text-railway-safetyAmberLight font-bold">
                <span>SIMULATION DATA</span>
              </div>
            </div>

          </div>

          {/* Right Column: Refined Digital Railway Infrastructure Diagram */}
          <div className="lg:col-span-6 xl:col-span-5">
            <div className="relative rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/15 p-6 shadow-2xl overflow-hidden">
              
              {/* Graphic Header Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 text-xs font-mono">
                <div className="flex items-center gap-2 text-white/90 font-bold">
                  <Activity className="w-4 h-4 text-railway-signalGreenLight" />
                  <span>CORRIDOR C1 SCHEMATIC</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-railway-signalGreen/20 text-railway-signalGreenLight border border-railway-signalGreen/40 font-semibold text-[10px]">
                  DOUBLE LINE · 25kV OHE
                </span>
              </div>

              {/* Schematic SVG Visualization */}
              <div className="py-6">
                <svg viewBox="0 0 460 220" className="w-full h-auto drop-shadow-md">
                  <defs>
                    <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#27C77A" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#27C77A" stopOpacity="0.8" />
                    </linearGradient>
                    <pattern id="diagonalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="0" x2="0" y2="8" stroke="#F4B740" strokeWidth="2" strokeOpacity="0.6" />
                    </pattern>
                  </defs>

                  {/* Grid Lines */}
                  <line x1="20" y1="50" x2="440" y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                  <line x1="20" y1="110" x2="440" y2="110" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                  <line x1="20" y1="170" x2="440" y2="170" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />

                  {/* UP Line (Track 1) */}
                  <path 
                    d="M 20 80 L 120 80 Q 150 80 170 100 L 200 130 Q 220 150 250 150 L 440 150" 
                    fill="none" 
                    stroke="rgba(255,255,255,0.25)" 
                    strokeWidth="3" 
                  />
                  {/* DOWN Line (Track 2) */}
                  <path 
                    d="M 20 150 L 190 150 Q 220 150 240 130 L 270 100 Q 290 80 320 80 L 440 80" 
                    fill="none" 
                    stroke="rgba(255,255,255,0.25)" 
                    strokeWidth="3" 
                  />

                  {/* Active Main Corridor Path */}
                  <path 
                    d="M 20 115 L 440 115" 
                    fill="none" 
                    stroke="url(#trackGrad)" 
                    strokeWidth="4" 
                    strokeLinecap="round"
                  />

                  {/* Sleepers / Track geometry ticks */}
                  {Array.from({ length: 28 }).map((_, i) => (
                    <line 
                      key={i} 
                      x1={30 + i * 14.5} 
                      y1="109" 
                      x2={30 + i * 14.5} 
                      y2="121" 
                      stroke="rgba(255,255,255,0.4)" 
                      strokeWidth="1.5" 
                    />
                  ))}

                  {/* Maintenance Block Zone (SEC-04) */}
                  <rect 
                    x="200" 
                    y="98" 
                    width="110" 
                    height="34" 
                    rx="6" 
                    fill="url(#diagonalHatch)" 
                    stroke="#F4B740" 
                    strokeWidth="1.5" 
                    className="animate-pulse"
                  />
                  <rect 
                    x="215" 
                    y="105" 
                    width="80" 
                    height="20" 
                    rx="10" 
                    fill="#14342B" 
                    stroke="#F4B740" 
                    strokeWidth="1" 
                  />
                  <text 
                    x="255" 
                    y="119" 
                    textAnchor="middle" 
                    fill="#F4B740" 
                    fontSize="9" 
                    fontFamily="monospace" 
                    fontWeight="bold"
                  >
                    SEC-04 BLOCK
                  </text>

                  {/* Station Marker 1: Vijayawada (BZA) */}
                  <circle cx="50" cy="115" r="7" fill="#14342B" stroke="#FFFFFF" strokeWidth="2.5" />
                  <circle cx="50" cy="115" r="3" fill="#27C77A" />
                  <text x="50" y="142" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="600">BZA</text>
                  <text x="50" y="154" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="8" fontFamily="monospace">KM 0.0</text>

                  {/* Station Marker 2: Madhira (MDR) */}
                  <circle cx="160" cy="115" r="6" fill="#14342B" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="160" cy="115" r="2.5" fill="#FFFFFF" />
                  <text x="160" y="98" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="500">MDR</text>
                  <text x="160" y="88" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="8" fontFamily="monospace">SEC-02</text>

                  {/* Station Marker 3: Khammam (KMT) */}
                  <circle cx="340" cy="115" r="6" fill="#14342B" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="340" cy="115" r="2.5" fill="#FFFFFF" />
                  <text x="340" y="98" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="500">KMT</text>
                  <text x="340" y="88" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="8" fontFamily="monospace">SEC-06</text>

                  {/* Station Marker 4: Kazipet (KZJ) */}
                  <circle cx="410" cy="115" r="7" fill="#14342B" stroke="#FFFFFF" strokeWidth="2.5" />
                  <circle cx="410" cy="115" r="3" fill="#27C77A" />
                  <text x="410" y="142" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="600">KZJ</text>
                  <text x="410" y="154" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="8" fontFamily="monospace">KM 124</text>

                  {/* Live Train Indicator Node: Moving towards SEC-04 */}
                  <g transform="translate(105, 106)">
                    <rect x="0" y="0" width="30" height="18" rx="4" fill="#059669" stroke="#FFFFFF" strokeWidth="1.5" />
                    <text x="15" y="12" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontFamily="monospace" fontWeight="bold">12002</text>
                    {/* Headlight beam */}
                    <polygon points="30,4 45,1 45,17 30,14" fill="rgba(255,255,255,0.18)" />
                  </g>
                  <text x="120" y="142" textAnchor="middle" fill="#27C77A" fontSize="8" fontFamily="monospace">68 KM/H</text>

                  {/* Signal Indicators */}
                  <circle cx="90" cy="100" r="3" fill="#27C77A" />
                  <circle cx="190" cy="100" r="3" fill="#F4B740" />
                  <circle cx="320" cy="100" r="3" fill="#27C77A" />
                </svg>
              </div>

              {/* Bottom Telemetry Strip */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10 text-xs">
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] text-white/60 font-mono uppercase">Approaching Window</div>
                  <div className="font-semibold text-white mt-0.5">14:45 – 16:15 IST</div>
                  <div className="text-[10px] text-railway-signalGreenLight flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-railway-signalGreenLight" />
                    90 min guaranteed gap
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] text-white/60 font-mono uppercase">Next Movement</div>
                  <div className="font-semibold text-white mt-0.5">Exp 12002 @ 14:25</div>
                  <div className="text-[10px] text-white/75 font-mono mt-1">
                    ETA SEC-04 in 18 min
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
