/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { ink: '#0a0a0a', paper: '#f4f1ea', vermilion: '#e60026', chrome: '#c9ccd1' },
      fontFamily: {
        display: ['"Cinzel Decorative"', 'Georgia', 'serif'],
        mincho: ['"Shippori Mincho"', '"Hiragino Mincho ProN"', '"Yu Mincho"', 'serif']
      }
    }
  },
  plugins: []
}
