import { jsPDF } from "jspdf";
import type { EligibilityResult, Patient, PolicyJSON } from "./eligibility-engine";

type PolicyMeta = {
  insurer_name: string;
  policy_name: string;
  uin_number: string;
  policy_type: string;
};

export type ReportInput = {
  hospital: string;
  patient: Patient;
  policy: PolicyMeta;
  policyData: PolicyJSON;
  eligibility: EligibilityResult;
};

const PRIMARY: [number, number, number] = [37, 99, 235];
const MUTED: [number, number, number] = [100, 116, 139];
const DARK: [number, number, number] = [15, 23, 42];

const s = (v: unknown) => (v == null || v === "" ? "Not Specified" : String(v));
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);

export function generateEligibilityPdf(input: ReportInput): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const ensure = (need: number) => {
    if (y + need > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Header bar
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(18);
  doc.text("SEHAT DOST AI", margin, 32);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text("Eligibility Verification Report", margin, 50);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, 32, { align: "right" });
  doc.text(`Hospital: ${input.hospital || "—"}`, pageW - margin, 50, { align: "right" });
  y = 90;

  // Decision banner
  const dec = input.eligibility.decision;
  const decColor: [number, number, number] =
    dec === "Eligible" ? [22, 163, 74] : dec === "Review Required" ? [217, 119, 6] : [220, 38, 38];
  doc.setFillColor(...decColor);
  doc.roundedRect(margin, y, pageW - margin * 2, 50, 8, 8, "F");
  doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(14);
  doc.text(dec.toUpperCase(), margin + 16, y + 22);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`${input.policy.insurer_name} — ${input.policy.policy_name}`, margin + 16, y + 38);
  y += 70;

  const heading = (label: string) => {
    ensure(30);
    doc.setTextColor(...PRIMARY).setFont("helvetica", "bold").setFontSize(12);
    doc.text(label, margin, y);
    doc.setDrawColor(...PRIMARY).setLineWidth(1);
    doc.line(margin, y + 4, pageW - margin, y + 4);
    y += 18;
    doc.setTextColor(...DARK).setFont("helvetica", "normal").setFontSize(10);
  };

  const kv = (rows: Array<[string, string]>) => {
    const colW = (pageW - margin * 2) / 2;
    rows.forEach(([k, v], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + col * colW;
      const yy = y + row * 32;
      ensure(40);
      doc.setTextColor(...MUTED).setFont("helvetica", "bold").setFontSize(8);
      doc.text(k.toUpperCase(), x, yy);
      doc.setTextColor(...DARK).setFont("helvetica", "normal").setFontSize(10);
      const lines = doc.splitTextToSize(v, colW - 12);
      doc.text(lines, x, yy + 14);
    });
    y += Math.ceil(rows.length / 2) * 32 + 6;
  };

  const bullets = (items: string[], opts?: { icon?: string; color?: [number, number, number] }) => {
    const icon = opts?.icon ?? "•";
    items.forEach((it) => {
      const lines = doc.splitTextToSize(it, pageW - margin * 2 - 16);
      ensure(lines.length * 13 + 6);
      if (opts?.color) doc.setTextColor(...opts.color);
      else doc.setTextColor(...DARK);
      doc.setFont("helvetica", "normal").setFontSize(10);
      doc.text(icon, margin, y + 10);
      doc.text(lines, margin + 14, y + 10);
      y += lines.length * 13 + 4;
    });
    y += 4;
    doc.setTextColor(...DARK);
  };

  // Patient
  heading("Patient Details");
  kv([
    ["Patient Name", s(input.patient.name)],
    ["Age", `${input.patient.age || "—"}`],
    ["Gender", s(input.patient.gender)],
    ["Procedure", s(input.patient.procedure)],
  ]);

  // Policy
  heading("Policy Details");
  kv([
    ["Insurer", s(input.policy.insurer_name)],
    ["Policy Name", s(input.policy.policy_name)],
    ["UIN Number", s(input.policy.uin_number)],
    ["Policy Type", s(input.policy.policy_type)],
  ]);

  // Decision reasoning
  heading("Decision Reasoning");
  input.eligibility.reasons.forEach((r) => {
    const sym = r.type === "pass" ? "[✓]" : r.type === "fail" ? "[✗]" : "[!]";
    const color: [number, number, number] =
      r.type === "pass" ? [22, 163, 74] : r.type === "fail" ? [220, 38, 38] : [217, 119, 6];
    const lines = doc.splitTextToSize(r.text, pageW - margin * 2 - 30);
    ensure(lines.length * 13 + 6);
    doc.setTextColor(...color).setFont("helvetica", "bold").setFontSize(10);
    doc.text(sym, margin, y + 10);
    doc.setTextColor(...DARK).setFont("helvetica", "normal");
    doc.text(lines, margin + 26, y + 10);
    y += lines.length * 13 + 4;
  });
  y += 6;

  // Scores
  heading("Risk & Documentation Scores");
  kv([
    ["Claim Risk Score", input.eligibility.claimRisk.score],
    ["Documentation Complexity", input.eligibility.docComplexity.score],
  ]);
  doc.setTextColor(...MUTED).setFontSize(9);
  doc.text("Claim Risk drivers:", margin, y); y += 12;
  doc.setTextColor(...DARK).setFontSize(9);
  bullets(input.eligibility.claimRisk.explanation, { icon: "·" });
  doc.setTextColor(...MUTED).setFontSize(9);
  doc.text("Documentation drivers:", margin, y); y += 12;
  doc.setTextColor(...DARK).setFontSize(9);
  bullets(input.eligibility.docComplexity.explanation, { icon: "·" });

  // Coverage
  const cov = (input.policyData.coverage_intelligence ?? {}) as Record<string, unknown>;
  heading("Coverage Intelligence");
  kv([
    ["Room Rent Limit", s(cov.room_rent_limit)],
    ["ICU Limit", s(cov.icu_limit)],
    ["Ambulance Cover", s(cov.ambulance_cover ?? cov.air_ambulance_cover)],
    ["AYUSH Cover", s(cov.ayush_cover)],
    ["Organ Donor Cover", s(cov.organ_donor_cover)],
    ["Daycare Procedures", s(cov.daycare_procedures)],
  ]);

  // Waiting
  const wp = (input.policyData.waiting_periods ?? {}) as Record<string, unknown>;
  heading("Waiting Period Intelligence");
  kv([
    ["Initial Waiting Period", s(wp.initial_waiting_period)],
    ["Pre-Existing Disease", s(wp.pre_existing_disease_waiting)],
    ["Specific Disease", s(wp.specific_disease_waiting)],
    ["Maternity", s(wp.maternity_waiting_period)],
  ]);

  // Claim intelligence
  const cl = (input.policyData.claim_intelligence ?? {}) as Record<string, unknown>;
  heading("Claim Intelligence");
  kv([
    ["Cashless Available", s(cl.cashless_available)],
    ["Reimbursement Available", s(cl.reimbursement_available)],
    ["Pre-Authorization Required", s(cl.pre_auth_required)],
    ["Submission Deadline", s(cl.claim_submission_deadline)],
  ]);

  // Benefits
  const benefits = arr(input.policyData.benefits);
  if (benefits.length) {
    heading(`Benefits (${benefits.length})`);
    bullets(benefits.slice(0, 20));
  }

  // Exclusions
  const exclusions = arr(input.policyData.exclusions);
  if (exclusions.length) {
    heading(`Exclusions (${exclusions.length})`);
    bullets(exclusions.slice(0, 20), { color: [185, 28, 28] });
  }

  // Required documents
  const docs = arr(input.policyData.mandatory_documents);
  heading("Required Documents");
  if (docs.length) bullets(docs);
  else {
    doc.setTextColor(...MUTED).setFontSize(10);
    doc.text("Document list not specified — collect standard claim documents.", margin, y + 10);
    y += 24;
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(...MUTED).setFontSize(8);
    doc.text(
      `SEHAT DOST AI · Simplifying Claims. Amplifying Care. · Page ${i} of ${pageCount}`,
      pageW / 2,
      pageH - 20,
      { align: "center" },
    );
  }

  return doc;
}
