import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Upload, Search, Pencil, Trash2, Plus, Loader2, HeartPulse, Activity,
  CheckCircle2, Download, X, AlertTriangle,
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
import type { DiseaseMaster } from "@/lib/disease-match";

export const Route = createFileRoute("/diseases")({
  head: () => ({
    meta: [
      { title: "Disease Management — SEHAT DOST AI" },
      { name: "description", content: "Disease Master: standardized disease catalogue for insurance eligibility matching." },
    ],
  }),
  component: DiseasesPage,
});

type FormState = {
  disease_code: string;
  disease_name: string;
  short_name: string;
  specialty: string;
  category: string;
  synonyms: string;
  keywords: string;
  icd10_code: string;
  chronic_flag: boolean;
  critical_illness_flag: boolean;
  status: string;
};

const emptyForm: FormState = {
  disease_code: "",
  disease_name: "",
  short_name: "",
  specialty: "",
  category: "",
  synonyms: "",
  keywords: "",
  icd10_code: "",
  chronic_flag: false,
  critical_illness_flag: false,
  status: "active",
};

function splitList(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  return String(v).split(/[,;|\n]/).map((s) => s.trim()).filter(Boolean);
}
function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  return ["true", "yes", "y", "1"].includes(String(v ?? "").trim().toLowerCase());
}

