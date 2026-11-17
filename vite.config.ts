import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** /api/* を SQLite から読む API として提供する */
function riftLogApi(): Plugin {
  return {
    name: 'rift-log-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        const mod = await server.ssrLoadModule('/src/server/api.ts');
        await mod.handle(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), riftLogApi()],
  server: { port: 5173, open: false },
});
