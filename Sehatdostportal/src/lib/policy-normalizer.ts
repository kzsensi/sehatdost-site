// Policy Rule Normalization Layer
// ---------------------------------------------------------------
// Audits free-text policy JSON fields (uploaded via the policy framework)
// and converts them into a strict, typed schema the eligibility engine can
// reason over deterministically.
//
// Design rules:
//  • Pure functions only — no I/O, no AI.
//  • Never throws. Unparseable input → undefined + a validation log entry.
//  • Never mutates the input policy.
//  • The engine should prefer normalized fields and only fall back to the
//    original text when a field is `undefined` here (preserves decisions).
//
// Public surface:
//   - normalizePolicy(raw)
//   - NormalizedPolicy / NormalizationLogEntry types
//
// Console logs are emitted with the `[PolicyNormalizer]` tag so devs can
// inspect which fields were successfully normalized per verification.

import type { PolicyJSON } from "./eligibility-engine";

export type TriState = "yes" | "no" | "conditional" | "unknown";

export type AmountLimit = {
  // null = unlimited / "up to sum insured" / "at actuals"
  amount_inr: number | null;
  unit: "INR" | "percent_of_si" | "actuals" | "sum_insured" | "unknown";
  // Original free-text the value came from, for audit.
  raw: string;
};

export type RoomRentRule = {
  kind:
    | "no_sublimit"
    | "single_private_ac"
    | "single_private"
    | "twin_sharing"
    | "general_ward"
    | "percent_of_si"
    | "fixed_inr"
    | "actuals"
    | "unknown";
  percent_of_si?: number;
  amount_inr?: number;
  raw: string;
};

export type DiseaseWaiting = {
  // months until the listed disease(s) are covered
  months: number;
  diseases: string[]; // best-effort keyword list extracted from text
  raw: string;
};

export type NormalizedPolicy = {
  // Waiting periods (months)
  initial_waiting_months?: number;
  ped_waiting_months?: number;
  specific_disease_waiting_months?: number;
  maternity_waiting_months?: number | null; // null = excluded
  disease_specific_waiting?: DiseaseWaiting[];

  // Claim flags
  pre_auth_required?: TriState;
  pre_auth_window_hours_planned?: number;
  pre_auth_window_hours_emergency?: number;
  cashless_available?: TriState;
  reimbursement_available?: TriState;
  claim_submission_deadline_days?: number;
  claim_settlement_timeline_days?: number;

  // Coverage limits
  room_rent?: RoomRentRule;
  icu?: RoomRentRule;
  ambulance_limit?: AmountLimit;
  air_ambulance_limit?: AmountLimit;
  ayush_covered?: TriState;
  ayush_limit?: AmountLimit;
  daycare_covered?: TriState;
  daycare_limit?: AmountLimit;
  domiciliary_covered?: TriState;

  // Financial parameters
  copay_percent?: number;
  copay_applies_to?: string;
  deductible_inr?: number;
  sum_insured_options_inr?: number[];

  // Hospital workflow
  hospital_empanelment_required?: TriState;
  government_authorization_required?: TriState;
  package_code_required?: TriState;
  tpa_required?: TriState;

  // Pre/post hospitalization windows (days)
  pre_hospitalization_days?: number;
  post_hospitalization_days?: number;
};

export type NormalizationLogEntry = {
  field: keyof NormalizedPolicy | string;
  source_path: string;
  status: "normalized" | "missing" | "ambiguous" | "unparseable";
  raw?: string;
  parsed?: unknown;
  note?: string;
};

export type NormalizationResult = {
  normalized: NormalizedPolicy;
  logs: NormalizationLogEntry[];
  stats: { normalized: number; missing: number; ambiguous: number; unparseable: number };
};

// -------------------------- helpers --------------------------

const s = (v: unknown): string => (v == null ? "" : String(v));
const lower = (v: unknown) => s(v).toLowerCase().trim();
const isNotSpec = (v: unknown) =>
  !s(v).trim() || /^(not\s*specified|n\/?a|unknown|none|tbd|-)\s*$/i.test(s(v).trim());

