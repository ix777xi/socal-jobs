import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Radio, RefreshCw, Play, Pause, CheckCircle2, XCircle,
  Clock, Database, Wifi, WifiOff, Activity, ArrowUpRight,
  Globe, Server, Users,
} from "lucide-react";
import type { Source, ActivityLog } from "@shared/schema";

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

export default function SourcesPage() {
  const { toast } = useToast();

  const { data: sources = [] } = useQuery<Source[]>({
    queryKey: ["/api/sources"],
    refetchInterval: 30000,
  });

  const { data: activity = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity"],
    refetchInterval: 30000,
  });

  const { data: ingestionStatus } = useQuery<{ isPolling: boolean }>({
    queryKey: ["/api/ingestion/status"],
    refetchInterval: 10000,
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

  const isPolling = ingestionStatus?.isPolling ?? false;
  const activeSources = sources.filter((s) => s.isActive).length;
  const totalJobs = sources.reduce((sum, s) => sum + (s.jobsFound ?? 0), 0);

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

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sources.map((source) => (
          <Card key={source.id} className={`${!source.isActive ? "opacity-50" : ""}`} data-testid={`card-source-${source.id}`}>
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
                <Switch
                  checked={source.isActive ?? true}
                  onCheckedChange={(checked) =>
                    toggleSourceMutation.mutate({ id: source.id, isActive: checked })
                  }
                  data-testid={`switch-source-${source.id}`}
                />
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
                <p className="mt-2 text-[11px] text-red-500 bg-red-500/5 px-2 py-1 rounded">{source.errorMessage}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-80 overflow-y-auto overscroll-contain">
            {activity.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4 text-center">No activity yet</p>
            ) : (
              <div className="divide-y divide-border">
                {activity.slice(0, 30).map((log) => (
                  <div key={log.id} className="px-4 py-2.5 flex items-center gap-3 text-xs" data-testid={`log-${log.id}`}>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      log.action === "new_job" ? "bg-green-500" :
                      log.action === "error" ? "bg-red-500" :
                      "bg-primary"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-foreground">{log.details}</p>
                      <p className="text-muted-foreground mt-0.5">
                        {log.source} · {getTimeAgo(log.timestamp)}
                        {log.jobsAdded && log.jobsAdded > 0 ? ` · +${log.jobsAdded} jobs` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
