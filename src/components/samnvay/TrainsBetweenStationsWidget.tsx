// src/components/samnvay/TrainsBetweenStationsWidget.tsx
// Trains Between Stations Planning Utility (Section 15 Specification)

import React, { useState } from 'react';
import { useTrainsBetweenStations } from '../../hooks/useRailRadar';
import { Search, Train, ArrowRight, Clock, AlertCircle, RefreshCw } from 'lucide-react';

export const TrainsBetweenStationsWidget: React.FC = () => {
  const [fromStation, setFromStation] = useState('BZA');
  const [toStation, setToStation] = useState('GNT');
  const { trains, isLoading, error, findTrains } = useTrainsBetweenStations();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromStation.trim() && toStation.trim()) {
      findTrains(fromStation, toStation);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-railway-border shadow-soft space-y-5 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-railway-border pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Train className="w-4 h-4 text-cyan-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-800">
              CORRIDOR PLANNING UTILITY
            </span>
          </div>
          <h3 className="text-base font-bold text-railway-textPrimary font-sans">
            Trains Between Stations Query
          </h3>
          <p className="text-xs text-railway-textSecondary font-sans mt-0.5">
            Evaluate expected commercial train movements crossing candidate maintenance corridors
          </p>
        </div>
      </div>

      {/* Query Inputs */}
      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-500 font-bold uppercase">From:</label>
          <input
            type="text"
            value={fromStation}
            onChange={(e) => setFromStation(e.target.value.toUpperCase())}
            placeholder="e.g. BZA"
            className="w-24 px-3 py-1.5 bg-railway-canvas border border-railway-border rounded-xl text-xs font-bold text-center uppercase focus:outline-none focus:border-railway-forest"
          />
        </div>

        <ArrowRight className="w-4 h-4 text-neutral-400" />

        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-500 font-bold uppercase">To:</label>
          <input
            type="text"
            value={toStation}
            onChange={(e) => setToStation(e.target.value.toUpperCase())}
            placeholder="e.g. GNT"
            className="w-24 px-3 py-1.5 bg-railway-canvas border border-railway-border rounded-xl text-xs font-bold text-center uppercase focus:outline-none focus:border-railway-forest"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2 rounded-full bg-railway-forest hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Querying...</span>
            </>
          ) : (
            <>
              <Search className="w-3.5 h-3.5" />
              <span>FIND TRAINS</span>
            </>
          )}
        </button>
      </form>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Table */}
      {trains.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-railway-border">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="bg-railway-canvas text-neutral-600 border-b border-railway-border uppercase text-[10px]">
              <tr>
                <th className="p-3">Train</th>
                <th className="p-3">Departure ({fromStation})</th>
                <th className="p-3">Arrival ({toStation})</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Class / Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-railway-border">
              {trains.map((t, idx) => {
                const trainNum = t.trainNumber || t.number || `TR-${idx + 1}`;
                const trainName = t.trainName || t.name || 'Express Service';
                const dep = t.departureTime || t.departure || t.fromTime || '—';
                const arr = t.arrivalTime || t.arrival || t.toTime || '—';
                const dur = t.duration || t.durationMinutes ? `${t.durationMinutes}m` : '—';
                const type = t.trainType || t.type || 'Mail/Express';

                return (
                  <tr key={idx} className="hover:bg-neutral-50/80">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold text-xs">
                          {trainNum}
                        </span>
                        <span className="font-bold text-neutral-900 font-sans">{trainName}</span>
                      </div>
                    </td>
                    <td className="p-3 font-bold text-neutral-800">{dep}</td>
                    <td className="p-3 font-bold text-neutral-800">{arr}</td>
                    <td className="p-3 text-neutral-600">{dur}</td>
                    <td className="p-3 text-neutral-500 font-sans">{type}</td>
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
