import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from './app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 3001;

// Standalone Production Static File Serving (Docker/VPS/Local preview, ignored when running on Vercel)
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(port, () => {
  const mode = process.env.RAILRADAR_API_KEY ? 'LIVE' : 'DEMO';
  console.log(`[Rail Samnvay Server] running on port ${port} in ${process.env.NODE_ENV || 'development'} mode.`);
  console.log(`[RailRadar Integration] running in ${mode} mode.`);
});

export default app;