function parseTriState(v: unknown): TriState | undefined {
  const t = lower(v);
  if (!t || isNotSpec(v)) return undefined;
  if (/\bnot\s+(covered|available|allowed|applicable)\b/.test(t)) return "no";
  if (/^no\b|^n$|\bnot\s+required\b/.test(t)) return "no";
  if (/^yes\b|^y$|\bavailable\b|\ballowed\b|\bcovered\b|\brequired\b|\bmandator/.test(t)) {
    // "conditional" detection
    if (/\b(if|subject to|when|provided|conditional|on case-to-case|with conditions)\b/.test(t)) return "conditional";
    return "yes";
  }
  return "unknown";
}

function parseMonths(v: unknown): number | undefined {
  const t = s(v);
  if (!t || isNotSpec(t)) return undefined;
  // months
  const m = t.match(/(\d{1,3})\s*(?:months?|mos?\b)/i);
  if (m) return Number(m[1]);
  // years
  const y = t.match(/(\d{1,3})\s*(?:years?|yrs?\b)/i);
  if (y) return Number(y[1]) * 12;
  // days → months (only if "days" is the unit and we want completeness)
  const d = t.match(/(\d{1,4})\s*days?/i);
  if (d) {
    // express as fractional months rounded; for initial waiting (e.g. 30 days)
    return Math.round((Number(d[1]) / 30) * 100) / 100;
  }
  return undefined;
}

function parseDays(v: unknown): number | undefined {
  const t = s(v);
  if (!t || isNotSpec(t)) return undefined;
  const d = t.match(/(\d{1,4})\s*days?/i);
  if (d) return Number(d[1]);
  const h = t.match(/(\d{1,3})\s*hours?/i);
  if (h) return Math.round(Number(h[1]) / 24);
  return undefined;
}

function parseHours(v: unknown): { planned?: number; emergency?: number } {
  const t = s(v);
  if (!t) return {};
  const out: { planned?: number; emergency?: number } = {};
  const plannedRe = /(\d{1,3})\s*hours?\s*(?:before|prior)?\s*(?:planned)?/i;
  const emergRe = /(\d{1,3})\s*hours?[^.]{0,40}emergency/i;
  const pm = t.match(plannedRe);
  if (pm) out.planned = Number(pm[1]);
  const em = t.match(emergRe);
  if (em) out.emergency = Number(em[1]);
  // Also catch "within 24 hours of emergency"
  const em2 = t.match(/emergency[^.]{0,40}?(\d{1,3})\s*hours?/i);
  if (em2 && out.emergency === undefined) out.emergency = Number(em2[1]);
  return out;
}

function parseINRAmount(v: unknown): number | null | undefined {
  const t = s(v);
  if (!t || isNotSpec(t)) return undefined;
  // "Lakh" / "Lakhs" / "Lacs"
  const lakh = t.match(/(\d+(?:[.,]\d+)?)\s*(?:lakh?s?|lacs?)/i);
  if (lakh) return Math.round(Number(lakh[1].replace(",", "")) * 100000);
  const crore = t.match(/(\d+(?:[.,]\d+)?)\s*crores?/i);
  if (crore) return Math.round(Number(crore[1].replace(",", "")) * 10000000);
  // "INR 7,500" / "Rs. 10000"
  const inr = t.match(/(?:inr|rs\.?|₹)\s*([\d,]+(?:\.\d+)?)/i);
  if (inr) return Number(inr[1].replace(/,/g, ""));
  // Bare large number
  const bare = t.match(/\b(\d{4,})\b/);
  if (bare) return Number(bare[1]);
  return undefined;
}

