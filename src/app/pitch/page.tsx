"use client";

import { AnimatePresence, motion, type Variants } from "motion/react";
import Link from "next/link";
import clsx from "clsx";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Logo } from "@/components/ui";

// Each slide reveals its parts in order; nothing else moves.
const seq: Variants = { show: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } } };
const item: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 1, 0.5, 1] } } };

type Tone = "yellow" | "white" | "ink";

interface SlideDef {
  tone: Tone;
  body: React.ReactNode;
}

const H = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <motion.h2 variants={item} className={clsx("wide max-w-[1000px] text-[64px] font-extrabold leading-[1] tracking-[-0.02em]", className)}>
    {children}
  </motion.h2>
);
const P = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <motion.p variants={item} className={clsx("mt-6 max-w-[760px] text-[22px] leading-[1.45]", className)}>
    {children}
  </motion.p>
);

const SLIDES: SlideDef[] = [
  {
    tone: "yellow",
    body: (
      <>
        <motion.div variants={item}>
          <Logo className="text-[26px]" />
        </motion.div>
        <H className="mt-16 text-[92px]">Check the sticker before you pay.</H>
        <P>A PayPal hold for secondhand baby gear. The money is released only after the product label clears CPSC recalls.</P>
      </>
    ),
  },
  {
    tone: "white",
    body: (
      <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <H className="text-[54px]">Fisher-Price recalled more than 2 million Snuga swings in October 2024.</H>
          <P className="text-ink-2">21 model numbers. Same frame, different fabric. The model number is printed under the motor housing, and that&apos;s the only way to tell.</P>
          <motion.p variants={item} className="mt-8 font-mono text-[14px] text-ink-3">
            Source: U.S. CPSC recall 25009, Oct 10, 2024
          </motion.p>
        </div>
        <motion.div variants={item} className="grid grid-cols-3 gap-px border border-rule bg-rule">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white p-2">
              <img src={`/cpsc/snuga-${i}.png`} alt="Recalled Snuga swing" className="aspect-square w-full object-contain" />
            </div>
          ))}
        </motion.div>
      </div>
    ),
  },
  {
    tone: "white",
    body: (
      <>
        <H>A secondhand sale has no checkpoint.</H>
        <motion.ol variants={seq} className="mt-12 max-w-[900px] border-t-2 border-ink text-[26px]">
          {["The seller usually doesn't know about the recall.", "The buyer can't tell by looking.", "Cash and instant transfers can't be taken back."].map((t, i) => (
            <motion.li key={t} variants={item} className="flex gap-6 border-b border-rule py-5">
              <span className="font-mono text-ink-3">{i + 1}</span>
              {t}
            </motion.li>
          ))}
        </motion.ol>
      </>
    ),
  },
  {
    tone: "ink",
    body: (
      <>
        <H className="text-white">
          PayPal can hold money without taking it. <span className="text-yellow">So we check while it&apos;s held.</span>
        </H>
        <motion.div variants={seq} className="mt-14 grid max-w-[1000px] grid-cols-[1fr_auto_1fr_auto_1.2fr] items-center gap-4 font-mono text-[17px]">
          <motion.div variants={item} className="border-2 border-white px-5 py-4">
            AUTHORIZE
            <p className="mt-1 text-[13px] text-white/60">buyer approves a hold</p>
          </motion.div>
          <motion.span variants={item}>→</motion.span>
          <motion.div variants={item} className="border-2 border-yellow px-5 py-4 text-yellow">
            CHECK LABEL
            <p className="mt-1 text-[13px] text-white/60">Claude + CPSC</p>
          </motion.div>
          <motion.span variants={item}>→</motion.span>
          <motion.div variants={item} className="space-y-2">
            <div className="bg-clear px-5 py-3">CAPTURE + PAYOUT</div>
            <div className="bg-recall px-5 py-3">VOID · $0 charged</div>
          </motion.div>
        </motion.div>
      </>
    ),
  },
  {
    tone: "yellow",
    body: (
      <>
        <H>Demo: two listings, one of them recalled.</H>
        <P>Buyer and seller phones side by side, with every PayPal call and every step of the label check shown as it happens.</P>
        <motion.div variants={item}>
          <Link href="/demo" target="_blank" className="mt-10 inline-block rounded-[6px] bg-ink px-7 py-4 text-[20px] font-semibold text-white">
            Open the demo →
          </Link>
        </motion.div>
      </>
    ),
  },
  {
    tone: "white",
    body: (
      <>
        <H className="text-[54px]">How it&apos;s built</H>
        <motion.table variants={seq} className="mt-10 w-full max-w-[1060px] text-left text-[18px]">
          <tbody>
            {[
              ["Hold", "PayPal Orders v2", "intent=AUTHORIZE, then /authorize · PayPal and Venmo buttons"],
              ["Read label", "Claude (Opus 5.5)", "vision → brand, model, date as a zod-typed structured output"],
              ["Find recalls", "CPSC Recall API", "search by brand and product; hazard, remedy, product list"],
              ["Decide", "Claude", "match model + date to each recall's product list; or say it can't tell"],
              ["Pay or cancel", "PayPal", "capture → Payouts to seller, or void the authorization"],
            ].map(([a, b, c]) => (
              <motion.tr key={a} variants={item} className="border-b border-rule first:border-t-2 first:border-t-ink">
                <td className="w-[170px] py-4 font-semibold">{a}</td>
                <td className="w-[240px] py-4">{b}</td>
                <td className="py-4 font-mono text-[15px] text-ink-2">{c}</td>
              </motion.tr>
            ))}
          </tbody>
        </motion.table>
      </>
    ),
  },
  {
    tone: "white",
    body: (
      <>
        <H>It never moves money on a guess.</H>
        <motion.ul variants={seq} className="mt-12 max-w-[960px] border-t-2 border-ink text-[23px]">
          {[
            "Blurry label: the hold stays and it asks for another photo.",
            "A recall on one model never blocks a different model.",
            "Every recall verdict links to the official CPSC notice.",
            "The seller isn't blamed. They get the manufacturer's remedy.",
          ].map((t) => (
            <motion.li key={t} variants={item} className="border-b border-rule py-4">
              {t}
            </motion.li>
          ))}
        </motion.ul>
      </>
    ),
  },
  {
    tone: "white",
    body: (
      <>
        <H>3% of cleared sales. Nothing on recalled ones.</H>
        <P className="text-ink-2">
          We only earn when the item is safe to sell. Sellers paste one link into a Marketplace, Craigslist or Nextdoor post. It works for anything in the CPSC database: cribs, high chairs, strollers, helmets, heaters.
        </P>
      </>
    ),
  },
  {
    tone: "yellow",
    body: (
      <>
        <motion.div variants={item}>
          <Logo className="text-[64px]" />
        </motion.div>
        <P className="text-[26px]">If it isn&apos;t safe, nobody pays and nobody earns.</P>
      </>
    ),
  },
];

