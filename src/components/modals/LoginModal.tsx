// Professional Railway Operations Login Modal
// Redesigned with unified Vertex-inspired government railway design system
import React, { useState } from 'react';
import { useSamnvayStore, USERS } from '../../store/useSamnvayStore';
import { UserRole } from '../../types/samnvay';
import { Train, Lock, User, ShieldCheck, X, ArrowRight } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { switchRole } = useSamnvayStore();

  const [selectedRole, setSelectedRole] = useState<UserRole>('MASTER');
  const [employeeId, setEmployeeId] = useState(USERS['MASTER'].employeeId);
  const [password, setPassword] = useState('••••••••••••');

  if (!isOpen) return null;

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setEmployeeId(USERS[role].employeeId);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    switchRole(selectedRole);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white border border-railway-border rounded-[32px] max-w-md w-full shadow-2xl overflow-hidden relative p-8 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-railway-canvas hover:bg-neutral-200 border border-railway-border flex items-center justify-center text-railway-textSecondary hover:text-railway-textPrimary transition absolute top-6 right-6"
          title="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Center Header Panel */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-railway-forest text-white flex items-center justify-center mx-auto shadow-sm">
            <Train className="w-7 h-7 text-railway-signalGreenLight" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-railway-textPrimary font-sans">
              Rail Samnvay
            </h2>
            <p className="text-xs text-railway-textMuted font-mono uppercase tracking-wider">
              Railway Personnel Authentication
            </p>
          </div>
        </div>

        <form onSubmit={handleSignIn} className="space-y-5">
          {/* Role Selection Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-semibold uppercase text-railway-textSecondary tracking-wider">
              Select Operating Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => handleRoleChange(e.target.value as UserRole)}
              className="w-full px-4 py-3 rounded-2xl bg-railway-canvas border border-railway-border text-xs font-semibold text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20 focus:border-railway-forest"
            >
              {(Object.keys(USERS) as UserRole[]).map((r) => (
                <option key={r} value={r}>
                  {r} — {USERS[r].name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee ID */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-semibold uppercase text-railway-textSecondary tracking-wider">
              Employee ID
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-railway-textMuted" />
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-railway-canvas border border-railway-border text-xs font-mono text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-semibold uppercase text-railway-textSecondary tracking-wider">
              Security PIN / Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-railway-textMuted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-railway-canvas border border-railway-border text-xs text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
              />
            </div>
          </div>

          {/* Sign In CTA */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white font-semibold text-sm shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
              <span>Authenticate Personnel</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-railway-signalGreenLight" />
            </button>
          </div>

          {/* Security Note */}
          <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-railway-textMuted pt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-railway-signalGreen" />
            <span>Role-Based Access Control Active</span>
          </div>
        </form>
      </div>
    </div>
  );
};
