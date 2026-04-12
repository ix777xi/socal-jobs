import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import {
  PlusCircle, Briefcase, MapPin, DollarSign, Clock,
  Building2, Zap, Trash2, Edit3, Eye, CheckCircle2,
  Crown, Lock, FileText, Phone, Mail, ExternalLink,
  X, Save, Loader2,
} from "lucide-react";
import type { Job } from "@shared/schema";
import { TRADES, COUNTIES, WORK_TYPES, PAY_TYPES } from "@shared/schema";

interface JobFormData {
  title: string;
  company: string;
  location: string;
  city: string;
  county: string;
  zip: string;
  trade: string;
  payRange: string;
  payType: string;
  workType: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  url: string;
  isUrgent: boolean;
}

const emptyForm: JobFormData = {
  title: "", company: "", location: "", city: "", county: "", zip: "",
  trade: "", payRange: "", payType: "", workType: "", description: "",
  contactEmail: "", contactPhone: "", url: "", isUrgent: false,
};

function jobToFormData(job: Job): JobFormData {
  return {
    title: job.title || "",
    company: job.company || "",
    location: job.location || "",
    city: job.city || "",
    county: job.county || "",
    zip: job.zip || "",
    trade: job.trade || "",
    payRange: job.payRange || "",
    payType: job.payType || "",
    workType: job.workType || "",
    description: job.description || "",
    contactEmail: job.contactEmail || "",
    contactPhone: job.contactPhone || "",
    url: job.url || "",
    isUrgent: job.isUrgent ?? false,
  };
}

