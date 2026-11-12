import { getDeal, getListing, updateDeal } from "@/lib/store";
import { captureHold, payoutSeller, voidHold } from "@/lib/paypal";
import { verifyLabel } from "@/lib/verifier";

export const maxDuration = 120;

const FEE = Number(process.env.CLEARED_FEE_PERCENT ?? 3) / 100;

// Runs the pickup safety check and moves the money. Streams NDJSON progress so
// the scanner UI can animate each step as it happens.
export async function POST(req: Request, ctx: RouteContext<"/api/deals/[id]/check">) {
  const { id } = await ctx.params;
  const { image, sample } = (await req.json()) as { image: string; sample?: string };

  const deal = await getDeal(id, req);
  const listing = deal && (await getListing(deal.listingId));
  if (!deal || !listing) return Response.json({ error: "Deal not found" }, { status: 404 });
  if (!deal.authorizationId) return Response.json({ error: "Payment is not on hold yet" }, { status: 409 });

  const match = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(image ?? "");
  if (!match) return Response.json({ error: "Expected a base64 image data URL" }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        await updateDeal(id, { status: "checking" }, { kind: "ai", title: "Pickup safety check started" });

        const result = await verifyLabel(
          { mediaType: match[1], data: match[2] },
          async (step, detail, data) => {
            send({ type: "step", step, detail, ...data });
            await updateDeal(id, {}, { kind: "ai", title: detail });
          },
          sample,
        );
        const { verdict, reading, recallsSearched } = result;
        send({ type: "verdict", verdict, reading, recallsSearched });

        if (verdict.decision === "recalled") {
          await voidHold(deal.authorizationId!);
          const updated = await updateDeal(
            id,
            { status: "refunded", verdict, reading, recallsSearched },
            {
              kind: "danger",
              title: `Recall found. $${deal.amount.toFixed(2)} hold released`,
              detail: verdict.matchedRecall ? `CPSC recall ${verdict.matchedRecall.recallNumber}` : verdict.headline,
            },
          );
          send({ type: "money", action: "voided", amount: deal.amount });
          send({ type: "done", deal: updated });
        } else if (verdict.decision === "clear") {
          const capture = await captureHold(deal.authorizationId!);
          await updateDeal(
            id,
            { status: "cleared", captureId: capture.id, verdict, reading, recallsSearched },
            { kind: "money", title: `Cleared. $${deal.amount.toFixed(2)} captured`, detail: `Capture ${capture.id}` },
          );
          send({ type: "money", action: "captured", amount: deal.amount });

          const payoutAmount = Math.round(deal.amount * (1 - FEE) * 100) / 100;
          const payout = await payoutSeller({
            dealId: deal.id,
            email: listing.sellerPaypalEmail,
            amount: payoutAmount,
            note: `${listing.title} passed its Recallhold recall check.`,
          });
          const updated = await updateDeal(
            id,
            { status: "paid_out", payoutBatchId: payout.batchId, payoutAmount },
            { kind: "success", title: `$${payoutAmount.toFixed(2)} paid to ${listing.sellerName}`, detail: `PayPal Payouts batch ${payout.batchId}` },
          );
          send({ type: "money", action: "paid_out", amount: payoutAmount });
          send({ type: "done", deal: updated });
        } else {
          const updated = await updateDeal(
            id,
            { status: "needs_review", verdict, reading, recallsSearched },
            { kind: "info", title: "Hold kept while we take another look", detail: verdict.headline },
          );
          send({ type: "money", action: "held", amount: deal.amount });
          send({ type: "done", deal: updated });
        }
      } catch (err) {
        console.error(err);
        await updateDeal(id, { status: "held" }, { kind: "danger", title: "Check failed, money still on hold", detail: (err as Error).message });
        send({ type: "error", message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
