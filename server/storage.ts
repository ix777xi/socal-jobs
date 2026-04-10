import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, like, and, or, sql } from "drizzle-orm";
import {
  jobs, alerts, sources, activityLog,
  type Job, type InsertJob,
  type Alert, type InsertAlert,
  type Source, type InsertSource,
  type ActivityLog, type InsertActivityLog,
} from "@shared/schema";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    city TEXT,
    county TEXT,
    zip TEXT,
    lat REAL,
    lng REAL,
    trade TEXT NOT NULL,
    pay_range TEXT,
    pay_type TEXT,
    work_type TEXT,
    description TEXT,
    snippet TEXT,
    url TEXT,
    source TEXT NOT NULL,
    source_id TEXT,
    is_urgent INTEGER DEFAULT 0,
    is_saved INTEGER DEFAULT 0,
    tags TEXT,
    posted_at TEXT,
    fetched_at TEXT NOT NULL,
    expires_at TEXT,
    status TEXT DEFAULT 'active'
  );
  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keywords TEXT NOT NULL,
    trade TEXT,
    county TEXT,
    zip TEXT,
    radius INTEGER DEFAULT 25,
    work_type TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    last_triggered TEXT,
    match_count INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT,
    api_key TEXT,
    is_active INTEGER DEFAULT 1,
    last_polled TEXT,
    last_status TEXT,
    jobs_found INTEGER DEFAULT 0,
    error_message TEXT,
    config TEXT
  );
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    jobs_added INTEGER DEFAULT 0,
    timestamp TEXT NOT NULL
  );
