/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Nunito Sans"', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['Nunito', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['2rem', { lineHeight: '1.2', letterSpacing: '0.01em', fontWeight: '800' }],
        'display-lg': ['2.5rem', { lineHeight: '1.2', letterSpacing: '0.01em', fontWeight: '800' }],
      },
      spacing: {
        section: '5rem',
        'section-sm': '3rem',
      },
      boxShadow: {
        nav: '0 1px 0 rgba(28, 58, 44, 0.08)',
        card: 'none',
      },
      colors: {
        canvas: '#FDF6EE',
        coral: {
          DEFAULT: '#E8573A',
          hover: '#d14a2f',
          muted: '#c94a32',
        },
        forest: {
          DEFAULT: '#2D6B4F',
          deep: '#1C3A2C',
          hover: '#255a41',
        },
        amber: { DEFAULT: '#F5A462', muted: '#e08d4a' },
        sage: { DEFAULT: '#3DAF8A', muted: '#329a78' },
        surface: {
          blush: '#FCEEE7',
          mint: '#EBF7E0',
          cream: '#FEF5E4',
          flex: '#E0F5EE',
          card: '#FFFBF7',
        },
        ink: {
          DEFAULT: '#4A4A3F',
          muted: '#7A7A6E',
          placeholder: '#A8A89A',
          display: '#1C3A2C',
          section: '#2D6B4F',
        },
        border: {
          warm: '#C8C8B8',
          subtle: '#E8E4DC',
        },
        primary: {
          DEFAULT: '#E8573A',
          light: '#ec6b50',
          muted: '#c94a32',
        },
        accent: {
          DEFAULT: '#E8573A',
          light: '#ec6b50',
        },
        teal: {
          DEFAULT: '#3DAF8A',
          soft: '#EBF7E0',
        },
        danger: '#E8573A',
        success: '#2D6B4F',
        'brand-success': '#3DAF8A',
        'brand-accent': '#E8573A',
        warning: '#F5A462',
        stone: {
          50: '#FBF8F4',
          100: '#F5EFE8',
          200: '#E8E4DC',
          300: '#D4D0C4',
          400: '#A8A89A',
          500: '#7A7A6E',
          600: '#5C5A50',
          700: '#4A4A3F',
          800: '#3A3832',
          900: '#2A2824',
          950: '#1C3A2C',
        },
      },
    },
  },
  plugins: [],
}
