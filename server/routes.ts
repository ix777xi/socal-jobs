import type { Express } from "express";
import type { Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { insertAlertSchema, postJobSchema, insertApplicationSchema } from "@shared/schema";
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

  // ---- Applications (Pro only) ----
  app.get("/api/applications/stats", requireAuth, requireSubscription, (req, res) => {
    const user = (req as any).user;
    const stats = storage.getApplicationStats(user.id);
    res.json(stats);
  });

  app.get("/api/applications", requireAuth, requireSubscription, (req, res) => {
    const user = (req as any).user;
    const apps = storage.getApplicationsByUser(user.id);
    res.json(apps);
  });

  app.post("/api/applications", requireAuth, requireSubscription, (req, res) => {
    const user = (req as any).user;
    const parsed = insertApplicationSchema.safeParse({ ...req.body, userId: user.id });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
    const app_ = storage.createApplication({
      ...parsed.data,
      appliedAt: parsed.data.appliedAt || new Date().toISOString(),
    });
    res.json(app_);
  });

  app.patch("/api/applications/:id", requireAuth, requireSubscription, (req, res) => {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const existing = storage.getApplicationsByUser(user.id).find(a => a.id === id);
    if (!existing) return res.status(404).json({ error: "Application not found" });
    const updated = storage.updateApplication(id, req.body);
    res.json(updated);
  });

  app.delete("/api/applications/:id", requireAuth, requireSubscription, (req, res) => {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const existing = storage.getApplicationsByUser(user.id).find(a => a.id === id);
    if (!existing) return res.status(404).json({ error: "Application not found" });
    storage.deleteApplication(id);
    res.json({ success: true });
  });

  // ---- Salary Insights (Pro only) ----
  app.get("/api/insights/salary", requireAuth, requireSubscription, (_req, res) => {
    // Get all active jobs with pay data
    const allJobs = storage.getJobs({ limit: 1000 });

    function parsePay(payRange: string | null | undefined): { min: number; max: number } | null {
      if (!payRange) return null;
      // Match patterns like $18/hr, $18-$25/hr, 18-25, $18.50, 18.50/hour, etc.
      const nums = payRange.match(/(\d+(?:\.\d+)?)/g);
      if (!nums || nums.length === 0) return null;
      const values = nums.map(Number).filter(n => n >= 8 && n <= 300); // sanity range
      if (values.length === 0) return null;
      const min = Math.min(...values);
      const max = Math.max(...values);
      // Normalize: if pay looks like annual salary (>100), convert to hourly
      if (min > 100 && max > 100) {
        return { min: Math.round(min / 2080 * 100) / 100, max: Math.round(max / 2080 * 100) / 100 };
      }
      return { min, max };
    }

    const jobsWithPay = allJobs.filter(j => j.payRange);

    // By trade
    const tradeMap: Record<string, { mins: number[]; maxes: number[]; count: number }> = {};
    const countyMap: Record<string, { mins: number[]; maxes: number[]; count: number }> = {};
    const allMins: number[] = [];
    const allMaxes: number[] = [];

    for (const job of jobsWithPay) {
      const pay = parsePay(job.payRange);
      if (!pay) continue;

      // Trade
      if (!tradeMap[job.trade]) tradeMap[job.trade] = { mins: [], maxes: [], count: 0 };
      tradeMap[job.trade].mins.push(pay.min);
      tradeMap[job.trade].maxes.push(pay.max);
      tradeMap[job.trade].count++;

      // County
      const county = job.county || "Unknown";
      if (!countyMap[county]) countyMap[county] = { mins: [], maxes: [], count: 0 };
      countyMap[county].mins.push(pay.min);
      countyMap[county].maxes.push(pay.max);
      countyMap[county].count++;

      allMins.push(pay.min);
      allMaxes.push(pay.max);
    }

    function avg(arr: number[]): number {
      if (!arr.length) return 0;
      return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
    }

    const byTrade = Object.entries(tradeMap)
      .map(([trade, d]) => ({ trade, avgMin: avg(d.mins), avgMax: avg(d.maxes), count: d.count }))
      .filter(t => t.count >= 1)
      .sort((a, b) => b.avgMax - a.avgMax);

    const byCounty = Object.entries(countyMap)
      .map(([county, d]) => ({ county, avgMin: avg(d.mins), avgMax: avg(d.maxes), count: d.count }))
      .filter(c => c.count >= 1)
      .sort((a, b) => b.avgMax - a.avgMax);

    const overall = {
      avgMin: avg(allMins),
      avgMax: avg(allMaxes),
      total: jobsWithPay.length,
    };

    res.json({ byTrade, byCounty, overall });
  });

  // ---- Sources (admin only) ----
  app.get("/api/sources", requireAdmin, (_req, res) => {
    res.json(storage.getSources());
  });

  app.patch("/api/sources/:id", requireAdmin, (req, res) => {
    const source = storage.updateSource(parseInt(req.params.id), req.body);
    if (!source) return res.status(404).json({ error: "Source not found" });
    res.json(source);
  });

  // ---- Activity Log (admin only) ----
  app.get("/api/activity", requireAdmin, (req, res) => {
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

  // ---- Ingestion Controls (admin only) ----
  app.post("/api/ingestion/start", requireAdmin, (_req, res) => {
    startPolling(30000);
    res.json({ status: "started" });
  });

  app.post("/api/ingestion/stop", requireAdmin, (_req, res) => {
    stopPolling();
    res.json({ status: "stopped" });
  });

  app.post("/api/ingestion/poll", requireAdmin, async (_req, res) => {
    await pollForNewJobs();
    res.json({ status: "polled" });
  });

  app.get("/api/ingestion/status", requireAdmin, (_req, res) => {
    res.json({ isPolling: isPolling() });
  });
}
