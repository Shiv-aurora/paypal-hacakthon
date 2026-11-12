import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Deal, DealEvent, Listing } from "./types";
import { SEED_LISTINGS } from "./seed";

// Hackathon-grade persistence: one JSON file, rewritten on every change.
const DB_PATH = path.join(process.cwd(), ".data", "db.json");

interface DB {
  listings: Listing[];
  deals: Deal[];
}

let cache: DB | null = null;
let writing: Promise<void> = Promise.resolve();

async function load(): Promise<DB> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(DB_PATH, "utf8")) as DB;
  } catch {
    cache = { listings: [...SEED_LISTINGS], deals: [] };
    await save();
  }
  for (const seed of SEED_LISTINGS) {
    if (!cache.listings.some((l) => l.id === seed.id)) cache.listings.push(seed);
  }
  return cache;
}

async function save() {
  const snapshot = JSON.stringify(cache, null, 2);
  writing = writing.then(async () => {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, snapshot);
  });
  await writing;
}

export const shortId = () => randomUUID().replace(/-/g, "").slice(0, 10);

export async function listListings() {
  const db = await load();
  return [...db.listings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getListing(id: string) {
  return (await load()).listings.find((l) => l.id === id) ?? null;
}

export async function createListing(input: Omit<Listing, "id" | "createdAt">) {
  const db = await load();
  const listing: Listing = { ...input, id: shortId(), createdAt: new Date().toISOString() };
  db.listings.push(listing);
  await save();
  return listing;
}

export async function getDeal(id: string) {
  return (await load()).deals.find((d) => d.id === id) ?? null;
}

export async function findDealByOrder(orderId: string) {
  return (await load()).deals.find((d) => d.paypalOrderId === orderId) ?? null;
}

export async function listDeals() {
  const db = await load();
  return [...db.deals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createDeal(input: Pick<Deal, "listingId" | "amount" | "buyerName" | "simulated">) {
  const db = await load();
  const now = new Date().toISOString();
  const deal: Deal = { ...input, id: shortId(), status: "awaiting_payment", events: [], createdAt: now, updatedAt: now };
  db.deals.push(deal);
  await save();
  return deal;
}

export async function updateDeal(id: string, patch: Partial<Deal>, event?: Omit<DealEvent, "at">) {
  const db = await load();
  const deal = db.deals.find((d) => d.id === id);
  if (!deal) throw new Error(`Deal ${id} not found`);
  Object.assign(deal, patch, { updatedAt: new Date().toISOString() });
  if (event) deal.events.push({ ...event, at: new Date().toISOString() });
  await save();
  return deal;
}
