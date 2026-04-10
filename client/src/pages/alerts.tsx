import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, BellOff, Plus, Trash2, MapPin, Zap, Clock,
  Search, Briefcase, DollarSign, Building2, ExternalLink,
  Copy, Share2, CheckCircle2, Navigation, Phone,
  ChevronRight, Bookmark, BookmarkCheck, Eye, AlertTriangle,
} from "lucide-react";
import type { Alert, Job } from "@shared/schema";
import { TRADES, COUNTIES, WORK_TYPES } from "@shared/schema";

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

function matchJobToAlert(job: Job, keywords: string, trade: string, county: string, workType: string): boolean {
  const kws = keywords.toLowerCase().split(",").map(k => k.trim()).filter(Boolean);
  const text = `${job.title} ${job.company} ${job.trade} ${job.description || ""}`.toLowerCase();
  const kwMatch = kws.length === 0 || kws.some(kw => text.includes(kw));
  const tradeMatch = !trade || trade === "any" || job.trade === trade;
  const countyMatch = !county || county === "any" || job.county === county;
  const workMatch = !workType || workType === "any" || job.workType === workType;
  return kwMatch && tradeMatch && countyMatch && workMatch;
}

// Alert detail sheet showing matched jobs
function AlertDetailSheet({ alert, jobs, open, onClose, onSave }: {
  alert: Alert | null; jobs: Job[]; open: boolean; onClose: () => void;
  onSave: (id: number) => void;
}) {
  const { toast } = useToast();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobSheetOpen, setJobSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!alert) return null;

  const matchedJobs = jobs.filter(j =>
    matchJobToAlert(j, alert.keywords, alert.trade || "", alert.county || "", alert.workType || "")
  );

  function handleCopyJob(job: Job) {
    const text = `${job.title} at ${job.company}\n${job.location}\nPay: ${job.payRange || "Not listed"}\n${job.url || ""}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied to clipboard" });
    }).catch(() => toast({ title: "Could not copy", variant: "destructive" }));
  }

  function handleShareJob(job: Job) {
    if (navigator.share) {
      navigator.share({
        title: `${job.title} - ${job.company}`,
        text: `${job.title} at ${job.company} in ${job.location}. ${job.payRange || ""}`,
        url: job.url || window.location.href,
      }).catch(() => {});
    } else {
      handleCopyJob(job);
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" side="right">
          <SheetHeader className="pb-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <SheetTitle className="text-base leading-snug flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary flex-shrink-0" />
                  {alert.keywords}
                </SheetTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Alert created {getTimeAgo(alert.createdAt)}
                </p>
              </div>
              <Badge variant={alert.isActive ? "default" : "secondary"} className="text-[10px] flex-shrink-0">
                {alert.isActive ? "Active" : "Paused"}
              </Badge>
            </div>
          </SheetHeader>

          <div className="space-y-4">
            {/* Alert criteria */}
            <div className="grid grid-cols-2 gap-2">
              {alert.trade && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                  <Briefcase className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Trade</p>
                    <p className="text-xs font-medium">{alert.trade}</p>
                  </div>
                </div>
              )}
              {alert.county && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">County</p>
                    <p className="text-xs font-medium">{alert.county}</p>
                  </div>
                </div>
              )}
              {alert.workType && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                  <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Type</p>
                    <p className="text-xs font-medium">{alert.workType}</p>
                  </div>
                </div>
              )}
              {alert.zip && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">ZIP</p>
                    <p className="text-xs font-medium">{alert.zip} ({alert.radius}mi)</p>
                  </div>
                </div>
              )}
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-4 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/10">
              <div className="text-center">
                <p className="text-lg font-bold tabular-nums text-primary">{matchedJobs.length}</p>
                <p className="text-[10px] text-muted-foreground">Matches</p>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div className="text-center">
                <p className="text-lg font-bold tabular-nums">{alert.matchCount ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">All Time</p>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div className="text-center">
                <p className="text-lg font-bold tabular-nums">{matchedJobs.filter(j => j.isUrgent).length}</p>
                <p className="text-[10px] text-muted-foreground">Urgent</p>
              </div>
            </div>

            <Separator />

            {/* Matched jobs */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Matching Jobs ({matchedJobs.length})
              </h4>
              {matchedJobs.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">No current jobs match this alert</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto overscroll-contain pr-1">
                  {matchedJobs.slice(0, 20).map((job) => (
                    <div
                      key={job.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/30 hover:bg-primary/5 ${job.isUrgent ? "border-l-2 border-l-red-500" : ""}`}
                      onClick={() => { setSelectedJob(job); setJobSheetOpen(true); }}
                      data-testid={`alert-match-${job.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold truncate">{job.title}</h4>
                            {job.isUrgent && (
                              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 flex-shrink-0">
                                <Zap className="w-2.5 h-2.5 mr-0.5" />URGENT
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-0.5"><Building2 className="w-3 h-3" />{job.company}</span>
                            <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{job.location}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            {job.payRange && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                <DollarSign className="w-2.5 h-2.5 mr-0.5" />{job.payRange}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">{job.trade}</Badge>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  ))}
                  {matchedJobs.length > 20 && (
                    <p className="text-xs text-center text-muted-foreground py-2">
                      +{matchedJobs.length - 20} more matches
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Nested job detail sheet */}
      {selectedJob && (
        <Sheet open={jobSheetOpen} onOpenChange={(v) => !v && setJobSheetOpen(false)}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto" side="right">
            <SheetHeader className="pb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <SheetTitle className="text-base leading-snug">{selectedJob.title}</SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1">{selectedJob.company}</p>
                </div>
                {selectedJob.isUrgent && (
                  <Badge variant="destructive" className="text-[10px] flex-shrink-0">
                    <Zap className="w-3 h-3 mr-0.5" />URGENT
                  </Badge>
                )}
              </div>
            </SheetHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Location</p>
                    <p className="text-xs font-medium">{selectedJob.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                  <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Pay</p>
                    <p className="text-xs font-medium">{selectedJob.payRange || "Not listed"}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedJob.url && (
                  <Button asChild className="flex-1 h-10 text-sm font-semibold">
                    <a href={selectedJob.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1.5" />Apply Now
                    </a>
                  </Button>
                )}
                <Button variant="outline" className="h-10" asChild>
                  <a href={selectedJob.lat && selectedJob.lng
                    ? `https://www.google.com/maps/dir/?api=1&destination=${selectedJob.lat},${selectedJob.lng}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedJob.location)}`
                  } target="_blank" rel="noopener noreferrer">
                    <Navigation className="w-4 h-4" />
                  </a>
                </Button>
                <Button variant="outline" className="h-10" onClick={() => onSave(selectedJob.id)}>
                  {selectedJob.isSaved ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4" />}
                </Button>
              </div>
              <Separator />
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Description</h4>
                <div className="text-sm leading-relaxed whitespace-pre-line">{selectedJob.description || "No description available."}</div>
              </div>
              <Separator />
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{selectedJob.trade}</Badge>
                {selectedJob.workType && <Badge variant="outline">{selectedJob.workType}</Badge>}
                {selectedJob.county && <Badge variant="outline">{selectedJob.county} County</Badge>}
                <Badge variant="secondary" className="text-[10px]">via {selectedJob.source}</Badge>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => handleCopyJob(selectedJob)}>
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copied ? "Copied" : "Copy Details"}
                </Button>
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => handleShareJob(selectedJob)}>
                  <Share2 className="w-3.5 h-3.5 mr-1" />Share Job
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

