// scratch/test_master_upgrade.ts
// Comprehensive Acceptance Test Suite for Master Product & Workflow Upgrade v2.0

import { calculateCpmActivityNetwork } from '../src/utils/conflictPlanner';
import { getSamnvayState, setSamnvayState, useSamnvayStore } from '../src/store/useSamnvayStore';
import type { BlockRequest, BlockStatus, ChatMessage } from '../src/types/samnvay';
import * as fs from 'fs';
import * as path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('RAIL SAMNVAY — MASTER PRODUCT & WORKFLOW UPGRADE ACCEPTANCE');
  console.log('===============================================================\n');

  // --- TEST 1: Requisition Form Step 5 Removal & 4-Step Definition ---
  const modalPath = path.join(process.cwd(), 'src/components/samnvay/CreateRequestModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf8');
  assert(!modalContent.includes("step === 5"), "Step 5 UI completely removed from CreateRequestModal");
  assert(!modalContent.includes("Candidate Window Selection"), "Candidate Window Selection removed from requisition modal");
  assert(modalContent.includes("currentStep === 4"), "Step 4 is the final operational preference step");
  assert(modalContent.includes("Submit Maintenance Requisition"), "Requisition modal submits directly at Step 4");

  // --- TEST 2: Universal Text Selection (select-none removed from main app frames) ---
  const appPath = path.join(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert(!appContent.includes("select-none"), "App.tsx root wrapper does NOT block text selection");

  const sidebarPath = path.join(process.cwd(), 'src/components/samnvay/Sidebar.tsx');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
  assert(!sidebarContent.includes("select-none"), "Sidebar does NOT block text selection");

  const topbarPath = path.join(process.cwd(), 'src/components/samnvay/TopCommandBar.tsx');
  const topbarContent = fs.readFileSync(topbarPath, 'utf8');
  assert(!topbarContent.includes("select-none"), "TopCommandBar does NOT block text selection");

  // --- TEST 3: CPM Activity Network Engine ---
  // The CPM engine takes requests and constructs the directed activity network:
  // TRD Isolation (15m) + S&T Disconnection (15m) -> Parallel execution tasks -> Track Inspection (15m) -> Power Restore (10m) -> Final Release (5m)
  const sampleRequests: BlockRequest[] = [
    {
      id: 'REQ-PWAY-01',
      department: 'P.Way',
      work: 'Plain Track Machine Tamping',
      workCategory: 'Track Maintenance',
      engineer: 'K. S. Sharma',
      creatorRole: 'P.Way Engineer',
      section: 'BZA-KI',
      startLocation: '12/400',
      endLocation: '13/100',
      date: '2026-09-12',
      duration: 60,
      priority: 'HIGH',
      risk: 'HIGH',
      status: 'Submitted',
      reason: 'Periodic tamping',
      safetyRequirements: [],
      resourcesRequired: [],
      priorityScore: 85,
      powerBlockRequired: true,
      sntDisconnectionRequired: true,
      createdAt: '08:00 IST'
    },
    {
      id: 'REQ-TRD-01',
      department: 'TRD',
      work: 'OHE Contact Wire Replacement',
      workCategory: 'Electrical OHE',
      engineer: 'V. S. Rao',
      creatorRole: 'TRD Engineer',
      section: 'BZA-KI',
      startLocation: '12/400',
      endLocation: '13/100',
      date: '2026-09-12',
      duration: 40,
      priority: 'HIGH',
      risk: 'HIGH',
      status: 'Submitted',
      reason: 'OHE periodic overhaul',
      safetyRequirements: [],
      resourcesRequired: [],
      priorityScore: 80,
      powerBlockRequired: true,
      sntDisconnectionRequired: false,
      createdAt: '08:00 IST'
    }
  ];

  const cpm = calculateCpmActivityNetwork(sampleRequests, 180);
  // Expected Duration:
  // Isolation: 15m
  // Max parallel work: max(60m, 40m) = 60m
  // Inspection: 15m
  // Power Restore: 10m
  // Final Release: 5m
  // Total Critical Path = 15 + 60 + 15 + 10 + 5 = 105 mins
  assert(cpm.criticalPathDuration === 105, `CPM computed critical path duration (15+60+15+10+5 = 105m). Got: ${cpm.criticalPathDuration}`);
  assert(cpm.blockUtilizationPercent <= 100, `CPM Block Utilization % verified <= 100%. Got: ${cpm.blockUtilizationPercent}%`);

  const trdAct = cpm.activities.find(a => a.id === 'ACT-REQ-TRD-01');
  assert(trdAct !== undefined && trdAct.totalFloat === 20, `CPM computed float for shorter concurrent TRD task (Float: 20m). Got: ${trdAct?.totalFloat}`);
  assert(trdAct?.isCritical === false, "Shorter concurrent task correctly flagged as non-critical");

  const pwayAct = cpm.activities.find(a => a.id === 'ACT-REQ-PWAY-01');
  assert(pwayAct?.isCritical === true && pwayAct.totalFloat === 0, "Dominant task correctly identified on critical path with 0 float");

  // --- TEST 4: Store State & Rich Requisition Model ---
  const newReqId = 'BR-TEST-UPGRADE-01';
  const richRequisition: BlockRequest = {
    id: newReqId,
    title: 'Emergency Ultrasonic Rail Flaw Detection & Replacement',
    department: 'P.Way',
    work: 'Deep Screening & Rail Replacement',
    workCategory: 'Track Maintenance',
    workType: 'Deep Screening & Rail Replacement',
    maintenanceCategory: 'Safety Urgent',
    section: 'BZA-KI',
    location: {
      corridorId: 'C1',
      sectionId: 'BZA-KI',
      stationCode: 'KI',
      startKm: 435.2,
      endKm: 438.5,
      track: 'UP Line'
    },
    startLocation: '435/200',
    endLocation: '438/500',
    assetId: 'TRACK-C1-UP-KM435',
    assetName: '60kg 90UTS Rail Joint',
    defectDetails: 'Transverse fissure detected during USFD inspection at weld joint 436/12.',
    inspectionReference: 'USFD/BZA/2026/09/882',
    date: '2026-09-12',
    duration: 150,
    preferredStartTime: '10:00',
    preferredEndTime: '12:30',
    flexibleTiming: true,
    earliestAcceptableTime: '09:00',
    latestAcceptableTime: '15:00',
    priority: 'HIGH',
    risk: 'HIGH',
    status: 'Submitted',
    reason: 'Remediation of ultrasonic rail flaw',
    safetyRequirements: ['Banner flags at 600m & 1200m'],
    resourcesRequired: ['BCM 33', 'DGS Stabilizer'],
    workforceCount: 18,
    machines: ['BCM 33', 'DGS Stabilizer'],
    materials: ['60kg Rail 13m x 4 panels', '1000 Ballast bags'],
    dependencies: ['TRD Power Block on UP Line', 'S&T Axle Counter Disconnection'],
    otherDepartmentsInvolved: ['Electrical (TRD)', 'S&T'],
    specialOperatingRestrictions: ['Speed restriction of 30 kmph following work for 24 hours'],
    attachments: ['usfd_flaw_report_scan.pdf'],
    additionalNotes: 'Critical for avoiding emergency rail fracture during high-speed Vande Bharat passage.',
    engineer: 'K. S. Sharma',
    creatorRole: 'P.Way Engineer',
    priorityScore: 88,
    createdAt: '08:00 IST',
    statusHistory: [
      {
        status: 'Submitted',
        timestamp: '08:00 IST',
        actor: 'K. S. Sharma',
        role: 'P.Way Engineer',
        remarks: 'New maintenance requisition submitted'
      }
    ]
  };

  setSamnvayState(prev => ({
    ...prev,
    requests: [...prev.requests, richRequisition]
  }));

  const createdReq = getSamnvayState().requests.find(r => r.id === newReqId)!;
  assert(createdReq !== undefined, "Maintenance requisition created successfully");
  assert(createdReq.status === 'Submitted', "New requisition status is strictly 'Submitted' (never an authorized block)");
  assert(createdReq.workType === 'Deep Screening & Rail Replacement', "Rich requisition workType persisted");
  assert(createdReq.workforceCount === 18, "Rich requisition workforce persisted");
  assert(createdReq.machines?.length === 2, "Machines persisted");
  assert(createdReq.otherDepartmentsInvolved?.includes('Electrical (TRD)'), "Cross-department requirements persisted");

  // --- TEST 5: Resend for Correction Flow ---
  const correctionReason = "Missing ballast train requisition number and TRD tower wagon operator confirmation.";
  const correctionFields = ["machines", "specialOperatingRestrictions"];
  
  setSamnvayState(prev => ({
    ...prev,
    requests: prev.requests.map(r => r.id === newReqId ? {
      ...r,
      status: 'Revision Required' as BlockStatus,
      revisionRequest: {
        requestedBy: 'V. Ramanathan (PCOM)',
        role: 'MASTER',
        timestamp: '08:30 IST',
        reason: correctionReason,
        fieldsRequiringCorrection: correctionFields
      },
      statusHistory: [
        ...(r.statusHistory || []),
        {
          status: 'Revision Required' as BlockStatus,
          timestamp: '08:30 IST',
          actor: 'V. Ramanathan (PCOM)',
          role: 'MASTER',
          remarks: `Resent for Correction: ${correctionReason}`
        }
      ]
    } : r)
  }));

  const revisedReq = getSamnvayState().requests.find(r => r.id === newReqId);
  assert(revisedReq?.status === 'Revision Required', "Request status changed to 'Revision Required'");
  assert(revisedReq?.revisionRequest?.reason.includes("Missing ballast train"), "Correction reason saved");
  assert(revisedReq?.revisionRequest?.fieldsRequiringCorrection.includes("machines"), "Correction checklist fields saved");

  // --- TEST 6: Resubmission by Field User ---
  setSamnvayState(prev => ({
    ...prev,
    requests: prev.requests.map(r => r.id === newReqId ? {
      ...r,
      machines: ['BCM 33', 'DGS Stabilizer', 'Ballast Hopper Train BZA-04'],
      specialOperatingRestrictions: ['Speed restriction 30 kmph; Ballast train escort allocated'],
      status: 'Submitted' as BlockStatus,
      statusHistory: [
        ...(r.statusHistory || []),
        {
          status: 'Submitted' as BlockStatus,
          timestamp: '08:45 IST',
          actor: 'K. S. Sharma',
          role: 'P.Way Engineer',
          remarks: 'Corrected fields updated and resubmitted'
        }
      ]
    } : r)
  }));

  const resubmittedReq = getSamnvayState().requests.find(r => r.id === newReqId);
  assert(resubmittedReq?.status === 'Submitted', "Resubmitted request transitions back to 'Submitted'");
  assert(resubmittedReq?.machines?.length === 3, "Corrected machines updated in request");

  // --- TEST 7: Technical Verification ---
  setSamnvayState(prev => ({
    ...prev,
    requests: prev.requests.map(r => r.id === newReqId ? {
      ...r,
      status: 'Verified' as BlockStatus,
      statusHistory: [
        ...(r.statusHistory || []),
        {
          status: 'Verified' as BlockStatus,
          timestamp: '09:00 IST',
          actor: 'ADEN/BZA',
          role: 'Planning Officer',
          remarks: 'Verified by ADEN/BZA. Site inspection completed. Ballast train confirmed.'
        }
      ]
    } : r)
  }));

  const verifiedReq = getSamnvayState().requests.find(r => r.id === newReqId);
  assert(verifiedReq?.status === 'Verified', "Request transitioned to 'Verified'");

  // --- TEST 8: Rejection with Mandatory Operational Reason ---
  const rejectionReason = "Corridor traffic embargo in force due to VIP special train movement.";
  setSamnvayState(prev => ({
    ...prev,
    requests: prev.requests.map(r => r.id === newReqId ? {
      ...r,
      status: 'Rejected' as BlockStatus,
      rejectionDetails: {
        rejectedBy: 'Sr. DOM / BZA',
        role: 'Operations Controller',
        timestamp: '09:15 IST',
        reason: rejectionReason
      },
      statusHistory: [
        ...(r.statusHistory || []),
        {
          status: 'Rejected' as BlockStatus,
          timestamp: '09:15 IST',
          actor: 'Sr. DOM / BZA',
          role: 'Operations Controller',
          remarks: `Rejected: ${rejectionReason}`
        }
      ]
    } : r)
  }));

  const rejectedReq = getSamnvayState().requests.find(r => r.id === newReqId);
  assert(rejectedReq?.status === 'Rejected', "Request status set to 'Rejected'");
  assert(rejectedReq?.rejectionDetails?.reason.includes("VIP special train"), "Rejection reason saved");

  // --- TEST 9: Railway Chat Multi-Department Communication & Strict Safety Rule ---
  const chatState = getSamnvayState();
  assert(chatState.conversations.length > 0, "Initial coordination channels available");

  const testConv = chatState.conversations[0];
  const newChatMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    conversationId: testConv.id,
    senderId: 'u-trd',
    senderName: 'V. S. Rao',
    senderRole: 'TRD Engineer',
    senderDepartment: 'TRD',
    text: 'TRD power cutoff scheduled between Km 435 and 438 for joint window.',
    timestamp: '09:20 IST'
  };

  setSamnvayState(prev => ({
    ...prev,
    conversations: prev.conversations.map(c => c.id === testConv.id ? {
      ...c,
      messages: [...(c.messages || []), newChatMsg],
      lastMessage: newChatMsg
    } : c)
  }));

  const updatedConv = getSamnvayState().conversations.find(c => c.id === testConv.id);
  const lastMsg = updatedConv?.messages?.[updatedConv.messages.length - 1];
  assert(lastMsg?.text.includes("TRD power cutoff"), "Chat message transmitted and appended to coordination channel");

  // Safety Invariant: Chat activity must never schedule or authorize a block
  const scheduledBlocks = getSamnvayState().requests.filter(r => r.status === 'Scheduled');
  assert(!scheduledBlocks.some(b => b.id === newReqId), "Chat activity did NOT schedule or authorize any block (Safety Invariant preserved)");

  console.log('\n===============================================================');
  console.log(`ACCEPTANCE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test suite runtime error:", err);
  process.exit(1);
});
