import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import railRadarRoutes from './routes/railradar.js';
import authRoutes from './routes/auth.js';
import infrastructureRoutes from './routes/infrastructure.js';
import requestsRoutes from './routes/requests.js';
import chatRoutes from './routes/chat.js';

const app = express();

// Enable JSON body parsing
app.use(express.json());

// Enable CORS for cross-origin frontend requests
app.use(cors({
  origin: true,
  credentials: true
}));

// Dedicated Router for API endpoints
const apiRouter = express.Router();

// Ensure all API responses explicitly set application/json
apiRouter.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Root API Health check
apiRouter.get('/health', (req: Request, res: Response) => {
  const hasKey = Boolean(process.env.RAILRADAR_API_KEY && process.env.RAILRADAR_API_KEY.trim().length > 5);
  res.json({
    status: 'ok',
    railradarConfigured: hasKey,
    environment: process.env.NODE_ENV || 'production',
    serverless: Boolean(process.env.VERCEL),
    timestamp: new Date().toISOString()
  });
});

// Mount modular sub-routers
apiRouter.use('/auth', authRoutes);
apiRouter.use('/railradar', railRadarRoutes);
apiRouter.use('/infrastructure', infrastructureRoutes);
apiRouter.use('/requests', requestsRoutes);
apiRouter.use('/chat', chatRoutes);

// Mount router on both '/api' and '/' to ensure full compatibility with Vercel rewrites
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Fallback JSON 404 handler for any unmapped API routes — NEVER return HTML for API calls
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    code: 'API_ENDPOINT_NOT_FOUND',
    path: req.originalUrl || req.url,
    timestamp: new Date().toISOString()
  });
});

// Global JSON error handler — ALWAYS return JSON
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[API Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err?.message || 'Internal server error',
    code: err?.code || 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString()
  });
});

export { app };
export default app;
