import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Database,
  Building2,
  Clock,
  Eye,
  X,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/policy-upload")({
  head: () => ({
    meta: [
      { title: "Policy Upload Center — SEHAT DOST AI" },
      {
        name: "description",
        content:
          "Bulk-ingest SEHAT DOST AI V2 JSON policy documents. Scalable to 1,800+ insurance and Ayushman frameworks.",
      },
    ],
  }),
  component: PolicyUploadPage,
});

type PolicyRow = {
  id: string;
  insurer_name: string;
  policy_name: string;
  uin_number: string;
  policy_type: string;
  created_at: string;
};

type UploadStatus = "pending" | "uploading" | "success" | "error";

type UploadItem = {
  id: string;
  file_name: string;
  status: UploadStatus;
  message?: string;
  insurer_name?: string;
  policy_name?: string;
  uin_number?: string;
};

function parsePolicyIdentity(json: unknown): {
  insurer_name: string;
  policy_name: string;
  uin_number: string;
  policy_type: string;
} | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, any>;
  const pi =
    root.policy_identity ??
    root.policyIdentity ??
    root.PolicyIdentity ??
    null;
  if (!pi || typeof pi !== "object") return null;

  const insurer_name = String(pi.insurer_name ?? pi.insurerName ?? "").trim();
  const policy_name = String(pi.policy_name ?? pi.policyName ?? "").trim();
  const uin_number = String(pi.uin_number ?? pi.uinNumber ?? pi.uin ?? "").trim();
  const policy_type = String(pi.policy_type ?? pi.policyType ?? "").trim();

  if (!insurer_name || !policy_name || !uin_number || !policy_type) return null;
  return { insurer_name, policy_name, uin_number, policy_type };
}

