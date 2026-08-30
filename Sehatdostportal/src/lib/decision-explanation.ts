// Deterministic Decision Explanation generator.
// Pure function: derives a structured, auditable reasoning report from the
// existing policy JSON, patient context (with matched procedure & disease)
// and EligibilityResult produced by `runEligibility`. No AI / no I/O.

import type { EligibilityResult, PolicyJSON, Patient } from "./eligibility-engine";

export type ExplanationItem = {
  label: string;
  value: string;
  tone?: "pass" | "warn" | "fail" | "info";
};

export type ExplanationSection = {
  key: string;
  title: string;
  items: ExplanationItem[];
};

export type Confidence = "High" | "Medium" | "Low";

export type DecisionExplanation = {
  sections: ExplanationSection[];
  finalLogic: string[];
  confidence: { level: Confidence; rationale: string[] };
  missing: string[];
};

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v)).trim();
const lower = (v: unknown) => str(v).toLowerCase();
const isYes = (v: unknown) => /^(yes|y|available|allowed)/i.test(str(v));
const isNo = (v: unknown) => /^(no|n|not available|not allowed)/i.test(str(v));
const isNotSpec = (v: unknown) => !str(v) || /not specified|n\/?a|unknown/i.test(str(v));

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

function tokenHit(needle: string, haystack: string[]): string | null {
  const n = norm(needle);
  if (!n) return null;
  for (const h of haystack) {
    const hn = norm(h);
    if (!hn) continue;
    if (hn.includes(n) || n.includes(hn)) return h;
  }
  return null;
}

