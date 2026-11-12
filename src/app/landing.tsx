"use client";

import Link from "next/link";
import clsx from "clsx";
import { useState } from "react";
import type { Listing } from "@/lib/types";
import { useSampleImage } from "@/lib/labels";
import { Logo } from "@/components/ui";

// The 21 models in CPSC recall 25009 (Oct 10, 2024), from the recall's product table.
const SNUGA_MODELS = [
  "BGB32",
  "CCF38",
  "CHM56",
  "CHM69",
  "CHM76",
  "CHM78",
  "DRG43",
  "FKL21",
  "GJB53",
  "GKH44",
  "GNG38",
  "GNG40",
  "GVF83",
  "HBM23",
  "HDY10",
  "HGX49",
  "V0099",
  "W9510",
  "X7051",
  "X7345",
  "X7347",
];

const TIMELINES = {
  recalled: [
    ["2:14 pm", "Alex taps Hold $65 with PayPal", "$65.00 on hold"],
    [
      "2:40 pm",
      "Alex meets Dana and photographs the sticker",
      "$65.00 on hold",
    ],
    ["2:40 pm", "Model DRG43 matches CPSC recall 25009", "$65.00 on hold"],
    ["2:40 pm", "PayPal voids the authorization", "$0.00 charged"],
    [
      "2:41 pm",
      "Dana gets the recall notice and Fisher-Price's $25 refund offer",
      "nothing moved",
    ],
  ],
  fine: [
    ["2:14 pm", "Alex taps Hold $420 with PayPal", "$420.00 on hold"],
    [
      "2:40 pm",
      "Alex meets Marcus and photographs the sticker",
      "$420.00 on hold",
    ],
    [
      "2:40 pm",
      "No CPSC recall covers a 2023 UPPAbaby VISTA V2",
      "$420.00 on hold",
    ],
    ["2:40 pm", "PayPal captures the authorization", "$420.00 charged"],
    ["2:40 pm", "PayPal Payouts sends Marcus his money", "$407.40 to Marcus"],
  ],
} as const;

const QUESTIONS = [
  [
    "Is my money really not charged during the hold?",
    "Yes. The order is created with PayPal's AUTHORIZE intent, which reserves the amount without capturing it. It only becomes a charge if the label check clears.",
  ],
  [
    "What if the photo is blurry?",
    "Nothing moves. The hold stays in place and you're asked for another photo. Cleared won't guess a model number.",
  ],
  [
    "What if the seller doesn't show up?",
    "No check, no capture. The authorization expires and the money was never taken.",
  ],
  [
    "What can it check?",
    "Anything in the U.S. Consumer Product Safety Commission's recall database: swings, cribs, strollers, high chairs, helmets, toys, heaters. Car seats are recalled through NHTSA, which isn't connected yet.",
  ],
  [
    "Who reads the label?",
    "Claude reads the brand, model number and manufacture date from your photo, then compares them with the product list in each matching CPSC recall.",
  ],
];

const FEATURED = ["snuga-swing", "vista-v2", "bike-helmet"];
const order = (id: string) =>
  FEATURED.includes(id) ? FEATURED.indexOf(id) : FEATURED.length;

