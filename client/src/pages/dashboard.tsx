import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Search, MapPin, Briefcase, Clock, DollarSign,
  Bookmark, BookmarkCheck, ExternalLink, Zap, TrendingUp,
  Radio, ChevronRight, Building2, ArrowUpRight,
  AlertTriangle, BarChart3, Phone, Copy,
  Share2, CheckCircle2, Map as MapIcon, X,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import type { Job } from "@shared/schema";
import { TRADES, COUNTIES, WORK_TYPES } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { UpgradeChip } from "@/components/paywall-banner";
import { Crown, Lock } from "lucide-react";
import { useLocation } from "wouter";

const CHART_COLORS = ["hsl(24,95%,50%)", "hsl(210,70%,45%)", "hsl(142,60%,40%)", "hsl(45,90%,50%)", "hsl(340,65%,50%)", "hsl(270,50%,55%)", "hsl(180,60%,40%)", "hsl(30,80%,55%)"];

// Format job descriptions: linkify URLs, format bullet points/lists, bold headers, paragraphs
function formatJobDescription(desc: string | null | undefined): string {
  if (!desc) return "<p class='text-muted-foreground'>No description available.</p>";

  // Sanitize HTML tags (allow none from raw input)
  let html = desc
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Linkify URLs
  html = html.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80 break-all">$1</a>'
  );

  // Linkify email addresses
  html = html.replace(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    '<a href="mailto:$1" class="text-primary underline hover:text-primary/80">$1</a>'
  );

  // Format bullet lines (- or * or •)
  html = html.replace(/^\s*[-*•]\s+(.+)$/gm, '<li class="ml-4 list-disc">$1</li>');

  // Wrap consecutive <li> items in <ul>
  html = html.replace(
    /(<li[^>]*>.*?<\/li>\n?)+/g,
    (match) => `<ul class="space-y-1 my-2">${match}</ul>`
  );

  // Bold common section headers (Requirements:, Location:, Pay:, etc.)
  html = html.replace(
    /^(Requirements|Qualifications|Responsibilities|Benefits|Location|Pay|Salary|Schedule|Experience|Skills|About|Contact|How to Apply|Job Type|Compensation|Duties|Description|About Us|What We Offer|Who We Are)\s*:/gim,
    '<strong class="font-semibold text-foreground">$1:</strong>'
  );

  // Convert double newlines to paragraph breaks, single newlines to <br>
  html = html
    .split(/\n{2,}/)
    .map((para) => `<p class="mb-3">${para.trim()}</p>`)
    .join("");

  // Convert remaining single newlines inside paragraphs to <br>
  html = html.replace(/(?<!<\/li>|<\/ul>|<\/p>)\n/g, "<br>");

  return html;
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function KpiCard({ title, value, icon: Icon, delta, variant, onClick, active }: {
  title: string; value: string | number; icon: any; delta?: string;
  variant?: "default" | "urgent" | "success"; onClick?: () => void; active?: boolean;
}) {
  return (
    <Card
      className={`relative overflow-hidden cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${active ? "ring-2 ring-primary" : ""}`}
      onClick={onClick}
      data-testid={`kpi-${title.toLowerCase().replace(/\s/g, "-")}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
            {delta && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${
                variant === "urgent" ? "text-red-500" : variant === "success" ? "text-green-500" : "text-muted-foreground"
              }`}>
                {variant === "urgent" ? <AlertTriangle className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {delta}
              </p>
            )}
          </div>
          <div className={`p-2.5 rounded-lg ${
            variant === "urgent" ? "bg-red-500/10 text-red-500" :
            variant === "success" ? "bg-green-500/10 text-green-500" :
            "bg-primary/10 text-primary"
          }`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function JobCard({ job, onSave, onOpen }: { job: Job; onSave: (id: number) => void; onOpen: (job: Job) => void }) {
  const timeAgo = getTimeAgo(job.fetchedAt);
  return (
    <Card
      className={`group hover:border-primary/30 transition-all hover:shadow-sm cursor-pointer ${job.isUrgent ? "border-l-2 border-l-red-500" : ""}`}
      data-testid={`card-job-${job.id}`}
      onClick={() => onOpen(job)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{job.title}</h3>
              {job.isUrgent && (
                <Badge variant="destructive" className="urgent-pulse text-[10px] px-1.5 py-0 h-5">
                  <Zap className="w-3 h-3 mr-0.5" />URGENT
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{job.company}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {job.payRange && (
                <Badge variant="secondary" className="text-[11px] font-medium">
                  <DollarSign className="w-3 h-3 mr-0.5" />{job.payRange}
                </Badge>
              )}
              <Badge variant="outline" className="text-[11px]">{job.trade}</Badge>
              {job.workType && <Badge variant="outline" className="text-[11px]">{job.workType}</Badge>}
              <span className="text-[11px] text-muted-foreground ml-auto flex items-center gap-1">
                <Clock className="w-3 h-3" />{timeAgo}
              </span>
            </div>
            {job.snippet && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{job.snippet}</p>}
          </div>
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onSave(job.id)} className="p-1.5 rounded-md hover:bg-accent transition-colors" data-testid={`button-save-${job.id}`}>
              {job.isSaved ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4 text-muted-foreground" />}
            </button>
            {job.url && (
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md hover:bg-accent transition-colors" data-testid={`link-apply-${job.id}`}>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">via {job.source}</span>
          {job.county && <Badge variant="outline" className="text-[10px] ml-auto">{job.county} County</Badge>}
          <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardContent>
    </Card>
  );
}

// Job Detail Drawer
function JobDetailSheet({ job, open, onClose, onSave, isPro }: { job: Job | null; open: boolean; onClose: () => void; onSave: (id: number) => void; isPro: boolean }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [, setLocation] = useLocation();

  if (!job) return null;

  // Only show phone for user-posted jobs (has contactPhone field), not API-sourced
  const phone = (job as any).contactPhone || null;

  function handleCopy() {
    const text = `${job!.title} at ${job!.company}\n${job!.location}\nPay: ${job!.payRange || "Not listed"}\n${job!.url || ""}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied to clipboard" });
    }).catch(() => {
      toast({ title: "Could not copy", variant: "destructive" });
    });
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: `${job!.title} - ${job!.company}`,
        text: `${job!.title} at ${job!.company} in ${job!.location}. ${job!.payRange || ""}`,
        url: job!.url || window.location.href,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" side="right">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <SheetTitle className="text-base leading-snug">{job.title}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">{job.company}</p>
            </div>
            {job.isUrgent && (
              <Badge variant="destructive" className="urgent-pulse text-[10px] flex-shrink-0">
                <Zap className="w-3 h-3 mr-0.5" />URGENT
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-4">
          {/* Quick info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-[11px] text-muted-foreground">Location</p>
                <p className="text-xs font-medium">{job.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
              <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-[11px] text-muted-foreground">Pay</p>
                <p className="text-xs font-medium">{job.payRange || "Not listed"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
              <Briefcase className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-[11px] text-muted-foreground">Trade</p>
                <p className="text-xs font-medium">{job.trade}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-[11px] text-muted-foreground">Posted</p>
                <p className="text-xs font-medium">{getTimeAgo(job.postedAt || job.fetchedAt)}</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {isPro ? (
            <div className="flex gap-2">
              {job.url && (
                <Button asChild className="flex-1 h-10 text-sm font-semibold" data-testid="button-apply">
                  <a href={job.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-1.5" />View Original Posting
                  </a>
                </Button>
              )}
              {phone && (
                <Button variant="outline" className="h-10" asChild data-testid="button-call">
                  <a href={`tel:${phone}`}>
                    <Phone className="w-4 h-4" />
                  </a>
                </Button>
              )}
              <Button variant="outline" className="h-10" onClick={() => onSave(job.id)} data-testid="button-save-detail">
                {job.isSaved ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4" />}
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center space-y-2">
              <Lock className="w-6 h-6 mx-auto text-primary" />
              <p className="text-sm font-medium">Upgrade to apply, get directions, and save jobs</p>
              <Button size="sm" className="h-8 text-xs" onClick={() => { onClose(); setLocation("/pricing"); }}>
                <Crown className="w-3.5 h-3.5 mr-1" />Upgrade to Pro — $9.99/wk
              </Button>
            </div>
          )}

          <Separator />

          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Description</h4>
            <div className="text-sm leading-relaxed job-description" dangerouslySetInnerHTML={{ __html: formatJobDescription(job.description) }} />
          </div>

          <Separator />

          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{job.trade}</Badge>
            {job.workType && <Badge variant="outline">{job.workType}</Badge>}
            {job.payType && <Badge variant="outline">{job.payType} pay</Badge>}
            {job.county && <Badge variant="outline">{job.county} County</Badge>}
            <Badge variant="secondary" className="text-[10px]">via {job.source}</Badge>
          </div>

          {/* Share / Copy */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleCopy} data-testid="button-copy">
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? "Copied" : "Copy Details"}
            </Button>
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleShare} data-testid="button-share">
              <Share2 className="w-3.5 h-3.5 mr-1" />Share Job
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const { isPro } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [trade, setTrade] = useState("");
  const [county, setCounty] = useState("");
  const [workType, setWorkType] = useState("");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [tab, setTab] = useState("feed");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [kpiFilter, setKpiFilter] = useState<string>("");
  const prevJobCountRef = useRef(0);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (trade) params.set("trade", trade);
    if (county) params.set("county", county);
    if (workType) params.set("workType", workType);
    if (search) params.set("search", search);
    if (urgentOnly || kpiFilter === "urgent") params.set("urgent", "true");
    if (kpiFilter === "saved") params.set("saved", "true");
    params.set("limit", "100");
    return params;
  }, [trade, county, workType, search, urgentOnly, kpiFilter]);

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs", { trade, county, workType, search, urgent: urgentOnly, kpiFilter }],
    queryFn: async () => {
      const resp = await apiRequest("GET", `/api/jobs?${buildParams()}`);
      return resp.json();
    },
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000,
  });

  // Toast for new jobs
  useEffect(() => {
    if (jobs.length > 0 && prevJobCountRef.current > 0 && jobs.length > prevJobCountRef.current) {
      const newCount = jobs.length - prevJobCountRef.current;
      const newest = jobs[0];
      toast({
        title: `${newCount} new job${newCount > 1 ? "s" : ""} found`,
        description: newest ? `${newest.title} - ${newest.company}` : undefined,
      });
    }
    prevJobCountRef.current = jobs.length;
  }, [jobs.length]);

  const saveMutation = useMutation({
    mutationFn: async (id: number) => {
      const resp = await apiRequest("POST", `/api/jobs/${id}/save`);
      return resp.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: data.isSaved ? "Job saved" : "Job unsaved", description: data.title });
      if (selectedJob?.id === data.id) setSelectedJob(data);
    },
  });

  function handleKpiClick(filter: string) {
    if (kpiFilter === filter) {
      setKpiFilter("");
      setUrgentOnly(false);
    } else {
      setKpiFilter(filter);
      setUrgentOnly(filter === "urgent");
      setTab("feed");
    }
  }

  function handleOpenJob(job: Job) {
    setSelectedJob(job);
    setSheetOpen(true);
  }

  const urgentJobs = jobs.filter((j) => j.isUrgent);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Jobs Feed</h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 live-dot" />
            Live — polling every 30s
            {stats && <span className="ml-1">· {stats.activeJobs ?? 0} active jobs</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs tabular-nums">
            <Radio className="w-3 h-3 mr-1 text-green-500" />{stats?.activeSources ?? 0} sources
          </Badge>
          <Badge variant={stats?.recentJobs > 0 ? "default" : "secondary"} className="text-xs tabular-nums">
            +{stats?.recentJobs ?? 0} new (30m)
          </Badge>
        </div>
      </div>

      {/* KPI row - clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Active Jobs" value={stats?.activeJobs ?? 0} icon={Briefcase} delta={`+${stats?.newToday ?? 0} today`} variant="success" onClick={() => handleKpiClick("")} active={kpiFilter === ""} />
        <KpiCard title="Urgent Hiring" value={stats?.urgentJobs ?? 0} icon={Zap} delta="Hiring Now" variant="urgent" onClick={() => handleKpiClick("urgent")} active={kpiFilter === "urgent"} />
        <KpiCard title="Saved" value={stats?.savedJobs ?? 0} icon={Bookmark} onClick={() => handleKpiClick("saved")} active={kpiFilter === "saved"} />
        <KpiCard title="Sources" value={stats?.activeSources ?? 0} icon={BarChart3} delta="All active" variant="success" />
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search jobs, trades, companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" data-testid="input-search" />
            </div>
            <Select value={trade} onValueChange={(v) => setTrade(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-40 h-9 text-sm" data-testid="select-trade"><SelectValue placeholder="All Trades" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trades</SelectItem>
                {TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={county} onValueChange={(v) => setCounty(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm" data-testid="select-county"><SelectValue placeholder="All Counties" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Counties</SelectItem>
                {COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={workType} onValueChange={(v) => setWorkType(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm" data-testid="select-work-type"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {WORK_TYPES.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Switch checked={urgentOnly} onCheckedChange={(v) => { setUrgentOnly(v); if (!v) setKpiFilter(""); }} id="urgent-toggle" data-testid="switch-urgent" />
              <label htmlFor="urgent-toggle" className="text-xs font-medium text-muted-foreground cursor-pointer">Urgent only</label>
            </div>
            {(trade || county || workType || search || kpiFilter) && (
              <button
                onClick={() => { setTrade(""); setCounty(""); setWorkType(""); setSearch(""); setUrgentOnly(false); setKpiFilter(""); }}
                className="text-xs text-primary hover:underline flex items-center gap-1"
                data-testid="button-clear-filters"
              >
                <X className="w-3 h-3" />Clear filters
              </button>
            )}
            <span className="text-xs text-muted-foreground ml-auto tabular-nums">{jobs.length} result{jobs.length !== 1 ? "s" : ""}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8">
          <TabsTrigger value="feed" className="text-xs h-7">All Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="urgent" className="text-xs h-7"><Zap className="w-3 h-3 mr-1" />Urgent ({urgentJobs.length})</TabsTrigger>
          <TabsTrigger value="stats" className="text-xs h-7"><BarChart3 className="w-3 h-3 mr-1" />Stats</TabsTrigger>
          <TabsTrigger value="map" className="text-xs h-7"><MapIcon className="w-3 h-3 mr-1" />Map</TabsTrigger>
        </TabsList>

        {/* Feed tab */}
        <TabsContent value="feed" className="mt-3">
          <div className="space-y-2">
            {jobsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><div className="space-y-2 animate-pulse"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /><div className="h-3 bg-muted rounded w-1/3" /></div></CardContent></Card>
              ))
            ) : jobs.length === 0 ? (
              <Card><CardContent className="p-8 text-center"><Briefcase className="w-10 h-10 mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No jobs match your filters</p></CardContent></Card>
            ) : (
              <>
                {jobs.map((job) => <JobCard key={job.id} job={job} onSave={(id) => saveMutation.mutate(id)} onOpen={handleOpenJob} />)}
                {!isPro && jobs.length >= 8 && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-6 text-center space-y-2">
                      <Crown className="w-8 h-8 mx-auto text-primary" />
                      <p className="text-sm font-semibold">You're seeing a limited preview</p>
                      <p className="text-xs text-muted-foreground">Upgrade to Pro for unlimited listings, apply links, job alerts, and more</p>
                      <Button size="sm" className="h-8 text-xs mt-1" onClick={() => setLocation("/pricing")}>
                        <Crown className="w-3.5 h-3.5 mr-1" />Upgrade to Pro — $9.99/wk
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* Urgent tab */}
        <TabsContent value="urgent" className="mt-3">
          <div className="space-y-2">
            {urgentJobs.length === 0 ? (
              <Card><CardContent className="p-8 text-center"><Zap className="w-10 h-10 mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No urgent listings right now</p></CardContent></Card>
            ) : (
              urgentJobs.map((job) => <JobCard key={job.id} job={job} onSave={(id) => saveMutation.mutate(id)} onOpen={handleOpenJob} />)
            )}
          </div>
        </TabsContent>

        {/* Stats tab with charts */}
        <TabsContent value="stats" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Trade breakdown bar chart */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Jobs by Trade</CardTitle></CardHeader>
              <CardContent className="p-2">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={(stats?.tradeBreakdown ?? []).slice(0, 10)} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="trade" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(data: any) => { setTrade(data.trade); setTab("feed"); }}>
                      {(stats?.tradeBreakdown ?? []).slice(0, 10).map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* County breakdown pie chart */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Jobs by County</CardTitle></CardHeader>
              <CardContent className="p-2">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={stats?.countyBreakdown ?? []} dataKey="count" nameKey="county" cx="50%" cy="50%"
                      outerRadius={100} innerRadius={50} paddingAngle={3} cursor="pointer"
                      onClick={(data: any) => { setCounty(data.county); setTab("feed"); }}
                      label={({ county, count }: any) => `${county}: ${count}`} labelLine={false}
                    >
                      {(stats?.countyBreakdown ?? []).map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Trade cards clickable */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm">All Trades</CardTitle></CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(stats?.tradeBreakdown ?? []).map((t: { trade: string; count: number }) => (
                    <div
                      key={t.trade}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all hover:border-primary/40 hover:bg-primary/5 ${trade === t.trade ? "border-primary bg-primary/5" : "border-border"}`}
                      onClick={() => { setTrade(trade === t.trade ? "" : t.trade); setTab("feed"); }}
                    >
                      <span className="text-xs font-medium truncate">{t.trade}</span>
                      <Badge variant="secondary" className="text-[10px] h-5 ml-1 tabular-nums">{t.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Map tab */}
        <TabsContent value="map" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <div className="relative w-full h-[500px] rounded-lg overflow-hidden bg-muted">
                <iframe
                  src={`https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=blue+collar+jobs+Southern+California&zoom=9&center=33.7,-117.8`}
                  className="w-full h-full border-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Job locations map"
                />
                {/* Job pins overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4 pt-8">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {jobs.filter(j => j.lat && j.lng).slice(0, 8).map((job) => (
                      <div
                        key={job.id}
                        className="flex-shrink-0 bg-card border rounded-lg p-2.5 cursor-pointer hover:border-primary/40 transition-colors w-48"
                        onClick={() => handleOpenJob(job)}
                      >
                        <p className="text-xs font-semibold truncate">{job.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{job.company} · {job.location}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {job.payRange && <Badge variant="secondary" className="text-[9px] h-4">{job.payRange}</Badge>}
                          {job.isUrgent && <Badge variant="destructive" className="text-[9px] h-4">URGENT</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Job Detail Drawer */}
      <JobDetailSheet job={selectedJob} open={sheetOpen} onClose={() => setSheetOpen(false)} onSave={(id) => saveMutation.mutate(id)} isPro={isPro} />
    </div>
  );
}
