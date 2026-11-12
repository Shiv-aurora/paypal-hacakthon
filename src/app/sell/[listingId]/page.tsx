import { notFound } from "next/navigation";
import { getListing } from "@/lib/store";
import { SellerShell } from "./seller-shell";

export const dynamic = "force-dynamic";

export default async function SellerDashboard({ params }: PageProps<"/sell/[listingId]">) {
  const { listingId } = await params;
  const listing = await getListing(listingId);
  if (!listing) notFound();
  return <SellerShell listing={listing} />;
}
