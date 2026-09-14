// COA Adapter (Control Office Application Boundary)
// Indian Railways · Rail Samanvaya Decision Support System
// NOTE: THIS IS A PROTOTYPE / SIMULATED ADAPTER INTERFACE.
// It defines the standardized enterprise boundary for feeding COA operational constraints,
// master train schedules, goods/freight forecasts, and corridor occupancies.

import { SCHEDULED_CORRIDOR_MOVEMENTS, PlannedCorridorMovement } from '../optimization/corridorSchedule';

export interface CoaCorridorAvailability {
  corridorId: string;
  sectionCode: string;
  date: string;
  availableWindows: {
    start: string;
    end: string;
    durationMinutes: number;
    headwayMarginsPreserved: boolean;
  }[];
  activeSpeedRestrictions: {
    location: string;
    speedKmph: number;
    reason: string;
    cautionOrderNumber: string;
  }[];
  goodsForecastCount: number;
  passengerMovementCount: number;
  adapterStatus: 'PROTOTYPE_SIMULATED';
}

class CoaAdapter {
  readonly isSimulation = true;
  readonly adapterName = 'COA Enterprise Boundary Adapter (Prototype)';

  /**
   * Fetch planned timetable paths and goods movements for a section from COA (Simulated)
   */
  async getSectionMovements(sectionCode: string): Promise<{
    movements: PlannedCorridorMovement[];
    adapterStatus: 'PROTOTYPE_SIMULATED';
    message: string;
  }> {
    return {
      movements: SCHEDULED_CORRIDOR_MOVEMENTS,
      adapterStatus: 'PROTOTYPE_SIMULATED',
      message: `[PROTOTYPE ADAPTER] Retrieved ${SCHEDULED_CORRIDOR_MOVEMENTS.length} scheduled corridor movements from simulated COA timetable repository.`,
    };
  }

  /**
   * Query corridor availability and planned goods forecasts (Simulated)
   */
  async getCorridorAvailability(sectionCode: string, dateStr: string): Promise<CoaCorridorAvailability> {
    return {
      corridorId: 'CORR-C1',
      sectionCode,
      date: dateStr,
      availableWindows: [
        { start: '01:30', end: '03:30', durationMinutes: 120, headwayMarginsPreserved: true },
        { start: '04:30', end: '06:30', durationMinutes: 120, headwayMarginsPreserved: true },
        { start: '11:00', end: '13:00', durationMinutes: 120, headwayMarginsPreserved: true },
      ],
      activeSpeedRestrictions: [
        {
          location: 'KM 12/600 – 12/800',
          speedKmph: 45,
          reason: 'Consolidation after track lifting',
          cautionOrderNumber: 'CO-SIM-4912',
        },
      ],
      goodsForecastCount: 2,
      passengerMovementCount: 5,
      adapterStatus: 'PROTOTYPE_SIMULATED',
    };
  }

  /**
   * Transmit approved maintenance block plan to COA Master Operating Chart (Simulated)
   */
  async commitBlockPlanToChart(blockMemoNumber: string, timeWindow: string, track: string): Promise<{
    success: boolean;
    adapterStatus: 'PROTOTYPE_SIMULATED';
    chartSlotId: string;
    message: string;
  }> {
    const slotId = `COA-CHART-${Math.floor(10000 + Math.random() * 90000)}`;
    return {
      success: true,
      adapterStatus: 'PROTOTYPE_SIMULATED',
      chartSlotId: slotId,
      message: `[PROTOTYPE ADAPTER] Maintenance block ${blockMemoNumber} (${timeWindow} on ${track}) plotted into simulated COA Master Chart (Slot ${slotId}).`,
    };
  }
}

export const coaAdapter = new CoaAdapter();
