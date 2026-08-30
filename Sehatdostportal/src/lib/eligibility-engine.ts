// Deterministic, rule-based eligibility engine for SEHAT DOST AI.
// No AI models. Pure logic over uploaded policy JSON + patient context.

import type { ProcedureMaster } from "./procedure-match";
import type { DiseaseMaster } from "./disease-match";
import { normalizePolicy, logNormalization, type NormalizedPolicy, type NormalizationResult } from "./policy-normalizer";
export type { NormalizedPolicy, NormalizationResult, NormalizationLogEntry } from "./policy-normalizer";

export type Patient = {
  name: string;
  age: number;
  gender: string;
  procedure: string;
  hospital: string;
  matchedProcedure?: ProcedureMaster | null;
  disease?: string;
  matchedDisease?: DiseaseMaster | null;
};

export type PolicyJSON = {
  policy_identity?: Record<string, unknown>;
  coverage_intelligence?: Record<string, unknown>;
  waiting_periods?: Record<string, unknown>;
  claim_intelligence?: Record<string, unknown>;
  hospital_workflow_intelligence?: Record<string, unknown>;
  benefits?: unknown;
  exclusions?: unknown;
  mandatory_documents?: unknown;
  claim_rejection_reasons?: unknown;
};

export type Decision = "Eligible" | "Review Required" | "Potentially Not Eligible";
export type Score = "Low" | "Medium" | "High";

export type Reason = { type: "pass" | "warn" | "fail"; text: string };

export type EligibilityResult = {
  decision: Decision;
  reasons: Reason[];
  claimRisk: { score: Score; explanation: string[] };
  docComplexity: { score: Score; explanation: string[] };
  matchedExclusion?: string;
  ageContext: { min?: number; max?: number; raw?: string };
};

const str = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v);
const lower = (v: unknown) => str(v).toLowerCase().trim();
const isYes = (v: unknown) => /^yes|^y$|available|allowed/i.test(str(v));
const isNo = (v: unknown) => /^no$|^n$|not available|not allowed/i.test(str(v));
const isNotSpec = (v: unknown) =>
  !str(v) || /not specified|n\/?a|unknown/i.test(str(v));

function parseAgeRange(policy: PolicyJSON): { min?: number; max?: number; raw?: string } {
  const id = (policy.policy_identity ?? {}) as Record<string, unknown>;
  const candidates = [
    id.entry_age, id.eligibility, id.age_eligibility, id.entry_age_limit,
    id.min_entry_age, id.max_entry_age, id.age_limit,
  ];
  const minDirect = Number(id.min_entry_age ?? id.entry_age_min);
  const maxDirect = Number(id.max_entry_age ?? id.entry_age_max);
  if (!isNaN(minDirect) && minDirect > 0 && !isNaN(maxDirect) && maxDirect > 0) {
    return { min: minDirect, max: maxDirect, raw: `${minDirect}-${maxDirect} years` };
  }
  for (const c of candidates) {
    const s = str(c);
    if (!s) continue;
    // Patterns: "18-65 years", "18 to 65", "Min 18 Max 65"
    const range = s.match(/(\d{1,3})\s*(?:-|to|—|–)\s*(\d{1,3})/i);
    if (range) {
      return { min: Number(range[1]), max: Number(range[2]), raw: s };
    }
    const minM = s.match(/min(?:imum)?[^\d]{0,8}(\d{1,3})/i);
    const maxM = s.match(/max(?:imum)?[^\d]{0,8}(\d{1,3})/i);
    if (minM || maxM) {
      return { min: minM ? Number(minM[1]) : undefined, max: maxM ? Number(maxM[1]) : undefined, raw: s };
    }
  }
  return {};
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  if (typeof v === "string") return [v];
  return [];
}

