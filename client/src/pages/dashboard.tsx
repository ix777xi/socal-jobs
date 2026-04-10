import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Search, MapPin, Briefcase, Clock, DollarSign,
  Bookmark, BookmarkCheck, ExternalLink, Zap, TrendingUp,
  Radio, Filter, ChevronDown, Building2, ArrowUpRight,
  AlertTriangle, BarChart3,
} from "lucide-react";
import type { Job } from "@shared/schema";
import { TRADES, COUNTIES, WORK_TYPES } from "@shared/schema";

function KpiCard({ title, value, icon: Icon, delta, variant }: {
  title: string; value: string | number; icon: any; delta?: string; variant?: "default" | "urgent" | "success"
}) {
  return (
    <Card className="relative overflow-hidden">
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

function JobCard({ job, onSave }: { job: Job; onSave: (id: number) => void }) {
  const timeAgo = getTimeAgo(job.fetchedAt);
  return (
    <Card
      className={`group hover:border-primary/30 transition-colors ${job.isUrgent ? "border-l-2 border-l-red-500" : ""}`}
      data-testid={`card-job-${job.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm truncate">{job.title}</h3>
              {job.isUrgent && (
                <Badge variant="destructive" className="urgent-pulse text-[10px] px-1.5 py-0 h-5">
                  <Zap className="w-3 h-3 mr-0.5" />URGENT
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />{job.company}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />{job.location}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {job.payRange && (
                <Badge variant="secondary" className="text-[11px] font-medium">
                  <DollarSign className="w-3 h-3 mr-0.5" />{job.payRange}
                </Badge>
              )}
              <Badge variant="outline" className="text-[11px]">{job.trade}</Badge>
              {job.workType && (
                <Badge variant="outline" className="text-[11px]">{job.workType}</Badge>
              )}
              <span className="text-[11px] text-muted-foreground ml-auto flex items-center gap-1">
                <Clock className="w-3 h-3" />{timeAgo}
              </span>
            </div>
            {job.snippet && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{job.snippet}</p>
            )}
          </div>
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => onSave(job.id)}
              className="p-1.5 rounded-md hover:bg-accent transition-colors"
              data-testid={`button-save-${job.id}`}
            >
              {job.isSaved ? (
                <BookmarkCheck className="w-4 h-4 text-primary" />
              ) : (
                <Bookmark className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-md hover:bg-accent transition-colors"
                data-testid={`link-apply-${job.id}`}
              >
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">via {job.source}</span>
          {job.county && (
            <Badge variant="outline" className="text-[10px] ml-auto">{job.county} County</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [trade, setTrade] = useState("");
  const [county, setCounty] = useState("");
  const [workType, setWorkType] = useState("");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [tab, setTab] = useState("feed");

  // Auto-refresh every 30s
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs", { trade, county, workType, search, urgent: urgentOnly }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (trade) params.set("trade", trade);
      if (county) params.set("county", county);
      if (workType) params.set("workType", workType);
      if (search) params.set("search", search);
      if (urgentOnly) params.set("urgent", "true");
      params.set("limit", "100");
      const resp = await apiRequest("GET", `/api/jobs?${params}`);
      return resp.json();
    },
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000,
  });

  const saveMutation = useMutation({
    mutationFn: async (id: number) => {
      const resp = await apiRequest("POST", `/api/jobs/${id}/save`);
      return resp.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: data.isSaved ? "Job saved" : "Job unsaved",
        description: data.title,
      });
    },
  });

  const urgentJobs = jobs.filter((j) => j.isUrgent);
  const recentJobs = jobs.filter((j) => {
    const diff = Date.now() - new Date(j.fetchedAt).getTime();
    return diff < 3600000; // last hour
  });

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
            <Radio className="w-3 h-3 mr-1 text-green-500" />
            {stats?.activeSources ?? 0} sources
          </Badge>
          <Badge variant={stats?.recentJobs > 0 ? "default" : "secondary"} className="text-xs tabular-nums">
            +{stats?.recentJobs ?? 0} new (30m)
          </Badge>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Active Jobs" value={stats?.activeJobs ?? 0} icon={Briefcase} delta={`+${stats?.newToday ?? 0} today`} variant="success" />
        <KpiCard title="Urgent Hiring" value={stats?.urgentJobs ?? 0} icon={Zap} delta="Hiring Now" variant="urgent" />
        <KpiCard title="Saved" value={stats?.savedJobs ?? 0} icon={Bookmark} />
        <KpiCard title="Sources" value={stats?.activeSources ?? 0} icon={BarChart3} delta="All active" variant="success" />
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs, trades, companies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
                data-testid="input-search"
              />
            </div>
            <Select value={trade} onValueChange={(v) => setTrade(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-40 h-9 text-sm" data-testid="select-trade">
                <SelectValue placeholder="All Trades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trades</SelectItem>
                {TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={county} onValueChange={(v) => setCounty(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm" data-testid="select-county">
                <SelectValue placeholder="All Counties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Counties</SelectItem>
                {COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={workType} onValueChange={(v) => setWorkType(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm" data-testid="select-work-type">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {WORK_TYPES.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Switch checked={urgentOnly} onCheckedChange={setUrgentOnly} id="urgent-toggle" data-testid="switch-urgent" />
              <label htmlFor="urgent-toggle" className="text-xs font-medium text-muted-foreground cursor-pointer">
                Urgent only
              </label>
            </div>
            <span className="text-xs text-muted-foreground ml-auto tabular-nums">
              {jobs.length} result{jobs.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Feed / Urgent / Map */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8">
          <TabsTrigger value="feed" className="text-xs h-7">All Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="urgent" className="text-xs h-7">
            <Zap className="w-3 h-3 mr-1" />Urgent ({urgentJobs.length})
          </TabsTrigger>
          <TabsTrigger value="trades" className="text-xs h-7">
            <BarChart3 className="w-3 h-3 mr-1" />By Trade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-3">
          <div className="space-y-2">
            {jobsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="space-y-2 animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : jobs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Briefcase className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No jobs match your filters</p>
                </CardContent>
              </Card>
            ) : (
              jobs.map((job) => (
                <JobCard key={job.id} job={job} onSave={(id) => saveMutation.mutate(id)} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="urgent" className="mt-3">
          <div className="space-y-2">
            {urgentJobs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Zap className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No urgent listings right now</p>
                </CardContent>
              </Card>
            ) : (
              urgentJobs.map((job) => (
                <JobCard key={job.id} job={job} onSave={(id) => saveMutation.mutate(id)} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="trades" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(stats?.tradeBreakdown ?? []).map((t: { trade: string; count: number }) => (
              <Card
                key={t.trade}
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => { setTrade(t.trade); setTab("feed"); }}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t.trade}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums">{t.count}</span>
                    <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
