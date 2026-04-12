import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import {
  Check, X, Crown, Briefcase, Bell, Bookmark, MapPin,
  ExternalLink, BarChart3, Zap, Loader2, Shield,
} from "lucide-react";

export default function PricingPage() {
  const [, setLocation] = useLocation();
  const { user, isPro } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    if (!user) {
      setLocation("/auth");
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/stripe/create-checkout");
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      toast({ title: "Could not start checkout", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const freeFeatures = [
    { text: "Browse up to 8 job listings", included: true },
    { text: "Basic job info (title, company, location)", included: true },
    { text: "Trade & county filters", included: true },
    { text: "Source monitoring dashboard", included: true },
    { text: "Full job descriptions", included: false },
    { text: "Direct apply links", included: false },
    { text: "Save & bookmark jobs", included: false },
    { text: "Job alerts with live preview", included: false },
    { text: "Unlimited listings", included: false },
    { text: "Google Maps directions", included: false },
    { text: "Copy & share job details", included: false },
    { text: "Stats & charts", included: false },
  ];

  const proFeatures = [
    { text: "Unlimited job listings", included: true },
    { text: "Full job descriptions & details", included: true },
    { text: "Direct apply links to job boards", included: true },
    { text: "Save & bookmark favorite jobs", included: true },
    { text: "Job alerts with live match preview", included: true },
    { text: "Google Maps directions to job sites", included: true },
    { text: "Copy & share job details", included: true },
    { text: "Interactive stats & charts", included: true },
    { text: "All 9 data sources, 20 trades", included: true },
    { text: "Real-time 30s polling", included: true },
    { text: "Urgent job notifications", included: true },
    { text: "Priority support", included: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <div className="text-center space-y-3 mb-10">
          <div className="flex items-center justify-center gap-2">
            <svg viewBox="0 0 32 32" className="w-8 h-8" aria-label="SoCal Jobs logo">
              <rect x="2" y="8" width="28" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M8 14h16M8 18h12M8 22h8" stroke="hsl(24 95% 50%)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="24" cy="12" r="3" fill="hsl(24 95% 50%)" />
            </svg>
            <span className="text-lg font-bold">SoCal Jobs</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Find your next gig, faster
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Full access to every blue-collar job listing across LA, Orange, and San Diego counties. Real-time alerts, apply links, and more.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free tier */}
          <Card className="relative">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Free</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">$0</span>
                <span className="text-sm text-muted-foreground">/forever</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Limited preview of job listings</p>
            </CardHeader>
            <CardContent className="pt-4">
              <ul className="space-y-2.5">
                {freeFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {f.included ? (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={f.included ? "" : "text-muted-foreground/60"}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full mt-6 h-10"
                onClick={() => setLocation("/")}
                data-testid="button-continue-free"
              >
                Continue Free
              </Button>
            </CardContent>
          </Card>

          {/* Pro tier */}
          <Card className="relative border-primary/50 shadow-lg shadow-primary/5">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold">
                <Crown className="w-3 h-3 mr-1" />Most Popular
              </Badge>
            </div>
            <CardHeader className="pb-2 pt-6">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Pro
                <Zap className="w-4 h-4 text-primary" />
              </CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">$9.99</span>
                <span className="text-sm text-muted-foreground">/week</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Full access, unlimited listings & alerts</p>
            </CardHeader>
            <CardContent className="pt-4">
              <ul className="space-y-2.5">
                {proFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
              {isPro ? (
                <Button variant="outline" className="w-full mt-6 h-10" disabled>
                  <Check className="w-4 h-4 mr-2" />Current Plan
                </Button>
              ) : (
                <Button
                  className="w-full mt-6 h-10 font-semibold"
                  onClick={handleUpgrade}
                  disabled={loading}
                  data-testid="button-upgrade-pro"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Crown className="w-4 h-4 mr-2" />
                  )}
                  Upgrade to Pro
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-10 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Shield className="w-4 h-4" />Secure checkout via Stripe
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4" />Cancel anytime
          </span>
        </div>
      </div>
    </div>
  );
}
