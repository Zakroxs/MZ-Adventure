/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        parchment: '#F4ECD8',
        ink: '#2A2520',
        olive: '#2F3D29',
        gold: '#C9A227',
      },
      fontFamily: {
        display: ['"Baskervville SC"', 'serif'],
        body: ['"Libre Baskerville"', 'serif'],
      },
      borderRadius: { lg: '0.1875rem', md: '0.1875rem', sm: '0.125rem' },
      boxShadow: {
        gold: '0 0 12px hsl(45 65% 52% / 0.15)',
      },
    },
  },
  plugins: [],
};
