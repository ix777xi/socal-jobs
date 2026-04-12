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

// ============================================================
// Craigslist LA/OC/SD — parse search results HTML
// Craigslist removed RSS feeds; we parse the gallery JSON endpoint
// ============================================================
async function fetchCraigslist(): Promise<FetchResult> {
  const source = storage.getSources().find(s => s.name === "Craigslist LA/OC/SD");
  if (!source?.isActive) return { source: "Craigslist LA/OC/SD", jobs: [], error: "Source disabled" };

  const results: InsertJob[] = [];
  const regions = [
    { subdomain: "losangeles", label: "Los Angeles" },
    { subdomain: "orangecounty", label: "Orange County" },
    { subdomain: "sandiego", label: "San Diego" },
    { subdomain: "inlandempire", label: "Inland Empire" },
  ];
  const queries = ["construction", "warehouse", "labor", "electrician", "plumber", "hvac", "cdl driver", "welder"];

  for (const region of regions) {
    for (const query of queries.slice(0, 3)) {
      try {
        // Craigslist search results page — parse HTML
        const url = `https://${region.subdomain}.craigslist.org/search/jjj?query=${encodeURIComponent(query)}&sort=date`;
        const resp = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; OrangeBCJobs/1.0)",
            "Accept": "text/html",
          },
        });
        if (!resp.ok) { console.error(`[Craigslist] HTTP ${resp.status} for ${region.subdomain}/${query}`); continue; }

        const html = await resp.text();

        // Parse listing titles and links from Craigslist HTML
        // Craigslist uses <a class="posting-title"> or <li class="cl-static-search-result">
        const listingRegex = /<li[^>]*class="[^"]*cl-static-search-result[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<div[^>]*class="title"[^>]*>([^<]+)<\/div>[\s\S]*?(?:<div[^>]*class="location"[^>]*>([^<]*)<\/div>)?/g;
        // Alternate regex for newer Craigslist format
        const altRegex = /<a[^>]*href="(https:\/\/[^"]*\.craigslist\.org\/[^"]+)"[^>]*class="[^"]*posting-title[^"]*"[^>]*>[\s\S]*?<span[^>]*class="label"[^>]*>([^<]+)<\/span>/g;

        let match;
        let found = 0;
        while ((match = listingRegex.exec(html)) !== null && found < 10) {
          const [, listingUrl, title, location] = match;
          if (!title?.trim()) continue;

          const jobLocation = location?.trim() || `${region.label}, CA`;
          results.push(buildJob({
            title: title.trim(),
            company: "Craigslist Posting",
            location: jobLocation.includes("CA") ? jobLocation : `${jobLocation}, CA`,
            description: `${title.trim()} — Posted on Craigslist ${region.label}. View full details at the original posting.`,
            url: listingUrl.startsWith("http") ? listingUrl : `https://${region.subdomain}.craigslist.org${listingUrl}`,
            source: "Craigslist",
            sourceId: `cl-${listingUrl.replace(/[^a-zA-Z0-9]/g, "-").slice(-40)}`,
          }));
          found++;
        }

        // Try alternate pattern if first didn't match
        if (found === 0) {
          while ((match = altRegex.exec(html)) !== null && found < 10) {
            const [, listingUrl, title] = match;
            if (!title?.trim()) continue;
            results.push(buildJob({
              title: title.trim(),
              company: "Craigslist Posting",
              location: `${region.label}, CA`,
              description: `${title.trim()} — Posted on Craigslist ${region.label}. View full details at the original posting.`,
              url: listingUrl,
              source: "Craigslist",
              sourceId: `cl-${listingUrl.replace(/[^a-zA-Z0-9]/g, "-").slice(-40)}`,
            }));
            found++;
          }
        }
      } catch (e) {
        console.error(`[Craigslist] Error fetching ${region.subdomain}/${query}:`, e);
      }
      await new Promise(r => setTimeout(r, 1000)); // Be respectful
    }
  }

  return { source: "Craigslist LA/OC/SD", jobs: results };
}

