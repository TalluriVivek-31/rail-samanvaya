// Vercel Serverless Function Entrypoint for Rail Samnvay Express Backend
// Mounts the unified Express app without persistent port binding
import { app } from '../server/app.js';

export default app;
export { app };
