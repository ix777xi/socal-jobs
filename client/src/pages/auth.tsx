import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Briefcase, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

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
      setLocation("/");
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
            <h1 className="text-xl font-bold">SoCal Jobs</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Blue-collar job aggregator for Southern California
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-center">
              {mode === "login" ? "Sign In" : "Create Account"}
            </CardTitle>
          </CardHeader>
          <CardContent>
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