export function buildDecisionExplanation(
  policy: PolicyJSON,
  patient: Patient,
  result: EligibilityResult,
): DecisionExplanation {
  const wp = (policy.waiting_periods ?? {}) as Record<string, unknown>;
  const cl = (policy.claim_intelligence ?? {}) as Record<string, unknown>;
  const hw = (policy.hospital_workflow_intelligence ?? {}) as Record<string, unknown>;
  const exclusions = Array.isArray(policy.exclusions) ? (policy.exclusions as string[]) : [];
  const benefits = Array.isArray(policy.benefits) ? (policy.benefits as string[]) : [];

  const mp = patient.matchedProcedure ?? null;
  const md = patient.matchedDisease ?? null;
  const missing: string[] = [];

  // ---------- Coverage Analysis ----------
  const coverage: ExplanationItem[] = [];
  if (patient.procedure) {
    coverage.push({
      label: "Covered procedure",
      value: mp ? `${mp.procedure_name} (${mp.procedure_code})` : patient.procedure,
      tone: mp ? "pass" : "info",
    });
    const benefitHit = mp
      ? (tokenHit(mp.procedure_name, benefits) ?? tokenHit(patient.procedure, benefits))
      : tokenHit(patient.procedure, benefits);
    coverage.push({
      label: "Matching policy section",
      value: benefitHit
        ? `Listed under benefits: "${benefitHit}"`
        : benefits.length === 0
          ? "Benefits list not provided in policy framework"
          : "Not explicitly listed in benefits — verify pre-authorization",
      tone: benefitHit ? "pass" : benefits.length ? "warn" : "info",
    });
    if (mp) {
      coverage.push({
        label: "Admission type",
        value: mp.inpatient_required
          ? "Inpatient required"
          : mp.daycare_possible
            ? "Daycare eligible"
            : "Outpatient / not specified",
        tone: "info",
      });
    }
  } else {
    coverage.push({ label: "Covered procedure", value: "No procedure specified", tone: "warn" });
    missing.push("Procedure name");
  }

  // ---------- Waiting Period Analysis ----------
  const waiting: ExplanationItem[] = [];
  const iwp = str(wp.initial_waiting_period);
  const pedWp = str(wp.pre_existing_disease_waiting);
  const specWp = str(wp.specific_disease_waiting);
  waiting.push({
    label: "Initial waiting period",
    value: isNotSpec(iwp) ? "Not specified in policy" : iwp,
    tone: isNotSpec(iwp) ? "warn" : "info",
  });
  waiting.push({
    label: "PED waiting period",
    value: isNotSpec(pedWp) ? "Not specified in policy" : pedWp,
    tone: isNotSpec(pedWp) ? "warn" : "info",
  });
  waiting.push({
    label: "Specific-disease waiting period",
    value: isNotSpec(specWp) ? "Not specified in policy" : specWp,
    tone: isNotSpec(specWp) ? "warn" : "info",
  });
  waiting.push({
    label: "Waiting period completion",
    value: "Cannot determine — policy inception date not captured",
    tone: "warn",
  });
  missing.push("Policy inception / start date (to compute waiting-period completion)");

  // ---------- Disease Analysis ----------
  const disease: ExplanationItem[] = [];
  if (patient.disease || md) {
    disease.push({
      label: "Disease matched",
      value: md
        ? `${md.disease_name}${md.icd10_code ? ` (ICD-10 ${md.icd10_code})` : ""}`
        : (patient.disease ?? "Unmatched free-text disease"),
      tone: md ? "pass" : "warn",
    });
    const dCandidates = md
      ? [md.disease_name, md.short_name ?? "", ...(md.synonyms ?? []), ...(md.keywords ?? [])]
      : [patient.disease ?? ""];
    let dExc: string | null = null;
    for (const c of dCandidates) {
      dExc = tokenHit(c, exclusions);
      if (dExc) break;
    }
    disease.push({
      label: "Disease exclusion check",
      value: dExc ? `Matches exclusion: "${dExc}"` : "No matching exclusion found",
      tone: dExc ? "fail" : "pass",
    });
  } else {
    disease.push({ label: "Disease matched", value: "No disease provided", tone: "info" });
  }

  // ---------- PED Analysis ----------
  const ped: ExplanationItem[] = [];
  const chronic = md?.chronic_flag === true;
  ped.push({
    label: "Pre-existing disease rules",
    value: chronic
      ? "Disease flagged chronic — PED clause applies"
      : md
        ? "Disease not flagged chronic — PED clause unlikely to apply"
        : "Cannot evaluate — disease not standardized",
    tone: chronic ? "warn" : md ? "pass" : "info",
  });
  ped.push({
    label: "PED waiting period triggered",
    value: chronic
      ? `Yes — applicable PED clause: ${isNotSpec(pedWp) ? "duration not specified" : pedWp}`
      : "No PED waiting period triggered",
    tone: chronic ? "warn" : "pass",
  });
  if (chronic) missing.push("Patient PED disclosure date (to compute PED waiting completion)");

  // ---------- Policy Conditions ----------
  const conds: ExplanationItem[] = [];
  if (isYes(cl.pre_auth_required)) conds.push({ label: "Pre-authorization", value: "Mandatory before admission", tone: "warn" });
  if (isYes(cl.cashless_available)) conds.push({ label: "Cashless treatment", value: "Available under this policy", tone: "pass" });
  else if (isNo(cl.cashless_available)) conds.push({ label: "Cashless treatment", value: "Not available — reimbursement only", tone: "warn" });
  if (isYes(hw.hospital_empanelment_required)) conds.push({ label: "Hospital empanelment", value: "Must be empaneled with insurer / TPA", tone: "warn" });
  if (isYes(hw.government_authorization_required)) conds.push({ label: "Government authorization", value: "Required before claim filing", tone: "warn" });
  if (isYes(hw.package_code_required)) conds.push({ label: "Package code", value: "Required on claim form", tone: "warn" });
  if (result.matchedExclusion) conds.push({ label: "Exclusion matched", value: `"${result.matchedExclusion}"`, tone: "fail" });
  if (result.ageContext.raw) {
    conds.push({
      label: "Entry age window",
      value: result.ageContext.raw,
      tone: "info",
    });
  } else {
    missing.push("Policy entry-age limits");
  }
  if (conds.length === 0) conds.push({ label: "Relevant clauses", value: "No special clauses triggered", tone: "info" });

  // ---------- Final Decision Logic ----------
  const passCount = result.reasons.filter((r) => r.type === "pass").length;
  const warnCount = result.reasons.filter((r) => r.type === "warn").length;
  const failCount = result.reasons.filter((r) => r.type === "fail").length;
  const finalLogic: string[] = [];
  if (result.decision === "Potentially Not Eligible") {
    finalLogic.push(`Decision = Not Eligible because ${failCount} hard-fail rule${failCount === 1 ? "" : "s"} triggered.`);
    if (result.matchedExclusion) finalLogic.push(`Hard fail: procedure/disease matches exclusion "${result.matchedExclusion}".`);
    finalLogic.push("Any fail-tier reason forces a non-eligible outcome per engine rules.");
  } else if (result.decision === "Review Required") {
    finalLogic.push(`Decision = Manual Review because no hard fail was found, but ${warnCount} warning${warnCount === 1 ? "" : "s"} triggered against ${passCount} pass${passCount === 1 ? "" : "es"}.`);
    finalLogic.push("Engine threshold: warns ≥ 3, OR (warns ≥ 2 AND passes < 2), OR (warns ≥ 1 AND passes < 1) → review.");
  } else {
    finalLogic.push(`Decision = Eligible because no hard fail triggered and warnings (${warnCount}) stayed below the review threshold with ${passCount} confirming pass${passCount === 1 ? "" : "es"}.`);
  }

  // ---------- Confidence ----------
  let confScore = 0;
  const confReasons: string[] = [];
  if (mp) { confScore += 2; confReasons.push("Procedure standardized via Procedure Master"); }
  else if (patient.procedure) { confReasons.push("Procedure provided but not standardized"); }
  else { confScore -= 1; confReasons.push("No procedure provided"); }
  if (md) { confScore += 1; confReasons.push("Disease standardized via Disease Master"); }
  else if (patient.disease) { confReasons.push("Disease provided but not standardized"); }
  if (exclusions.length > 0) { confScore += 1; confReasons.push(`${exclusions.length} exclusions available for matching`); }
  else { confScore -= 1; confReasons.push("Exclusion list missing in policy framework"); }
  if (result.ageContext.min !== undefined || result.ageContext.max !== undefined) { confScore += 1; confReasons.push("Policy entry-age window defined"); }
  else { confReasons.push("Entry-age limits not defined"); }
  const wpDefined = [iwp, pedWp, specWp].filter((x) => !isNotSpec(x)).length;
  if (wpDefined >= 2) { confScore += 1; confReasons.push(`${wpDefined}/3 waiting-period clauses defined`); }
  else { confReasons.push(`Only ${wpDefined}/3 waiting-period clauses defined`); }
  if (failCount > 0) { confScore += 1; confReasons.push("Hard fail makes the negative outcome high-confidence"); }
  const level: Confidence = confScore >= 4 ? "High" : confScore >= 2 ? "Medium" : "Low";

  // ---------- Missing Information ----------
  if (!patient.disease && !md) missing.push("Patient disease / diagnosis");
  if (benefits.length === 0) missing.push("Policy benefits list");
  if (exclusions.length === 0) missing.push("Policy exclusion list");
  if (isNotSpec(cl.cashless_available)) missing.push("Cashless availability flag");
  if (!str(patient.hospital)) missing.push("Treating hospital name");
  // Dedup preserving order.
  const seen = new Set<string>();
  const missingDedup = missing.filter((m) => (seen.has(lower(m)) ? false : (seen.add(lower(m)), true)));

  return {
    sections: [
      { key: "coverage", title: "Coverage Analysis", items: coverage },
      { key: "waiting", title: "Waiting Period Analysis", items: waiting },
      { key: "disease", title: "Disease Analysis", items: disease },
      { key: "ped", title: "PED Analysis", items: ped },
      { key: "conditions", title: "Policy Conditions", items: conds },
    ],
    finalLogic,
    confidence: { level, rationale: confReasons },
    missing: missingDedup,
  };
}
