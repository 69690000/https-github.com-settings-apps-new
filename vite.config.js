import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Sandbox preview only: the app is served on host port 3000 through an HTTPS
// proxy, so the HMR socket has to be dialled on 443 over wss. Without
// BASE44_PREVIEW_MODE=1 the dev server keeps Vite's defaults.
const previewMode = process.env.BASE44_PREVIEW_MODE === '1';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: previewMode ? { protocol: 'wss', clientPort: 443 } : undefined,
    proxy: {
      // Single origin: the browser only ever talks to the Vite dev server.
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://api:8000',
        changeOrigin: false,
      },
    },
  },
});
