/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <-- Dark Mode'un çalışması için bu satır eklendi
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}