// ============================================================
// Indeed — We use JSearch which already aggregates Indeed listings.
// This fetcher runs a second JSearch pass specifically with Indeed-style
// queries and attributes results to "Indeed" for the admin panel.
// ============================================================
async function fetchIndeed(): Promise<FetchResult> {
  const source = storage.getSources().find(s => s.name === "Indeed API");
  if (!source?.isActive) return { source: "Indeed API", jobs: [], error: "Source disabled" };

  // Indeed data comes through JSearch API — check for that key
  const jsearchSource = storage.getSources().find(s => s.name === "JSearch API");
  const apiKey = jsearchSource?.apiKey || process.env.JSEARCH_API_KEY;
  if (!apiKey) return { source: "Indeed API", jobs: [], error: "No API key configured (uses JSearch)" };

  const results: InsertJob[] = [];
  // Different queries than main JSearch to avoid duplicates, focus on Indeed
  const queries = ["general labor", "truck driver", "roofing", "cleaning janitorial", "moving helper"];
  const locations = ["Orange County, CA", "Riverside, CA", "San Bernardino, CA"];

  for (const query of queries.slice(0, 3)) {
    for (const loc of locations.slice(0, 2)) {
      try {
        const searchQuery = `${query} in ${loc}`;
        const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(searchQuery)}&page=1&num_pages=1&date_posted=week`;

        const resp = await fetch(url, {
          headers: {
            "x-rapidapi-key": apiKey,
            "x-rapidapi-host": "jsearch.p.rapidapi.com",
          },
        });
        if (!resp.ok) continue;

        const data = await resp.json();
        for (const item of (data.data || [])) {
          const jobLocation = item.job_city ? `${item.job_city}, ${item.job_state || "CA"}` : loc;
          if (!isSoCalLocation(jobLocation)) continue;

          // Check if it came from Indeed specifically
          const viaIndeed = item.job_publisher === "Indeed" || 
            (item.job_apply_link || "").includes("indeed.com");

          results.push(buildJob({
            title: item.job_title,
            company: item.employer_name || "Unknown",
            location: jobLocation,
            description: item.job_description?.substring(0, 2000),
            payMin: item.job_min_salary,
            payMax: item.job_max_salary,
            payType: item.job_salary_period === "HOUR" ? "hourly" : item.job_salary_period === "YEAR" ? "salary" : undefined,
            url: item.job_apply_link || item.job_google_link || null,
            source: viaIndeed ? "Indeed" : "Indeed/JSearch",
            sourceId: item.job_id || null,
            postedAt: item.job_posted_at_datetime_utc || new Date().toISOString(),
          }));
        }
      } catch (e) {
        console.error(`[Indeed] Error:`, e);
      }
    }
    await new Promise(r => setTimeout(r, 600));
  }

  return { source: "Indeed API", jobs: results };
}

// ============================================================
// ZipRecruiter — Uses JSearch aggregated data + identifies ZR listings
// ============================================================
async function fetchZipRecruiter(): Promise<FetchResult> {
  const source = storage.getSources().find(s => s.name === "ZipRecruiter");
  if (!source?.isActive) return { source: "ZipRecruiter", jobs: [], error: "Source disabled" };

  const jsearchSource = storage.getSources().find(s => s.name === "JSearch API");
  const apiKey = jsearchSource?.apiKey || process.env.JSEARCH_API_KEY;
  if (!apiKey) return { source: "ZipRecruiter", jobs: [], error: "No API key configured (uses JSearch)" };

  const results: InsertJob[] = [];
  // Queries focused on trades not covered by main JSearch pass
  const queries = ["landscaping", "painting house", "demolition", "flooring installer", "auto mechanic"];

  for (const query of queries.slice(0, 3)) {
    try {
      const searchQuery = `${query} in Southern California`;
      const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(searchQuery)}&page=1&num_pages=1&date_posted=week`;

      const resp = await fetch(url, {
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": "jsearch.p.rapidapi.com",
        },
      });
      if (!resp.ok) continue;

      const data = await resp.json();
      for (const item of (data.data || [])) {
        const jobLocation = item.job_city ? `${item.job_city}, ${item.job_state || "CA"}` : "Southern California";
        if (!isSoCalLocation(jobLocation)) continue;

        const viaZR = item.job_publisher === "ZipRecruiter" || 
          (item.job_apply_link || "").includes("ziprecruiter.com");

        results.push(buildJob({
          title: item.job_title,
          company: item.employer_name || "Unknown",
          location: jobLocation,
          description: item.job_description?.substring(0, 2000),
          payMin: item.job_min_salary,
          payMax: item.job_max_salary,
          payType: item.job_salary_period === "HOUR" ? "hourly" : undefined,
          url: item.job_apply_link || item.job_google_link || null,
          source: viaZR ? "ZipRecruiter" : "ZipRecruiter/JSearch",
          sourceId: item.job_id || null,
          postedAt: item.job_posted_at_datetime_utc || new Date().toISOString(),
        }));
      }
    } catch (e) {
      console.error(`[ZipRecruiter] Error:`, e);
    }
    await new Promise(r => setTimeout(r, 600));
  }

  return { source: "ZipRecruiter", jobs: results };
}

