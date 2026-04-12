import { storage } from "./storage";
import type { InsertJob } from "@shared/schema";

// Urgent hiring keywords
const URGENT_KEYWORDS = [
  "hiring immediately", "start tomorrow", "asap", "urgent", "start today",
  "same day", "walk-on", "immediate start", "start asap", "hiring now",
  "need workers", "start this week", "emergency hire", "rush hire",
];

function detectUrgent(text: string): boolean {
  const lower = text.toLowerCase();
  return URGENT_KEYWORDS.some((kw) => lower.includes(kw));
}

function detectTrade(title: string, desc: string): string {
  const text = (title + " " + desc).toLowerCase();
  const tradeMap: Record<string, string[]> = {
    "Electrician": ["electrician", "electrical", "wiring", "journeyman electrician"],
    "Plumbing": ["plumber", "plumbing", "pipe fitter", "pipefitter"],
    "HVAC": ["hvac", "heating", "air conditioning", "refrigeration"],
    "Welding": ["welder", "welding", "fabricat"],
    "Carpentry": ["carpenter", "carpentry", "cabinetry", "woodwork"],
    "Painting": ["painter", "painting"],
    "Roofing": ["roofer", "roofing"],
    "Concrete": ["concrete", "cement", "mason"],
    "Landscaping": ["landscap", "lawn", "garden", "irrigation"],
    "Warehouse": ["warehouse", "picker", "packer", "shipping", "receiving"],
    "Forklift": ["forklift", "fork lift", "material handler"],
    "Trucking/CDL": ["cdl", "truck driver", "trucking", "delivery driver", "class a", "class b"],
    "Moving": ["mover", "moving", "relocation"],
    "Cleaning/Janitorial": ["janitor", "custodian", "cleaning", "housekeeper"],
    "Demolition": ["demolition", "demo crew"],
    "Masonry": ["masonry", "bricklayer", "stone"],
    "Flooring": ["flooring", "tile", "hardwood install"],
    "Auto Mechanic": ["mechanic", "automotive", "auto repair", "technician"],
    "Construction": ["construction", "laborer", "site work", "framing", "drywall"],
  };

  for (const [trade, keywords] of Object.entries(tradeMap)) {
    if (keywords.some((kw) => text.includes(kw))) return trade;
  }
  return "General Labor";
}

function detectCounty(location: string): string | null {
  const loc = location.toLowerCase();
  const laAreas = [
    "los angeles", "la ", "long beach", "pasadena", "glendale", "torrance",
    "pomona", "el monte", "inglewood", "downey", "west covina", "norwalk",
    "compton", "burbank", "carson", "santa clarita", "lancaster", "palmdale",
    "hawthorne", "whittier", "alhambra", "lakewood", "bellflower", "lynwood",
    "redondo beach", "pico rivera", "montebello", "monrovia", "gardena",
    "huntington park", "arcadia", "diamond bar", "la mirada", "azusa",
    "la puente", "san dimas", "cerritos", "walnut", "covina",
  ];
  const ocAreas = [
    "orange county", "anaheim", "santa ana", "irvine", "huntington beach",
    "garden grove", "fullerton", "costa mesa", "mission viejo", "dana point",
    "san clemente", "laguna", "newport beach", "tustin", "yorba linda",
    "lake forest", "buena park", "westminster", "cypress", "la habra",
    "placentia", "brea", "san juan capistrano", "rancho santa margarita",
    "aliso viejo", "laguna niguel", "laguna hills", "orange, ca",
  ];
  const sdAreas = [
    "san diego", "chula vista", "oceanside", "escondido", "carlsbad",
    "el cajon", "vista", "san marcos", "encinitas", "national city",
    "la mesa", "santee", "poway", "coronado", "imperial beach",
  ];
  const ieAreas = [
    "riverside", "san bernardino", "corona", "ontario", "rancho cucamonga",
    "fontana", "moreno valley", "temecula", "murrieta", "hemet",
    "perris", "lake elsinore", "menifee", "beaumont", "banning",
    "redlands", "rialto", "upland", "chino", "chino hills",
  ];

  if (laAreas.some((a) => loc.includes(a))) return "Los Angeles";
  if (ocAreas.some((a) => loc.includes(a))) return "Orange";
  if (sdAreas.some((a) => loc.includes(a))) return "San Diego";
  if (ieAreas.some((a) => loc.includes(a))) return "Inland Empire";
  return null;
}

