import { NextResponse } from "next/server";
import { findDealByOrder, listDeals, updateDeal } from "@/lib/store";

// Records PayPal webhook events (authorization, capture, void, payout) on the
// matching deal's timeline so both phones show PayPal's own confirmation.
export async function POST(req: Request) {
  const event = (await req.json()) as {
    event_type: string;
    summary?: string;
    resource?: {
      id?: string;
      custom_id?: string;
      supplementary_data?: { related_ids?: { order_id?: string } };
      batch_header?: { sender_batch_header?: { sender_batch_id?: string } };
    };
  };

  const r = event.resource ?? {};
  let deal = r.supplementary_data?.related_ids?.order_id ? await findDealByOrder(r.supplementary_data.related_ids.order_id) : null;
  if (!deal && r.custom_id) deal = (await listDeals()).find((d) => d.id === r.custom_id) ?? null;
  const batchId = r.batch_header?.sender_batch_header?.sender_batch_id;
  if (!deal && batchId?.startsWith("cleared-")) deal = (await listDeals()).find((d) => d.id === batchId.slice(8)) ?? null;

  if (deal) {
    await updateDeal(deal.id, {}, { kind: "money", title: `PayPal webhook: ${event.event_type}`, detail: event.summary });
  }
  return NextResponse.json({ received: true, matched: Boolean(deal) });
}
