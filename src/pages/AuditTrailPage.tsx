import React, { useState } from 'react';
import { useSamnvayStore } from '../store/useSamnvayStore';
import { History, Shield, Clock, FileText, Search, ShieldCheck, X, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { EditorialHero } from '../components/common/EditorialHero';

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
    <div className="space-y-6 pb-12">
      {/* Master Editorial Hero */}
      <EditorialHero
        category="Tamper-Evident Ledger"
        titleLines={['EVERY ACTION.', 'RECORDED.']}
        subtitle="Cryptographically verified, immutable railway dispatch ledger tracking all approvals, track possessions, and speed cautions."
        badges={[
          { label: `${state.auditLogs.length} AUDIT ENTRIES`, variant: 'teal' },
          { label: 'CRIS / RTDB COMPLIANT', variant: 'green' },
          { label: 'G&SR CHAPTER VII DISCIPLINE', variant: 'steel' },
        ]}
        actionSlot={
          <div className="px-4 py-2 rounded-full bg-white border border-[#E8E6DF] text-xs font-bold text-[#393D3F] flex items-center gap-2 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
            <span>IMMUTABLE ARCHIVE</span>
          </div>
        }
        bgMotif="grid"
      />

      {/* Search Filter */}
      <div className="bg-white rounded-3xl border border-[#E8E6DF] p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#546A7B]" />
          <input
            type="text"
            placeholder="Filter audit events by officer name, action, requisition ID, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-full bg-[#F2F2EF] border border-[#E8E6DF] text-xs text-[#393D3F] placeholder-[#546A7B]/60 focus:outline-none focus:border-[#393D3F] transition font-mono"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#546A7B] hover:text-[#393D3F]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Timeline Container */}
      <div className="bg-white border border-[#E8E6DF] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#393D3F] uppercase">
            <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
            <span>Cryptographically Verified Dispatch Ledger</span>
          </div>
          <span className="text-xs font-bold text-[#546A7B]">
            INDIAN RAILWAYS CHAPTER VII COMPLIANT
          </span>
        </div>

        {state.auditLogs.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#F2F2EF] mx-auto flex items-center justify-center text-[#546A7B] border border-[#E8E6DF]">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#393D3F]">
                No audit events recorded yet
              </h3>
              <p className="text-sm text-[#546A7B] max-w-sm mx-auto font-medium">
                Operational events, requisition approvals, and execution milestones will appear here in the immutable ledger.
              </p>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#546A7B] font-mono">
            No audit records found matching query "{searchTerm}".
          </div>
        ) : (
          <div className="divide-y divide-[#E8E6DF]">
            {filteredLogs.map((log) => {
              const isApproved = log.status === 'Approved' || log.status === 'OPTIMAL PLAN GENERATED';
              const isRejected = log.status === 'Rejected';
              const isPending = log.status === 'Pending' || log.status === 'Revision';

              return (
                <div 
                  key={log.id} 
                  className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-[#F2F2EF]/60 px-4 rounded-2xl transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Timestamp */}
                    <span className="font-mono text-xs font-bold text-[#546A7B] w-24 flex-shrink-0 pt-0.5">
                      {log.timestamp}
                    </span>

                    {/* Details */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-[#393D3F]">
                          {log.user}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#F2F2EF] text-[#546A7B] border border-[#E8E6DF]">
                          {log.role}
                        </span>
                        <span className="text-xs font-mono text-[#62929E] font-bold">
                          {log.requestId}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-[#393D3F]">
                        {log.action}
                      </div>

                      <p className="text-xs text-[#546A7B] leading-relaxed pt-0.5 font-medium">
                        {log.details}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center self-start sm:self-center flex-shrink-0">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
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
