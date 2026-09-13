// Vertex-inspired Block Request Requisition Form Section
import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, FileText, Send, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { useSamnvayStore } from '../../store/useSamnvayStore';
import { Department } from '../../types/samnvay';

export const BlockRequestSection: React.FC = () => {
  const { createRequest } = useSamnvayStore();

  const [department, setDepartment] = useState<Department>('P.Way');
  const [sectionId, setSectionId] = useState<string>('SEC-04');
  const [workType, setWorkType] = useState<string>('Mechanized Ballast Tamping');
  const [location, setLocation] = useState<string>('KM 52/10 – KM 55/40 UP Line');
  const [durationMinutes, setDurationMinutes] = useState<number>(90);
  const [requestedDate, setRequestedDate] = useState<string>('2026-09-12');
  const [preferredWindow, setPreferredWindow] = useState<string>('14:45 – 16:15');
  const [notes, setNotes] = useState<string>('Require Plasser 08-32 Tamping Machine & Tower Wagon isolation clearance.');
  
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submittedId, setSubmittedId] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Add to actual application store
    const generatedId = createRequest({
      department,
      section: `C1 · ${sectionId}`,
      startLocation: location.split('–')[0]?.trim() || 'KM 52/10',
      endLocation: location.split('–')[1]?.trim() || 'KM 55/40',
      work: workType,
      workCategory: department === 'P.Way' ? 'Track Engineering' : department === 'S&T' ? 'Interlocking Health' : 'Catenary OHE',
      date: requestedDate,
      preferredTime: preferredWindow.split('–')[0]?.trim() || '14:45',
      duration: durationMinutes,
      priority: 'HIGH',
      risk: 'MEDIUM',
      reason: notes || 'Periodic preventive line maintenance',
      safetyRequirements: ['1200m detonator protection', 'Banner flags', 'Traction power isolation clearance'],
      resourcesRequired: ['Track machine crew', 'Tower wagon team', 'Section PWI inspector'],
      priorityScore: 82,
      priorityBreakdown: {
        criticality: 30,
        urgency: 22,
        risk: 15,
        trafficImpact: 8,
        resourceAvailability: 7,
        score: 82,
        explanation: 'Regular preventive block requisition scheduled within standard maintenance window.',
      },
    });

    setSubmittedId(generatedId);
    setIsSubmitted(true);
  };

  return (
    <section id="requests" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        
        {/* Left Column: Large Editorial Statement & Brief Explanation */}
        <div className="lg:col-span-5 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-railway-canvasMuted text-railway-forest text-xs font-mono font-semibold tracking-wider uppercase border border-railway-border">
            <span>Operational Requisition</span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-railway-textPrimary leading-[1.08] font-sans">
            Put the next block in motion.
          </h2>

          <p className="text-lg text-railway-textSecondary leading-relaxed">
            Submit corridor maintenance requisitions directly into the division’s automated scheduling queue.
          </p>

          <div className="space-y-4 pt-4 border-t border-railway-border text-sm text-railway-textSecondary">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-50 text-railway-signalGreen flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                ✓
              </div>
              <div>
                <strong className="text-railway-textPrimary block">Automated Conflict Verification</strong>
                Cross-checks against active passenger paths, freight loops, and adjacent departmental works.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-50 text-railway-signalGreen flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                ✓
              </div>
              <div>
                <strong className="text-railway-textPrimary block">Senior DOM Approval Queue</strong>
                Routes instantly to the Senior Divisional Operating Manager for digital safety endorsement.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-50 text-railway-signalGreen flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                ✓
              </div>
              <div>
                <strong className="text-railway-textPrimary block">Joint Shadow Window Matching</strong>
                Pairs P.Way and TRD electrical power blocks to eliminate duplicate line closures.
              </div>
            </div>
          </div>

          <div className="pt-2">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-railway-textMuted bg-white px-3 py-1.5 rounded-full border border-railway-border">
              <span className="w-2 h-2 rounded-full bg-railway-signalGreen" />
              <span>CP-SAT ENGINE STANDBY · SCR BZA DIVISION</span>
            </div>
          </div>
        </div>

        {/* Right Column: Clean Premium Request Form */}
        <div className="lg:col-span-7">
          <div className="rounded-[28px] bg-white border border-railway-border p-8 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
            
            {isSubmitted ? (
              <div className="py-12 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-railway-signalGreen mx-auto flex items-center justify-center border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold text-railway-signalGreen uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full">
                    REQUISITION LOGGED · {submittedId}
                  </span>
                  <h3 className="text-2xl font-bold text-railway-textPrimary">
                    Block Request Successfully Queued
                  </h3>
                  <p className="text-sm text-railway-textSecondary max-w-md mx-auto">
                    Requisition for <strong>{sectionId} ({department})</strong> has been dispatched to the Division Control Room Approval Queue with zero initial timetable conflicts.
                  </p>
                </div>
                <div className="pt-4 flex justify-center gap-4">
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="px-6 py-2.5 rounded-full border border-railway-border hover:bg-railway-canvas text-sm font-semibold text-railway-textPrimary transition"
                  >
                    Submit Another Request
                  </button>
                  <a
                    href="#planning"
                    className="px-6 py-2.5 rounded-full bg-railway-forest text-white text-sm font-semibold hover:bg-railway-forestDark transition"
                  >
                    View in Planning Timeline →
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="border-b border-railway-border pb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-railway-textPrimary tracking-tight">
                    Maintenance Block Application
                  </h3>
                  <span className="text-xs font-mono text-railway-textMuted uppercase">
                    FORM BZA-M4
                  </span>
                </div>

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  
                  {/* Department */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-railway-textSecondary font-mono">
                      Department
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value as Department)}
                      className="w-full px-4 py-3 rounded-2xl bg-railway-canvas/50 border border-railway-border text-sm font-medium text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20 focus:border-railway-forest transition"
                    >
                      <option value="P.Way">Permanent Way (P.Way)</option>
                      <option value="S&T">Signal & Telecom (S&T)</option>
                      <option value="TRD">Traction / OHE (TRD)</option>
                    </select>
                  </div>

                  {/* Section */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-railway-textSecondary font-mono">
                      Railway Section
                    </label>
                    <select
                      value={sectionId}
                      onChange={(e) => setSectionId(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-railway-canvas/50 border border-railway-border text-sm font-medium text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20 focus:border-railway-forest transition"
                    >
                      <option value="SEC-01">SEC-01 · Vijayawada North Yard</option>
                      <option value="SEC-02">SEC-02 · Kondapalli</option>
                      <option value="SEC-03">SEC-03 · Errupalem</option>
                      <option value="SEC-04">SEC-04 · Madhira Main Line</option>
                      <option value="SEC-05">SEC-05 · Bonakalu</option>
                      <option value="SEC-06">SEC-06 · Khammam West</option>
                      <option value="SEC-07">SEC-07 · Dornakal Jn</option>
                      <option value="SEC-08">SEC-08 · Mahbubabad</option>
                    </select>
                  </div>

                  {/* Work Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-railway-textSecondary font-mono">
                      Work Type
                    </label>
                    <input
                      type="text"
                      value={workType}
                      onChange={(e) => setWorkType(e.target.value)}
                      required
                      placeholder="e.g. Track Tamping, Rail Welding"
                      className="w-full px-4 py-3 rounded-2xl bg-railway-canvas/50 border border-railway-border text-sm text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20 focus:border-railway-forest transition"
                    />
                  </div>

                  {/* Location / Chainage */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-railway-textSecondary font-mono">
                      Location / Chainage
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      placeholder="e.g. KM 52/10 – 55/40 UP Line"
                      className="w-full px-4 py-3 rounded-2xl bg-railway-canvas/50 border border-railway-border text-sm text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20 focus:border-railway-forest transition"
                    />
                  </div>

                  {/* Duration */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-railway-textSecondary font-mono">
                      Duration
                    </label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-2xl bg-railway-canvas/50 border border-railway-border text-sm font-medium text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20 focus:border-railway-forest transition"
                    >
                      <option value={60}>60 Minutes (1 hour)</option>
                      <option value={90}>90 Minutes (1.5 hours)</option>
                      <option value={120}>120 Minutes (2 hours)</option>
                      <option value={150}>150 Minutes (2.5 hours)</option>
                      <option value={180}>180 Minutes (3 hours)</option>
                    </select>
                  </div>

                  {/* Requested Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-railway-textSecondary font-mono">
                      Requested Date
                    </label>
                    <input
                      type="date"
                      value={requestedDate}
                      onChange={(e) => setRequestedDate(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-2xl bg-railway-canvas/50 border border-railway-border text-sm text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20 focus:border-railway-forest transition"
                    />
                  </div>

                  {/* Preferred Window */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-railway-textSecondary font-mono">
                      Preferred Working Window
                    </label>
                    <input
                      type="text"
                      value={preferredWindow}
                      onChange={(e) => setPreferredWindow(e.target.value)}
                      placeholder="e.g. 14:45 – 16:15 IST"
                      className="w-full px-4 py-3 rounded-2xl bg-railway-canvas/50 border border-railway-border text-sm text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20 focus:border-railway-forest transition"
                    />
                  </div>

                  {/* Operational Notes */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-railway-textSecondary font-mono">
                      Operational Notes & Machinery Required
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Specify track machinery, tower wagon, or power block isolation requirement..."
                      className="w-full px-4 py-3 rounded-2xl bg-railway-canvas/50 border border-railway-border text-sm text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20 focus:border-railway-forest transition resize-none"
                    />
                  </div>

                </div>

                {/* Submit Action */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs font-mono text-railway-textMuted hidden sm:inline">
                    * Transmitted to Senior DOM for clearance
                  </span>
                  
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 group"
                  >
                    <span>Submit Block Request</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 text-railway-signalGreenLight" />
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>

      </div>
    </section>
  );
};
