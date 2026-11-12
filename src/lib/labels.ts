"use client";

import { useSyncExternalStore } from "react";

// Sample label "photos" drawn on a canvas so the demo works without a real
// product in hand. They are rendered to PNG because Claude vision reads raster
// images, and every field on them matches the real product's label layout.

export type SampleId = "snuga" | "vista" | "blurry";

export const SAMPLES: { id: SampleId; name: string; hint: string }[] = [
  { id: "snuga", name: "Infant swing", hint: "Fisher-Price DRG43" },
  { id: "vista", name: "Stroller", hint: "UPPAbaby VISTA V2" },
  { id: "blurry", name: "Blurry photo", hint: "Unreadable" },
];

const W = 1200;
const H = 900;

function noise(ctx: CanvasRenderingContext2D, amount: number) {
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function backdrop(ctx: CanvasRenderingContext2D, a: string, b: string) {
  const g = ctx.createRadialGradient(W * 0.45, H * 0.4, 50, W * 0.5, H * 0.5, W * 0.8);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // moulded plastic ridges
  ctx.globalAlpha = 0.07;
  for (let y = 40; y < H; y += 70) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, y, W, 3);
  }
  ctx.globalAlpha = 1;
}

function sticker(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rot: number, fill: string, draw: () => void) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rot);
  ctx.translate(-w / 2, -h / 2);
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 18);
  ctx.fill();
  ctx.shadowColor = "transparent";
  draw();
  ctx.restore();
}

function barcode(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let cx = x;
  ctx.fillStyle = "#111";
  while (cx < x + w) {
    const bw = 2 + Math.floor(rnd() * 5);
    if (rnd() > 0.4) ctx.fillRect(cx, y, bw, h);
    cx += bw + 1 + Math.floor(rnd() * 3);
  }
}

function text(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, size: number, weight = 500, color = "#151515", family = "Helvetica, Arial, sans-serif") {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.fillText(t, x, y);
}

function drawSnuga(ctx: CanvasRenderingContext2D) {
  backdrop(ctx, "#d9dde3", "#7d8590");
  sticker(ctx, 150, 140, 900, 610, -0.035, "#fbfaf6", () => {
    // Fisher-Price wordmark block
    ctx.fillStyle = "#e4322b";
    ctx.beginPath();
    ctx.roundRect(48, 44, 330, 92, 46);
    ctx.fill();
    text(ctx, "Fisher-Price", 78, 106, 46, 800, "#fff", "Georgia, serif");
    text(ctx, "®", 352, 78, 18, 600, "#fff");
    text(ctx, "Sweet Snugapuppy™ Swing", 48, 210, 50, 700);
    text(ctx, "Columpio Sweet Snugapuppy™", 48, 256, 28, 400, "#555");
    ctx.fillStyle = "#151515";
    ctx.fillRect(48, 290, 804, 3);
    text(ctx, "MODEL / MODÈLE / MODELO:", 48, 350, 30, 600, "#444");
    text(ctx, "DRG43", 520, 352, 54, 800);
    text(ctx, "MFD / FAB:", 48, 420, 30, 600, "#444");
    text(ctx, "08/2019", 230, 422, 44, 700);
    text(ctx, "Lot 2219-GT", 520, 420, 30, 500, "#444");
    text(ctx, "Mattel, Inc., East Aurora, NY 14052", 48, 486, 24, 400, "#444");
    text(ctx, "Made in China / Fabriqué en Chine", 48, 522, 24, 400, "#444");
    barcode(ctx, 560, 470, 290, 90, 43);
    text(ctx, "8 87961 72134 3", 590, 588, 22, 500, "#222");
  });
  noise(ctx, 18);
}

function drawVista(ctx: CanvasRenderingContext2D) {
  backdrop(ctx, "#3a3f47", "#121418");
  sticker(ctx, 170, 150, 860, 600, 0.03, "#ffffff", () => {
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.roundRect(0, 0, 860, 120, [18, 18, 0, 0]);
    ctx.fill();
    text(ctx, "UPPAbaby", 44, 80, 56, 700, "#fff");
    text(ctx, "VISTA V2", 560, 80, 48, 300, "#fff");
    text(ctx, "Model No.:", 44, 200, 32, 500, "#555");
    text(ctx, "0920-VST-US", 260, 202, 46, 800);
    text(ctx, "Date of Manufacture:", 44, 268, 32, 500, "#555");
    text(ctx, "03/2023", 380, 270, 46, 800);
    text(ctx, "Serial: VST2-23-0381442", 44, 330, 30, 500, "#333");
    ctx.fillStyle = "#ffd60a";
    ctx.fillRect(44, 370, 772, 76);
    text(ctx, "⚠ WARNING: Never leave child unattended.", 64, 420, 30, 700, "#111");
    text(ctx, "UPPAbaby, Rockland, MA 02370 USA · uppababy.com", 44, 500, 24, 400, "#444");
    text(ctx, "Conforms to ASTM F833", 44, 536, 24, 400, "#444");
    barcode(ctx, 560, 480, 256, 80, 920);
  });
  noise(ctx, 14);
}

const cache = new Map<SampleId, string>();

export function renderSample(id: SampleId): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  if (id === "vista") drawVista(ctx);
  else drawSnuga(ctx);

  let out = c;
  if (id === "blurry") {
    const b = document.createElement("canvas");
    b.width = W;
    b.height = H;
    const bctx = b.getContext("2d")!;
    bctx.filter = "blur(14px) brightness(0.8)";
    bctx.drawImage(c, 0, 0);
    out = b;
  }
  const url = out.toDataURL("image/jpeg", 0.9);
  cache.set(id, url);
  return url;
}

const noSubscribe = () => () => {};

// Sample images only exist in the browser (they're drawn on a canvas).
export function useSampleImage(id: SampleId) {
  return useSyncExternalStore(noSubscribe, () => renderSample(id), () => null);
}
