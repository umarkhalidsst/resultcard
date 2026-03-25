import { Hono } from 'hono';

const app = new Hono();

app.get('/api/status', (c) => {
  return c.json({ status: 'ok', message: 'School Result Card System Active' });
});

export default app;