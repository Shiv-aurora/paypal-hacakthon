import { notFound } from "next/navigation";
import { getListing } from "@/lib/store";
import { BuyShell } from "./buy-shell";

export const dynamic = "force-dynamic";

export default async function BuyPage({ params }: PageProps<"/buy/[listingId]">) {
  const { listingId } = await params;
  const listing = await getListing(listingId);
  if (!listing) notFound();
  return <BuyShell listing={listing} />;
}
