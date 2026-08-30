import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Sparkles,
  Download,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Stethoscope,
  Building2,
  BedDouble,
  Activity,
  Ambulance,
  HeartPulse,
  Leaf,
  Clock,
  CalendarClock,
  Baby,
  ClipboardCheck,
  XCircle,
  Info,
  Gauge,
  ShieldQuestion,
  CircleAlert,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { runEligibility, type EligibilityResult, type PolicyJSON as EnginePolicyJSON, type Patient } from "@/lib/eligibility-engine";
import { buildDecisionExplanation, type ExplanationItem } from "@/lib/decision-explanation";
import { generateEligibilityPdf } from "@/lib/pdf-report";
import { generateSummary, type AISummary } from "@/lib/ai-summary";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

type PolicyMeta = {
  id: string;
  insurer_name: string;
  policy_name: string;
  uin_number: string;
  policy_type: string;
};

type PolicyJSON = EnginePolicyJSON & {
  policy_identity?: Record<string, string>;
  coverage_intelligence?: Record<string, unknown>;
  waiting_periods?: Record<string, string>;
  claim_intelligence?: Record<string, string>;
  hospital_workflow_intelligence?: Record<string, string>;
  benefits?: string[];
  exclusions?: string[];
  mandatory_documents?: string[];
  claim_rejection_reasons?: string[];
};

type Verification = { policy: PolicyMeta; policyData: PolicyJSON; patient?: Patient };


export const Route = createFileRoute("/result")({
  component: ResultPage,
});

