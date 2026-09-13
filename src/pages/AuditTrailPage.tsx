// Audit Trail Page
// Redesigned with unified Vertex-inspired government railway design system
import React, { useState } from 'react';
import { useSamnvayStore } from '../store/useSamnvayStore';
import { History, Shield, Clock, FileText, Search, ShieldCheck, X } from 'lucide-react';

export const AuditTrailPage: React.FC = () => {
  const { state } = useSamnvayStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = state.auditLogs.filter(log => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      log.user.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.requestId.toLowerCase().includes(q) ||
      log.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-railway-border pb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-railway-forest flex items-center justify-center font-bold">
              <History className="w-4 h-4" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-railway-textPrimary font-sans">
              Immutable Operations Audit Trail
            </h1>
          </div>
          <p className="text-sm text-railway-textSecondary mt-1">
            Chronological, non-repudiable ledger of all maintenance block applications, operating concurrences, and line possession memos.
          </p>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-railway-textMuted">TOTAL EVENTS:</span>
          <span className="bg-white px-3 py-1.5 rounded-full border border-railway-border text-railway-forest font-bold shadow-xs">
            {state.auditLogs.length} Verified Entries
          </span>
        </div>
      </div>

      {/* Search Filter */}
      <div className="bg-white rounded-3xl border border-railway-border p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-railway-textMuted" />
          <input
            type="text"
            placeholder="Filter audit events by officer name, action, requisition ID, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-full bg-railway-canvas border border-railway-border text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20 focus:border-railway-forest transition font-mono"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Timeline Container */}
      <div className="bg-white border border-railway-border rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-railway-border pb-4">
          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-railway-forest uppercase">
            <ShieldCheck className="w-4 h-4 text-railway-signalGreen" />
            <span>Cryptographically Verified Railway Dispatch Ledger</span>
          </div>
          <span className="text-xs font-mono text-railway-textMuted">
            INDIAN RAILWAYS CHAPTER VII COMPLIANT
          </span>
        </div>

        {state.auditLogs.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-railway-canvas mx-auto flex items-center justify-center text-railway-textMuted border border-railway-border">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-railway-textPrimary font-sans">
                No audit events recorded yet
              </h3>
              <p className="text-sm text-railway-textSecondary max-w-sm mx-auto">
                Operational events, requisition approvals, and execution milestones will appear here in the immutable ledger.
              </p>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-railway-textMuted font-mono">
            No audit records found matching query "{searchTerm}".
          </div>
        ) : (
          <div className="divide-y divide-railway-border">
            {filteredLogs.map((log) => {
              const isApproved = log.status === 'Approved' || log.status === 'OPTIMAL PLAN GENERATED';
              const isRejected = log.status === 'Rejected';
              const isPending = log.status === 'Pending' || log.status === 'Revision';

              return (
                <div 
                  key={log.id} 
                  className="py-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-neutral-50/70 px-4 rounded-2xl transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Time chip */}
                    <span className="font-mono text-xs font-bold text-railway-forest w-20 flex-shrink-0 pt-0.5">
                      {log.timestamp}
                    </span>

                    {/* Details */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-railway-textPrimary">
                          {log.user}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-railway-canvas text-railway-textSecondary border border-railway-border">
                          {log.role}
                        </span>
                        <span className="text-xs font-mono text-railway-forest font-bold">
                          {log.requestId}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-railway-textPrimary">
                        {log.action}
                      </div>

                      <p className="text-xs text-railway-textSecondary leading-relaxed pt-0.5">
                        {log.details}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center self-start sm:self-center flex-shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                      isApproved ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      isRejected ? 'bg-red-50 text-red-800 border-red-200' :
                      isPending ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
