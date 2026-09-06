/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // NBA brand
        navy:  { DEFAULT: '#1D428A', 50:'#E8EEF9', 200:'#93AEE0', 400:'#3D63B4', 600:'#183A78', 800:'#0F2350' },
        rouge: { DEFAULT: '#C8102E', 400:'#E24157', 600:'#A00D25' },
        // surfaces (dark-first)
        ink:   { 900:'#05070F', 850:'#080C18', 800:'#0B1120', 700:'#101A33', 600:'#16233F', 500:'#1E2E4F' },
        // chart series — validated against the #101A33 surface, see docs/design.md
        series:{ 1:'#3B82F6', 2:'#E5484D', 3:'#12A594', 4:'#BC8000', 5:'#8B7BE8', 6:'#E255A1' },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'Oswald', 'Impact', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow:      '0 0 0 1px rgba(59,130,246,.25), 0 8px 40px -8px rgba(29,66,138,.65)',
        'glow-red':'0 0 0 1px rgba(200,16,46,.35), 0 8px 40px -8px rgba(200,16,46,.55)',
        card:      '0 1px 0 0 rgba(255,255,255,.06) inset, 0 24px 60px -24px rgba(0,0,0,.9)',
      },
      backgroundImage: {
        'court': 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(29,66,138,.35), transparent 60%)',
        'streak': 'linear-gradient(100deg, transparent 30%, rgba(255,255,255,.18) 50%, transparent 70%)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(59,130,246,.45)' },
          '50%':     { boxShadow: '0 0 0 14px rgba(59,130,246,0)' },
        },
        riseIn: { '0%': { opacity: '0', transform: 'translateY(14px)' }, '100%': { opacity: '1', transform: 'none' } },
        spinSlow: { to: { transform: 'rotate(360deg)' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        sweep: { '0%': { backgroundPosition: '0% 50%' }, '100%': { backgroundPosition: '200% 50%' } },
      },
      animation: {
        shimmer: 'shimmer 2.2s linear infinite',
        pulseGlow: 'pulseGlow 2.4s ease-out infinite',
        riseIn: 'riseIn .5s cubic-bezier(.22,1,.36,1) both',
        spinSlow: 'spinSlow 9s linear infinite',
        marquee: 'marquee 60s linear infinite',
        floaty: 'floaty 4s ease-in-out infinite',
        sweep: 'sweep 6s linear infinite',
      },
    },
  },
  plugins: [],
}