// Coordinates for SoCal cities
const CITY_COORDS: Record<string, [number, number]> = {
  "los angeles": [34.0522, -118.2437], "long beach": [33.7701, -118.1937],
  "anaheim": [33.8366, -117.9143], "santa ana": [33.7455, -117.8677],
  "irvine": [33.6846, -117.8265], "san diego": [32.7157, -117.1611],
  "chula vista": [32.6401, -117.0842], "oceanside": [33.1959, -117.3795],
  "huntington beach": [33.6603, -117.9992], "costa mesa": [33.6412, -117.9187],
  "dana point": [33.4672, -117.6981], "mission viejo": [33.6000, -117.6720],
  "pasadena": [34.1478, -118.1445], "torrance": [33.8358, -118.3406],
  "fullerton": [33.8703, -117.9242], "carlsbad": [33.1581, -117.3506],
  "escondido": [33.1192, -117.0864], "el cajon": [32.7948, -116.9625],
  "garden grove": [33.7739, -117.9414], "newport beach": [33.6189, -117.9289],
  "laguna beach": [33.5427, -117.7854], "san clemente": [33.4269, -117.6120],
  "temecula": [33.4936, -117.1484], "corona": [33.8753, -117.5664],
  "riverside": [33.9533, -117.3962], "ontario": [34.0633, -117.6509],
  "orange": [33.7879, -117.8531], "rancho cucamonga": [34.1064, -117.5931],
  "fontana": [34.0922, -117.4350], "moreno valley": [33.9425, -117.2297],
  "san bernardino": [34.1083, -117.2898], "murrieta": [33.5539, -117.2139],
};

function getCoords(location: string): { lat: number; lng: number } | null {
  const loc = location.toLowerCase();
  for (const [city, [lat, lng]] of Object.entries(CITY_COORDS)) {
    if (loc.includes(city)) return { lat, lng };
  }
  return null;
}

// SoCal-specific search queries for blue-collar jobs
const SOCAL_QUERIES = [
  "construction", "warehouse", "electrician", "plumber", "labor",
  "forklift", "hvac", "cdl driver", "welder", "carpenter",
  "painter", "roofer", "landscaper", "mechanic", "janitor",
  "mover", "concrete", "demolition", "flooring", "mason",
];

// SoCal locations to search
const SOCAL_LOCATIONS = [
  "Los Angeles, CA", "Anaheim, CA", "San Diego, CA",
  "Irvine, CA", "Long Beach, CA", "Riverside, CA",
  "Santa Ana, CA", "Ontario, CA",
];

// ---- Helper: check if a location is in SoCal ----
function isSoCalLocation(location: string): boolean {
  const loc = location.toLowerCase();
  const soCalKeywords = [
    "southern california", "socal", "los angeles", "orange county",
    "san diego", "inland empire", "riverside", "san bernardino",
    // Check all cities in our coord map
    ...Object.keys(CITY_COORDS),
    // Plus state indicator
    ", ca",
  ];
  return soCalKeywords.some(kw => loc.includes(kw));
}

// ---- Data Source Fetch Interface ----
interface FetchResult {
  source: string;
  jobs: InsertJob[];
  error?: string;
}

