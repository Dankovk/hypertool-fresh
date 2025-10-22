import { Hono } from 'hono';
import { z } from 'zod';
import JSZip from 'jszip';

const app = new Hono();

const FileMapSchema = z.record(z.string());

app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = FileMapSchema.safeParse(body.files);

    if (!parsed.success) {
      return c.json({ error: 'Invalid files' }, 400);
    }

    const files = parsed.data;

    const zip = new JSZip();
    for (const [path, content] of Object.entries(files)) {
      const cleanPath = path.replace(/^\//, '');
      zip.file(cleanPath, content);
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });

    return c.body(buffer, 200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename=project.zip',
    });
  } catch (error: any) {
    return c.json({ error: error?.message ?? 'Failed to create zip' }, 500);
  }
});

export default app;
