/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1f2433',
        muted: '#7c8394',
        line: '#e9edf5',
        panel: '#f8fafc',
        brand: '#8158f2',
        brandDark: '#6d45e6',
      },
      boxShadow: {
        soft: '0 16px 40px rgba(31, 36, 51, 0.08)',
      },
    },
  },
  plugins: [],
};

