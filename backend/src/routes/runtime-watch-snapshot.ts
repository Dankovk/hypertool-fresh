import { Hono } from 'hono';
import { loadRuntimeBundles } from '../lib/boilerplate.ts';

const app = new Hono();

app.get('/', (c) => {
  if (process.env.NODE_ENV === 'production') {
    return c.json({ bundles: {} });
  }

  try {
    console.log('[snapshot] Fetching fresh runtime bundles...');
    const bundles = loadRuntimeBundles();
    const bundleKeys = Object.keys(bundles);
    const totalSize = Object.values(bundles).reduce((sum, code) => sum + code.length, 0);
    console.log(`[snapshot] Returning ${bundleKeys.length} bundles, ${totalSize} total bytes`);

    return c.json(
      { bundles },
      200,
      {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    );
  } catch (error: any) {
    console.error('[snapshot] Error loading bundles:', error);
    return c.json(
      { error: error?.message ?? 'Failed to load runtime bundles' },
      500
    );
  }
});

export default app;
