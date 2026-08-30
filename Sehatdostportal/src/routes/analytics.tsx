import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, TrendingDown, Clock, IndianRupee, Percent } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

const monthly = [
  { m: "Jan", approved: 410, denied: 32 },
  { m: "Feb", approved: 462, denied: 28 },
  { m: "Mar", approved: 528, denied: 41 },
  { m: "Apr", approved: 601, denied: 35 },
  { m: "May", approved: 678, denied: 30 },
  { m: "Jun", approved: 742, denied: 24 },
  { m: "Jul", approved: 812, denied: 22 },
  { m: "Aug", approved: 894, denied: 19 },
];

const insurerSplit = [
  { name: "Ayushman", value: 38, color: "oklch(0.45 0.16 250)" },
  { name: "Star", value: 22, color: "oklch(0.65 0.14 180)" },
  { name: "HDFC Ergo", value: 16, color: "oklch(0.7 0.16 155)" },
  { name: "ICICI", value: 14, color: "oklch(0.78 0.16 75)" },
  { name: "Others", value: 10, color: "oklch(0.6 0.2 320)" },
];

const tat = [
  { m: "Jan", hrs: 18 }, { m: "Feb", hrs: 16 }, { m: "Mar", hrs: 14 },
  { m: "Apr", hrs: 12 }, { m: "May", hrs: 10 }, { m: "Jun", hrs: 8 },
  { m: "Jul", hrs: 7 }, { m: "Aug", hrs: 6.4 },
];

const kpis = [
  { label: "Approval Rate", value: "97.6%", change: "+2.1 pts", up: true, icon: Percent },
  { label: "Revenue Saved", value: "₹3.2 Cr", change: "+₹48L MoM", up: true, icon: IndianRupee },
  { label: "Avg. Processing Time", value: "6.4 hrs", change: "-32%", up: true, icon: Clock },
  { label: "Claim Denials", value: "2.4%", change: "-0.9 pts", up: true, icon: TrendingDown },
];

function AnalyticsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label} className="border-border/60 bg-gradient-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <k.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight">{k.value}</div>
              <Badge variant="outline" className={`mt-3 ${k.up ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
                <TrendingUp className="mr-1 h-3 w-3" /> {k.change}
              </Badge>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border/60 p-5 shadow-card lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Claim Approval Trends</h3>
                <p className="text-xs text-muted-foreground">Monthly approved vs. denied claims</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.012 235)" vertical={false} />
                <XAxis dataKey="m" stroke="oklch(0.5 0.03 250)" fontSize={12} />
                <YAxis stroke="oklch(0.5 0.03 250)" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 235)" }} />
                <Bar dataKey="approved" fill="oklch(0.45 0.16 250)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="denied" fill="oklch(0.78 0.16 75)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="border-border/60 p-5 shadow-card">
            <div className="mb-4">
              <h3 className="font-semibold">Insurance-wise Split</h3>
              <p className="text-xs text-muted-foreground">Share of total verifications</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={insurerSplit} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {insurerSplit.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 235)" }} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="mt-3 space-y-1.5 text-sm">
              {insurerSplit.map((s) => (
                <li key={s.name} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    {s.name}
                  </span>
                  <span className="font-semibold">{s.value}%</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="border-border/60 p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Processing Time Reduction</h3>
              <p className="text-xs text-muted-foreground">Average hours from submission to approval</p>
            </div>
            <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
              <TrendingDown className="mr-1 h-3 w-3" /> 64% faster YoY
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={tat}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.012 235)" vertical={false} />
              <XAxis dataKey="m" stroke="oklch(0.5 0.03 250)" fontSize={12} />
              <YAxis stroke="oklch(0.5 0.03 250)" fontSize={12} unit="h" />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 235)" }} />
              <Line
                type="monotone"
                dataKey="hrs"
                stroke="oklch(0.7 0.16 165)"
                strokeWidth={3}
                dot={{ r: 5, fill: "oklch(0.7 0.16 165)" }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </AppShell>
  );
}
