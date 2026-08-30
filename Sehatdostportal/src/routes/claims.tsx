import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Download, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/claims")({
  component: ClaimsPage,
  head: () => ({
    meta: [
      { title: "Claims Tracker | SehatDost AI" },
      {
        name: "description",
        content:
          "Track every hospital insurance claim raised from eligibility verification — status, insurer, claimed and approved amounts.",
      },
      { property: "og:title", content: "Claims Tracker | SehatDost AI" },
      {
        property: "og:description",
        content: "Live claim lifecycle tracking for empanelled hospitals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const STATUSES = [
  "Submitted",
  "Under Review",
  "Query Raised",
  "Additional Docs",
  "Approved",
  "Partially Approved",
  "Rejected",
  "Payment Released",
] as const;

type ClaimRow = {
  id: string;
  claim_number: string;
  patient_name: string;
  procedure_name: string | null;
  claimed_amount: number | null;
  approved_amount: number | null;
  status: string;
  submitted_at: string;
  policies: { insurer_name: string } | null;
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

const inr = (val: number | null) =>
  val === null || val === undefined
    ? "—"
    : `₹${Number(val).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function ClaimsPage() {
  const [tab, setTab] = useState<string>("All");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("claims")
        .select(
          "id, claim_number, patient_name, procedure_name, claimed_amount, approved_amount, status, submitted_at, policies(insurer_name)",
        )
        .order("submitted_at", { ascending: false });
      setLoading(false);
      if (error) {
        toast.error("Failed to load claims", { description: error.message });
        return;
      }
      setRows((data ?? []) as unknown as ClaimRow[]);
    })();
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: rows.length };
    for (const s of STATUSES) map[s] = 0;
    for (const r of rows) map[r.status] = (map[r.status] ?? 0) + 1;
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (c) =>
        (tab === "All" || c.status === tab) &&
        (!needle ||
          c.claim_number.toLowerCase().includes(needle) ||
          (c.patient_name ?? "").toLowerCase().includes(needle)),
    );
  }, [rows, tab, q]);

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.info("Nothing to export");
      return;
    }
    const head = [
      "Claim ID",
      "Patient",
      "Procedure",
      "Insurer",
      "Claimed",
      "Approved",
      "Status",
      "Submitted",
    ];
    const esc = (val: unknown) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const csv = [
      head.join(","),
      ...filtered.map((c) =>
        [
          c.claim_number,
          c.patient_name,
          c.procedure_name ?? "",
          c.policies?.insurer_name ?? "",
          c.claimed_amount ?? "",
          c.approved_amount ?? "",
          c.status,
          new Date(c.submitted_at).toISOString(),
        ]
          .map(esc)
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `claims-${tab.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} claim${filtered.length === 1 ? "" : "s"}`);
  };

  const tabs = ["All", ...STATUSES];

  return (
    <AppShell>
      <Card className="border-border/60 shadow-card">
        <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">All Claims</h1>
            <p className="text-sm text-muted-foreground">Track and manage submitted claims.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-smooth ${tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
              >
                {t}
                <span
                  className={`rounded-full px-1.5 text-[11px] font-semibold ${tab === t ? "bg-primary-foreground/20" : "bg-muted"}`}
                >
                  {counts[t] ?? 0}
                </span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search patient or claim ID..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Claim ID</th>
                <th className="px-5 py-3 text-left font-medium">Patient</th>
                <th className="px-5 py-3 text-left font-medium">Procedure</th>
                <th className="px-5 py-3 text-left font-medium">Insurer</th>
                <th className="px-5 py-3 text-left font-medium">Claimed</th>
                <th className="px-5 py-3 text-left font-medium">Approved</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => {
                    window.location.href = `/claims/${c.id}`;
                  }}
                  className="cursor-pointer border-b last:border-0 transition-smooth hover:bg-muted/40"
                >
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{c.claim_number}</td>
                  <td className="px-5 py-3 font-medium">{c.patient_name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{c.procedure_name ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{c.policies?.insurer_name ?? "—"}</td>
                  <td className="px-5 py-3 font-semibold">{inr(c.claimed_amount)}</td>
                  <td className="px-5 py-3 font-semibold">{inr(c.approved_amount)}</td>
                  <td className="px-5 py-3">
                    <Status status={c.status} />
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{relativeTime(c.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading claims...
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No claims yet. Run an eligibility verification to raise one.
            </div>
          )}
        </div>
      </Card>
    </AppShell>
  );
}

function Status({ status }: { status: string }) {
  const map: Record<string, string> = {
    Submitted: "border-primary/30 bg-primary/10 text-primary",
    "Under Review": "border-primary/30 bg-primary/10 text-primary",
    "Query Raised": "border-warning/30 bg-warning/10 text-warning-foreground",
    "Additional Docs": "border-warning/30 bg-warning/10 text-warning-foreground",
    Approved: "border-success/30 bg-success/10 text-success",
    "Partially Approved": "border-success/30 bg-success/10 text-success",
    Rejected: "border-destructive/30 bg-destructive/10 text-destructive",
    "Payment Released": "border-success/30 bg-success/10 text-success",
  };
  return (
    <Badge variant="outline" className={`${map[status] ?? "border-border bg-muted text-muted-foreground"} font-medium`}>
      {status}
    </Badge>
  );
}
