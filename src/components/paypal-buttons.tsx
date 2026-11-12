"use client";

import { useEffect, useRef, useState } from "react";

interface PayPalNamespace {
  Buttons: (opts: {
    style?: Record<string, unknown>;
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onError?: (err: unknown) => void;
    onCancel?: () => void;
  }) => { render: (el: HTMLElement) => Promise<void>; close?: () => void };
}

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

let loading: Promise<void> | null = null;

function loadSdk(clientId: string) {
  if (window.paypal) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      // intent=authorize: the buyer approves a hold, not a charge.
      s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&intent=authorize&currency=USD&enable-funding=venmo&components=buttons`;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("PayPal SDK failed to load"));
      document.head.appendChild(s);
    });
  }
  return loading;
}

export function PayPalButtons({ clientId, createOrder, onApprove, onError }: { clientId: string; createOrder: () => Promise<string>; onApprove: () => Promise<void>; onError: (msg: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const handlers = useRef({ createOrder, onApprove, onError });
  useEffect(() => {
    handlers.current = { createOrder, onApprove, onError };
  }, [createOrder, onApprove, onError]);

  useEffect(() => {
    let cancelled = false;
    let instance: ReturnType<PayPalNamespace["Buttons"]> | null = null;
    loadSdk(clientId)
      .then(() => {
        if (cancelled || !ref.current || !window.paypal) return;
        instance = window.paypal.Buttons({
          style: { shape: "pill", height: 48, label: "pay", layout: "vertical" },
          createOrder: () => handlers.current.createOrder(),
          onApprove: () => handlers.current.onApprove(),
          onError: (err) => handlers.current.onError(String((err as Error)?.message ?? err)),
        });
        ref.current.innerHTML = "";
        return instance.render(ref.current).then(() => !cancelled && setReady(true));
      })
      .catch((e) => handlers.current.onError(e.message));
    return () => {
      cancelled = true;
      instance?.close?.();
    };
  }, [clientId]);

  return (
    <div className="relative min-h-[104px]">
      {!ready && <div className="absolute inset-0 animate-pulse rounded-full bg-black/5" />}
      <div ref={ref} />
    </div>
  );
}
