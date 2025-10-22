import { Hono } from 'hono';
import { loadBoilerplateFiles, listAvailablePresets } from '@/lib/boilerplate';

const app = new Hono();

app.get('/', async (c) => {
  try {
    const presetId = c.req.query('preset');
    const action = c.req.query('action');

    if (action === 'list') {
      const presets = listAvailablePresets();
      return c.json({ presets });
    }

    const files = loadBoilerplateFiles(presetId || 'circle');
    return c.json({ files });
  } catch (error: any) {
    return c.json({ error: error?.message ?? 'Failed to read boilerplate' }, 500);
  }
});

export default app;
