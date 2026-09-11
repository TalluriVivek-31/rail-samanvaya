import { Router, Request, Response } from 'express';
import { authenticate, validateSession, destroySession } from '../services/authService.js';

const router = Router();

// POST /api/auth/login
router.post('/login', (req: Request, res: Response): void => {
  try {
    const { employeeId, password } = req.body || {};
    const result = authenticate(employeeId, password);

    if (!result.success) {
      res.status(401).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.json({
      success: true,
      token: result.session.token,
      expiresAt: new Date(result.session.expiresAt).toISOString(),
      user: result.session.user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Auth Error]', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/auth/session
router.get('/session', (req: Request, res: Response): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({
        success: false,
        authenticated: false,
        error: 'No active session token provided',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const user = validateSession(token);

    if (!user) {
      res.status(401).json({
        success: false,
        authenticated: false,
        error: 'Session has expired or is invalid. Please sign in again.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.json({
      success: true,
      authenticated: true,
      user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Auth Error]', error);
    res.status(500).json({
      success: false,
      authenticated: false,
      error: 'Error validating session',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      destroySession(token);
    }

    res.json({
      success: true,
      message: 'Logged out successfully. Session invalidated.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Auth Error]', error);
    res.status(500).json({
      success: false,
      error: 'Error processing logout',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
