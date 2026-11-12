"use client";

import { motion } from "motion/react";
import clsx from "clsx";
import { AnimatedNumber } from "./ui";

export type MoneyState = "held" | "checking" | "captured" | "paid_out" | "released";

const STATUS: Record<MoneyState, { chip: string; chipClass: string; line: string }> = {
  held: { chip: "On hold", chipClass: "bg-yellow text-black", line: "Authorized, not charged" },
  checking: { chip: "On hold", chipClass: "bg-yellow text-black", line: "Still held while the label is checked" },
  captured: { chip: "Captured", chipClass: "bg-clear text-white", line: "Charged after the item cleared" },
  paid_out: { chip: "Paid to seller", chipClass: "bg-clear text-white", line: "Sent with PayPal Payouts" },
  released: { chip: "Released", chipClass: "bg-recall text-white", line: "Hold voided. You were not charged." },
};

// Shows where the buyer's money actually is. It never says "paid" before PayPal captures.
export function MoneyCard({ amount, state, payout, reference, className }: { amount: number; state: MoneyState; payout?: number; reference?: string; className?: string }) {
  const s = STATUS[state];
  const shown = state === "released" ? 0 : state === "paid_out" && payout ? payout : amount;
  return (
    <div className={clsx("rounded-[14px] bg-white px-4 pb-3.5 pt-3", className)}>
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-semibold text-[#003087]">PayPal</span>
        <motion.span key={s.chip} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={clsx("rounded-[5px] px-2 py-0.5 text-[12px] font-semibold", s.chipClass)}>
          {s.chip}
        </motion.span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <AnimatedNumber value={shown} className="text-[38px] font-semibold leading-none tracking-tight" />
        {state === "released" && <span className="text-[15px] text-black/40 line-through">${amount.toFixed(2)}</span>}
      </div>
      <p className="mt-1.5 text-[13px] text-black/55">{s.line}</p>
      {state === "checking" && (
        <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-black/8">
          <motion.div className="h-full w-1/4 bg-black" animate={{ x: ["-100%", "400%"] }} transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }} />
        </div>
      )}
      {reference && <p className="mt-2.5 border-t border-dashed border-black/15 pt-2 font-mono text-[11px] text-black/45">{reference}</p>}
    </div>
  );
}
