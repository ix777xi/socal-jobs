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
    "aliso viejo", "laguna niguel", "laguna hills",
  ];
  const sdAreas = [
    "san diego", "chula vista", "oceanside", "escondido", "carlsbad",
    "el cajon", "vista", "san marcos", "encinitas", "national city",
    "la mesa", "santee", "poway", "coronado", "imperial beach",
  ];

  if (laAreas.some((a) => loc.includes(a))) return "Los Angeles";
  if (ocAreas.some((a) => loc.includes(a))) return "Orange";
  if (sdAreas.some((a) => loc.includes(a))) return "San Diego";
  return null;
}

// Simulated coordinates for major SoCal cities
const CITY_COORDS: Record<string, [number, number]> = {
  "los angeles": [34.0522, -118.2437],
  "long beach": [33.7701, -118.1937],
  "anaheim": [33.8366, -117.9143],
  "santa ana": [33.7455, -117.8677],
  "irvine": [33.6846, -117.8265],
  "san diego": [32.7157, -117.1611],
  "chula vista": [32.6401, -117.0842],
  "oceanside": [33.1959, -117.3795],
  "huntington beach": [33.6603, -117.9992],
  "costa mesa": [33.6412, -117.9187],
  "dana point": [33.4672, -117.6981],
  "mission viejo": [33.6000, -117.6720],
  "pasadena": [34.1478, -118.1445],
  "torrance": [33.8358, -118.3406],
  "fullerton": [33.8703, -117.9242],
  "carlsbad": [33.1581, -117.3506],
  "escondido": [33.1192, -117.0864],
  "el cajon": [32.7948, -116.9625],
  "garden grove": [33.7739, -117.9414],
  "newport beach": [33.6189, -117.9289],
  "laguna beach": [33.5427, -117.7854],
  "san clemente": [33.4269, -117.6120],
  "temecula": [33.4936, -117.1484],
  "corona": [33.8753, -117.5664],
  "riverside": [33.9533, -117.3962],
  "ontario": [34.0633, -117.6509],
};

function getCoords(location: string): { lat: number; lng: number } | null {
  const loc = location.toLowerCase();
  for (const [city, [lat, lng]] of Object.entries(CITY_COORDS)) {
    if (loc.includes(city)) return { lat, lng };
  }
  return null;
}

// ---- Data Sources ----

interface FetchResult {
  source: string;
  jobs: InsertJob[];
  error?: string;
}

