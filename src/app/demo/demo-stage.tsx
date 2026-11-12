"use client";

import { motion } from "motion/react";
import clsx from "clsx";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useConfig, useDeal, usd } from "@/lib/client";
import type { CheckEvent, DealStatus, Listing } from "@/lib/types";
import { BuyerApp } from "@/components/buyer-app";
import { SellerApp } from "@/components/seller-app";
import { AiPanel, emptyTrace, Ledger, reduceTrace, type AiTrace } from "@/components/ledger";
import { PhoneFrame } from "@/components/phone";
import { Logo, ModeNote } from "@/components/ui";

const SCENARIO_NAMES: Record<string, string> = { "snuga-swing": "Recalled swing", "vista-v2": "Safe stroller" };

// One screen, whole story: buyer phone, where the money is, seller phone.
// Everything is driven by real API calls against one shared deal.
export function DemoStage({ listings }: { listings: Listing[] }) {
  const config = useConfig();
  const [listingId, setListingId] = useState(listings[0]?.id);
  const [run, setRun] = useState(0);
  const [dealId, setDealId] = useState<string | null>(null);
  const [trace, setTrace] = useState<AiTrace>(emptyTrace);
  const data = useDeal(dealId);
  const listing = listings.find((l) => l.id === listingId)!;

  const reset = (id = listingId) => {
    setListingId(id);
    setDealId(null);
    setTrace(emptyTrace);
    setRun((r) => r + 1);
  };
  const onCheckEvent = useCallback((e: CheckEvent) => setTrace((t) => reduceTrace(t, e)), []);

  return (
    <main className="min-h-dvh bg-desk">
      <header className="border-b border-rule bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-8 gap-y-3 px-6 py-3.5">
          <Link href="/">
            <Logo className="text-[17px]" />
          </Link>
          <nav className="flex gap-1 text-[14px]">
            {listings.map((l) => (
              <button
                key={l.id}
                onClick={() => reset(l.id)}
                className={clsx("rounded-[5px] px-3 py-1.5 font-semibold", l.id === listingId ? "bg-ink text-white" : "text-ink-2 hover:bg-desk")}
              >
                {SCENARIO_NAMES[l.id] ?? l.title}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-5 text-[14px] font-semibold">
            <button onClick={() => reset()} className="underline decoration-rule underline-offset-4 hover:decoration-ink">
              Start over
            </button>
            <Link href="/pitch" className="underline decoration-rule underline-offset-4 hover:decoration-ink">
              Slides
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1280px] grid-cols-1 items-start justify-items-center gap-10 px-6 py-8 lg:grid-cols-[auto_1fr_auto] lg:justify-items-stretch">
        <PhoneFrame label="Buyer (Alex)">
          <BuyerApp key={`${listingId}-${run}`} listing={listing} config={config} onDeal={setDealId} onCheckEvent={onCheckEvent} />
        </PhoneFrame>

        <div className="w-full max-w-[400px] justify-self-center pt-7">
          <p className="text-[15px] leading-snug text-ink-2">
            Tap through the buyer&apos;s phone. The seller&apos;s phone and the panels below read the same deal from the server.
          </p>
          <WhereIsTheMoney status={data?.deal.status} amount={data?.deal.amount ?? listing.price} payout={data?.deal.payoutAmount} />
          <div className="mt-4 space-y-4">
            <AiPanel trace={trace} live={config?.ai === "live"} />
            <Ledger deal={data?.deal ?? null} simulated={config?.paypal !== "live"} />
          </div>
          <ModeNote config={config} className="mt-4" />
        </div>

        <PhoneFrame label={`Seller (${listing.sellerName})`}>
          <SellerApp listing={listing} deal={data?.deal ?? null} />
        </PhoneFrame>
      </section>
    </main>
  );
}

// Three boxes; the money sits in whichever one actually holds it.
function WhereIsTheMoney({ status, amount, payout }: { status?: DealStatus; amount: number; payout?: number }) {
  const at = !status || status === "awaiting_payment" || status === "refunded" ? 0 : status === "paid_out" || status === "cleared" ? 2 : 1;
  const cells = ["Buyer", "PayPal hold", "Seller"];
  const value = at === 2 && payout ? payout : amount;
  const caption =
    !status || status === "awaiting_payment"
      ? "Nothing has moved yet."
      : status === "held" || status === "checking"
        ? "PayPal is holding it. Not charged, not paid."
        : status === "refunded"
          ? "Recall found. Hold voided; it never left the buyer."
          : status === "needs_review"
            ? "Label unreadable. Still on hold."
            : `Captured and paid out (${usd(amount - value)} fee).`;
  return (
    <div className="mt-5">
      <h3 className="text-[14px] font-bold">Where the money is</h3>
      <div className="mt-2 grid grid-cols-3 overflow-hidden rounded-[6px] border border-ink bg-white">
        {cells.map((c, i) => (
          <div key={c} className={clsx("relative h-[74px] px-3 py-2", i > 0 && "border-l border-ink")}>
            {i === at && <motion.div layoutId="money-cell" className={clsx("absolute inset-0", status === "refunded" ? "bg-[#fde7e5]" : at === 2 ? "bg-[#dff2e6]" : "bg-yellow")} transition={{ type: "spring", damping: 30, stiffness: 260 }} />}
            <p className="relative text-[12px] font-semibold text-ink-2">{c}</p>
            {i === at && <p className="relative mt-1.5 font-mono text-[18px] font-semibold">{usd(value)}</p>}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[13px] text-ink-2">{caption}</p>
    </div>
  );
}
