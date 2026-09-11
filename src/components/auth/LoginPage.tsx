// High-End Animated Split-Screen Railway Operational Login Portal
// Indian Railways · South Central Railway · Vijayawada Division (BZA Control)
// Theme: Primary Teal (#2d9b88), Dark Charcoal (#1a1a1a), Light Gray (#f4f4f5, #f9fafb)
// Typography: Serif Headings (Playfair Display) + Modern Utility (Plus Jakarta Sans)

import React, { useState } from 'react';
import { 
  Train, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldAlert, 
  HelpCircle, 
  X, 
  PhoneCall, 
  Radio
} from 'lucide-react';
import { useSamnvayStore } from '../../store/useSamnvayStore';

export const LoginPage: React.FC = () => {
  const { login, state } = useSamnvayStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanInput = identifier.trim();
    if (!cleanInput) {
      setErrorMsg('Please enter your official railway email or Employee ID.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your account password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await login(cleanInput, password);
      if (!success) {
        setErrorMsg(state.authError || 'Invalid credentials. Please verify your email / Employee ID and password.');
      }
    } catch {
      setErrorMsg('Unable to connect to Railway Authentication Gateway. Check local network.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#f4f4f5] selection:bg-[#2d9b88] selection:text-white relative overflow-hidden font-sans">
      
      {/* ========================================================================= */}
      {/* 1. LEFT BRAND PANEL (42% Width on Desktop, Hidden on Mobile)              */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col justify-between w-full md:w-[42%] lg:w-[40%] xl:w-[38%] bg-[#2d9b88] text-white p-8 lg:p-12 relative overflow-hidden select-none">
        
        {/* Subtle 24px Pattern-Grid */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* Ambient Top Glow in Left Panel */}
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />

        {/* Top-Left Brand Accent */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center space-x-3">
            <span className="w-8 h-[2px] bg-white/70 rounded-full inline-block" />
            <span className="text-[11px] uppercase tracking-[0.25em] text-white/90 font-semibold font-sans">
              SOUTH CENTRAL RAILWAY · BZA DIVISION
            </span>
          </div>

          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-black/15 border border-white/20 text-xs backdrop-blur-xs">
            <Radio className="w-3 h-3 text-white animate-pulse" />
            <span className="text-[11px] font-medium tracking-wide">
              Corridor C1–C3 Telemetry Live
            </span>
          </div>
        </div>

        {/* Center Editorial / Serif Typography & Train Theme */}
        <div className="relative z-10 my-auto py-12 space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center backdrop-blur-md shadow-inner">
            <Train className="w-7 h-7 text-white" />
          </div>

          <div className="space-y-4 max-w-md">
            <h1 className="text-4xl lg:text-5xl xl:text-[56px] font-extrabold leading-[1.08] tracking-tight text-white">
              Precision in <span className="italic font-bold text-white/95">Every Corridor</span>.
            </h1>
            <p className="text-white/80 text-sm lg:text-base leading-relaxed font-normal">
              AI-assisted block coordination, headway synchronization, and live train precedence control for South Central Railway operations.
            </p>
          </div>

          {/* Quick Divisional Topography Metric */}
          <div className="grid grid-cols-2 gap-3 pt-2 max-w-sm">
            <div className="p-3.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs">
              <div className="text-[11px] text-white/70 font-mono uppercase tracking-wider">Section Line</div>
              <div className="text-base font-bold text-white mt-0.5">214.5 KM Track</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs">
              <div className="text-[11px] text-white/70 font-mono uppercase tracking-wider">Signals Monitored</div>
              <div className="text-base font-bold text-white mt-0.5">142 Interlocked</div>
            </div>
          </div>
        </div>

        {/* Train Track Silhouette & Animated Track Effect */}
        <div className="absolute bottom-28 left-0 right-0 h-10 pointer-events-none z-10 flex items-center">
          <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-white/30 to-transparent relative">
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.8), rgba(255,255,255,0.8) 1px, transparent 1px, transparent 12px)'
              }}
            />
          </div>
        </div>

        {/* Special UI Component: Layered Mountain Clip-Path Overlay */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-48 bg-white/10 backdrop-blur-xs pointer-events-none"
          style={{
            clipPath: 'polygon(0% 100%, 20% 60%, 45% 90%, 65% 55%, 100% 100%)'
          }}
        />
        <div 
          className="absolute bottom-0 left-0 right-0 h-36 bg-white/15 pointer-events-none"
          style={{
            clipPath: 'polygon(0% 100%, 15% 75%, 35% 50%, 60% 80%, 85% 42%, 100% 100%)'
          }}
        />

        {/* Left Panel Footer: Copyright */}
        <div className="relative z-10 pt-4 border-t border-white/15">
          <p className="text-xs text-white/60 font-sans">
            © 2026 Indian Railways · Ministry of Railways, Govt. of India.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. RIGHT FORM PANEL (58% Width on Desktop, Clean Minimalist Design)       */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col justify-between items-center p-6 sm:p-10 lg:p-14 relative bg-white overflow-y-auto">
        
        {/* Floating Blurred Teal Circles in Background (Pointer-Events-None) */}
        <div className="w-96 h-96 rounded-full bg-[#2d9b88] opacity-[0.07] blur-3xl absolute -top-20 -right-20 animate-float-1 pointer-events-none" />
        <div className="w-80 h-80 rounded-full bg-[#2d9b88] opacity-[0.06] blur-3xl absolute bottom-12 -left-20 animate-float-2 pointer-events-none" />
        <div className="w-72 h-72 rounded-full bg-[#2d9b88] opacity-[0.05] blur-2xl absolute top-1/2 right-12 animate-float-3 pointer-events-none" />

        {/* Mobile-Only Header */}
        <div className="md:hidden w-full max-w-[440px] pt-2 pb-6 border-b border-[#e5e7eb] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2d9b88] flex items-center justify-center text-white">
              <Train className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider font-mono">
                INDIAN RAILWAYS
              </div>
              <div className="text-[10px] text-[#2d9b88] font-medium">
                South Central Railway · BZA
              </div>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-[#2d9b88] animate-pulse" />
        </div>

        {/* Central Form Container (Max-Width 440px, 40px/10-Unit Section Spacing) */}
        <div className="w-full max-w-[440px] my-auto py-8 relative z-10 space-y-10">
          
          {/* --- Section 1: Logo Section with Spinning Glow & Pulse --- */}
          <div className="space-y-4">
            <div className="relative inline-block">
              {/* Spinning 12s Background Glow */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#2d9b88]/30 to-transparent blur-xl absolute -inset-2 animate-spin-glow pointer-events-none" />
              
              {/* Logo with 4s subtle pulse */}
              <div className="w-16 h-16 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm flex items-center justify-center text-[#2d9b88] relative z-10 animate-pulse-brand">
                <Train className="w-8 h-8 stroke-[1.8]" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a1a1a] tracking-tight">
                Rail Samanvaya
              </h2>
              <p className="text-sm text-[#71717a]">
                Sign in to your Railway Operational Console
              </p>
            </div>
          </div>

          {/* Error Notice */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
              <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* --- Section 2: Form with Vertically Stacked Inputs --- */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Input 1: Official Email / Employee ID */}
            <div className="space-y-1.5">
              <label 
                htmlFor="railway-identifier" 
                className="block text-xs font-semibold text-[#1a1a1a] font-sans"
              >
                Official Email / Employee ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9ca3af]">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="railway-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. pcom.bza@railnet.gov.in or EMP-IR-001"
                  required
                  autoFocus
                  autoComplete="username"
                  className="w-full pl-11 pr-4 py-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl text-sm text-[#1a1a1a] placeholder-[#9ca3af] transition-all duration-300 ease-out focus:outline-none focus:border-[#2d9b88] focus:bg-white focus:ring-0"
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(45,155,136,0.25)';
                    e.currentTarget.style.borderColor = '#2d9b88';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                />
              </div>
            </div>

            {/* Input 2: Password with Show/Hide & Forgot Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="railway-password" 
                  className="block text-xs font-semibold text-[#1a1a1a] font-sans"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-medium text-[#2d9b88] hover:underline focus:outline-none transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9ca3af]">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="railway-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-11 pr-11 py-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl text-sm text-[#1a1a1a] placeholder-[#9ca3af] transition-all duration-300 ease-out focus:outline-none focus:border-[#2d9b88] focus:bg-white focus:ring-0"
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(45,155,136,0.25)';
                    e.currentTarget.style.borderColor = '#2d9b88';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#9ca3af] hover:text-[#1a1a1a] transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Session Toggle */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2.5 text-xs text-[#71717a] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(e) => setRememberSession(e.target.checked)}
                  className="rounded border-[#e5e7eb] text-[#2d9b88] focus:ring-0 focus:ring-offset-0 w-4 h-4 accent-[#2d9b88]"
                />
                <span>Retain operational session on this terminal</span>
              </label>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-xl bg-[#2d9b88] text-white font-semibold text-sm font-sans transition-all duration-200 ease-out shadow-lg shadow-[#2d9b88]/30 hover:shadow-xl hover:shadow-[#2d9b88]/40 hover:-translate-y-1 active:scale-95 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center space-x-2.5 group cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Verifying Authorization...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Rail Console</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* --- Section 3: Support Footer --- */}
          <div className="pt-6 border-t border-[#e5e7eb] text-center space-y-2">
            <div className="text-xs font-semibold text-[#1a1a1a] flex items-center justify-center space-x-1.5">
              <span>Official Indian Railways Access Portal</span>
            </div>
            <p className="text-[11px] text-[#71717a] leading-relaxed max-w-sm mx-auto">
              This terminal communicates directly with the BZA Division Block Interlocking System. Access is audited under Railway Cyber Guidelines.
            </p>
          </div>

        </div>

        {/* Support Hotline / Dispatch Footer */}
        <div className="w-full max-w-[440px] pt-4 text-center">
          <p className="text-xs text-[#71717a]">
            Need dispatch assistance?{' '}
            <button 
              type="button" 
              onClick={() => setShowForgotModal(true)}
              className="text-[#2d9b88] font-medium hover:underline"
            >
              Contact Division Control (Ext. 4201)
            </button>
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FORGOT PASSWORD / DIVISIONAL CREDENTIAL MODAL                          */}
      {/* ========================================================================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-[#e5e7eb] space-y-6 relative">
            
            {/* Close Button */}
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-5 right-5 text-[#9ca3af] hover:text-[#1a1a1a] transition p-1 rounded-lg hover:bg-neutral-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#2d9b88]/10 text-[#2d9b88] flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#1a1a1a]">
                  Credential Recovery
                </h3>
                <p className="text-xs text-[#71717a]">
                  South Central Railway Security Protocol
                </p>
              </div>
            </div>

            {/* Security Explanation */}
            <div className="p-4 rounded-xl bg-[#f9fafb] border border-[#e5e7eb] space-y-2 text-xs text-[#1a1a1a] leading-relaxed">
              <div className="flex items-center space-x-2 font-semibold text-[#2d9b88]">
                <ShieldAlert className="w-4 h-4" />
                <span>Authorized Personnel Security Policy</span>
              </div>
              <p>
                In compliance with Indian Railways Cyber Governance (G&SR Section 3.2), automated self-service password resets are disabled for operational safety.
              </p>
              <p className="text-[#71717a]">
                To verify identity and reset your credentials, please notify the Vijayawada Operating Control Room or your Senior Divisional Engineer desk.
              </p>
            </div>

            {/* Contact Channels */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#e5e7eb] hover:border-[#2d9b88] transition">
                <div className="flex items-center space-x-3">
                  <PhoneCall className="w-4 h-4 text-[#2d9b88]" />
                  <div>
                    <div className="text-xs font-semibold text-[#1a1a1a]">Division Control Hotline</div>
                    <div className="text-[11px] text-[#71717a]">BZA Intercom: Ext. 4201 / 4202</div>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-medium text-[#2d9b88] bg-[#2d9b88]/10 px-2 py-0.5 rounded-full">
                  24/7 Active
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-[#e5e7eb] hover:border-[#2d9b88] transition">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-[#2d9b88]" />
                  <div>
                    <div className="text-xs font-semibold text-[#1a1a1a]">Sr. DSTE System Admin</div>
                    <div className="text-[11px] text-[#71717a]">helpdesk.bza@railnet.gov.in</div>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">
                  RailNet
                </span>
              </div>
            </div>

            {/* Action */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#2d9b88] text-white text-xs font-semibold hover:bg-[#258272] transition cursor-pointer"
            >
              Return to Sign In
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
