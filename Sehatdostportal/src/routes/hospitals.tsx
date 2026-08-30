import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Loader2, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/hospitals")({ component: () => <AppShell requireRole="super_admin"><HospitalsPage /></AppShell> });

type Hospital = {
  id: string; hospital_code: string; hospital_name: string;
  hospital_type: string | null; city: string | null; state: string | null; status: string;
};

function HospitalsPage() {
  const [rows, setRows] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ hospital_code: "", hospital_name: "", hospital_type: "", city: "", state: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("hospitals").select("*").order("hospital_name");
    setLoading(false);
    if (error) return toast.error("Failed to load hospitals", { description: error.message });
    setRows((data ?? []) as Hospital[]);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!/^[A-Z0-9_]{2,64}$/.test(form.hospital_code)) return toast.error("hospital_code must be uppercase letters, digits or underscore (e.g. APOLLO_MUMBAI)");
    if (!form.hospital_name.trim()) return toast.error("Hospital name is required");
    const { error } = await supabase.from("hospitals").insert({ ...form, hospital_type: form.hospital_type || null, city: form.city || null, state: form.state || null });
    if (error) return toast.error("Create failed", { description: error.message });
    toast.success("Hospital created");
    setOpen(false); setForm({ hospital_code: "", hospital_name: "", hospital_type: "", city: "", state: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete hospital? This will remove all configuration and unlink users.")) return;
    const { error } = await supabase.from("hospitals").delete().eq("id", id);
    if (error) return toast.error("Delete failed", { description: error.message });
    toast.success("Deleted"); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Building2 className="h-3.5 w-3.5" /> Super admin · Hospital directory
          </div>
          <h1 className="font-display text-3xl font-bold">Hospitals</h1>
          <p className="text-sm text-muted-foreground">Manage tenant hospitals. The hospital code is immutable after creation.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2 bg-gradient-primary text-primary-foreground"><Plus className="h-4 w-4" /> New hospital</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create hospital</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Hospital code (immutable)</Label>
                <Input value={form.hospital_code} onChange={(e) => setForm({ ...form, hospital_code: e.target.value.toUpperCase() })} placeholder="APOLLO_MUMBAI" />
                <p className="text-[11px] text-muted-foreground">Uppercase letters, digits, underscore. Used for analytics, APIs and billing.</p>
              </div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Hospital name</Label><Input value={form.hospital_name} onChange={(e) => setForm({ ...form, hospital_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Type</Label><Input value={form.hospital_type} onChange={(e) => setForm({ ...form, hospital_type: e.target.value })} placeholder="Multi-specialty / Heart / Cancer" /></div>
              <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={create}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No hospitals yet. Create one to onboard a tenant.</div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>City</TableHead><TableHead>State</TableHead><TableHead>Status</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
            <TableBody>
              {rows.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-mono text-xs">{h.hospital_code}</TableCell>
                  <TableCell className="font-medium">{h.hospital_name}</TableCell>
                  <TableCell>{h.hospital_type ?? "—"}</TableCell>
                  <TableCell>{h.city ?? "—"}</TableCell>
                  <TableCell>{h.state ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="bg-success/10 text-success">{h.status}</Badge></TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => remove(h.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