// ============================================================
// Facebook Jobs — fetch from Facebook's job listing pages
// Facebook Jobs doesn't have a public API; we try their mobile-friendly
// jobs search URL and parse what we can
// ============================================================
async function fetchFacebookJobs(): Promise<FetchResult> {
  const source = storage.getSources().find(s => s.name === "Facebook Jobs");
  if (!source?.isActive) return { source: "Facebook Jobs", jobs: [], error: "Source disabled" };

  const results: InsertJob[] = [];

  try {
    // Facebook Jobs search URL for SoCal blue collar
    const searchUrls = [
      "https://www.facebook.com/jobs/search/?q=construction%20labor&location_id=110922078936394", // LA
      "https://www.facebook.com/jobs/search/?q=warehouse&location_id=110922078936394",
    ];

    for (const searchUrl of searchUrls) {
      try {
        const resp = await fetch(searchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; OrangeBCJobs/1.0)",
            "Accept": "text/html",
          },
          redirect: "follow",
        });

        if (!resp.ok) {
          console.error(`[Facebook Jobs] HTTP ${resp.status}`);
          continue;
        }

        const html = await resp.text();

        // Try to extract job data from Facebook's HTML/JSON embedded data
        const jsonLdMatches = html.match(/"JobPosting"[\s\S]*?\}/g) || [];
        for (const jsonStr of jsonLdMatches.slice(0, 10)) {
          try {
            // Attempt to parse structured data if present
            const startIdx = html.indexOf(jsonStr) - 100;
            const block = html.substring(Math.max(0, startIdx), startIdx + jsonStr.length + 200);
            const titleMatch = block.match(/"title"\s*:\s*"([^"]+)"/);
            const companyMatch = block.match(/"hiringOrganization"[\s\S]*?"name"\s*:\s*"([^"]+)"/);
            const locationMatch = block.match(/"addressLocality"\s*:\s*"([^"]+)"/);

            if (titleMatch) {
              results.push(buildJob({
                title: titleMatch[1],
                company: companyMatch?.[1] || "Facebook Job Post",
                location: locationMatch ? `${locationMatch[1]}, CA` : "Los Angeles, CA",
                description: `${titleMatch[1]} — Found on Facebook Jobs`,
                url: searchUrl,
                source: "Facebook",
                sourceId: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              }));
            }
          } catch (e) { /* skip individual parse errors */ }
        }
      } catch (e) {
        console.error("[Facebook Jobs] Fetch error:", e);
      }
    }
  } catch (e) {
    console.error("[Facebook Jobs] Error:", e);
  }

  // Facebook typically blocks non-authenticated fetches
  if (results.length === 0) {
    return { source: "Facebook Jobs", jobs: [], error: "Facebook requires authentication for job data" };
  }

  return { source: "Facebook Jobs", jobs: results };
}

