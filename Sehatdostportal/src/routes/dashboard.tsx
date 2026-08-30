import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  ArrowUpRight,
  Plus,
  Activity,
  TrendingUp,
  Building2,
  Database,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

type PolicyRow = { insurer_name: string; policy_type: string };
type CheckRow = {
  id: string;
  patient_name: string | null;
  status: string;
  created_at: string;
  result: { decision?: string; policy?: { insurer_name?: string }; patient?: { procedure?: string } } | null;
};

function DashboardPage() {
  const { profile } = useAuth();
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [checks, setChecks] = useState<CheckRow[]>([]);

  const loadAll = async () => {
    const [{ data: pol }, { data: ec }] = await Promise.all([
      supabase.from("policies").select("insurer_name, policy_type"),
      supabase
        .from("eligibility_checks")
        .select("id, patient_name, status, created_at, result")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    setPolicies((pol ?? []) as PolicyRow[]);
    setChecks((ec ?? []) as CheckRow[]);
  };

  useEffect(() => {
    loadAll();
    // Refresh when the tab regains focus so upload/edit/delete reflect automatically.
    const onFocus = () => loadAll();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const totalPolicies = policies.length;
  const uniqueInsurers = useMemo(
    () => new Set(policies.map((p) => (p.insurer_name ?? "").trim()).filter(Boolean)).size,
    [policies],
  );
  const totalVerifications = checks.length;
  const eligibleCount = checks.filter((c) => (c.result?.decision ?? c.status) === "Eligible").length;
  const reviewCount = checks.filter((c) => (c.result?.decision ?? c.status) === "Review Required").length;

  const stats = [
    { label: "Total Policies", value: String(totalPolicies), change: "live", icon: ShieldCheck, accent: "from-primary to-primary-glow" },
    { label: "Unique Insurers", value: String(uniqueInsurers), change: "COUNT(DISTINCT)", icon: Building2, accent: "from-secondary to-secondary" },
    { label: "Verifications", value: String(totalVerifications), change: `${eligibleCount} eligible`, icon: CheckCircle2, accent: "from-success to-success" },
    { label: "Review Required", value: String(reviewCount), change: "needs attention", icon: Clock, accent: "from-warning to-warning" },
  ];

  // Build last-7-days trend from real verification history
  const claimsTrend = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    return days.map((d) => {
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const dayChecks = checks.filter((c) => {
        const t = new Date(c.created_at).getTime();
        return t >= d.getTime() && t < next.getTime();
      });
      return {
        d: d.toLocaleDateString(undefined, { weekday: "short" }),
        approved: dayChecks.filter((c) => (c.result?.decision ?? c.status) === "Eligible").length,
        pending: dayChecks.filter((c) => (c.result?.decision ?? c.status) === "Review Required").length,
      };
    });
  }, [checks]);

  const insurers = useMemo(() => {
    const m = new Map<string, number>();
    policies.forEach((p) => {
      const k = (p.insurer_name ?? "").trim();
      if (!k) return;
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [policies]);

  const recent = checks.slice(0, 5);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {(() => {
                const name = profile?.full_name?.trim();
                const isEmailLike = name && name.includes("@");
                return name && !isEmailLike ? `Good morning, ${name} 👋` : "Good morning 👋";
              })()}
            </h2>
            <p className="text-sm text-muted-foreground">
              SEHAT DOST AI · Simplifying Claims. Amplifying Care.
            </p>
          </div>
          <Link to="/verify">
            <Button className="bg-gradient-primary text-primary-foreground shadow-elegant transition-smooth hover:opacity-95 hover:shadow-glow">
              <Plus className="mr-2 h-4 w-4" />
              New Eligibility Verification
            </Button>
          </Link>
        </div>

        {/* Trust strip */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-gradient-card p-3 shadow-card">
          {[
            { label: "Trusted by 240+ hospitals" },
            { label: "IRDAI aligned workflows" },
            { label: "NHA compliant verification engine" },
            { label: "PM-JAY ready · 1800+ policy frameworks" },
          ].map((b) => (
            <span key={b.label} className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" /> {b.label}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="relative overflow-hidden border-border/60 bg-gradient-card p-5 shadow-card transition-smooth hover:shadow-elegant">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight">{s.value}</p>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-success">
                    <ArrowUpRight className="h-3 w-3" />
                    {s.change} this week
                  </div>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.accent} text-primary-foreground shadow-glow`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="glass border-border/60 p-5 shadow-card transition-smooth hover:shadow-elegant lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Claim Analytics</h3>
                <p className="text-xs text-muted-foreground">Approved vs pending — last 7 days</p>
              </div>
              <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                <TrendingUp className="mr-1 h-3 w-3" /> +14.6%
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={claimsTrend}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.55 0.16 240)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.55 0.16 240)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.7 0.16 165)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="oklch(0.7 0.16 165)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.012 235)" vertical={false} />
                <XAxis dataKey="d" stroke="oklch(0.5 0.03 250)" fontSize={12} />
                <YAxis stroke="oklch(0.5 0.03 250)" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 235)" }} />
                <Area type="monotone" dataKey="approved" stroke="oklch(0.45 0.16 250)" strokeWidth={2.5} fill="url(#g1)" />
                <Area type="monotone" dataKey="pending" stroke="oklch(0.7 0.16 165)" strokeWidth={2.5} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="glass border-border/60 p-5 shadow-card transition-smooth hover:shadow-elegant">
            <div className="mb-4">
              <h3 className="font-semibold">Top Insurers</h3>
              <p className="text-xs text-muted-foreground">Verifications this month</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={insurers} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.012 235)" horizontal={false} />
                <XAxis type="number" stroke="oklch(0.5 0.03 250)" fontSize={12} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="oklch(0.5 0.03 250)"
                  fontSize={11}
                  width={110}
                  tickFormatter={(val) => (val.length > 18 ? `${val.slice(0, 16)}...` : val)}
                />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 235)" }} />
                <Bar dataKey="value" fill="oklch(0.55 0.16 240)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Recent verifications */}
        <Card className="border-border/60 shadow-card">
          <div className="flex items-center justify-between p-5 pb-3">
            <div>
              <h3 className="font-semibold">Recent Verifications</h3>
              <p className="text-xs text-muted-foreground">Latest eligibility checks from your team</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5">
                <Database className="h-3 w-3" /> Live
              </Badge>
              <Link to="/history" className="text-xs font-medium text-primary hover:underline">View all →</Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Patient</th>
                  <th className="px-5 py-3 text-left font-medium">Procedure</th>
                  <th className="px-5 py-3 text-left font-medium">Insurer</th>
                  <th className="px-5 py-3 text-left font-medium">Decision</th>
                  <th className="px-5 py-3 text-left font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No verifications yet. Run a new eligibility check to populate this feed.</td></tr>
                ) : recent.map((row) => {
                  const decision = row.result?.decision ?? row.status;
                  return (
                    <tr key={row.id} className="border-b last:border-0 transition-smooth hover:bg-muted/40">
                      <td className="px-5 py-3 font-medium">{row.patient_name ?? "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{row.result?.patient?.procedure ?? "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{row.result?.policy?.insurer_name ?? "—"}</td>
                      <td className="px-5 py-3"><StatusBadge status={decision} /></td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><Activity className="h-3 w-3" />{new Date(row.created_at).toLocaleString()}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Eligible: "bg-success/10 text-success border-success/30",
    "Review Required": "bg-warning/10 text-warning-foreground border-warning/40",
    "Potentially Not Eligible": "bg-destructive/10 text-destructive border-destructive/30",
    pending: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge variant="outline" className={`${map[status] ?? "bg-muted text-muted-foreground border-border"} font-medium`}>
      {status}
    </Badge>
  );
}
