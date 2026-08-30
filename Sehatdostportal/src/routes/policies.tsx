import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck, Upload, Plus, Loader2, Database, Eye, FileJson, X, Pencil, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/policies")({
  head: () => ({
    meta: [
      { title: "Policy Management — SEHAT DOST AI" },
      { name: "description", content: "Admin policy library for SEHAT DOST AI — manage insurance and Ayushman policy frameworks." },
    ],
  }),
  component: PoliciesPage,
});

type Policy = {
  id: string;
  insurer_name: string;
  policy_name: string;
  uin_number: string;
  policy_type: string;
  created_at: string;
};

function typeTone(t: string) {
  const k = t.toLowerCase();
  if (k.includes("government")) return "bg-secondary/15 text-secondary border-secondary/30";
  if (k.includes("family")) return "bg-primary/10 text-primary border-primary/20";
  if (k.includes("senior")) return "bg-amber-500/10 text-amber-700 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}

function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPolicy, setDetailPolicy] = useState<Policy | null>(null);
  const [detailJson, setDetailJson] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<Policy | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletePolicy, setDeletePolicy] = useState<Policy | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPolicies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("policies")
      .select("id, insurer_name, policy_name, uin_number, policy_type, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load policies", { description: error.message });
    else setPolicies((data ?? []) as Policy[]);
    setLoading(false);
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const onSaveEdit = async () => {
    if (!editPolicy) return;
    const e = editPolicy;
    if (!e.insurer_name.trim() || !e.policy_name.trim() || !e.uin_number.trim() || !e.policy_type.trim()) {
      toast.error("All fields are required");
      return;
    }
    setSavingEdit(true);
    const { error } = await supabase
      .from("policies")
      .update({
        insurer_name: e.insurer_name.trim(),
        policy_name: e.policy_name.trim(),
        uin_number: e.uin_number.trim(),
        policy_type: e.policy_type.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", e.id);
    setSavingEdit(false);
    if (error) {
      toast.error("Failed to update policy", { description: error.message });
      return;
    }
    toast.success("Policy updated");
    setEditOpen(false);
    setEditPolicy(null);
    loadPolicies();
  };

  const onConfirmDelete = async () => {
    if (!deletePolicy) return;
    setDeleting(true);
    // Remove linked policy_data first (no FK cascade declared)
    const { error: dataErr } = await supabase
      .from("policy_data")
      .delete()
      .eq("policy_id", deletePolicy.id);
    if (dataErr) {
      setDeleting(false);
      toast.error("Failed to delete policy data", { description: dataErr.message });
      return;
    }
    const { error } = await supabase.from("policies").delete().eq("id", deletePolicy.id);
    setDeleting(false);
    if (error) {
      toast.error("Failed to delete policy", { description: error.message });
      return;
    }
    toast.success(`Deleted ${deletePolicy.policy_name}`);
    setDeletePolicy(null);
    loadPolicies();
  };


  const types = useMemo(
    () => Array.from(new Set(policies.map((p) => p.policy_type))).sort(),
    [policies],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return policies.filter((p) => {
      if (typeFilter !== "all" && p.policy_type !== typeFilter) return false;
      if (!term) return true;
      return (
        p.insurer_name.toLowerCase().includes(term) ||
        p.policy_name.toLowerCase().includes(term) ||
        p.uin_number.toLowerCase().includes(term) ||
        p.policy_type.toLowerCase().includes(term)
      );
    });
  }, [q, typeFilter, policies]);

  const openDetails = async (p: Policy) => {
    setDetailPolicy(p);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailJson(null);
    const { data, error } = await supabase
      .from("policy_data")
      .select("data")
      .eq("policy_id", p.id)
      .maybeSingle();
    if (error) {
      toast.error("Failed to load JSON", { description: error.message });
    } else {
      setDetailJson(data?.data ?? null);
    }
    setDetailLoading(false);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin · Policy Library
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Policy Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage the master library of insurance and Ayushman policy frameworks used by the SEHAT AI Engine.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/policy-upload">
                <Upload className="h-4 w-4" /> Upload Policies
              </Link>
            </Button>
            <Button asChild className="gap-2 bg-gradient-primary text-primary-foreground shadow-elegant">
              <Link to="/policy-upload">
                <Plus className="h-4 w-4" /> New Policy
              </Link>
            </Button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="p-4 glass">
            <div className="text-xs text-muted-foreground">Total policies</div>
            <div className="mt-1 text-2xl font-bold">{policies.length}</div>
          </Card>
          <Card className="p-4 glass">
            <div className="text-xs text-muted-foreground">Unique insurers</div>
            <div className="mt-1 text-2xl font-bold">
              {new Set(policies.map((p) => p.insurer_name)).size}
            </div>
          </Card>
          <Card className="p-4 glass">
            <div className="text-xs text-muted-foreground">Policy types</div>
            <div className="mt-1 text-2xl font-bold">{types.length}</div>
          </Card>
          <Card className="p-4 glass">
            <div className="text-xs text-muted-foreground">PM-JAY frameworks</div>
            <div className="mt-1 text-2xl font-bold text-secondary">
              {policies.filter((p) => p.policy_type.toLowerCase().includes("government")).length}
            </div>
          </Card>
        </div>

        {/* Search + table */}
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
              <div className="relative w-full md:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search insurer, policy, UIN, or type…"
                  className="h-10 pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setTypeFilter("all")}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    typeFilter === "all"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  All
                </button>
                {types.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      typeFilter === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Database className="h-3.5 w-3.5" />
              Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {policies.length}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading policies…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No policies match your search.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insurer</TableHead>
                  <TableHead>Policy name</TableHead>
                  <TableHead>UIN number</TableHead>
                  <TableHead>Policy type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.insurer_name}</TableCell>
                    <TableCell>{p.policy_name}</TableCell>
                    <TableCell className="font-mono text-xs">{p.uin_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={typeTone(p.policy_type)}>
                        {p.policy_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" className="gap-1" onClick={() => openDetails(p)}>
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1"
                          onClick={() => {
                            setEditPolicy({ ...p });
                            setEditOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeletePolicy(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Connected to Lovable Cloud · Live data from <code className="rounded bg-muted px-1 py-0.5">policies</code> table
        </p>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-4 w-4 text-primary" />
              {detailPolicy?.policy_name ?? "Policy details"}
            </DialogTitle>
            <DialogDescription>
              {detailPolicy && (
                <>
                  {detailPolicy.insurer_name} · UIN{" "}
                  <span className="font-mono">{detailPolicy.uin_number}</span> ·{" "}
                  {detailPolicy.policy_type}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30">
            {detailLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading JSON…
              </div>
            ) : detailJson ? (
              <ScrollArea className="h-[60vh]">
                <pre className="overflow-x-auto p-4 text-[11px] leading-relaxed">
                  {JSON.stringify(detailJson, null, 2)}
                </pre>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <X className="h-4 w-4" /> No stored JSON for this policy.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditPolicy(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" /> Edit Policy
            </DialogTitle>
            <DialogDescription>Update the policy metadata. The stored JSON framework remains unchanged.</DialogDescription>
          </DialogHeader>
          {editPolicy && (
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Insurer Name</Label>
                <Input value={editPolicy.insurer_name} onChange={(e) => setEditPolicy({ ...editPolicy, insurer_name: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Policy Name</Label>
                <Input value={editPolicy.policy_name} onChange={(e) => setEditPolicy({ ...editPolicy, policy_name: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">UIN Number</Label>
                <Input className="font-mono" value={editPolicy.uin_number} onChange={(e) => setEditPolicy({ ...editPolicy, uin_number: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Policy Type</Label>
                <Input value={editPolicy.policy_type} onChange={(e) => setEditPolicy({ ...editPolicy, policy_type: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditPolicy(null); }}>Cancel</Button>
            <Button onClick={onSaveEdit} disabled={savingEdit} className="bg-gradient-primary text-primary-foreground">
              {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletePolicy} onOpenChange={(o) => !o && setDeletePolicy(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this policy?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deletePolicy?.policy_name}</strong> ({deletePolicy?.insurer_name}) and its stored policy JSON. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); onConfirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete policy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
