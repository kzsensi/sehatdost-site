// Procedure Master matching utilities.
// Provides search + best-match lookup against procedure_master.
// Pure functions: no Supabase calls here, so it stays unit-testable.

export type ProcedureMaster = {
  id: string;
  procedure_code: string;
  procedure_name: string;
  short_name: string | null;
  specialty: string | null;
  category: string | null;
  synonyms: string[];
  keywords: string[];
  inpatient_required: boolean;
  daycare_possible: boolean;
  status: string;
  icd_codes?: string[] | null;
  cpt_codes?: string[] | null;
  pmjay_package_code?: string | null;
  tpa_package_code?: string | null;
};

export type ProcedureMatch = {
  procedure: ProcedureMaster;
  score: number;
  matchedOn: "name" | "short_name" | "synonym" | "keyword" | "fuzzy";
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

function tokens(s: string): string[] {
  return norm(s).split(" ").filter((t) => t.length >= 3);
}

function tokenOverlap(a: string, b: string): number {
  const at = new Set(tokens(a));
  const bt = new Set(tokens(b));
  if (at.size === 0 || bt.size === 0) return 0;
  let common = 0;
  at.forEach((t) => bt.has(t) && common++);
  return common / Math.max(at.size, bt.size);
}

export function findBestProcedure(query: string, list: ProcedureMaster[]): ProcedureMatch | null {
  const q = norm(query);
  if (!q || list.length === 0) return null;

  let best: ProcedureMatch | null = null;
  const consider = (m: ProcedureMatch) => {
    if (!best || m.score > best.score) best = m;
  };

  for (const p of list) {
    if (p.status !== "active") continue;
    const nameN = norm(p.procedure_name);
    const shortN = p.short_name ? norm(p.short_name) : "";

    if (nameN === q) return { procedure: p, score: 1, matchedOn: "name" };
    if (shortN && shortN === q) return { procedure: p, score: 0.98, matchedOn: "short_name" };

    for (const syn of p.synonyms) {
      if (norm(syn) === q) return { procedure: p, score: 0.97, matchedOn: "synonym" };
    }

    if (nameN.includes(q) || q.includes(nameN)) consider({ procedure: p, score: 0.9, matchedOn: "name" });
    if (shortN && (shortN.includes(q) || q.includes(shortN))) consider({ procedure: p, score: 0.88, matchedOn: "short_name" });

    for (const syn of p.synonyms) {
      const s = norm(syn);
      if (s && (s.includes(q) || q.includes(s))) consider({ procedure: p, score: 0.85, matchedOn: "synonym" });
    }

    for (const kw of p.keywords) {
      const k = norm(kw);
      if (k && q.includes(k)) consider({ procedure: p, score: 0.7, matchedOn: "keyword" });
    }

    const overlap = Math.max(
      tokenOverlap(q, p.procedure_name),
      ...p.synonyms.map((s) => tokenOverlap(q, s)),
    );
    if (overlap >= 0.5) consider({ procedure: p, score: 0.5 + overlap * 0.2, matchedOn: "fuzzy" });
  }

  if (!best) return null;
  return (best as ProcedureMatch).score >= 0.5 ? best : null;
}

export function searchProcedures(query: string, list: ProcedureMaster[], limit = 20): ProcedureMaster[] {
  const q = norm(query);
  if (!q) return list.slice(0, limit);
  const scored: { p: ProcedureMaster; s: number }[] = [];
  for (const p of list) {
    const hay = [p.procedure_name, p.short_name ?? "", p.procedure_code, p.specialty ?? "", p.category ?? "", ...(p.synonyms ?? []), ...(p.keywords ?? [])]
      .map(norm)
      .join(" ");
    if (hay.includes(q)) scored.push({ p, s: 1 });
    else {
      const o = tokenOverlap(q, hay);
      if (o > 0.3) scored.push({ p, s: o });
    }
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.p);
}
