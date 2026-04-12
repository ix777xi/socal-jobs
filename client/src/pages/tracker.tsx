import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList, Plus, Pencil, Trash2, Crown, Lock,
  Building2, MapPin, Calendar, ExternalLink, FileText,
  CheckCircle2, Clock, XCircle, AlertCircle, Briefcase,
} from "lucide-react";
import type { Application } from "@shared/schema";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  applied: { label: "Applied", color: "text-blue-600 dark:text-blue-400", icon: Clock, bg: "bg-blue-500/10 border-blue-500/20" },
  interviewing: { label: "Interviewing", color: "text-amber-600 dark:text-amber-400", icon: Briefcase, bg: "bg-amber-500/10 border-amber-500/20" },
  offer: { label: "Offer", color: "text-green-600 dark:text-green-400", icon: CheckCircle2, bg: "bg-green-500/10 border-green-500/20" },
  rejected: { label: "Rejected", color: "text-red-600 dark:text-red-400", icon: XCircle, bg: "bg-red-500/10 border-red-500/20" },
  ghosted: { label: "Ghosted", color: "text-muted-foreground", icon: AlertCircle, bg: "bg-muted/50 border-border" },
};

const STATUS_ORDER = ["applied", "interviewing", "offer", "rejected", "ghosted"];

interface ApplicationFormData {
  jobTitle: string;
  company: string;
  location: string;
  status: string;
  appliedAt: string;
  notes: string;
  followUpDate: string;
  url: string;
}

const defaultForm: ApplicationFormData = {
  jobTitle: "",
  company: "",
  location: "",
  status: "applied",
  appliedAt: new Date().toISOString().split("T")[0],
  notes: "",
  followUpDate: "",
  url: "",
};

function StatBubble({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-muted/50 min-w-[70px]">
      <span className={`text-xl font-bold tabular-nums ${color}`}>{count}</span>
      <span className="text-[11px] text-muted-foreground mt-0.5">{label}</span>
    </div>
  );
}

