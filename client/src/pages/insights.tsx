import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Crown, Lock, TrendingUp, DollarSign, MapPin, Briefcase, Info } from "lucide-react";

interface TradeData {
  trade: string;
  avgMin: number;
  avgMax: number;
  count: number;
}

interface CountyData {
  county: string;
  avgMin: number;
  avgMax: number;
  count: number;
}

interface SalaryInsights {
  byTrade: TradeData[];
  byCounty: CountyData[];
  overall: { avgMin: number; avgMax: number; total: number };
}

const CHART_COLORS = [
  "hsl(24,95%,50%)",
  "hsl(24,80%,55%)",
  "hsl(24,70%,60%)",
  "hsl(24,60%,65%)",
  "hsl(210,70%,45%)",
  "hsl(210,60%,50%)",
  "hsl(210,55%,55%)",
  "hsl(142,55%,40%)",
];

function fmt(val: number) {
  if (!val || val === 0) return "N/A";
  return `$${val.toFixed(2)}/hr`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as TradeData | CountyData;
  if (!d) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[160px]">
      <p className="font-semibold text-foreground truncate">{label}</p>
      <p className="text-muted-foreground">
        Avg Range: <span className="text-foreground font-medium">{fmt(d.avgMin)} – {fmt(d.avgMax)}</span>
      </p>
      <p className="text-muted-foreground">
        Listings: <span className="text-foreground font-medium">{d.count}</span>
      </p>
    </div>
  );
}

function BlurredPreview() {
  const mockData = [
    { trade: "Electrician", avgMax: 38 },
    { trade: "HVAC", avgMax: 35 },
    { trade: "Plumbing", avgMax: 34 },
    { trade: "Welding", avgMax: 32 },
    { trade: "Construction", avgMax: 28 },
    { trade: "Carpentry", avgMax: 26 },
  ];

  return (
    <div className="relative">
      <div className="filter blur-sm pointer-events-none select-none" aria-hidden="true">
        <div className="h-48 rounded-xl bg-muted/40 p-4">
          <div className="flex gap-2 items-end h-full px-4">
            {mockData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-primary/60"
                  style={{ height: `${(d.avgMax / 38) * 120}px` }}
                />
                <span className="text-[10px] text-muted-foreground truncate w-full text-center">{d.trade}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/60 backdrop-blur-[2px]">
        <Lock className="w-7 h-7 text-primary" />
        <p className="font-semibold text-sm">Unlock Salary Insights</p>
        <p className="text-xs text-muted-foreground text-center max-w-xs px-4">
          See real pay ranges by trade and county. Know what to ask for before you walk in.
        </p>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const { user, isPro, loading } = useAuth();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<SalaryInsights>({
    queryKey: ["/api/insights/salary"],
    enabled: !!user && isPro,
  });

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-52" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-lg bg-primary/10">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">Salary Insights</h1>
          <p className="text-xs text-muted-foreground">Real pay data from active listings in SoCal</p>
        </div>
        <Badge className="ml-auto bg-primary/10 text-primary border-primary/20 text-xs" variant="outline">
          <Crown className="w-3 h-3 mr-1" />Pro
        </Badge>
      </div>

      {/* Know Your Worth banner */}
      <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Know Your Worth</p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
            Use this data to negotiate confidently. The ranges below reflect actual job listings, not surveys. Always ask for the high end.
          </p>
        </div>
      </div>

      {!user || !isPro ? (
        /* Non-pro gate */
        <div className="space-y-4">
          <BlurredPreview />
          <Card className="border-primary/30">
            <CardContent className="p-6 text-center space-y-3">
              <Crown className="w-8 h-8 text-primary mx-auto" />
              <p className="font-bold">Unlock Salary Insights with Pro</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Get average pay ranges by trade and county, updated from live job listings across LA, Orange, and San Diego counties.
              </p>
              <Button onClick={() => setLocation("/pricing")} data-testid="button-upgrade-insights">
                <Crown className="w-4 h-4 mr-2" />Upgrade to Pro — $9.99/wk
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-72" />
          <Skeleton className="h-52" />
        </div>
      ) : !data || data.overall.total === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <Info className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="font-medium">No pay data available yet</p>
            <p className="text-sm text-muted-foreground">Salary insights appear once job listings with pay ranges are ingested.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overall KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card data-testid="kpi-overall-min">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Low Range</p>
                <p className="text-2xl font-bold tabular-nums mt-1">{fmt(data.overall.avgMin)}</p>
                <p className="text-xs text-muted-foreground mt-1">Across all trades</p>
              </CardContent>
            </Card>
            <Card data-testid="kpi-overall-max">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg High Range</p>
                <p className="text-2xl font-bold tabular-nums mt-1 text-primary">{fmt(data.overall.avgMax)}</p>
                <p className="text-xs text-muted-foreground mt-1">Across all trades</p>
              </CardContent>
            </Card>
            <Card data-testid="kpi-listings-with-pay">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Listings With Pay</p>
                <p className="text-2xl font-bold tabular-nums mt-1">{data.overall.total}</p>
                <p className="text-xs text-muted-foreground mt-1">Active listings</p>
              </CardContent>
            </Card>
          </div>

          {/* Bar chart: avg pay by trade */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />Avg Pay by Trade (Hourly)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={Math.max(220, data.byTrade.length * 32)}>
                <BarChart
                  data={data.byTrade.slice(0, 15)}
                  layout="vertical"
                  margin={{ top: 4, right: 24, bottom: 4, left: 4 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `$${v}`}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="trade"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgMax" name="Avg High" radius={[0, 4, 4, 0]}>
                    {data.byTrade.slice(0, 15).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Trade table */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Pay Breakdown by Trade</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Trade</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Avg Low</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Avg High</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Listings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byTrade.map((row, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors" data-testid={`row-trade-${i}`}>
                        <td className="px-4 py-2.5 font-medium">{row.trade}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt(row.avgMin)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-primary">{fmt(row.avgMax)}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* County comparison */}
          {data.byCounty.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />Pay by County
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">County</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Avg Low</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Avg High</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Listings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byCounty.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors" data-testid={`row-county-${i}`}>
                          <td className="px-4 py-2.5 font-medium">{row.county} {row.county !== "Unknown" && "County"}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt(row.avgMin)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-primary">{fmt(row.avgMax)}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-[11px] text-muted-foreground text-center pb-2">
            Data sourced from active job listings. Updated as new listings are ingested.
          </p>
        </>
      )}
    </div>
  );
}
