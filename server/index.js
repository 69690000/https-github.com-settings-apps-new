import express from 'express';
import './db.js';
import poolRoutes from './routes/pool.js';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/account.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api', poolRoutes);
app.use('/api', authRoutes);
app.use('/api', accountRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side' });
});

const port = Number(process.env.PORT) || 8000;
app.listen(port, '0.0.0.0', () => {
  console.log(`CloverPool API listening on ${port}`);
});