function procedureMatches(procedure: string, items: string[]): string | null {
  const p = lower(procedure);
  if (!p) return null;
  // Tokenize the procedure into meaningful words (length >= 4) plus parenthetical acronyms.
  const acronyms = (procedure.match(/\(([^)]+)\)/g) ?? []).map((s) => s.replace(/[()]/g, "").toLowerCase());
  const words = p
    .replace(/\([^)]*\)/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
  const tokens = [...new Set([...words, ...acronyms])];
  for (const item of items) {
    const li = item.toLowerCase();
    if (li.includes(p) || p.includes(li)) return item;
    for (const t of tokens) {
      if (t && li.includes(t)) return item;
    }
  }
  return null;
}


// Tri-state aware coercions that prefer normalized values when present.
const triYes = (n: "yes" | "no" | "conditional" | "unknown" | undefined, fallback: unknown) =>
  n === "yes" ? true : n === "no" ? false : isYes(fallback);
const triNo = (n: "yes" | "no" | "conditional" | "unknown" | undefined, fallback: unknown) =>
  n === "no" ? true : n === "yes" ? false : isNo(fallback);

export function runEligibility(policy: PolicyJSON, patient: Patient): EligibilityResult {
  const reasons: Reason[] = [];
  const exclusions = asStringArray(policy.exclusions);
  const benefits = asStringArray(policy.benefits);
  const docs = asStringArray(policy.mandatory_documents);
  const cl = (policy.claim_intelligence ?? {}) as Record<string, unknown>;
  const wp = (policy.waiting_periods ?? {}) as Record<string, unknown>;
  const hw = (policy.hospital_workflow_intelligence ?? {}) as Record<string, unknown>;

  // ---- Policy Rule Normalization Layer ----
  // Normalize first, log validation outcome, then prefer normalized values
  // anywhere the engine previously parsed free text. Free-text fallback is
  // retained so decisions stay byte-identical when normalization is undefined.
  const norm: NormalizationResult = normalizePolicy(policy);
  const N: NormalizedPolicy = norm.normalized;
  try {
    const id = (policy.policy_identity ?? {}) as Record<string, unknown>;
    const label = `${str(id.insurer_name) || "Policy"} / ${str(id.policy_name) || "Unknown"}`;
    logNormalization(label, norm);
  } catch {
    /* logging must never break the engine */
  }

  // 1. Age check
  const age = parseAgeRange(policy);
  if (age.min !== undefined || age.max !== undefined) {
    const belowMin = age.min !== undefined && patient.age < age.min;
    const aboveMax = age.max !== undefined && patient.age > age.max;
    if (belowMin || aboveMax) {
      reasons.push({
        type: "fail",
        text: `Patient age ${patient.age} is outside policy entry age window (${age.raw ?? `${age.min ?? "?"}-${age.max ?? "?"}`}).`,
      });
    } else {
      reasons.push({
        type: "pass",
        text: `Patient age ${patient.age} is within policy entry age window (${age.raw ?? `${age.min ?? "?"}-${age.max ?? "?"}`}).`,
      });
    }
  } else {
    reasons.push({
      type: "warn",
      text: "Entry age limits not explicitly defined in policy — manual age verification recommended.",
    });
  }

  // 2. Exclusion check — use standardized procedure synonyms/keywords when available
  let matchedExclusion: string | undefined;
  const mp = patient.matchedProcedure;
  const procedureCandidates = [
    patient.procedure,
    ...(mp ? [mp.procedure_name, mp.short_name ?? "", ...(mp.synonyms ?? []), ...(mp.keywords ?? [])] : []),
  ].filter(Boolean);

  if (patient.procedure) {
    if (mp) {
      reasons.push({
        type: "pass",
        text: `Procedure standardized to “${mp.procedure_name}” (${mp.procedure_code}) via Procedure Master.`,
      });
    }
    let hit: string | null = null;
    for (const cand of procedureCandidates) {
      hit = procedureMatches(cand, exclusions);
      if (hit) break;
    }
    if (hit) {
      matchedExclusion = hit;
      reasons.push({
        type: "fail",
        text: `Procedure "${mp?.procedure_name ?? patient.procedure}" appears in policy exclusions: “${hit}”.`,
      });
    } else if (exclusions.length === 0) {
      reasons.push({
        type: "warn",
        text: "No exclusion list available in policy framework — verify manually with insurer.",
      });
    } else {
      reasons.push({
        type: "pass",
        text: `Procedure "${mp?.procedure_name ?? patient.procedure}" not listed in ${exclusions.length} policy exclusions.`,
      });
    }
    // Bonus: explicit benefit coverage match (using synonyms too)
    let benefitHit: string | null = null;
    for (const cand of procedureCandidates) {
      benefitHit = procedureMatches(cand, benefits);
      if (benefitHit) break;
    }
    if (benefitHit) {
      reasons.push({ type: "pass", text: `Procedure aligns with covered benefit: “${benefitHit}”.` });
    } else if (benefits.length > 0 && !matchedExclusion) {
      reasons.push({
        type: "warn",
        text: "Procedure coverage not explicitly found in listed benefits — pre-authorization advised.",
      });
    }
  } else {
    reasons.push({ type: "warn", text: "No procedure specified — cannot validate against exclusions." });
  }
  // 2b. Disease check — exclusions, PED, specific waiting periods
  const md = patient.matchedDisease;
  const diseaseCandidates = [
    patient.disease ?? "",
    ...(md ? [md.disease_name, md.short_name ?? "", md.icd10_code ?? "", ...(md.synonyms ?? []), ...(md.keywords ?? [])] : []),
  ].filter(Boolean);

  if (diseaseCandidates.length > 0) {
    if (md) {
      reasons.push({
        type: "pass",
        text: `Disease standardized to “${md.disease_name}”${md.icd10_code ? ` (ICD-10 ${md.icd10_code})` : ""} via Disease Master.`,
      });
    }
    let dHit: string | null = null;
    for (const cand of diseaseCandidates) {
      dHit = procedureMatches(cand, exclusions);
      if (dHit) break;
    }
    if (dHit && !matchedExclusion) {
      matchedExclusion = dHit;
      reasons.push({
        type: "fail",
        text: `Disease "${md?.disease_name ?? patient.disease}" appears in policy exclusions: “${dHit}”.`,
      });
    }
    if (md?.chronic_flag) {
      reasons.push({
        type: "warn",
        text: "Chronic condition — PED (pre-existing disease) waiting period likely applies; verify PED clause.",
      });
    }
    if (md?.critical_illness_flag) {
      reasons.push({
        type: "warn",
        text: "Critical illness — specific disease waiting period and critical illness clauses must be reviewed.",
      });
    }
    // Specific-disease waiting period text scan
    const specificWp = str(wp.specific_disease_waiting);
    if (specificWp && diseaseCandidates.some((c) => procedureMatches(c, [specificWp]))) {
      reasons.push({
        type: "warn",
        text: `Disease referenced in specific-disease waiting clause — confirm timeline (“${specificWp}”).`,
      });
    }
  }


  // 3. Claim intelligence (driven by normalized fields, free-text fallback)
  if (triYes(N.cashless_available, cl.cashless_available)) {
    reasons.push({ type: "pass", text: "Cashless treatment is available under this policy." });
  } else if (triNo(N.cashless_available, cl.cashless_available)) {
    reasons.push({ type: "warn", text: "Cashless not available — reimbursement claim required." });
  }
  if (triYes(N.pre_auth_required, cl.pre_auth_required)) {
    reasons.push({ type: "warn", text: "Pre-authorization is mandatory before admission." });
  }

  // 4. Waiting period completeness (prefer normalized months)
  const wpPresence = [
    N.initial_waiting_months !== undefined || !isNotSpec(wp.initial_waiting_period),
    N.ped_waiting_months !== undefined || !isNotSpec(wp.pre_existing_disease_waiting),
    N.specific_disease_waiting_months !== undefined || !isNotSpec(wp.specific_disease_waiting),
  ];
  const missingWp = wpPresence.filter((p) => !p);
  if (missingWp.length === wpPresence.length) {
    reasons.push({ type: "warn", text: "Waiting period information incomplete in policy framework." });
  } else if (missingWp.length > 0) {
    reasons.push({ type: "warn", text: `Partial waiting period data: ${missingWp.length} of ${wpPresence.length} periods unspecified.` });
  }

  // 5. Hospital alerts
  if (triYes(N.hospital_empanelment_required, hw.hospital_empanelment_required)) {
    reasons.push({ type: "warn", text: "Hospital must be empaneled with insurer / TPA." });
  }
  if (triYes(N.government_authorization_required, hw.government_authorization_required)) {
    reasons.push({ type: "warn", text: "Government authorization required before claim filing." });
  }

  // ---- Decision logic ----
  const hasFail = reasons.some((r) => r.type === "fail");
  const warnCount = reasons.filter((r) => r.type === "warn").length;
  const passCount = reasons.filter((r) => r.type === "pass").length;

  let decision: Decision;
  if (hasFail) decision = "Potentially Not Eligible";
  else if (warnCount >= 3 || (warnCount >= 2 && passCount < 2)) decision = "Review Required";
  else if (warnCount >= 1 && passCount < 1) decision = "Review Required";
  else decision = "Eligible";

  // ---- Claim Risk Score ----
  const riskFactors: string[] = [];
  let riskPoints = 0;
  if (hasFail) { riskPoints += 4; riskFactors.push("Policy exclusion or age limit violation detected"); }
  if (triYes(N.pre_auth_required, cl.pre_auth_required)) { riskPoints += 1; riskFactors.push("Pre-authorization requirement raises rejection risk if missed"); }
  if (triNo(N.cashless_available, cl.cashless_available)) { riskPoints += 1; riskFactors.push("Reimbursement-only claims carry higher delay & rejection rates"); }
  if (triYes(N.hospital_empanelment_required, hw.hospital_empanelment_required)) { riskPoints += 1; riskFactors.push("Empanelment requirement — verify hospital is on insurer panel"); }
  if (missingWp.length >= 2) { riskPoints += 1; riskFactors.push("Incomplete waiting period data — risk of timeline-based rejection"); }
  if (asStringArray(policy.claim_rejection_reasons).length >= 5) { riskPoints += 1; riskFactors.push("Policy has a long list of historical rejection reasons"); }
  if (riskFactors.length === 0) riskFactors.push("All standard claim parameters satisfied — low operational risk");
  const claimRisk: Score = riskPoints >= 3 ? "High" : riskPoints >= 1 ? "Medium" : "Low";

  // ---- Documentation Complexity Score ----
  const docFactors: string[] = [];
  let docPoints = 0;
  const docCount = docs.length;
  if (docCount >= 8) { docPoints += 2; docFactors.push(`${docCount} mandatory documents required`); }
  else if (docCount >= 4) { docPoints += 1; docFactors.push(`${docCount} mandatory documents required`); }
  else if (docCount > 0) docFactors.push(`${docCount} mandatory documents required`);
  else docFactors.push("Document list not specified — collect standard claim documents");

  if (triYes(N.pre_auth_required, cl.pre_auth_required)) { docPoints += 1; docFactors.push("Pre-authorization form adds documentation overhead"); }
  if (triYes(N.government_authorization_required, hw.government_authorization_required)) { docPoints += 1; docFactors.push("Government authorization paperwork required"); }
  if (triYes(N.package_code_required, hw.package_code_required)) { docPoints += 1; docFactors.push("Package code mapping required on claim form"); }
  if (triNo(N.cashless_available, cl.cashless_available)) { docPoints += 1; docFactors.push("Reimbursement claims require complete original document set"); }
  const docComplexity: Score = docPoints >= 3 ? "High" : docPoints >= 1 ? "Medium" : "Low";

  return {
    decision,
    reasons,
    claimRisk: { score: claimRisk, explanation: riskFactors },
    docComplexity: { score: docComplexity, explanation: docFactors },
    matchedExclusion,
    ageContext: age,
  };
}
