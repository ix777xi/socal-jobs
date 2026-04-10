import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";
import {
  Briefcase, Bell, Settings, BarChart3, Bookmark,
  Menu, X, Sun, Moon, Zap,
} from "lucide-react";
import Dashboard from "./pages/dashboard";
import AlertsPage from "./pages/alerts";
import SourcesPage from "./pages/sources";
import SavedPage from "./pages/saved";
import NotFound from "./pages/not-found";

function AppLayout() {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const navItems = [
    { href: "/", label: "Jobs Feed", icon: Briefcase },
    { href: "/saved", label: "Saved", icon: Bookmark },
    { href: "/alerts", label: "Alerts", icon: Bell },
    { href: "/sources", label: "Sources", icon: Settings },
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
          <svg viewBox="0 0 32 32" className="w-7 h-7" aria-label="SoCal Jobs logo">
            <rect x="2" y="8" width="28" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M8 14h16M8 18h12M8 22h8" stroke="hsl(24 95% 50%)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="24" cy="12" r="3" fill="hsl(24 95% 50%)" />
          </svg>
          <span className="font-semibold text-sm">SoCal Jobs</span>
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
          <svg viewBox="0 0 32 32" className="w-8 h-8 flex-shrink-0" aria-label="SoCal Jobs logo">
            <rect x="2" y="8" width="28" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M8 14h16M8 18h12M8 22h8" stroke="hsl(24 95% 50%)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="24" cy="12" r="3" fill="hsl(24 95% 50%)" />
          </svg>
          <div>
            <h1 className="font-bold text-sm leading-tight">SoCal Jobs</h1>
            <p className="text-[11px] text-muted-foreground leading-tight">Blue-Collar Aggregator</p>
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
                  {item.label === "Alerts" && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                      <Zap className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

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
          <Route path="/saved" component={SavedPage} />
          <Route path="/alerts" component={AlertsPage} />
          <Route path="/sources" component={SourcesPage} />
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
      <Router hook={useHashLocation}>
        <AppLayout />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