// ============================================================
// Union Hiring Hall — parse job listings from their website
// ============================================================
async function fetchUnionHiringHall(): Promise<FetchResult> {
  const source = storage.getSources().find(s => s.name === "Union Hiring Hall");
  if (!source?.isActive) return { source: "Union Hiring Hall", jobs: [], error: "Source disabled" };

  const results: InsertJob[] = [];

  try {
    // Try the union hiring hall site
    const resp = await fetch("https://www.unionjobs.com/search_jobs.php?state=California", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OrangeBCJobs/1.0)" },
    });

    if (resp.ok) {
      const html = await resp.text();

      // Parse job listings from HTML
      const jobRegex = /<a[^>]*href="([^"]*job[^"]*)">([^<]+)<\/a>[\s\S]*?(?:location|city|where)[^>]*>([^<]*(?:california|los angeles|san diego|orange|riverside|CA)[^<]*)</gi;
      let match;
      let found = 0;

      while ((match = jobRegex.exec(html)) !== null && found < 15) {
        const [, jobUrl, title, location] = match;
        if (!title?.trim()) continue;
        if (!isSoCalLocation(location)) continue;

        results.push(buildJob({
          title: title.trim(),
          company: "Union Hiring Hall",
          location: location.trim(),
          description: `${title.trim()} — Union job listing in Southern California`,
          url: jobUrl.startsWith("http") ? jobUrl : `https://www.unionjobs.com${jobUrl}`,
          source: "Union Hall",
          sourceId: `union-${jobUrl.replace(/[^a-zA-Z0-9]/g, "-").slice(-30)}`,
        }));
        found++;
      }
    }

    // Also try LiUNA (Laborers' International Union) SoCal
    try {
      const liunaResp = await fetch("https://www.liuna.org/jobs?state=California", {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; OrangeBCJobs/1.0)" },
      });
      if (liunaResp.ok) {
        const liunaHtml = await liunaResp.text();
        const titleRegex = /<h[23][^>]*class="[^"]*job[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
        let lMatch;
        let lFound = 0;
        while ((lMatch = titleRegex.exec(liunaHtml)) !== null && lFound < 10) {
          const [, url, title] = lMatch;
          results.push(buildJob({
            title: title.trim(),
            company: "LiUNA",
            location: "Southern California",
            description: `${title.trim()} — LiUNA Union job in California`,
            url: url.startsWith("http") ? url : `https://www.liuna.org${url}`,
            source: "Union Hall",
            sourceId: `liuna-${url.replace(/[^a-zA-Z0-9]/g, "-").slice(-30)}`,
          }));
          lFound++;
        }
      }
    } catch (e) { /* skip LiUNA errors */ }

  } catch (e) {
    console.error("[Union Hiring Hall] Error:", e);
    return { source: "Union Hiring Hall", jobs: [], error: `Fetch failed: ${(e as Error).message}` };
  }

  return { source: "Union Hiring Hall", jobs: results };
}

