import { listListings } from "@/lib/store";
import { Landing } from "./landing";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <Landing listings={await listListings()} />;
}