export function Landing({ listings }: { listings: Listing[] }) {
  const label = useSampleImage("snuga");
  const [tab, setTab] = useState<"recalled" | "fine">("recalled");

  return (
    <main className="text-ink">
      <header className="bg-yellow">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5">
          <Logo className="text-[20px]" />
          <nav className="hidden gap-7 text-[15px] font-medium md:flex">
            <a href="#money" className="hover:underline">
              How it works
            </a>
            <a href="#try" className="hover:underline">
              Try it
            </a>
            <Link href="/sell" className="hover:underline">
              Sell
            </Link>
            <Link href="/pitch" className="hover:underline">
              Slides
            </Link>
          </nav>
          <Link
            href="/demo"
            className="rounded-[6px] bg-ink px-4 py-2 text-[15px] font-semibold text-white hover:bg-black"
          >
            Open the demo
          </Link>
        </div>
      </header>

      <section className="bg-yellow">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
          <div>
            <h1 className="wide max-w-[680px] text-[48px] font-extrabold leading-[0.98] tracking-[-0.02em] sm:text-[64px]">
              Check the sticker before you pay.
            </h1>
            <p className="mt-7 max-w-[540px] text-[19px] leading-[1.5]">
              Cleared is a payment link for secondhand baby gear. The
              buyer&apos;s money sits on a PayPal hold until they photograph the
              product label at pickup. If that model is under a CPSC recall, the
              hold is cancelled and nobody pays.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/demo"
                className="rounded-[6px] bg-ink px-6 py-3.5 text-[16px] font-semibold text-white hover:bg-black"
              >
                Open the demo
              </Link>
              <Link
                href="/sell"
                className="rounded-[6px] border-2 border-ink px-6 py-3 text-[16px] font-semibold hover:bg-ink hover:text-white"
              >
                Sell something
              </Link>
            </div>
          </div>

          <figure className="self-center">
            <div className="relative">
              <div className="rotate-[-2deg] overflow-hidden rounded-[4px] bg-ink shadow-[0_24px_40px_-20px_rgba(0,0,0,0.5)]">
                {label ? (
                  <img
                    src={label}
                    alt="Model sticker reading Fisher-Price Sweet Snugapuppy Swing, model DRG43, made 08/2019"
                    className="block w-full"
                  />
                ) : (
                  <div className="aspect-[4/3]" />
                )}
              </div>
              <div className="absolute -bottom-6 right-4 max-w-[280px] rotate-[1deg] bg-ink px-4 py-3 text-white shadow-lg">
                <p className="font-mono text-[13px]">
                  DRG43 → CPSC recall 25009
                </p>
                <p className="mt-0.5 text-[13px] text-white/70">
                  Recalled Oct 10, 2024. Hold cancelled, $0 charged.
                </p>
              </div>
            </div>
            <figcaption className="mt-16 text-[13px] text-ink/60">
              Sample label used in the demo. The real sticker is under the
              swing&apos;s motor housing.
            </figcaption>
          </figure>
        </div>
      </section>
      <div className="hazard h-3" />

      <section className="mx-auto max-w-[1200px] px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="wide text-[34px] font-bold leading-[1.05] tracking-tight">
              21 swings. Only the sticker tells them apart.
            </h2>
            <p className="mt-5 text-[17px] leading-[1.6] text-ink-2">
              In October 2024 Fisher-Price recalled more than 2 million Snuga
              infant swings for a suffocation hazard. The recall covers 21 model
              numbers with different fabrics and toys. A buyer standing in
              someone&apos;s driveway has no way to know which one they&apos;re
              looking at without reading the label.
            </p>
            <div className="mt-7 flex flex-wrap gap-1.5 font-mono text-[13px]">
              {SNUGA_MODELS.map((m) => (
                <span
                  key={m}
                  className={clsx(
                    "rounded-[3px] px-2 py-1",
                    m === "DRG43" ? "bg-yellow font-semibold" : "bg-desk",
                  )}
                >
                  {m}
                </span>
              ))}
            </div>
            <p className="mt-4 text-[13px] text-ink-3">
              Model list and photos: U.S. CPSC,{" "}
              <a
                className="underline"
                href="https://www.cpsc.gov/Recalls/2025/Fisher-Price-Recalls-More-than-2-Million-Snuga-Infant-Swings-Due-to-Suffocation-Hazard-After-5-Deaths-Reported"
                target="_blank"
                rel="noreferrer"
              >
                recall 25009
              </a>
              .
            </p>
          </div>
          <div className="grid grid-cols-3 gap-px self-start border border-rule bg-rule">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white p-3">
                <img
                  src={`/cpsc/snuga-${i}.png`}
                  alt="A recalled Fisher-Price Snuga swing"
                  className="aspect-square w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="money" className="border-t border-rule bg-desk">
        <div className="mx-auto max-w-[1200px] px-6 py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="wide max-w-[620px] text-[34px] font-bold leading-[1.05] tracking-tight">
              Where the money is, minute by minute.
            </h2>
            <div className="flex gap-1 rounded-[6px] border border-ink bg-white p-1 text-[14px] font-semibold">
              {(["recalled", "fine"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={clsx(
                    "rounded-[4px] px-3 py-1.5",
                    tab === t ? "bg-ink text-white" : "hover:bg-desk",
                  )}
                >
                  {t === "recalled"
                    ? "The swing (recalled)"
                    : "The stroller (fine)"}
                </button>
              ))}
            </div>
          </div>
          <table className="mt-8 w-full border-collapse bg-white text-left">
            <thead>
              <tr className="border-b-2 border-ink text-[13px]">
                <th className="w-[110px] px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">What happens</th>
                <th className="w-[200px] px-4 py-3 text-right font-semibold">
                  Buyer&apos;s money
                </th>
              </tr>
            </thead>
            <tbody>
              {TIMELINES[tab].map(([time, what, money], i) => {
                const last = i === TIMELINES[tab].length - 1;
                return (
                  <tr
                    key={what}
                    className="border-b border-rule last:border-b-0"
                  >
                    <td className="px-4 py-3.5 font-mono text-[13px] text-ink-2">
                      {time}
                    </td>
                    <td className="px-4 py-3.5 text-[16px]">{what}</td>
                    <td
                      className={clsx(
                        "px-4 py-3.5 text-right font-mono text-[14px] font-semibold",
                        last
                          ? tab === "recalled"
                            ? "text-recall"
                            : "text-clear"
                          : "",
                      )}
                    >
                      {money}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-4 max-w-[760px] text-[14px] text-ink-2">
            PayPal does the holding, capturing, voiding and paying out (Orders
            v2 with intent=AUTHORIZE, Authorizations, Payouts). Cleared decides
            which of those to call, based on what&apos;s printed on the label.
          </p>
        </div>
      </section>

      <section id="try" className="mx-auto max-w-[1200px] px-6 py-20">
        <h2 className="wide text-[34px] font-bold tracking-tight">
          Try a listing
        </h2>
        <p className="mt-2 text-[17px] text-ink-2">
          Each one opens the buyer&apos;s side. On a phone you can use your
          camera on a real label.
        </p>
        <div className="mt-8 border-t-2 border-ink">
          {[...listings]
            .sort((a, b) => order(a.id) - order(b.id))
            .slice(0, 6)
            .map((l) => (
              <Link
                key={l.id}
                href={`/buy/${l.id}`}
                className="group flex items-center gap-5 border-b border-rule py-4 hover:bg-desk"
              >
                <img
                  src={l.photo}
                  alt=""
                  className="size-16 shrink-0 object-contain"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-semibold group-hover:underline">
                    {l.title}
                  </p>
                  <p className="text-[14px] text-ink-2">
                    {l.condition} · {l.location} · {l.sellerName}
                  </p>
                </div>
                <p className="font-mono text-[16px] font-semibold">
                  ${l.price}
                </p>
              </Link>
            ))}
        </div>
      </section>

      <section className="border-t border-rule">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-20 lg:grid-cols-[1fr_2fr]">
          <h2 className="wide text-[34px] font-bold tracking-tight">
            Questions
          </h2>
          <dl>
            {QUESTIONS.map(([q, a]) => (
              <div key={q} className="border-b border-rule py-5 first:pt-0">
                <dt className="text-[18px] font-semibold">{q}</dt>
                <dd className="mt-1.5 text-[16px] leading-[1.6] text-ink-2">
                  {a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <footer className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-8 text-[14px]">
          <Logo invert className="text-[17px]" />
          <p className="text-white/60">
            Made for the PayPal AI Hackathon, November 2026. Sandbox only; no
            real money moves.
          </p>
        </div>
      </footer>
    </main>
  );
}
