/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design.md §2 tokens — exact values, no deviation
        bg: '#F7F7F9',
        surface: '#FFFFFF',
        'surface-sunk': '#F1F0F4',
        ink: '#1C1C1C',
        'ink-2': '#686B78',
        line: '#E9E9EB',
        accent: '#FC8019',
        'accent-ink': '#B24E00',
        'accent-soft': '#FFF3E8',
        ok: '#1BA672',
        'ok-soft': '#EAF7F1',
        warn: '#C77400',
        'warn-soft': '#FFF6E5',
        bad: '#D7263D',
        'bad-soft': '#FDECEF',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Archivo"', 'sans-serif'],
      },
      borderRadius: {
        lg: '16px',
        md: '12px',
        pill: '999px',
      },
      fontSize: {
        display: ['28px', { lineHeight: '34px', letterSpacing: '-0.02em' }],
        title: ['20px', { lineHeight: '28px' }],
        body: ['16px', { lineHeight: '24px' }],
        meta: ['12px', { lineHeight: '16px', letterSpacing: '0.09em' }],
      },
    },
  },
  plugins: [],
};
