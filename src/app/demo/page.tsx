import { listListings } from "@/lib/store";
import { DemoStage } from "./demo-stage";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const all = await listListings();
  const order = ["snuga-swing", "vista-v2"];
  const listings = order.map((id) => all.find((l) => l.id === id)).filter((l) => l !== undefined);
  return <DemoStage listings={listings.length ? listings : all.slice(0, 2)} />;
}