function ResultPage() {
  const { user, profile, isSuperAdmin } = useAuth();
  const [v, setV] = useState<Verification | null>(null);
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [savedHistoryFor, setSavedHistoryFor] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("sehat:verification");
    if (raw) {
      try {
        setV(JSON.parse(raw));
      } catch (err) {
        console.error("[Result] Failed to parse sessionStorage verification", err);
      }
    }
  }, []);

  // Derive data BEFORE any conditional return so hook order stays stable.
  const policy = v?.policy;
  const p = (v?.policyData ?? {}) as PolicyJSON;
  const patient = v?.patient;
  const safePatient: Patient = patient ?? {
    name: "Unknown",
    age: 0,
    gender: "unknown",
    procedure: "",
    hospital: "",
  };
  let result: EligibilityResult | null = null;
  if (v) {
    try {
      result = runEligibility(p, safePatient);
    } catch (err) {
      console.error("[Result] runEligibility failed", err);
    }
  }

  // Auto-save history + raise claim. MUST be declared before any early return.
  useEffect(() => {
    if (!v || !policy || !result) return;
    if (!user) return;
    // Hospital users must have a hospital assigned to insert (RLS requires hospital_id = current_hospital_id()).
    // Super admins without a hospital cannot insert under hospital RLS path, so we skip saving for them.
    const hospitalId = profile?.hospital_id ?? null;
    if (!hospitalId) {
      if (!isSuperAdmin) console.warn("[Result] No hospital assigned — history not saved.");
      return;
    }
    const sig = `${policy.id}|${safePatient.name}|${safePatient.procedure}|${result.decision}`;
    if (savedHistoryFor === sig) return;
    setSavedHistoryFor(sig);
    const decision = result.decision;
    const claimRisk = result.claimRisk.score;
    const docComplexity = result.docComplexity.score;
    (async () => {
      const { data: check, error } = await supabase
        .from("eligibility_checks")
        .insert({
          policy_id: policy.id,
          patient_name: safePatient.name,
          status: decision,
          hospital_id: hospitalId,
          created_by: user.id,
          user_id: user.id,
          result: {
            decision,
            patient: safePatient,
            policy: {
              insurer_name: policy.insurer_name,
              policy_name: policy.policy_name,
              uin_number: policy.uin_number,
              policy_type: policy.policy_type,
            },
            claim_risk: claimRisk,
            doc_complexity: docComplexity,
          },
        })
        .select("id")
        .maybeSingle();
      if (error) console.warn("History save failed", error.message);

      if (decision === "Potentially Not Eligible") {
        toast.info("No claim raised", {
          description: "The patient is not eligible under this policy, so no claim was created.",
        });
        return;
      }

      const matched = safePatient.matchedProcedure ?? null;
      const matchedDisease = safePatient.matchedDisease ?? null;
      const { data: claim, error: claimError } = await supabase
        .from("claims")
        .insert({
          hospital_id: hospitalId,
          eligibility_check_id: check?.id ?? null,
          policy_id: policy.id,
          patient_name: safePatient.name,
          patient_age: safePatient.age || null,
          patient_gender: safePatient.gender || null,
          patient_mobile: (safePatient as { mobile?: string | null }).mobile ?? null,
          procedure_name: matched?.procedure_name ?? safePatient.procedure ?? null,
          procedure_code: matched?.procedure_code ?? null,
          disease_name: matchedDisease?.disease_name ?? safePatient.disease ?? null,
          icd10_code: matchedDisease?.icd10_code ?? null,
          package_code: matched?.pmjay_package_code ?? null,
          status: "Submitted",
          current_step: 7,
          created_by: user.id,
        })
        .select("id, claim_number")
        .maybeSingle();

      if (claimError || !claim) {
        toast.error("Failed to create claim", {
          description: claimError?.message ?? "The claim row could not be created.",
        });
        return;
      }
      toast.success(`Claim ${claim.claim_number} created`, {
        description: "Click to open the claim file.",
        action: {
          label: "View claim",
          onClick: () => { window.location.href = `/claims/${claim.id}`; },
        },
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, user, profile?.hospital_id]);


  if (!v || !policy || !result) {
    return (
      <AppShell>
        <Card className="border-border/60 p-10 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/15 text-warning-foreground">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold">No verification in progress</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Start a new eligibility check to view the policy intelligence report.
          </p>
          <Link to="/verify">
            <Button className="mt-5 bg-gradient-primary text-primary-foreground shadow-elegant">
              <Sparkles className="mr-2 h-4 w-4" /> New Verification
            </Button>
          </Link>
        </Card>
      </AppShell>
    );
  }

  const cov = (p.coverage_intelligence ?? {}) as Record<string, string>;
  const wp = (p.waiting_periods ?? {}) as Record<string, string>;
  const cl = (p.claim_intelligence ?? {}) as Record<string, string>;
  const hw = (p.hospital_workflow_intelligence ?? {}) as Record<string, string>;

  const fmt = (val: unknown) =>
    !val || val === "Not Specified" ? "Not Specified" : String(val);

  const onDownloadPdf = () => {
    try {
      const doc = generateEligibilityPdf({
        hospital: safePatient.hospital || "—",
        patient: safePatient,
        policy,
        policyData: p,
        eligibility: result,
      });
      const fname = `SEHAT-${policy.insurer_name.replace(/\s+/g, "_")}-${safePatient.name.replace(/\s+/g, "_") || "patient"}.pdf`;
      doc.save(fname);
      toast.success("PDF report downloaded");
    } catch (err) {
      toast.error("Failed to generate PDF", { description: err instanceof Error ? err.message : "" });
    }
  };

  const onGenerateSummary = () => {
    setGeneratingSummary(true);
    // Architecture note: swap this block with a server-fn call to Gemini.
    // The output must still satisfy AISummary so SummaryPanel keeps working.
    setTimeout(() => {
      const s = generateSummary({
        patient: safePatient,
        policy,
        policyData: p,
        eligibility: result,
      });
      setSummary(s);
      setGeneratingSummary(false);
      toast.success("AI-ready summary generated");
    }, 250);
  };



  const decisionTone =
    result.decision === "Eligible"
      ? {
          badge: "bg-success text-success-foreground hover:bg-success",
          label: "ELIGIBLE",
          card: "border-success/30 bg-gradient-to-br from-success/10 via-card to-card",
          blob: "bg-success/20",
          icon: <CheckCircle2 className="h-7 w-7" />,
          iconWrap: "bg-success/15 text-success",
          headline: `Patient is eligible under ${policy.insurer_name}`,
        }
      : result.decision === "Review Required"
        ? {
            badge: "bg-warning text-warning-foreground hover:bg-warning",
            label: "REVIEW REQUIRED",
            card: "border-warning/30 bg-gradient-to-br from-warning/10 via-card to-card",
            blob: "bg-warning/20",
            icon: <ShieldQuestion className="h-7 w-7" />,
            iconWrap: "bg-warning/15 text-warning-foreground",
            headline: `Manual review required for ${policy.insurer_name}`,
          }
        : {
            badge: "bg-destructive text-destructive-foreground hover:bg-destructive",
            label: "POTENTIALLY NOT ELIGIBLE",
            card: "border-destructive/30 bg-gradient-to-br from-destructive/10 via-card to-card",
            blob: "bg-destructive/20",
            icon: <CircleAlert className="h-7 w-7" />,
            iconWrap: "bg-destructive/15 text-destructive",
            headline: `Potential ineligibility under ${policy.insurer_name}`,
          };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Status banner */}
        <Card className={`relative overflow-hidden p-6 shadow-card ${decisionTone.card}`}>
          <div className={`absolute -right-10 -top-10 h-44 w-44 rounded-full blur-3xl ${decisionTone.blob}`} />
          <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${decisionTone.iconWrap}`}>
                {decisionTone.icon}
              </div>
              <div>
                <Badge className={decisionTone.badge}>{decisionTone.label}</Badge>
                <h2 className="mt-1.5 text-2xl font-bold tracking-tight">
                  {decisionTone.headline}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {policy.policy_name} · {policy.policy_type} · UIN {policy.uin_number}
                </p>
                {patient && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {patient.name} · {patient.age} yrs · {patient.gender} · {patient.procedure || "no procedure"}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={onDownloadPdf}>
                <Download className="mr-2 h-4 w-4" /> Download PDF Report
              </Button>
              <Button
                className="bg-gradient-primary text-primary-foreground shadow-elegant"
                onClick={onGenerateSummary}
                disabled={generatingSummary}
              >
                <FileText className="mr-2 h-4 w-4" />
                {generatingSummary ? "Generating…" : summary ? "Regenerate Summary" : "Generate Summary"}
              </Button>
            </div>

          </div>
        </Card>

        {summary && <SummaryPanel summary={summary} />}



        {/* Decision Reasoning */}
        <Section icon={Sparkles} title="Decision Reasoning" subtitle="Deterministic rule-based assessment by SEHAT AI Engine">
          <ul className="space-y-2">
            {result.reasons.map((r, i) => (
              <li
                key={i}
                className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${
                  r.type === "pass"
                    ? "border-success/30 bg-success/5"
                    : r.type === "fail"
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-warning/30 bg-warning/5"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    r.type === "pass"
                      ? "bg-success/15 text-success"
                      : r.type === "fail"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-warning/20 text-warning-foreground"
                  }`}
                >
                  {r.type === "pass" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : r.type === "fail" ? (
                    <XCircle className="h-3.5 w-3.5" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  )}
                </div>
                <span className="leading-snug">{r.text}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Decision Explanation (structured, deterministic, auditable) */}
        <DecisionExplanationPanel
          explanation={buildDecisionExplanation(p, safePatient, result)}
          decision={result.decision}
        />

        {/* Scores */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ScoreCard
            icon={Gauge}
            title="Claim Risk Score"
            subtitle="Likelihood of rejection, delay, or query"
            score={result.claimRisk.score}
            explanations={result.claimRisk.explanation}
            mode="risk"
          />
          <ScoreCard
            icon={FileText}
            title="Documentation Complexity"
            subtitle="Effort required to assemble a clean claim file"
            score={result.docComplexity.score}
            explanations={result.docComplexity.explanation}
            mode="complexity"
          />
        </div>

        <Section icon={Building2} title="Policy Details" subtitle="Verified directly from uploaded policy framework">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KV label="Insurer" value={policy.insurer_name} />
            <KV label="Policy Name" value={policy.policy_name} />
            <KV label="UIN Number" value={policy.uin_number} mono />
            <KV label="Policy Type" value={policy.policy_type} />
          </div>
        </Section>

        {safePatient.matchedProcedure && (
          <Section icon={Stethoscope} title="Procedure Intelligence" subtitle="Standardized via SEHAT Procedure Master">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <KV label="Procedure Code" value={safePatient.matchedProcedure.procedure_code} mono />
              <KV label="Procedure Name" value={safePatient.matchedProcedure.procedure_name} />
              <KV label="Specialty" value={safePatient.matchedProcedure.specialty ?? "—"} />
              <KV label="Category" value={safePatient.matchedProcedure.category ?? "—"} />
              <KV
                label="Admission"
                value={
                  safePatient.matchedProcedure.inpatient_required
                    ? "Inpatient required"
                    : safePatient.matchedProcedure.daycare_possible
                      ? "Daycare eligible"
                      : "Outpatient / not specified"
                }
              />
            </div>
          </Section>
        )}

        {safePatient.matchedDisease && (
          <Section icon={HeartPulse} title="Disease Intelligence" subtitle="Standardized via SEHAT Disease Master">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <KV label="Disease Name" value={safePatient.matchedDisease.disease_name} />
              <KV label="ICD-10" value={safePatient.matchedDisease.icd10_code ?? "—"} mono />
              <KV label="Specialty" value={safePatient.matchedDisease.specialty ?? "—"} />
              <KV label="Chronic" value={safePatient.matchedDisease.chronic_flag ? "Yes" : "No"} />
              <KV label="Critical Illness" value={safePatient.matchedDisease.critical_illness_flag ? "Yes" : "No"} />
            </div>
          </Section>
        )}

        {/* Coverage Intelligence */}
        <Section icon={ShieldCheck} title="Coverage Intelligence" subtitle="What the policy covers">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Intel icon={BedDouble} label="Room Rent Limit" value={fmt(cov.room_rent_limit)} />
            <Intel icon={Activity} label="ICU Limit" value={fmt(cov.icu_limit)} />
            <Intel icon={Ambulance} label="Ambulance Cover" value={fmt(cov.ambulance_cover ?? cov.air_ambulance_cover)} />
            <Intel icon={HeartPulse} label="Organ Donor Cover" value={fmt(cov.organ_donor_cover)} />
            <Intel icon={Leaf} label="AYUSH Cover" value={fmt(cov.ayush_cover)} />
            <Intel icon={Stethoscope} label="Daycare Procedures" value={fmt(cov.daycare_procedures)} />
          </div>
        </Section>

        {/* Waiting Period Intelligence */}
        <Section icon={Clock} title="Waiting Period Intelligence" subtitle="Timelines that affect claim approval">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Intel icon={Clock} label="Initial Waiting Period" value={fmt(wp.initial_waiting_period)} tone="warning" />
            <Intel icon={CalendarClock} label="PED Waiting Period" value={fmt(wp.pre_existing_disease_waiting)} tone="warning" />
            <Intel icon={CalendarClock} label="Specific Disease Waiting" value={fmt(wp.specific_disease_waiting)} tone="warning" />
            <Intel icon={Baby} label="Maternity Waiting" value={fmt(wp.maternity_waiting_period)} tone="warning" />
          </div>
        </Section>

        {/* Claim Intelligence */}
        <Section icon={ClipboardCheck} title="Claim Intelligence" subtitle="How to file a claim under this policy">
          <div className="grid gap-4 sm:grid-cols-3">
            <Pill label="Cashless Available" value={fmt(cl.cashless_available)} />
            <Pill label="Reimbursement Available" value={fmt(cl.reimbursement_available)} />
            <Pill label="Pre-Authorization Required" value={fmt(cl.pre_auth_required)} />
          </div>
          {(cl.claim_submission_deadline || cl.claim_settlement_timeline) && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {cl.claim_submission_deadline && (
                <KV label="Claim Submission Deadline" value={cl.claim_submission_deadline} />
              )}
              {cl.claim_settlement_timeline && (
                <KV label="Settlement Timeline" value={cl.claim_settlement_timeline} />
              )}
            </div>
          )}
        </Section>

        {/* Hospital Alerts */}
        <Section icon={ShieldAlert} title="Hospital Alerts" subtitle="Operational requirements for your hospital team" tone="warning">
          <div className="grid gap-3 sm:grid-cols-2">
            <Alert label="Hospital Empanelment Required" value={fmt(hw.hospital_empanelment_required)} />
            <Alert label="TPA Required" value={fmt(hw.tpa_required)} />
            <Alert label="Government Authorization" value={fmt(hw.government_authorization_required)} />
            <Alert label="Package Code Required" value={fmt(hw.package_code_required)} />
          </div>
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Benefits */}
          <ListCard
            icon={CheckCircle2}
            tone="success"
            title="Top Benefits"
            subtitle={`${p.benefits?.length ?? 0} benefits covered`}
            items={p.benefits ?? []}
            empty="No benefits listed in this policy framework."
          />

          {/* Exclusions */}
          <ListCard
            icon={XCircle}
            tone="destructive"
            title="Top Exclusions"
            subtitle={`${p.exclusions?.length ?? 0} exclusions to verify`}
            items={p.exclusions ?? []}
            empty="No exclusions listed in this policy framework."
          />
        </div>

        {/* Required Documents */}
        <Section icon={FileText} title="Required Documents" subtitle="Collect these from the patient for a clean claim">
          {p.mandatory_documents?.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {p.mandatory_documents.map((d) => (
                <li
                  key={d}
                  className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3 text-sm"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No mandatory documents listed.</p>
          )}
        </Section>
      </div>
    </AppShell>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  tone,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  tone?: "warning";
  children: React.ReactNode;
}) {
  const iconCls =
    tone === "warning"
      ? "bg-warning/15 text-warning-foreground"
      : "bg-primary/10 text-primary";
  return (
    <Card className="border-border/60 p-6 shadow-card">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconCls}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function Intel({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "primary" | "warning";
}) {
  const ring =
    tone === "warning"
      ? "border-warning/30 bg-warning/5"
      : "border-primary/15 bg-gradient-to-br from-primary/5 to-card";
  const ic =
    tone === "warning"
      ? "bg-warning/20 text-warning-foreground"
      : "bg-primary/10 text-primary";
  return (
    <div className={`rounded-xl border p-4 ${ring}`}>
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${ic}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-2 text-sm font-semibold leading-snug">{value}</p>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  const yes = /^yes/i.test(value);
  const no = /^no($|\b)/i.test(value);
  const tone = yes
    ? "border-success/30 bg-success/10 text-success"
    : no
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : "border-muted bg-muted/30 text-foreground";
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-base font-bold">{value}</p>
    </div>
  );
}

function Alert({ label, value }: { label: string; value: string }) {
  const required = /yes/i.test(value);
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          required ? "bg-warning/20 text-warning-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {required ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function ListCard({
  icon: Icon,
  tone,
  title,
  subtitle,
  items,
  empty,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "success" | "destructive";
  title: string;
  subtitle: string;
  items: string[];
  empty: string;
}) {
  const ic =
    tone === "success"
      ? "bg-success/15 text-success"
      : "bg-destructive/15 text-destructive";
  const dot =
    tone === "success" ? "text-success" : "text-destructive";
  return (
    <Card className="border-border/60 p-6 shadow-card">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${ic}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {items.length ? (
        <ul className="mt-5 space-y-2">
          {items.slice(0, 12).map((b) => (
            <li
              key={b}
              className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2 text-sm"
            >
              {tone === "success" ? (
                <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${dot}`} />
              ) : (
                <XCircle className={`mt-0.5 h-4 w-4 shrink-0 ${dot}`} />
              )}
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">{empty}</p>
      )}
    </Card>
  );
}

function ScoreCard({
  icon: Icon,
  title,
  subtitle,
  score,
  explanations,
  mode,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  score: "Low" | "Medium" | "High";
  explanations: string[];
  mode: "risk" | "complexity";
}) {
  // For risk: Low=good (success), High=bad (destructive)
  // For complexity: Low=good (success), High=challenging (warning, never destructive)
  const tone =
    score === "Low"
      ? { ring: "border-success/30 bg-success/5", chip: "bg-success text-success-foreground", bar: "bg-success", fill: "w-1/3" }
      : score === "Medium"
        ? { ring: "border-warning/30 bg-warning/5", chip: "bg-warning text-warning-foreground", bar: "bg-warning", fill: "w-2/3" }
        : mode === "risk"
          ? { ring: "border-destructive/30 bg-destructive/5", chip: "bg-destructive text-destructive-foreground", bar: "bg-destructive", fill: "w-full" }
          : { ring: "border-warning/40 bg-warning/10", chip: "bg-warning text-warning-foreground", bar: "bg-warning", fill: "w-full" };

  return (
    <Card className={`border p-6 shadow-card ${tone.ring}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Badge className={`${tone.chip} text-xs uppercase tracking-wide`}>{score}</Badge>
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${tone.bar} ${tone.fill} transition-all`} />
      </div>
      <ul className="mt-4 space-y-1.5">
        {explanations.map((e, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current" />
            <span className="leading-snug">{e}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SummaryPanel({ summary }: { summary: AISummary }) {
  const Block = ({ title, items, tone = "primary" }: { title: string; items: string[]; tone?: "primary" | "success" | "warning" | "destructive" }) => {
    const toneCls = {
      primary: "border-primary/20 bg-primary/5",
      success: "border-success/30 bg-success/5",
      warning: "border-warning/30 bg-warning/5",
      destructive: "border-destructive/30 bg-destructive/5",
    }[tone];
    return (
      <div className={`rounded-xl border p-4 ${toneCls}`}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <ul className="mt-2 space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-snug">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/60" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  return (
    <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-card">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">AI-Ready Summary</h3>
              <p className="text-xs text-muted-foreground">
                Deterministic generation · Gemini-ready architecture
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary uppercase tracking-wide text-[10px]">
            {summary.generator}
          </Badge>
        </div>
        <div className="mt-5 rounded-xl border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Eligibility Summary</p>
          <p className="mt-1 text-sm leading-relaxed">{summary.eligibility}</p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Block title="Coverage Available" items={summary.coverage} tone="success" />
          <Block title="Major Risks" items={summary.risks} tone="warning" />
          <Block title="Required Documents" items={summary.documents} tone="primary" />
          <Block title="Recommended Next Action" items={[summary.nextAction]} tone="destructive" />
        </div>
      </div>
    </Card>
  );
}


function DecisionExplanationPanel({
  explanation,
  decision,
}: {
  explanation: ReturnType<typeof buildDecisionExplanation>;
  decision: EligibilityResult["decision"];
}) {
  const decisionLabel =
    decision === "Eligible" ? "Eligible" : decision === "Review Required" ? "Manual Review" : "Not Eligible";
  const decisionChip =
    decision === "Eligible"
      ? "bg-success text-success-foreground"
      : decision === "Review Required"
        ? "bg-warning text-warning-foreground"
        : "bg-destructive text-destructive-foreground";
  const conf = explanation.confidence.level;
  const confChip =
    conf === "High"
      ? "bg-success text-success-foreground"
      : conf === "Medium"
        ? "bg-warning text-warning-foreground"
        : "bg-destructive text-destructive-foreground";

  const itemTone = (t?: ExplanationItem["tone"]) =>
    t === "pass"
      ? "border-success/30 bg-success/5"
      : t === "fail"
        ? "border-destructive/30 bg-destructive/5"
        : t === "warn"
          ? "border-warning/30 bg-warning/5"
          : "border-border bg-muted/30";

  return (
    <Card className="border-border/60 p-6 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldQuestion className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Decision Explanation</h3>
            <p className="text-xs text-muted-foreground">
              Structured, deterministic and auditable reasoning trail
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={decisionChip}>{decisionLabel}</Badge>
          <Badge className={confChip}>Confidence: {conf}</Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {explanation.sections.map((s) => (
          <div key={s.key} className="rounded-xl border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {s.title}
            </p>
            <ul className="mt-3 space-y-2">
              {s.items.map((it, i) => (
                <li key={i} className={`rounded-lg border p-3 text-sm ${itemTone(it.tone)}`}>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {it.label}
                  </p>
                  <p className="mt-0.5 font-medium leading-snug">{it.value}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Final Decision Logic
        </p>
        <ul className="mt-2 space-y-1.5">
          {explanation.finalLogic.map((l, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-snug">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/60" />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Confidence Rationale
          </p>
          <ul className="mt-2 space-y-1.5">
            {explanation.confidence.rationale.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-snug">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Missing Information
          </p>
          {explanation.missing.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No critical inputs missing — all required fields available.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {explanation.missing.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-snug">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-foreground" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

