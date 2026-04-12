import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, Play, Pause, CheckCircle2, XCircle,
  Clock, Database, Wifi, WifiOff, Activity, ArrowUpRight,
  Globe, Server, Users, ExternalLink, ChevronRight,
  AlertTriangle, Zap, BarChart3, Copy, Eye, Shield,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Source, ActivityLog } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

const CHART_COLORS = ["hsl(24,95%,50%)", "hsl(210,70%,45%)", "hsl(142,60%,40%)", "hsl(45,90%,50%)", "hsl(340,65%,50%)", "hsl(270,50%,55%)", "hsl(180,60%,40%)", "hsl(30,80%,55%)", "hsl(0,60%,50%)"];

function getTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SourceIcon({ type }: { type: string }) {
  switch (type) {
    case "api": return <Server className="w-4 h-4" />;
    case "scraper": return <Globe className="w-4 h-4" />;
    default: return <Users className="w-4 h-4" />;
  }
}

// Source detail sheet
function SourceDetailSheet({ source, activity, open, onClose, onToggle }: {
  source: Source | null; activity: ActivityLog[]; open: boolean;
  onClose: () => void; onToggle: (id: number, isActive: boolean) => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!source) return null;

  const sourceActivity = activity.filter(a =>
    a.source.toLowerCase().includes(source.name.toLowerCase().split(" ")[0])
  );

  function handleCopy() {
    const text = `Source: ${source!.name}\nType: ${source!.type}\nURL: ${source!.url || "N/A"}\nStatus: ${source!.lastStatus || "pending"}\nJobs Found: ${source!.jobsFound ?? 0}\nLast Polled: ${source!.lastPolled || "never"}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied source details" });
    }).catch(() => toast({ title: "Could not copy", variant: "destructive" }));
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" side="right">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                source.lastStatus === "success" ? "bg-green-500/10 text-green-500" :
                source.lastStatus === "error" ? "bg-red-500/10 text-red-500" :
                "bg-muted text-muted-foreground"
              }`}>
                <SourceIcon type={source.type} />
              </div>
              <div>
                <SheetTitle className="text-base leading-snug">{source.name}</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{source.type} source</p>
              </div>
            </div>
            <Switch
              checked={source.isActive ?? true}
              onCheckedChange={(checked) => onToggle(source.id, checked)}
              data-testid={`switch-source-detail-${source.id}`}
            />
          </div>
        </SheetHeader>

        <div className="space-y-4">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xl font-bold tabular-nums">{source.jobsFound ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Jobs Found</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xl font-bold tabular-nums">{sourceActivity.length}</p>
              <p className="text-[10px] text-muted-foreground">Log Entries</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Badge
                variant={source.lastStatus === "success" ? "default" : source.lastStatus === "error" ? "destructive" : "secondary"}
                className="text-[10px] h-5 mt-1"
              >
                {source.lastStatus === "success" && <CheckCircle2 className="w-3 h-3 mr-0.5" />}
                {source.lastStatus === "error" && <XCircle className="w-3 h-3 mr-0.5" />}
                {source.lastStatus ?? "pending"}
              </Badge>
              <p className="text-[10px] text-muted-foreground mt-1">Status</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground">URL</span>
              {source.url ? (
                <a href={source.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary flex items-center gap-1 hover:underline truncate max-w-[200px]">
                  {source.url.replace("https://", "").replace("http://", "")}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">Not set</span>
              )}
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Last Polled</span>
              <span className="text-xs font-medium tabular-nums">{getTimeAgo(source.lastPolled)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Active</span>
              <Badge variant={source.isActive ? "default" : "secondary"} className="text-[10px]">
                {source.isActive ? "Yes" : "No"}
              </Badge>
            </div>
          </div>

          {/* Error message */}
          {source.errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <p className="text-xs font-semibold text-red-500 flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />Error
              </p>
              <p className="text-xs text-red-400">{source.errorMessage}</p>
            </div>
          )}

          <Separator />

          {/* Activity for this source */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Recent Activity ({sourceActivity.length})
            </h4>
            {sourceActivity.length === 0 ? (
              <div className="text-center py-6">
                <Activity className="w-6 h-6 mx-auto text-muted-foreground mb-1.5" />
                <p className="text-xs text-muted-foreground">No activity recorded yet</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto overscroll-contain pr-1">
                {sourceActivity.slice(0, 20).map((log) => (
                  <div key={log.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      log.action === "new_job" ? "bg-green-500" :
                      log.action === "error" ? "bg-red-500" :
                      "bg-primary"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{log.details}</p>
                      <p className="text-muted-foreground text-[10px] mt-0.5">
                        {getTimeAgo(log.timestamp)}
                        {log.jobsAdded && log.jobsAdded > 0 ? ` · +${log.jobsAdded} jobs` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleCopy}>
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? "Copied" : "Copy Details"}
            </Button>
            {source.url && (
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" asChild>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />Visit Source
                </a>
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function SourcesPage() {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState("all");
  const [tab, setTab] = useState("sources");

  const { data: sources = [] } = useQuery<Source[]>({
    queryKey: ["/api/sources"],
    refetchInterval: 30000,
    enabled: !!isAdmin,
  });

  const { data: activity = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity"],
    refetchInterval: 30000,
    enabled: !!isAdmin,
  });

  const { data: ingestionStatus } = useQuery<{ isPolling: boolean }>({
    queryKey: ["/api/ingestion/status"],
    refetchInterval: 10000,
    enabled: !!isAdmin,
  });

  const toggleSourceMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const resp = await apiRequest("PATCH", `/api/sources/${id}`, { isActive });
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
    },
  });

  const startPolling = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", "/api/ingestion/start");
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingestion/status"] });
      toast({ title: "Polling started" });
    },
  });

  const stopPolling = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", "/api/ingestion/stop");
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingestion/status"] });
      toast({ title: "Polling stopped" });
    },
  });

  const manualPoll = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", "/api/ingestion/poll");
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Manual poll complete" });
    },
  });

  if (!user || !isAdmin) {
    return (
      <div className="p-4 md:p-6">
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-8 text-center space-y-3">
            <Shield className="w-10 h-10 mx-auto text-destructive" />
            <h2 className="text-lg font-bold">Admin Access Required</h2>
            <p className="text-sm text-muted-foreground">
              This page is restricted to site administrators.
            </p>
            <Button variant="outline" onClick={() => setLocation("/")} className="h-9 text-sm">
              Back to Jobs Feed
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPolling = ingestionStatus?.isPolling ?? false;
  const activeSources = sources.filter((s) => s.isActive).length;
  const totalJobs = sources.reduce((sum, s) => sum + (s.jobsFound ?? 0), 0);
  const errorSources = sources.filter((s) => s.lastStatus === "error").length;

  // Chart data for source breakdown
  const sourceChartData = sources
    .map(s => ({ name: s.name.split(" ")[0], jobs: s.jobsFound ?? 0 }))
    .sort((a, b) => b.jobs - a.jobs);

  // Filtered activity
  const filteredActivity = activityFilter === "all"
    ? activity
    : activityFilter === "new_job"
      ? activity.filter(a => a.action === "new_job")
      : activityFilter === "error"
        ? activity.filter(a => a.action === "error")
        : activity.filter(a => a.source.toLowerCase().includes(activityFilter.toLowerCase()));

  function handleOpenSource(source: Source) {
    setSelectedSource(source);
    setDetailOpen(true);
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Data Sources</h2>
          <p className="text-xs text-muted-foreground">
            {activeSources} of {sources.length} sources active · {totalJobs} total jobs fetched
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isPolling ? "default" : "secondary"} className="text-xs">
            {isPolling ? (
              <><span className="w-2 h-2 rounded-full bg-white live-dot mr-1.5" />Polling</>
            ) : (
              <><WifiOff className="w-3 h-3 mr-1" />Paused</>
            )}
          </Badge>
          {isPolling ? (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => stopPolling.mutate()} data-testid="button-stop-polling">
              <Pause className="w-3.5 h-3.5 mr-1" />Stop
            </Button>
          ) : (
            <Button size="sm" className="h-8 text-xs" onClick={() => startPolling.mutate()} data-testid="button-start-polling">
              <Play className="w-3.5 h-3.5 mr-1" />Start
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => manualPoll.mutate()} disabled={manualPoll.isPending} data-testid="button-manual-poll">
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${manualPoll.isPending ? "animate-spin" : ""}`} />Poll Now
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sources</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">{sources.length}</p>
              </div>
              <Database className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active</p>
                <p className="text-xl font-bold tabular-nums mt-0.5 text-green-500">{activeSources}</p>
              </div>
              <Wifi className="w-5 h-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Jobs</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">{totalJobs}</p>
              </div>
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Errors</p>
                <p className={`text-xl font-bold tabular-nums mt-0.5 ${errorSources > 0 ? "text-red-500" : ""}`}>{errorSources}</p>
              </div>
              {errorSources > 0 ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <CheckCircle2 className="w-5 h-5 text-green-500" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8">
          <TabsTrigger value="sources" className="text-xs h-7">
            <Database className="w-3 h-3 mr-1" />Sources ({sources.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs h-7">
            <Activity className="w-3 h-3 mr-1" />Activity ({activity.length})
          </TabsTrigger>
          <TabsTrigger value="stats" className="text-xs h-7">
            <BarChart3 className="w-3 h-3 mr-1" />Stats
          </TabsTrigger>
        </TabsList>

        {/* Sources Grid */}
        <TabsContent value="sources" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sources.map((source) => (
              <Card
                key={source.id}
                className={`cursor-pointer transition-all hover:border-primary/30 hover:shadow-sm ${!source.isActive ? "opacity-50" : ""}`}
                data-testid={`card-source-${source.id}`}
                onClick={() => handleOpenSource(source)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${
                        source.lastStatus === "success" ? "bg-green-500/10 text-green-500" :
                        source.lastStatus === "error" ? "bg-red-500/10 text-red-500" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        <SourceIcon type={source.type} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold leading-tight">{source.name}</h3>
                        <p className="text-[11px] text-muted-foreground">{source.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={source.isActive ?? true}
                        onCheckedChange={(checked) =>
                          toggleSourceMutation.mutate({ id: source.id, isActive: checked })
                        }
                        data-testid={`switch-source-${source.id}`}
                      />
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Database className="w-3 h-3" />Jobs found
                      </span>
                      <span className="font-medium tabular-nums">{source.jobsFound ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />Last polled
                      </span>
                      <span className="tabular-nums">{getTimeAgo(source.lastPolled)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Status</span>
                      <Badge
                        variant={source.lastStatus === "success" ? "default" : source.lastStatus === "error" ? "destructive" : "secondary"}
                        className="text-[10px] h-4 px-1.5"
                      >
                        {source.lastStatus === "success" && <CheckCircle2 className="w-3 h-3 mr-0.5" />}
                        {source.lastStatus === "error" && <XCircle className="w-3 h-3 mr-0.5" />}
                        {source.lastStatus ?? "pending"}
                      </Badge>
                    </div>
                  </div>
                  {source.errorMessage && (
                    <p className="mt-2 text-[11px] text-red-500 bg-red-500/5 px-2 py-1 rounded truncate">{source.errorMessage}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Activity Log with filter */}
        <TabsContent value="activity" className="mt-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Activity Log
                </CardTitle>
                <Select value={activityFilter} onValueChange={setActivityFilter}>
                  <SelectTrigger className="w-36 h-7 text-xs" data-testid="select-activity-filter">
                    <SelectValue placeholder="All activity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All activity</SelectItem>
                    <SelectItem value="new_job">New jobs</SelectItem>
                    <SelectItem value="error">Errors</SelectItem>
                    {sources.map(s => (
                      <SelectItem key={s.id} value={s.name.split(" ")[0]}>
                        {s.name.split(" ")[0]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto overscroll-contain">
                {filteredActivity.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-4 text-center">No activity matches the filter</p>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredActivity.slice(0, 50).map((log) => (
                      <div key={log.id} className="px-4 py-2.5 flex items-center gap-3 text-xs hover:bg-muted/30 transition-colors" data-testid={`log-${log.id}`}>
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          log.action === "new_job" ? "bg-green-500" :
                          log.action === "error" ? "bg-red-500" :
                          log.action === "seed" ? "bg-primary" :
                          "bg-primary"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-foreground">{log.details}</p>
                          <p className="text-muted-foreground mt-0.5">
                            {log.source} · {getTimeAgo(log.timestamp)}
                            {log.jobsAdded && log.jobsAdded > 0 ? ` · +${log.jobsAdded} jobs` : ""}
                          </p>
                        </div>
                        {log.action === "new_job" && (
                          <Badge variant="default" className="text-[9px] h-4 px-1 flex-shrink-0">
                            <Zap className="w-2.5 h-2.5 mr-0.5" />New
                          </Badge>
                        )}
                        {log.action === "error" && (
                          <Badge variant="destructive" className="text-[9px] h-4 px-1 flex-shrink-0">
                            <XCircle className="w-2.5 h-2.5 mr-0.5" />Error
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats tab */}
        <TabsContent value="stats" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Source performance chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Jobs by Source</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sourceChartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="jobs" radius={[0, 4, 4, 0]}>
                      {sourceChartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Source health grid */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Source Health</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all hover:border-primary/30 hover:bg-primary/5"
                      onClick={() => handleOpenSource(source)}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        source.lastStatus === "success" ? "bg-green-500" :
                        source.lastStatus === "error" ? "bg-red-500" :
                        "bg-yellow-500"
                      }`} />
                      <span className="text-xs font-medium flex-1 truncate">{source.name}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{source.jobsFound ?? 0} jobs</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{getTimeAgo(source.lastPolled)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Source Detail Sheet */}
      <SourceDetailSheet
        source={selectedSource}
        activity={activity}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onToggle={(id, isActive) => toggleSourceMutation.mutate({ id, isActive })}
      />
    </div>
  );
}