function parseAmountLimit(v: unknown): AmountLimit | undefined {
  const t = s(v);
  if (!t || isNotSpec(t)) return undefined;
  const tl = t.toLowerCase();
  if (/up to (the\s+)?(annual\s+)?sum\s*insured|up to si\b/.test(tl)) {
    return { amount_inr: null, unit: "sum_insured", raw: t };
  }
  if (/at\s+actuals/.test(tl)) return { amount_inr: null, unit: "actuals", raw: t };
  const pct = t.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct && /sum\s*insured|annual\s*sum|si\b/i.test(tl)) {
    return { amount_inr: null, unit: "percent_of_si", raw: t };
  }
  const amt = parseINRAmount(t);
  if (typeof amt === "number") return { amount_inr: amt, unit: "INR", raw: t };
  return { amount_inr: null, unit: "unknown", raw: t };
}

function parseRoomRent(v: unknown): RoomRentRule | undefined {
  const t = s(v);
  if (!t || isNotSpec(t)) return undefined;
  const tl = t.toLowerCase();
  if (/no\s+sub-?limit/.test(tl)) return { kind: "no_sublimit", raw: t };
  if (/at\s+actuals/.test(tl)) return { kind: "actuals", raw: t };
  if (/single\s+private\s+(air\s*conditioned|ac)\s+room/.test(tl)) return { kind: "single_private_ac", raw: t };
  if (/single\s+(private\s+)?(room|occupancy)/.test(tl)) return { kind: "single_private", raw: t };
  if (/twin\s+sharing/.test(tl)) return { kind: "twin_sharing", raw: t };
  if (/general\s+ward/.test(tl)) return { kind: "general_ward", raw: t };
  const pct = t.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) return { kind: "percent_of_si", percent_of_si: Number(pct[1]), raw: t };
  const amt = parseINRAmount(t);
  if (typeof amt === "number") return { kind: "fixed_inr", amount_inr: amt, raw: t };
  return { kind: "unknown", raw: t };
}

function parsePercent(v: unknown): number | undefined {
  const t = s(v);
  if (!t || isNotSpec(t)) return undefined;
  const m = t.match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? Number(m[1]) : undefined;
}

function parseSumInsuredOptions(v: unknown): number[] | undefined {
  if (v == null) return undefined;
  const list = Array.isArray(v) ? v.map(s) : [s(v)];
  const out: number[] = [];
  for (const item of list) {
    // split joined entries like "3 Lakhs 4 Lakhs"
    const parts = item.split(/[,/]| and |\s{2,}/i);
    const expanded = parts.length > 1 ? parts : item.match(/(\d+(?:[.,]\d+)?\s*(?:lakh?s?|lacs?|crores?))/gi) ?? [item];
    for (const p of expanded) {
      const amt = parseINRAmount(p);
      if (typeof amt === "number" && amt > 0) out.push(amt);
    }
  }
  return out.length ? Array.from(new Set(out)).sort((a, b) => a - b) : undefined;
}

function parseDiseaseSpecificWaiting(v: unknown): DiseaseWaiting[] | undefined {
  const t = s(v);
  if (!t || isNotSpec(t)) return undefined;
  // Try to split on common separators
  const segments = t.split(/[;.\n]/).map((x) => x.trim()).filter(Boolean);
  const out: DiseaseWaiting[] = [];
  for (const seg of segments) {
    const months = parseMonths(seg);
    if (months == null) continue;
    // crude disease keyword extraction: capitalized phrases
    const diseases = (seg.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Za-z][a-zA-Z]+){0,4})\b/g) ?? [])
      .filter((w) => !/^(Within|Yes|No|Months?|Years?|Not|Covered|Period|Waiting)$/i.test(w));
    out.push({ months, diseases, raw: seg });
  }
  return out.length ? out : undefined;
}

// -------------------------- main --------------------------

function setField<K extends keyof NormalizedPolicy>(
  out: NormalizedPolicy,
  logs: NormalizationLogEntry[],
  key: K,
  value: NormalizedPolicy[K] | undefined,
  sourcePath: string,
  raw: unknown,
) {
  if (value === undefined) {
    logs.push({
      field: key,
      source_path: sourcePath,
      status: isNotSpec(raw) ? "missing" : raw == null ? "missing" : "unparseable",
      raw: raw == null ? undefined : s(raw),
    });
    return;
  }
  out[key] = value;
  logs.push({
    field: key,
    source_path: sourcePath,
    status: "normalized",
    raw: raw == null ? undefined : s(raw),
    parsed: value as unknown,
  });
}

