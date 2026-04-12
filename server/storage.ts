import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, like, and, or, sql } from "drizzle-orm";
import {
  users, jobs, alerts, sources, activityLog, siteSettings,
  type User, type InsertUser,
  type Job, type InsertJob,
  type Alert, type InsertAlert,
  type Source, type InsertSource,
  type ActivityLog, type InsertActivityLog,
} from "@shared/schema";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    name TEXT,
    avatar_url TEXT,
    google_id TEXT UNIQUE,
    auth_provider TEXT DEFAULT 'local',
    stripe_customer_id TEXT,
    subscription_id TEXT,
    subscription_status TEXT DEFAULT 'none',
    subscription_end TEXT,
    created_at TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0
  );
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
    status TEXT DEFAULT 'active',
    posted_by_user_id INTEGER,
    contact_email TEXT,
    contact_phone TEXT
  );
  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
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

// Migrate: add new columns if they don't exist
try {
  sqlite.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
} catch {}
try {
  sqlite.exec(`ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE`);
} catch {}
try {
  sqlite.exec(`ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local'`);
} catch {}
try {
  sqlite.exec(`ALTER TABLE jobs ADD COLUMN posted_by_user_id INTEGER`);
} catch {}
try {
  sqlite.exec(`ALTER TABLE jobs ADD COLUMN contact_email TEXT`);
} catch {}
try {
  sqlite.exec(`ALTER TABLE jobs ADD COLUMN contact_phone TEXT`);
} catch {}
try {
  sqlite.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`);
} catch {}

// Create site_settings table
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Seed default settings
try {
  sqlite.exec(`INSERT INTO site_settings (key, value, updated_at) VALUES ('paywall_enabled', 'true', '${new Date().toISOString()}')`);
} catch {}
try {
  sqlite.exec(`INSERT INTO site_settings (key, value, updated_at) VALUES ('registration_enabled', 'true', '${new Date().toISOString()}')`);
} catch {}

// Auto-promote admin
sqlite.exec(`UPDATE users SET is_admin = 1 WHERE email = 'calebj7walker@gmail.com'`);

// One-time cleanup: remove fake 555 phone numbers from API-sourced job descriptions
try {
  sqlite.exec(`
    UPDATE jobs
    SET description = REPLACE(
      REPLACE(
        REPLACE(description, 'Contact: ' || SUBSTR(description, INSTR(description, '555-'), -14) || CHAR(10), ''),
        'Call ', ''
      ),
      description, description
    )
    WHERE posted_by_user_id IS NULL
    AND description LIKE '%555-%'
  `);
  // Strip fake 555 phone numbers and directions from API-sourced jobs
  const dirtyJobs = sqlite.prepare(`SELECT id, description, snippet FROM jobs WHERE posted_by_user_id IS NULL AND (description LIKE '%555-%' OR snippet LIKE '%555-%' OR description LIKE '%Directions:%')`).all() as any[];
  const updateStmt = sqlite.prepare(`UPDATE jobs SET description = ?, snippet = ? WHERE id = ?`);
  for (const job of dirtyJobs) {
    let desc = job.description || "";
    let snippet = job.snippet || "";
    // Remove lines with fake 555 phone numbers
    desc = desc.replace(/\n?.*\(\d{3}\)\s*555-\d{4}.*/g, "");
    desc = desc.replace(/Contact:\s*$/gm, "").trim();
    // Remove Directions: lines with Google Maps URLs
    desc = desc.replace(/\n?Directions:.*$/gm, "").trim();
    snippet = snippet.replace(/Call\s*\(\d{3}\)\s*555-\d{4}/g, "").trim();
    updateStmt.run(desc, snippet, job.id);
  }
  if (dirtyJobs.length > 0) {
    console.log(`[Storage] Cleaned ${dirtyJobs.length} job descriptions (fake phones/directions)`);
  }
} catch (e) {
  // Ignore if already cleaned
}

export const db = drizzle(sqlite);

export interface IStorage {
  // Users
  getUserByEmail(email: string): User | undefined;
  getUserById(id: number): User | undefined;
  getUserByGoogleId(googleId: string): User | undefined;
  createUser(user: InsertUser & { createdAt: string }): User;
  updateUser(id: number, data: Partial<User>): User | undefined;

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

  // User-posted jobs
  getJobsByUser(userId: number): Job[];
  deleteJob(id: number): void;

  // Site Settings
  getSetting(key: string): string | undefined;
  setSetting(key: string, value: string): void;
  getAllSettings(): { key: string; value: string; updatedAt: string }[];

  // Admin
  getAllUsers(): User[];
  isPaywallEnabled(): boolean;

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
  // Users
  getUserByEmail(email: string): User | undefined {
    return db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
  }

  getUserById(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  getUserByGoogleId(googleId: string): User | undefined {
    return db.select().from(users).where(eq(users.googleId, googleId)).get();
  }

  createUser(user: InsertUser & { createdAt: string }): User {
    return db.insert(users).values({ ...user, email: user.email.toLowerCase() }).returning().get();
  }

  updateUser(id: number, data: Partial<User>): User | undefined {
    return db.update(users).set(data).where(eq(users.id, id)).returning().get();
  }

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

  // User-posted jobs
  getJobsByUser(userId: number): Job[] {
    return db.select().from(jobs).where(eq(jobs.postedByUserId, userId)).orderBy(desc(jobs.fetchedAt)).all();
  }

  deleteJob(id: number): void {
    db.delete(jobs).where(eq(jobs.id, id)).run();
  }

  // Site Settings
  getSetting(key: string): string | undefined {
    const row = db.select().from(siteSettings).where(eq(siteSettings.key, key)).get();
    return row?.value;
  }

  setSetting(key: string, value: string): void {
    const existing = db.select().from(siteSettings).where(eq(siteSettings.key, key)).get();
    if (existing) {
      db.update(siteSettings).set({ value, updatedAt: new Date().toISOString() }).where(eq(siteSettings.key, key)).run();
    } else {
      db.insert(siteSettings).values({ key, value, updatedAt: new Date().toISOString() }).run();
    }
  }

  getAllSettings(): { key: string; value: string; updatedAt: string }[] {
    return db.select({ key: siteSettings.key, value: siteSettings.value, updatedAt: siteSettings.updatedAt }).from(siteSettings).all();
  }

  // Admin
  getAllUsers(): User[] {
    return db.select().from(users).orderBy(desc(users.createdAt)).all();
  }

  isPaywallEnabled(): boolean {
    const val = this.getSetting("paywall_enabled");
    return val !== "false";
  }
}

export const storage = new SqliteStorage();
