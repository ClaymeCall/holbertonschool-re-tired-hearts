/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Contrastes vérifiés (WCAG AA minimum, AAA pour le texte courant).
        paper: '#F7F9FC',
        mist: { DEFAULT: '#E8EEF8', deep: '#BCCDEB' },
        ink: '#0F1F3D',
        muted: '#475569',
        line: '#64748B',
        brand: { DEFAULT: '#1E3A8A', dark: '#172B6B' },
        accent: { DEFAULT: '#B83B0A', soft: '#FDECE3' },
        success: { DEFAULT: '#14532D', soft: '#E6F4EA' },
        danger: { DEFAULT: '#7F1D1D', soft: '#FDECEC' },
      },
      fontFamily: {
        display: ['system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        sans: ['system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
