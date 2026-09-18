import React from 'react';
import { StationGridSvg, TrackTurnoutSvg } from './RailwayGeometry';

interface EditorialHeroProps {
  category?: string;
  titleLines: string[];
  subtitle?: string;
  badges?: Array<{
    label: string;
    variant?: 'teal' | 'green' | 'amber' | 'violet' | 'dark' | 'steel';
  }>;
  actionSlot?: React.ReactNode;
  bgMotif?: 'grid' | 'turnout' | 'none';
  className?: string;
}

const variantStyles: Record<string, string> = {
  teal: 'bg-[#62929E]/15 text-[#2c535c] border-[#62929E]/30',
  green: 'bg-[#16A34A]/15 text-[#14532d] border-[#16A34A]/30',
  amber: 'bg-[#F59E0B]/15 text-[#78350f] border-[#F59E0B]/30',
  violet: 'bg-[#6D5DF5]/15 text-[#3b2fc9] border-[#6D5DF5]/30',
  dark: 'bg-[#393D3F]/10 text-[#393D3F] border-[#393D3F]/20',
  steel: 'bg-[#546A7B]/15 text-[#2b3a44] border-[#546A7B]/30',
};

export const EditorialHero: React.FC<EditorialHeroProps> = ({
  category,
  titleLines,
  subtitle,
  badges = [],
  actionSlot,
  bgMotif = 'turnout',
  className = '',
}) => {
  return (
    <div
      className={`relative overflow-hidden bg-white rounded-3xl border border-[#E8E6DF] p-6 sm:p-8 md:p-10 shadow-sm mb-6 ${className}`}
    >
      {/* Subtle Background Geometric Accent */}
      {bgMotif === 'turnout' && (
        <div className="absolute right-6 top-6 text-[#546A7B] pointer-events-none select-none">
          <TrackTurnoutSvg className="w-36 h-24 md:w-48 md:h-32" opacity={0.12} />
        </div>
      )}
      {bgMotif === 'grid' && (
        <div className="absolute right-6 top-6 text-[#62929E] pointer-events-none select-none">
          <StationGridSvg className="w-32 h-32 md:w-40 md:h-40" opacity={0.1} />
        </div>
      )}

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-3xl">
          {/* Top Category / Department Tag */}
          {category && (
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#546A7B]">
                {category}
              </span>
            </div>
          )}

          {/* Stacked Oversized Editorial Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#393D3F] tracking-tight leading-[1.08] uppercase">
            {titleLines.map((line, idx) => (
              <span key={idx} className="block">
                {line}
              </span>
            ))}
          </h1>

          {/* Subtitle / Operational Narrative */}
          {subtitle && (
            <p className="mt-3.5 text-sm sm:text-base text-[#546A7B] font-medium max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}

          {/* Badges / Micro Tags */}
          {badges.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {badges.map((b, i) => (
                <span
                  key={i}
                  className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide border ${
                    variantStyles[b.variant || 'dark']
                  }`}
                >
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action / Controls Slot */}
        {actionSlot && (
          <div className="flex-shrink-0 flex items-center gap-3">
            {actionSlot}
          </div>
        )}
      </div>
    </div>
  );
};
