import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During local development you can run the Vite dev server (npm run dev:client)
// on port 5173 and the Express API on port 3000. These proxies forward API and
// OAuth calls to Express so cookies stay first-party.
//
// In production this config is only used for `vite build`; Express serves the
// built files from client/dist, so no proxy is involved.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
  },
});