// Helper to build a standard InsertJob from API data
function buildJob(opts: {
  title: string;
  company: string;
  location: string;
  description?: string;
  payMin?: number | null;
  payMax?: number | null;
  payType?: string;
  workType?: string;
  url?: string | null;
  source: string;
  sourceId?: string;
  postedAt?: string;
}): InsertJob {
  const coords = getCoords(opts.location);
  const fullText = (opts.title || "") + " " + (opts.description || "");
  const city = opts.location.split(",")[0]?.trim() || null;

  let payRange: string | null = null;
  if (opts.payMin && opts.payMax) {
    payRange = `$${Math.round(opts.payMin)}-$${Math.round(opts.payMax)}`;
  } else if (opts.payMin) {
    payRange = `$${Math.round(opts.payMin)}+`;
  }

  return {
    title: opts.title || "Untitled",
    company: opts.company || "Unknown",
    location: opts.location,
    city,
    county: detectCounty(opts.location),
    zip: null,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    trade: detectTrade(opts.title || "", opts.description || ""),
    payRange,
    payType: opts.payType || (opts.payMin ? "hourly" : null),
    workType: opts.workType || "full-time",
    description: opts.description?.substring(0, 2000) || null,
    snippet: opts.description?.substring(0, 150) || null,
    url: opts.url || null,
    source: opts.source,
    sourceId: opts.sourceId || null,
    isUrgent: detectUrgent(fullText),
    isSaved: false,
    tags: null,
    postedAt: opts.postedAt || new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
  };
}

