// Dynamic Railway Location & Maintenance Requisition Modal
// Indian Railways · South Central Railway (Vijayawada Division)
// 4-Step Maintenance Requisition Flow (Step 5 Expunged)
// Maintenance Requirement != Scheduled Block

import React, { useState, useEffect, useMemo } from 'react';
import { useSamnvayStore } from '../../store/useSamnvayStore';
import { Department, BlockPriority } from '../../types/samnvay';
import { 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft,
  FileText, 
  MapPin, 
  Train, 
  AlertTriangle, 
  Check, 
  Clock, 
  Zap, 
  Radio, 
  Layers, 
  Hammer, 
  Sparkles,
  Info,
  Search,
  Users,
  Wrench,
  Package,
  Calendar,
  ShieldAlert
} from 'lucide-react';
import { 
  WORK_TYPES_MASTER, 
  detectLocationInfrastructure,
  searchRailwayLocation 
} from '../../data/infrastructureMasterData';
import { 
  formatRailwayKm, 
  calculateAffectedLength 
} from '../../utils/railwayLocation';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({ isOpen, onClose }) => {
  const { state, createRequest } = useSamnvayStore();

  // Exactly 4 Steps: 1 (Work) -> 2 (Location) -> 3 (Resources) -> 4 (Operational & Schedule)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // STEP 1: WORK DEFINITION
  const [department, setDepartment] = useState<Department>('P.Way');
  const [selectedWorkTypeId, setSelectedWorkTypeId] = useState<string>('PW-01');
  const [workCategory, setWorkCategory] = useState('Track Tamping');
  const [maintenanceCategory, setMaintenanceCategory] = useState<'Preventive' | 'Corrective' | 'Emergency'>('Preventive');
  const [workDescription, setWorkDescription] = useState('Mechanized track tamping and cross-level stabilization.');
  const [assetIdInput, setAssetIdInput] = useState('TRK-BZA-04');
  const [assetNameInput, setAssetNameInput] = useState('Continuous Welded Rail (CWR)');
  const [defectDetails, setDefectDetails] = useState('Rail corrugation and uneven track settlement observed during OMC trolley inspection.');
  const [inspectionRef, setInspectionRef] = useState('TI/BZA/2026/09/W-12');
  const [additionalNotes, setAdditionalNotes] = useState('Priority track upkeep on UP Main prior to festive passenger specials.');

  // STEP 2: EXACT RAILWAY LOCATION
  const [startLocationInput, setStartLocationInput] = useState('12/400');
  const [endLocationInput, setEndLocationInput] = useState('13/100');
  const [selectedTracks, setSelectedTracks] = useState<string[]>(['UP Main']);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // STEP 3: RESOURCES & EXECUTION CAPACITY
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [priority, setPriority] = useState<BlockPriority>('HIGH');
  const [workforceCount, setWorkforceCount] = useState<number>(8);
  const [machinesInput, setMachinesInput] = useState('09-3X Dynamic Tamping Machine, Track Motor Trolley');
  const [materialsInput, setMaterialsInput] = useState('Ballast 40 cu.m, Elastic Rail Clips, Liner sets');
  const [dependenciesInput, setDependenciesInput] = useState('Requires TRD power isolation confirmation on UP Main before machine entry.');
  const [otherDepts, setOtherDepts] = useState<Department[]>(['TRD']);

  // STEP 4: OPERATIONAL REQUIREMENTS & PREFERRED SCHEDULE
  const [trafficBlockRequired, setTrafficBlockRequired] = useState(true);
  const [powerBlockRequired, setPowerBlockRequired] = useState(false);
  const [sntDisconnectionRequired, setSntDisconnectionRequired] = useState(false);
  const [speedRestrictionRequired, setSpeedRestrictionRequired] = useState(true);
  const [specialRestrictions, setSpecialRestrictions] = useState('Caution order 30 km/h for first 3 trains post work completion.');
  const [requestedDate, setRequestedDate] = useState('2026-09-12');
  const [preferredStartTime, setPreferredStartTime] = useState('04:30');
  const [preferredEndTime, setPreferredEndTime] = useState('06:30');
  const [flexibleTiming, setFlexibleTiming] = useState(true);
  const [earliestTime, setEarliestTime] = useState('02:00');
  const [latestTime, setLatestTime] = useState('06:30');

  // Submission Status
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  // Dynamic Work Types for current department
  const currentWorkTypes = useMemo(() => {
    return WORK_TYPES_MASTER[department] || WORK_TYPES_MASTER['P.Way'];
  }, [department]);

  // When department changes, select its first work type
  useEffect(() => {
    if (currentWorkTypes.length > 0) {
      const first = currentWorkTypes[0];
      setSelectedWorkTypeId(first.id);
      setWorkCategory(first.name);
      setDurationMinutes(first.defaultDurationMins);
      setTrafficBlockRequired(first.trafficBlockRequired);
      setPowerBlockRequired(first.powerBlockRequired);
      setSntDisconnectionRequired(first.sntDisconnectionRequired);
      setSpeedRestrictionRequired(first.speedRestrictionRequired);
      setPriority(first.defaultPriority);
      setWorkDescription(first.description);
    }
  }, [department, currentWorkTypes]);

  // Handle Work Type selection change
  const handleWorkTypeChange = (typeId: string) => {
    setSelectedWorkTypeId(typeId);
    const cfg = currentWorkTypes.find(w => w.id === typeId);
    if (cfg) {
      setWorkCategory(cfg.name);
      setDurationMinutes(cfg.defaultDurationMins);
      setTrafficBlockRequired(cfg.trafficBlockRequired);
      setPowerBlockRequired(cfg.powerBlockRequired);
      setSntDisconnectionRequired(cfg.sntDisconnectionRequired);
      setSpeedRestrictionRequired(cfg.speedRestrictionRequired);
      setPriority(cfg.defaultPriority);
      setWorkDescription(cfg.description);
    }
  };

  // Location search results
  const searchResults = useMemo(() => {
    return searchRailwayLocation(locationSearchQuery);
  }, [locationSearchQuery]);

  const handleSelectSearchResult = (result: any) => {
    setStartLocationInput(result.suggestedStartKm);
    setEndLocationInput(result.suggestedEndKm);
    setLocationSearchQuery(`${result.code} — ${result.title}`);
    setShowSearchResults(false);
  };

  // Dynamic Location Detection (Real-Time Computation from Infrastructure Master)
  const locationResult = useMemo(() => {
    return detectLocationInfrastructure(startLocationInput, endLocationInput);
  }, [startLocationInput, endLocationInput]);

  // Auto-update selected tracks when available tracks change
  useEffect(() => {
    if (locationResult.isValid && locationResult.availableTracks.length > 0) {
      const hasUp = locationResult.availableTracks.some(t => t.trackName === 'UP Main');
      if (hasUp) {
        setSelectedTracks(['UP Main']);
      } else {
        setSelectedTracks([locationResult.availableTracks[0].trackName]);
      }
    }
  }, [locationResult.isValid, locationResult.availableTracks]);

  // Auto-update end time when start time or duration changes
  useEffect(() => {
    if (preferredStartTime) {
      const [h, m] = preferredStartTime.split(':').map(Number);
      if (!isNaN(h)) {
        const startM = h * 60 + (m || 0);
        const endM = startM + durationMinutes;
        const eh = Math.floor(endM / 60) % 24;
        const em = endM % 60;
        setPreferredEndTime(`${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`);
      }
    }
  }, [preferredStartTime, durationMinutes]);

  if (!isOpen) return null;

  const toggleTrack = (trackName: string) => {
    if (selectedTracks.includes(trackName)) {
      if (selectedTracks.length > 1) {
        setSelectedTracks(selectedTracks.filter(t => t !== trackName));
      }
    } else {
      setSelectedTracks([...selectedTracks, trackName]);
    }
  };

  const toggleOtherDept = (dept: Department) => {
    if (otherDepts.includes(dept)) {
      setOtherDepts(otherDepts.filter(d => d !== dept));
    } else {
      setOtherDepts([...otherDepts, dept]);
    }
  };

  const handleApplyPreset = (preset: 'TEST_SCENARIO' | 'CROSS_SECTION' | 'LOOP') => {
    if (preset === 'TEST_SCENARIO') {
      setStartLocationInput('12/400');
      setEndLocationInput('13/100');
      setSelectedTracks(['UP Main']);
    } else if (preset === 'CROSS_SECTION') {
      setStartLocationInput('24/800');
      setEndLocationInput('26/200');
    } else if (preset === 'LOOP') {
      setStartLocationInput('11/000');
      setEndLocationInput('14/500');
      setSelectedTracks(['Loop Line']);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationResult.isValid) return;

    // Compute priority score
    const crit = priority === 'CRITICAL' ? 95 : priority === 'HIGH' ? 80 : priority === 'MEDIUM' ? 60 : 40;
    const score = Math.round(crit * 0.35 + 75 * 0.25 + 70 * 0.20 + 80 * 0.10 + 90 * 0.10);

    const primarySection = locationResult.detectedSections[0]?.sectionId || 'SEC-A';
    const sectionNames = locationResult.detectedSections.map(s => s.sectionId);

    const startKmFormatted = formatRailwayKm(locationResult.startKmDecimal);
    const endKmFormatted = formatRailwayKm(locationResult.endKmDecimal);

    const newId = createRequest({
      department,
      workCategory,
      workType: selectedWorkTypeId,
      maintenanceCategory,
      section: primarySection,
      startLocation: startKmFormatted,
      endLocation: endKmFormatted,
      startKm: locationResult.startKmDecimal,
      endKm: locationResult.endKmDecimal,
      affectedLengthMeters: locationResult.affectedLengthMeters,
      affectedTracks: selectedTracks,
      lineName: locationResult.detectedLines[0] || 'Main Line',
      work: `${workCategory} (${selectedTracks.join(', ')})`,
      date: requestedDate,
      preferredTime: preferredStartTime,
      preferredStartTime,
      preferredEndTime,
      flexibleTiming,
      earliestAcceptableTime: earliestTime,
      latestAcceptableTime: latestTime,
      duration: Number(durationMinutes),
      priority,
      risk: priority === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
      reason: workDescription,
      assetId: assetIdInput,
      assetName: assetNameInput,
      defectDetails,
      inspectionReference: inspectionRef,
      workforceCount,
      machines: machinesInput.split(',').map(m => m.trim()).filter(Boolean),
      materials: materialsInput.split(',').map(m => m.trim()).filter(Boolean),
      dependencies: dependenciesInput.split(',').map(d => d.trim()).filter(Boolean),
      otherDepartmentsInvolved: otherDepts,
      specialOperatingRestrictions: specialRestrictions,
      additionalNotes,
      safetyRequirements: [specialRestrictions, 'Red banner flags at 600m/1200m', '3 detonators'],
      resourcesRequired: [machinesInput, `${workforceCount} Personnel`],
      priorityScore: score,
      stationId: locationResult.primaryStation?.stationId,
      stationCode: locationResult.stationCode,
      stationName: locationResult.stationName,
      sectionCode: locationResult.sectionCode,
      sectionName: locationResult.sectionName,
      routeId: 'RT-01',
      routeCode: locationResult.routeCode,
      routeName: locationResult.routeName,
      betweenStations: locationResult.betweenStations?.display,
      isStationLimitIntersection: locationResult.isStationLimitIntersection,
      stationAffected: locationResult.isStationLimitIntersection,
      trafficBlockRequired,
      powerBlockRequired,
      sntDisconnectionRequired,
      speedRestrictionRequired,
      isCrossSection: locationResult.isCrossSection,
      crossSections: sectionNames,
      affectedAssets: locationResult.affectedAssets.all.map(a => `${a.assetId} (${a.name})`),
      priorityBreakdown: {
        criticality: crit,
        urgency: 75,
        risk: 70,
        trafficImpact: 80,
        resourceAvailability: 90,
        score,
        explanation: 'Dynamic railway location verified with zero conflicts under G&SR operating guidelines.',
      },
    });

    setSubmittedId(newId);
  };

  const handleResetAndClose = () => {
    setSubmittedId(null);
    setCurrentStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-railway-border rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden relative max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Top Header with Institutional Identity & 4-Step Counter */}
        <div className="px-6 py-4 border-b border-railway-border flex items-center justify-between bg-railway-canvas/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-railway-forest text-white flex items-center justify-center font-bold shadow-xs">
              <FileText className="w-5 h-5 text-railway-signalGreenLight" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-railway-textPrimary tracking-tight">
                  Submit Maintenance Requisition
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-railway-forest/10 text-railway-forest uppercase">
                  BZA-CORRIDOR
                </span>
              </div>
              <p className="text-[11px] font-mono text-railway-textMuted uppercase">
                SOUTH CENTRAL RAILWAY · WORK REQUISITION PIPELINE
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* 4 Step Indicators */}
            {!submittedId && (
              <div className="hidden sm:flex items-center space-x-1.5 text-xs font-mono">
                {[1, 2, 3, 4].map((stepNum) => (
                  <div
                    key={stepNum}
                    onClick={() => {
                      if (stepNum < currentStep || (stepNum === 2 && locationResult.isValid)) {
                        setCurrentStep(stepNum as any);
                      }
                    }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition cursor-pointer ${
                      currentStep === stepNum
                        ? 'bg-railway-forest text-white shadow-xs'
                        : currentStep > stepNum
                        ? 'bg-emerald-100 text-railway-forest border border-emerald-300'
                        : 'bg-neutral-100 text-neutral-400'
                    }`}
                    title={`Step ${stepNum}`}
                  >
                    {currentStep > stepNum ? '✓' : stepNum}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleResetAndClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-neutral-100 border border-railway-border flex items-center justify-center text-railway-textSecondary hover:text-railway-textPrimary transition"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
          {submittedId ? (
            /* Post-Submission Success Card */
            <div className="py-8 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-railway-signalGreen mx-auto flex items-center justify-center border border-emerald-200 shadow-xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1.5">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200 uppercase">
                  STATUS: SUBMITTED (AWAITING REVIEW & PLANNING) · {submittedId}
                </span>
                <h4 className="text-2xl font-bold text-railway-textPrimary mt-2">
                  Maintenance Requisition Registered
                </h4>
                <p className="text-xs text-railway-textSecondary max-w-md mx-auto leading-relaxed">
                  Maintenance requirement on <span className="font-semibold text-railway-textPrimary">{formatRailwayKm(locationResult.startKmDecimal)} – {formatRailwayKm(locationResult.endKmDecimal)} ({locationResult.affectedLengthMeters}m)</span> has been logged. It will undergo departmental verification and operating concurrence before corridor scheduling.
                </p>
              </div>

              {/* Summary Details Box */}
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-railway-canvas border border-railway-border text-left text-xs font-mono space-y-2">
                <div className="flex justify-between">
                  <span className="text-railway-textMuted">STATION / SECTION:</span>
                  <span className="font-bold text-railway-textPrimary">
                    {locationResult.stationCode || 'BZA'} · {locationResult.detectedSections.map(s => s.sectionId).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-railway-textMuted">AFFECTED TRACK(S):</span>
                  <span className="font-bold text-railway-textPrimary">{selectedTracks.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-railway-textMuted">ESTIMATED DURATION:</span>
                  <span className="font-bold text-railway-forest">{durationMinutes} Minutes ({workforceCount} Personnel)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-railway-textMuted">REQUESTED PREFERENCE:</span>
                  <span className="font-bold text-neutral-800">{preferredStartTime} – {preferredEndTime} IST (Planning Preference)</span>
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={handleResetAndClose}
                  className="px-8 py-3 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white text-xs font-semibold shadow-xs transition"
                >
                  Close & View Approval Queue
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* ========================================================================= */}
              {/* STEP 1: Work Definition (Department, Category, Asset, Defect)             */}
              {/* ========================================================================= */}
              {currentStep === 1 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="border-b border-railway-border pb-3">
                    <span className="text-[10px] font-mono font-bold uppercase text-railway-forest bg-railway-forest/10 px-2.5 py-0.5 rounded-full">
                      STEP 1 OF 4 · WORK DEFINITION
                    </span>
                    <h4 className="text-lg font-bold text-railway-textPrimary mt-1.5">
                      Work Details & Defect Specification
                    </h4>
                    <p className="text-xs text-railway-textSecondary mt-0.5">
                      Specify the department, maintenance nature, affected asset, and defect justification for the required work.
                    </p>
                  </div>

                  {/* Department Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-railway-textSecondary font-mono uppercase">
                      Department
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['P.Way', 'S&T', 'TRD'] as Department[]).map((dept) => (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => setDepartment(dept)}
                          className={`p-3.5 rounded-2xl border text-left transition flex items-center space-x-3 cursor-pointer ${
                            department === dept
                              ? 'bg-railway-forest text-white border-railway-forest shadow-xs'
                              : 'bg-white border-railway-border hover:bg-railway-canvas text-railway-textPrimary'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                            department === dept ? 'bg-white/20 text-white' : 'bg-railway-canvas text-railway-forest'
                          }`}>
                            {dept === 'P.Way' ? <Hammer className="w-4 h-4" /> : dept === 'S&T' ? <Radio className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold font-sans">
                              {dept === 'P.Way' ? 'Engineering / P.Way' : dept === 'S&T' ? 'Signal & Telecom' : 'Traction / TRD'}
                            </div>
                            <div className={`text-[10px] font-mono ${department === dept ? 'text-white/80' : 'text-railway-textMuted'}`}>
                              {dept === 'P.Way' ? 'Track & Ballast' : dept === 'S&T' ? 'Interlocking & Points' : '25kV OHE Catenary'}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Maintenance Category: Preventive / Corrective / Emergency */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-railway-textSecondary font-mono uppercase">
                      Maintenance Category
                    </label>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      {(['Preventive', 'Corrective', 'Emergency'] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setMaintenanceCategory(cat)}
                          className={`py-2.5 px-3 rounded-2xl border font-mono font-semibold transition text-center ${
                            maintenanceCategory === cat
                              ? cat === 'Emergency' 
                                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                                : 'bg-railway-forest text-white border-railway-forest shadow-xs'
                              : 'bg-white border-railway-border hover:bg-neutral-50 text-railway-textPrimary'
                          }`}
                        >
                          {cat} Maintenance
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Standard Work Types Grid */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-railway-textSecondary font-mono uppercase">
                      Standard Work Type for {department}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-52 overflow-y-auto pr-1">
                      {currentWorkTypes.map((work) => {
                        const isSelected = selectedWorkTypeId === work.id;
                        return (
                          <div
                            key={work.id}
                            onClick={() => handleWorkTypeChange(work.id)}
                            className={`p-3 rounded-2xl border cursor-pointer transition flex items-start space-x-3 ${
                              isSelected
                                ? 'bg-emerald-50/60 border-railway-forest text-railway-textPrimary shadow-xs ring-1 ring-railway-forest'
                                : 'bg-white border-railway-border hover:bg-neutral-50 text-neutral-600'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs mt-0.5 ${
                              isSelected ? 'bg-railway-forest text-white' : 'border border-neutral-300'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-railway-textPrimary">{work.name}</span>
                                <span className="text-[10px] font-mono text-railway-textMuted">{work.defaultDurationMins}m</span>
                              </div>
                              <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">{work.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Asset Specification & Defect Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
                        Asset ID & Asset Name
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={assetIdInput}
                          onChange={(e) => setAssetIdInput(e.target.value)}
                          placeholder="e.g. TRK-04"
                          className="col-span-1 px-3 py-2 rounded-xl bg-railway-canvas border border-railway-border font-mono text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                        />
                        <input
                          type="text"
                          value={assetNameInput}
                          onChange={(e) => setAssetNameInput(e.target.value)}
                          placeholder="e.g. Continuous Welded Rail"
                          className="col-span-2 px-3 py-2 rounded-xl bg-railway-canvas border border-railway-border text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
                        Inspection Reference
                      </label>
                      <input
                        type="text"
                        value={inspectionRef}
                        onChange={(e) => setInspectionRef(e.target.value)}
                        placeholder="e.g. TI/BZA/2026/09/W-12"
                        className="w-full px-3 py-2 rounded-xl bg-railway-canvas border border-railway-border font-mono text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                      />
                    </div>
                  </div>

                  {/* Defect Details & Operational Justification */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
                      Defect Details & Reason for Work
                    </label>
                    <textarea
                      value={defectDetails}
                      onChange={(e) => setDefectDetails(e.target.value)}
                      rows={2}
                      className="w-full px-3.5 py-2 rounded-2xl bg-railway-canvas border border-railway-border text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                    />
                  </div>

                  {/* Navigation Actions */}
                  <div className="pt-4 border-t border-railway-border flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white text-xs font-semibold transition"
                    >
                      <span>Proceed to Location Input</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* STEP 2: Exact Railway Location & Infrastructure Discovery                  */}
              {/* ========================================================================= */}
              {currentStep === 2 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="border-b border-railway-border pb-3">
                    <span className="text-[10px] font-mono font-bold uppercase text-railway-forest bg-railway-forest/10 px-2.5 py-0.5 rounded-full">
                      STEP 2 OF 4 · EXACT RAILWAY LOCATION
                    </span>
                    <h4 className="text-lg font-bold text-railway-textPrimary mt-1.5">
                      Identify Location, Station & Track Infrastructure
                    </h4>
                    <p className="text-xs text-railway-textSecondary mt-0.5">
                      Enter Start KM and End KM. System auto-resolves Station, Section, Line, and physical assets from the Infrastructure Master.
                    </p>
                  </div>

                  {/* Railway Location / Section Code Search Combobox */}
                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-semibold text-railway-textSecondary font-mono uppercase flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-railway-forest" />
                        <span>Railway Location / Section Code Search</span>
                      </span>
                      <span className="text-[10px] text-railway-textMuted">Search Station, Section, Route, KM or Asset</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={locationSearchQuery}
                        onChange={(e) => {
                          setLocationSearchQuery(e.target.value);
                          setShowSearchResults(true);
                        }}
                        onFocus={() => setShowSearchResults(true)}
                        placeholder="e.g. MAG, STNB, SEC-A, ROUTE-01, 12/400, T-124..."
                        className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-railway-canvas border border-railway-border font-mono text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20 focus:border-railway-forest"
                      />
                      {locationSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setLocationSearchQuery('');
                            setShowSearchResults(false);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Search Results Dropdown */}
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-railway-border rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-neutral-100 animate-in fade-in zoom-in-95 duration-100">
                        {searchResults.map((res, i) => (
                          <div
                            key={i}
                            onClick={() => handleSelectSearchResult(res)}
                            className="p-3 hover:bg-emerald-50/60 cursor-pointer flex items-center justify-between transition"
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  res.type === 'STATION' ? 'bg-blue-100 text-blue-800' :
                                  res.type === 'SECTION' ? 'bg-emerald-100 text-emerald-800' :
                                  res.type === 'ROUTE' ? 'bg-purple-100 text-purple-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>
                                  {res.type}
                                </span>
                                <span className="text-xs font-bold text-railway-textPrimary">{res.title}</span>
                              </div>
                              <p className="text-[11px] text-neutral-500 mt-0.5 font-mono">{res.subtitle}</p>
                            </div>
                            <span className="text-[10px] font-mono font-semibold px-2 py-1 rounded-full bg-railway-canvas text-railway-forest border border-railway-border">
                              Use Location →
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Start & End KM Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-railway-textSecondary font-mono uppercase flex items-center justify-between">
                        <span>Start Location (KM)</span>
                        <span className="text-[10px] text-railway-textMuted font-normal">e.g. 12/400 or 12.400</span>
                      </label>
                      <input
                        type="text"
                        value={startLocationInput}
                        onChange={(e) => setStartLocationInput(e.target.value)}
                        placeholder="12/400"
                        className={`w-full px-3.5 py-2.5 rounded-2xl bg-railway-canvas border font-mono text-xs text-railway-textPrimary focus:outline-none focus:ring-2 ${
                          locationResult.isValid ? 'border-railway-border focus:ring-railway-forest/20' : 'border-red-400 bg-red-50/20'
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-railway-textSecondary font-mono uppercase flex items-center justify-between">
                        <span>End Location (KM)</span>
                        <span className="text-[10px] text-railway-textMuted font-normal">e.g. 13/100 or 13.100</span>
                      </label>
                      <input
                        type="text"
                        value={endLocationInput}
                        onChange={(e) => setEndLocationInput(e.target.value)}
                        placeholder="13/100"
                        className={`w-full px-3.5 py-2.5 rounded-2xl bg-railway-canvas border font-mono text-xs text-railway-textPrimary focus:outline-none focus:ring-2 ${
                          locationResult.isValid ? 'border-railway-border focus:ring-railway-forest/20' : 'border-red-400 bg-red-50/20'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Auto-Resolved Railway Hierarchy Card */}
                  {locationResult.isValid && (
                    <div className="p-4 rounded-2xl bg-railway-canvas border border-railway-border space-y-3 text-xs font-mono">
                      <div className="flex items-center justify-between border-b border-railway-border/60 pb-2">
                        <span className="text-railway-textMuted uppercase">RESOLVED RAILWAY HIERARCHY:</span>
                        <span className="font-bold text-railway-forest bg-white px-2.5 py-0.5 rounded-full border border-railway-border">
                          {locationResult.stationCode || 'BZA'} · {locationResult.stationName || 'Vijayawada'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div>
                          <span className="text-neutral-400 uppercase text-[9px] block">Section</span>
                          <span className="font-bold text-railway-textPrimary">{locationResult.detectedSections[0]?.sectionId}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 uppercase text-[9px] block">Route</span>
                          <span className="font-bold text-railway-textPrimary">{locationResult.routeCode}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 uppercase text-[9px] block">Span Length</span>
                          <span className="font-bold text-emerald-700">{locationResult.affectedLengthMeters}m ({locationResult.affectedLengthKm} km)</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 uppercase text-[9px] block">Station Limits</span>
                          <span className="font-bold text-railway-textPrimary">{locationResult.isStationLimitIntersection ? 'Inside Station Yard' : 'Block Section'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Track Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-railway-textSecondary font-mono uppercase">
                      Select Affected Track(s)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {locationResult.availableTracks.map((trk) => {
                        const isChecked = selectedTracks.includes(trk.trackName);
                        return (
                          <div
                            key={trk.trackId}
                            onClick={() => toggleTrack(trk.trackName)}
                            className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                              isChecked
                                ? 'bg-railway-forest text-white border-railway-forest shadow-xs'
                                : 'bg-white border-railway-border hover:bg-neutral-50 text-railway-textPrimary'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold font-mono">{trk.trackName}</div>
                              <div className={`text-[10px] ${isChecked ? 'text-white/80' : 'text-neutral-500'}`}>
                                {trk.electrified ? '25kV Electrified' : 'Non-Electrified'}
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded flex items-center justify-center text-xs ${
                              isChecked ? 'bg-white text-railway-forest font-bold' : 'border border-neutral-300'
                            }`}>
                              {isChecked && '✓'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Navigation Actions */}
                  <div className="pt-4 border-t border-railway-border flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-railway-border text-xs text-railway-textSecondary hover:text-railway-textPrimary transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Work Definition</span>
                    </button>

                    <button
                      type="button"
                      disabled={!locationResult.isValid}
                      onClick={() => setCurrentStep(3)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white text-xs font-semibold transition disabled:opacity-50"
                    >
                      <span>Proceed to Resources</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* STEP 3: Resources & Execution Capacity (Workforce, Machines, Dependencies)  */}
              {/* ========================================================================= */}
              {currentStep === 3 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="border-b border-railway-border pb-3">
                    <span className="text-[10px] font-mono font-bold uppercase text-railway-forest bg-railway-forest/10 px-2.5 py-0.5 rounded-full">
                      STEP 3 OF 4 · RESOURCES & EXECUTION CAPACITY
                    </span>
                    <h4 className="text-lg font-bold text-railway-textPrimary mt-1.5">
                      Resource Mobilization & Departmental Dependencies
                    </h4>
                    <p className="text-xs text-railway-textSecondary mt-0.5">
                      Declare duration, gang workforce count, heavy on-track machines, materials, and dependencies for CPM planning.
                    </p>
                  </div>

                  {/* Duration & Priority */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
                        Estimated Work Duration
                      </label>
                      <select
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-railway-canvas border border-railway-border font-medium text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                      >
                        <option value={45}>45 Minutes (Minor Inspection)</option>
                        <option value={60}>60 Minutes (1 Hour)</option>
                        <option value={90}>90 Minutes (1.5 Hours)</option>
                        <option value={120}>120 Minutes (2 Hours - Standard)</option>
                        <option value={180}>180 Minutes (3 Hours - Heavy)</option>
                        <option value={240}>240 Minutes (4 Hours - Major Corridor)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
                        Priority Level
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as BlockPriority)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-railway-canvas border border-railway-border font-medium text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                      >
                        <option value="CRITICAL">Critical (Safety Hazard - within 6h)</option>
                        <option value="HIGH">High (Urgent Maintenance - within 24h)</option>
                        <option value="MEDIUM">Medium (Scheduled Cycle)</option>
                        <option value="LOW">Low (Routine Inspection)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
                        Workforce Count (Gang Personnel)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={workforceCount}
                        onChange={(e) => setWorkforceCount(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-railway-canvas border border-railway-border font-mono text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                      />
                    </div>
                  </div>

                  {/* Machines & Materials Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px] flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-railway-forest" />
                        <span>Machines & Track Plant</span>
                      </label>
                      <input
                        type="text"
                        value={machinesInput}
                        onChange={(e) => setMachinesInput(e.target.value)}
                        placeholder="e.g. 09-3X Tamping Machine, BCM, Tower Wagon"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-railway-canvas border border-railway-border text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px] flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-railway-forest" />
                        <span>Materials & Consumables</span>
                      </label>
                      <input
                        type="text"
                        value={materialsInput}
                        onChange={(e) => setMaterialsInput(e.target.value)}
                        placeholder="e.g. Ballast 40 cu.m, Fasteners, Contact wire"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-railway-canvas border border-railway-border text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                      />
                    </div>
                  </div>

                  {/* Mandatory Dependencies & Other Departments Involved */}
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
                        Prerequisite Dependencies & Constraints
                      </label>
                      <input
                        type="text"
                        value={dependenciesInput}
                        onChange={(e) => setDependenciesInput(e.target.value)}
                        placeholder="e.g. Power isolation required before machine deployment; S&T track circuit disconnection"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-railway-canvas border border-railway-border text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
                        Other Departments Potentially Involved for Shadow Bundling
                      </label>
                      <div className="flex items-center space-x-3">
                        {(['P.Way', 'S&T', 'TRD'] as Department[]).map((d) => (
                          <label key={d} className="flex items-center space-x-2 text-xs font-mono cursor-pointer">
                            <input
                              type="checkbox"
                              checked={otherDepts.includes(d)}
                              onChange={() => toggleOtherDept(d)}
                              className="rounded text-railway-forest accent-railway-forest"
                            />
                            <span className="font-bold text-railway-textPrimary">{d}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Navigation Actions */}
                  <div className="pt-4 border-t border-railway-border flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-railway-border text-xs text-railway-textSecondary hover:text-railway-textPrimary transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Location</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white text-xs font-semibold transition"
                    >
                      <span>Proceed to Schedule & Submit</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* STEP 4: Operational Requirements & Preferred Schedule                      */}
              {/* ========================================================================= */}
              {currentStep === 4 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="border-b border-railway-border pb-3">
                    <span className="text-[10px] font-mono font-bold uppercase text-railway-forest bg-railway-forest/10 px-2.5 py-0.5 rounded-full">
                      STEP 4 OF 4 · OPERATIONAL REQUIREMENTS & PREFERRED SCHEDULE
                    </span>
                    <h4 className="text-lg font-bold text-railway-textPrimary mt-1.5">
                      Operating Conditions & Planning Time Preferences
                    </h4>
                    <p className="text-xs text-railway-textSecondary mt-0.5">
                      Declare requested operating isolations. Enter your desired preferred window for planning consideration.
                    </p>
                  </div>

                  {/* 4 Block Requirements Checkboxes */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-railway-textSecondary font-mono uppercase">
                      Requested Operational Possessions (Evaluated during Approval)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <label className={`p-3 rounded-2xl border cursor-pointer transition flex items-center space-x-2.5 ${
                        trafficBlockRequired ? 'bg-emerald-50/70 border-railway-forest text-railway-textPrimary' : 'bg-white border-railway-border text-neutral-500'
                      }`}>
                        <input
                          type="checkbox"
                          checked={trafficBlockRequired}
                          onChange={(e) => setTrafficBlockRequired(e.target.checked)}
                          className="rounded text-railway-forest focus:ring-0 w-4 h-4 accent-railway-forest"
                        />
                        <span className="font-semibold">Traffic Block</span>
                      </label>

                      <label className={`p-3 rounded-2xl border cursor-pointer transition flex items-center space-x-2.5 ${
                        powerBlockRequired ? 'bg-amber-50/70 border-amber-600 text-amber-900' : 'bg-white border-railway-border text-neutral-500'
                      }`}>
                        <input
                          type="checkbox"
                          checked={powerBlockRequired}
                          onChange={(e) => setPowerBlockRequired(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-0 w-4 h-4 accent-amber-600"
                        />
                        <span className="font-semibold">Power Block (25kV)</span>
                      </label>

                      <label className={`p-3 rounded-2xl border cursor-pointer transition flex items-center space-x-2.5 ${
                        sntDisconnectionRequired ? 'bg-blue-50/70 border-blue-600 text-blue-900' : 'bg-white border-railway-border text-neutral-500'
                      }`}>
                        <input
                          type="checkbox"
                          checked={sntDisconnectionRequired}
                          onChange={(e) => setSntDisconnectionRequired(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-0 w-4 h-4 accent-blue-600"
                        />
                        <span className="font-semibold">S&T Disconnection</span>
                      </label>

                      <label className={`p-3 rounded-2xl border cursor-pointer transition flex items-center space-x-2.5 ${
                        speedRestrictionRequired ? 'bg-amber-50/70 border-amber-600 text-amber-900' : 'bg-white border-railway-border text-neutral-500'
                      }`}>
                        <input
                          type="checkbox"
                          checked={speedRestrictionRequired}
                          onChange={(e) => setSpeedRestrictionRequired(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-0 w-4 h-4 accent-amber-600"
                        />
                        <span className="font-semibold">Speed Restriction</span>
                      </label>
                    </div>
                  </div>

                  {/* Special Operating Restrictions */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
                      Special Operating Restrictions & Caution Order
                    </label>
                    <input
                      type="text"
                      value={specialRestrictions}
                      onChange={(e) => setSpecialRestrictions(e.target.value)}
                      placeholder="e.g. Caution order 30 km/h for first 3 trains post work completion"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-railway-canvas border border-railway-border text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                    />
                  </div>

                  {/* Preferred Schedule Section */}
                  <div className="p-4 rounded-3xl bg-railway-canvas border border-railway-border space-y-4">
                    <div className="flex items-center justify-between border-b border-railway-border/60 pb-2">
                      <span className="text-xs font-bold font-mono text-railway-textPrimary uppercase flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-railway-forest" />
                        <span>PREFERRED / REQUESTED TIME (PLANNING PREFERENCE ONLY)</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                        Not a Scheduled Possession
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="space-y-1.5">
                        <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
                          Requested Date
                        </label>
                        <input
                          type="date"
                          value={requestedDate}
                          onChange={(e) => setRequestedDate(e.target.value)}
                          required
                          className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-railway-border font-mono text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
                          Preferred Start Time
                        </label>
                        <input
                          type="time"
                          value={preferredStartTime}
                          onChange={(e) => setPreferredStartTime(e.target.value)}
                          required
                          className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-railway-border font-mono text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
                          Preferred End Time
                        </label>
                        <input
                          type="time"
                          value={preferredEndTime}
                          onChange={(e) => setPreferredEndTime(e.target.value)}
                          required
                          className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-railway-border font-mono text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                        />
                      </div>
                    </div>

                    {/* Flexible Timing Bounds */}
                    <div className="pt-2 border-t border-railway-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <label className="flex items-center space-x-2 font-mono cursor-pointer">
                        <input
                          type="checkbox"
                          checked={flexibleTiming}
                          onChange={(e) => setFlexibleTiming(e.target.checked)}
                          className="rounded text-railway-forest accent-railway-forest"
                        />
                        <span className="font-semibold text-railway-textPrimary">Flexible Timing (Optimizer may adjust slot)</span>
                      </label>

                      {flexibleTiming && (
                        <div className="flex items-center space-x-2 font-mono text-[11px]">
                          <span className="text-neutral-500">Acceptable Between:</span>
                          <input
                            type="time"
                            value={earliestTime}
                            onChange={(e) => setEarliestTime(e.target.value)}
                            className="px-2 py-1 rounded-lg bg-white border border-railway-border text-railway-textPrimary"
                          />
                          <span>–</span>
                          <input
                            type="time"
                            value={latestTime}
                            onChange={(e) => setLatestTime(e.target.value)}
                            className="px-2 py-1 rounded-lg bg-white border border-railway-border text-railway-textPrimary"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Statutory Operating Disclaimer Banner */}
                  <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-3.5 flex items-start space-x-2.5 text-xs text-amber-950 font-sans">
                    <ShieldAlert className="w-4 h-4 text-railway-safetyAmber flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Operating Rule Notice:</strong> Submitting this maintenance requisition does <strong>NOT</strong> grant or schedule an actual railway block. Operating authorities and the corridor constraint optimizer will evaluate train timetables, live RailRadar movements, and multi-department dependencies before issuing a block recommendation.
                    </p>
                  </div>

                  {/* Navigation & Submit Actions */}
                  <div className="pt-4 border-t border-railway-border flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-railway-border text-xs text-railway-textSecondary hover:text-railway-textPrimary transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Resources</span>
                    </button>

                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white text-xs font-bold shadow-md transition active:scale-98"
                    >
                      <CheckCircle2 className="w-4 h-4 text-railway-signalGreenLight" />
                      <span>Submit Maintenance Requisition</span>
                    </button>
                  </div>
                </div>
              )}

            </form>
          )}
        </div>
      </div>
    </div>
  );
};
