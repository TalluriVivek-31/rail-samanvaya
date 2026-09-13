import React from 'react';
import { 
  CircleDot, 
  Layers, 
  ShieldCheck, 
  Clock, 
  GitMerge, 
  CheckCircle, 
  Train, 
  Hammer, 
  Radio, 
  Zap, 
  ArrowRight, 
  FileCheck, 
  Play, 
  History, 
  ArrowUp 
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* 1. OPERATIONS TICKER STRIP                                                 */
/* -------------------------------------------------------------------------- */
const OPERATIONS_ITEMS = [
  'P.Way',
  'S&T',
  'TRD',
  'Train Operations',
  'Maintenance Blocks',
  'Asset Availability',
  'Corridor Planning',
  'P.Way',
  'S&T',
  'TRD',
  'Train Operations',
  'Maintenance Blocks',
  'Asset Availability',
  'Corridor Planning',
];

export const OperationsStrip: React.FC = () => {
  return (
    <section className="py-6 border-y border-railway-border bg-white/60 backdrop-blur-xs overflow-hidden select-none">
      <div className="relative w-full overflow-hidden flex">
        <div className="flex animate-marquee whitespace-nowrap items-center space-x-12 sm:space-x-16 text-xs sm:text-sm font-semibold tracking-widest uppercase text-railway-textSecondary">
          {OPERATIONS_ITEMS.map((item, index) => (
            <div key={index} className="inline-flex items-center gap-4 sm:gap-6">
              <span className="hover:text-railway-forest transition-colors cursor-default">
                {item}
              </span>
              <CircleDot className="w-2.5 h-2.5 text-railway-signalGreen opacity-60" />
            </div>
          ))}
          {OPERATIONS_ITEMS.map((item, index) => (
            <div key={`dup-${index}`} className="inline-flex items-center gap-4 sm:gap-6">
              <span className="hover:text-railway-forest transition-colors cursor-default">
                {item}
              </span>
              <CircleDot className="w-2.5 h-2.5 text-railway-signalGreen opacity-60" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/* 2. EDITORIAL INTRODUCTION SECTION                                         */
/* -------------------------------------------------------------------------- */
export const IntroductionSection: React.FC = () => {
  const pillars = [
    {
      title: 'Requirements & Sections',
      desc: 'Links engineering work orders directly to track sectional geography and asset availability across all lines.',
      icon: Layers,
    },
    {
      title: 'Movement & Windows',
      desc: 'Correlates passenger timetables and freight paths to detect natural traffic gaps without inducing passenger delay.',
      icon: Clock,
    },
    {
      title: 'Conflicts & Execution',
      desc: 'Proactively identifies power, spatial, and headway overlaps, providing multi-department approval trails.',
      icon: GitMerge,
    },
  ];

  return (
    <section id="overview" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="space-y-16">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-railway-canvasMuted text-railway-forest text-xs font-mono font-semibold tracking-wider uppercase border border-railway-border">
            <span>Coordinated Infrastructure</span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-railway-textPrimary leading-[1.1] font-sans">
            One coordinated view of railway maintenance.
          </h2>

          <p className="text-lg sm:text-xl text-railway-textSecondary leading-relaxed font-normal">
            Rail Samanvaya seamlessly bridges the gap between on-ground engineering requisitions and central traffic control. By synchronizing track sections, train movements, working windows, safety buffers, approvals, and live execution into a single operational interface, Indian Railways divisions protect asset reliability without disrupting passenger timetables.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div 
                key={idx}
                className="group relative rounded-3xl bg-white p-8 border border-railway-border shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-railway-canvasMuted border border-railway-border flex items-center justify-center text-railway-forest mb-6 group-hover:bg-railway-forest group-hover:text-white transition-colors duration-200">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-railway-textPrimary tracking-tight mb-3">
                  {pillar.title}
                </h3>
                <p className="text-sm sm:text-base text-railway-textSecondary leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. DEPARTMENT ALIGNMENT SECTION                                           */
/* -------------------------------------------------------------------------- */
export const DepartmentSection: React.FC = () => {
  const departments = [
    {
      id: 'pway',
      code: 'CIVIL & INFRASTRUCTURE',
      title: 'Permanent Way',
      subtitle: 'P.Way Department',
      description: 'Track maintenance and engineering work. Coordinates rail renewal, automated tamping, ballast regulation, deep screening, and bridge maintenance.',
      icon: Hammer,
      workTypes: ['Mechanized Tamping', 'Rail Renewal (PQRS)', 'Turnout Replacement', 'Ballast Regulating'],
      circleBg: 'bg-emerald-50 text-railway-forest',
    },
    {
      id: 'sig',
      code: 'INTERLOCKING & TELEMETRY',
      title: 'Signal & Telecom',
      subtitle: 'S&T Department',
      description: 'Signal and communication maintenance. Governs electronic interlocking, point machines, digital axle counters, track circuits, and automatic block signalling.',
      icon: Radio,
      workTypes: ['Point Machine Overhaul', 'Track Circuit Calibration', 'Signal Head Replacement', 'Kavach Telemetry'],
      circleBg: 'bg-blue-50 text-blue-800',
    },
    {
      id: 'trd',
      code: 'TRACTION DISTRIBUTION',
      title: 'Traction / OHE',
      subtitle: 'TRD Department',
      description: 'Traction and overhead equipment work. Manages 25kV AC catenary maintenance, power block isolations, contact wire renewal, and cantilever adjustments.',
      icon: Zap,
      workTypes: ['Catenary Contact Renewal', 'Tower Wagon Inspection', 'Isolator Maintenance', 'Section Insulator Health'],
      circleBg: 'bg-amber-50 text-amber-800',
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-railway-canvasMuted text-railway-forest text-xs font-mono font-semibold tracking-wider uppercase border border-railway-border">
              <span>Departmental Alignment</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-railway-textPrimary font-sans">
              Specialized engineering.<br />Unified execution.
            </h2>
          </div>
          <p className="text-base text-railway-textSecondary max-w-md">
            Three distinct railway engineering departments operate on shared track geometry. Rail Samanvaya coordinates their requisitions into unified, conflict-free windows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {departments.map((dept) => {
            const Icon = dept.icon;
            return (
              <div
                key={dept.id}
                className="group relative rounded-3xl bg-white border border-railway-border p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_36px_rgba(20,52,43,0.08)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className={`w-14 h-14 rounded-full ${dept.circleBg} flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform duration-200`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono tracking-wider font-semibold text-railway-textMuted uppercase px-3 py-1 rounded-full bg-railway-canvasMuted border border-railway-border">
                      {dept.code}
                    </span>
                  </div>

                  <div className="space-y-1 mb-4">
                    <div className="text-xs font-mono text-railway-textMuted uppercase tracking-wider">
                      {dept.subtitle}
                    </div>
                    <h3 className="text-2xl font-bold text-railway-textPrimary tracking-tight">
                      {dept.title}
                    </h3>
                  </div>

                  <p className="text-sm sm:text-base text-railway-textSecondary leading-relaxed mb-6 font-normal">
                    {dept.description}
                  </p>
                </div>

                <div className="pt-6 border-t border-railway-border">
                  <div className="text-[11px] font-mono text-railway-textMuted uppercase tracking-wider mb-3">
                    Representative Works
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dept.workTypes.map((work, wIdx) => (
                      <span 
                        key={wIdx}
                        className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-lg bg-railway-canvas text-railway-textPrimary border border-railway-border/60"
                      >
                        {work}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/* 4. SOP WORKFLOW SECTION                                                    */
/* -------------------------------------------------------------------------- */
export const WorkflowSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      name: 'Request',
      role: 'P.Way / S&T / TRD',
      desc: 'Site engineers submit line block requisitions with location, work duration, and machinery constraints.',
      icon: Clock,
    },
    {
      num: '02',
      name: 'Review',
      role: 'Section Controller',
      desc: 'Cross-verifies headway margins, train speeds, and safety buffers against live divisional timetables.',
      icon: FileCheck,
    },
    {
      num: '03',
      name: 'Approval',
      role: 'Senior DOM',
      desc: 'Operating control grants digital endorsement and locks required corridor segments.',
      icon: CheckCircle,
    },
    {
      num: '04',
      name: 'Planning',
      role: 'Optimization Engine',
      desc: 'Correlates shadow blocks to combine catenary power and track renewal in identical time windows.',
      icon: Clock,
    },
    {
      num: '05',
      name: 'Execution',
      role: 'Station Master / Crew',
      desc: 'Burst monitoring, detonator placement, catenary de-energization, and timely track handover.',
      icon: Play,
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-railway-border">
      <div className="space-y-12">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-railway-canvasMuted text-railway-forest text-xs font-mono font-semibold tracking-wider uppercase border border-railway-border">
            <span>Standard Operating Procedure</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-railway-textPrimary font-sans">
            How a maintenance block moves from paper to track.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="group relative rounded-3xl bg-white border border-railway-border p-6 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-2xl font-mono font-extrabold text-railway-forest group-hover:text-railway-signalGreen transition-colors">
                      {step.num}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-railway-canvasMuted text-railway-forest flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-railway-textPrimary tracking-tight mb-1">
                    {step.name}
                  </h3>
                  <div className="text-[11px] font-mono font-semibold uppercase text-railway-textMuted tracking-wider mb-3">
                    {step.role}
                  </div>

                  <p className="text-xs text-railway-textSecondary leading-relaxed font-normal">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-4 mt-6 border-t border-railway-border/60 flex items-center justify-between text-[10px] font-mono text-railway-textMuted">
                  <span>PHASE {step.num}</span>
                  {idx < steps.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-railway-borderDark group-hover:translate-x-0.5 transition-transform" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/* 5. AUDIT & ACCOUNTABILITY SECTION                                         */
/* -------------------------------------------------------------------------- */
export const AuditSection: React.FC = () => {
  const auditEntries = [
    {
      time: '13:42 IST',
      officer: 'Planning Officer (Operating)',
      action: 'Approved Requisition BR-1025',
      section: 'Corridor C1 · SEC-04',
      badge: 'APPROVED',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    {
      time: '13:38 IST',
      officer: 'P.Way Site Engineer',
      action: 'Submitted Requisition BR-1027',
      section: 'Corridor C1 · SEC-02',
      badge: 'QUEUED',
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    {
      time: '13:31 IST',
      officer: 'Operations Officer (BZA Div)',
      action: 'Generated Weekly Corridor Plan',
      section: 'Divisional Network',
      badge: 'CP-SAT SOLVE',
      badgeColor: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    },
    {
      time: '12:50 IST',
      officer: 'TRD Supervisor',
      action: 'Released Emergency Power Block BR-1024',
      section: 'Corridor C1 · SEC-06',
      badge: 'RELEASED',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      time: '12:15 IST',
      officer: 'Section Controller',
      action: 'Verified 15m Safety Buffer Integrity',
      section: 'Corridor C1 · SEC-02',
      badge: 'VERIFIED',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-railway-canvasMuted text-railway-forest text-xs font-mono font-semibold tracking-wider uppercase border border-railway-border">
              <span>Immutable Accountability</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-railway-textPrimary font-sans">
              Every decision, stamped and traceable.
            </h2>
          </div>
          <p className="text-sm text-railway-textSecondary max-w-sm">
            Complete tamper-evident ledger tracking block authorizations, engineering handovers, and train protection memos.
          </p>
        </div>

        <div className="rounded-[28px] bg-white border border-railway-border p-6 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
          <div className="divide-y divide-railway-border">
            {auditEntries.map((entry, idx) => (
              <div 
                key={idx} 
                className="py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-railway-canvas/40 px-3 rounded-xl transition-colors"
              >
                <div className="flex items-start sm:items-center gap-4 sm:gap-6">
                  <span className="font-mono text-xs font-bold text-railway-forest flex-shrink-0 w-20">
                    {entry.time}
                  </span>
                  
                  <div>
                    <div className="text-sm font-bold text-railway-textPrimary tracking-tight">
                      {entry.officer}
                    </div>
                    <div className="text-xs text-railway-textSecondary font-mono mt-0.5">
                      {entry.action} · <span className="text-railway-textMuted">{entry.section}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${entry.badgeColor}`}>
                    {entry.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-railway-border flex items-center justify-between text-[11px] font-mono text-railway-textMuted">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-railway-signalGreen" />
              <span>DIGITAL SIGNATURES COMPLIANT WITH RAILWAY DISPATCH MANUAL</span>
            </div>
            <span>SIMULATION RECORD</span>
          </div>
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/* 6. VERTEX INSTITUTIONAL FOOTER                                            */
/* -------------------------------------------------------------------------- */
export const VertexFooter: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-white border-t border-railway-border py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-12 border-b border-railway-border">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-railway-forest text-white flex items-center justify-center shadow-xs">
                <Train className="w-5 h-5 text-railway-signalGreenLight" />
              </div>
              <span className="text-xl font-bold tracking-tight text-railway-textPrimary">
                Rail Samanvaya
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-railway-canvasMuted text-railway-forest border border-railway-border font-bold">
                SCR · BZA DIV
              </span>
            </div>
            <p className="text-sm text-railway-textSecondary max-w-sm">
              Integrated railway maintenance block planning, corridor window coordination, and train headway protection system.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-railway-textSecondary">
            <a href="#overview" className="hover:text-railway-forest transition">Overview</a>
            <a href="#network" className="hover:text-railway-forest transition">Network</a>
            <a href="#requests" className="hover:text-railway-forest transition">Requests</a>
            <a href="#planning" className="hover:text-railway-forest transition">Planning</a>
            <a href="#execution" className="hover:text-railway-forest transition">Execution</a>
            
            <button
              onClick={scrollToTop}
              className="w-10 h-10 rounded-full border border-railway-border hover:bg-railway-canvas text-railway-textPrimary flex items-center justify-center transition shadow-xs"
              title="Return to top"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono text-railway-textMuted">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-railway-safetyAmber/15 text-railway-safetyAmber border border-railway-safetyAmber/40 font-bold">
              SIMULATION DATA ONLY
            </span>
            <span>NOT CONNECTED TO LIVE INDIAN RAILWAYS TRAIN DISPATCH</span>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-railway-signalGreen" />
            <span>Built for Indian Railways SIH Operational Evaluation</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
