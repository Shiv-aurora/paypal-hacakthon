import { NextResponse } from "next/server";
import { getDeal, updateDeal } from "@/lib/store";
import { authorizeOrder } from "@/lib/paypal";

// Called from the PayPal button's onApprove: turns the approved order into an
// authorization hold. Nothing is captured until the safety check clears.
export async function POST(_req: Request, ctx: RouteContext<"/api/deals/[id]/authorize">) {
  const { id } = await ctx.params;
  const deal = await getDeal(id);
  if (!deal?.paypalOrderId) return NextResponse.json({ error: "Deal has no PayPal order" }, { status: 404 });
  if (deal.authorizationId) return NextResponse.json({ deal });

  try {
    const auth = await authorizeOrder(deal.paypalOrderId);
    const updated = await updateDeal(
      id,
      { authorizationId: auth.authorizationId, status: "held" },
      {
        kind: "money",
        title: `$${deal.amount.toFixed(2)} held by PayPal`,
        detail: `Authorization ${auth.authorizationId}. Not charged until the item clears.`,
      },
    );
    return NextResponse.json({ deal: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
