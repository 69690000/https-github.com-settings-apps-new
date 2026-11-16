import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In the sandbox the API runs as its own compose service; the dev server
// proxies /api to it so the browser only ever talks to port 3000 (one origin,
// which keeps the session cookie same-site).
const apiTarget = process.env.API_PROXY_TARGET || 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: false },
    },
  },
});
