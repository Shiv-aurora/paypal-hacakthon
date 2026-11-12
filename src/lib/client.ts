"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { CheckEvent, Deal, Listing } from "./types";

export const usd = (n: number) => `$${n.toFixed(2)}`;

export interface AppConfig {
  paypal: "live" | "simulated";
  ai: "live" | "scripted";
  paypalClientId: string | null;
}

export function useConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig({ paypal: "simulated", ai: "scripted", paypalClientId: null }));
  }, []);
  return config;
}

// Polls a deal so the seller phone and ledger follow along in near real time.
export function useDeal(dealId: string | null | undefined, intervalMs = 900) {
  const [data, setData] = useState<{ deal: Deal; listing: Listing } | null>(null);
  useEffect(() => {
    if (!dealId) return;
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/deals/${dealId}`, { cache: "no-store" });
        if (res.ok && alive) setData(await res.json());
      } catch {}
    };
    tick();
    const t = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [dealId, intervalMs]);
  return data && data.deal.id === dealId ? data : null;
}

export async function startDeal(listingId: string, buyerName: string) {
  const res = await fetch("/api/deals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId, buyerName }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Could not start the hold");
  return json as { dealId: string; orderId: string; simulated: boolean };
}

export async function authorizeDeal(dealId: string) {
  const res = await fetch(`/api/deals/${dealId}/authorize`, { method: "POST" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "PayPal could not place the hold");
  return json.deal as Deal;
}

export async function runCheck(dealId: string, image: string, sample: string | undefined, onEvent: (e: CheckEvent) => void) {
  const res = await fetch(`/api/deals/${dealId}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, sample }),
  });
  if (!res.ok || !res.body) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "Safety check failed");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) onEvent(JSON.parse(line));
    }
  }
}

// Downscale a picked photo so uploads stay small and fast.
export function fileToDataUrl(file: File, max = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

const noSubscribe = () => () => {};

// The page origin, for share links. Empty during server render.
export function useOrigin() {
  return useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
}
