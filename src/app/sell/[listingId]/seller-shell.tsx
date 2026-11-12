"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDeal, useOrigin } from "@/lib/client";
import type { Listing } from "@/lib/types";
import { PhoneFrame } from "@/components/phone";
import { SellerApp } from "@/components/seller-app";
import { Logo } from "@/components/ui";

export function SellerShell({ listing }: { listing: Listing }) {
  const [dealId, setDealId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const data = useDeal(dealId);
  const buyUrl = `${useOrigin()}/buy/${listing.id}`;

  // Follow the newest deal on this listing.
  useEffect(() => {
    const tick = () =>
      fetch(`/api/deals?listingId=${listing.id}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => setDealId(j.deals[0]?.id ?? null))
        .catch(() => {});
    tick();
    const t = setInterval(tick, 2000);
    return () => clearInterval(t);
  }, [listing.id]);

  return (
    <main className="flex min-h-dvh flex-col items-center bg-desk md:py-8">
      <div className="mb-6 flex w-full max-w-[1100px] items-center justify-between gap-6 px-6 max-md:hidden">
        <Link href="/">
          <Logo className="text-[17px]" />
        </Link>
        <button
          onClick={() => {
            navigator.clipboard.writeText(buyUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex min-w-0 items-center gap-3 rounded-[6px] border border-rule bg-white py-1.5 pl-3 pr-1.5 text-[13px]"
        >
          <span className="truncate font-mono">{buyUrl}</span>
          <span className="rounded-[4px] bg-yellow px-2.5 py-1 font-semibold">{copied ? "Copied" : "Copy buyer link"}</span>
        </button>
      </div>
      <PhoneFrame fullOnMobile>
        <SellerApp listing={listing} deal={data?.deal ?? null} />
      </PhoneFrame>
    </main>
  );
}
