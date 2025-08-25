import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'lax', // SECURITY: Add SameSite protection against CSRF
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());



  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Find the right strategy based on hostname or use the first available
    const domains = process.env.REPLIT_DOMAINS!.split(",");
    const strategyDomain = domains.includes(req.hostname) ? req.hostname : domains[0];
    
    passport.authenticate(`replitauth:${strategyDomain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    // Find the right strategy based on hostname or use the first available
    const domains = process.env.REPLIT_DOMAINS!.split(",");
    const strategyDomain = domains.includes(req.hostname) ? req.hostname : domains[0];
    
    passport.authenticate(`replitauth:${strategyDomain}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

// SECURITY: Improved token refresh with better race condition handling
interface RefreshState {
  promise: Promise<void>;
  timestamp: number;
}
const refreshStates = new Map<string, RefreshState>();

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  const buffer = 60; // 60 second buffer before token expiry
  
  if (now <= (user.expires_at - buffer)) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // SECURITY: More robust user ID extraction and validation
  const userId = user.claims?.sub || user.id;
  if (!userId || typeof userId !== 'string') {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const currentTime = Date.now();
  const existingState = refreshStates.get(userId);
  
  // If there's an ongoing refresh that's not too old, wait for it
  if (existingState && (currentTime - existingState.timestamp) < 30000) {
    try {
      await existingState.promise;
      return next();
    } catch (error) {
      // Clean up failed refresh
      refreshStates.delete(userId);
      return res.status(401).json({ message: "Unauthorized" });
    }
  }

  // SECURITY: Create new refresh with timeout and proper error handling
  const refreshPromise = new Promise<void>(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Token refresh timeout'));
    }, 10000); // 10 second timeout

    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
      clearTimeout(timeoutId);
      resolve();
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });

  // Clean up the promise after completion (success or failure)
  refreshPromise.finally(() => {
    refreshStates.delete(userId);
  });

  refreshStates.set(userId, {
    promise: refreshPromise,
    timestamp: currentTime
  });

  try {
    await refreshPromise;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