// Adzuna API (free tier: 250 calls/day)
async function fetchAdzuna(apiId?: string, apiKey?: string): Promise<FetchResult> {
  if (!apiId || !apiKey) return { source: "Adzuna", jobs: [], error: "No API credentials" };

  const results: InsertJob[] = [];
  const queries = ["construction", "warehouse", "electrician", "plumber", "labor", "forklift", "hvac", "cdl driver"];

  for (const query of queries.slice(0, 3)) {
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${apiId}&app_key=${apiKey}&results_per_page=10&what=${encodeURIComponent(query)}&where=Southern+California&sort_by=date`;
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json();

      for (const item of data.results || []) {
        const location = item.location?.display_name || "Southern California";
        const fullText = (item.title || "") + " " + (item.description || "");
        const coords = getCoords(location);
        results.push({
          title: item.title || "Untitled",
          company: item.company?.display_name || "Unknown",
          location,
          city: item.location?.area?.[3] || item.location?.area?.[2],
          county: detectCounty(location),
          zip: null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          trade: detectTrade(item.title || "", item.description || ""),
          payRange: item.salary_min && item.salary_max ? `$${Math.round(item.salary_min)}-$${Math.round(item.salary_max)}` : null,
          payType: item.salary_min ? "salary" : null,
          workType: item.contract_time === "full_time" ? "full-time" : item.contract_time === "part_time" ? "part-time" : "full-time",
          description: item.description?.substring(0, 500) || null,
          snippet: item.description?.substring(0, 150) || null,
          url: item.redirect_url || null,
          source: "Adzuna",
          sourceId: item.id?.toString() || null,
          isUrgent: detectUrgent(fullText),
          isSaved: false,
          tags: null,
          postedAt: item.created || new Date().toISOString(),
          fetchedAt: new Date().toISOString(),
          expiresAt: null,
          status: "active",
        });
      }
    } catch (e) { /* skip */ }
  }

  return { source: "Adzuna", jobs: results };
}

// Simulated Craigslist / local boards data
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
    "Join our growing team! We offer competitive pay, benefits after 90 days, and opportunities for advancement. Must have reliable transportation. Drug test required.",
    "Hiring immediately! No experience necessary - we will train the right candidate. Must be able to lift 50+ lbs. Steel-toed boots required. Weekly pay available.",
    "Experienced professionals wanted. Must have own tools. References required. Competitive pay based on experience. Start ASAP.",
    "Looking for reliable, hardworking individuals to join our crew. Spanish bilingual preferred. Must pass background check. Benefits included.",
    "Urgent need for skilled tradespeople. Union rates and benefits. Must have valid driver's license. OSHA certification preferred.",
  ];

  const sourceTags = ["Craigslist", "Indeed", "ZipRecruiter", "Facebook Jobs", "Local Board", "Union Hall", "Staffing Agency"];
  const workTypes = ["full-time", "part-time", "temp", "contract", "day-labor"] as const;

  const results: InsertJob[] = templates.map((t, i) => {
    const coords = getCoords(t.location);
    const desc = descriptions[i % descriptions.length];
    const src = sourceTags[i % sourceTags.length];
    const wType = t.urgent && Math.random() > 0.5 ? "day-labor" : workTypes[Math.floor(Math.random() * 3)];
    const payType = t.pay.includes("/day") ? "daily" : t.pay.includes("/wk") ? "weekly" : "hourly";

    return {
      title: t.title,
      company: t.company,
      location: t.location,
      city: t.location.split(",")[0].trim(),
      county: detectCounty(t.location),
      zip: null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      trade: t.trade,
      payRange: t.pay,
      payType,
      workType: wType,
      description: `${t.title} - ${desc}`,
      snippet: desc.substring(0, 120),
      url: null,
      source: src,
      sourceId: `local-${Date.now()}-${i}`,
      isUrgent: t.urgent,
      isSaved: false,
      tags: JSON.stringify(t.urgent ? ["urgent", "hiring-now"] : ["active"]),
      postedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      fetchedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    };
  });

  return { source: "Local Sources", jobs: results };
}

// Simulated real-time new jobs (drip-fed every poll)
function generateNewJob(): InsertJob | null {
  if (Math.random() > 0.4) return null; // ~40% chance of new job per poll

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

  const title = titles[Math.floor(Math.random() * titles.length)];
  const company = companies[Math.floor(Math.random() * companies.length)];
  const location = locations[Math.floor(Math.random() * locations.length)];
  const coords = getCoords(location);
  const payBase = 16 + Math.floor(Math.random() * 20);
  const payHigh = payBase + 5 + Math.floor(Math.random() * 15);
  const isUrgent = detectUrgent(title) || Math.random() > 0.7;

  return {
    title,
    company,
    location,
    city: location.split(",")[0].trim(),
    county: detectCounty(location),
    zip: null,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    trade: detectTrade(title, ""),
    payRange: `$${payBase}-$${payHigh}/hr`,
    payType: "hourly",
    workType: isUrgent ? "day-labor" : "full-time",
    description: `${title} - Hiring now in ${location}. Competitive pay, reliable work. Apply today.`,
    snippet: `Hiring now in ${location}. $${payBase}-$${payHigh}/hr.`,
    url: null,
    source: ["Craigslist", "Indeed", "ZipRecruiter", "Facebook Jobs"][Math.floor(Math.random() * 4)],
    sourceId: `live-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    isUrgent,
    isSaved: false,
    tags: isUrgent ? JSON.stringify(["urgent", "new"]) : JSON.stringify(["new"]),
    postedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
  };
}

// ---- Ingestion Engine ----

let pollInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