// ============================================================
// PeopleReady — parse their job search results
// PeopleReady uses JobStack app; we try their web job search
// ============================================================
async function fetchPeopleReady(): Promise<FetchResult> {
  const source = storage.getSources().find(s => s.name === "PeopleReady");
  if (!source?.isActive) return { source: "PeopleReady", jobs: [], error: "Source disabled" };

  const results: InsertJob[] = [];
  const locations = ["Los Angeles", "San Diego", "Anaheim", "Riverside"];

  for (const city of locations) {
    try {
      // PeopleReady job search page
      const resp = await fetch(`https://www.peopleready.com/job-search/?location=${encodeURIComponent(city + ", CA")}`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; OrangeBCJobs/1.0)" },
      });

      if (!resp.ok) continue;
      const html = await resp.text();

      // Look for job listings in HTML — structured data or listing elements
      const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
      let jsonMatch;
      while ((jsonMatch = jsonLdRegex.exec(html)) !== null) {
        try {
          const jsonData = JSON.parse(jsonMatch[1]);
          const items = Array.isArray(jsonData) ? jsonData : jsonData.itemListElement || [jsonData];
          for (const item of items) {
            if (item["@type"] !== "JobPosting" && item?.item?.["@type"] !== "JobPosting") continue;
            const job = item["@type"] === "JobPosting" ? item : item.item;

            const jobLocation = job.jobLocation?.address?.addressLocality || city;
            if (!isSoCalLocation(jobLocation + ", CA")) continue;

            results.push(buildJob({
              title: job.title || "PeopleReady Position",
              company: job.hiringOrganization?.name || "PeopleReady",
              location: `${jobLocation}, CA`,
              description: (job.description || "").replace(/<[^>]+>/g, " ").substring(0, 2000),
              url: job.url || `https://www.peopleready.com/job-search/?location=${encodeURIComponent(city + ", CA")}`,
              source: "PeopleReady",
              sourceId: job.identifier?.value || `pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              postedAt: job.datePosted || new Date().toISOString(),
            }));
          }
        } catch (e) { /* skip JSON parse errors */ }
      }

      // Fallback: parse HTML listing elements
      if (results.length === 0) {
        const listingRegex = /<(?:div|article)[^>]*class="[^"]*job[_-]?(?:listing|card|result)[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<[^>]*class="[^"]*location[^"]*"[^>]*>([^<]*)<\/[^>]*>/gi;
        let htmlMatch;
        let found = 0;
        while ((htmlMatch = listingRegex.exec(html)) !== null && found < 10) {
          const [, url, title, loc] = htmlMatch;
          results.push(buildJob({
            title: title.trim(),
            company: "PeopleReady",
            location: loc?.includes("CA") ? loc.trim() : `${city}, CA`,
            description: `${title.trim()} — Available through PeopleReady staffing`,
            url: url.startsWith("http") ? url : `https://www.peopleready.com${url}`,
            source: "PeopleReady",
            sourceId: `pr-${url.replace(/[^a-zA-Z0-9]/g, "-").slice(-30)}`,
          }));
          found++;
        }
      }
    } catch (e) {
      console.error(`[PeopleReady] Error for ${city}:`, e);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  return { source: "PeopleReady", jobs: results };
}

// ============================================================
// CA EDD / CalJOBS — California Employment Development Dept
// CalJOBS uses the National Labor Exchange (NLx) system
// We try their public search and the USNLX public JSON API
// ============================================================
async function fetchCAEDD(): Promise<FetchResult> {
  const source = storage.getSources().find(s => s.name === "CA EDD");
  if (!source?.isActive) return { source: "CA EDD", jobs: [], error: "Source disabled" };

  const results: InsertJob[] = [];
  const queries = ["construction", "warehouse", "electrician", "truck driver", "laborer", "mechanic"];

  // Use the USNLX (US National Labor Exchange) public API which includes CalJOBS data
  for (const query of queries.slice(0, 4)) {
    try {
      const url = `https://usnlx.com/api/v1/jobs?q=${encodeURIComponent(query)}&location=${encodeURIComponent("California")}&radius=50&page=1&limit=10`;
      const resp = await fetch(url, {
        headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (compatible; OrangeBCJobs/1.0)" },
      });

      if (resp.ok) {
        const data = await resp.json();
        const jobs = data.jobs || data.results || data.data || [];
        for (const item of jobs) {
          const location = item.location || item.city || "California";
          if (!isSoCalLocation(location)) continue;

          results.push(buildJob({
            title: item.title || item.jobTitle || "EDD Listing",
            company: item.company || item.employer || "CA Employer",
            location: location.includes("CA") ? location : `${location}, CA`,
            description: (item.description || item.snippet || "").substring(0, 2000),
            payMin: item.salaryMin || item.salary_min || null,
            payMax: item.salaryMax || item.salary_max || null,
            url: item.url || item.applyUrl || "https://www.caljobs.ca.gov",
            source: "CA EDD",
            sourceId: item.id?.toString() || `edd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            postedAt: item.datePosted || item.posted_date || new Date().toISOString(),
          }));
        }
      }
    } catch (e) {
      console.error(`[CA EDD] API error for "${query}":`, e);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  // Also try CalJOBS direct search page for structured data
  try {
    const caljobsResp = await fetch("https://www.caljobs.ca.gov/vosnet/Default.aspx", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OrangeBCJobs/1.0)" },
    });
    if (caljobsResp.ok) {
      const html = await caljobsResp.text();
      // Look for JSON-LD structured data
      const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
      let jsonMatch;
      while ((jsonMatch = jsonLdRegex.exec(html)) !== null) {
        try {
          const jsonData = JSON.parse(jsonMatch[1]);
          if (jsonData["@type"] === "JobPosting" || jsonData.itemListElement) {
            const items = jsonData.itemListElement || [jsonData];
            for (const item of items.slice(0, 10)) {
              const job = item.item || item;
              if (job["@type"] !== "JobPosting") continue;
              const loc = job.jobLocation?.address?.addressLocality || "";
              if (!isSoCalLocation(loc + " CA")) continue;

              results.push(buildJob({
                title: job.title,
                company: job.hiringOrganization?.name || "CA Employer",
                location: `${loc}, CA`,
                description: (job.description || "").replace(/<[^>]+>/g, " ").substring(0, 2000),
                url: job.url || "https://www.caljobs.ca.gov",
                source: "CA EDD",
                sourceId: `caljobs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                postedAt: job.datePosted || new Date().toISOString(),
              }));
            }
          }
        } catch (e) { /* skip */ }
      }
    }
  } catch (e) { /* skip CalJOBS direct fetch errors */ }

  return { source: "CA EDD", jobs: results };
}

