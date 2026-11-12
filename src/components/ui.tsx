"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";
import clsx from "clsx";
import type { AppConfig } from "@/lib/client";

// Wordmark: a ticked form checkbox and the name, set wide like a label.
export function Logo({ className, invert = false }: { className?: string; invert?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2 font-bold", invert ? "text-white" : "text-ink", className)}>
      <svg viewBox="0 0 20 20" className="size-[1.05em]" fill="none">
        <rect x="1.25" y="1.25" width="17.5" height="17.5" stroke="currentColor" strokeWidth="2.5" />
        <path d="M5 10.5l3.2 3.2L15 6.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="square" />
      </svg>
      <span className="wide tracking-tight">Cleared</span>
    </span>
  );
}

export function AnimatedNumber({ value, prefix = "$", decimals = 2, className }: { value: number; prefix?: string; decimals?: number; className?: string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => `${prefix}${v.toFixed(decimals)}`);
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.8, ease: [0.25, 1, 0.5, 1] });
    return () => c.stop();
  }, [mv, value]);
  return <motion.span className={clsx("tabular-nums", className)}>{text}</motion.span>;
}

// Plain statement of what's real and what's simulated, so the demo never overclaims.
export function ModeNote({ config, className }: { config: AppConfig | null; className?: string }) {
  if (!config) return null;
  return (
    <p className={clsx("font-mono text-[11.5px] text-ink-2", className)}>
      PayPal: {config.paypal === "live" ? "sandbox API" : "simulated, no sandbox keys"} · Label check: {config.ai === "live" ? "Claude vision" : "scripted, no Claude key"} · Recalls: CPSC API
    </p>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={clsx("animate-spin", className)} fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
