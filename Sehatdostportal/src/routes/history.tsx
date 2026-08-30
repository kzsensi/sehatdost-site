import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { History as HistoryIcon, Search, Loader2, FilePlus2, CheckCircle2, ShieldQuestion, CircleAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Verification History — SEHAT DOST AI" },
      { name: "description", content: "Audit trail of eligibility verifications performed by your team." },
    ],
  }),
  component: HistoryPage,
});

type Row = {
  id: string;
  patient_name: string | null;
  policy_id: string | null;
  status: string;
  created_at: string;
  result: {
    decision?: string;
    patient?: { age?: number; gender?: string; procedure?: string };
    policy?: { insurer_name?: string; policy_name?: string };
  } | null;
};

function decisionTone(d?: string) {
  if (d === "Eligible") return { cls: "bg-success/10 text-success border-success/30", icon: CheckCircle2 };
  if (d === "Review Required") return { cls: "bg-warning/10 text-warning-foreground border-warning/40", icon: ShieldQuestion };
  return { cls: "bg-destructive/10 text-destructive border-destructive/30", icon: CircleAlert };
}

function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [decision, setDecision] = useState("all");
  const [policy, setPolicy] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("eligibility_checks")
        .select("id, patient_name, policy_id, status, created_at, result")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) toast.error("Failed to load history", { description: error.message });
      else setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const policies = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => {
      const k = r.result?.policy?.policy_name ?? "";
      if (k) m.set(k, k);
    });
    return Array.from(m.keys()).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const cutoff = (() => {
      const d = new Date();
      if (dateRange === "today") { d.setHours(0, 0, 0, 0); return d.getTime(); }
      if (dateRange === "7d") return Date.now() - 7 * 86400000;
      if (dateRange === "30d") return Date.now() - 30 * 86400000;
      return 0;
    })();
    return rows.filter((r) => {
      if (decision !== "all" && (r.result?.decision ?? r.status) !== decision) return false;
      if (policy !== "all" && r.result?.policy?.policy_name !== policy) return false;
      if (cutoff && new Date(r.created_at).getTime() < cutoff) return false;
      if (!term) return true;
      return (
        (r.patient_name ?? "").toLowerCase().includes(term) ||
        (r.result?.patient?.procedure ?? "").toLowerCase().includes(term) ||
        (r.result?.policy?.insurer_name ?? "").toLowerCase().includes(term) ||
        (r.result?.policy?.policy_name ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, q, decision, policy, dateRange]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <HistoryIcon className="h-3.5 w-3.5" /> Audit · Verification log
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Verification History</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every eligibility check your team has performed, sourced from the live database.
            </p>
          </div>
          <Button asChild className="gap-2 bg-gradient-primary text-primary-foreground shadow-elegant">
            <Link to="/verify"><FilePlus2 className="h-4 w-4" /> New Verification</Link>
          </Button>
        </div>

        <Card className="overflow-hidden">
          <div className="grid gap-3 border-b p-4 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient, procedure, insurer…" className="h-10 pl-9" />
            </div>
            <Select value={decision} onValueChange={setDecision}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Decision" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All decisions</SelectItem>
                <SelectItem value="Eligible">Eligible</SelectItem>
                <SelectItem value="Review Required">Review Required</SelectItem>
                <SelectItem value="Potentially Not Eligible">Potentially Not Eligible</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Select value={policy} onValueChange={setPolicy}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Policy" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All policies</SelectItem>
                  {policies.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Date" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No verifications match the filters. Run a new verification to populate the log.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Age · Gender</TableHead>
                  <TableHead>Procedure</TableHead>
                  <TableHead>Policy</TableHead>
                  <TableHead>Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const d = r.result?.decision ?? r.status;
                  const tone = decisionTone(d);
                  const Icon = tone.icon;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">{r.patient_name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.result?.patient?.age ?? "—"} · {r.result?.patient?.gender ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">{r.result?.patient?.procedure ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{r.result?.policy?.insurer_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.result?.policy?.policy_name ?? ""}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${tone.cls} gap-1`}>
                          <Icon className="h-3 w-3" /> {d}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
