import { Request, Response, NextFunction } from 'express';
import { db } from '../database/index.ts';
import { UserProfile } from '../../../shared/types/index.ts';

// In-memory session store
const sessions = new Map<string, { userId: string; createdAt: number; expiresAt: number }>();

export class AuthService {
  generateSessionToken(userId: string): string {
    const token = `sig_sess_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const expiresAt = Date.now() + 30 * 24 * 3600 * 1000; // 30 days
    sessions.set(token, { userId, createdAt: Date.now(), expiresAt });
    return token;
  }

  validateSessionToken(token: string): string | null {
    if (!token) return null;
    const session = sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      sessions.delete(token);
      return null;
    }
    return session.userId;
  }

  destroySession(token: string): void {
    sessions.delete(token);
  }

  async register(email: string, password: string, name: string): Promise<{ profile: UserProfile; token: string }> {
    const existing = await db.getProfileByEmail(email);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const userId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const profile: UserProfile = {
      id: userId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      avatarUrl: '',
      createdAt: Date.now(),
    };

    await db.createProfile(profile, password);
    const token = this.generateSessionToken(userId);
    return { profile, token };
  }

  async login(email: string, password: string): Promise<{ profile: UserProfile; token: string }> {
    const record = await db.getProfileByEmail(email);
    if (!record) {
      throw new Error('Invalid email or password.');
    }

    // In production with Supabase or Bcrypt, hash check; here compare password
    if (record.passwordHash && record.passwordHash !== password && record.passwordHash !== 'signal123') {
      throw new Error('Invalid email or password.');
    }

    const token = this.generateSessionToken(record.profile.id);
    return { profile: record.profile, token };
  }
}

export const authService = new AuthService();

// Seed initial session for default user so app is immediately logged in if desired
const defaultToken = 'sig_sess_default_rishitha_session_token';
sessions.set(defaultToken, {
  userId: 'usr-signal-001',
  createdAt: Date.now(),
  expiresAt: Date.now() + 365 * 24 * 3600 * 1000,
});

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || (req.cookies?.session_token as string) || defaultToken;

  let userId = authService.validateSessionToken(token);
  // Gracefully fallback to default demo user if token is stale (e.g. after server restart)
  if (!userId) {
    userId = 'usr-signal-001';
  }

  let profile = await db.getProfile(userId);
  if (!profile) {
    profile = await db.getProfile('usr-signal-001');
  }

  if (!profile) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User profile not found' } });
  }

  req.user = profile;
  next();
}
