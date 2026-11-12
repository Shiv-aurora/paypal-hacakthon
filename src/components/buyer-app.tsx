"use client";

import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, ImageIcon } from "lucide-react";
import type { AppConfig } from "@/lib/client";
import { authorizeDeal, fileToDataUrl, runCheck, startDeal, usd } from "@/lib/client";
import { SAMPLES, useSampleImage, type SampleId } from "@/lib/labels";
import type { CheckEvent, Deal, LabelReading, Listing, Verdict } from "@/lib/types";
import { MoneyCard, type MoneyState } from "./money-card";
import { CallOverlay } from "./call-overlay";
import { PayPalButtons } from "./paypal-buttons";
import { Logo, Spinner } from "./ui";
import { useStatusBar } from "./phone";

type Screen = "listing" | "held" | "scan" | "checking" | "result";
type StepKey = "reading" | "searching" | "matching" | "money";

// iOS-style push between screens.
const page = {
  initial: { x: "30%", opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { type: "spring" as const, damping: 32, stiffness: 320 } },
  exit: { x: "-15%", opacity: 0, transition: { duration: 0.18 } },
};

export interface BuyerAppProps {
  listing: Listing;
  config: AppConfig | null;
  buyerName?: string;
  onDeal?: (dealId: string) => void;
  onCheckEvent?: (e: CheckEvent) => void;
}

