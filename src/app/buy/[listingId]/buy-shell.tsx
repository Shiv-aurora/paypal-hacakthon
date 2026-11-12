"use client";

import Link from "next/link";
import { useConfig } from "@/lib/client";
import type { Listing } from "@/lib/types";
import { BuyerApp } from "@/components/buyer-app";
import { PhoneFrame } from "@/components/phone";
import { Logo, ModeNote } from "@/components/ui";

// On a phone this is the app itself; on desktop it sits in a device frame.
export function BuyShell({ listing }: { listing: Listing }) {
  const config = useConfig();
  return (
    <main className="flex min-h-dvh flex-col items-center bg-desk md:py-8">
      <div className="mb-6 flex w-full max-w-[1100px] items-center justify-between px-6 max-md:hidden">
        <Link href="/">
          <Logo className="text-[17px]" />
        </Link>
        <ModeNote config={config} />
      </div>
      <PhoneFrame fullOnMobile>
        <BuyerApp listing={listing} config={config} />
      </PhoneFrame>
    </main>
  );
}