export function normalizePolicy(raw: PolicyJSON | null | undefined): NormalizationResult {
  const out: NormalizedPolicy = {};
  const logs: NormalizationLogEntry[] = [];
  const policy = (raw ?? {}) as PolicyJSON;
  const wp = (policy.waiting_periods ?? {}) as Record<string, unknown>;
  const cl = (policy.claim_intelligence ?? {}) as Record<string, unknown>;
  const cov = (policy.coverage_intelligence ?? {}) as Record<string, unknown>;
  const hw = (policy.hospital_workflow_intelligence ?? {}) as Record<string, unknown>;

  // --- waiting periods ---
  setField(out, logs, "initial_waiting_months", parseMonths(wp.initial_waiting_period), "waiting_periods.initial_waiting_period", wp.initial_waiting_period);
  setField(out, logs, "ped_waiting_months", parseMonths(wp.pre_existing_disease_waiting), "waiting_periods.pre_existing_disease_waiting", wp.pre_existing_disease_waiting);
  setField(out, logs, "specific_disease_waiting_months", parseMonths(wp.specific_disease_waiting), "waiting_periods.specific_disease_waiting", wp.specific_disease_waiting);

  const matRaw = wp.maternity_waiting_period;
  if (matRaw != null) {
    if (/not\s+covered|excluded/i.test(s(matRaw))) {
      setField(out, logs, "maternity_waiting_months", null, "waiting_periods.maternity_waiting_period", matRaw);
    } else {
      setField(out, logs, "maternity_waiting_months", parseMonths(matRaw), "waiting_periods.maternity_waiting_period", matRaw);
    }
  } else {
    logs.push({ field: "maternity_waiting_months", source_path: "waiting_periods.maternity_waiting_period", status: "missing" });
  }

  const dsw = parseDiseaseSpecificWaiting(wp.specific_disease_waiting);
  if (dsw) {
    out.disease_specific_waiting = dsw;
    logs.push({ field: "disease_specific_waiting", source_path: "waiting_periods.specific_disease_waiting", status: "normalized", parsed: dsw });
  }

  // --- claim intelligence ---
  setField(out, logs, "cashless_available", parseTriState(cl.cashless_available), "claim_intelligence.cashless_available", cl.cashless_available);
  setField(out, logs, "reimbursement_available", parseTriState(cl.reimbursement_available), "claim_intelligence.reimbursement_available", cl.reimbursement_available);
  setField(out, logs, "pre_auth_required", parseTriState(cl.pre_auth_required), "claim_intelligence.pre_auth_required", cl.pre_auth_required);

  const hrs = parseHours(s(cl.pre_auth_required));
  if (hrs.planned !== undefined) {
    out.pre_auth_window_hours_planned = hrs.planned;
    logs.push({ field: "pre_auth_window_hours_planned", source_path: "claim_intelligence.pre_auth_required", status: "normalized", parsed: hrs.planned, raw: s(cl.pre_auth_required) });
  }
  if (hrs.emergency !== undefined) {
    out.pre_auth_window_hours_emergency = hrs.emergency;
    logs.push({ field: "pre_auth_window_hours_emergency", source_path: "claim_intelligence.pre_auth_required", status: "normalized", parsed: hrs.emergency, raw: s(cl.pre_auth_required) });
  }

  setField(out, logs, "claim_submission_deadline_days", parseDays(cl.claim_submission_deadline), "claim_intelligence.claim_submission_deadline", cl.claim_submission_deadline);
  setField(out, logs, "claim_settlement_timeline_days", parseDays(cl.claim_settlement_timeline), "claim_intelligence.claim_settlement_timeline", cl.claim_settlement_timeline);

  // --- coverage intelligence ---
  setField(out, logs, "room_rent", parseRoomRent(cov.room_rent_limit), "coverage_intelligence.room_rent_limit", cov.room_rent_limit);
  setField(out, logs, "icu", parseRoomRent(cov.icu_limit), "coverage_intelligence.icu_limit", cov.icu_limit);
  setField(out, logs, "ambulance_limit", parseAmountLimit(cov.ambulance_cover), "coverage_intelligence.ambulance_cover", cov.ambulance_cover);
  setField(out, logs, "air_ambulance_limit", parseAmountLimit(cov.air_ambulance_cover), "coverage_intelligence.air_ambulance_cover", cov.air_ambulance_cover);

  setField(out, logs, "ayush_covered", parseTriState(cov.ayush_cover), "coverage_intelligence.ayush_cover", cov.ayush_cover);
  setField(out, logs, "ayush_limit", parseAmountLimit(cov.ayush_cover), "coverage_intelligence.ayush_cover", cov.ayush_cover);
  setField(out, logs, "daycare_covered", parseTriState(cov.daycare_procedures), "coverage_intelligence.daycare_procedures", cov.daycare_procedures);
  setField(out, logs, "daycare_limit", parseAmountLimit(cov.daycare_procedures), "coverage_intelligence.daycare_procedures", cov.daycare_procedures);
  setField(out, logs, "domiciliary_covered", parseTriState(cov.domiciliary_treatment), "coverage_intelligence.domiciliary_treatment", cov.domiciliary_treatment);

  setField(out, logs, "pre_hospitalization_days", parseDays(cov.pre_hospitalization_days), "coverage_intelligence.pre_hospitalization_days", cov.pre_hospitalization_days);
  setField(out, logs, "post_hospitalization_days", parseDays(cov.post_hospitalization_days), "coverage_intelligence.post_hospitalization_days", cov.post_hospitalization_days);

  // --- co-pay / deductible / sum insured ---
  const copayRaw = cov.copay ?? cov.co_pay ?? cov.copayment ?? (policy.policy_identity as Record<string, unknown> | undefined)?.copay;
  setField(out, logs, "copay_percent", parsePercent(copayRaw), "coverage_intelligence.copay", copayRaw);
  if (copayRaw != null && /senior|age|voluntary|optional|claim/i.test(s(copayRaw))) {
    out.copay_applies_to = s(copayRaw);
  }

  const deductibleRaw = cov.deductible ?? (policy.policy_identity as Record<string, unknown> | undefined)?.deductible;
  setField(out, logs, "deductible_inr", typeof parseINRAmount(deductibleRaw) === "number" ? (parseINRAmount(deductibleRaw) as number) : undefined, "coverage_intelligence.deductible", deductibleRaw);

  setField(out, logs, "sum_insured_options_inr", parseSumInsuredOptions(cov.sum_insured_options), "coverage_intelligence.sum_insured_options", cov.sum_insured_options);

  // --- hospital workflow ---
  setField(out, logs, "hospital_empanelment_required", parseTriState(hw.hospital_empanelment_required), "hospital_workflow_intelligence.hospital_empanelment_required", hw.hospital_empanelment_required);
  setField(out, logs, "government_authorization_required", parseTriState(hw.government_authorization_required), "hospital_workflow_intelligence.government_authorization_required", hw.government_authorization_required);
  setField(out, logs, "package_code_required", parseTriState(hw.package_code_required), "hospital_workflow_intelligence.package_code_required", hw.package_code_required);
  setField(out, logs, "tpa_required", parseTriState(hw.tpa_required), "hospital_workflow_intelligence.tpa_required", hw.tpa_required);

  // stats
  const stats = { normalized: 0, missing: 0, ambiguous: 0, unparseable: 0 };
  for (const l of logs) stats[l.status] += 1;

  return { normalized: out, logs, stats };
}

// Convenience: log a normalization run to console for ops visibility.
export function logNormalization(policyLabel: string, result: NormalizationResult) {
  const { stats, logs } = result;
  // eslint-disable-next-line no-console
  console.info(
    `[PolicyNormalizer] ${policyLabel} → normalized=${stats.normalized}, missing=${stats.missing}, unparseable=${stats.unparseable}`,
  );
  // eslint-disable-next-line no-console
  console.debug("[PolicyNormalizer] field log", logs);
}
