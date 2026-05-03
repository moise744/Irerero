export default {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['"Source Serif 4"', 'Georgia', 'Times New Roman', 'serif'],
      },
      colors: {
        primary: { DEFAULT: '#0f2d26', light: '#134e4a', muted: '#2d6a4f' },
        teal: { DEFAULT: '#0f766e', soft: '#ecf4f1' },
        success: '#166534',
        warning: '#9a3412',
        danger: '#991b1b',
        ink: '#1c1917',
      },
    },
  },
  plugins: [],
}
