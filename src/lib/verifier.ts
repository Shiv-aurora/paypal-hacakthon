import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { searchRecalls, type RecallCandidate } from "./recalls";
import type { LabelReading, Verdict } from "./types";

const MODEL = "claude-opus-5-5";

export const aiLive = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const LabelSchema = z.object({
  readable: z.boolean().describe("false if the photo does not show a legible product label"),
  brand: z.string(),
  productName: z.string(),
  modelNumber: z.string().describe("exact model / SKU / product number as printed, empty if absent"),
  manufactureDate: z.string().describe("manufacture date as printed, empty if absent"),
  productType: z.string().describe("plain-English product type, e.g. 'infant swing', 'stroller'"),
  searchTerms: z.array(z.string()).describe("1-3 short product-name search terms for a recall database"),
  notes: z.string().describe("anything relevant you could not fit above"),
});

const VerdictSchema = z.object({
  decision: z.enum(["recalled", "clear", "needs_review"]),
  confidence: z.number().describe("0 to 1"),
  headline: z.string().describe("6-10 word headline for the result screen"),
  explanation: z.string().describe("2-3 plain sentences for the buyer"),
  matchedRecallNumber: z.string().describe("CPSC recall number that covers this exact item, or empty"),
  callScript: z.string().describe("what the assistant says out loud on the follow-up call, 3-4 short sentences"),
  saferAlternatives: z.array(z.string()).describe("2-3 short, concrete suggestions"),
});

const READ_SYSTEM = `You read product labels from photos a buyer takes at a secondhand pickup.
Transcribe exactly what is printed: brand, product name, model or SKU number, and manufacture date.
Never guess a model number or date that is not visible. If the label is blurry, cropped or missing, set readable to false.`;

const MATCH_SYSTEM = `You decide whether a specific secondhand item is covered by a U.S. Consumer Product Safety Commission recall.
You get the label the buyer photographed and candidate recalls from the CPSC database.

Decide:
- "recalled": a candidate recall covers this exact item. The brand and product line match AND the model number / manufacture date fall inside the recall's scope (or the recall covers all models).
- "clear": no candidate plausibly covers this item. This means no recall was found in CPSC data, not a guarantee of safety, so say so honestly.
- "needs_review": the label is unreadable, or a recall covers some models of this product line and the label does not show enough to tell.

Model numbers matter. A recall of a brand's jogging stroller does not cover its city stroller.
Money is held by PayPal during the check: if recalled, the hold is released and the buyer pays nothing; if clear, the seller is paid; if needs review, the hold stays.
Write for a parent standing in someone's driveway: warm, calm, specific, no jargon.`;

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

async function readLabel(image: { data: string; mediaType: string }): Promise<LabelReading> {
  const res = await anthropic().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(LabelSchema) },
    system: READ_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: image.mediaType as "image/png" | "image/jpeg" | "image/webp",
              data: image.data,
            },
          },
          { type: "text", text: "Read this product label." },
        ],
      },
    ],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("Could not read the label");
  return res.parsed_output;
}