function ApplicationCard({
  app,
  onEdit,
  onDelete,
}: {
  app: Application;
  onEdit: (app: Application) => void;
  onDelete: (id: number) => void;
}) {
  const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.applied;
  const StatusIcon = cfg.icon;

  return (
    <Card className={`border ${cfg.bg} hover:shadow-sm transition-all`} data-testid={`card-application-${app.id}`}>
      <CardContent className="p-3.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{app.jobTitle}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3" />{app.company}
            </p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(app)}
              className="p-1 rounded hover:bg-accent transition-colors"
              data-testid={`button-edit-application-${app.id}`}
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => onDelete(app.id)}
              className="p-1 rounded hover:bg-accent transition-colors"
              data-testid={`button-delete-application-${app.id}`}
            >
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        </div>

        {app.location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" />{app.location}
          </p>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${cfg.color} border-current/30`}>
            <StatusIcon className="w-3 h-3 mr-0.5" />{cfg.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Calendar className="w-3 h-3" />
            {new Date(app.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          {app.followUpDate && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5 ml-auto">
              <Clock className="w-3 h-3" />Follow up {new Date(app.followUpDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {app.notes && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 bg-muted/40 rounded px-2 py-1.5">
            <FileText className="w-3 h-3 inline mr-1 opacity-60" />{app.notes}
          </p>
        )}

        {app.url && (
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary flex items-center gap-1 hover:underline"
            data-testid={`link-application-url-${app.id}`}
          >
            <ExternalLink className="w-3 h-3" />View posting
          </a>
        )}
      </CardContent>
    </Card>
  );
}

function ApplicationDialog({
  open,
  onClose,
  initial,
  onSave,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  initial: ApplicationFormData;
  onSave: (data: ApplicationFormData) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<ApplicationFormData>(initial);

  // Sync when dialog opens with new initial values
  useState(() => { setForm(initial); });

  function set(field: keyof ApplicationFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-testid="dialog-application">
        <DialogHeader>
          <DialogTitle className="text-base">{initial.jobTitle ? "Edit Application" : "Add Application"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Job Title</Label>
              <Input
                value={form.jobTitle}
                onChange={(e) => set("jobTitle", e.target.value)}
                placeholder="Electrician Helper"
                required
                data-testid="input-job-title"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Company</Label>
              <Input
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder="ABC Electric"
                required
                data-testid="input-company"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Location</Label>
              <Input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Los Angeles, CA"
                data-testid="input-location"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Applied Date</Label>
              <Input
                type="date"
                value={form.appliedAt}
                onChange={(e) => set("appliedAt", e.target.value)}
                data-testid="input-applied-at"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Follow-up Date (optional)</Label>
              <Input
                type="date"
                value={form.followUpDate}
                onChange={(e) => set("followUpDate", e.target.value)}
                data-testid="input-follow-up-date"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Job Posting URL (optional)</Label>
              <Input
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://..."
                data-testid="input-url"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Recruiter name, interview time, salary discussed..."
                className="resize-none h-20 text-sm"
                data-testid="textarea-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} size="sm">Cancel</Button>
            <Button type="submit" size="sm" disabled={isSaving} data-testid="button-save-application">
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TrackerPage() {
  const { user, isPro, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [formInitial, setFormInitial] = useState<ApplicationFormData>(defaultForm);

  const { data: applications = [], isLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
    enabled: !!user && isPro,
  });

  const { data: stats = [] } = useQuery<{ status: string; count: number }[]>({
    queryKey: ["/api/applications/stats"],
    enabled: !!user && isPro,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/applications", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/stats"] });
      setDialogOpen(false);
      toast({ title: "Application added" });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/applications/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/stats"] });
      setDialogOpen(false);
      setEditingApp(null);
      toast({ title: "Application updated" });
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/applications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/stats"] });
      toast({ title: "Application removed" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  function getStatCount(status: string) {
    return stats.find((s) => s.status === status)?.count ?? 0;
  }

  function openAdd() {
    setEditingApp(null);
    setFormInitial({ ...defaultForm, appliedAt: new Date().toISOString().split("T")[0] });
    setDialogOpen(true);
  }

  function openEdit(app: Application) {
    setEditingApp(app);
    setFormInitial({
      jobTitle: app.jobTitle,
      company: app.company,
      location: app.location || "",
      status: app.status,
      appliedAt: app.appliedAt.split("T")[0],
      notes: app.notes || "",
      followUpDate: app.followUpDate || "",
      url: app.url || "",
    });
    setDialogOpen(true);
  }

  function handleSave(data: ApplicationFormData) {
    const payload = {
      ...data,
      appliedAt: data.appliedAt ? new Date(data.appliedAt).toISOString() : new Date().toISOString(),
      followUpDate: data.followUpDate || null,
      url: data.url || null,
      notes: data.notes || null,
      location: data.location || null,
    };
    if (editingApp) {
      updateMutation.mutate({ id: editingApp.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  if (!user || !isPro) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
        <div className="p-4 rounded-full bg-primary/10">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="font-bold text-lg">Application Tracker</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Track every job application in one place. Know your status, follow-up dates, and notes. Pro only.
          </p>
        </div>
        <Button onClick={() => setLocation("/pricing")} data-testid="button-upgrade-tracker">
          <Crown className="w-4 h-4 mr-2" />Upgrade to Pro
        </Button>
      </div>
    );
  }

  // Group applications by status
  const byStatus: Record<string, Application[]> = {};
  for (const status of STATUS_ORDER) byStatus[status] = [];
  for (const app of applications) {
    if (byStatus[app.status]) byStatus[app.status].push(app);
    else byStatus["applied"].push(app);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Application Tracker</h1>
            <p className="text-xs text-muted-foreground">Manage your entire job search in one place</p>
          </div>
        </div>
        <Button size="sm" onClick={openAdd} data-testid="button-add-application">
          <Plus className="w-4 h-4 mr-1.5" />Add Application
        </Button>
      </div>

      {/* Stats row */}
      <div className="flex gap-2 flex-wrap">
        <StatBubble label="Applied" count={getStatCount("applied")} color="text-blue-600 dark:text-blue-400" />
        <StatBubble label="Interviewing" count={getStatCount("interviewing")} color="text-amber-600 dark:text-amber-400" />
        <StatBubble label="Offer" count={getStatCount("offer")} color="text-green-600 dark:text-green-400" />
        <StatBubble label="Rejected" count={getStatCount("rejected")} color="text-red-500" />
        <StatBubble label="Ghosted" count={getStatCount("ghosted")} color="text-muted-foreground" />
        <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-primary/10 min-w-[70px]">
          <span className="text-xl font-bold tabular-nums text-primary">{applications.length}</span>
          <span className="text-[11px] text-muted-foreground mt-0.5">Total</span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <ClipboardList className="w-10 h-10 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">No applications yet</p>
          <p className="text-sm text-muted-foreground/70">Click a job on the dashboard to auto-add it, or add one manually.</p>
          <Button variant="outline" size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" />Add manually
          </Button>
        </div>
      ) : (
        /* Kanban columns */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {STATUS_ORDER.map((status) => {
            const cfg = STATUS_CONFIG[status];
            const StatusIcon = cfg.icon;
            const cards = byStatus[status] || [];
            return (
              <div key={status} className="space-y-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <StatusIcon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums font-medium">{cards.length}</span>
                </div>
                {cards.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 p-4 text-center">
                    <p className="text-[11px] text-muted-foreground/50">None</p>
                  </div>
                ) : (
                  cards.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      onEdit={openEdit}
                      onDelete={(id) => deleteMutation.mutate(id)}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      <ApplicationDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingApp(null); }}
        initial={formInitial}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
