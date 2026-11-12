import { NextResponse } from "next/server";
import { getDeal, getListing } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/deals/[id]">) {
  const { id } = await ctx.params;
  const deal = await getDeal(id);
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  return NextResponse.json({ deal, listing: await getListing(deal.listingId) });
}
