import { NextResponse } from "next/server";
import { createDeal, getListing, listDeals, updateDeal } from "@/lib/store";
import { createHoldOrder, paypalLive } from "@/lib/paypal";

export async function GET(req: Request) {
  const listingId = new URL(req.url).searchParams.get("listingId");
  const deals = await listDeals();
  return NextResponse.json({ deals: listingId ? deals.filter((d) => d.listingId === listingId) : deals });
}

// Creates a deal and a PayPal order with intent=AUTHORIZE. Called from the
// PayPal button's createOrder callback; the buyer approves in the PayPal popup.
export async function POST(req: Request) {
  const { listingId, buyerName } = (await req.json()) as { listingId: string; buyerName?: string };
  const listing = await getListing(listingId);
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const deal = await createDeal({
    listingId,
    amount: listing.price,
    buyerName: buyerName?.trim() || "Buyer",
    simulated: !paypalLive(),
  });

  try {
    const order = await createHoldOrder({
      dealId: deal.id,
      amount: listing.price,
      description: `Held by Recallhold until safety check: ${listing.title}`,
    });
    const saved = await updateDeal(deal.id, { paypalOrderId: order.id }, {
      kind: "info",
      title: "PayPal order created",
      detail: `Order ${order.id} with intent AUTHORIZE`,
    });
    return NextResponse.json({ dealId: deal.id, orderId: order.id, simulated: deal.simulated, deal: saved });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