async function matchRecalls(reading: LabelReading, candidates: RecallCandidate[]) {
  const res = await anthropic().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(VerdictSchema) },
    system: MATCH_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Label the buyer photographed:\n${JSON.stringify(reading, null, 2)}\n\nCandidate CPSC recalls (${candidates.length}):\n${JSON.stringify(
          candidates.map((c) => ({ ...c, image: undefined, url: undefined })),
          null,
          2,
        )}`,
      },
    ],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("Could not reach a decision");
  return res.parsed_output;
}

export interface VerifyProgress {
  (step: "reading" | "searching" | "matching", detail: string, data?: { reading?: LabelReading; candidates?: number }): Promise<void> | void;
}

export async function verifyLabel(
  image: { data: string; mediaType: string },
  onProgress: VerifyProgress,
  sampleHint?: string,
): Promise<{ reading: LabelReading; recallsSearched: number; verdict: Verdict }> {
  if (!aiLive()) return scriptedVerify(onProgress, sampleHint);

  await onProgress("reading", "Reading the label with Claude");
  const reading = await readLabel(image);
  if (!reading.readable) {
    return { reading, recallsSearched: 0, verdict: unreadableVerdict() };
  }

  await onProgress("searching", `Searching CPSC recalls for ${reading.brand} ${reading.productName}`, { reading });
  const candidates = await searchRecalls(reading.brand, reading.searchTerms);

  await onProgress("matching", `Comparing model ${reading.modelNumber || "(none)"} against ${candidates.length} recalls`, { candidates: candidates.length });
  const raw = await matchRecalls(reading, candidates);
  const match = candidates.find((c) => c.recallNumber === raw.matchedRecallNumber);

  return {
    reading,
    recallsSearched: candidates.length,
    verdict: {
      decision: raw.decision,
      confidence: Math.max(0, Math.min(1, raw.confidence)),
      headline: raw.headline,
      explanation: raw.explanation,
      callScript: raw.callScript,
      saferAlternatives: raw.saferAlternatives,
      matchedRecall: match
        ? { recallNumber: match.recallNumber, title: match.title, date: match.date, url: match.url, hazard: match.hazard, remedy: match.remedy, image: match.image }
        : null,
    },
  };
}

function unreadableVerdict(): Verdict {
  return {
    decision: "needs_review",
    confidence: 0.9,
    headline: "We couldn't read that label",
    explanation: "The photo is too blurry to read the model number. Your money is still on hold, so nothing has been paid. Try another photo in better light.",
    matchedRecall: null,
    callScript: "Hi, it's Recallhold. We couldn't quite read that label, so your money is still safely on hold. Try one more photo in better light and we'll check it right away.",
    saferAlternatives: ["Retake the photo closer to the label", "Ask the seller where the model sticker is"],
  };
}

// --- Scripted verifier: used when no Anthropic key is configured -------------

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function scriptedVerify(onProgress: VerifyProgress, sampleHint?: string) {
  await onProgress("reading", "Reading the label (scripted demo mode)");
  await wait(900);
  if (sampleHint === "snuga") {
    const reading: LabelReading = {
      readable: true,
      brand: "Fisher-Price",
      productName: "Sweet Snugapuppy Swing",
      modelNumber: "DRG43",
      manufactureDate: "08/2019",
      productType: "infant swing",
      searchTerms: ["Snuga", "infant swing"],
      notes: "",
    };
    await onProgress("searching", "Searching CPSC recalls for Fisher-Price Sweet Snugapuppy Swing", { reading });
    const candidates = await searchRecalls(reading.brand, reading.searchTerms);
    await wait(500);
    await onProgress("matching", `Comparing model DRG43 against ${candidates.length} recalls`, { candidates: candidates.length });
    await wait(1100);
    const match = candidates.find((c) => c.recallNumber === "25009");
    return {
      reading,
      recallsSearched: candidates.length,
      verdict: {
        decision: "recalled" as const,
        confidence: 0.97,
        headline: "This swing is under an active recall",
        explanation:
          "Model DRG43 is one of the 21 Snuga Swing models Fisher-Price recalled in October 2024 because the headrest and body insert pose a suffocation risk. Your hold has been released, so you pay nothing.",
        matchedRecall: match
          ? { recallNumber: match.recallNumber, title: match.title, date: match.date, url: match.url, hazard: match.hazard, remedy: match.remedy, image: match.image }
          : null,
        callScript:
          "Hi, it's Recallhold calling about the swing you just scanned. Model DRG43 is part of an active Fisher-Price recall, so we released your payment and you won't be charged. If you still need a swing, I've sent you a few safer options.",
        saferAlternatives: ["A Snuga Swing with the headrest and insert removed per the recall notice", "A swing model not listed in recall 25009", "A bouncer that meets the current federal infant-sleep standard"],
      },
    };
  }
  if (sampleHint === "vista") {
    const reading: LabelReading = {
      readable: true,
      brand: "UPPAbaby",
      productName: "VISTA V2",
      modelNumber: "0920-VST-US",
      manufactureDate: "03/2023",
      productType: "stroller",
      searchTerms: ["Vista stroller", "stroller"],
      notes: "",
    };
    await onProgress("searching", "Searching CPSC recalls for UPPAbaby VISTA V2", { reading });
    const candidates = await searchRecalls(reading.brand, reading.searchTerms);
    await wait(500);
    await onProgress("matching", `Comparing model 0920-VST-US against ${candidates.length} recalls`, { candidates: candidates.length });
    await wait(1100);
    return {
      reading,
      recallsSearched: candidates.length,
      verdict: {
        decision: "clear" as const,
        confidence: 0.86,
        headline: "No recall covers this stroller",
        explanation:
          "UPPAbaby has three CPSC recalls, but they cover the RIDGE jogging stroller, RumbleSeat adapters and 2015 strollers, not a 2023 VISTA V2. The seller is being paid now.",
        matchedRecall: null,
        callScript: "Good news from Recallhold: we found no recall for this VISTA V2, so the seller has been paid. Enjoy the walks!",
        saferAlternatives: [],
      },
    };
  }
  await wait(800);
  return { reading: { readable: false, brand: "", productName: "", modelNumber: "", manufactureDate: "", productType: "", searchTerms: [], notes: "" }, recallsSearched: 0, verdict: unreadableVerdict() };
}
