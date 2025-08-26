import { Request, Response, Router } from 'express';
import { db } from './db';
import {
  users,
  magicLinkTokens,
  userSessions,
  type User,
  type MagicLinkToken,
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  createToken,
  hashToken,
  generateUuid,
  getClientIp,
  checkRateLimit,
  invalidatePreviousTokens,
  createSession,
  getCurrentUser,
} from './authUtils';
import { sendMagicLinkEmail } from './emailService';

const router = Router();

const magicLinkRequestSchema = z.object({
  email: z.string().email(),
});

router.post('/api/auth/request-magic-link', async (req: Request, res: Response) => {
  try {
    const parseResult = magicLinkRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ ok: false, error: 'Invalid email address' });
    }

    const email = parseResult.data.email.toLowerCase().trim();
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    const emailKey = `send:email:${email}`;
    const ipKey = `send:ip:${clientIp}`;

    const emailAllowed = await checkRateLimit(emailKey, 3);
    const ipAllowed = await checkRateLimit(ipKey, 10);

    if (!emailAllowed || !ipAllowed) {
      return res.json({
        ok: true,
        message: "If that email is registered, we've sent a sign-in link."
      });
    }

    await invalidatePreviousTokens(email);

    const rawToken = createToken();
    const tokenHash = hashToken(rawToken);
    const tokenId = generateUuid();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.insert(magicLinkTokens).values({
      id: tokenId,
      email,
      tokenHash,
      expiresAt,
      createdIp: clientIp,
      userAgent,
    });

    // Get the proper base URL - use Replit domain in production, localhost for local dev
    let baseUrl = process.env.APP_BASE_URL;
    if (!baseUrl) {
      // Check if we're running on Replit
      if (process.env.REPLIT_DEV_DOMAIN) {
        // Use HTTPS for Replit domains
        baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
      } else {
        // Fallback to localhost for local development
        baseUrl = `http://localhost:${process.env.PORT || 5000}`;
      }
    }
    const magicLinkUrl = `${baseUrl}/api/auth/callback?token=${rawToken}`;

    const emailSent = await sendMagicLinkEmail(email, magicLinkUrl);

    if (!emailSent) {
      console.error(`Failed to send magic link email to ${email}`);
    }

    return res.json({
      ok: true,
      message: "If that email is registered, we've sent a sign-in link."
    });
  } catch (error) {
    console.error('Error in magic link request:', error);
    return res.json({
      ok: true,
      message: "If that email is registered, we've sent a sign-in link."
    });
  }
});

router.get('/api/auth/callback', async (req: Request, res: Response) => {
  try {
    const rawToken = (req.query.token as string || '').trim();
    if (!rawToken) {
      return res.redirect('/login?error=invalid');
    }

    const tokenHash = hashToken(rawToken);

    const [magicToken] = await db
      .select()
      .from(magicLinkTokens)
      .where(eq(magicLinkTokens.tokenHash, tokenHash));

    if (!magicToken) {
      return res.redirect('/login?error=invalid');
    }

    if (magicToken.consumedAt) {
      return res.redirect('/login?error=used');
    }

    if (magicToken.expiresAt < new Date()) {
      return res.redirect('/login?error=expired');
    }

    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, magicToken.email));

    if (!user) {
      const userId = generateUuid();
      const [newUser] = await db.insert(users).values({
        id: userId,
        email: magicToken.email,
      }).returning();
      user = newUser;
      console.log(`Created new user account for ${magicToken.email}`);
    }

    const { sessionId, expiresAt } = await createSession(user.id);

    await db
      .update(magicLinkTokens)
      .set({ consumedAt: new Date() })
      .where(eq(magicLinkTokens.id, magicToken.id));

    res.cookie('sid', sessionId, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    console.log(`User ${magicToken.email} successfully signed in`);
    return res.redirect('/');
  } catch (error) {
    console.error('Error in magic link callback:', error);
    return res.redirect('/login?error=error');
  }
});

router.post('/api/auth/signout', async (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies?.sid;
    if (sessionId) {
      await db.delete(userSessions).where(eq(userSessions.id, sessionId));
    }

    res.clearCookie('sid', { path: '/' });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Error during signout:', error);
    return res.status(500).json({ ok: false, error: 'Signout failed' });
  }
});

router.get('/api/auth/status', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);
    if (user) {
      return res.json({
        authenticated: true,
        email: user.email,
        user_id: user.id,
      });
    } else {
      return res.json({ authenticated: false });
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    return res.status(500).json({ authenticated: false });
  }
});

router.get('/api/auth/user', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);
    if (user) {
      return res.json(user);
    } else {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(401).json({ message: 'Unauthorized' });
  }
});

export default router;