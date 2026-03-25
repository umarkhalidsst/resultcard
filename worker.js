import { Hono } from 'hono';

const app = new Hono();

// Example API route
app.get('/api/hello', (c) => {
  return c.json({ message: 'API is running' });
});

export default app;