"use client";

import { motion } from "motion/react";
import clsx from "clsx";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useConfig, useDeal, usd } from "@/lib/client";
import type { CheckEvent, DealStatus, Listing } from "@/lib/types";
import { BuyerApp, type Screen } from "@/components/buyer-app";
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
  const [screen, setScreen] = useState<Screen>("listing");
  const data = useDeal(dealId);
  const listing = listings.find((l) => l.id === listingId)!;

  const reset = (id = listingId) => {
    setListingId(id);
    setDealId(null);
    setTrace(emptyTrace);
    setScreen("listing");
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

      <Guide screen={screen} status={data?.deal.status} listing={listing} other={listings.find((l) => l.id !== listingId)} onSwitch={reset} />

      <section className="mx-auto grid max-w-[1280px] grid-cols-1 items-start justify-items-center gap-10 px-6 py-8 lg:grid-cols-[auto_1fr_auto] lg:justify-items-stretch">
        <PhoneFrame
          highlight={screen !== "checking" && screen !== "result"}
          label={<Role tag="Buyer" who={`Alex, picking up the ${itemNoun(listing)}`} note="You tap this phone" />}
        >
          <BuyerApp key={`${listingId}-${run}`} listing={listing} config={config} onDeal={setDealId} onCheckEvent={onCheckEvent} onScreen={setScreen} />
        </PhoneFrame>

        <div className="w-full max-w-[400px] justify-self-center pt-7">
          <WhereIsTheMoney status={data?.deal.status} amount={data?.deal.amount ?? listing.price} payout={data?.deal.payoutAmount} />
          <div className="mt-4 space-y-4">
            <AiPanel trace={trace} live={config?.ai === "live"} />
            <Ledger deal={data?.deal ?? null} simulated={config?.paypal !== "live"} />
          </div>
          <ModeNote config={config} className="mt-4" />
        </div>

        <PhoneFrame label={<Role tag="Seller" who={`${listing.sellerName}, who listed it for ${usd(listing.price)}`} note="Updates on its own" />}>
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
    <div>
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

const itemNoun = (l: Listing) => (l.category === "sleeper" ? "swing" : l.category === "stroller" ? "stroller" : "item");

function Role({ tag, who, note }: { tag: string; who: string; note: string }) {
  return (
    <div className="w-[360px]">
      <p className="flex items-center gap-2">
        <span className="rounded-[4px] bg-ink px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide text-white">{tag}</span>
        <span className="text-[13px] text-ink-3">{note}</span>
      </p>
      <p className="mt-1 text-[16px] font-semibold">{who}</p>
    </div>
  );
}

const STEPS = ["Buyer pays into a hold", "Pickup: photograph the sticker", "Claude checks CPSC recalls", "PayPal moves the money"];

// Tells the viewer what just happened and what to tap next.
function Guide({ screen, status, listing, other, onSwitch }: { screen: Screen; status?: DealStatus; listing: Listing; other?: Listing; onSwitch: (id: string) => void }) {
  const sample = listing.category === "sleeper" ? "Infant swing" : "Stroller";
  let step = 0;
  let title = "";
  let action: React.ReactNode = null;
  if (screen === "listing") {
    title = `The buyer pays ${usd(listing.price)}, but PayPal only holds it. Nothing is charged yet.`;
    action = <>← Tap <b>Hold {usd(listing.price)} with PayPal</b> on the buyer&apos;s phone</>;
  } else if (screen === "held") {
    step = 1;
    title = `The money is on hold. ${listing.sellerName} can see it on the right, but can't touch it.`;
    action = <>← Tap <b>I&apos;m at pickup</b> on the buyer&apos;s phone</>;
  } else if (screen === "scan") {
    step = 1;
    title = `At pickup, the buyer photographs the model sticker on the ${itemNoun(listing)}.`;
    action = <>← Tap the <b>{sample}</b> sample label{listing.category === "sleeper" ? " (model DRG43)" : ""}</>;
  } else if (screen === "checking" || !status || status === "checking" || status === "held") {
    step = 2;
    title = "Claude reads the model number and date, then compares them with every matching CPSC recall.";
    action = <>Watch the middle column →</>;
  } else {
    step = 3;
    if (status === "refunded") {
      title = `Recalled. PayPal voided the hold, so the buyer paid $0 and ${listing.sellerName} never received money for a recalled ${itemNoun(listing)}.`;
      action = <>Answer the call on the buyer&apos;s phone{other && <>, then <SwitchButton onClick={() => onSwitch(other.id)}>try the safe {itemNoun(other)} →</SwitchButton></>}</>;
    } else if (status === "needs_review") {
      title = "The label couldn't be read, so nothing moved. The hold stays until there's a clear photo.";
      action = <>Take another photo on the buyer&apos;s phone</>;
    } else {
      title = `No recall covers this ${itemNoun(listing)}. PayPal captured the hold and paid ${listing.sellerName} on the spot.`;
      action = other ? <SwitchButton onClick={() => onSwitch(other.id)}>Now try the recalled {itemNoun(other)} →</SwitchButton> : null;
    }
  }
  const done = step === 3;
  const tone = done ? (status === "refunded" ? "bg-recall text-white" : status === "needs_review" ? "bg-yellow" : "bg-clear text-white") : "bg-yellow";
  return (
    <div className={clsx("transition-colors duration-500", tone)}>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-10 gap-y-3 px-6 py-4">
        <ol className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <li key={s} title={s} className={clsx("h-2 w-10 rounded-full", i <= step ? (done ? "bg-white" : "bg-ink") : done ? "bg-white/35" : "bg-ink/20")} />
          ))}
        </ol>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[12px] opacity-75">
            Step {step + 1} of 4 · {STEPS[step]}
          </p>
          <motion.p key={title} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-[18px] font-semibold leading-snug">
            {title}
          </motion.p>
        </div>
        {action && <p className="text-[15px]">{action}</p>}
      </div>
    </div>
  );
}

function SwitchButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="rounded-[5px] bg-white px-3 py-1.5 font-semibold text-ink hover:bg-ink hover:text-white">
      {children}
    </button>
  );
}