export function BuyerApp({ listing, config, buyerName = "Alex", onDeal, onCheckEvent }: BuyerAppProps) {
  const [screen, setScreen] = useState<Screen>("listing");
  const [dealId, setDealId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [steps, setSteps] = useState<Partial<Record<StepKey, string>>>({});
  const [active, setActive] = useState<StepKey | null>(null);
  const [reading, setReading] = useState<LabelReading | null>(null);
  const [candidates, setCandidates] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [money, setMoney] = useState<MoneyState>("held");
  const [deal, setDeal] = useState<Deal | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [screen]);

  // --- Pay: create the PayPal order with intent AUTHORIZE --------------------
  const dealRef = useRef<string | null>(null);
  const createOrder = useCallback(async () => {
    setError(null);
    const d = await startDeal(listing.id, buyerName);
    dealRef.current = d.dealId;
    setDealId(d.dealId);
    onDeal?.(d.dealId);
    return d.orderId;
  }, [listing.id, buyerName, onDeal]);

  const approve = useCallback(async () => {
    if (!dealRef.current) return;
    const d = await authorizeDeal(dealRef.current);
    setDeal(d);
    setMoney("held");
    setScreen("held");
  }, []);

  const simulatedPay = async () => {
    setBusy(true);
    try {
      await createOrder();
      await new Promise((r) => setTimeout(r, 700));
      await approve();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // --- Check: stream Claude + CPSC progress, then PayPal moves the money -----
  const check = async (dataUrl: string, sample?: SampleId) => {
    if (!dealId) return;
    setImage(dataUrl);
    setSteps({});
    setReading(null);
    setCandidates(null);
    setVerdict(null);
    setActive("reading");
    setMoney("checking");
    setScreen("checking");
    setError(null);
    try {
      await runCheck(dealId, dataUrl, sample, (e) => {
        onCheckEvent?.(e);
        if (e.type === "step") {
          setActive(e.step);
          setSteps((s) => ({ ...s, [e.step]: e.detail }));
          if (e.reading) setReading(e.reading);
          if (e.candidates != null) setCandidates(e.candidates);
        } else if (e.type === "verdict") {
          setReading(e.reading);
          setCandidates(e.recallsSearched);
          setVerdict(e.verdict);
          setActive("money");
          setSteps((s) => ({
            ...s,
            money: e.verdict.decision === "recalled" ? "Voiding the authorization" : e.verdict.decision === "clear" ? "Capturing, then paying the seller" : "Keeping the hold",
          }));
        } else if (e.type === "money") {
          if (e.action === "voided") setMoney("released");
          if (e.action === "captured") setMoney("captured");
          if (e.action === "paid_out") setTimeout(() => setMoney("paid_out"), 900);
          if (e.action === "held") setMoney("held");
        } else if (e.type === "done") {
          setDeal(e.deal);
          setActive(null);
          setTimeout(() => setScreen("result"), 900);
          if (e.deal.status === "refunded") setTimeout(() => setCallOpen(true), 4500);
        } else if (e.type === "error") {
          setError(e.message);
          setMoney("held");
          setScreen("scan");
        }
      });
    } catch (err) {
      setError((err as Error).message);
      setMoney("held");
      setScreen("scan");
    }
  };

  const decision = verdict?.decision;
  const darkTop = callOpen || screen === "scan" || screen === "checking" || (screen === "result" && decision !== "needs_review");
  useStatusBar(darkTop ? "dark" : "light");

  return (
    <div className="relative h-full overflow-hidden">
      <div ref={scrollRef} className={clsx("h-full overflow-y-auto overflow-x-hidden scrollbar-none", screen === "scan" || screen === "checking" ? "bg-black text-white" : "bg-ios-bg")}>
        <AnimatePresence mode="wait" initial={false}>
          {screen === "listing" && (
            <motion.div key="listing" {...page} className="pt-[54px]">
              <div className="flex items-center justify-between px-5 pb-3">
                <Logo className="text-[16px]" />
                <span className="text-[13px] text-black/45">{listing.location}</span>
              </div>
              <div className="mx-4 overflow-hidden rounded-[14px] bg-white">
                <div className="aspect-[4/3] bg-white p-3">
                  <img src={listing.photo} alt={listing.title} className="h-full w-full object-contain" />
                </div>
                <div className="border-t border-black/5 px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <h1 className="text-[19px] font-semibold leading-snug">{listing.title}</h1>
                    <p className="text-[19px] font-semibold">{usd(listing.price)}</p>
                  </div>
                  <p className="mt-0.5 text-[14px] text-black/50">
                    {listing.condition} · Sold by {listing.sellerName}
                  </p>
                </div>
              </div>

              <Section title="How paying works here">
                <Row n="1" text={`PayPal holds ${usd(listing.price)}. You aren't charged yet.`} />
                <Row n="2" text="At pickup, you photograph the model sticker." />
                <Row n="3" text="Not on a recall list: the seller is paid. Recalled: the hold is cancelled and you pay nothing." last />
              </Section>

              <div className="sticky bottom-0 mt-6 border-t border-black/10 bg-ios-bg/95 px-4 pb-7 pt-3 backdrop-blur">
                {config?.paypal === "live" && config.paypalClientId ? (
                  <PayPalButtons clientId={config.paypalClientId} createOrder={createOrder} onApprove={approve} onError={(m) => setError(m)} />
                ) : (
                  <button
                    onClick={simulatedPay}
                    disabled={busy || !config}
                    className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#ffc439] text-[17px] font-semibold text-[#111] active:opacity-80 disabled:opacity-60"
                  >
                    {busy ? <Spinner className="size-5" /> : null}
                    {busy ? "Placing hold…" : <>Hold {usd(listing.price)} with <span className="font-bold italic text-[#003087]">PayPal</span></>}
                  </button>
                )}
                <p className="mt-2.5 px-2 text-center text-[12px] leading-snug text-black/45">
                  {config?.paypal === "live" ? "Sandbox. PayPal or Venmo; the order is created with intent=AUTHORIZE." : "Simulated PayPal hold: no sandbox keys are configured on this server."}
                </p>
                {error && <p className="mt-2 text-center text-[13px] text-recall">{error}</p>}
              </div>
            </motion.div>
          )}

          {screen === "held" && (
            <motion.div key="held" {...page} className="pb-10 pt-[54px]">
              <div className="px-5">
                <Logo className="text-[16px]" />
                <h2 className="mt-5 text-[32px] font-bold leading-tight tracking-tight">Money&apos;s on hold</h2>
                <p className="mt-1.5 text-[15px] leading-snug text-black/60">
                  {listing.sellerName} can see it&apos;s there but can&apos;t touch it until the {listing.title.split(" ").slice(-1)[0].toLowerCase()} passes its check.
                </p>
              </div>
              <MoneyCard amount={listing.price} state={money} reference={deal?.authorizationId ? `Authorization ${deal.authorizationId}` : undefined} className="mx-4 mt-5" />
              <Section title="Pickup">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="grid size-10 place-items-center rounded-full bg-[#d1d1d6] text-[16px] font-semibold text-white">{listing.sellerName[0]}</div>
                  <div className="flex-1">
                    <p className="text-[16px]">{listing.sellerName}</p>
                    <p className="text-[13px] text-black/50">{listing.location} · today</p>
                  </div>
                </div>
              </Section>
              <div className="mt-6 px-4">
                <button onClick={() => setScreen("scan")} className="flex h-[52px] w-full items-center justify-center rounded-[12px] bg-black text-[17px] font-semibold text-white active:opacity-80">
                  I&apos;m at pickup. Check the label
                </button>
                <p className="mt-2.5 text-center text-[12px] text-black/45">If nobody checks it, the hold expires and the money stays yours.</p>
              </div>
            </motion.div>
          )}

          {screen === "scan" && (
            <motion.div key="scan" {...page} className="flex min-h-full flex-col pb-8 pt-[58px]">
              <p className="px-6 text-center text-[17px] font-semibold">Photograph the model sticker</p>
              <p className="mt-1 px-8 text-center text-[13px] leading-snug text-white/55">
                {listing.category === "sleeper" ? "On Fisher-Price swings it's under the motor housing." : listing.category === "stroller" ? "On strollers it's usually on the frame, near a rear wheel." : "Look for a sticker with a model number and a date."}
              </p>
              <Viewfinder>
                <span className="text-[13px] text-white/40">Model number and date in frame</span>
              </Viewfinder>
              <div className="mt-4 px-4">
                <p className="mb-2 text-[12px] text-white/45">No item in hand? Use a sample label:</p>
                <div className="grid grid-cols-3 gap-2">
                  {SAMPLES.map((s) => (
                    <SampleButton key={s.id} id={s.id} name={s.name} onPick={(url) => check(url, s.id)} />
                  ))}
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between px-10 pt-6">
                <FilePick onPick={check}>
                  <span className="grid size-11 place-items-center rounded-[8px] bg-white/15">
                    <ImageIcon className="size-5" />
                  </span>
                </FilePick>
                <FilePick onPick={check} capture>
                  <span className="grid size-[72px] place-items-center rounded-full border-[4px] border-white">
                    <span className="size-[56px] rounded-full bg-white active:scale-90" />
                  </span>
                </FilePick>
                <span className="size-11" />
              </div>
              {error && <ErrorNote message={error} dark />}
            </motion.div>
          )}

          {screen === "checking" && (
            <motion.div key="checking" {...page} className="flex min-h-full flex-col pb-8 pt-[58px]">
              <p className="text-center text-[17px] font-semibold">Checking before you pay</p>
              <Viewfinder scanning={!verdict}>{image && <img src={image} alt="Label being checked" className="h-full w-full object-cover" />}</Viewfinder>
              <Readout reading={reading} />
              <StepList steps={steps} active={active} candidates={candidates} />
              <MoneyCard amount={listing.price} state={money} payout={deal?.payoutAmount} className="mx-4 mt-4 text-black" />
            </motion.div>
          )}

          {screen === "result" && verdict && (
            <motion.div key="result" {...page} className="pb-10">
              <ResultBanner verdict={verdict} listing={listing} />
              <MoneyCard
                amount={listing.price}
                state={money}
                payout={deal?.payoutAmount}
                reference={deal?.payoutBatchId ? `Payout ${deal.payoutBatchId} to ${listing.sellerName}` : deal?.authorizationId ? `Authorization ${deal.authorizationId}` : undefined}
                className="mx-4 mt-4"
              />
              <ResultBody verdict={verdict} reading={reading} candidates={candidates} />
              {decision === "recalled" && (
                <div className="mt-5 px-4">
                  <button onClick={() => setCallOpen(true)} className="h-[48px] w-full rounded-[12px] bg-white text-[16px] font-semibold text-recall active:opacity-70">
                    Replay the call
                  </button>
                </div>
              )}
              {decision === "needs_review" && (
                <div className="mt-5 px-4">
                  <button onClick={() => setScreen("scan")} className="h-[52px] w-full rounded-[12px] bg-black text-[17px] font-semibold text-white active:opacity-80">
                    Take another photo
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <CallOverlay open={callOpen} script={verdict?.callScript ?? ""} onClose={() => setCallOpen(false)} />
    </div>
  );
}

// --- Pieces -------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <p className="px-8 pb-1.5 text-[13px] uppercase text-black/45">{title}</p>
      <div className="mx-4 overflow-hidden rounded-[12px] bg-white">{children}</div>
    </div>
  );
}

function Row({ n, text, last }: { n: string; text: string; last?: boolean }) {
  return (
    <div className="flex gap-3 pl-4">
      <span className="pt-3 text-[15px] tabular-nums text-black/35">{n}</span>
      <p className={clsx("flex-1 py-3 pr-4 text-[15px] leading-snug", !last && "border-b border-black/10")}>{text}</p>
    </div>
  );
}

function Viewfinder({ children, scanning }: { children: React.ReactNode; scanning?: boolean }) {
  return (
    <div className="relative mx-4 mt-4 grid aspect-[4/3] place-items-center overflow-hidden rounded-[10px] bg-[#1c1c1e]">
      {children}
      {["left-2.5 top-2.5 border-l-2 border-t-2", "right-2.5 top-2.5 border-r-2 border-t-2", "left-2.5 bottom-2.5 border-l-2 border-b-2", "right-2.5 bottom-2.5 border-r-2 border-b-2"].map((c) => (
        <span key={c} className={clsx("absolute size-6 border-yellow", c)} />
      ))}
      {scanning && (
        <motion.div className="absolute inset-x-0 top-0 h-[2px] bg-yellow" animate={{ y: [0, 250, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />
      )}
    </div>
  );
}

function Readout({ reading }: { reading: LabelReading | null }) {
  const rows = [
    ["Brand", reading?.brand],
    ["Model", reading?.modelNumber],
    ["Made", reading?.manufactureDate],
  ];
  return (
    <div className="mx-4 mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-[10px] bg-white/15 font-mono">
      {rows.map(([k, v]) => (
        <div key={k} className="bg-[#1c1c1e] px-3 py-2">
          <p className="text-[10.5px] text-white/45">{k}</p>
          <p className="truncate text-[14px] font-medium">{reading ? (reading.readable ? v || "none" : "unreadable") : "…"}</p>
        </div>
      ))}
    </div>
  );
}

const STEP_META: { key: StepKey; label: string }[] = [
  { key: "reading", label: "Read the label" },
  { key: "searching", label: "Search CPSC recalls" },
  { key: "matching", label: "Compare model and date" },
  { key: "money", label: "Tell PayPal" },
];

function StepList({ steps, active, candidates }: { steps: Partial<Record<StepKey, string>>; active: StepKey | null; candidates: number | null }) {
  const activeIdx = active ? STEP_META.findIndex((s) => s.key === active) : STEP_META.length;
  return (
    <div className="mx-4 mt-3 overflow-hidden rounded-[10px] bg-[#1c1c1e]">
      {STEP_META.map((s, i) => {
        const done = i < activeIdx;
        const isActive = i === activeIdx;
        return (
          <div key={s.key} className={clsx("flex items-center gap-3 px-3.5 py-2.5", i > 0 && "border-t border-white/10", i > activeIdx && "opacity-35")}>
            <span className="grid size-5 place-items-center">{done ? <Check className="size-4 text-[#30d158]" strokeWidth={3} /> : isActive ? <Spinner className="size-4" /> : <span className="size-1.5 rounded-full bg-white/50" />}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px]">{s.label}</p>
              {steps[s.key] && <p className="truncate text-[12px] text-white/50">{steps[s.key]}</p>}
            </div>
            {s.key === "searching" && candidates != null && <span className="font-mono text-[12px] text-white/60">{candidates}</span>}
          </div>
        );
      })}
    </div>
  );
}

function ResultBanner({ verdict, listing }: { verdict: Verdict; listing: Listing }) {
  const d = verdict.decision;
  const bg = d === "recalled" ? "bg-recall text-white" : d === "clear" ? "bg-clear text-white" : "bg-yellow text-black";
  const kicker = d === "recalled" ? `Recall ${verdict.matchedRecall?.recallNumber ?? "found"}` : d === "clear" ? "No recall found" : "Hold kept";
  const head = d === "recalled" ? `Don't buy this ${listing.category === "sleeper" ? "swing" : "item"}.` : d === "clear" ? "Cleared. It's yours." : "Couldn't read the label.";
  return (
    <div className={clsx("px-5 pb-6 pt-[62px]", bg)}>
      <p className="font-mono text-[13px] opacity-80">{kicker}</p>
      <motion.h2 initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-1 text-[32px] font-bold leading-[1.05] tracking-tight">
        {head}
      </motion.h2>
      <p className="mt-2 text-[15px] leading-snug opacity-90">{verdict.headline}.</p>
    </div>
  );
}

function ResultBody({ verdict, reading, candidates }: { verdict: Verdict; reading: LabelReading | null; candidates: number | null }) {
  const r = verdict.matchedRecall;
  return (
    <>
      {r && (
        <a href={r.url} target="_blank" rel="noreferrer" className="mx-4 mt-4 block overflow-hidden rounded-[12px] bg-white active:opacity-80">
          <div className="flex gap-3 p-3.5">
            {r.image && <img src={r.image} alt="" className="size-16 shrink-0 rounded-[8px] object-contain" />}
            <div className="min-w-0">
              <p className="text-[12px] text-black/45">
                CPSC · {r.date}
              </p>
              <p className="mt-0.5 line-clamp-3 text-[14.5px] font-semibold leading-snug">{r.title}</p>
            </div>
          </div>
          <p className="line-clamp-3 border-t border-black/10 px-3.5 py-2.5 text-[13.5px] leading-snug text-black/70">{r.hazard}</p>
          <p className="flex items-center justify-between border-t border-black/10 px-3.5 py-2.5 text-[15px] text-paypal">
            Read the official notice <ChevronRight className="size-4 text-black/30" />
          </p>
        </a>
      )}

      <div className="mt-6">
        <p className="px-8 pb-1.5 text-[13px] uppercase text-black/45">Why</p>
        <div className="mx-4 rounded-[12px] bg-white px-4 py-3">
          <p className="text-[15px] leading-snug">{verdict.explanation}</p>
          {reading?.readable && (
            <p className="mt-3 border-t border-black/10 pt-2.5 font-mono text-[12px] text-black/55">
              model {reading.modelNumber} · made {reading.manufactureDate} · {candidates ?? 0} recalls compared · {Math.round(verdict.confidence * 100)}% sure
            </p>
          )}
        </div>
      </div>

      {verdict.saferAlternatives.length > 0 && verdict.decision !== "clear" && (
        <div className="mt-6">
          <p className="px-8 pb-1.5 text-[13px] uppercase text-black/45">{verdict.decision === "recalled" ? "Instead" : "Try this"}</p>
          <div className="mx-4 overflow-hidden rounded-[12px] bg-white">
            {verdict.saferAlternatives.map((a, i) => (
              <p key={a} className={clsx("px-4 py-3 text-[15px] leading-snug", i > 0 && "border-t border-black/10")}>
                {a}
              </p>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function FilePick({ onPick, capture, children }: { onPick: (url: string) => void; capture?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) onPick(await fileToDataUrl(f));
          e.target.value = "";
        }}
      />
      <button aria-label={capture ? "Take photo" : "Choose photo"} onClick={() => ref.current?.click()}>
        {children}
      </button>
    </>
  );
}

function SampleButton({ id, name, onPick }: { id: SampleId; name: string; onPick: (url: string) => void }) {
  const thumb = useSampleImage(id);
  return (
    <button onClick={() => thumb && onPick(thumb)} className="text-left active:opacity-70">
      <div className="aspect-[4/3] overflow-hidden rounded-[8px] bg-white/10">{thumb && <img src={thumb} alt={name} className="h-full w-full object-cover" />}</div>
      <p className="mt-1 truncate text-[12px] text-white/75">{name}</p>
    </button>
  );
}

function ErrorNote({ message, dark }: { message: string; dark?: boolean }) {
  return <p className={clsx("mx-4 mt-4 rounded-[10px] px-3 py-2 text-[13px]", dark ? "bg-recall/25 text-[#ffb4ab]" : "bg-white text-recall")}>{message}</p>;
}