export async function seedInitialJobs() {
  const existingCount = storage.getJobCount();
  if (existingCount > 0) return;

  // Seed default sources
  const defaultSources = [
    { name: "Craigslist LA/OC/SD", type: "scraper", url: "https://losangeles.craigslist.org/search/jjj", isActive: true, config: '{"regions":["la","oc","sd"]}' },
    { name: "Indeed API", type: "api", url: "https://apis.indeed.com", isActive: true, config: '{"partner": false}' },
    { name: "ZipRecruiter", type: "api", url: "https://api.ziprecruiter.com", isActive: true, config: null },
    { name: "Adzuna", type: "api", url: "https://api.adzuna.com", isActive: false, config: null },
    { name: "Facebook Jobs", type: "scraper", url: "https://facebook.com/jobs", isActive: true, config: null },
    { name: "Union Hiring Hall", type: "scraper", url: "https://unionhiringhall.com", isActive: true, config: null },
    { name: "PeopleReady", type: "scraper", url: "https://jobs.peopleready.com", isActive: true, config: null },
    { name: "CA EDD", type: "api", url: "https://edd.ca.gov", isActive: true, config: null },
    { name: "PlanHub Bids", type: "scraper", url: "https://planhub.com", isActive: true, config: '{"type":"construction_bids"}' },
  ];

  for (const src of defaultSources) {
    storage.createSource(src);
  }

  // Seed initial jobs
  const localJobs = generateLocalJobs();
  let added = 0;
  for (const job of localJobs.jobs) {
    const existing = storage.deduplicateJob(job.title, job.company, job.location);
    if (!existing) {
      storage.createJob(job);
      added++;
    }
  }

  storage.createActivityLog({
    source: "System",
    action: "seed",
    details: `Seeded ${added} initial job listings from local sources`,
    jobsAdded: added,
    timestamp: new Date().toISOString(),
  });

  // Update source statuses
  const allSources = storage.getSources();
  for (const src of allSources) {
    storage.updateSource(src.id, {
      lastPolled: new Date().toISOString(),
      lastStatus: "success",
      jobsFound: Math.floor(added / allSources.length),
    });
  }
}

export async function pollForNewJobs() {
  const newJob = generateNewJob();
  if (!newJob) return;

  const existing = storage.deduplicateJob(newJob.title, newJob.company, newJob.location);
  if (existing) return;

  const created = storage.createJob(newJob);

  // Check alerts
  const matchingAlerts = storage.getMatchingAlerts(created);
  for (const alert of matchingAlerts) {
    storage.updateAlert(alert.id, {
      lastTriggered: new Date().toISOString(),
      matchCount: (alert.matchCount ?? 0) + 1,
    } as any);
  }

  // Update source stats
  const allSources = storage.getSources();
  const matchingSource = allSources.find((s) => s.name.toLowerCase().includes(newJob.source.toLowerCase().split(" ")[0]));
  if (matchingSource) {
    storage.updateSource(matchingSource.id, {
      lastPolled: new Date().toISOString(),
      lastStatus: "success",
      jobsFound: (matchingSource.jobsFound ?? 0) + 1,
    });
  }

  storage.createActivityLog({
    source: newJob.source,
    action: "new_job",
    details: `New: ${newJob.title} at ${newJob.company} (${newJob.location})`,
    jobsAdded: 1,
    timestamp: new Date().toISOString(),
  });
}

// Try to fetch from Adzuna if credentials are set
export async function pollAdzuna() {
  const adzunaSource = storage.getSources().find((s) => s.name === "Adzuna");
  if (!adzunaSource?.apiKey) return;

  const config = adzunaSource.config ? JSON.parse(adzunaSource.config) : {};
  const result = await fetchAdzuna(config.appId, adzunaSource.apiKey);

  let added = 0;
  for (const job of result.jobs) {
    const existing = storage.deduplicateJob(job.title, job.company, job.location);
    if (!existing) {
      storage.createJob(job);
      added++;
    }
  }

  storage.updateSource(adzunaSource.id, {
    lastPolled: new Date().toISOString(),
    lastStatus: result.error ? "error" : "success",
    jobsFound: (adzunaSource.jobsFound ?? 0) + added,
    errorMessage: result.error || null,
  } as any);

  if (added > 0) {
    storage.createActivityLog({
      source: "Adzuna",
      action: "api_fetch",
      details: `Fetched ${added} new jobs from Adzuna API`,
      jobsAdded: added,
      timestamp: new Date().toISOString(),
    });
  }
}

export function startPolling(intervalMs: number = 30000) {
  if (isRunning) return;
  isRunning = true;

  pollInterval = setInterval(async () => {
    try {
      await pollForNewJobs();
      // Poll Adzuna less frequently (every 5 minutes)
      if (Date.now() % 300000 < intervalMs) {
        await pollAdzuna();
      }
    } catch (e) {
      console.error("Polling error:", e);
    }
  }, intervalMs);

  console.log(`[Ingestion] Polling started every ${intervalMs / 1000}s`);
}

export function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  isRunning = false;
  console.log("[Ingestion] Polling stopped");
}

export function isPolling() {
  return isRunning;
}
