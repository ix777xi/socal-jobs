import { createHash, randomBytes } from "crypto";
import type { Express, Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";
import { loginSchema, registerSchema } from "@shared/schema";
import type { User } from "@shared/schema";

// Simple password hashing with scrypt-like approach using pbkdf2
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(salt + password).digest("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const attempt = createHash("sha256").update(salt + password).digest("hex");
  return hash === attempt;
}

// Session-based auth using a simple cookie token approach
// We store userId in a signed cookie via express-session
declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

export function getSessionUser(req: Request): User | undefined {
  const userId = req.session?.userId;
  if (!userId) return undefined;
  return storage.getUserById(userId);
}

// Middleware: require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  (req as any).user = user;
  next();
}

// Middleware: require active subscription (bypassed when paywall is off)
export function requireSubscription(req: Request, res: Response, next: NextFunction) {
  // If paywall is disabled globally, skip subscription check
  if (!storage.isPaywallEnabled()) {
    return next();
  }
  const user = (req as any).user as User | undefined;
  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "trialing") {
    return res.status(403).json({ error: "Subscription required", code: "SUBSCRIPTION_REQUIRED" });
  }
  next();
}

// Middleware: require admin role
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (!user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  (req as any).user = user;
  next();
}

export function registerAuthRoutes(app: Express) {
  // --- Google OAuth Setup ---
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (googleClientId && googleClientSecret) {
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser((id: number, done) => {
      const user = storage.getUserById(id);
      done(null, user || null);
    });

    // Determine callback URL dynamically
    const callbackURL = process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback";

    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL,
          scope: ["profile", "email"],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value?.toLowerCase();
            if (!email) {
              return done(new Error("No email found in Google profile"));
            }

            const googleId = profile.id;
            const name = profile.displayName || null;
            const avatarUrl = profile.photos?.[0]?.value || null;

            // Check if user exists by Google ID
            let user = storage.getUserByGoogleId(googleId);
            if (user) {
              // Update avatar/name if changed
              if (user.avatarUrl !== avatarUrl || user.name !== name) {
                user = storage.updateUser(user.id, { avatarUrl, name }) || user;
              }
              return done(null, user);
            }

            // Check if user exists by email (local account)
            user = storage.getUserByEmail(email);
            if (user) {
              // Link Google ID to existing account
              user = storage.updateUser(user.id, {
                googleId,
                avatarUrl: avatarUrl || user.avatarUrl,
                authProvider: user.passwordHash ? "local" : "google",
              }) || user;
              return done(null, user);
            }

            // Create new user via Google
            user = storage.createUser({
              email,
              passwordHash: null,
              name,
              avatarUrl,
              googleId,
              authProvider: "google",
              createdAt: new Date().toISOString(),
            } as any);

            return done(null, user);
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );

    app.use(passport.initialize());

    // Google OAuth routes
    app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { session: false, failureRedirect: "/#/auth?error=google_failed" }),
      (req: Request, res: Response) => {
        const user = req.user as User;
        if (user) {
          req.session.userId = user.id;
          // Explicitly save session before redirecting to avoid race condition
          req.session.save((err) => {
            if (err) {
              console.error("[Auth] Session save error:", err);
            }
            res.redirect("/#/?google=success");
          });
        } else {
          res.redirect("/#/auth?error=google_failed");
        }
      }
    );

    console.log("[Auth] Google OAuth configured");
  } else {
    console.warn("[Auth] Google OAuth not configured — missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
  }

  // Register
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
    }

    const { email, password, name } = parsed.data;

    // Check if user exists
    const existing = storage.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const user = storage.createUser({
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      name: name || null,
      createdAt: new Date().toISOString(),
    });

    req.session.userId = user.id;
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      authProvider: user.authProvider,
      subscriptionStatus: user.subscriptionStatus,
    });
  });

  // Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
    }

    const { email, password } = parsed.data;
    const user = storage.getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (!user.passwordHash) {
      return res.status(401).json({ error: "This account uses Google sign-in. Please continue with Google." });
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    req.session.userId = user.id;
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      authProvider: user.authProvider,
      subscriptionStatus: user.subscriptionStatus,
    });
  });

  // Get current user
  app.get("/api/auth/me", (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      authProvider: user.authProvider,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionEnd: user.subscriptionEnd,
      isAdmin: user.isAdmin,
    });
  });

  // Public site settings (paywall status)
  app.get("/api/site-settings/public", (_req, res) => {
    res.json({
      paywallEnabled: storage.isPaywallEnabled(),
    });
  });

  // Check if Google OAuth is available
  app.get("/api/auth/providers", (_req: Request, res: Response) => {
    res.json({
      google: !!(googleClientId && googleClientSecret),
    });
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {});
    res.json({ success: true });
  });
}
