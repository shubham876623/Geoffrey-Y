/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'status-pending': '#FFA500',
        'status-preparing': '#4A90E2',
        'status-ready': '#28A745',
        'status-completed': '#6C757D',
      },
    },
  },
  plugins: [],
}

