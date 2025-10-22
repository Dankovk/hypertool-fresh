import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Import routes
import boilerplate from './routes/boilerplate';
import download from './routes/download';
import runtimeWatch from './routes/runtime-watch';
import runtimeWatchSnapshot from './routes/runtime-watch-snapshot';
import ai from './routes/ai';
import history from './routes/history';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/', (c) => c.json({ status: 'ok', message: 'Hypertool Backend API' }));

// Routes
app.route('/api/boilerplate', boilerplate);
app.route('/api/download', download);
app.route('/api/runtime-watch', runtimeWatch);
app.route('/api/runtime-watch/snapshot', runtimeWatchSnapshot);
app.route('/api/ai', ai);
app.route('/api/history', history);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;

// For local development with Bun
if (import.meta.main) {
  const port = process.env.PORT || 3001;
  console.log(`🚀 Server running at http://localhost:${port}`);

  Bun.serve({
    port,
    fetch: app.fetch,
  });
}
