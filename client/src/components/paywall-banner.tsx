import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Crown, Lock, ArrowRight } from "lucide-react";

export function PaywallBanner({ feature }: { feature: string }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Lock className="w-7 h-7 text-primary" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base font-semibold">{feature} — Pro Only</h3>
        <p className="text-sm text-muted-foreground">
          Upgrade to SoCal Jobs Pro to unlock {feature.toLowerCase()}, unlimited listings, apply links, and more.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {!user ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/auth")}
              data-testid="button-paywall-login"
            >
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={() => setLocation("/pricing")}
              data-testid="button-paywall-upgrade"
            >
              <Crown className="w-4 h-4 mr-1.5" />
              View Plans
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={() => setLocation("/pricing")}
            data-testid="button-paywall-upgrade"
          >
            <Crown className="w-4 h-4 mr-1.5" />
            Upgrade to Pro — $19.99/mo
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Inline upgrade prompt for within job cards etc.
export function UpgradeChip() {
  const [, setLocation] = useLocation();

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setLocation("/pricing");
      }}
      className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-full transition-colors"
      data-testid="button-upgrade-chip"
    >
      <Crown className="w-3 h-3" />PRO
    </button>
  );
}
