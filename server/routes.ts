import type { Express } from "express";
import type { Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { insertAlertSchema, postJobSchema } from "@shared/schema";
import { seedInitialJobs, startPolling, stopPolling, isPolling, pollForNewJobs, triggerManualFetch } from "./ingestion";
import { registerAuthRoutes, requireAuth, requireSubscription, requireAdmin, getSessionUser } from "./auth";
import { registerStripeRoutes } from "./stripe";

export async function registerRoutes(server: Server, app: Express) {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "socal-jobs-session-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
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
    const paywallOff = !storage.isPaywallEnabled();
    const isPro = paywallOff || user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";

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
    const paywallOff = !storage.isPaywallEnabled();
    const isPro = paywallOff || user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";

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

  // ---- Job Posting (Pro only) ----
  app.post("/api/jobs/post", requireAuth, requireSubscription, (req, res) => {
    const parsed = postJobSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });

    const user = (req as any).user;
    const data = parsed.data;
    const now = new Date().toISOString();

    const job = storage.createJob({
      title: data.title,
      company: data.company,
      location: data.location,
      city: data.city || null,
      county: data.county || null,
      zip: data.zip || null,
      lat: null,
      lng: null,
      trade: data.trade,
      payRange: data.payRange || null,
      payType: data.payType || null,
      workType: data.workType || null,
      description: data.description,
      snippet: data.description.substring(0, 120) + (data.description.length > 120 ? "..." : ""),
      url: data.url || null,
      source: "User Posted",
      sourceId: `user-${user.id}-${Date.now()}`,
      isUrgent: data.isUrgent || false,
      isSaved: false,
      tags: null,
      postedAt: now,
      fetchedAt: now,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      status: "active",
      postedByUserId: user.id,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
    });

    res.json(job);
  });

  // Get current user's posted jobs
  app.get("/api/jobs/my-postings", requireAuth, requireSubscription, (req, res) => {
    const user = (req as any).user;
    const myJobs = storage.getJobsByUser(user.id);
    res.json(myJobs);
  });

  // Update a user-posted job
  app.patch("/api/jobs/:id/edit", requireAuth, requireSubscription, (req, res) => {
    const user = (req as any).user;
    const job = storage.getJob(parseInt(req.params.id));
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.postedByUserId !== user.id) return res.status(403).json({ error: "You can only edit your own postings" });

    const parsed = postJobSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });

    const data = parsed.data;
    const updated = storage.updateJob(job.id, {
      ...data,
      snippet: data.description ? data.description.substring(0, 120) + (data.description.length > 120 ? "..." : "") : undefined,
    });
    res.json(updated);
  });

  // Delete a user-posted job
  app.delete("/api/jobs/:id", requireAuth, requireSubscription, (req, res) => {
    const user = (req as any).user;
    const job = storage.getJob(parseInt(req.params.id));
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.postedByUserId !== user.id) return res.status(403).json({ error: "You can only delete your own postings" });
    storage.deleteJob(job.id);
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

  // ---- Admin Routes ----
  app.get("/api/admin/settings", requireAdmin, (_req, res) => {
    const settings = storage.getAllSettings();
    res.json(settings);
  });

  app.post("/api/admin/settings", requireAdmin, (req, res) => {
    const { key, value } = req.body;
    if (!key || typeof value !== "string") {
      return res.status(400).json({ error: "key and value required" });
    }
    storage.setSetting(key, value);
    res.json({ success: true, key, value });
  });

  app.get("/api/admin/users", requireAdmin, (_req, res) => {
    const allUsers = storage.getAllUsers().map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      authProvider: u.authProvider,
      subscriptionStatus: u.subscriptionStatus,
      subscriptionEnd: u.subscriptionEnd,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
    }));
    res.json(allUsers);
  });

  app.patch("/api/admin/users/:id", requireAdmin, (req, res) => {
    const userId = parseInt(req.params.id);
    const user = storage.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { subscriptionStatus, isAdmin } = req.body;
    const updates: any = {};
    if (subscriptionStatus !== undefined) updates.subscriptionStatus = subscriptionStatus;
    if (isAdmin !== undefined) updates.isAdmin = isAdmin;

    const updated = storage.updateUser(userId, updates);
    res.json({
      id: updated!.id,
      email: updated!.email,
      name: updated!.name,
      subscriptionStatus: updated!.subscriptionStatus,
      isAdmin: updated!.isAdmin,
    });
  });

  // ---- Admin: Source Management ----
  app.get("/api/admin/sources", requireAdmin, (_req, res) => {
    res.json(storage.getSources());
  });

  app.patch("/api/admin/sources/:id", requireAdmin, (req, res) => {
    const sourceId = parseInt(req.params.id);
    const source = storage.getSource(sourceId);
    if (!source) return res.status(404).json({ error: "Source not found" });

    const { isActive, apiKey, config, name, url } = req.body;
    const updates: any = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (apiKey !== undefined) updates.apiKey = apiKey;
    if (config !== undefined) updates.config = config;
    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;

    const updated = storage.updateSource(sourceId, updates);
    res.json(updated);
  });

  // Admin: trigger manual fetch from all APIs
  app.post("/api/admin/fetch-jobs", requireAdmin, async (_req, res) => {
    try {
      const result = await triggerManualFetch();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: add a new source
  app.post("/api/admin/sources", requireAdmin, (req, res) => {
    const { name, type, url, apiKey, isActive, config } = req.body;
    if (!name || !type) return res.status(400).json({ error: "name and type required" });
    const source = storage.createSource({
      name,
      type,
      url: url || null,
      apiKey: apiKey || null,
      isActive: isActive !== false,
      config: config || null,
    });
    res.json(source);
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
