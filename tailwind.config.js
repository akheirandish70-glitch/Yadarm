
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { iransans: ['IRANSansX','ui-sans-serif','system-ui'] }
    }
  },
  plugins: [require('@tailwindcss/line-clamp')],
}
