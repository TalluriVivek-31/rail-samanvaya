/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        railway: {
          forest: '#14342B',
          forestDark: '#0D241E',
          forestDeep: '#081713',
          forestLight: '#1E483D',
          signalGreen: '#059669',
          signalGreenLight: '#10B981',
          safetyAmber: '#D97706',
          safetyAmberLight: '#F59E0B',
          operationalRed: '#DC2626',
          operationalRedLight: '#EF4444',
          canvas: '#F7F8F5',
          canvasMuted: '#EEF2EB',
          surface: '#FFFFFF',
          surfaceElevated: '#FCFDFB',
          border: '#E3E7DF',
          borderLight: '#EDF0EB',
          borderDark: '#CCD3C7',
          textPrimary: '#111827',
          textSecondary: '#4B5563',
          textMuted: '#6B7280',
        },
        samnvay: {
          bg: '#07111F',
          secondary: '#0B1726',
          surface: '#101F31',
          elevated: '#14263A',
          border: '#1A2E46',
          borderLight: '#243D5B',
          red: '#D83A3A',
          green: '#27C77A',
          amber: '#F4B740',
          blue: '#3B82F6',
          cyan: '#22D3EE',
          textPrimary: '#F4F7FA',
          textSecondary: '#A9B7C7',
          textMuted: '#657589',
        }
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '28px',
        '5xl': '32px',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      animation: {
        'marquee': 'marquee 28s linear infinite',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      }
    },
  },
  plugins: [],
}
