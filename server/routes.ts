import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertAlertSchema } from "@shared/schema";
import { seedInitialJobs, startPolling, stopPolling, isPolling, pollForNewJobs } from "./ingestion";

export async function registerRoutes(server: Server, app: Express) {
  // Initialize on startup
  await seedInitialJobs();
  startPolling(30000); // 30s polling

  // ---- Jobs ----
  app.get("/api/jobs", (req, res) => {
    const { trade, county, workType, search, urgent, saved, limit, offset } = req.query;
    const jobs = storage.getJobs({
      trade: trade as string,
      county: county as string,
      workType: workType as string,
      search: search as string,
      urgent: urgent === "true",
      saved: saved === "true",
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });
    res.json(jobs);
  });

  app.get("/api/jobs/:id", (req, res) => {
    const job = storage.getJob(parseInt(req.params.id));
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });

  app.post("/api/jobs/:id/save", (req, res) => {
    const job = storage.toggleSaveJob(parseInt(req.params.id));
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });

  // ---- Stats ----
  app.get("/api/stats", (_req, res) => {
    const stats = storage.getStats();
    const recentCount = storage.getRecentJobCount(30); // last 30 min
    res.json({ ...stats, recentJobs: recentCount, isPolling: isPolling() });
  });

  // ---- Alerts ----
  app.get("/api/alerts", (_req, res) => {
    res.json(storage.getAlerts());
  });

  app.post("/api/alerts", (req, res) => {
    const parsed = insertAlertSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const alert = storage.createAlert(parsed.data);
    res.json(alert);
  });

  app.patch("/api/alerts/:id", (req, res) => {
    const alert = storage.updateAlert(parseInt(req.params.id), req.body);
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    res.json(alert);
  });

  app.delete("/api/alerts/:id", (req, res) => {
    storage.deleteAlert(parseInt(req.params.id));
    res.json({ success: true });
  });

  // ---- Sources ----
  app.get("/api/sources", (_req, res) => {
    res.json(storage.getSources());
  });

  app.patch("/api/sources/:id", (req, res) => {
    const source = storage.updateSource(parseInt(req.params.id), req.body);
    if (!source) return res.status(404).json({ error: "Source not found" });
    res.json(source);
  });

  // ---- Activity Log ----
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
