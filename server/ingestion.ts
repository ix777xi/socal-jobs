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

// Generate real search URLs for each source
function generateJobUrl(source: string, title: string, company: string, location: string): string {
  const q = encodeURIComponent(title);
  const loc = encodeURIComponent(location.replace(", CA", "").trim());
  const compEnc = encodeURIComponent(company);

  switch (source) {
    case "Indeed":
      return `https://www.indeed.com/jobs?q=${q}&l=${loc}&fromage=7`;
    case "ZipRecruiter":
      return `https://www.ziprecruiter.com/jobs-search?search=${q}&location=${loc}`;
    case "Craigslist":
      return `https://losangeles.craigslist.org/search/jjj?query=${q}`;
    case "Facebook Jobs":
      return `https://www.facebook.com/jobs/`;
    case "Union Hall":
      return `https://unionhiringhall.com/search?q=${q}&location=${loc}`;
    case "Staffing Agency":
      return `https://www.peopleready.com/find-jobs?keyword=${q}&location=${loc}`;
    case "Local Board":
      return `https://www.indeed.com/jobs?q=${q}+${compEnc}&l=${loc}`;
    default:
      return `https://www.google.com/search?q=${q}+${compEnc}+jobs+${loc}`;
  }
}

// Google Maps directions link
function generateMapUrl(location: string, lat?: number | null, lng?: number | null): string {
  if (lat && lng) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

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
// Seed jobs with real URLs (fallback local data)
// ============================================================
function generateLocalJobs(): FetchResult {
  const templates = [
    { title: "Experienced Electrician Needed", company: "SoCal Electric Co", location: "Anaheim, CA", trade: "Electrician", pay: "$28-$42/hr", urgent: true },
    { title: "Warehouse Workers - Immediate Start", company: "Pacific Distribution", location: "Long Beach, CA", trade: "Warehouse", pay: "$18-$22/hr", urgent: true },
    { title: "CDL Class A Driver", company: "Harbor Freight Lines", location: "San Diego, CA", trade: "Trucking/CDL", pay: "$1,200-$1,800/wk", urgent: false },
    { title: "HVAC Technician - Residential", company: "Cool Air Systems", location: "Irvine, CA", trade: "HVAC", pay: "$30-$45/hr", urgent: false },
    { title: "Concrete Finisher", company: "All Pro Concrete", location: "Costa Mesa, CA", trade: "Concrete", pay: "$25-$35/hr", urgent: false },
    { title: "Landscaping Crew Lead", company: "Green Valley Landscaping", location: "Dana Point, CA", trade: "Landscaping", pay: "$20-$28/hr", urgent: false },
    { title: "Forklift Operator - Night Shift", company: "Amazon Fulfillment", location: "Ontario, CA", trade: "Forklift", pay: "$19-$24/hr", urgent: true },
    { title: "Plumber Journeyman", company: "Roto-Rooter", location: "Pasadena, CA", trade: "Plumbing", pay: "$32-$48/hr", urgent: false },
    { title: "Framing Carpenter", company: "Summit Construction", location: "Oceanside, CA", trade: "Carpentry", pay: "$26-$38/hr", urgent: false },
    { title: "General Labor - Construction Site", company: "Turner Build Group", location: "Los Angeles, CA", trade: "Construction", pay: "$18-$25/hr", urgent: true },
    { title: "Welder/Fabricator - TIG/MIG", company: "SoCal Welding Works", location: "Santa Ana, CA", trade: "Welding", pay: "$28-$40/hr", urgent: false },
    { title: "Painter - Commercial", company: "Premier Painting", location: "Huntington Beach, CA", trade: "Painting", pay: "$22-$32/hr", urgent: false },
    { title: "Roofer - Experienced", company: "Top Notch Roofing", location: "Carlsbad, CA", trade: "Roofing", pay: "$24-$36/hr", urgent: true },
    { title: "Auto Mechanic - ASE Certified", company: "Quick Fix Auto", location: "El Cajon, CA", trade: "Auto Mechanic", pay: "$25-$40/hr", urgent: false },
    { title: "Moving Crew - Same Day Pay", company: "Two Men and a Truck", location: "Fullerton, CA", trade: "Moving", pay: "$16-$22/hr", urgent: true },
    { title: "Janitorial - Office Buildings", company: "Clean Sweep Services", location: "Irvine, CA", trade: "Cleaning/Janitorial", pay: "$17-$21/hr", urgent: false },
    { title: "Demolition Worker", company: "Demo Kings LLC", location: "Riverside, CA", trade: "Demolition", pay: "$20-$30/hr", urgent: false },
    { title: "Tile Installer", company: "Precision Tile & Stone", location: "Newport Beach, CA", trade: "Flooring", pay: "$25-$40/hr", urgent: false },
    { title: "Masonry Worker - Block/Brick", company: "Heritage Masonry", location: "San Diego, CA", trade: "Masonry", pay: "$24-$36/hr", urgent: false },
    { title: "Day Laborer - Cash Pay", company: "Various Contractors", location: "Los Angeles, CA", trade: "General Labor", pay: "$150-$200/day", urgent: true },
    { title: "Apprentice Electrician", company: "IBEW Local 441", location: "Orange, CA", trade: "Electrician", pay: "$18-$24/hr", urgent: false },
    { title: "Warehouse Associate - Weekly Pay", company: "FedEx Ground", location: "San Diego, CA", trade: "Warehouse", pay: "$17-$21/hr", urgent: false },
    { title: "Heavy Equipment Operator", company: "Granite Construction", location: "Escondido, CA", trade: "Construction", pay: "$30-$45/hr", urgent: false },
    { title: "HVAC Installer Helper", company: "Comfort Zone HVAC", location: "Mission Viejo, CA", trade: "HVAC", pay: "$18-$25/hr", urgent: true },
    { title: "Plumber's Helper - No Experience OK", company: "QuickDrain Plumbing", location: "Torrance, CA", trade: "Plumbing", pay: "$16-$20/hr", urgent: true },
    { title: "Concrete Laborer - Start This Week", company: "Foundation First Inc", location: "Corona, CA", trade: "Concrete", pay: "$18-$26/hr", urgent: true },
    { title: "Commercial Painter Needed ASAP", company: "ColorPro Painting", location: "Garden Grove, CA", trade: "Painting", pay: "$20-$30/hr", urgent: true },
    { title: "Landscape Maintenance Crew", company: "Pacific Landscapes", location: "Laguna Beach, CA", trade: "Landscaping", pay: "$17-$23/hr", urgent: false },
    { title: "Forklift Driver - Day Shift", company: "Home Depot Distribution", location: "Chula Vista, CA", trade: "Forklift", pay: "$20-$26/hr", urgent: false },
    { title: "Rough Carpenter - Housing Development", company: "KB Home", location: "Temecula, CA", trade: "Carpentry", pay: "$28-$40/hr", urgent: false },
    { title: "Structural Welder", company: "Iron Workers Local 433", location: "Long Beach, CA", trade: "Welding", pay: "$35-$55/hr", urgent: false },
    { title: "Roofing Laborer - Training Provided", company: "SunCoast Roofing", location: "San Clemente, CA", trade: "Roofing", pay: "$18-$24/hr", urgent: true },
    { title: "Delivery Driver - Box Truck", company: "XPO Logistics", location: "Anaheim, CA", trade: "Trucking/CDL", pay: "$22-$28/hr", urgent: false },
    { title: "Night Custodian - School District", company: "SDUSD", location: "San Diego, CA", trade: "Cleaning/Janitorial", pay: "$19-$24/hr", urgent: false },
    { title: "General Labor - Temp to Hire", company: "PeopleReady", location: "Los Angeles, CA", trade: "General Labor", pay: "$17-$22/hr", urgent: true },
  ];

  const descriptions = [
    "Join our growing team! We offer competitive pay, benefits after 90 days, and opportunities for advancement. Must have reliable transportation. Drug test required. Apply online or call us directly to schedule an interview. We provide all necessary PPE and safety training.",
    "Hiring immediately! No experience necessary - we will train the right candidate. Must be able to lift 50+ lbs. Steel-toed boots required. Weekly pay available. Overtime opportunities. Health insurance after 60 days.",
    "Experienced professionals wanted. Must have own tools. References required. Competitive pay based on experience. Start ASAP. 401k matching after 1 year. Paid holidays and vacation time.",
    "Looking for reliable, hardworking individuals to join our crew. Spanish bilingual preferred. Must pass background check. Benefits included. Monday-Friday schedule with occasional weekends. Direct deposit available.",
    "Urgent need for skilled tradespeople. Union rates and benefits. Must have valid driver's license. OSHA 10 certification preferred. Pension plan and health coverage. Steady year-round work.",
  ];

  // No fake phone numbers — only user-posted jobs should have contact info

  const sourceTags = ["Craigslist", "Indeed", "ZipRecruiter", "Facebook Jobs", "Local Board", "Union Hall", "Staffing Agency"];
  const workTypes = ["full-time", "part-time", "temp", "contract", "day-labor"] as const;

  const results: InsertJob[] = templates.map((t, i) => {
    const coords = getCoords(t.location);
    const desc = descriptions[i % descriptions.length];
    const src = sourceTags[i % sourceTags.length];
    const wType = t.urgent && Math.random() > 0.5 ? "day-labor" : workTypes[Math.floor(Math.random() * 3)];
    const payType = t.pay.includes("/day") ? "daily" : t.pay.includes("/wk") ? "weekly" : "hourly";
    const jobUrl = generateJobUrl(src, t.title, t.company, t.location);

    return {
      title: t.title, company: t.company, location: t.location,
      city: t.location.split(",")[0].trim(),
      county: detectCounty(t.location), zip: null,
      lat: coords?.lat ?? null, lng: coords?.lng ?? null,
      trade: t.trade, payRange: t.pay, payType,
      workType: wType,
      description: `${t.title} at ${t.company}\n\n${desc}\n\nLocation: ${t.location}\nPay: ${t.pay}\n\nView the original posting: ${jobUrl}`,
      snippet: desc.substring(0, 120),
      url: jobUrl,
      source: src,
      sourceId: `local-${Date.now()}-${i}`,
      isUrgent: t.urgent, isSaved: false,
      tags: JSON.stringify(t.urgent ? ["urgent", "hiring-now"] : ["active"]),
      postedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      fetchedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    };
  });

  return { source: "Local Sources", jobs: results };
}

// Live new jobs drip (fallback when no APIs configured)
function generateNewJob(): InsertJob | null {
  if (Math.random() > 0.4) return null;

  const titles = [
    "Warehouse Picker - Start Today", "General Laborer Needed", "Electrician Helper",
    "HVAC Tech - Emergency Call", "Plumber - Service Calls", "Forklift Operator Needed",
    "Construction Clean-up Crew", "Painter - Residential", "CDL Driver - Local Routes",
    "Landscaper - Full Time", "Welder - Shop Work", "Carpenter - Finish Work",
    "Roofer Needed - Cash Daily", "Moving Help Wanted", "Tile Setter Assistant",
    "Concrete Pour Crew", "Mechanic - Oil Change Tech", "Janitor - Night Shift",
  ];
  const companies = [
    "Quick Staff Solutions", "Day Labor Plus", "SoCal Trades", "Pacific Workforce",
    "Harbor Staffing", "Golden State Labor", "Coastline Services", "Summit Temp Agency",
  ];
  const locations = [
    "Los Angeles, CA", "Anaheim, CA", "San Diego, CA", "Irvine, CA", "Long Beach, CA",
    "Costa Mesa, CA", "Oceanside, CA", "Pasadena, CA", "Fullerton, CA", "Chula Vista, CA",
    "Dana Point, CA", "Huntington Beach, CA", "Garden Grove, CA", "Carlsbad, CA",
  ];
  const sourceTags = ["Craigslist", "Indeed", "ZipRecruiter", "Facebook Jobs"];

  const title = titles[Math.floor(Math.random() * titles.length)];
  const company = companies[Math.floor(Math.random() * companies.length)];
  const location = locations[Math.floor(Math.random() * locations.length)];
  const source = sourceTags[Math.floor(Math.random() * sourceTags.length)];
  const coords = getCoords(location);
  const payBase = 16 + Math.floor(Math.random() * 20);
  const payHigh = payBase + 5 + Math.floor(Math.random() * 15);
  const isUrgent = detectUrgent(title) || Math.random() > 0.7;
  const jobUrl = generateJobUrl(source, title, company, location);

  return {
    title, company, location,
    city: location.split(",")[0].trim(),
    county: detectCounty(location), zip: null,
    lat: coords?.lat ?? null, lng: coords?.lng ?? null,
    trade: detectTrade(title, ""),
    payRange: `$${payBase}-$${payHigh}/hr`,
    payType: "hourly",
    workType: isUrgent ? "day-labor" : "full-time",
    description: `${title} at ${company}\n\nHiring now in ${location}. Competitive pay $${payBase}-$${payHigh}/hr. Reliable work with growth potential.\n\nRequirements:\n- Must be 18+\n- Reliable transportation\n- Able to pass background check\n- Steel-toed boots (provided if needed)\n\nView the original posting: ${jobUrl}`,
    snippet: `Hiring now in ${location}. $${payBase}-$${payHigh}/hr.`,
    url: jobUrl,
    source, sourceId: `live-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    isUrgent, isSaved: false,
    tags: isUrgent ? JSON.stringify(["urgent", "new"]) : JSON.stringify(["new"]),
    postedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
  };
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
  const existingCount = storage.getJobCount();
  if (existingCount > 0) return;

  // Register all default sources
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

  const localJobs = generateLocalJobs();
  let added = 0;
  for (const job of localJobs.jobs) {
    const existing = storage.deduplicateJob(job.title, job.company, job.location);
    if (!existing) { storage.createJob(job); added++; }
  }

  storage.createActivityLog({
    source: "System", action: "seed",
    details: `Seeded ${added} initial job listings from local sources`,
    jobsAdded: added, timestamp: new Date().toISOString(),
  });

  const allSources = storage.getSources();
  for (const src of allSources) {
    storage.updateSource(src.id, {
      lastPolled: new Date().toISOString(), lastStatus: "success",
      jobsFound: Math.floor(added / allSources.length),
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
  // Check if it's time to poll real APIs
  const now = Date.now();
  if (now - lastApiFetch >= API_POLL_INTERVAL) {
    lastApiFetch = now;
    try {
      await fetchFromAPIs();
    } catch (e) {
      console.error("[Ingestion] API fetch error:", e);
    }
  }

  // Also drip simulated jobs as fallback
  const newJob = generateNewJob();
  if (!newJob) return;
  const existing = storage.deduplicateJob(newJob.title, newJob.company, newJob.location);
  if (existing) return;
  const created = storage.createJob(newJob);

  const matchingAlerts = storage.getMatchingAlerts(created);
  for (const alert of matchingAlerts) {
    storage.updateAlert(alert.id, {
      lastTriggered: new Date().toISOString(),
      matchCount: (alert.matchCount ?? 0) + 1,
    } as any);
  }

  const allSources = storage.getSources();
  const matchingSource = allSources.find((s) => s.name.toLowerCase().includes(newJob.source.toLowerCase().split(" ")[0]));
  if (matchingSource) {
    storage.updateSource(matchingSource.id, {
      lastPolled: new Date().toISOString(), lastStatus: "success",
      jobsFound: (matchingSource.jobsFound ?? 0) + 1,
    });
  }

  storage.createActivityLog({
    source: newJob.source, action: "new_job",
    details: `New: ${newJob.title} at ${newJob.company} (${newJob.location})`,
    jobsAdded: 1, timestamp: new Date().toISOString(),
  });

  return created; // Return for real-time notification
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
