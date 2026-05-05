export default {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Source Sans Pro"', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['"Source Serif 4"', 'Georgia', 'Times New Roman', 'serif'],
      },
      colors: {
        primary: { DEFAULT: '#3E35A5', light: '#4d43cd', muted: '#2d277a' },
        teal: { DEFAULT: '#00d084', soft: '#ecf4f1' },
        accent: { DEFAULT: '#e21e5a', light: '#f7477c' },
        success: '#166534',
        warning: '#9a3412',
        danger: '#e21e5a',
        ink: '#3F3F3F',
        canvas: '#F7F7F7',
      },
      backgroundImage: {
        'btn-gradient': 'linear-gradient(45deg, #ef295d, #a22891)',
        'btn-gradient-hover': 'linear-gradient(45deg, #f14271, #af339d)',
      }
    },
  },
  plugins: [],
}
