import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { login, register, googleEnabled, refresh } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle Google OAuth error redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("error=google_failed")) {
      window.location.hash = "#/auth";
      toast({ title: "Google sign-in failed. Please try again.", variant: "destructive" });
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        toast({ title: "Welcome back" });
      } else {
        await register(email, password, name || undefined);
        toast({ title: "Account created" });
      }
      setLocation("/account");
    } catch (err: any) {
      const msg = err.message?.includes(":")
        ? err.message.split(":").slice(1).join(":").trim()
        : err.message || "Something went wrong";
      let parsed = msg;
      try { parsed = JSON.parse(msg)?.error || msg; } catch {}
      toast({ title: parsed, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignIn() {
    // Redirect to the backend Google OAuth route
    // Use the current origin to build the full URL
    window.location.href = "/api/auth/google";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <svg viewBox="0 0 32 32" className="w-10 h-10" aria-label="SoCal Jobs logo">
              <rect x="2" y="8" width="28" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M8 14h16M8 18h12M8 22h8" stroke="hsl(24 95% 50%)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="24" cy="12" r="3" fill="hsl(24 95% 50%)" />
            </svg>
            <h1 className="text-xl font-bold">Orange Blue Collar Jobs</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            SoCal blue-collar job board
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-center">
              {mode === "login" ? "Sign In" : "Create Account"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google OAuth Button */}
            {googleEnabled && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 gap-2 font-medium"
                  onClick={handleGoogleSignIn}
                  data-testid="button-google-signin"
                >
                  <GoogleIcon className="w-4 h-4" />
                  Continue with Google
                </Button>

                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                    or
                  </span>
                </div>
              </>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <Label htmlFor="name" className="text-xs font-medium">Name (optional)</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9 h-10"
                      data-testid="input-name"
                    />
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 h-10"
                    data-testid="input-email"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-9 h-10"
                    data-testid="input-password"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-10" disabled={loading} data-testid="button-auth-submit">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                {mode === "login" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-xs text-primary hover:underline"
                data-testid="button-toggle-auth-mode"
              >
                {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center">
          Free preview includes 8 job listings. Upgrade to Pro for full access.
        </p>
      </div>
    </div>
  );
}
