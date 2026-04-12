import type { Express } from "express";
import type { Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { insertAlertSchema } from "@shared/schema";
import { seedInitialJobs, startPolling, stopPolling, isPolling, pollForNewJobs } from "./ingestion";
import { registerAuthRoutes, requireAuth, requireSubscription, getSessionUser } from "./auth";
import { registerStripeRoutes } from "./stripe";

export async function registerRoutes(server: Server, app: Express) {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "socal-jobs-session-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to true if behind HTTPS proxy
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: "lax",
      },
    })
  );

  // Auth routes (register, login, logout, me)
  registerAuthRoutes(app);

  // Stripe routes (checkout, portal, webhook)
  registerStripeRoutes(app);

  // Initialize on startup
  await seedInitialJobs();
  startPolling(30000); // 30s polling

  // ---- Jobs (public but limited for free users) ----
  app.get("/api/jobs", (req, res) => {
    const { trade, county, workType, search, urgent, saved, limit, offset } = req.query;

    const user = getSessionUser(req);
    const isPro = user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";

    // Free users: max 8 jobs, no saved filter
    const effectiveLimit = isPro
      ? (limit ? parseInt(limit as string) : 50)
      : 8;

    const allJobs = storage.getJobs({
      trade: trade as string,
      county: county as string,
      workType: workType as string,
      search: search as string,
      urgent: urgent === "true",
      saved: isPro && saved === "true" ? true : undefined,
      limit: effectiveLimit,
      offset: isPro ? (offset ? parseInt(offset as string) : 0) : 0,
    });

    // Free users: strip sensitive fields (full description, url, exact coords)
    if (!isPro) {
      const stripped = allJobs.map((job) => ({
        ...job,
        description: job.description ? job.description.substring(0, 80) + "..." : null,
        url: null, // Hide apply links
        snippet: job.snippet || (job.description ? job.description.substring(0, 80) + "..." : null),
      }));
      return res.json(stripped);
    }

    res.json(allJobs);
  });

  app.get("/api/jobs/:id", (req, res) => {
    const user = getSessionUser(req);
    const isPro = user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";

    const job = storage.getJob(parseInt(req.params.id));
    if (!job) return res.status(404).json({ error: "Job not found" });

    if (!isPro) {
      return res.json({
        ...job,
        description: job.description ? job.description.substring(0, 80) + "..." : null,
        url: null,
      });
    }

    res.json(job);
  });

  // Save jobs — Pro only
  app.post("/api/jobs/:id/save", requireAuth, requireSubscription, (req, res) => {
    const job = storage.toggleSaveJob(parseInt(req.params.id));
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });

  // ---- Stats (public) ----
  app.get("/api/stats", (_req, res) => {
    const stats = storage.getStats();
    const recentCount = storage.getRecentJobCount(30);
    res.json({ ...stats, recentJobs: recentCount, isPolling: isPolling() });
  });

  // ---- Alerts (Pro only) ----
  app.get("/api/alerts", requireAuth, requireSubscription, (_req, res) => {
    res.json(storage.getAlerts());
  });

  app.post("/api/alerts", requireAuth, requireSubscription, (req, res) => {
    const parsed = insertAlertSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const alert = storage.createAlert(parsed.data);
    res.json(alert);
  });

  app.patch("/api/alerts/:id", requireAuth, requireSubscription, (req, res) => {
    const alert = storage.updateAlert(parseInt(req.params.id), req.body);
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    res.json(alert);
  });

  app.delete("/api/alerts/:id", requireAuth, requireSubscription, (req, res) => {
    storage.deleteAlert(parseInt(req.params.id));
    res.json({ success: true });
  });

  // ---- Sources (public, read-only) ----
  app.get("/api/sources", (_req, res) => {
    res.json(storage.getSources());
  });

  app.patch("/api/sources/:id", (req, res) => {
    const source = storage.updateSource(parseInt(req.params.id), req.body);
    if (!source) return res.status(404).json({ error: "Source not found" });
    res.json(source);
  });

  // ---- Activity Log (public) ----
  app.get("/api/activity", (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    res.json(storage.getActivityLog(limit));
  });

  // ---- Ingestion Controls ----
  app.post("/api/ingestion/start", (_req, res) => {
    startPolling(30000);
    res.json({ status: "started" });
  });

  app.post("/api/ingestion/stop", (_req, res) => {
    stopPolling();
    res.json({ status: "stopped" });
  });

  app.post("/api/ingestion/poll", async (_req, res) => {
    await pollForNewJobs();
    res.json({ status: "polled" });
  });

  app.get("/api/ingestion/status", (_req, res) => {
    res.json({ isPolling: isPolling() });
  });
}
