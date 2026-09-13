// Client service for Indian Railways Authentication (Universal: Works on Localhost + Vercel)
import type { User, UserRole } from '../types/samnvay';

const SESSION_STORAGE_KEY = 'rail_samnvay_session_token';
const SESSION_USER_KEY = 'rail_samnvay_session_user';

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

export interface SessionResponse {
  success: boolean;
  authenticated: boolean;
  user?: User;
  error?: string;
}

// Client-side fallback directory for Vercel static deployments
const FALLBACK_PERSONNEL: Array<User & { email: string; passwordHash: string }> = [
  {
    id: 'u-1',
    employeeId: 'EMP-IR-001',
    email: 'pcom.bza@railnet.gov.in',
    passwordHash: 'RailSamnvay@2026',
    name: 'V. Ramanathan',
    designation: 'Principal Chief Operations Manager (PCOM)',
    department: 'All',
    role: 'MASTER',
    avatarInitials: 'VR',
    permissions: ['all', 'overview', 'requests', 'approval', 'planning', 'conflict', 'execution', 'communication', 'audit', 'live-trains']
  },
  {
    id: 'u-2',
    employeeId: 'EMP-IR-104',
    email: 'planning.dom@railnet.gov.in',
    passwordHash: 'RailSamnvay@2026',
    name: 'M. K. Rao',
    designation: 'Senior Divisional Operations Manager (Planning)',
    department: 'Operations',
    role: 'Planning Officer',
    avatarInitials: 'MR',
    permissions: ['overview', 'requests', 'planning', 'conflict', 'execution', 'communication']
  },
  {
    id: 'u-3',
    employeeId: 'EMP-IR-210',
    email: 'control.bza@railnet.gov.in',
    passwordHash: 'RailSamnvay@2026',
    name: 'P. Murthy',
    designation: 'Chief Controller / Section Controller (BZA)',
    department: 'Operations',
    role: 'COA / Operations',
    avatarInitials: 'PM',
    permissions: ['overview', 'live-trains', 'conflict', 'execution', 'communication']
  },
  {
    id: 'u-3b',
    employeeId: 'EMP-IR-211',
    email: 'controller.bza@railnet.gov.in',
    passwordHash: 'RailSamnvay@2026',
    name: 'Section Controller BZA',
    designation: 'Section Train Controller (BZA Division)',
    department: 'Operations',
    role: 'Section Controller',
    avatarInitials: 'SC',
    permissions: ['overview', 'live-trains', 'conflict', 'execution', 'communication']
  },
  {
    id: 'u-4',
    employeeId: 'EMP-IR-301',
    email: 'pway.den@railnet.gov.in',
    passwordHash: 'RailSamnvay@2026',
    name: 'A. K. Sharma',
    designation: 'Senior Divisional Engineer (Coordination / P.Way)',
    department: 'P.Way',
    role: 'P.Way Engineer',
    avatarInitials: 'AS',
    permissions: ['overview', 'requests', 'execution', 'communication']
  },
  {
    id: 'u-5',
    employeeId: 'EMP-IR-402',
    email: 'snt.dste@railnet.gov.in',
    passwordHash: 'RailSamnvay@2026',
    name: 'Rajesh Verma',
    designation: 'Senior Divisional Signal & Telecom Engineer (Sr. DSTE)',
    department: 'S&T',
    role: 'S&T Engineer',
    avatarInitials: 'RV',
    permissions: ['overview', 'requests', 'execution', 'communication']
  },
  {
    id: 'u-6',
    employeeId: 'EMP-IR-503',
    email: 'trd.dee@railnet.gov.in',
    passwordHash: 'RailSamnvay@2026',
    name: 'S. K. Nair',
    designation: 'Senior Divisional Electrical Engineer (Sr. DEE / TRD)',
    department: 'TRD',
    role: 'TRD Engineer',
    avatarInitials: 'SN',
    permissions: ['overview', 'requests', 'execution', 'communication']
  }
];

export function getStoredSessionToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredSessionToken(token: string): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, token);
  } catch {}
}

export function clearStoredSessionToken(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
  } catch {}
}

export function getStoredSessionUser(): User | null {
  try {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredSessionUser(user: User): void {
  try {
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  } catch {}
}

/**
 * Universal authentication: attempts backend `/api/auth/login` first.
 * If backend is unreachable (e.g. static Vercel frontend without Node server),
 * seamlessly authenticates against the authorized roster.
 */
export async function authenticateEmployee(employeeId: string, password: string): Promise<LoginResponse> {
  const cleanInput = employeeId.trim().toLowerCase();
  const cleanPassword = password.trim();

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ employeeId, password })
    });

    // If server returned valid JSON
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        if (data.token) setStoredSessionToken(data.token);
        setStoredSessionUser(data.user);
        return {
          success: true,
          token: data.token,
          user: data.user
        };
      } else {
        return {
          success: false,
          error: data.error || 'Invalid credentials. Please verify your email / Employee ID.'
        };
      }
    }
  } catch {
    // Backend unreachable (e.g. running on Vercel static hosting)
  }

  // Fallback: Validate credentials against official authorized roster
  const matchedUser = FALLBACK_PERSONNEL.find(u => 
    u.employeeId.toLowerCase() === cleanInput || 
    (u.email && u.email.toLowerCase() === cleanInput)
  );

  if (!matchedUser || matchedUser.passwordHash !== cleanPassword) {
    return {
      success: false,
      error: 'Invalid Official Email / Employee ID or password'
    };
  }

  const userObj: User = {
    id: matchedUser.id,
    employeeId: matchedUser.employeeId,
    name: matchedUser.name,
    designation: matchedUser.designation,
    department: matchedUser.department,
    role: matchedUser.role,
    avatarInitials: matchedUser.avatarInitials,
    permissions: matchedUser.permissions
  };

  const syntheticToken = `session_${Date.now()}_${matchedUser.employeeId}`;
  setStoredSessionToken(syntheticToken);
  setStoredSessionUser(userObj);

  return {
    success: true,
    token: syntheticToken,
    user: userObj
  };
}

/**
 * Check active session with backend or local secure session
 */
export async function verifyCurrentSession(): Promise<SessionResponse> {
  const token = getStoredSessionToken();
  const cachedUser = getStoredSessionUser();

  if (!token) {
    return { success: false, authenticated: false };
  }

  try {
    const res = await fetch('/api/auth/session', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.authenticated && data.user) {
        setStoredSessionUser(data.user);
        return {
          success: true,
          authenticated: true,
          user: data.user
        };
      }
    }
  } catch {
    // Backend offline / Vercel static mode
  }

  // If we have cached session user, retain operational session
  if (cachedUser) {
    return {
      success: true,
      authenticated: true,
      user: cachedUser
    };
  }

  clearStoredSessionToken();
  return { success: false, authenticated: false };
}

/**
 * Invalidate session on the backend and clear local session state
 */
export async function logoutEmployee(): Promise<void> {
  const token = getStoredSessionToken();
  clearStoredSessionToken();

  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch {}
  }
}
