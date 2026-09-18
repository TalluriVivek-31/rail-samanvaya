// src/components/samnvay/StationTimetableWidget.tsx
// Station Timetable View (Section 14 Specification)
// Explicitly separates static timetable from real-time position telemetry

import React from 'react';
import { useStationTimetable } from '../../hooks/useRailRadar';
import { Calendar, Clock, AlertCircle, RefreshCw } from 'lucide-react';

export interface StationTimetableWidgetProps {
  stationCode: string;
}

export const StationTimetableWidget: React.FC<StationTimetableWidgetProps> = ({ stationCode }) => {
  const { timetable, isLoading, error, refetch } = useStationTimetable(stationCode);

  return (
    <div className="space-y-4 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 font-sans">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span>
            <strong>TIMETABLE NOTICE:</strong> Timetable information represents scheduled Indian Railways timetable paths and does <strong>NOT</strong> represent real-time GPS position telemetry.
          </span>
        </div>
        <button
          onClick={() => refetch(stationCode)}
          disabled={isLoading}
          className="px-3 py-1 rounded-full bg-white border border-amber-300 text-amber-900 text-[11px] font-bold hover:bg-amber-100 transition self-start sm:self-auto cursor-pointer"
        >
          {isLoading ? 'Refreshing...' : 'Refresh Timetable'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {timetable.length === 0 && !isLoading ? (
        <div className="p-8 text-center text-xs text-neutral-500 bg-railway-canvas rounded-2xl border border-railway-border">
          No scheduled timetable services retrieved for station {stationCode}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-railway-border">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="bg-railway-canvas text-neutral-600 border-b border-railway-border uppercase text-[10px]">
              <tr>
                <th className="p-3">Train</th>
                <th className="p-3">Scheduled Arrival</th>
                <th className="p-3">Scheduled Departure</th>
                <th className="p-3">Operating Days</th>
                <th className="p-3">Direction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-railway-border">
              {timetable.map((item, idx) => {
                const trainNum = item.trainNumber || item.number || '—';
                const trainName = item.trainName || item.name || 'Express Service';
                const arr = item.scheduledArrival || item.arrival || item.time || '—';
                const dep = item.scheduledDeparture || item.departure || '—';
                const days = item.operatingDays || item.days || 'Daily';
                const dir = item.direction || 'UP';

                return (
                  <tr key={idx} className="hover:bg-neutral-50/80">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-200 font-bold text-xs">
                          {trainNum}
                        </span>
                        <span className="font-bold text-neutral-900 font-sans">{trainName}</span>
                      </div>
                    </td>
                    <td className="p-3 font-bold text-neutral-800">{arr}</td>
                    <td className="p-3 font-bold text-neutral-800">{dep}</td>
                    <td className="p-3 text-neutral-600 font-sans">{days}</td>
                    <td className="p-3 font-bold text-cyan-800">{dir} Main</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