const BG: Record<Tone, string> = { yellow: "bg-yellow text-ink", white: "bg-white text-ink", ink: "bg-ink text-white" };

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export default function Pitch() {
  // The slide number lives in the URL hash, so a refresh keeps your place.
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => null);
  const i = hash === null ? null : Math.max(0, Math.min(SLIDES.length - 1, (Number(hash.slice(1)) || 1) - 1));
  const go = useCallback((d: number) => {
    const cur = Number(window.location.hash.slice(1)) || 1;
    window.location.hash = String(Math.max(1, Math.min(SLIDES.length, cur + d)));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) go(1);
      if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const slide = i === null ? null : SLIDES[i];
  return (
    <main
      className={clsx("relative h-dvh cursor-pointer select-none overflow-hidden transition-colors duration-300", slide ? BG[slide.tone] : "bg-yellow")}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) return;
        go(e.clientX < window.innerWidth * 0.25 ? -1 : 1);
      }}
    >
      <AnimatePresence mode="wait">
        {slide && (
          <motion.div key={i} variants={seq} initial="hidden" animate="show" exit={{ opacity: 0, transition: { duration: 0.15 } }} className="mx-auto flex h-full max-w-[1200px] flex-col justify-center px-16">
            {slide.body}
          </motion.div>
        )}
      </AnimatePresence>
      <div className={clsx("absolute inset-x-16 bottom-8 flex justify-between font-mono text-[13px]", slide?.tone === "ink" ? "text-white/50" : "text-ink/50")}>
        <span>Cleared · PayPal AI Hackathon</span>
        <span>
          {(i ?? 0) + 1} / {SLIDES.length}
        </span>
      </div>
    </main>
  );
}
