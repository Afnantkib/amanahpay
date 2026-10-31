import type { Config } from 'tailwindcss';
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--border)',
        emerald: 'var(--primary)',
      },
      borderRadius: { card: '16px' },
    },
  },
  plugins: [],
} satisfies Config;
