import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  city: text("city"),
  county: text("county"),
  zip: text("zip"),
  lat: real("lat"),
  lng: real("lng"),
  trade: text("trade").notNull(),
  payRange: text("pay_range"),
  payType: text("pay_type"), // hourly, daily, weekly, salary
  workType: text("work_type"), // full-time, part-time, temp, contract, day-labor
  description: text("description"),
  snippet: text("snippet"),
  url: text("url"),
  source: text("source").notNull(),
  sourceId: text("source_id"),
  isUrgent: integer("is_urgent", { mode: "boolean" }).default(false),
  isSaved: integer("is_saved", { mode: "boolean" }).default(false),
  tags: text("tags"), // JSON array of tags
  postedAt: text("posted_at"),
  fetchedAt: text("fetched_at").notNull(),
  expiresAt: text("expires_at"),
  status: text("status").default("active"), // active, expired, flagged
});

export const alerts = sqliteTable("alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keywords: text("keywords").notNull(),
  trade: text("trade"),
  county: text("county"),
  zip: text("zip"),
  radius: integer("radius").default(25),
  workType: text("work_type"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").notNull(),
  lastTriggered: text("last_triggered"),
  matchCount: integer("match_count").default(0),
});

export const sources = sqliteTable("sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(), // api, scraper, manual
  url: text("url"),
  apiKey: text("api_key"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  lastPolled: text("last_polled"),
  lastStatus: text("last_status"), // success, error, pending
  jobsFound: integer("jobs_found").default(0),
  errorMessage: text("error_message"),
  config: text("config"), // JSON config
});

export const activityLog = sqliteTable("activity_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  jobsAdded: integer("jobs_added").default(0),
  timestamp: text("timestamp").notNull(),
});

// Insert schemas
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true, lastTriggered: true, matchCount: true });
export const insertSourceSchema = createInsertSchema(sources).omit({ id: true, lastPolled: true, lastStatus: true, jobsFound: true, errorMessage: true });
export const insertActivityLogSchema = createInsertSchema(activityLog).omit({ id: true });

// Types
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Source = typeof sources.$inferSelect;
export type InsertSource = z.infer<typeof insertSourceSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Trade categories
export const TRADES = [
  "General Labor",
  "Construction",
  "Electrician",
  "Plumbing",
  "HVAC",
  "Welding",
  "Carpentry",
  "Painting",
  "Roofing",
  "Concrete",
  "Landscaping",
  "Warehouse",
  "Forklift",
  "Trucking/CDL",
  "Moving",
  "Cleaning/Janitorial",
  "Demolition",
  "Masonry",
  "Flooring",
  "Auto Mechanic",
] as const;

export const COUNTIES = ["Los Angeles", "Orange", "San Diego"] as const;
export const WORK_TYPES = ["full-time", "part-time", "temp", "contract", "day-labor"] as const;
export const PAY_TYPES = ["hourly", "daily", "weekly", "salary"] as const;