// ============================================================
// PlanHub Bids — construction bid opportunities
// PlanHub has public listings for construction projects
// ============================================================
async function fetchPlanHub(): Promise<FetchResult> {
  const source = storage.getSources().find(s => s.name === "PlanHub Bids");
  if (!source?.isActive) return { source: "PlanHub Bids", jobs: [], error: "Source disabled" };

  const results: InsertJob[] = [];

  try {
    // PlanHub public construction bids page for California
    const resp = await fetch("https://planhub.com/construction-bids/?state=California", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OrangeBCJobs/1.0)", "Accept": "text/html" },
    });

    if (!resp.ok) {
      return { source: "PlanHub Bids", jobs: [], error: `HTTP ${resp.status}` };
    }

    const html = await resp.text();

    // Look for structured data or listing elements
    // PlanHub uses React/Next.js, so check for __NEXT_DATA__ JSON
    const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const projects = nextData?.props?.pageProps?.projects || 
                         nextData?.props?.pageProps?.initialData?.projects || [];

        for (const project of projects.slice(0, 15)) {
          const location = project.city || project.location || "";
          const state = project.state || "CA";
          if (state !== "CA" || !isSoCalLocation(location + " " + state)) continue;

          results.push(buildJob({
            title: project.name || project.title || "Construction Project",
            company: project.gc_name || project.company || "General Contractor",
            location: `${location}, ${state}`,
            description: [
              project.name || project.title,
              project.building_use ? `Building Use: ${project.building_use}` : "",
              project.construction_type ? `Type: ${project.construction_type}` : "",
              project.bid_date ? `Bid Date: ${project.bid_date}` : "",
              project.value ? `Est. Value: ${project.value}` : "",
              "Construction bid opportunity via PlanHub",
            ].filter(Boolean).join("\n"),
            workType: "contract",
            url: project.url || `https://planhub.com/construction-bids/?state=California`,
            source: "PlanHub",
            sourceId: project.id?.toString() || `ph-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            postedAt: project.created_at || project.publish_date || new Date().toISOString(),
          }));
        }
      } catch (e) {
        console.error("[PlanHub] JSON parse error:", e);
      }
    }

    // Fallback: parse HTML listing cards
    if (results.length === 0) {
      const cardRegex = /<(?:div|article|tr)[^>]*class="[^"]*(?:project|bid|listing)[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?(?:<[^>]*class="[^"]*(?:location|city)[^"]*"[^>]*>([^<]*)<)?/gi;
      let match;
      let found = 0;
      while ((match = cardRegex.exec(html)) !== null && found < 15) {
        const [, url, title, loc] = match;
        const location = loc?.trim() || "Southern California";
        if (!isSoCalLocation(location + " CA")) continue;

        results.push(buildJob({
          title: title.trim(),
          company: "PlanHub Listing",
          location: location.includes("CA") ? location : `${location}, CA`,
          description: `${title.trim()} — Construction bid opportunity via PlanHub`,
          workType: "contract",
          url: url.startsWith("http") ? url : `https://planhub.com${url}`,
          source: "PlanHub",
          sourceId: `ph-${url.replace(/[^a-zA-Z0-9]/g, "-").slice(-30)}`,
        }));
        found++;
      }
    }
  } catch (e) {
    console.error("[PlanHub] Error:", e);
    return { source: "PlanHub Bids", jobs: [], error: `Fetch failed: ${(e as Error).message}` };
  }

  return { source: "PlanHub Bids", jobs: results };
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

  // Update source record — match by exact name first, then partial match
  const srcName = result.source.toLowerCase();
  const src = storage.getSources().find(s => s.name.toLowerCase() === srcName) ||
    storage.getSources().find(s => {
      const sName = s.name.toLowerCase();
      return sName.includes(srcName.split(" ")[0]) || srcName.includes(sName.split(" ")[0]);
    });
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
    fetchCraigslist,
    fetchIndeed,
    fetchZipRecruiter,
    fetchFacebookJobs,
    fetchUnionHiringHall,
    fetchPeopleReady,
    fetchCAEDD,
    fetchPlanHub,
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
    ["Craigslist LA/OC/SD", fetchCraigslist],
    ["Indeed API", fetchIndeed],
    ["ZipRecruiter", fetchZipRecruiter],
    ["Facebook Jobs", fetchFacebookJobs],
    ["Union Hiring Hall", fetchUnionHiringHall],
    ["PeopleReady", fetchPeopleReady],
    ["CA EDD", fetchCAEDD],
    ["PlanHub Bids", fetchPlanHub],
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
