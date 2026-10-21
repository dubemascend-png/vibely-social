import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: { colors: { vibe: { violet: '#7257ff', coral: '#ff7b91', cyan: '#61d9e8' } } },
  plugins: [],
};
export default config;
