import React from 'react';

interface SvgProps {
  className?: string;
  strokeColor?: string;
  opacity?: number;
}

/**
 * Geometric SVG motif: Track Turnout (Crossover)
 */
export const TrackTurnoutSvg: React.FC<SvgProps> = ({
  className = 'w-24 h-16',
  strokeColor = 'currentColor',
  opacity = 0.25,
}) => (
  <svg
    viewBox="0 0 100 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ opacity }}
    aria-hidden="true"
  >
    <line x1="0" y1="15" x2="100" y2="15" stroke={strokeColor} strokeWidth="2" strokeDasharray="4 3" />
    <line x1="0" y1="45" x2="100" y2="45" stroke={strokeColor} strokeWidth="2" strokeDasharray="4 3" />
    <path d="M 20 45 C 45 45, 55 15, 80 15" stroke={strokeColor} strokeWidth="2.5" />
    <circle cx="20" cy="45" r="3" fill={strokeColor} />
    <circle cx="80" cy="15" r="3" fill={strokeColor} />
  </svg>
);

/**
 * Geometric SVG motif: Parallel Tracks with sleepers
 */
export const ParallelTracksSvg: React.FC<SvgProps> = ({
  className = 'w-32 h-12',
  strokeColor = 'currentColor',
  opacity = 0.2,
}) => (
  <svg
    viewBox="0 0 120 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ opacity }}
    aria-hidden="true"
  >
    <line x1="0" y1="12" x2="120" y2="12" stroke={strokeColor} strokeWidth="2" />
    <line x1="0" y1="28" x2="120" y2="28" stroke={strokeColor} strokeWidth="2" />
    {[10, 25, 40, 55, 70, 85, 100, 115].map((x) => (
      <line key={x} x1={x} y1="8" x2={x} y2="32" stroke={strokeColor} strokeWidth="1.5" />
    ))}
  </svg>
);

/**
 * Geometric SVG motif: Signal Node / Aspect Interlock
 */
export const SignalNodeSvg: React.FC<SvgProps> = ({
  className = 'w-16 h-16',
  strokeColor = 'currentColor',
  opacity = 0.25,
}) => (
  <svg
    viewBox="0 0 60 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ opacity }}
    aria-hidden="true"
  >
    <circle cx="30" cy="30" r="22" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3 3" />
    <circle cx="30" cy="30" r="14" stroke={strokeColor} strokeWidth="2" />
    <circle cx="30" cy="30" r="5" fill={strokeColor} />
    <line x1="30" y1="2" x2="30" y2="58" stroke={strokeColor} strokeWidth="1" />
    <line x1="2" y1="30" x2="58" y2="30" stroke={strokeColor} strokeWidth="1" />
  </svg>
);

/**
 * Geometric SVG motif: Station Network Matrix / Grid
 */
export const StationGridSvg: React.FC<SvgProps> = ({
  className = 'w-24 h-24',
  strokeColor = 'currentColor',
  opacity = 0.15,
}) => (
  <svg
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ opacity }}
    aria-hidden="true"
  >
    {[15, 40, 65].map((y) => (
      <line key={`h-${y}`} x1="5" y1={y} x2="75" y2={y} stroke={strokeColor} strokeWidth="1" strokeDasharray="2 4" />
    ))}
    {[15, 40, 65].map((x) => (
      <line key={`v-${x}`} x1={x} y1="5" x2={x} y2="75" stroke={strokeColor} strokeWidth="1" strokeDasharray="2 4" />
    ))}
    <circle cx="15" cy="40" r="3" fill={strokeColor} />
    <circle cx="40" cy="15" r="3" fill={strokeColor} />
    <circle cx="65" cy="40" r="3" fill={strokeColor} />
    <circle cx="40" cy="65" r="3" fill={strokeColor} />
    <circle cx="40" cy="40" r="4" stroke={strokeColor} strokeWidth="2" />
  </svg>
);

/**
 * Geometric SVG motif: Chainage / Kilometer Datum Marker
 */
export const ChainageSvg: React.FC<SvgProps> = ({
  className = 'w-20 h-10',
  strokeColor = 'currentColor',
  opacity = 0.3,
}) => (
  <svg
    viewBox="0 0 80 30"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ opacity }}
    aria-hidden="true"
  >
    <line x1="5" y1="20" x2="75" y2="20" stroke={strokeColor} strokeWidth="2" />
    <line x1="10" y1="12" x2="10" y2="20" stroke={strokeColor} strokeWidth="1.5" />
    <line x1="25" y1="15" x2="25" y2="20" stroke={strokeColor} strokeWidth="1" />
    <line x1="40" y1="8" x2="40" y2="20" stroke={strokeColor} strokeWidth="2" />
    <line x1="55" y1="15" x2="55" y2="20" stroke={strokeColor} strokeWidth="1" />
    <line x1="70" y1="12" x2="70" y2="20" stroke={strokeColor} strokeWidth="1.5" />
    <polygon points="40,4 36,9 44,9" fill={strokeColor} />
  </svg>
);
