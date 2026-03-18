/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: '#201e27',
        'sidebar-deep': '#1a1820',
        'sidebar-card': '#252330',
        'sidebar-hover': '#2d2b3a',
        chat: '#1e1c2a',
        'chat-msg-user': '#2e2b3e',
        'chat-msg-ai': '#252233',
        'chat-input': '#2a2838',
        accent: '#9880cc',
        'accent-light': '#c8b8e8',
        main: '#f5f4f0',
        'event-pink': '#dba8ef',
        'event-green': '#86d9a8',
        'event-blue': '#90bbec',
        'event-amber': '#ecc96a',
        'event-gray': '#c0c0c0',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        display: ['"DM Serif Display"', 'serif'],
      },
    },
  },
  plugins: [],
}
