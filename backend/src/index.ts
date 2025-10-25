import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { connectToDatabase } from './lib/database.js';

// Import routes
import boilerplate from './routes/boilerplate.js';
import download from './routes/download.js';
import runtimeWatch from './routes/runtime-watch.js';
import runtimeWatchSnapshot from './routes/runtime-watch-snapshot.js';
import ai from './routes/ai.js';
import aiStream from './routes/ai-stream.js';
import history from './routes/history.js';
import sessions from './routes/sessions.js';

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
app.route('/api/sessions', sessions);

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
  // Initialize database connection
  connectToDatabase()
    .then(() => {
      console.log('✅ Database connection initialized');
    })
    .catch((error) => {
      console.error('⚠️  Database connection failed:', error.message);
      console.log('   Server will continue without database support');
    });

  console.log(`🚀 Server running at http://localhost:${port}`);
}
