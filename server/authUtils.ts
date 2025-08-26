import crypto from 'crypto';
import { db } from './db';
import {
  users,
  magicLinkTokens,
  userSessions,
  rateLimits,
  type User,
  type MagicLinkToken,
  type UserSession,
  type RateLimit,
} from '@shared/schema';
import { eq, and, gte, lt, sql } from 'drizzle-orm';

export function createToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateUuid(): string {
  return crypto.randomUUID();
}

export function getClientIp(request: any): string {
  if (request.headers['x-forwarded-for']) {
    return request.headers['x-forwarded-for'].split(',')[0].trim();
  }
  if (request.headers['x-real-ip']) {
    return request.headers['x-real-ip'];
  }
  return request.socket?.remoteAddress || '';
}

export async function checkRateLimit(key: string, limitPerHour: number): Promise<boolean> {
  try {
    const now = new Date();
    const windowStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      0,
      0,
      0
    );

    const [rateLimit] = await db
      .select()
      .from(rateLimits)
      .where(eq(rateLimits.key, key));

    if (!rateLimit || rateLimit.windowStart.getTime() !== windowStart.getTime()) {
      if (rateLimit) {
        await db
          .update(rateLimits)
          .set({ windowStart, count: 1 })
          .where(eq(rateLimits.key, key));
      } else {
        await db.insert(rateLimits).values({
          key,
          windowStart,
          count: 1,
        });
      }
      return true;
    }

    if (rateLimit.count >= limitPerHour) {
      return false;
    }

    await db
      .update(rateLimits)
      .set({ count: rateLimit.count + 1 })
      .where(eq(rateLimits.key, key));
    return true;
  } catch (error) {
    console.error(`Rate limit check failed for key ${key}:`, error);
    return true;
  }
}

export async function invalidatePreviousTokens(email: string): Promise<void> {
  try {
    const now = new Date();
    await db
      .update(magicLinkTokens)
      .set({ expiresAt: now })
      .where(
        and(
          eq(magicLinkTokens.email, email),
          sql`${magicLinkTokens.consumedAt} IS NULL`,
          gte(magicLinkTokens.expiresAt, now)
        )
      );
  } catch (error) {
    console.error(`Failed to invalidate previous tokens for ${email}:`, error);
  }
}

export async function getCurrentUser(request: any): Promise<User | null> {
  try {
    const sessionId = request.cookies?.sid;
    if (!sessionId) {
      return null;
    }

    const now = new Date();
    const [userSession] = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.id, sessionId),
          gte(userSessions.expiresAt, now)
        )
      );

    if (!userSession) {
      return null;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userSession.userId));

    return user || null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

export async function createSession(userId: string): Promise<{ sessionId: string; expiresAt: Date }> {
  const sessionId = createToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.insert(userSessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  return { sessionId, expiresAt };
}

export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const now = new Date();
    
    await db
      .delete(userSessions)
      .where(lt(userSessions.expiresAt, now));
    
    await db
      .delete(magicLinkTokens)
      .where(lt(magicLinkTokens.expiresAt, now));

    console.log('Cleaned up expired sessions and tokens');
  } catch (error) {
    console.error('Failed to cleanup expired data:', error);
  }
}

export function isAuthenticated(req: any, res: any, next: any) {
  getCurrentUser(req).then(user => {
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = user;
    next();
  }).catch(error => {
    console.error('Authentication error:', error);
    res.status(401).json({ message: "Unauthorized" });
  });
}