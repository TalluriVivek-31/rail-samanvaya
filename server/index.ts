import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import railRadarRoutes from './routes/railradar.js';
import authRoutes from './routes/auth.js';
import infrastructureRoutes from './routes/infrastructure.js';
import requestsRoutes from './routes/requests.js';
import chatRoutes from './routes/chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());

if (process.env.NODE_ENV !== 'production') {
  app.use(cors({
    origin: 'http://localhost:5173'
  }));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/railradar', railRadarRoutes);
app.use('/api/infrastructure', infrastructureRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/chat', chatRoutes);

// Static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(port, () => {
  const mode = process.env.RAILRADAR_API_KEY ? 'LIVE' : 'DEMO';
  console.log(`Server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode.`);
  console.log(`RailRadar integration is running in ${mode} mode.`);
});
