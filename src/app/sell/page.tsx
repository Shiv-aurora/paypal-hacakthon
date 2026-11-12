"use client";

import Link from "next/link";
import clsx from "clsx";
import { useState } from "react";
import type { Category, Listing } from "@/lib/types";
import { useOrigin } from "@/lib/client";
import { Logo, Spinner } from "@/components/ui";

const CATEGORIES: { id: Category; label: string; photo: string }[] = [
  { id: "stroller", label: "Stroller", photo: "/listings/stroller.svg" },
  { id: "sleeper", label: "Swing or sleeper", photo: "/listings/generic.svg" },
  { id: "crib", label: "Crib", photo: "/listings/generic.svg" },
  { id: "helmet", label: "Helmet", photo: "/listings/helmet.svg" },
  { id: "toy", label: "Toy", photo: "/listings/generic.svg" },
  { id: "other", label: "Other", photo: "/listings/generic.svg" },
];

export default function SellPage() {
  const [form, setForm] = useState({ title: "", price: "", category: "stroller" as Category, sellerName: "", sellerPaypalEmail: "", location: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [copied, setCopied] = useState(false);
  const origin = useOrigin();
  const link = listing ? `${origin}/buy/${listing.id}` : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: Number(form.price), photo: CATEGORIES.find((c) => c.id === form.category)?.photo }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setListing(json.listing);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const field = "mt-1.5 h-12 w-full rounded-[6px] border border-ink/25 bg-white px-3.5 text-[16px] outline-none focus:border-ink focus:ring-2 focus:ring-yellow";

  return (
    <main className="min-h-dvh bg-desk">
      <header className="bg-yellow">
        <div className="mx-auto flex max-w-[640px] items-center justify-between px-6 py-5">
          <Link href="/">
            <Logo className="text-[19px]" />
          </Link>
          <Link href="/demo" className="text-[15px] font-semibold underline underline-offset-4">
            Demo
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[640px] px-6 py-12">
        {!listing ? (
          <form onSubmit={submit}>
            <h1 className="wide text-[40px] font-extrabold leading-[1.02] tracking-[-0.02em]">Sell it here. Get paid when it clears.</h1>
            <p className="mt-4 text-[17px] leading-[1.55] text-ink-2">
              You&apos;ll get a link to paste into your listing. Buyers pay with a PayPal hold, check the label when they pick up, and PayPal pays you out on the spot if no recall matches.
            </p>

            <div className="mt-9 space-y-5 rounded-[8px] border border-rule bg-white p-6">
              <label className="block text-[14px] font-semibold">
                What are you selling?
                <input required className={field} placeholder="Graco Pack 'n Play, gray" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-[14px] font-semibold">
                  Price (USD)
                  <input required type="number" min="1" step="0.01" className={field} placeholder="60" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </label>
                <label className="block text-[14px] font-semibold">
                  Pickup area
                  <input className={field} placeholder="Oakland, CA" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </label>
              </div>
              <fieldset>
                <legend className="text-[14px] font-semibold">Type</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setForm({ ...form, category: c.id })}
                      className={clsx("rounded-[5px] border px-3 py-1.5 text-[14px]", form.category === c.id ? "border-ink bg-ink text-white" : "border-ink/25 hover:border-ink")}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="block text-[14px] font-semibold">
                Your name
                <input className={field} placeholder="Dana R." value={form.sellerName} onChange={(e) => setForm({ ...form, sellerName: e.target.value })} />
              </label>
              <label className="block text-[14px] font-semibold">
                PayPal email for payouts
                <input type="email" className={field} placeholder="sandbox account email" value={form.sellerPaypalEmail} onChange={(e) => setForm({ ...form, sellerPaypalEmail: e.target.value })} />
              </label>
            </div>
            {error && <p className="mt-3 text-[14px] text-recall">{error}</p>}
            <button disabled={busy} className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-[6px] bg-ink text-[17px] font-semibold text-white hover:bg-black disabled:opacity-60">
              {busy && <Spinner className="size-5" />} Create my link
            </button>
          </form>
        ) : (
          <div>
            <h1 className="wide text-[40px] font-extrabold leading-[1.02] tracking-[-0.02em]">Your link is ready.</h1>
            <p className="mt-4 text-[17px] text-ink-2">Paste it into your Marketplace, Craigslist or Nextdoor post.</p>
            <div className="mt-8 flex items-center gap-3 rounded-[6px] border-2 border-ink bg-white p-2 pl-4">
              <span className="flex-1 truncate font-mono text-[14px]">{link}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="rounded-[4px] bg-yellow px-4 py-2 text-[14px] font-semibold"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="mt-6 flex gap-6 text-[16px] font-semibold">
              <Link href={`/sell/${listing.id}`} className="underline underline-offset-4">
                Open my seller view
              </Link>
              <Link href={`/buy/${listing.id}`} className="underline underline-offset-4">
                See what buyers see
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
