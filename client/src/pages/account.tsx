import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import {
  User, Crown, CreditCard, LogOut, ExternalLink,
  CheckCircle2, AlertTriangle, Loader2, Mail, Calendar,
} from "lucide-react";

export default function AccountPage() {
  const [, setLocation] = useLocation();
  const { user, isPro, logout, refresh } = useAuth();
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);

  // Check for Stripe checkout redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
    const sessionId = params.get("session_id");
    if (sessionId) {
      apiRequest("GET", `/api/stripe/verify-session?session_id=${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "active") {
            toast({ title: "Subscription activated — welcome to Pro" });
            refresh();
          }
        })
        .catch(() => {});
      // Clean up URL
      window.history.replaceState(null, "", window.location.pathname + "#/account");
    }
  }, []);

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const res = await apiRequest("POST", "/api/stripe/portal");
      const { url } = await res.json();
      if (url) window.open(url, "_blank");
    } catch {
      toast({ title: "Could not open billing portal", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    setLocation("/auth");
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const subEnd = user.subscriptionEnd ? new Date(user.subscriptionEnd) : null;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-bold">Account</h2>
        <p className="text-xs text-muted-foreground">Manage your profile and subscription</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {user.avatarUrl && (
            <div className="flex items-center gap-3 pb-1">
              <img
                src={user.avatarUrl}
                alt={user.name || "Avatar"}
                className="w-10 h-10 rounded-full object-cover border"
                referrerPolicy="no-referrer"
              />
              <div>
                {user.name && <p className="text-sm font-medium">{user.name}</p>}
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          )}
          {!user.avatarUrl && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Email</span>
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  {user.email}
                </span>
              </div>
              {user.name && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">{user.name}</span>
                </div>
              )}
            </>
          )}
          {user.authProvider === "google" && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Sign-in method</span>
              <span className="text-xs font-medium flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className={isPro ? "border-primary/30" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Crown className={`w-4 h-4 ${isPro ? "text-primary" : "text-muted-foreground"}`} />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Plan</span>
            <div className="flex items-center gap-2">
              {isPro ? (
                <Badge className="bg-primary text-primary-foreground text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />Pro — $19.99/mo
                </Badge>
              ) : user.subscriptionStatus === "canceled" ? (
                <Badge variant="secondary" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />Canceled
                </Badge>
              ) : user.subscriptionStatus === "past_due" ? (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />Past Due
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Free</Badge>
              )}
            </div>
          </div>

          {subEnd && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {user.subscriptionStatus === "canceled" ? "Access until" : "Next billing date"}
              </span>
              <span className="text-sm font-medium tabular-nums flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {subEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          )}

          <Separator />

          {isPro || user.subscriptionStatus === "canceled" || user.subscriptionStatus === "past_due" ? (
            <Button
              variant="outline"
              className="w-full h-9 text-sm"
              onClick={handleManageBilling}
              disabled={portalLoading}
              data-testid="button-manage-billing"
            >
              {portalLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Manage Billing
            </Button>
          ) : (
            <Button
              className="w-full h-9 text-sm font-semibold"
              onClick={() => setLocation("/pricing")}
              data-testid="button-upgrade"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Pro — $19.99/mo
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="ghost"
        className="w-full h-9 text-sm text-muted-foreground hover:text-destructive"
        onClick={handleLogout}
        data-testid="button-logout"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
