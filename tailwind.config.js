/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        debut: '#8CC63F',
        fearless: '#FFD700',
        speaknow: '#7B2D8E',
        red: '#E31B23',
        '1989': '#5BC0EB',
        reputation: '#1A1A1A',
        lover: '#FF2A5E',
        folklore: '#8A9A8B',
        evermore: '#C67B4B',
        midnights: '#1C2951',
        ttpd: '#D4C4B7',
        'tloas-orange': '#FF5E00',
        'tloas-mint': '#98FF98',
        'tloas-purple': '#9B30FF',
      },
    },
  },
  plugins: [],
}