// Vercel Serverless Catch-All Function Entrypoint for Rail Samnvay Express Backend
// Routes all /api/* paths to the unified Express application
import { app } from '../server/app.js';

export default app;
export { app };
