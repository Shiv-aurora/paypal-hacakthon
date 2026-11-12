"use client";

import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { usd } from "@/lib/client";
import type { Deal, Listing } from "@/lib/types";
import { AnimatedNumber, Logo } from "./ui";

const FEE = 0.03;

function notificationFor(deal: Deal, listing: Listing): { title: string; body: string } | null {
  const item = listing.title.split(" ").slice(-1)[0].toLowerCase();
  switch (deal.status) {
    case "held":
      return { title: "Payment on hold", body: `${deal.buyerName} put ${usd(deal.amount)} on hold for your ${item}.` };
    case "checking":
      return { title: "Label check started", body: `${deal.buyerName} is photographing the sticker.` };
    case "paid_out":
      return { title: `You got ${usd(deal.payoutAmount ?? 0)}`, body: "Sent to your PayPal balance." };
    case "refunded":
      return { title: "Sale cancelled: recall", body: `This ${item} is in CPSC recall ${deal.verdict?.matchedRecall?.recallNumber ?? ""}. No money moved.` };
    case "needs_review":
      return { title: "Label unreadable", body: `${deal.buyerName} is taking another photo.` };
    default:
      return null;
  }
}

export function SellerApp({ listing, deal }: { listing: Listing; deal: Deal | null }) {
  const status = deal?.status;
  // One notification per status change; it hides itself after a few seconds.
  const key = deal ? `${deal.id}:${deal.status}` : null;
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => {
    if (!key) return;
    const t = setTimeout(() => setDismissed(key), 4000);
    return () => clearTimeout(t);
  }, [key]);
  const banner = deal && key !== dismissed ? notificationFor(deal, listing) : null;
  const payout = deal?.payoutAmount ?? Math.round(listing.price * (1 - FEE) * 100) / 100;

  return (
    <div className="relative h-full overflow-hidden bg-ios-bg">
      <AnimatePresence>
        {banner && (
          <motion.div
            key={key}
            initial={{ y: -110, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -110, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="absolute inset-x-2.5 top-11 z-30 flex gap-2.5 rounded-[20px] bg-[#f6f6f6]/95 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-yellow">
              <Logo className="text-[15px] [&>span]:hidden" />
            </span>
            <div className="min-w-0 text-[14px] leading-snug">
              <p className="flex justify-between gap-2 font-semibold">
                <span className="truncate">{banner.title}</span>
                <span className="shrink-0 text-[12px] font-normal text-black/40">now</span>
              </p>
              <p className="text-black/70">{banner.body}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-full overflow-y-auto pb-10 pt-[54px] scrollbar-none">
        <div className="flex items-center justify-between px-5">
          <Logo className="text-[16px]" />
          <span className="text-[13px] text-black/45">Selling</span>
        </div>

        <div className="mx-4 mt-3 flex items-center gap-3 rounded-[12px] bg-white p-3">
          <img src={listing.photo} alt="" className="size-14 rounded-[8px] object-contain" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{listing.title}</p>
            <p className="text-[13px] text-black/50">
              {usd(listing.price)} · {listing.location}
            </p>
          </div>
        </div>

        <div className="mx-4 mt-4">
          {(!status || status === "awaiting_payment") && (
            <Status tone="gray" title={status ? `${deal!.buyerName} is paying…` : "No buyer yet"} body="Buyers pay with a PayPal hold. You're paid at pickup, as soon as the label checks out." />
          )}
          {status === "held" && (
            <Status tone="yellow" title={`${usd(deal!.amount)} on hold for you`} body={`${deal!.buyerName}'s money is held by PayPal. You get it once the label checks out at pickup.`} />
          )}
          {status === "checking" && <Status tone="yellow" title="Checking the label" body={`${deal!.buyerName} photographed the sticker. Checking it against CPSC recalls now.`} />}
          {status === "needs_review" && <Status tone="yellow" title="One more photo" body="The label was too blurry to read. The hold stays in place." />}
          {(status === "paid_out" || status === "cleared") && (
            <div className="rounded-[12px] bg-white">
              <div className="px-4 pb-4 pt-3">
                <p className="text-[13px] text-black/50">Paid with PayPal Payouts</p>
                <p className="mt-1 text-[40px] font-semibold leading-none tracking-tight text-clear">
                  +<AnimatedNumber value={status === "paid_out" ? payout : 0} />
                </p>
                <p className="mt-1.5 text-[13px] text-black/50">to {listing.sellerPaypalEmail}</p>
              </div>
              <div className="border-t border-black/10 px-4 py-2.5 font-mono text-[12.5px] text-black/70">
                <Line k="Sale" v={usd(deal!.amount)} />
                <Line k="Recallhold fee 3%" v={`−${usd(deal!.amount - payout)}`} />
                <Line k="You get" v={usd(payout)} bold />
              </div>
            </div>
          )}
          {status === "refunded" && (
            <>
              <Status tone="red" title="Sale cancelled" body={`Your ${listing.title} matches CPSC recall ${deal?.verdict?.matchedRecall?.recallNumber ?? ""}. ${deal!.buyerName}'s hold was cancelled, so no money moved.`} />
              {deal?.verdict?.matchedRecall?.remedy && (
                <div className="mt-6">
                  <p className="px-4 pb-1.5 text-[13px] uppercase text-black/45">What the manufacturer offers you</p>
                  <p className="rounded-[12px] bg-white px-4 py-3 text-[14.5px] leading-snug">{deal.verdict.matchedRecall.remedy}</p>
                </div>
              )}
            </>
          )}
        </div>

        {deal && deal.events.length > 0 && (
          <div className="mt-6">
            <p className="px-8 pb-1.5 text-[13px] uppercase text-black/45">Activity</p>
            <div className="mx-4 overflow-hidden rounded-[12px] bg-white">
              {[...deal.events]
                .filter((e) => e.kind !== "ai")
                .reverse()
                .slice(0, 5)
                .map((e, i) => (
                  <div key={e.at + e.title} className={clsx("px-4 py-2.5", i > 0 && "border-t border-black/10")}>
                    <p className="flex justify-between gap-2 text-[14px]">
                      <span>{e.title}</span>
                      <span className="shrink-0 text-[12px] text-black/40">{new Date(e.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                    </p>
                    {e.detail && <p className="truncate font-mono text-[11px] text-black/45">{e.detail}</p>}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Status({ tone, title, body }: { tone: "gray" | "yellow" | "red"; title: string; body: string }) {
  return (
    <div className={clsx("rounded-[12px] px-4 py-3.5", tone === "red" ? "bg-recall text-white" : tone === "yellow" ? "bg-yellow" : "bg-white")}>
      <p className="text-[20px] font-bold leading-tight tracking-tight">{title}</p>
      <p className={clsx("mt-1 text-[14.5px] leading-snug", tone === "red" ? "text-white/90" : "text-black/65")}>{body}</p>
    </div>
  );
}

function Line({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <p className={clsx("flex justify-between py-0.5", bold && "font-semibold text-black")}>
      <span>{k}</span>
      <span>{v}</span>
    </p>
  );
}
