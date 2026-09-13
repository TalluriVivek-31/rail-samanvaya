// Vertex-inspired high-elegance Navigation Bar for Rail Samnvay
import React, { useState, useEffect } from 'react';
import { ArrowRight, Menu, X, Train, ShieldCheck } from 'lucide-react';

interface VertexNavbarProps {
  onEnterControlRoom: () => void;
  activeSection?: string;
}

export const VertexNavbar: React.FC<VertexNavbarProps> = ({ 
  onEnterControlRoom,
  activeSection = 'overview'
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Overview', href: '#overview' },
    { label: 'Network', href: '#network' },
    { label: 'Requests', href: '#requests' },
    { label: 'Planning', href: '#planning' },
    { label: 'Execution', href: '#execution' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      const topOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-[0_2px_16px_rgba(0,0,0,0.06)] border-b border-railway-border' 
          : 'bg-white/80 backdrop-blur-sm border-b border-railway-border/50'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand & Subtitle */}
        <a href="#overview" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-full bg-railway-forest text-white flex items-center justify-center shadow-sm group-hover:bg-railway-forestLight transition-colors">
            <Train className="w-5 h-5 text-railway-signalGreenLight" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-railway-textPrimary">
                Rail Samanvaya
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-wide bg-railway-canvasMuted text-railway-forest border border-railway-border">
                SCR · BZA DIV
              </span>
            </div>
            <span className="text-[11px] font-medium tracking-wide text-railway-textMuted uppercase">
              Railway Operations
            </span>
          </div>
        </a>

        {/* Center Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 bg-railway-canvas/80 p-1.5 rounded-full border border-railway-border/80">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="px-4 py-1.5 text-sm font-medium text-railway-textSecondary hover:text-railway-textPrimary hover:bg-white rounded-full transition-all duration-200"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right-Side CTA */}
        <div className="hidden sm:flex items-center space-x-4">
          <div className="hidden xl:flex items-center space-x-2 text-xs font-mono text-railway-textMuted border-r border-railway-border pr-4">
            <span className="w-2 h-2 rounded-full bg-railway-signalGreen animate-pulse" />
            <span>CORRIDOR ACTIVE</span>
          </div>

          <button
            onClick={onEnterControlRoom}
            className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-railway-forest text-white text-sm font-semibold shadow-sm hover:bg-railway-forestDark active:scale-[0.98] transition-all duration-200"
          >
            <span>Enter Control Room</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 text-railway-signalGreenLight" />
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex sm:hidden items-center space-x-2">
          <button
            onClick={onEnterControlRoom}
            className="px-3.5 py-1.5 rounded-full bg-railway-forest text-white text-xs font-semibold shadow-sm"
          >
            Control Room
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-10 h-10 rounded-full border border-railway-border bg-white flex items-center justify-center text-railway-textPrimary hover:bg-railway-canvas transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-b border-railway-border px-4 pt-3 pb-5 space-y-2 shadow-xl animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="text-[10px] font-mono uppercase tracking-wider text-railway-textMuted px-3 py-1">
            Navigation Sections
          </div>
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="block px-3 py-2 text-base font-medium text-railway-textPrimary hover:bg-railway-canvas rounded-lg transition"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 border-t border-railway-border">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onEnterControlRoom();
              }}
              className="w-full py-3 rounded-full bg-railway-forest text-white text-sm font-semibold flex items-center justify-center gap-2"
            >
              <span>Enter Control Room</span>
              <ArrowRight className="w-4 h-4 text-railway-signalGreenLight" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
