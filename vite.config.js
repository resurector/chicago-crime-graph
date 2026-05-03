import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// IMPORTANT for GitHub Pages: set this to '/<repo-name>/'
// Override at build time with: VITE_BASE=/your-repo/ npm run build
const base = process.env.VITE_BASE || '/chicago-crime-graph/';

export default defineConfig({
  plugins: [react()],
  base,
});
