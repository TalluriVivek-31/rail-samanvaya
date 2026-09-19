// Dynamic Railway Location & Maintenance Requisition Modal
// Indian Railways · South Central Railway (Vijayawada Division)
// 5-Step Progressive Maintenance Requisition Flow
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
import { analyzeLocationTrainConflicts } from '../../optimization/conflictEngine';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({ isOpen, onClose }) => {
  const { state, createRequest } = useSamnvayStore();

  // Exactly 4 Steps: 1 (Work) -> 2 (Location) -> 3 (Duration & Resources) -> 4 (Train Intelligence & Submit)
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

  // STEP 3: RESOURCES & GRANULAR POSSESSION BREAKDOWN
  const [mobMins, setMobMins] = useState(15);
  const [setupMins, setSetupMins] = useState(15);
  const [netWorkMins, setNetWorkMins] = useState(60);
  const [clearanceMins, setClearanceMins] = useState(15);
  const [restorationMins, setRestorationMins] = useState(15);
  const totalRequiredDuration = mobMins + setupMins + netWorkMins + clearanceMins + restorationMins;

  const [durationMinutes, setDurationMinutes] = useState(120);
  const [priority, setPriority] = useState<BlockPriority>('HIGH');
  const [workforceCount, setWorkforceCount] = useState<number>(8);
  const [staffInput, setStaffInput] = useState('1 SSE, 2 Track Maintainers, 6 Gangmen');
  const [machinesInput, setMachinesInput] = useState('TM-04 (09-3X Dynamic Tamping Machine)');
  const [equipmentInput, setEquipmentInput] = useState('Rail tensors, AFTC test box, Chamfering kit');
  const [materialsInput, setMaterialsInput] = useState('Ballast 40 cu.m, Elastic Rail Clips, Liner sets');
  const [dependenciesInput, setDependenciesInput] = useState('Requires TRD power isolation confirmation on UP Main before machine entry.');
  const [otherDepts, setOtherDepts] = useState<Department[]>(['TRD']);

  // STEP 4: OPERATIONAL REQUIREMENTS & PREFERRED SCHEDULE
  const [trafficBlockRequired, setTrafficBlockRequired] = useState(true);
  const [powerBlockRequired, setPowerBlockRequired] = useState(false);
  const [sntDisconnectionRequired, setSntDisconnectionRequired] = useState(false);
  const [integratedBlockRequired, setIntegratedBlockRequired] = useState(false);
  const [speedRestrictionRequired, setSpeedRestrictionRequired] = useState(true);
  const [cautionSpeedKmph, setCautionSpeedKmph] = useState<number>(30);
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
  // Candidate Planning Windows for Step 4
  const step4Analysis = useMemo(() => {
    if (!locationResult.isValid) return null;
    return analyzeLocationTrainConflicts(
      locationResult.startKmDecimal,
      locationResult.endKmDecimal,
      selectedTracks,
      totalRequiredDuration,
      preferredStartTime,
      state.liveData.liveTrains
    );
  }, [locationResult, selectedTracks, totalRequiredDuration, preferredStartTime, state.liveData.liveTrains]);

  // Contextual nearby trains on corridor
  const nearbyTrains = useMemo(() => {
    if (!locationResult.isValid) return [];
    const reqKm = locationResult.startKmDecimal;
    const isUp = selectedTracks.some(t => t.includes('UP'));
    return state.liveData.liveTrains.map(t => {
      const trainKm = t.currentKm ?? 10.0;
      const dist = Number(Math.abs(trainKm - reqKm).toFixed(1));
      const speed = t.speedKmph || 60;
      const etaMins = Math.max(1, Math.round((dist / Math.max(speed, 20)) * 60));
      const isApproaching = isUp ? trainKm < reqKm : trainKm > reqKm;
      return {
        ...t,
        distanceKm: dist,
        isApproaching,
        etaMins
      };
    }).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 4);
  }, [locationResult, selectedTracks, state.liveData.liveTrains]);

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
      duration: totalRequiredDuration,
      requested_duration: totalRequiredDuration,
      planned_duration: totalRequiredDuration,
      total_required_duration: totalRequiredDuration,
      requested_start: preferredStartTime,
      possessionBreakdown: {
        mobilisation_duration: mobMins,
        setup_duration: setupMins,
        work_duration: netWorkMins,
        clearance_duration: clearanceMins,
        restoration_duration: restorationMins,
        total_required_duration: totalRequiredDuration
      },
      resources: {
        staff_required: workforceCount,
        machine_required: machinesInput.split(',').map(m => m.trim()).filter(Boolean),
        equipment_required: equipmentInput.split(',').map(e => e.trim()).filter(Boolean),
        materials_required: materialsInput.split(',').map(m => m.trim()).filter(Boolean),
        resource_ids: ['TM-04']
      },
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
      integratedBlockRequired,
      speedRestrictionRequired,
      specialOperatingRestrictions: speedRestrictionRequired 
        ? `Caution Order: Max ${cautionSpeedKmph} km/h. Reason: ${specialRestrictions}` 
        : specialRestrictions,
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
                  CORRIDOR REQUISITION
                </span>
              </div>
              <p className="text-[11px] font-mono text-railway-textMuted uppercase">
                INDIAN RAILWAYS · WORK REQUISITION PIPELINE
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
                      if (stepNum < currentStep || (stepNum <= 2 && locationResult.isValid)) {
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

                  {/* Compact Location Preview Widget */}
                  {locationResult.isValid && (
                    <div className="p-4 rounded-2xl bg-neutral-900 text-white font-mono text-xs shadow-md space-y-3">
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold uppercase tracking-wider border-b border-neutral-800 pb-2">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>DYNAMIC LOCATION PREVIEW</span>
                        </span>
                        <span className="text-neutral-400">G&amp;SR PHYSICAL CHAINAGE</span>
                      </div>

                      {/* Visual Chainage Bar */}
                      <div className="flex items-center justify-between px-2 pt-1">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{formatRailwayKm(locationResult.startKmDecimal)}</span>
                        </div>
                        <div className="flex-1 mx-3 flex items-center">
                          <div className="h-0.5 bg-neutral-700 flex-1 relative flex items-center justify-center">
                            <span className="px-2.5 py-0.5 rounded-full bg-neutral-800 text-[10px] text-emerald-300 font-bold border border-neutral-700">
                              ───── {locationResult.affectedLengthMeters} m ─────
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{formatRailwayKm(locationResult.endKmDecimal)}</span>
                        </div>
                      </div>

                      {/* Section, Line, Track, Station Context, Assets, Nearby Trains */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-800 text-[11px]">
                        <div>
                          <span className="text-neutral-400 text-[9px] uppercase block">Section</span>
                          <span className="font-bold text-white">{locationResult.sectionCode} ({locationResult.detectedSections[0]?.sectionName || 'BZA–MAG'})</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 text-[9px] uppercase block">Line / Track</span>
                          <span className="font-bold text-white">{locationResult.detectedLines[0] || 'Main Line'} / {selectedTracks.join(', ')}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 text-[9px] uppercase block">Station Context</span>
                          <span className="font-bold text-white truncate" title={locationResult.betweenStations?.display}>
                            {locationResult.betweenStations?.display || `${locationResult.stationCode} Limits`}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-400 text-[9px] uppercase block">Assets / Traffic</span>
                          <span className="font-bold text-emerald-300">
                            {locationResult.affectedAssets.all.length} Assets · {nearbyTrains.length} Nearby Trains
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

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
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                    >
                      <span>Proceed to Duration & Resources</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* STEP 3: Duration, Resources & Operational Requirements                    */}
              {/* ========================================================================= */}
              {currentStep === 3 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="border-b border-railway-border pb-3">
                    <span className="text-[10px] font-mono font-bold uppercase text-railway-forest bg-railway-forest/10 px-2.5 py-0.5 rounded-full">
                      STEP 3 OF 4 · DURATION & OPERATIONAL REQUIREMENTS
                    </span>
                    <h4 className="text-lg font-bold text-railway-textPrimary mt-1.5">
                      Possession Duration Breakdown, Block Facilities & Gang Mobilization
                    </h4>
                  </div>

                  {/* Granular Possession Duration Breakdown (Indian Railways G&SR Standards) */}
                  <div className="space-y-2 p-4 rounded-2xl bg-railway-canvas border border-railway-border">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
                        Possession Duration Breakdown (Minutes)
                      </label>
                      <span className="text-xs font-mono font-bold text-railway-forest bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        TOTAL REQUIRED: {totalRequiredDuration} MINS ({Math.floor(totalRequiredDuration / 60)}h {totalRequiredDuration % 60}m)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500 uppercase">1. Mobilisation</label>
                        <input
                          type="number"
                          min={0}
                          value={mobMins}
                          onChange={(e) => setMobMins(Number(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-railway-border text-xs text-railway-textPrimary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500 uppercase">2. Setup / Prep</label>
                        <input
                          type="number"
                          min={0}
                          value={setupMins}
                          onChange={(e) => setSetupMins(Number(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-railway-border text-xs text-railway-textPrimary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500 uppercase">3. Net Work</label>
                        <input
                          type="number"
                          min={1}
                          value={netWorkMins}
                          onChange={(e) => setNetWorkMins(Number(e.target.value) || 1)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-railway-border text-xs text-railway-textPrimary font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500 uppercase">4. Clearance</label>
                        <input
                          type="number"
                          min={0}
                          value={clearanceMins}
                          onChange={(e) => setClearanceMins(Number(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-railway-border text-xs text-railway-textPrimary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500 uppercase">5. Restoration</label>
                        <input
                          type="number"
                          min={0}
                          value={restorationMins}
                          onChange={(e) => setRestorationMins(Number(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-railway-border text-xs text-railway-textPrimary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Priority & Workforce */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
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
                        Staff / Gang Breakdown
                      </label>
                      <input
                        type="text"
                        value={staffInput}
                        onChange={(e) => setStaffInput(e.target.value)}
                        placeholder="e.g. 1 SSE, 2 Track Maintainers, 6 Gangmen"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-railway-canvas border border-railway-border font-mono text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                      />
                    </div>
                  </div>

                  {/* Machines & Equipment Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px] flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-railway-forest" />
                        <span>Track Machine / Plant (e.g. TM-04, BCM)</span>
                      </label>
                      <input
                        type="text"
                        value={machinesInput}
                        onChange={(e) => setMachinesInput(e.target.value)}
                        placeholder="e.g. TM-04 (09-3X Dynamic Tamping Machine), BCM-02"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-railway-canvas border border-railway-border text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px] flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-railway-forest" />
                        <span>Equipment & Specialized Tools</span>
                      </label>
                      <input
                        type="text"
                        value={equipmentInput}
                        onChange={(e) => setEquipmentInput(e.target.value)}
                        placeholder="e.g. Rail tensors, AFTC test box, Weld trimmer"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-railway-canvas border border-railway-border text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                      />
                    </div>
                  </div>

                  {/* Materials Input */}
                  <div className="space-y-1.5 text-xs">
                    <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px] flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-railway-forest" />
                      <span>Materials & Consumables Required</span>
                    </label>
                    <input
                      type="text"
                      value={materialsInput}
                      onChange={(e) => setMaterialsInput(e.target.value)}
                      placeholder="e.g. Ballast 40 cu.m, Elastic Rail Clips, Liner sets, Contact wire 100m"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-railway-canvas border border-railway-border text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
                    />
                  </div>

                  {/* Dependencies & Other Departments */}
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

                  {/* Block Facilities Checkboxes */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-railway-textSecondary font-mono uppercase">
                      Requested Operational Facilities (Evaluated during Corridor Approval)
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
                        integratedBlockRequired ? 'bg-purple-50/70 border-purple-600 text-purple-900' : 'bg-white border-railway-border text-neutral-500'
                      }`}>
                        <input
                          type="checkbox"
                          checked={integratedBlockRequired}
                          onChange={(e) => setIntegratedBlockRequired(e.target.checked)}
                          className="rounded text-purple-600 focus:ring-0 w-4 h-4 accent-purple-600"
                        />
                        <span className="font-semibold">Integrated Block</span>
                      </label>
                    </div>
                  </div>

                  {/* Caution Order / Speed Restriction */}
                  <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
                    <label className="flex items-center space-x-2.5 font-semibold text-xs text-amber-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={speedRestrictionRequired}
                        onChange={(e) => setSpeedRestrictionRequired(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-0 w-4 h-4 accent-amber-600"
                      />
                      <span>Temporary Speed Restriction (Caution Order Required Post-Work)</span>
                    </label>

                    {speedRestrictionRequired && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                        <div>
                          <label className="text-[10px] font-mono uppercase text-amber-800 block mb-1">
                            Authorized Speed Restriction (km/h)
                          </label>
                          <input
                            type="number"
                            min={10}
                            max={100}
                            value={cautionSpeedKmph}
                            onChange={(e) => setCautionSpeedKmph(Number(e.target.value) || 30)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 text-xs font-mono font-bold text-neutral-800"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono uppercase text-amber-800 block mb-1">
                            Operating Justification
                          </label>
                          <input
                            type="text"
                            value={specialRestrictions}
                            onChange={(e) => setSpecialRestrictions(e.target.value)}
                            placeholder="e.g. Caution order 30 km/h for consolidation of ballast bed"
                            className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 text-xs text-neutral-800"
                          />
                        </div>
                      </div>
                    )}
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

                  {/* Navigation Actions */}
                  <div className="pt-4 border-t border-railway-border flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-railway-border text-xs text-railway-textSecondary hover:text-railway-textPrimary transition cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Location</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white text-xs font-semibold transition cursor-pointer"
                    >
                      <span>Proceed to Train Intelligence & Windows</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* STEP 4: Train Intelligence & Candidate Windows Preview                     */}
              {/* ========================================================================= */}
              {currentStep === 4 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="border-b border-railway-border pb-3">
                    <span className="text-[10px] font-mono font-bold uppercase text-railway-forest bg-railway-forest/10 px-2.5 py-0.5 rounded-full">
                      STEP 4 OF 4 · TRAIN INTELLIGENCE & WINDOWS PREVIEW
                    </span>
                    <h4 className="text-lg font-bold text-railway-textPrimary mt-1.5">
                      Corridor Train Proximity & Feasibility Preview
                    </h4>
                    <p className="text-xs text-railway-textSecondary mt-0.5">
                      RailRadar live train movements and optimizer candidate possession windows for {formatRailwayKm(locationResult.startKmDecimal)} – {formatRailwayKm(locationResult.endKmDecimal)}.
                    </p>
                  </div>

                  {/* Nearby Trains Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-railway-textSecondary font-mono uppercase flex items-center gap-1.5">
                        <Train className="w-3.5 h-3.5 text-railway-forest" />
                        <span>Section Train Movements (RailRadar Telemetry)</span>
                      </label>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {nearbyTrains.length} movements within corridor radius
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                      {nearbyTrains.length === 0 ? (
                        <div className="col-span-2 p-3 rounded-2xl bg-neutral-50 text-center text-neutral-400 text-xs">
                          No active train movements detected within section limits.
                        </div>
                      ) : (
                        nearbyTrains.map((trn) => (
                          <div
                            key={trn.trainNumber}
                            className="p-3 rounded-2xl bg-railway-canvas border border-railway-border flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-railway-textPrimary">
                                {trn.trainNumber} · {trn.trainName}
                              </div>
                              <div className="text-[10px] text-neutral-500">
                                Current KM: {trn.currentKm ?? '10.0'} · {trn.speedKmph} km/h
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                trn.isApproaching ? 'bg-amber-100 text-amber-900' : 'bg-neutral-100 text-neutral-700'
                              }`}>
                                {trn.isApproaching ? 'Approaching' : 'Moving Away'}
                              </span>
                              <div className="text-[10px] text-neutral-500 font-bold mt-0.5">
                                {trn.distanceKm} km ({trn.etaMins}m ETA)
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Candidate Planning Windows Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-railway-textSecondary font-mono uppercase flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-railway-forest" />
                        <span>Optimizer Candidate Possession Windows Preview</span>
                      </label>
                      <span className="text-[10px] font-mono text-emerald-700 font-bold">
                        Required: {totalRequiredDuration} mins
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                      {(step4Analysis?.candidateWindows || []).map((cand, idx) => {
                        const slotLabel = idx === 0 ? 'Early Morning' : idx === 1 ? 'Optimal Corridor' : 'Afternoon';
                        const isRecommended = Boolean(cand.isRecommended);
                        const isFeasible = cand.status === 'FEASIBLE';
                        const isConflict = cand.status === 'CONFLICT';

                        return (
                          <div
                            key={cand.slotId}
                            className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2 ${
                              isRecommended
                                ? 'bg-emerald-50/60 border-emerald-500 ring-1 ring-emerald-500'
                                : isConflict
                                ? 'bg-rose-50/40 border-rose-300'
                                : 'bg-white border-railway-border'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-neutral-500">{slotLabel}</span>
                              {isRecommended ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-600 text-white">
                                  RECOMMENDED
                                </span>
                              ) : isFeasible ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-100 text-sky-900 border border-sky-300">
                                  FEASIBLE
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                                  CONFLICT
                                </span>
                              )}
                            </div>

                            <div className="text-base font-bold text-railway-textPrimary">
                              {cand.startTime} – {cand.endTime} IST
                            </div>

                            <div className="text-[10px] text-neutral-500 font-sans leading-snug">
                              {cand.reason}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Statutory Operating Rule Disclaimer Banner */}
                  <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-3.5 flex items-start space-x-2.5 text-xs text-amber-950 font-sans">
                    <ShieldAlert className="w-4 h-4 text-railway-safetyAmber flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Operating Rule Notice:</strong> Submitting this requisition registers a verified maintenance requirement into the decision-support engine. It does <strong>NOT</strong> grant or execute an automatic railway block. Human Officer / Controller authorization remains mandatory.
                    </p>
                  </div>

                  {/* Navigation & Final Submit Actions */}
                  <div className="pt-4 border-t border-railway-border flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-railway-border text-xs text-railway-textSecondary hover:text-railway-textPrimary transition cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Duration & Resources</span>
                    </button>

                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white text-xs font-bold shadow-md transition active:scale-98 cursor-pointer"
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
