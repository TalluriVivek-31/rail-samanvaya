// Client service for Indian Railways Backend Authentication
import type { User } from '../types/samnvay';

const SESSION_STORAGE_KEY = 'rail_samnvay_session_token';

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

/**
 * Get active session token from sessionStorage
 */
export function getStoredSessionToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Store session token in sessionStorage
 */
export function setStoredSessionToken(token: string): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, token);
  } catch {}
}

/**
 * Clear session token from storage
 */
export function clearStoredSessionToken(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {}
}

/**
 * Authenticate against the backend with Employee ID and Password
 */
export async function authenticateEmployee(employeeId: string, password: string): Promise<LoginResponse> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ employeeId, password })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Authentication failed. Please verify credentials.'
      };
    }

    if (data.token) {
      setStoredSessionToken(data.token);
    }

    return {
      success: true,
      token: data.token,
      user: data.user
    };
  } catch (err) {
    return {
      success: false,
      error: 'Unable to connect to Railway Authentication Gateway'
    };
  }
}

/**
 * Check active session with the backend using the stored session token
 */
export async function verifyCurrentSession(): Promise<SessionResponse> {
  const token = getStoredSessionToken();
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

    if (!res.ok) {
      clearStoredSessionToken();
      return { success: false, authenticated: false };
    }

    const data = await res.json();
    if (data.success && data.authenticated && data.user) {
      return {
        success: true,
        authenticated: true,
        user: data.user
      };
    }

    clearStoredSessionToken();
    return { success: false, authenticated: false };
  } catch {
    clearStoredSessionToken();
    return { success: false, authenticated: false };
  }
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
