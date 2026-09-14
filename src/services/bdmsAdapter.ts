// BDMS Adapter (Block Demand & Management System Integration Boundary)
// Indian Railways · Rail Samanvaya Decision Support System
// NOTE: THIS IS A PROTOTYPE / SIMULATED ADAPTER INTERFACE.
// It defines the standardized enterprise boundaries for connecting to the Indian Railways BDMS
// without falsely claiming live production integration.

import { BlockRequest, MaintenanceRequirement } from '../types/samnvay';

export interface BdmsDemandPayload {
  demandId?: string;
  maintenanceRequirementId: string;
  department: string;
  sectionCode: string;
  startKm: number;
  endKm: number;
  workDescription: string;
  requestedDate: string;
  requestedStart: string;
  requestedEnd: string;
  requestedDurationMinutes: number;
  trafficBlockRequired: boolean;
  powerBlockRequired: boolean;
  sntDisconnectionRequired: boolean;
  protectionRequirements: string[];
}

export interface BdmsDemandResponse {
  success: boolean;
  adapterStatus: 'PROTOTYPE_SIMULATED';
  demandReferenceNumber: string;
  status: 'DEMAND_REGISTERED' | 'UNDER_DIVISIONAL_SCRUTINY' | 'TRANSMITTED_TO_COA' | 'APPROVED' | 'REJECTED';
  message: string;
  timestamp: string;
}

export interface BdmsOperationalRecordResponse {
  success: boolean;
  adapterStatus: 'PROTOTYPE_SIMULATED';
  recordId: string;
  impositionRecord?: {
    impositionTime: string;
    privateNumber: string;
    isSimulated: true;
  };
  returnRecord?: {
    returnTime: string;
    privateNumber: string;
    isSimulated: true;
  };
  message: string;
  timestamp: string;
}

class BdmsAdapter {
  readonly isSimulation = true;
  readonly adapterName = 'BDMS Enterprise Boundary Adapter (Prototype)';

  /**
   * Submit maintenance demand to BDMS queue (Simulated)
   */
  async submitDemand(requirement: MaintenanceRequirement | BlockRequest): Promise<BdmsDemandResponse> {
    const refNum = `BDMS-DEM-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    return {
      success: true,
      adapterStatus: 'PROTOTYPE_SIMULATED',
      demandReferenceNumber: refNum,
      status: 'DEMAND_REGISTERED',
      message: `[PROTOTYPE ADAPTER] Demand ${refNum} successfully queued in simulated BDMS gateway. Awaiting divisional planning review.`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Review demand status in BDMS (Simulated)
   */
  async reviewDemand(demandReferenceNumber: string): Promise<BdmsDemandResponse> {
    return {
      success: true,
      adapterStatus: 'PROTOTYPE_SIMULATED',
      demandReferenceNumber,
      status: 'UNDER_DIVISIONAL_SCRUTINY',
      message: `[PROTOTYPE ADAPTER] Demand ${demandReferenceNumber} scrutinized by simulated Divisional Branch Officers.`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Transmit verified demand from BDMS to COA for corridor path allocation (Simulated)
   */
  async sendToCoa(demandReferenceNumber: string): Promise<BdmsDemandResponse> {
    return {
      success: true,
      adapterStatus: 'PROTOTYPE_SIMULATED',
      demandReferenceNumber,
      status: 'TRANSMITTED_TO_COA',
      message: `[PROTOTYPE ADAPTER] Demand ${demandReferenceNumber} transmitted to simulated Control Office Application (COA).`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Record actual block imposition in BDMS (Simulated)
   */
  async recordImposition(demandReferenceNumber: string, timeStr: string): Promise<BdmsOperationalRecordResponse> {
    const pn = `SIM-PN-BDMS-${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      success: true,
      adapterStatus: 'PROTOTYPE_SIMULATED',
      recordId: `IMP-REC-${Date.now()}`,
      impositionRecord: {
        impositionTime: timeStr,
        privateNumber: pn,
        isSimulated: true,
      },
      message: `[PROTOTYPE ADAPTER] Imposition recorded in simulated BDMS operating log. Simulated Private Number: ${pn}.`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Record block return in BDMS (Simulated)
   */
  async recordReturn(demandReferenceNumber: string, timeStr: string): Promise<BdmsOperationalRecordResponse> {
    const pn = `SIM-PN-RET-${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      success: true,
      adapterStatus: 'PROTOTYPE_SIMULATED',
      recordId: `RET-REC-${Date.now()}`,
      returnRecord: {
        returnTime: timeStr,
        privateNumber: pn,
        isSimulated: true,
      },
      message: `[PROTOTYPE ADAPTER] Track return acknowledged in simulated BDMS ledger. Simulated Private Number: ${pn}.`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Close demand record upon normal restoration (Simulated)
   */
  async closeDemand(demandReferenceNumber: string): Promise<BdmsDemandResponse> {
    return {
      success: true,
      adapterStatus: 'PROTOTYPE_SIMULATED',
      demandReferenceNumber,
      status: 'APPROVED',
      message: `[PROTOTYPE ADAPTER] Demand ${demandReferenceNumber} closed in simulated BDMS archive upon certified infrastructure restoration.`,
      timestamp: new Date().toISOString(),
    };
  }
}

export const bdmsAdapter = new BdmsAdapter();
