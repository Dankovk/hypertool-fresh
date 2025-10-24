import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Import routes
import boilerplate from './routes/boilerplate.ts';
import download from './routes/download.ts';
import runtimeWatch from './routes/runtime-watch.ts';
import runtimeWatchSnapshot from './routes/runtime-watch-snapshot.ts';
import ai from './routes/ai.ts';
import aiStream from './routes/ai-stream.ts';
import history from './routes/history.ts';

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
app.route('/api/ai/stream', aiStream);
app.route('/api/history', history);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// Export the Hono app
export default app;

// Start server when run directly
const port = parseInt(process.env.PORT || '3001', 10);

if (import.meta.main) {
  console.log(`🚀 Server running at http://localhost:${port}`);
}