function PolicyUploadPage() {
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPolicy, setDetailPolicy] = useState<PolicyRow | null>(null);
  const [detailJson, setDetailJson] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("policies")
      .select("id, insurer_name, policy_name, uin_number, policy_type, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load policies", { description: error.message });
    } else {
      setPolicies((data ?? []) as PolicyRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setQueue((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const ingestFile = useCallback(
    async (file: File, itemId: string) => {
      updateItem(itemId, { status: "uploading" });

      let parsed: unknown;
      try {
        const text = await file.text();
        parsed = JSON.parse(text);
      } catch {
        updateItem(itemId, {
          status: "error",
          message: "Invalid JSON — file could not be parsed.",
        });
        return false;
      }

      const identity = parsePolicyIdentity(parsed);
      if (!identity) {
        updateItem(itemId, {
          status: "error",
          message:
            "Missing required policy_identity fields (insurer_name, policy_name, uin_number, policy_type).",
        });
        return false;
      }

      const { data: existing, error: existErr } = await supabase
        .from("policies")
        .select("id, uin_number")
        .eq("uin_number", identity.uin_number)
        .maybeSingle();

      if (existErr) {
        updateItem(itemId, { status: "error", message: existErr.message });
        return false;
      }
      if (existing) {
        updateItem(itemId, {
          status: "error",
          message: `Duplicate UIN: ${identity.uin_number} already exists.`,
          ...identity,
        });
        return false;
      }

      const { data: inserted, error: insErr } = await supabase
        .from("policies")
        .insert(identity)
        .select("id")
        .single();

      if (insErr || !inserted) {
        updateItem(itemId, {
          status: "error",
          message: insErr?.message ?? "Failed to save policy.",
          ...identity,
        });
        return false;
      }

      const { error: dataErr } = await supabase
        .from("policy_data")
        .insert({ policy_id: inserted.id, data: parsed as any });

      if (dataErr) {
        // Roll back the parent row to keep relationship integrity.
        await supabase.from("policies").delete().eq("id", inserted.id);
        updateItem(itemId, {
          status: "error",
          message: `Saved metadata but failed to store JSON: ${dataErr.message}`,
          ...identity,
        });
        return false;
      }

      updateItem(itemId, {
        status: "success",
        message: "Uploaded & linked to policy_data.",
        ...identity,
      });
      return true;
    },
    [updateItem],
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) =>
        f.name.toLowerCase().endsWith(".json"),
      );
      if (arr.length === 0) {
        toast.error("Only .json files are supported.");
        return;
      }
      const items: UploadItem[] = arr.map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file_name: f.name,
        status: "pending",
      }));
      setQueue((prev) => [...items, ...prev]);
      setBusy(true);
      let okCount = 0;
      for (let i = 0; i < arr.length; i++) {
        const ok = await ingestFile(arr[i], items[i].id);
        if (ok) okCount++;
      }
      setBusy(false);
      if (okCount > 0) {
        toast.success(`Uploaded ${okCount} policy${okCount > 1 ? "ies" : ""}`, {
          description: "Now available in Policy Management.",
        });
        fetchPolicies();
      }
      if (okCount < arr.length) {
        toast.error(`${arr.length - okCount} file(s) failed validation.`);
      }
    },
    [ingestFile, fetchPolicies],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const openDetails = async (p: PolicyRow) => {
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
      toast.error("Failed to load policy JSON", { description: error.message });
    } else {
      setDetailJson(data?.data ?? null);
    }
    setDetailLoading(false);
  };

  const byInsurer = useMemo(() => {
    const map = new Map<string, number>();
    policies.forEach((p) => map.set(p.insurer_name, (map.get(p.insurer_name) ?? 0) + 1));
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [policies]);

  const recent = useMemo(() => policies.slice(0, 5), [policies]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin · Bulk Ingestion
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Policy Upload Center
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Ingest SEHAT DOST AI V2 JSON policy documents. Architecture supports scaling to{" "}
              <span className="font-semibold text-foreground">1,800+ frameworks</span> with
              automatic UIN de-duplication and relational linkage between{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">policies</code> and{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">policy_data</code>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/policies">
                Policy Management <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              className="gap-2 bg-gradient-primary text-primary-foreground shadow-elegant"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              <Upload className="h-4 w-4" />
              Upload Policies
            </Button>
          </div>
        </div>

        {/* KPI widgets */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card className="p-4 glass">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total policies uploaded</div>
                <div className="mt-1 text-3xl font-bold">{policies.length}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Target capacity 1,800+
                </div>
              </div>
              <Database className="h-8 w-8 text-primary/60" />
            </div>
          </Card>

          <Card className="p-4 glass">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" /> Policies by insurer
            </div>
            {byInsurer.length === 0 ? (
              <div className="py-2 text-xs text-muted-foreground">No data yet.</div>
            ) : (
              <ul className="space-y-1.5">
                {byInsurer.map(([name, count]) => (
                  <li key={name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-foreground">{name}</span>
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                      {count}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4 glass">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Recently uploaded
            </div>
            {recent.length === 0 ? (
              <div className="py-2 text-xs text-muted-foreground">No recent uploads.</div>
            ) : (
              <ul className="space-y-1.5">
                {recent.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">
                      <span className="font-medium">{p.policy_name}</span>
                      <span className="text-muted-foreground"> · {p.insurer_name}</span>
                    </span>
                    <button
                      onClick={() => openDetails(p)}
                      className="text-xs text-primary hover:underline"
                    >
                      View
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Dropzone */}
        <Card className="overflow-hidden">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed p-12 text-center transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/20"
            }`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-elegant">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold">
                Drag & drop SEHAT DOST AI V2 JSON files
              </div>
              <div className="text-sm text-muted-foreground">
                Multi-file supported · UIN duplicates auto-rejected · JSON stored to{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">policy_data</code>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
              >
                <FileJson className="h-4 w-4" /> Choose files
              </Button>
              {busy && (
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing…
                </span>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handleFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
          </div>

          {/* Queue */}
          {queue.length > 0 && (
            <div className="border-t">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Upload queue · {queue.length}
                </div>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setQueue([])}
                >
                  Clear
                </button>
              </div>
              <ScrollArea className="max-h-72">
                <ul className="divide-y">
                  {queue.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="mt-0.5">
                        {item.status === "uploading" && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                        {item.status === "pending" && (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        {item.status === "success" && (
                          <CheckCircle2 className="h-4 w-4 text-secondary" />
                        )}
                        {item.status === "error" && (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="truncate font-medium">{item.file_name}</span>
                          {item.uin_number && (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {item.uin_number}
                            </span>
                          )}
                        </div>
                        {(item.insurer_name || item.policy_name) && (
                          <div className="text-xs text-muted-foreground">
                            {item.insurer_name}
                            {item.policy_name ? ` · ${item.policy_name}` : ""}
                          </div>
                        )}
                        {item.message && (
                          <div
                            className={`mt-0.5 text-xs ${
                              item.status === "error"
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }`}
                          >
                            {item.message}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
        </Card>

        {/* Latest ingested table preview */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <div className="font-display text-base font-semibold">Latest ingested policies</div>
              <div className="text-xs text-muted-foreground">
                Live from <code className="rounded bg-muted px-1 py-0.5">policies</code> ·
                searchable in Policy Management
              </div>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link to="/policies">
                Search & filter <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : policies.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No policies uploaded yet. Drop a JSON file above to get started.
            </div>
          ) : (
            <ul className="divide-y">
              {policies.slice(0, 8).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.policy_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.insurer_name} ·{" "}
                      <span className="font-mono">{p.uin_number}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {p.policy_type}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1"
                      onClick={() => openDetails(p)}
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Detail dialog */}
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
                <X className="h-4 w-4" /> No JSON stored for this policy.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
