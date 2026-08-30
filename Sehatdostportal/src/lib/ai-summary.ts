// Deterministic AI-ready summary generator. Designed so a Gemini call
// can later replace the body of `generateSummary()` without changing the
// public shape consumed by the UI.

import type { EligibilityResult, Patient, PolicyJSON } from "./eligibility-engine";

export type SummaryInput = {
  patient: Patient;
  policy: { insurer_name: string; policy_name: string; uin_number: string; policy_type: string };
  policyData: PolicyJSON;
  eligibility: EligibilityResult;
};

export type AISummary = {
  generator: "deterministic" | "gemini";
  eligibility: string;
  coverage: string[];
  risks: string[];
  documents: string[];
  nextAction: string;
};

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
const s = (v: unknown) => (v == null ? "" : String(v));

export function generateSummary(input: SummaryInput): AISummary {
  const { patient, policy, policyData, eligibility } = input;
  const cov = (policyData.coverage_intelligence ?? {}) as Record<string, unknown>;
  const wp = (policyData.waiting_periods ?? {}) as Record<string, unknown>;
  const cl = (policyData.claim_intelligence ?? {}) as Record<string, unknown>;

  // 1. Eligibility summary
  const eligibility_line =
    eligibility.decision === "Eligible"
      ? `${patient.name} (${patient.age}y, ${patient.gender}) is ELIGIBLE under ${policy.insurer_name} — ${policy.policy_name} for "${patient.procedure || "the requested treatment"}".`
      : eligibility.decision === "Review Required"
        ? `${patient.name} (${patient.age}y) requires MANUAL REVIEW under ${policy.policy_name}. ${eligibility.reasons.filter((r) => r.type === "warn").length} warning(s) need clarification before pre-authorization.`
        : `${patient.name} (${patient.age}y) is POTENTIALLY NOT ELIGIBLE under ${policy.policy_name}.${eligibility.matchedExclusion ? ` Exclusion match: "${eligibility.matchedExclusion}".` : ""}`;

  // 2. Coverage available
  const coverage: string[] = [];
  if (s(cov.room_rent_limit)) coverage.push(`Room rent: ${s(cov.room_rent_limit)}`);
  if (s(cov.icu_limit)) coverage.push(`ICU: ${s(cov.icu_limit)}`);
  if (s(cov.ambulance_cover)) coverage.push(`Ambulance: ${s(cov.ambulance_cover)}`);
  if (s(cov.ayush_cover)) coverage.push(`AYUSH: ${s(cov.ayush_cover)}`);
  if (s(cov.daycare_procedures)) coverage.push(`Daycare procedures: ${s(cov.daycare_procedures)}`);
  if (s(cl.cashless_available)) coverage.push(`Cashless: ${s(cl.cashless_available)}`);
  if (coverage.length === 0) coverage.push("Coverage details not specified in uploaded policy framework.");

  // 3. Major risks
  const risks: string[] = [];
  eligibility.reasons.filter((r) => r.type === "fail").forEach((r) => risks.push(r.text));
  eligibility.reasons.filter((r) => r.type === "warn").slice(0, 4).forEach((r) => risks.push(r.text));
  if (s(wp.pre_existing_disease_waiting)) risks.push(`PED waiting period: ${s(wp.pre_existing_disease_waiting)}`);
  if (risks.length === 0) risks.push("No major risks identified by the rule engine.");

  // 4. Required documents
  const documents = arr(policyData.mandatory_documents);
  const docs = documents.length ? documents.slice(0, 8) : ["Standard claim documents: ID proof, policy card, prescription, diagnostic reports, discharge summary, hospital bills."];

  // 5. Recommended next action
  let nextAction = "";
  if (eligibility.decision === "Eligible") {
    nextAction = /yes/i.test(s(cl.pre_auth_required))
      ? `Submit pre-authorization request to ${policy.insurer_name} immediately, attach mandatory documents, and proceed with cashless admission.`
      : `Proceed with admission. File the claim within the submission deadline${s(cl.claim_submission_deadline) ? ` (${s(cl.claim_submission_deadline)})` : ""}.`;
  } else if (eligibility.decision === "Review Required") {
    nextAction = `Contact insurer TPA desk to clarify the ${eligibility.reasons.filter((r) => r.type === "warn").length} flagged item(s) before raising pre-authorization. Do not commit cashless admission until cleared.`;
  } else {
    nextAction = eligibility.matchedExclusion
      ? `Inform patient that "${patient.procedure}" may not be covered under this policy. Explore reimbursement/secondary coverage or alternate policies.`
      : `Procedure likely outside policy scope. Counsel patient on out-of-pocket estimate or alternative policies.`;
  }

  return {
    generator: "deterministic",
    eligibility: eligibility_line,
    coverage,
    risks,
    documents: docs,
    nextAction,
  };
}

// Future: swap implementation to call Gemini via a server function while
// keeping the AISummary shape identical so UI does not change.
// export async function generateSummaryWithGemini(input: SummaryInput): Promise<AISummary> { ... }