// ============================================================
// JSearch API (RapidAPI) — aggregates Google Jobs, LinkedIn, etc.
// Docs: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
// Free tier: 200 calls/month
// ============================================================
async function fetchJSearch(): Promise<FetchResult> {
  const source = storage.getSources().find(s => s.name === "JSearch API");
  if (!source?.isActive) return { source: "JSearch API", jobs: [], error: "Source disabled" };

  const apiKey = source.apiKey || process.env.JSEARCH_API_KEY;
  if (!apiKey) return { source: "JSearch API", jobs: [], error: "No API key configured" };

  const results: InsertJob[] = [];
  // Rotate through queries to stay within free tier limits
  const queries = SOCAL_QUERIES.slice(0, 4);
  const locations = ["Los Angeles, CA", "San Diego, CA"];

  for (const query of queries) {
    for (const loc of locations) {
      try {
        const searchQuery = `${query} in ${loc}`;
        const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(searchQuery)}&page=1&num_pages=1&date_posted=week&remote_jobs_only=false`;

        const resp = await fetch(url, {
          headers: {
            "x-rapidapi-key": apiKey,
            "x-rapidapi-host": "jsearch.p.rapidapi.com",
          },
        });

        if (!resp.ok) {
          console.error(`[JSearch] HTTP ${resp.status} for query "${query}" in ${loc}`);
          continue;
        }

        const data = await resp.json();
        const hits = data.data || [];

        for (const item of hits) {
          const jobLocation = item.job_city
            ? `${item.job_city}, ${item.job_state || "CA"}`
            : loc;

          // Filter to SoCal only
          if (!isSoCalLocation(jobLocation)) continue;

          const workTypeMap: Record<string, string> = {
            FULLTIME: "full-time",
            PARTTIME: "part-time",
            CONTRACTOR: "contract",
            INTERN: "temp",
          };

          results.push(buildJob({
            title: item.job_title,
            company: item.employer_name || "Unknown",
            location: jobLocation,
            description: item.job_description?.substring(0, 2000),
            payMin: item.job_min_salary,
            payMax: item.job_max_salary,
            payType: item.job_salary_period === "HOUR" ? "hourly" : item.job_salary_period === "YEAR" ? "salary" : undefined,
            workType: workTypeMap[item.job_employment_type] || "full-time",
            url: item.job_apply_link || item.job_google_link || null,
            source: "JSearch",
            sourceId: item.job_id || null,
            postedAt: item.job_posted_at_datetime_utc || new Date().toISOString(),
          }));
        }
      } catch (e) {
        console.error(`[JSearch] Error fetching "${query}":`, e);
      }
    }
    // Small delay between requests to be respectful
    await new Promise(r => setTimeout(r, 500));
  }

  return { source: "JSearch API", jobs: results };
}

// ============================================================
// Jooble REST API — free key, strong location + radius filtering
// Docs: https://jooble.org/api/about
// ============================================================
async function fetchJooble(): Promise<FetchResult> {
  const source = storage.getSources().find(s => s.name === "Jooble API");
  if (!source?.isActive) return { source: "Jooble API", jobs: [], error: "Source disabled" };

  const apiKey = source.apiKey || process.env.JOOBLE_API_KEY;
  if (!apiKey) return { source: "Jooble API", jobs: [], error: "No API key configured" };

  const results: InsertJob[] = [];
  const queries = SOCAL_QUERIES.slice(0, 5);

  for (const query of queries) {
    try {
      const url = `https://jooble.org/api/${apiKey}`;
      const body = {
        keywords: query,
        location: "Southern California",
        radius: 50,
        page: 1,
      };

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        console.error(`[Jooble] HTTP ${resp.status} for "${query}"`);
        continue;
      }

      const data = await resp.json();
      const hits = data.jobs || [];

      for (const item of hits) {
        const location = item.location || "Southern California";
        if (!isSoCalLocation(location)) continue;

        let payMin: number | null = null;
        let payMax: number | null = null;
        if (item.salary) {
          const salaryMatch = item.salary.match(/\$?([\d,.]+)\s*[-–]\s*\$?([\d,.]+)/);
          if (salaryMatch) {
            payMin = parseFloat(salaryMatch[1].replace(/,/g, ""));
            payMax = parseFloat(salaryMatch[2].replace(/,/g, ""));
          }
        }

        results.push(buildJob({
          title: item.title,
          company: item.company || "Unknown",
          location: location.includes("CA") ? location : `${location}, CA`,
          description: item.snippet || item.title,
          payMin,
          payMax,
          payType: payMin && payMin < 200 ? "hourly" : payMin ? "salary" : undefined,
          workType: item.type?.toLowerCase().includes("part") ? "part-time" : "full-time",
          url: item.link || null,
          source: "Jooble",
          sourceId: item.id?.toString() || null,
          postedAt: item.updated || new Date().toISOString(),
        }));
      }
    } catch (e) {
      console.error(`[Jooble] Error fetching "${query}":`, e);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  return { source: "Jooble API", jobs: results };
}

// ============================================================
// Techmap RSS/XML API — covers 2000+ job boards
// Parses RSS XML responses
// ============================================================
async function fetchTechmap(): Promise<FetchResult> {
  const source = storage.getSources().find(s => s.name === "Techmap RSS");
  if (!source?.isActive) return { source: "Techmap RSS", jobs: [], error: "Source disabled" };

  const apiKey = source.apiKey || process.env.TECHMAP_API_KEY;
  if (!apiKey) return { source: "Techmap RSS", jobs: [], error: "No API key configured" };

  const results: InsertJob[] = [];

  // Techmap RSS feeds for blue-collar jobs in SoCal
  const feedUrls = [
    `https://api.techmap.io/v1/rss/jobs?apikey=${apiKey}&q=construction+labor&location=Southern+California&radius=50`,
    `https://api.techmap.io/v1/rss/jobs?apikey=${apiKey}&q=warehouse+forklift&location=Los+Angeles&radius=30`,
    `https://api.techmap.io/v1/rss/jobs?apikey=${apiKey}&q=electrician+plumber+hvac&location=Orange+County+CA&radius=30`,
  ];

  for (const feedUrl of feedUrls) {
    try {
      const resp = await fetch(feedUrl);
      if (!resp.ok) {
        console.error(`[Techmap] HTTP ${resp.status}`);
        continue;
      }

      const xml = await resp.text();

      // Simple XML parser for RSS items
      const items = xml.split("<item>").slice(1);
      for (const itemXml of items) {
        const getTag = (tag: string): string => {
          const match = itemXml.match(new RegExp(`<${tag}><!\\[CDATA\\[(.+?)\\]\\]></${tag}>|<${tag}>(.+?)</${tag}>`));
          return match?.[1] || match?.[2] || "";
        };

        const title = getTag("title");
        const link = getTag("link");
        const description = getTag("description");
        const company = getTag("source") || getTag("author") || "Unknown";
        const location = getTag("location") || getTag("geo:name") || "Southern California";
        const pubDate = getTag("pubDate");

        if (!title) continue;
        if (!isSoCalLocation(location)) continue;

        results.push(buildJob({
          title,
          company,
          location: location.includes("CA") ? location : `${location}, CA`,
          description,
          url: link || null,
          source: "Techmap",
          sourceId: link || `techmap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          postedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        }));
      }
    } catch (e) {
      console.error("[Techmap] RSS parse error:", e);
    }
  }

  return { source: "Techmap RSS", jobs: results };
}

// ============================================================
// Adzuna API (existing)
// ============================================================
async function fetchAdzuna(): Promise<FetchResult> {
  const source = storage.getSources().find(s => s.name === "Adzuna");
  if (!source?.isActive) return { source: "Adzuna", jobs: [], error: "Source disabled" };

  const config = source.config ? JSON.parse(source.config) : {};
  const apiId = config.appId || process.env.ADZUNA_APP_ID;
  const apiKey = source.apiKey || process.env.ADZUNA_API_KEY;
  if (!apiId || !apiKey) return { source: "Adzuna", jobs: [], error: "No API credentials" };

  const results: InsertJob[] = [];
  const queries = SOCAL_QUERIES.slice(0, 3);

  for (const query of queries) {
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${apiId}&app_key=${apiKey}&results_per_page=10&what=${encodeURIComponent(query)}&where=Southern+California&sort_by=date`;
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json();
      for (const item of data.results || []) {
        const location = item.location?.display_name || "Southern California";
        results.push(buildJob({
          title: item.title,
          company: item.company?.display_name || "Unknown",
          location,
          description: item.description?.substring(0, 500),
          payMin: item.salary_min,
          payMax: item.salary_max,
          payType: item.salary_min ? "salary" : undefined,
          workType: item.contract_time === "full_time" ? "full-time" : item.contract_time === "part_time" ? "part-time" : "full-time",
          url: item.redirect_url,
          source: "Adzuna",
          sourceId: item.id?.toString(),
          postedAt: item.created,
        }));
      }
    } catch (e) { /* skip */ }
  }

  return { source: "Adzuna", jobs: results };
}

// ---- Helper: upsert jobs from a fetch result ----
async function upsertFetchResult(result: FetchResult): Promise<number> {
  let added = 0;
  for (const job of result.jobs) {
    const existing = storage.deduplicateJob(job.title, job.company, job.location);
    if (!existing) {
      storage.createJob(job);
      added++;
    }
  }

  // Update source record
  const src = storage.getSources().find(s =>
    s.name.toLowerCase().includes(result.source.toLowerCase().split(" ")[0])
  );
  if (src) {
    storage.updateSource(src.id, {
      lastPolled: new Date().toISOString(),
      lastStatus: result.error ? "error" : "success",
      jobsFound: (src.jobsFound ?? 0) + added,
      errorMessage: result.error || null,
    } as any);
  }

  if (added > 0) {
    storage.createActivityLog({
      source: result.source,
      action: "api_fetch",
      details: `Fetched ${added} new jobs from ${result.source}`,
      jobsAdded: added,
      timestamp: new Date().toISOString(),
    });
  }

  return added;
}

// ============================================================
// INGESTION ENGINE
// ============================================================
let pollInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
let lastApiFetch = 0;
const API_POLL_INTERVAL = 5 * 60 * 1000; // Poll APIs every 5 min (saves rate limits)

export async function seedInitialJobs() {
  // Register default sources if none exist
  const existingSources = storage.getSources();
  if (existingSources.length === 0) {
    const defaultSources = [
      { name: "Craigslist LA/OC/SD", type: "scraper", url: "https://losangeles.craigslist.org/search/jjj", isActive: true, config: '{"regions":["la","oc","sd"]}' },
      { name: "Indeed API", type: "api", url: "https://www.indeed.com", isActive: true, config: '{"partner": false}' },
      { name: "ZipRecruiter", type: "api", url: "https://www.ziprecruiter.com", isActive: true, config: null },
      { name: "JSearch API", type: "api", url: "https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch", isActive: true, config: '{"tier":"free","callsPerMonth":200}' },
      { name: "Jooble API", type: "api", url: "https://jooble.org/api/about", isActive: true, config: '{"location":"Southern California","radius":50}' },
      { name: "Techmap RSS", type: "api", url: "https://api.techmap.io", isActive: true, config: '{"feeds":["construction","warehouse","trades"]}' },
      { name: "Adzuna", type: "api", url: "https://api.adzuna.com", isActive: false, config: null },
      { name: "Facebook Jobs", type: "scraper", url: "https://facebook.com/jobs", isActive: true, config: null },
      { name: "Union Hiring Hall", type: "scraper", url: "https://unionhiringhall.com", isActive: true, config: null },
      { name: "PeopleReady", type: "scraper", url: "https://jobs.peopleready.com", isActive: true, config: null },
      { name: "CA EDD", type: "api", url: "https://edd.ca.gov", isActive: true, config: null },
      { name: "PlanHub Bids", type: "scraper", url: "https://planhub.com", isActive: true, config: '{"type":"construction_bids"}' },
    ];
    for (const src of defaultSources) storage.createSource(src);
  }

  // Fetch real jobs from APIs on first run
  const existingCount = storage.getJobCount();
  if (existingCount === 0) {
    console.log("[Ingestion] No jobs in DB — fetching from APIs...");
    const added = await fetchFromAPIs();
    storage.createActivityLog({
      source: "System", action: "seed",
      details: `Initial API fetch: ${added} real job listings added`,
      jobsAdded: added, timestamp: new Date().toISOString(),
    });
  }
}

// Fetch from all configured API sources
export async function fetchFromAPIs(): Promise<number> {
  let totalAdded = 0;

  const fetchers: Array<() => Promise<FetchResult>> = [
    fetchJSearch,
    fetchJooble,
    fetchTechmap,
    fetchAdzuna,
  ];

  const results = await Promise.allSettled(fetchers.map(fn => fn()));

  for (const result of results) {
    if (result.status === "fulfilled") {
      const added = await upsertFetchResult(result.value);
      totalAdded += added;
      console.log(`[Ingestion] ${result.value.source}: +${added} jobs${result.value.error ? ` (${result.value.error})` : ""}`);
    } else {
      console.error("[Ingestion] Fetch error:", result.reason);
    }
  }

  // Trigger alerts for new jobs
  if (totalAdded > 0) {
    console.log(`[Ingestion] Total new jobs from APIs: ${totalAdded}`);
  }

  return totalAdded;
}

export async function pollForNewJobs() {
  // Only poll real APIs — no fake/simulated jobs
  const now = Date.now();
  if (now - lastApiFetch >= API_POLL_INTERVAL) {
    lastApiFetch = now;
    try {
      await fetchFromAPIs();
    } catch (e) {
      console.error("[Ingestion] API fetch error:", e);
    }
  }
}

export function startPolling(intervalMs: number = 30000) {
  if (isRunning) return;
  isRunning = true;

  // Initial API fetch on startup
  fetchFromAPIs().catch(e => console.error("[Ingestion] Initial API fetch error:", e));
  lastApiFetch = Date.now();

  pollInterval = setInterval(async () => {
    try {
      await pollForNewJobs();
    } catch (e) { console.error("Polling error:", e); }
  }, intervalMs);
  console.log(`[Ingestion] Polling started every ${intervalMs / 1000}s (APIs every ${API_POLL_INTERVAL / 1000}s)`);
}

export function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  isRunning = false;
  console.log("[Ingestion] Polling stopped");
}

export function isPolling() { return isRunning; }

// Manual trigger for admin
export async function triggerManualFetch(): Promise<{ totalAdded: number; results: string[] }> {
  const logs: string[] = [];
  let totalAdded = 0;

  const fetchers: Array<[string, () => Promise<FetchResult>]> = [
    ["JSearch API", fetchJSearch],
    ["Jooble API", fetchJooble],
    ["Techmap RSS", fetchTechmap],
    ["Adzuna", fetchAdzuna],
  ];

  for (const [name, fn] of fetchers) {
    try {
      const result = await fn();
      const added = await upsertFetchResult(result);
      totalAdded += added;
      logs.push(`${name}: +${added} jobs${result.error ? ` (${result.error})` : ""}`);
    } catch (e: any) {
      logs.push(`${name}: ERROR - ${e.message}`);
    }
  }

  storage.createActivityLog({
    source: "Admin",
    action: "manual_fetch",
    details: `Manual fetch triggered. ${totalAdded} new jobs added.\n${logs.join("\n")}`,
    jobsAdded: totalAdded,
    timestamp: new Date().toISOString(),
  });

  return { totalAdded, results: logs };
}
