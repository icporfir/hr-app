// =====================================================================
// Config Tailwind CSS — paleta de culori și extensii pentru aplicația HR
// Culoarea principală (albastru corporate) conform specificației: #1E40AF
// =====================================================================

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta principală — albastru corporate cu variații
        primary: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1E40AF', // culoarea principală (din cerință)
          800: '#1E3A8A',
          900: '#172554',
        },
        // Culori pentru status-uri
        success: '#10B981',
        warning: '#F59E0B',
        danger:  '#EF4444',
      },
      fontFamily: {
        // Fontul principal — Inter, fallback sans-serif
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        // Shadow-uri mai subtile pentru un aspect modern
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};