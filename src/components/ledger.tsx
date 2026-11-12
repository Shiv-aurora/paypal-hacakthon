"use client";

import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import type { CheckEvent, Deal, LabelReading, Verdict } from "@/lib/types";
import { usd } from "@/lib/client";

interface Call {
  key: string;
  path: string;
  result: string;
  tone: "neutral" | "good" | "bad";
}

// Every PayPal call the deal has made, derived from the IDs PayPal returned,
// so this panel can only show what actually happened.
function paypalCalls(deal: Deal | null): Call[] {
  if (!deal) return [];
  const rows: Call[] = [];
  if (deal.paypalOrderId) rows.push({ key: "order", path: "POST /v2/checkout/orders", result: `intent=AUTHORIZE → ${deal.paypalOrderId}`, tone: "neutral" });
  if (deal.authorizationId) rows.push({ key: "auth", path: "POST /v2/checkout/orders/:id/authorize", result: `${usd(deal.amount)} held → ${deal.authorizationId}`, tone: "neutral" });
  if (deal.status === "refunded") rows.push({ key: "void", path: "POST /v2/payments/authorizations/:id/void", result: "VOIDED · buyer charged $0.00", tone: "bad" });
  if (deal.captureId) rows.push({ key: "capture", path: "POST /v2/payments/authorizations/:id/capture", result: `COMPLETED ${usd(deal.amount)} → ${deal.captureId}`, tone: "good" });
  if (deal.payoutBatchId) rows.push({ key: "payout", path: "POST /v1/payments/payouts", result: `${usd(deal.payoutAmount ?? 0)} to seller → ${deal.payoutBatchId}`, tone: "good" });
  return rows;
}

export interface AiTrace {
  reading: LabelReading | null;
  candidates: number | null;
  verdict: Verdict | null;
  started: boolean;
}

export const emptyTrace: AiTrace = { reading: null, candidates: null, verdict: null, started: false };

export function reduceTrace(t: AiTrace, e: CheckEvent): AiTrace {
  if (e.type === "step") return { ...t, started: true, reading: e.reading ?? t.reading, candidates: e.candidates ?? t.candidates };
  if (e.type === "verdict") return { ...t, started: true, reading: e.reading, candidates: e.recallsSearched, verdict: e.verdict };
  return t;
}

export function Ledger({ deal, simulated }: { deal: Deal | null; simulated: boolean }) {
  const rows = paypalCalls(deal);
  return (
    <Panel title="PayPal" note={simulated ? "simulated" : "sandbox"}>
      {rows.length === 0 && <Empty>No calls yet.</Empty>}
      <AnimatePresence initial={false}>
        {rows.map((r) => (
          <motion.div key={r.key} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="border-t border-rule px-4 py-2 first:border-t-0">
            <p className="truncate text-ink">{r.path}</p>
            <p className={clsx("truncate", r.tone === "good" ? "text-clear" : r.tone === "bad" ? "text-recall" : "text-ink-2")}>{r.result}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </Panel>
  );
}

export function AiPanel({ trace, live }: { trace: AiTrace; live: boolean }) {
  const { reading, candidates, verdict } = trace;
  const rows: [string, React.ReactNode][] = [];
  if (reading) rows.push([live ? "Claude · read label" : "read label (scripted)", reading.readable ? `${reading.brand} / ${reading.modelNumber || "no model"} / ${reading.manufactureDate || "no date"}` : "unreadable"]);
  if (candidates != null) rows.push(["CPSC · recall search", `${candidates} candidate recalls`]);
  if (verdict)
    rows.push([
      live ? "Claude · match" : "match (scripted)",
      <span key="v" className={verdict.decision === "recalled" ? "text-recall" : verdict.decision === "clear" ? "text-clear" : "text-hold"}>
        {verdict.decision.replace("_", " ")} · {Math.round(verdict.confidence * 100)}%{verdict.matchedRecall ? ` · recall ${verdict.matchedRecall.recallNumber}` : ""}
      </span>,
    ]);
  return (
    <Panel title="Label check" note={live ? "claude-opus-5-5" : "scripted"}>
      {rows.length === 0 && <Empty>{trace.started ? "Reading the label…" : "Waiting for a photo."}</Empty>}
      {rows.map(([k, v]) => (
        <motion.div key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-rule px-4 py-2 first:border-t-0">
          <p className="text-ink-3">{k}</p>
          <p className="truncate text-ink">{v}</p>
        </motion.div>
      ))}
    </Panel>
  );
}

function Panel({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[6px] border border-rule bg-white">
      <header className="flex items-baseline justify-between border-b border-ink px-4 py-2">
        <h3 className="text-[14px] font-bold">{title}</h3>
        <span className="font-mono text-[11px] text-ink-3">{note}</span>
      </header>
      <div className="font-mono text-[12px] leading-[1.5]">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-3 text-ink-3">{children}</p>;
}
