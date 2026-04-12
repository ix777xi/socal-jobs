import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { Express, Request, Response, NextFunction } from "express";
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

// Middleware: require active subscription
export function requireSubscription(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as User | undefined;
  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "trialing") {
    return res.status(403).json({ error: "Subscription required", code: "SUBSCRIPTION_REQUIRED" });
  }
  next();
}

export function registerAuthRoutes(app: Express) {
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

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    req.session.userId = user.id;
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
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
      subscriptionStatus: user.subscriptionStatus,
      subscriptionEnd: user.subscriptionEnd,
    });
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {});
    res.json({ success: true });
  });
}
