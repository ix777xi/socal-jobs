import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./lib/auth";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";
import {
  Briefcase, Bell, Settings, Bookmark,
  Menu, X, Sun, Moon, Zap, Crown, User, LogIn, PlusCircle, Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Dashboard from "./pages/dashboard";
import AlertsPage from "./pages/alerts";
import SourcesPage from "./pages/sources";
import SavedPage from "./pages/saved";
import AuthPage from "./pages/auth";
import PricingPage from "./pages/pricing";
import AccountPage from "./pages/account";
import PostJobPage from "./pages/post-job";
import AdminPage from "./pages/admin";
import NotFound from "./pages/not-found";

function AppLayout() {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const { user, isPro, isAdmin, loading } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Auth & pricing pages get their own layout
  if (location === "/auth" || location === "/pricing") {
    return (
      <div className={dark ? "dark" : ""}>
        <Switch>
          <Route path="/auth" component={AuthPage} />
          <Route path="/pricing" component={PricingPage} />
        </Switch>
        <Toaster />
      </div>
    );
  }

  const navItems = [
    { href: "/", label: "Jobs Feed", icon: Briefcase },
    { href: "/post-job", label: "Post a Job", icon: PlusCircle, pro: true },
    { href: "/saved", label: "Saved", icon: Bookmark, pro: true },
    { href: "/alerts", label: "Alerts", icon: Bell, pro: true },
    { href: "/sources", label: "Sources", icon: Settings },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-background">
      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card z-20">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-accent"
          data-testid="button-mobile-menu"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 36 32" className="w-8 h-7" aria-label="Orange Blue Collar Jobs logo">
            <rect x="2" y="6" width="32" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M9 13h18M9 17h14M9 21h10" stroke="hsl(24 95% 50%)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M27 11l3-4" stroke="hsl(210 70% 50%)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="27" cy="11" r="2.5" fill="hsl(210 70% 50%)" />
          </svg>
          <span className="font-semibold text-sm leading-tight">OBC Jobs</span>
          {isPro && (
            <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0 h-4">PRO</Badge>
          )}
        </div>
        <button
          onClick={() => setDark(!dark)}
          className="p-2 rounded-lg hover:bg-accent"
          data-testid="button-theme-toggle-mobile"
        >
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 fixed md:relative z-30 md:z-0
          w-56 h-full bg-card border-r border-border
          flex flex-col transition-transform duration-200 ease-out
        `}
      >
        <div className="hidden md:flex items-center gap-3 px-5 py-5">
          <svg viewBox="0 0 36 32" className="w-8 h-8 flex-shrink-0" aria-label="Orange Blue Collar Jobs logo">
            <rect x="2" y="6" width="32" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M9 13h18M9 17h14M9 21h10" stroke="hsl(24 95% 50%)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M27 11l3-4" stroke="hsl(210 70% 50%)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="27" cy="11" r="2.5" fill="hsl(210 70% 50%)" />
          </svg>
          <div>
            <h1 className="font-bold text-sm leading-tight">Orange Blue Collar</h1>
            <p className="text-[11px] text-muted-foreground leading-tight">Jobs</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors
                    ${active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }
                  `}
                  data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {item.pro && !isPro && (
                    <span className="ml-auto text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                      PRO
                    </span>
                  )}
                  {item.label === "Alerts" && isPro && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                      <Zap className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section: upgrade or account */}
        <div className="px-3 pb-3 space-y-1">
          {!isPro && (
            <Link href="/pricing">
              <div
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
                data-testid="nav-upgrade"
              >
                <Crown className="w-4 h-4" />
                Upgrade to Pro
              </div>
            </Link>
          )}

          {user ? (
            <Link href="/account">
              <div
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors
                  ${location === "/account"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }
                `}
                data-testid="nav-account"
              >
                <User className="w-4 h-4" />
                Account
                {isPro && (
                  <Badge className="ml-auto bg-primary text-primary-foreground text-[9px] px-1.5 py-0 h-4">PRO</Badge>
                )}
              </div>
            </Link>
          ) : (
            <Link href="/auth">
              <div
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                data-testid="nav-sign-in"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </div>
            </Link>
          )}
        </div>

        <div className="hidden md:flex items-center justify-between px-5 py-4 border-t border-border">
          <span className="text-xs text-muted-foreground">Theme</span>
          <button
            onClick={() => setDark(!dark)}
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
            data-testid="button-theme-toggle"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/post-job" component={PostJobPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/saved" component={SavedPage} />
          <Route path="/alerts" component={AlertsPage} />
          <Route path="/sources" component={SourcesPage} />
          <Route path="/account" component={AccountPage} />
          <Route path="/pricing" component={PricingPage} />
          <Route component={NotFound} />
        </Switch>
      </main>

      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router hook={useHashLocation}>
          <AppLayout />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
