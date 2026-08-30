// Disease Master matching utilities — mirror of procedure-match.
export type DiseaseMaster = {
  id: string;
  disease_code: string;
  disease_name: string;
  short_name: string | null;
  specialty: string | null;
  category: string | null;
  synonyms: string[];
  keywords: string[];
  icd10_code: string | null;
  chronic_flag: boolean;
  critical_illness_flag: boolean;
  status: string;
};

export type DiseaseMatch = {
  disease: DiseaseMaster;
  score: number;
  matchedOn: "name" | "short_name" | "synonym" | "keyword" | "icd10" | "fuzzy";
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s: string) => norm(s).split(" ").filter((t) => t.length >= 3);

function tokenOverlap(a: string, b: string): number {
  const at = new Set(tokens(a));
  const bt = new Set(tokens(b));
  if (at.size === 0 || bt.size === 0) return 0;
  let common = 0;
  at.forEach((t) => bt.has(t) && common++);
  return common / Math.max(at.size, bt.size);
}

export function findBestDisease(query: string, list: DiseaseMaster[]): DiseaseMatch | null {
  const q = norm(query);
  if (!q || list.length === 0) return null;
  let best: DiseaseMatch | null = null;
  const consider = (m: DiseaseMatch) => { if (!best || m.score > best.score) best = m; };

  for (const d of list) {
    if (d.status !== "active") continue;
    const nameN = norm(d.disease_name);
    const shortN = d.short_name ? norm(d.short_name) : "";

    if (nameN === q) return { disease: d, score: 1, matchedOn: "name" };
    if (shortN && shortN === q) return { disease: d, score: 0.98, matchedOn: "short_name" };
    if (d.icd10_code && norm(d.icd10_code) === q) return { disease: d, score: 0.97, matchedOn: "icd10" };
    for (const syn of d.synonyms) {
      if (norm(syn) === q) return { disease: d, score: 0.96, matchedOn: "synonym" };
    }

    if (nameN.includes(q) || q.includes(nameN)) consider({ disease: d, score: 0.9, matchedOn: "name" });
    if (shortN && (shortN.includes(q) || q.includes(shortN))) consider({ disease: d, score: 0.88, matchedOn: "short_name" });
    for (const syn of d.synonyms) {
      const s = norm(syn);
      if (s && (s.includes(q) || q.includes(s))) consider({ disease: d, score: 0.85, matchedOn: "synonym" });
    }
    for (const kw of d.keywords) {
      const k = norm(kw);
      if (k && q.includes(k)) consider({ disease: d, score: 0.7, matchedOn: "keyword" });
    }
    const overlap = Math.max(tokenOverlap(q, d.disease_name), ...d.synonyms.map((s) => tokenOverlap(q, s)));
    if (overlap >= 0.5) consider({ disease: d, score: 0.5 + overlap * 0.2, matchedOn: "fuzzy" });
  }

  if (!best) return null;
  return (best as DiseaseMatch).score >= 0.5 ? best : null;
}

export function searchDiseases(query: string, list: DiseaseMaster[], limit = 20): DiseaseMaster[] {
  const q = norm(query);
  if (!q) return list.slice(0, limit);
  const scored: { d: DiseaseMaster; s: number }[] = [];
  for (const d of list) {
    const hay = [d.disease_name, d.short_name ?? "", d.disease_code, d.icd10_code ?? "", d.specialty ?? "", d.category ?? "", ...(d.synonyms ?? []), ...(d.keywords ?? [])]
      .map(norm).join(" ");
    if (hay.includes(q)) scored.push({ d, s: 1 });
    else {
      const o = tokenOverlap(q, hay);
      if (o > 0.3) scored.push({ d, s: o });
    }
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.d);
}
