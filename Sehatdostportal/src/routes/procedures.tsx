import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Upload, Search, Pencil, Trash2, Plus, Loader2, Stethoscope, Activity,
  CheckCircle2, AlertCircle, Download, X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ProcedureMaster } from "@/lib/procedure-match";

export const Route = createFileRoute("/procedures")({
  head: () => ({
    meta: [
      { title: "Procedure Management — SEHAT DOST AI" },
      { name: "description", content: "Procedure Master: standardize procedures used in insurance eligibility verification." },
    ],
  }),
  component: ProceduresPage,
});

type FormState = {
  procedure_code: string;
  procedure_name: string;
  short_name: string;
  specialty: string;
  category: string;
  synonyms: string;
  keywords: string;
  inpatient_required: boolean;
  daycare_possible: boolean;
  status: string;
};

const emptyForm: FormState = {
  procedure_code: "",
  procedure_name: "",
  short_name: "",
  specialty: "",
  category: "",
  synonyms: "",
  keywords: "",
  inpatient_required: false,
  daycare_possible: false,
  status: "active",
};

function splitList(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  return String(v).split(/[,;|\n]/).map((s) => s.trim()).filter(Boolean);
}

function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return ["true", "yes", "y", "1"].includes(s);
}

function ProceduresPage() {
  const [rows, setRows] = useState<ProcedureMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [selection, setSelection] = useState<Set<string>>(new Set());

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<ProcedureMaster | null>(null);
  const [bulkDelOpen, setBulkDelOpen] = useState(false);

  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("procedure_master")
      .select("*")
      .order("procedure_name", { ascending: true });
    if (error) toast.error("Failed to load procedures", { description: error.message });
    else setRows((data ?? []) as ProcedureMaster[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const specialties = useMemo(() => Array.from(new Set(rows.map((r) => r.specialty).filter(Boolean) as string[])).sort(), [rows]);
  const categories = useMemo(() => Array.from(new Set(rows.map((r) => r.category).filter(Boolean) as string[])).sort(), [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (specialty !== "all" && r.specialty !== specialty) return false;
      if (category !== "all" && r.category !== category) return false;
      if (status !== "all" && r.status !== status) return false;
      if (!term) return true;
      const hay = [r.procedure_code, r.procedure_name, r.short_name ?? "", r.specialty ?? "", r.category ?? "", ...(r.synonyms ?? []), ...(r.keywords ?? [])].join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [rows, q, specialty, category, status]);

  const totalActive = rows.filter((r) => r.status === "active").length;
  const bySpecialty = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => r.specialty && m.set(r.specialty, (m.get(r.specialty) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [rows]);

  const openNew = () => { setEditId(null); setForm(emptyForm); setEditOpen(true); };
  const openEdit = (r: ProcedureMaster) => {
    setEditId(r.id);
    setForm({
      procedure_code: r.procedure_code,
      procedure_name: r.procedure_name,
      short_name: r.short_name ?? "",
      specialty: r.specialty ?? "",
      category: r.category ?? "",
      synonyms: (r.synonyms ?? []).join(", "),
      keywords: (r.keywords ?? []).join(", "),
      inpatient_required: !!r.inpatient_required,
      daycare_possible: !!r.daycare_possible,
      status: r.status,
    });
    setEditOpen(true);
  };

  const saveForm = async () => {
    if (!form.procedure_code.trim() || !form.procedure_name.trim()) {
      toast.error("Procedure code and name are required");
      return;
    }
    setSaving(true);
    const payload = {
      procedure_code: form.procedure_code.trim(),
      procedure_name: form.procedure_name.trim(),
      short_name: form.short_name.trim() || null,
      specialty: form.specialty.trim() || null,
      category: form.category.trim() || null,
      synonyms: splitList(form.synonyms),
      keywords: splitList(form.keywords),
      inpatient_required: form.inpatient_required,
      daycare_possible: form.daycare_possible,
      status: form.status || "active",
      updated_at: new Date().toISOString(),
    };
    const res = editId
      ? await supabase.from("procedure_master").update(payload).eq("id", editId)
      : await supabase.from("procedure_master").insert(payload);
    setSaving(false);
    if (res.error) {
      toast.error("Save failed", { description: res.error.message });
      return;
    }
    toast.success(editId ? "Procedure updated" : "Procedure added");
    setEditOpen(false);
    fetchAll();
  };

  const doDelete = async () => {
    if (!delTarget) return;
    const { error } = await supabase.from("procedure_master").delete().eq("id", delTarget.id);
    if (error) toast.error("Delete failed", { description: error.message });
    else { toast.success("Procedure deleted"); fetchAll(); }
    setDelOpen(false); setDelTarget(null);
  };

  const doBulkDelete = async () => {
    const ids = Array.from(selection);
    if (ids.length === 0) return;
    const { error } = await supabase.from("procedure_master").delete().in("id", ids);
    if (error) toast.error("Bulk delete failed", { description: error.message });
    else { toast.success(`Deleted ${ids.length} procedure(s)`); setSelection(new Set()); fetchAll(); }
    setBulkDelOpen(false);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      const lookup = (row: Record<string, unknown>, ...keys: string[]) => {
        const map: Record<string, unknown> = {};
        Object.keys(row).forEach((k) => (map[k.toLowerCase().replace(/[^a-z0-9]/g, "_")] = row[k]));
        for (const k of keys) {
          const v = map[k.toLowerCase().replace(/[^a-z0-9]/g, "_")];
          if (v !== undefined && v !== "") return v;
        }
        return undefined;
      };

      const records = json
        .map((r) => {
          const code = String(lookup(r, "procedure_code", "code") ?? "").trim();
          const name = String(lookup(r, "procedure_name", "name") ?? "").trim();
          if (!code || !name) return null;
          return {
            procedure_code: code,
            procedure_name: name,
            short_name: String(lookup(r, "short_name") ?? "").trim() || null,
            specialty: String(lookup(r, "specialty") ?? "").trim() || null,
            category: String(lookup(r, "category") ?? "").trim() || null,
            synonyms: splitList(lookup(r, "synonyms")),
            keywords: splitList(lookup(r, "keywords")),
            inpatient_required: toBool(lookup(r, "inpatient_required", "inpatient")),
            daycare_possible: toBool(lookup(r, "daycare_possible", "daycare")),
            status: (String(lookup(r, "status") ?? "active").trim() || "active").toLowerCase(),
          };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;

      if (records.length === 0) {
        toast.error("No valid rows found", { description: "Need at least procedure_code and procedure_name columns." });
        return;
      }
      const typed = records as unknown as Array<{ procedure_code: string; procedure_name: string }>;
      const { error } = await supabase.from("procedure_master").upsert(typed, { onConflict: "procedure_code" });
      if (error) toast.error("Upload failed", { description: error.message });
      else { toast.success(`Imported ${records.length} procedure(s)`); fetchAll(); }
    } catch (err) {
      toast.error("Could not parse file", { description: err instanceof Error ? err.message : "" });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      procedure_code: "CABG-001",
      procedure_name: "Coronary Artery Bypass Graft",
      short_name: "CABG",
      specialty: "Cardiology",
      category: "Cardiac Surgery",
      synonyms: "Heart Bypass; Bypass Surgery; CABG",
      keywords: "bypass; coronary; cardiac",
      inpatient_required: "yes",
      daycare_possible: "no",
      status: "active",
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "procedures");
    XLSX.writeFile(wb, "SEHAT_DOST_AI_Procedure_Master_Template.xlsx");
  };

  const toggleAll = (checked: boolean) => {
    setSelection(checked ? new Set(filtered.map((r) => r.id)) : new Set());
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Stethoscope className="h-3.5 w-3.5" /> Admin · Procedure Master
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Procedure Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">Standardized procedure catalogue powering insurance eligibility matching.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={downloadTemplate}>
              <Download className="h-4 w-4" /> Template
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload Excel/CSV
            </Button>
            <input
              ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.currentTarget.value = ""; }}
            />
            <Button className="gap-2 bg-gradient-primary text-primary-foreground shadow-elegant" onClick={openNew}>
              <Plus className="h-4 w-4" /> New Procedure
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="p-4 glass">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total procedures</div>
                <div className="mt-1 text-3xl font-bold">{rows.length}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">Architecture supports 5,000+ procedures</div>
              </div>
              <Activity className="h-8 w-8 text-primary/60" />
            </div>
          </Card>
          <Card className="p-4 glass">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Active procedures</div>
                <div className="mt-1 text-3xl font-bold">{totalActive}</div>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success/70" />
            </div>
          </Card>
          <Card className="p-4 glass">
            <div className="mb-2 text-xs text-muted-foreground">By specialty</div>
            {bySpecialty.length === 0 ? (
              <div className="py-2 text-xs text-muted-foreground">No data yet.</div>
            ) : (
              <ul className="space-y-1">
                {bySpecialty.map(([n, c]) => (
                  <li key={n} className="flex items-center justify-between text-sm">
                    <span className="truncate">{n}</span>
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">{c}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Filters */}
        <Card className="overflow-hidden">
          <div className="grid gap-3 border-b p-4 md:grid-cols-5">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, code, synonym, keyword…" className="h-10 pl-9" />
            </div>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Specialty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All specialties</SelectItem>
                {specialties.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selection.size > 0 && (
            <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2 text-sm">
              <div>{selection.size} selected</div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelection(new Set())}><X className="mr-1 h-3 w-3" /> Clear</Button>
                <Button variant="destructive" size="sm" onClick={() => setBulkDelOpen(true)}><Trash2 className="mr-1 h-3 w-3" /> Bulk delete</Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading procedures…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No procedures match. Upload a master file or add one manually.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox checked={selection.size > 0 && selection.size === filtered.length} onCheckedChange={(c) => toggleAll(!!c)} />
                  </TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Procedure</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox
                        checked={selection.has(r.id)}
                        onCheckedChange={(c) => {
                          const next = new Set(selection);
                          if (c) next.add(r.id); else next.delete(r.id);
                          setSelection(next);
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.procedure_code}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.procedure_name}</div>
                      {r.short_name && <div className="text-xs text-muted-foreground">{r.short_name}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{r.specialty ?? "—"}</TableCell>
                    <TableCell className="text-sm">{r.category ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-wrap gap-1">
                        {r.inpatient_required && <Badge variant="outline" className="border-warning/40 bg-warning/5 text-warning-foreground">IPD</Badge>}
                        {r.daycare_possible && <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">Daycare</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={r.status === "active" ? "border-success/30 bg-success/5 text-success" : "border-muted bg-muted/30 text-muted-foreground"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { setDelTarget(r); setDelOpen(true); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit procedure" : "New procedure"}</DialogTitle>
            <DialogDescription>Synonyms and keywords improve eligibility matching across policy frameworks.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Fld label="Procedure code *"><Input value={form.procedure_code} onChange={(e) => setForm({ ...form, procedure_code: e.target.value })} /></Fld>
            <Fld label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Fld>
            <Fld label="Procedure name *" wide><Input value={form.procedure_name} onChange={(e) => setForm({ ...form, procedure_name: e.target.value })} /></Fld>
            <Fld label="Short name"><Input value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} placeholder="e.g. CABG" /></Fld>
            <Fld label="Specialty"><Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></Fld>
            <Fld label="Category" wide><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Fld>
            <Fld label="Synonyms (comma-separated)" wide>
              <Textarea rows={2} value={form.synonyms} onChange={(e) => setForm({ ...form, synonyms: e.target.value })} placeholder="Heart Bypass, Bypass Surgery" />
            </Fld>
            <Fld label="Keywords (comma-separated)" wide>
              <Textarea rows={2} value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="bypass, coronary, cardiac" />
            </Fld>
            <div className="flex items-center gap-2">
              <Checkbox id="ipd" checked={form.inpatient_required} onCheckedChange={(c) => setForm({ ...form, inpatient_required: !!c })} />
              <Label htmlFor="ipd">Inpatient required</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="dc" checked={form.daycare_possible} onCheckedChange={(c) => setForm({ ...form, daycare_possible: !!c })} />
              <Label htmlFor="dc">Daycare possible</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveForm} disabled={saving} className="bg-gradient-primary text-primary-foreground">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editId ? "Save changes" : "Add procedure"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete procedure?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{delTarget?.procedure_name}</strong> ({delTarget?.procedure_code}) will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDelOpen} onOpenChange={setBulkDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selection.size} procedures?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function Fld({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
