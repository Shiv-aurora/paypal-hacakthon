import { NextResponse } from "next/server";
import { paypalLive } from "@/lib/paypal";
import { aiLive } from "@/lib/verifier";

export async function GET() {
  return NextResponse.json({
    paypal: paypalLive() ? "live" : "simulated",
    ai: aiLive() ? "live" : "scripted",
    paypalClientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || null,
  });
}