function DiseasesPage() {
  const [rows, setRows] = useState<DiseaseMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [category, setCategory] = useState("all");
  const [chronicFilter, setChronicFilter] = useState("all");
  const [criticalFilter, setCriticalFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const [selection, setSelection] = useState<Set<string>>(new Set());

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<DiseaseMaster | null>(null);
  const [bulkDelOpen, setBulkDelOpen] = useState(false);

  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as unknown as {
      from: (t: string) => { select: (c: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: DiseaseMaster[] | null; error: { message: string } | null }> } };
    }).from("disease_master").select("*").order("disease_name", { ascending: true });
    if (error) toast.error("Failed to load diseases", { description: error.message });
    else setRows((data ?? []) as DiseaseMaster[]);
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
      if (chronicFilter === "yes" && !r.chronic_flag) return false;
      if (chronicFilter === "no" && r.chronic_flag) return false;
      if (criticalFilter === "yes" && !r.critical_illness_flag) return false;
      if (criticalFilter === "no" && r.critical_illness_flag) return false;
      if (!term) return true;
      const hay = [r.disease_code, r.disease_name, r.short_name ?? "", r.icd10_code ?? "", r.specialty ?? "", r.category ?? "", ...(r.synonyms ?? []), ...(r.keywords ?? [])].join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [rows, q, specialty, category, status, chronicFilter, criticalFilter]);

  const totalActive = rows.filter((r) => r.status === "active").length;
  const totalChronic = rows.filter((r) => r.chronic_flag).length;
  const totalCritical = rows.filter((r) => r.critical_illness_flag).length;

  const openNew = () => { setEditId(null); setForm(emptyForm); setEditOpen(true); };
  const openEdit = (r: DiseaseMaster) => {
    setEditId(r.id);
    setForm({
      disease_code: r.disease_code,
      disease_name: r.disease_name,
      short_name: r.short_name ?? "",
      specialty: r.specialty ?? "",
      category: r.category ?? "",
      synonyms: (r.synonyms ?? []).join(", "),
      keywords: (r.keywords ?? []).join(", "),
      icd10_code: r.icd10_code ?? "",
      chronic_flag: !!r.chronic_flag,
      critical_illness_flag: !!r.critical_illness_flag,
      status: r.status,
    });
    setEditOpen(true);
  };

  type Sb = { from: (t: string) => {
    update: (p: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
    insert: (p: Record<string, unknown> | Array<Record<string, unknown>>) => Promise<{ error: { message: string } | null }>;
    upsert: (p: Array<Record<string, unknown>>, o: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
    delete: () => {
      eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
      in: (c: string, v: string[]) => Promise<{ error: { message: string } | null }>;
    };
  } };
  const sb = supabase as unknown as Sb;

  const saveForm = async () => {
    if (!form.disease_code.trim() || !form.disease_name.trim()) {
      toast.error("Disease code and name are required");
      return;
    }
    setSaving(true);
    const payload = {
      disease_code: form.disease_code.trim(),
      disease_name: form.disease_name.trim(),
      short_name: form.short_name.trim() || null,
      specialty: form.specialty.trim() || null,
      category: form.category.trim() || null,
      synonyms: splitList(form.synonyms),
      keywords: splitList(form.keywords),
      icd10_code: form.icd10_code.trim() || null,
      chronic_flag: form.chronic_flag,
      critical_illness_flag: form.critical_illness_flag,
      status: form.status || "active",
      updated_at: new Date().toISOString(),
    };
    const res = editId
      ? await sb.from("disease_master").update(payload).eq("id", editId)
      : await sb.from("disease_master").insert(payload);
    setSaving(false);
    if (res.error) { toast.error("Save failed", { description: res.error.message }); return; }
    toast.success(editId ? "Disease updated" : "Disease added");
    setEditOpen(false);
    fetchAll();
  };

  const doDelete = async () => {
    if (!delTarget) return;
    const { error } = await sb.from("disease_master").delete().eq("id", delTarget.id);
    if (error) toast.error("Delete failed", { description: error.message });
    else { toast.success("Disease deleted"); fetchAll(); }
    setDelOpen(false); setDelTarget(null);
  };

  const doBulkDelete = async () => {
    const ids = Array.from(selection);
    if (ids.length === 0) return;
    const { error } = await sb.from("disease_master").delete().in("id", ids);
    if (error) toast.error("Bulk delete failed", { description: error.message });
    else { toast.success(`Deleted ${ids.length} disease(s)`); setSelection(new Set()); fetchAll(); }
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
      const records = json.map((r) => {
        const code = String(lookup(r, "disease_code", "code") ?? "").trim();
        const name = String(lookup(r, "disease_name", "name") ?? "").trim();
        if (!code || !name) return null;
        return {
          disease_code: code,
          disease_name: name,
          short_name: String(lookup(r, "short_name") ?? "").trim() || null,
          specialty: String(lookup(r, "specialty") ?? "").trim() || null,
          category: String(lookup(r, "category") ?? "").trim() || null,
          synonyms: splitList(lookup(r, "synonyms")),
          keywords: splitList(lookup(r, "keywords")),
          icd10_code: String(lookup(r, "icd10_code", "icd10", "icd_10") ?? "").trim() || null,
          chronic_flag: toBool(lookup(r, "chronic_flag", "chronic")),
          critical_illness_flag: toBool(lookup(r, "critical_illness_flag", "critical_illness", "critical")),
          status: (String(lookup(r, "status") ?? "active").trim() || "active").toLowerCase(),
        };
      }).filter(Boolean) as Array<Record<string, unknown>>;

      if (records.length === 0) {
        toast.error("No valid rows found", { description: "Need at least disease_code and disease_name columns." });
        return;
      }
      const { error } = await sb.from("disease_master").upsert(records, { onConflict: "disease_code" });
      if (error) toast.error("Upload failed", { description: error.message });
      else { toast.success(`Imported ${records.length} disease(s)`); fetchAll(); }
    } catch (err) {
      toast.error("Could not parse file", { description: err instanceof Error ? err.message : "" });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      disease_code: "DIAB-001",
      disease_name: "Type 2 Diabetes Mellitus",
      short_name: "T2DM",
      specialty: "Endocrinology",
      category: "Metabolic",
      synonyms: "Type 2 Diabetes; NIDDM; Adult-onset Diabetes",
      keywords: "diabetes; sugar; hyperglycemia",
      icd10_code: "E11",
      chronic_flag: "yes",
      critical_illness_flag: "no",
      status: "active",
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "diseases");
    XLSX.writeFile(wb, "SEHAT_DOST_AI_Disease_Master_Template.xlsx");
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
              <HeartPulse className="h-3.5 w-3.5" /> Admin · Disease Master
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Disease Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">Standardized disease catalogue powering insurance eligibility matching.</p>
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
              <Plus className="h-4 w-4" /> New Disease
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 md:grid-cols-4">
          <Card className="p-4 glass">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total diseases</div>
                <div className="mt-1 text-3xl font-bold">{rows.length}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">Architecture supports 20,000+ diseases</div>
              </div>
              <Activity className="h-8 w-8 text-primary/60" />
            </div>
          </Card>
          <Card className="p-4 glass">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Active diseases</div>
                <div className="mt-1 text-3xl font-bold">{totalActive}</div>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success/70" />
            </div>
          </Card>
          <Card className="p-4 glass">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Chronic diseases</div>
                <div className="mt-1 text-3xl font-bold">{totalChronic}</div>
              </div>
              <HeartPulse className="h-8 w-8 text-warning/70" />
            </div>
          </Card>
          <Card className="p-4 glass">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Critical illness</div>
                <div className="mt-1 text-3xl font-bold">{totalCritical}</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive/70" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="overflow-hidden">
          <div className="grid gap-3 border-b p-4 md:grid-cols-6">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, code, ICD-10, synonym, keyword…" className="h-10 pl-9" />
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
            <Select value={chronicFilter} onValueChange={setChronicFilter}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Chronic" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Chronic: any</SelectItem>
                <SelectItem value="yes">Chronic only</SelectItem>
                <SelectItem value="no">Non-chronic only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={criticalFilter} onValueChange={setCriticalFilter}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Critical" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Critical: any</SelectItem>
                <SelectItem value="yes">Critical illness only</SelectItem>
                <SelectItem value="no">Non-critical only</SelectItem>
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
              <Loader2 className="h-4 w-4 animate-spin" /> Loading diseases…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No diseases match. Upload a master file or add one manually.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox checked={selection.size > 0 && selection.size === filtered.length} onCheckedChange={(c) => toggleAll(!!c)} />
                  </TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Disease</TableHead>
                  <TableHead>ICD-10</TableHead>
                  <TableHead>Specialty</TableHead>
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
                    <TableCell className="font-mono text-xs">{r.disease_code}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.disease_name}</div>
                      {r.short_name && <div className="text-xs text-muted-foreground">{r.short_name}</div>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.icd10_code ?? "—"}</TableCell>
                    <TableCell className="text-sm">{r.specialty ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-wrap gap-1">
                        {r.chronic_flag && <Badge variant="outline" className="border-warning/40 bg-warning/5 text-warning-foreground">Chronic</Badge>}
                        {r.critical_illness_flag && <Badge variant="outline" className="border-destructive/40 bg-destructive/5 text-destructive">Critical</Badge>}
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit disease" : "New disease"}</DialogTitle>
            <DialogDescription>Synonyms, keywords and ICD-10 improve eligibility matching across policy frameworks.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Fld label="Disease code *"><Input value={form.disease_code} onChange={(e) => setForm({ ...form, disease_code: e.target.value })} /></Fld>
            <Fld label="ICD-10 code"><Input value={form.icd10_code} onChange={(e) => setForm({ ...form, icd10_code: e.target.value })} placeholder="e.g. E11" /></Fld>
            <Fld label="Disease name *" wide><Input value={form.disease_name} onChange={(e) => setForm({ ...form, disease_name: e.target.value })} /></Fld>
            <Fld label="Short name"><Input value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} placeholder="e.g. T2DM" /></Fld>
            <Fld label="Specialty"><Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></Fld>
            <Fld label="Category" wide><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Fld>
            <Fld label="Synonyms (comma-separated)" wide>
              <Textarea rows={2} value={form.synonyms} onChange={(e) => setForm({ ...form, synonyms: e.target.value })} placeholder="Type 2 Diabetes, NIDDM" />
            </Fld>
            <Fld label="Keywords (comma-separated)" wide>
              <Textarea rows={2} value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="diabetes, sugar, hyperglycemia" />
            </Fld>
            <div className="flex items-center gap-2">
              <Checkbox id="chronic" checked={form.chronic_flag} onCheckedChange={(c) => setForm({ ...form, chronic_flag: !!c })} />
              <Label htmlFor="chronic">Chronic disease</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="critical" checked={form.critical_illness_flag} onCheckedChange={(c) => setForm({ ...form, critical_illness_flag: !!c })} />
              <Label htmlFor="critical">Critical illness</Label>
            </div>
            <Fld label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Fld>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveForm} disabled={saving} className="bg-gradient-primary text-primary-foreground">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editId ? "Save changes" : "Add disease"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete disease?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{delTarget?.disease_name}</strong> ({delTarget?.disease_code}) will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDelOpen} onOpenChange={setBulkDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selection.size} diseases?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete all</AlertDialogAction>
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
