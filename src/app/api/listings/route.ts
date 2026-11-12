import { NextResponse } from "next/server";
import { createListing, listListings } from "@/lib/store";
import type { Category } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ listings: await listListings() });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    title?: string;
    category?: Category;
    price?: number;
    condition?: string;
    photo?: string;
    sellerName?: string;
    sellerPaypalEmail?: string;
    location?: string;
  };
  const price = Number(body.price);
  if (!body.title?.trim() || !(price > 0)) {
    return NextResponse.json({ error: "Title and a positive price are required" }, { status: 400 });
  }
  const listing = await createListing({
    title: body.title.trim(),
    category: body.category ?? "other",
    price: Math.round(price * 100) / 100,
    condition: body.condition?.trim() || "Used",
    photo: body.photo || "/listings/generic.svg",
    sellerName: body.sellerName?.trim() || "Seller",
    sellerPaypalEmail: body.sellerPaypalEmail?.trim() || process.env.SELLER_SANDBOX_EMAIL || "seller@cleared-demo.example",
    location: body.location?.trim() || "Local pickup",
  });
  return NextResponse.json({ listing });
}