`);

export const db = drizzle(sqlite);

export interface IStorage {
  // Jobs
  getJobs(filters?: {
    trade?: string;
    county?: string;
    workType?: string;
    search?: string;
    urgent?: boolean;
    saved?: boolean;
    limit?: number;
    offset?: number;
  }): Job[];
  getJob(id: number): Job | undefined;
  createJob(job: InsertJob): Job;
  updateJob(id: number, data: Partial<InsertJob>): Job | undefined;
  toggleSaveJob(id: number): Job | undefined;
  getJobCount(filters?: { trade?: string; county?: string; urgent?: boolean }): number;
  getRecentJobCount(minutes: number): number;
  deduplicateJob(title: string, company: string, location: string): Job | undefined;

  // Alerts
  getAlerts(): Alert[];
  getAlert(id: number): Alert | undefined;
  createAlert(alert: InsertAlert): Alert;
  updateAlert(id: number, data: Partial<InsertAlert>): Alert | undefined;
  deleteAlert(id: number): void;
  getMatchingAlerts(job: Job): Alert[];

  // Sources
  getSources(): Source[];
  getSource(id: number): Source | undefined;
  createSource(source: InsertSource): Source;
  updateSource(id: number, data: Partial<InsertSource>): Source | undefined;

  // Activity Log
  getActivityLog(limit?: number): ActivityLog[];
  createActivityLog(log: InsertActivityLog): ActivityLog;

  // Stats
  getStats(): {
    totalJobs: number;
    activeJobs: number;
    urgentJobs: number;
    savedJobs: number;
    newToday: number;
    activeSources: number;
    tradeBreakdown: { trade: string; count: number }[];
    countyBreakdown: { county: string; count: number }[];
  };
}

export class SqliteStorage implements IStorage {
  getJobs(filters?: {
    trade?: string;
    county?: string;
    workType?: string;
    search?: string;
    urgent?: boolean;
    saved?: boolean;
    limit?: number;
    offset?: number;
  }): Job[] {
    const conditions = [eq(jobs.status, "active")];

    if (filters?.trade) conditions.push(eq(jobs.trade, filters.trade));
    if (filters?.county) conditions.push(eq(jobs.county, filters.county));
    if (filters?.workType) conditions.push(eq(jobs.workType, filters.workType));
    if (filters?.urgent) conditions.push(eq(jobs.isUrgent, true));
    if (filters?.saved) conditions.push(eq(jobs.isSaved, true));
    if (filters?.search) {
      conditions.push(
        or(
          like(jobs.title, `%${filters.search}%`),
          like(jobs.company, `%${filters.search}%`),
          like(jobs.description, `%${filters.search}%`)
        )!
      );
    }

    return db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.fetchedAt))
      .limit(filters?.limit ?? 50)
      .offset(filters?.offset ?? 0)
      .all();
  }

  getJob(id: number): Job | undefined {
    return db.select().from(jobs).where(eq(jobs.id, id)).get();
  }

  createJob(job: InsertJob): Job {
    return db.insert(jobs).values(job).returning().get();
  }

  updateJob(id: number, data: Partial<InsertJob>): Job | undefined {
    return db.update(jobs).set(data).where(eq(jobs.id, id)).returning().get();
  }

  toggleSaveJob(id: number): Job | undefined {
    const job = this.getJob(id);
    if (!job) return undefined;
    return db.update(jobs).set({ isSaved: !job.isSaved }).where(eq(jobs.id, id)).returning().get();
  }

  getJobCount(filters?: { trade?: string; county?: string; urgent?: boolean }): number {
    const conditions = [eq(jobs.status, "active")];
    if (filters?.trade) conditions.push(eq(jobs.trade, filters.trade));
    if (filters?.county) conditions.push(eq(jobs.county, filters.county));
    if (filters?.urgent) conditions.push(eq(jobs.isUrgent, true));

    const result = db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(...conditions))
      .get();
    return result?.count ?? 0;
  }

  getRecentJobCount(minutes: number): number {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    const result = db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(eq(jobs.status, "active"), sql`${jobs.fetchedAt} > ${cutoff}`))
      .get();
    return result?.count ?? 0;
  }

  deduplicateJob(title: string, company: string, location: string): Job | undefined {
    return db
      .select()
      .from(jobs)
      .where(
        and(
          like(jobs.title, `%${title.substring(0, 30)}%`),
          eq(jobs.company, company),
          eq(jobs.status, "active")
        )
      )
      .get();
  }

  // Alerts
  getAlerts(): Alert[] {
    return db.select().from(alerts).orderBy(desc(alerts.createdAt)).all();
  }

  getAlert(id: number): Alert | undefined {
    return db.select().from(alerts).where(eq(alerts.id, id)).get();
  }

  createAlert(alert: InsertAlert): Alert {
    return db
      .insert(alerts)
      .values({ ...alert, createdAt: new Date().toISOString() })
      .returning()
      .get();
  }

  updateAlert(id: number, data: Partial<InsertAlert>): Alert | undefined {
    return db.update(alerts).set(data).where(eq(alerts.id, id)).returning().get();
  }

  deleteAlert(id: number): void {
    db.delete(alerts).where(eq(alerts.id, id)).run();
  }

  getMatchingAlerts(job: Job): Alert[] {
    return db
      .select()
      .from(alerts)
      .where(eq(alerts.isActive, true))
      .all()
      .filter((alert) => {
        const kwMatch = !alert.keywords || alert.keywords.split(",").some((kw) =>
          (job.title + " " + job.description).toLowerCase().includes(kw.trim().toLowerCase())
        );
        const tradeMatch = !alert.trade || alert.trade === job.trade;
        const countyMatch = !alert.county || alert.county === job.county;
        const workMatch = !alert.workType || alert.workType === job.workType;
        return kwMatch && tradeMatch && countyMatch && workMatch;
      });
  }

  // Sources
  getSources(): Source[] {
    return db.select().from(sources).all();
  }

  getSource(id: number): Source | undefined {
    return db.select().from(sources).where(eq(sources.id, id)).get();
  }

  createSource(source: InsertSource): Source {
    return db.insert(sources).values(source).returning().get();
  }

  updateSource(id: number, data: Partial<InsertSource>): Source | undefined {
    return db.update(sources).set(data).where(eq(sources.id, id)).returning().get();
  }

  // Activity Log
  getActivityLog(limit: number = 50): ActivityLog[] {
    return db.select().from(activityLog).orderBy(desc(activityLog.timestamp)).limit(limit).all();
  }

  createActivityLog(log: InsertActivityLog): ActivityLog {
    return db.insert(activityLog).values(log).returning().get();
  }

  // Stats
  getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const totalJobs = db.select({ count: sql<number>`count(*)` }).from(jobs).get()?.count ?? 0;
    const activeJobs = db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.status, "active")).get()?.count ?? 0;
    const urgentJobs = db.select({ count: sql<number>`count(*)` }).from(jobs).where(and(eq(jobs.status, "active"), eq(jobs.isUrgent, true))).get()?.count ?? 0;
    const savedJobs = db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.isSaved, true)).get()?.count ?? 0;
    const newToday = db.select({ count: sql<number>`count(*)` }).from(jobs).where(sql`${jobs.fetchedAt} > ${todayIso}`).get()?.count ?? 0;
    const activeSources = db.select({ count: sql<number>`count(*)` }).from(sources).where(eq(sources.isActive, true)).get()?.count ?? 0;

    const tradeBreakdown = db
      .select({ trade: jobs.trade, count: sql<number>`count(*)` })
      .from(jobs)
      .where(eq(jobs.status, "active"))
      .groupBy(jobs.trade)
      .orderBy(desc(sql`count(*)`))
      .all();

    const countyBreakdown = db
      .select({ county: jobs.county, count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(eq(jobs.status, "active"), sql`${jobs.county} is not null`))
      .groupBy(jobs.county)
      .orderBy(desc(sql`count(*)`))
      .all();

    return { totalJobs, activeJobs, urgentJobs, savedJobs, newToday, activeSources, tradeBreakdown, countyBreakdown };
  }
}

export const storage = new SqliteStorage();