function JobForm({ editingJob, onSuccess, onCancel }: {
  editingJob: Job | null;
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<JobFormData>(editingJob ? jobToFormData(editingJob) : emptyForm);

  // Reset form when editingJob changes
  useEffect(() => {
    setForm(editingJob ? jobToFormData(editingJob) : emptyForm);
  }, [editingJob?.id]);

  const isEditing = !!editingJob;

  const set = (field: keyof JobFormData) => (val: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const postMutation = useMutation({
    mutationFn: async (data: any) => {
      const resp = await apiRequest("POST", "/api/jobs/post", data);
      return resp.json();
    },
    onSuccess: () => {
      toast({ title: "Job posted successfully", description: "Your listing is now live in the jobs feed." });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/my-postings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setForm(emptyForm);
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: "Error posting job", description: err.message || "Something went wrong", variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: any) => {
      const resp = await apiRequest("PATCH", `/api/jobs/${editingJob!.id}/edit`, data);
      return resp.json();
    },
    onSuccess: () => {
      toast({ title: "Job updated", description: "Your changes have been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/my-postings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: "Error updating job", description: err.message || "Something went wrong", variant: "destructive" });
    },
  });

  const isPending = postMutation.isPending || editMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: form.title, company: form.company, location: form.location,
      city: form.city || undefined, county: form.county || undefined,
      zip: form.zip || undefined, trade: form.trade,
      payRange: form.payRange || undefined, payType: form.payType || undefined,
      workType: form.workType || undefined, description: form.description,
      contactEmail: form.contactEmail || undefined,
      contactPhone: form.contactPhone || undefined,
      url: form.url || undefined, isUrgent: form.isUrgent,
    };

    if (isEditing) {
      editMutation.mutate(payload);
    } else {
      postMutation.mutate(payload);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {isEditing && (
        <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 p-3">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Editing: {editingJob.title}</span>
          </div>
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
              <X className="w-3 h-3 mr-1" />Cancel
            </Button>
          )}
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Job Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-medium">Job Title *</Label>
            <Input id="title" placeholder="e.g. Experienced Electrician" value={form.title} onChange={(e) => set("title")(e.target.value)} required className="h-9 text-sm" data-testid="input-job-title" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company" className="text-xs font-medium">Company *</Label>
            <Input id="company" placeholder="e.g. Smith Electric Co." value={form.company} onChange={(e) => set("company")(e.target.value)} required className="h-9 text-sm" data-testid="input-company" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="location" className="text-xs font-medium">Location *</Label>
            <Input id="location" placeholder="e.g. Irvine, CA" value={form.location} onChange={(e) => set("location")(e.target.value)} required className="h-9 text-sm" data-testid="input-location" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="county" className="text-xs font-medium">County</Label>
            <Select value={form.county || "none"} onValueChange={(v) => set("county")(v === "none" ? "" : v)}>
              <SelectTrigger className="h-9 text-sm" data-testid="select-county"><SelectValue placeholder="Select county" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zip" className="text-xs font-medium">ZIP Code</Label>
            <Input id="zip" placeholder="e.g. 92618" value={form.zip} onChange={(e) => set("zip")(e.target.value)} className="h-9 text-sm" data-testid="input-zip" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Trade & Pay */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Trade & Compensation</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Trade *</Label>
            <Select value={form.trade || "none"} onValueChange={(v) => set("trade")(v === "none" ? "" : v)}>
              <SelectTrigger className="h-9 text-sm" data-testid="select-trade"><SelectValue placeholder="Select trade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select trade</SelectItem>
                {TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Work Type</Label>
            <Select value={form.workType || "none"} onValueChange={(v) => set("workType")(v === "none" ? "" : v)}>
              <SelectTrigger className="h-9 text-sm" data-testid="select-work-type"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {WORK_TYPES.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="payRange" className="text-xs font-medium">Pay Range</Label>
            <Input id="payRange" placeholder="e.g. $25-$35/hr" value={form.payRange} onChange={(e) => set("payRange")(e.target.value)} className="h-9 text-sm" data-testid="input-pay-range" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Pay Type</Label>
            <Select value={form.payType || "none"} onValueChange={(v) => set("payType")(v === "none" ? "" : v)}>
              <SelectTrigger className="h-9 text-sm" data-testid="select-pay-type"><SelectValue placeholder="Select pay type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {PAY_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Description */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Description</h3>
        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-xs font-medium">Job Description *</Label>
          <Textarea
            id="description"
            placeholder="Describe the job responsibilities, requirements, qualifications, benefits..."
            value={form.description}
            onChange={(e) => set("description")(e.target.value)}
            required
            rows={6}
            className="text-sm resize-none"
            data-testid="textarea-description"
          />
          <p className="text-[11px] text-muted-foreground">{form.description.length}/5000 characters</p>
        </div>
      </div>

      <Separator />

      {/* Contact & URL */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail" className="text-xs font-medium">Contact Email</Label>
            <Input id="contactEmail" type="email" placeholder="hiring@company.com" value={form.contactEmail} onChange={(e) => set("contactEmail")(e.target.value)} className="h-9 text-sm" data-testid="input-contact-email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactPhone" className="text-xs font-medium">Contact Phone</Label>
            <Input id="contactPhone" type="tel" placeholder="(949) 555-1234" value={form.contactPhone} onChange={(e) => set("contactPhone")(e.target.value)} className="h-9 text-sm" data-testid="input-contact-phone" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="url" className="text-xs font-medium">Application URL</Label>
          <Input id="url" type="url" placeholder="https://company.com/apply" value={form.url} onChange={(e) => set("url")(e.target.value)} className="h-9 text-sm" data-testid="input-url" />
        </div>
      </div>

      <Separator />

      {/* Urgent toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-medium">Mark as Urgent Hiring</Label>
          <p className="text-[11px] text-muted-foreground">Highlights your listing with an urgent badge</p>
        </div>
        <Switch checked={form.isUrgent} onCheckedChange={(v) => set("isUrgent")(v)} data-testid="switch-urgent" />
      </div>

      <div className="flex gap-2">
        {isEditing && onCancel && (
          <Button type="button" variant="outline" className="flex-1 h-10 text-sm" onClick={onCancel} data-testid="button-cancel-edit">
            <X className="w-4 h-4 mr-1.5" />Cancel
          </Button>
        )}
        <Button type="submit" className={`${isEditing && onCancel ? "flex-1" : "w-full"} h-10 text-sm font-semibold`} disabled={isPending} data-testid={isEditing ? "button-save-edit" : "button-post-job"}>
          {isPending ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{isEditing ? "Saving..." : "Posting..."}</span>
          ) : (
            <span className="flex items-center gap-2">
              {isEditing ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              {isEditing ? "Save Changes" : "Post Job Listing"}
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}

function MyPostings({ onEdit }: { onEdit: (job: Job) => void }) {
  const { toast } = useToast();

  const { data: myJobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs/my-postings"],
    queryFn: async () => {
      const resp = await apiRequest("GET", "/api/jobs/my-postings");
      return resp.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const resp = await apiRequest("DELETE", `/api/jobs/${id}`);
      return resp.json();
    },
    onSuccess: () => {
      toast({ title: "Job deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/my-postings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><div className="space-y-2 animate-pulse"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /></div></CardContent></Card>
        ))}
      </div>
    );
  }

  if (myJobs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No job postings yet</p>
          <p className="text-xs text-muted-foreground mt-1">Switch to the "Post a Job" tab to create your first listing.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {myJobs.map((job) => (
        <Card key={job.id} className={`${job.status === "active" ? "" : "opacity-60"}`} data-testid={`my-posting-${job.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm truncate">{job.title}</h3>
                  {job.isUrgent && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                      <Zap className="w-3 h-3 mr-0.5" />URGENT
                    </Badge>
                  )}
                  <Badge variant={job.status === "active" ? "default" : "secondary"} className="text-[10px] h-5">
                    {job.status === "active" ? "Active" : job.status}
                  </Badge>
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
                  <span className="text-[11px] text-muted-foreground ml-auto">
                    Posted {new Date(job.postedAt || job.fetchedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={() => onEdit(job)}
                  data-testid={`button-edit-${job.id}`}
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this posting?")) {
                      deleteMutation.mutate(job.id);
                    }
                  }}
                  data-testid={`button-delete-${job.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PostJobPage() {
  const { user, isPro } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState("post");
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Not logged in or not a subscriber
  if (!user || !isPro) {
    return (
      <div className="p-4 md:p-6">
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-8 text-center space-y-3">
            <Lock className="w-10 h-10 mx-auto text-primary" />
            <h2 className="text-lg font-bold">Pro Feature</h2>
            <p className="text-sm text-muted-foreground">
              Posting jobs is available exclusively for Pro subscribers.
            </p>
            <Button className="h-9 text-sm" onClick={() => setLocation(user ? "/pricing" : "/auth")}>
              <Crown className="w-4 h-4 mr-1.5" />
              {user ? "Upgrade to Pro — $9.99/wk" : "Sign In to Get Started"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  function handleEdit(job: Job) {
    setEditingJob(job);
    setTab("post");
  }

  function handleCancelEdit() {
    setEditingJob(null);
  }

  function handleFormSuccess() {
    if (editingJob) {
      setEditingJob(null);
      setTab("my-postings");
    } else {
      setTab("my-postings");
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-bold">Job Postings</h2>
        <p className="text-xs text-muted-foreground">Create and manage your job listings. Posted jobs appear in the main feed for all users.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v === "my-postings") setEditingJob(null); }}>
        <TabsList className="h-8">
          <TabsTrigger value="post" className="text-xs h-7">
            {editingJob ? (
              <><Edit3 className="w-3 h-3 mr-1" />Edit Job</>
            ) : (
              <><PlusCircle className="w-3 h-3 mr-1" />Post a Job</>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-postings" className="text-xs h-7">
            <FileText className="w-3 h-3 mr-1" />My Postings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="post" className="mt-4">
          <Card>
            <CardContent className="p-4 sm:p-5">
              <JobForm
                editingJob={editingJob}
                onSuccess={handleFormSuccess}
                onCancel={editingJob ? handleCancelEdit : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-postings" className="mt-4">
          <MyPostings onEdit={handleEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
