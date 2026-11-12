import type { RecallSummary } from "./types";

// U.S. Consumer Product Safety Commission public recall API (no key needed).
const CPSC = "https://www.saferproducts.gov/RestWebServices/Recall";

interface CpscRecall {
  RecallNumber: string;
  RecallDate: string;
  Title: string;
  URL: string;
  Description: string;
  Products: { Name: string; Model: string; NumberOfUnits: string }[];
  Hazards: { Name: string }[];
  Remedies: { Name: string }[];
  Manufacturers: { Name: string }[];
  Images: { URL: string }[];
}

export interface RecallCandidate extends RecallSummary {
  description: string;
  products: string;
  manufacturers: string;
}

async function query(params: Record<string, string>): Promise<CpscRecall[]> {
  const qs = new URLSearchParams({ format: "json", ...params });
  try {
    const res = await fetch(`${CPSC}?${qs}`, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return [];
    return (await res.json()) as CpscRecall[];
  } catch {
    return [];
  }
}

function toCandidate(r: CpscRecall): RecallCandidate {
  return {
    recallNumber: r.RecallNumber,
    title: r.Title,
    date: r.RecallDate.slice(0, 10),
    url: r.URL,
    hazard: r.Hazards.map((h) => h.Name).join(" "),
    remedy: r.Remedies.map((h) => h.Name).join(" ").slice(0, 600),
    image: r.Images[0]?.URL,
    description: r.Description.slice(0, 2500),
    products: r.Products.map((p) => [p.Name, p.Model, p.NumberOfUnits].filter(Boolean).join(" | ")).join("; "),
    manufacturers: r.Manufacturers.map((m) => m.Name).join("; "),
  };
}

/** Search CPSC by brand (title + manufacturer) and by product terms; dedupe and rank by recency. */
export async function searchRecalls(brand: string, terms: string[]): Promise<RecallCandidate[]> {
  const searches: Record<string, string>[] = [];
  if (brand) {
    searches.push({ RecallTitle: brand }, { Manufacturer: brand });
  }
  for (const term of terms.slice(0, 4)) searches.push({ ProductName: term });

  const results = (await Promise.all(searches.map(query))).flat();
  const byNumber = new Map<string, CpscRecall>();
  for (const r of results) byNumber.set(r.RecallNumber, r);

  const brandLower = brand.toLowerCase();
  return [...byNumber.values()]
    .sort((a, b) => {
      const aBrand = a.Title.toLowerCase().includes(brandLower) ? 1 : 0;
      const bBrand = b.Title.toLowerCase().includes(brandLower) ? 1 : 0;
      return bBrand - aBrand || b.RecallDate.localeCompare(a.RecallDate);
    })
    .slice(0, 25)
    .map(toCandidate);
}