export default function AlertsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [alertTrade, setAlertTrade] = useState("");
  const [alertCounty, setAlertCounty] = useState("");
  const [alertWorkType, setAlertWorkType] = useState("");
  const [alertRadius, setAlertRadius] = useState("25");
  const [alertZip, setAlertZip] = useState("");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    refetchInterval: 30000,
  });

  const { data: allJobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs", "all-for-alerts"],
    queryFn: async () => {
      const resp = await apiRequest("GET", "/api/jobs?limit=200");
      return resp.json();
    },
    refetchInterval: 30000,
  });

  // Live match preview for create form
  const livePreviewCount = useMemo(() => {
    if (!keywords.trim() && !alertTrade && !alertCounty && !alertWorkType) return null;
    return allJobs.filter(j =>
      matchJobToAlert(j, keywords, alertTrade, alertCounty, alertWorkType)
    ).length;
  }, [keywords, alertTrade, alertCounty, alertWorkType, allJobs]);

  const livePreviewJobs = useMemo(() => {
    if (!keywords.trim() && !alertTrade && !alertCounty && !alertWorkType) return [];
    return allJobs.filter(j =>
      matchJobToAlert(j, keywords, alertTrade, alertCounty, alertWorkType)
    ).slice(0, 5);
  }, [keywords, alertTrade, alertCounty, alertWorkType, allJobs]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const resp = await apiRequest("POST", "/api/alerts", data);
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "Alert created" });
      setDialogOpen(false);
      resetForm();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const resp = await apiRequest("PATCH", `/api/alerts/${id}`, { isActive });
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/alerts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "Alert deleted" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (id: number) => {
      const resp = await apiRequest("POST", `/api/jobs/${id}/save`);
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  function resetForm() {
    setKeywords("");
    setAlertTrade("");
    setAlertCounty("");
    setAlertWorkType("");
    setAlertRadius("25");
    setAlertZip("");
  }

  function handleCreate() {
    if (!keywords.trim()) {
      toast({ title: "Keywords required", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      keywords: keywords.trim(),
      trade: alertTrade && alertTrade !== "any" ? alertTrade : null,
      county: alertCounty && alertCounty !== "any" ? alertCounty : null,
      zip: alertZip || null,
      radius: parseInt(alertRadius) || 25,
      workType: alertWorkType && alertWorkType !== "any" ? alertWorkType : null,
      isActive: true,
    });
  }

  function handleOpenAlert(alert: Alert) {
    setSelectedAlert(alert);
    setDetailOpen(true);
  }

  // Get match count for each alert
  function getAlertMatchCount(alert: Alert): number {
    return allJobs.filter(j =>
      matchJobToAlert(j, alert.keywords, alert.trade || "", alert.county || "", alert.workType || "")
    ).length;
  }

  const activeAlerts = alerts.filter(a => a.isActive).length;
  const totalMatches = alerts.reduce((sum, a) => sum + getAlertMatchCount(a), 0);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Job Alerts</h2>
          <p className="text-xs text-muted-foreground">
            {activeAlerts} active alert{activeAlerts !== 1 ? "s" : ""} · {totalMatches} total matches
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs" data-testid="button-new-alert">
              <Plus className="w-3.5 h-3.5 mr-1" />New Alert
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">Create Job Alert</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-xs font-medium">Keywords (comma-separated)</Label>
                <Input
                  placeholder="electrician, HVAC, plumber..."
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="mt-1 h-9 text-sm"
                  data-testid="input-alert-keywords"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Trade</Label>
                  <Select value={alertTrade} onValueChange={setAlertTrade}>
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue placeholder="Any trade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any trade</SelectItem>
                      {TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">County</Label>
                  <Select value={alertCounty} onValueChange={setAlertCounty}>
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue placeholder="Any county" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any county</SelectItem>
                      {COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Work Type</Label>
                  <Select value={alertWorkType} onValueChange={setAlertWorkType}>
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue placeholder="Any type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any type</SelectItem>
                      {WORK_TYPES.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">ZIP Code</Label>
                  <Input
                    placeholder="92629"
                    value={alertZip}
                    onChange={(e) => setAlertZip(e.target.value)}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Radius: {alertRadius} miles</Label>
                <input
                  type="range" min="5" max="50" step="5"
                  value={alertRadius}
                  onChange={(e) => setAlertRadius(e.target.value)}
                  className="w-full mt-1 accent-primary"
                />
              </div>

              {/* Live Match Preview */}
              {livePreviewCount !== null && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      Live Preview
                    </span>
                    <Badge variant="default" className="text-[10px] h-5">
                      {livePreviewCount} match{livePreviewCount !== 1 ? "es" : ""}
                    </Badge>
                  </div>
                  {livePreviewJobs.length > 0 ? (
                    <div className="space-y-1.5">
                      {livePreviewJobs.map((job) => (
                        <div key={job.id} className="flex items-center gap-2 p-2 rounded bg-background/80 border border-border/50">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{job.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{job.company} · {job.location}</p>
                          </div>
                          {job.payRange && (
                            <Badge variant="secondary" className="text-[9px] h-4 px-1 flex-shrink-0">{job.payRange}</Badge>
                          )}
                          {job.isUrgent && (
                            <Zap className="w-3 h-3 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                      {livePreviewCount > 5 && (
                        <p className="text-[10px] text-muted-foreground text-center">+{livePreviewCount - 5} more</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">No current jobs match these criteria yet</p>
                  )}
                </div>
              )}

              <Button
                onClick={handleCreate}
                className="w-full h-9 text-sm"
                disabled={createMutation.isPending}
                data-testid="button-create-alert"
              >
                {createMutation.isPending ? "Creating..." : `Create Alert${livePreviewCount !== null ? ` (${livePreviewCount} matches)` : ""}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold tabular-nums">{alerts.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Alerts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold tabular-nums text-green-500">{activeAlerts}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold tabular-nums text-primary">{totalMatches}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Matches</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No alerts yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create an alert to get notified about matching jobs</p>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert) => {
            const matchCount = getAlertMatchCount(alert);
            const urgentMatches = allJobs.filter(j =>
              j.isUrgent && matchJobToAlert(j, alert.keywords, alert.trade || "", alert.county || "", alert.workType || "")
            ).length;

            return (
              <Card
                key={alert.id}
                className={`cursor-pointer transition-all hover:border-primary/30 hover:shadow-sm ${!alert.isActive ? "opacity-50" : ""}`}
                data-testid={`card-alert-${alert.id}`}
                onClick={() => handleOpenAlert(alert)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {alert.isActive ? (
                          <Bell className="w-4 h-4 text-primary flex-shrink-0" />
                        ) : (
                          <BellOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <h3 className="font-semibold text-sm truncate">
                          {alert.keywords}
                        </h3>
                        <Badge variant={matchCount > 0 ? "default" : "secondary"} className="text-[10px] h-5 px-1.5 tabular-nums flex-shrink-0">
                          {matchCount} match{matchCount !== 1 ? "es" : ""}
                        </Badge>
                        {urgentMatches > 0 && (
                          <Badge variant="destructive" className="text-[10px] h-5 px-1.5 tabular-nums flex-shrink-0">
                            <Zap className="w-2.5 h-2.5 mr-0.5" />{urgentMatches}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {alert.trade && <Badge variant="outline" className="text-[11px]">{alert.trade}</Badge>}
                        {alert.county && (
                          <Badge variant="outline" className="text-[11px]">
                            <MapPin className="w-3 h-3 mr-0.5" />{alert.county}
                          </Badge>
                        )}
                        {alert.workType && <Badge variant="outline" className="text-[11px]">{alert.workType}</Badge>}
                        {alert.zip && (
                          <Badge variant="outline" className="text-[11px]">
                            ZIP: {alert.zip} ({alert.radius}mi)
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />{alert.matchCount ?? 0} total
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />Last: {getTimeAgo(alert.lastTriggered)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={alert.isActive ?? true}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: alert.id, isActive: checked })
                        }
                        data-testid={`switch-alert-${alert.id}`}
                      />
                      <button
                        onClick={() => deleteMutation.mutate(alert.id)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                        data-testid={`button-delete-alert-${alert.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Alert Detail Sheet */}
      <AlertDetailSheet
        alert={selectedAlert}
        jobs={allJobs}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onSave={(id) => saveMutation.mutate(id)}
      />
    </div>
  );
}
