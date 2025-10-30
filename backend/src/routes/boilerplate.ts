import { Hono } from 'hono';
import { createLogger } from '../lib/logger.js';
import { loadBoilerplateFromConvex, listAvailablePresetsFromConvex } from '../lib/boilerplate.js';

const app = new Hono();

app.get('/', async (c) => {
  const requestId = `boilerplate-get-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const logger = createLogger('api/boilerplate', requestId);

  try {
    const presetId = c.req.query('preset');
    const action = c.req.query('action');

    if (action === 'list') {
      try {
        const presets = await listAvailablePresetsFromConvex();
        logger.info('Presets retrieved from Convex', { count: presets.length });
        return c.json({ presets });
      } catch (error: any) {
        logger.error('Failed to load presets from Convex', { error: error?.message });
        return c.json({ error: error?.message ?? 'Failed to load presets' }, 500);
      }
    }

    // Get boilerplate files from Convex DB
    const targetPresetId = presetId || 'universal';
    
    try {
      const files = await loadBoilerplateFromConvex(targetPresetId);
      logger.info('Boilerplate retrieved from Convex', { presetId: targetPresetId });
      return c.json({ files });
    } catch (error: any) {
      logger.error('Failed to load boilerplate from Convex', {
        error: error?.message,
        presetId: targetPresetId
      });
      return c.json({ error: error?.message ?? 'Failed to load boilerplate' }, 500);
    }
  } catch (error: any) {
    logger.error('Failed to handle boilerplate request', error);
    return c.json({ error: error?.message ?? 'Failed to read boilerplate' }, 500);
  }
});

export default app;
