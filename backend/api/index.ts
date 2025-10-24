import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Import routes
import boilerplate from '../src/routes/boilerplate.js';
import download from '../src/routes/download.js';
import runtimeWatch from '../src/routes/runtime-watch.js';
import runtimeWatchSnapshot from '../src/routes/runtime-watch-snapshot.js';
import ai from '../src/routes/ai.js';
import aiStream from '../src/routes/ai-stream.js';
import history from '../src/routes/history.js';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/', (c) => c.json({ status: 'ok', message: 'Hypertool Backend API' }));

// Routes
app.route('/boilerplate', boilerplate);
app.route('/download', download);
app.route('/runtime-watch', runtimeWatch);
app.route('/runtime-watch/snapshot', runtimeWatchSnapshot);
app.route('/ai', ai);
app.route('/ai/stream', aiStream);
app.route('/history', history);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// Export for Vercel
export default app.fetch;
