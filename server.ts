import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './backend/src/api/routes.ts';
import { marketWsServer } from './backend/src/websocket/server.ts';
import { marketManager } from './backend/src/market/manager.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser middleware
  app.use(express.json());

  // CORS headers for local / iframe preview
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Mount API routes
  app.use('/api', apiRouter);

  // Create HTTP server for both Express and WebSocket
  const server = http.createServer(app);

  // Initialize WebSocket server on /ws/market
  marketWsServer.init(server);

  // Start background Market Feed / Replay Engine
  try {
    await marketManager.start();
  } catch (err) {
    console.warn('[Server] Error during market manager start:', err);
  }

  // Vite middleware in dev mode, or static file serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(` SIGNAL Engine & Server is live on http://0.0.0.0:${PORT}`);
    console.log(` WebSocket feed accessible at ws://0.0.0.0:${PORT}/ws/market`);
    console.log(` Mode: ${marketManager.getMode()}`);
    console.log(`=======================================================`);
  });
}

startServer().catch((err) => {
  console.error('[Server Fatal Startup Error]:', err);
  process.exit(1);
});
