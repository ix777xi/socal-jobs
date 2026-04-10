import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, BellOff, Plus, Trash2, MapPin, Zap, Clock,
  Search, Filter,
} from "lucide-react";
import type { Alert } from "@shared/schema";
import { TRADES, COUNTIES, WORK_TYPES } from "@shared/schema";

export default function AlertsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [alertTrade, setAlertTrade] = useState("");
  const [alertCounty, setAlertCounty] = useState("");
  const [alertWorkType, setAlertWorkType] = useState("");
  const [alertRadius, setAlertRadius] = useState("25");
  const [alertZip, setAlertZip] = useState("");

  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    refetchInterval: 30000,
  });

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
      trade: alertTrade || null,
      county: alertCounty || null,
      zip: alertZip || null,
      radius: parseInt(alertRadius) || 25,
      workType: alertWorkType || null,
      isActive: true,
    });
  }

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

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Job Alerts</h2>
          <p className="text-xs text-muted-foreground">Get notified when new jobs match your criteria</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs" data-testid="button-new-alert">
              <Plus className="w-3.5 h-3.5 mr-1" />New Alert
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
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
              <Button
                onClick={handleCreate}
                className="w-full h-9 text-sm"
                disabled={createMutation.isPending}
                data-testid="button-create-alert"
              >
                {createMutation.isPending ? "Creating..." : "Create Alert"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
          alerts.map((alert) => (
            <Card key={alert.id} className={`${!alert.isActive ? "opacity-50" : ""}`} data-testid={`card-alert-${alert.id}`}>
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
                        <Zap className="w-3 h-3" />{alert.matchCount ?? 0} matches
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />Last: {getTimeAgo(alert.lastTriggered)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
