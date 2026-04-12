import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
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
} from "lucide-react";
import type { Job } from "@shared/schema";
import { TRADES, COUNTIES, WORK_TYPES, PAY_TYPES } from "@shared/schema";

function PostJobForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocationVal] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [zip, setZip] = useState("");
  const [trade, setTrade] = useState("");
  const [payRange, setPayRange] = useState("");
  const [payType, setPayType] = useState("");
  const [workType, setWorkType] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [url, setUrl] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

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
      // Reset form
      setTitle(""); setCompany(""); setLocationVal(""); setCity(""); setCounty(""); setZip("");
      setTrade(""); setPayRange(""); setPayType(""); setWorkType(""); setDescription("");
      setContactEmail(""); setContactPhone(""); setUrl(""); setIsUrgent(false);
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: "Error posting job", description: err.message || "Something went wrong", variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    postMutation.mutate({
      title, company, location, city: city || undefined, county: county || undefined,
      zip: zip || undefined, trade, payRange: payRange || undefined,
      payType: payType || undefined, workType: workType || undefined,
      description, contactEmail: contactEmail || undefined,
      contactPhone: contactPhone || undefined, url: url || undefined, isUrgent,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Basic Info */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Job Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-medium">Job Title *</Label>
            <Input id="title" placeholder="e.g. Experienced Electrician" value={title} onChange={(e) => setTitle(e.target.value)} required className="h-9 text-sm" data-testid="input-job-title" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company" className="text-xs font-medium">Company *</Label>
            <Input id="company" placeholder="e.g. Smith Electric Co." value={company} onChange={(e) => setCompany(e.target.value)} required className="h-9 text-sm" data-testid="input-company" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="location" className="text-xs font-medium">Location *</Label>
            <Input id="location" placeholder="e.g. Irvine, CA" value={location} onChange={(e) => setLocationVal(e.target.value)} required className="h-9 text-sm" data-testid="input-location" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="county" className="text-xs font-medium">County</Label>
            <Select value={county} onValueChange={(v) => setCounty(v === "none" ? "" : v)}>
              <SelectTrigger className="h-9 text-sm" data-testid="select-county"><SelectValue placeholder="Select county" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zip" className="text-xs font-medium">ZIP Code</Label>
            <Input id="zip" placeholder="e.g. 92618" value={zip} onChange={(e) => setZip(e.target.value)} className="h-9 text-sm" data-testid="input-zip" />
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
            <Select value={trade} onValueChange={setTrade}>
              <SelectTrigger className="h-9 text-sm" data-testid="select-trade"><SelectValue placeholder="Select trade" /></SelectTrigger>
              <SelectContent>
                {TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Work Type</Label>
            <Select value={workType} onValueChange={(v) => setWorkType(v === "none" ? "" : v)}>
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
            <Input id="payRange" placeholder="e.g. $25-$35/hr" value={payRange} onChange={(e) => setPayRange(e.target.value)} className="h-9 text-sm" data-testid="input-pay-range" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Pay Type</Label>
            <Select value={payType} onValueChange={(v) => setPayType(v === "none" ? "" : v)}>
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={6}
            className="text-sm resize-none"
            data-testid="textarea-description"
          />
          <p className="text-[11px] text-muted-foreground">{description.length}/5000 characters</p>
        </div>
      </div>

      <Separator />

      {/* Contact & URL */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail" className="text-xs font-medium">Contact Email</Label>
            <Input id="contactEmail" type="email" placeholder="hiring@company.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="h-9 text-sm" data-testid="input-contact-email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactPhone" className="text-xs font-medium">Contact Phone</Label>
            <Input id="contactPhone" type="tel" placeholder="(949) 555-1234" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="h-9 text-sm" data-testid="input-contact-phone" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="url" className="text-xs font-medium">Application URL</Label>
          <Input id="url" type="url" placeholder="https://company.com/apply" value={url} onChange={(e) => setUrl(e.target.value)} className="h-9 text-sm" data-testid="input-url" />
        </div>
      </div>

      <Separator />

      {/* Urgent toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-medium">Mark as Urgent Hiring</Label>
          <p className="text-[11px] text-muted-foreground">Highlights your listing with an urgent badge</p>
        </div>
        <Switch checked={isUrgent} onCheckedChange={setIsUrgent} data-testid="switch-urgent" />
      </div>

      <Button type="submit" className="w-full h-10 text-sm font-semibold" disabled={postMutation.isPending} data-testid="button-post-job">
        {postMutation.isPending ? (
          <span className="flex items-center gap-2">Posting...</span>
        ) : (
          <span className="flex items-center gap-2"><PlusCircle className="w-4 h-4" />Post Job Listing</span>
        )}
      </Button>
    </form>
  );
}

function MyPostings() {
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
              {user ? "Upgrade to Pro — $19.99/mo" : "Sign In to Get Started"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-bold">Job Postings</h2>
        <p className="text-xs text-muted-foreground">Create and manage your job listings. Posted jobs appear in the main feed for all users.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8">
          <TabsTrigger value="post" className="text-xs h-7">
            <PlusCircle className="w-3 h-3 mr-1" />Post a Job
          </TabsTrigger>
          <TabsTrigger value="my-postings" className="text-xs h-7">
            <FileText className="w-3 h-3 mr-1" />My Postings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="post" className="mt-4">
          <Card>
            <CardContent className="p-4 sm:p-5">
              <PostJobForm onSuccess={() => setTab("my-postings")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-postings" className="mt-4">
          <MyPostings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
