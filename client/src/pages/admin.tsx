import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import {
  Shield, Users, Settings, ToggleLeft, Crown,
  Lock, UserCheck, UserX, Mail, Calendar,
} from "lucide-react";

interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  authProvider: string;
  subscriptionStatus: string;
  subscriptionEnd: string | null;
  isAdmin: boolean;
  createdAt: string;
}

interface SiteSetting {
  key: string;
  value: string;
  updatedAt: string;
}

function PaywallToggle() {
  const { toast } = useToast();
  const { refresh } = useAuth();

  const { data: settings = [] } = useQuery<SiteSetting[]>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const resp = await apiRequest("GET", "/api/admin/settings");
      return resp.json();
    },
  });

  const paywallSetting = settings.find(s => s.key === "paywall_enabled");
  const paywallEnabled = paywallSetting?.value !== "false";

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const resp = await apiRequest("POST", "/api/admin/settings", {
        key: "paywall_enabled",
        value: enabled ? "true" : "false",
      });
      return resp.json();
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      // Force re-fetch site settings so auth context updates
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings/public"] });
      refresh();
      toast({
        title: enabled ? "Paywall enabled" : "Paywall disabled",
        description: enabled
          ? "Users must subscribe to access Pro features."
          : "All features are now free for everyone — no sign-in required for Pro content.",
      });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ToggleLeft className="w-4 h-4" />
          Subscription Paywall
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{paywallEnabled ? "Paywall is ON" : "Paywall is OFF"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {paywallEnabled
                ? "Users must subscribe ($19.99/mo) to access full job details, apply links, saved jobs, alerts, and job posting."
                : "All features are free for everyone. No sign-in or subscription required for Pro content."}
            </p>
          </div>
          <Switch
            checked={paywallEnabled}
            onCheckedChange={(checked) => toggleMutation.mutate(checked)}
            disabled={toggleMutation.isPending}
            data-testid="switch-paywall"
          />
        </div>
        <div className={`rounded-lg p-3 text-xs ${paywallEnabled ? "bg-primary/5 border border-primary/20" : "bg-green-500/5 border border-green-500/20"}`}>
          <p className="font-medium">{paywallEnabled ? "Restricted Access" : "Open Access"}</p>
          <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
            {paywallEnabled ? (
              <>
                <li>Free users: 8 jobs, no apply links, no full details</li>
                <li>Pro features: alerts, saved jobs, job posting, unlimited listings</li>
                <li>Subscription: $19.99/month via Stripe</li>
              </>
            ) : (
              <>
                <li>Everyone sees all jobs with full details and apply links</li>
                <li>All Pro features unlocked for all visitors</li>
                <li>Sign-in still available but not required</li>
              </>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function UserManagement() {
  const { toast } = useToast();

  const { data: adminUsers = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const resp = await apiRequest("GET", "/api/admin/users");
      return resp.json();
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const resp = await apiRequest("PATCH", `/api/admin/users/${id}`, updates);
      return resp.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User updated", description: `${data.email} updated successfully.` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4" />
          Users ({adminUsers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {adminUsers.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No users yet</div>
          ) : (
            adminUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3" data-testid={`admin-user-${u.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{u.email}</p>
                    {u.isAdmin && (
                      <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4">ADMIN</Badge>
                    )}
                    {u.authProvider === "google" && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">Google</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                    {u.name && <span>{u.name}</span>}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Joined {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Select
                    value={u.subscriptionStatus}
                    onValueChange={(v) => updateUserMutation.mutate({ id: u.id, updates: { subscriptionStatus: v } })}
                  >
                    <SelectTrigger className="h-7 text-[11px] w-28" data-testid={`select-subscription-${u.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trialing">Trialing</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                      <SelectItem value="past_due">Past Due</SelectItem>
                    </SelectContent>
                  </Select>

                  <Badge
                    variant={u.subscriptionStatus === "active" || u.subscriptionStatus === "trialing" ? "default" : "secondary"}
                    className="text-[9px] h-5 w-12 justify-center"
                  >
                    {u.subscriptionStatus === "active" ? "PRO" : u.subscriptionStatus === "trialing" ? "TRIAL" : u.subscriptionStatus === "none" ? "FREE" : u.subscriptionStatus.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

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

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Admin Panel
        </h2>
        <p className="text-xs text-muted-foreground">Manage site settings, users, and subscriptions.</p>
      </div>

      <PaywallToggle />
      <UserManagement />
    </div>
  );
}
