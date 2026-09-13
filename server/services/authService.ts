import crypto from 'crypto';
import { AUTHORIZED_PERSONNEL, StoredUser } from '../data/users.js';

export interface AuthenticatedUser {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  role: string;
  avatarInitials: string;
  permissions: string[];
  authenticated: true;
}

export interface Session {
  token: string;
  user: AuthenticatedUser;
  createdAt: number;
  expiresAt: number;
}

// In-memory session store (valid for 12 hours)
const SESSIONS = new Map<string, Session>();
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function authenticate(employeeId: string, password: string): { success: true; session: Session } | { success: false; error: string } {
  if (!employeeId || !password) {
    return { success: false, error: 'Email / Employee ID and password are required' };
  }

  const cleanInput = employeeId.trim().toLowerCase();
  const user = AUTHORIZED_PERSONNEL.find(u => 
    u.employeeId.toLowerCase() === cleanInput || 
    (u.email && u.email.toLowerCase() === cleanInput)
  );

  if (!user || user.passwordHash !== password.trim()) {
    console.warn(`[Auth] Failed authentication attempt for identifier: ${cleanInput}`);
    return { success: false, error: 'Invalid Official Email / Employee ID or password' };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const session: Session = {
    token,
    user: {
      id: user.employeeId,
      employeeId: user.employeeId,
      name: user.name,
      designation: user.designation,
      department: user.department,
      role: user.role,
      avatarInitials: user.avatarInitials,
      permissions: user.permissions,
      authenticated: true
    },
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS
  };

  SESSIONS.set(token, session);
  console.log(`[Auth] Session established for ${user.employeeId} (${user.name}, ${user.role})`);
  return { success: true, session };
}

export function validateSession(token: string): AuthenticatedUser | null {
  if (!token) return null;
  const session = SESSIONS.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    SESSIONS.delete(token);
    console.log(`[Auth] Expired session purged for ${session.user.employeeId}`);
    return null;
  }

  return session.user;
}

export function destroySession(token: string): boolean {
  if (!token) return false;
  const existed = SESSIONS.delete(token);
  if (existed) {
    console.log('[Auth] Session destroyed successfully');
  }
  return existed;
}
