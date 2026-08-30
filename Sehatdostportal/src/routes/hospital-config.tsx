import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, Loader2, Save } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/hospital-config")({ component: () => <AppShell requireRole="hospital_admin"><ConfigPage /></AppShell> });

type Policy = { id: string; insurer_name: string; policy_name: string };

function ConfigPage() {
  const { hospital, hospitalConfig, refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [diseaseCats, setDiseaseCats] = useState<string[]>([]);
  const [procCats, setProcCats] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const [allPolicies, setAllPolicies] = useState(true);
  const [allSpecialties, setAllSpecialties] = useState(true);
  const [allDisease, setAllDisease] = useState(true);
  const [allProc, setAllProc] = useState(true);
  const [enabledPolicies, setEnabledPolicies] = useState<Set<string>>(new Set());
  const [enabledSpec, setEnabledSpec] = useState<Set<string>>(new Set());
  const [enabledDiseaseCat, setEnabledDiseaseCat] = useState<Set<string>>(new Set());
  const [enabledProcCat, setEnabledProcCat] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const [pol, dis, proc] = await Promise.all([
        supabase.from("policies").select("id, insurer_name, policy_name").order("insurer_name"),
        supabase.from("disease_master").select("specialty, category").eq("status", "active"),
        supabase.from("procedure_master").select("specialty, category").eq("status", "active"),
      ]);
      setPolicies((pol.data ?? []) as Policy[]);
      const specSet = new Set<string>(), dCatSet = new Set<string>(), pCatSet = new Set<string>();
      (dis.data ?? []).forEach((d: { specialty: string | null; category: string | null }) => { if (d.specialty) specSet.add(d.specialty); if (d.category) dCatSet.add(d.category); });
      (proc.data ?? []).forEach((p: { specialty: string | null; category: string | null }) => { if (p.specialty) specSet.add(p.specialty); if (p.category) pCatSet.add(p.category); });
      setSpecialties([...specSet].sort());
      setDiseaseCats([...dCatSet].sort());
      setProcCats([...pCatSet].sort());
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (hospitalConfig) {
      setAllPolicies(hospitalConfig.all_policies);
      setAllSpecialties(hospitalConfig.all_specialties);
      setAllDisease(hospitalConfig.all_disease_categories);
      setAllProc(hospitalConfig.all_procedure_categories);
      setEnabledPolicies(new Set(hospitalConfig.enabled_policy_ids));
      setEnabledSpec(new Set(hospitalConfig.enabled_specialties));
      setEnabledDiseaseCat(new Set(hospitalConfig.enabled_disease_categories));
      setEnabledProcCat(new Set(hospitalConfig.enabled_procedure_categories));
    }
  }, [hospitalConfig]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, key: string) => {
    const next = new Set(set); next.has(key) ? next.delete(key) : next.add(key); setter(next);
  };

  const save = async () => {
    if (!hospital) return toast.error("No hospital assigned to your profile");
    setBusy(true);
    const payload = {
      hospital_id: hospital.id,
      all_policies: allPolicies, all_specialties: allSpecialties,
      all_disease_categories: allDisease, all_procedure_categories: allProc,
      enabled_policy_ids: [...enabledPolicies],
      enabled_specialties: [...enabledSpec],
      enabled_disease_categories: [...enabledDiseaseCat],
      enabled_procedure_categories: [...enabledProcCat],
    };
    const { error } = await supabase.from("hospital_config").upsert(payload, { onConflict: "hospital_id" });
    setBusy(false);
    if (error) return toast.error("Save failed", { description: error.message });
    toast.success("Configuration saved");
    refresh();
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Hospital admin · {hospital?.hospital_code ?? "—"}
        </div>
        <h1 className="font-display text-3xl font-bold">Hospital Configuration</h1>
        <p className="text-sm text-muted-foreground">Choose which policies, specialties and categories your team can verify against.</p>
      </div>

      <Section title="Policies" all={allPolicies} setAll={setAllPolicies} count={policies.length} enabledCount={enabledPolicies.size}>
        <div className="grid gap-2 sm:grid-cols-2">
          {policies.map((p) => (
            <label key={p.id} className="flex items-start gap-2 rounded-lg border bg-card p-3 text-sm">
              <Checkbox checked={enabledPolicies.has(p.id)} disabled={allPolicies} onCheckedChange={() => toggle(enabledPolicies, setEnabledPolicies, p.id)} />
              <span><span className="font-medium">{p.insurer_name}</span> — {p.policy_name}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Specialties" all={allSpecialties} setAll={setAllSpecialties} count={specialties.length} enabledCount={enabledSpec.size}>
        <ChipGrid items={specialties} enabled={enabledSpec} disabled={allSpecialties} onToggle={(k) => toggle(enabledSpec, setEnabledSpec, k)} />
      </Section>

      <Section title="Disease Categories" all={allDisease} setAll={setAllDisease} count={diseaseCats.length} enabledCount={enabledDiseaseCat.size}>
        <ChipGrid items={diseaseCats} enabled={enabledDiseaseCat} disabled={allDisease} onToggle={(k) => toggle(enabledDiseaseCat, setEnabledDiseaseCat, k)} />
      </Section>

      <Section title="Procedure Categories" all={allProc} setAll={setAllProc} count={procCats.length} enabledCount={enabledProcCat.size}>
        <ChipGrid items={procCats} enabled={enabledProcCat} disabled={allProc} onToggle={(k) => toggle(enabledProcCat, setEnabledProcCat, k)} />
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={busy} className="gap-2 bg-gradient-primary text-primary-foreground shadow-elegant">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save configuration
        </Button>
      </div>
    </div>
  );
}

function Section({ title, all, setAll, count, enabledCount, children }: { title: string; all: boolean; setAll: (b: boolean) => void; count: number; enabledCount: number; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{all ? `All ${count} enabled` : `${enabledCount} of ${count} enabled`}</p>
        </div>
        <div className="flex items-center gap-2"><Label className="text-xs">Enable all</Label><Switch checked={all} onCheckedChange={setAll} /></div>
      </div>
      {!all && <div className="mt-4">{children}</div>}
    </Card>
  );
}

function ChipGrid({ items, enabled, disabled, onToggle }: { items: string[]; enabled: Set<string>; disabled: boolean; onToggle: (k: string) => void }) {
  if (items.length === 0) return <p className="text-xs text-muted-foreground">No items in master.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((k) => {
        const on = enabled.has(k);
        return (
          <button key={k} type="button" disabled={disabled} onClick={() => onToggle(k)}
            className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "bg-card text-muted-foreground"}`}>
            {k}
          </button>
        );
      })}
    </div>
  );
}
