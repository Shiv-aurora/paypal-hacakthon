import type { Listing } from "./types";

const sellerEmail = process.env.SELLER_SANDBOX_EMAIL || "seller@cleared-demo.example";

export const SEED_LISTINGS: Listing[] = [
  {
    id: "snuga-swing",
    title: "Fisher-Price Sweet Snugapuppy Swing",
    category: "sleeper",
    price: 65,
    condition: "Like new, used for 3 months",
    photo: "/cpsc/snuga-1.png",
    sellerName: "Dana R.",
    sellerPaypalEmail: sellerEmail,
    location: "Oakland, CA",
    createdAt: "2026-11-01T17:00:00.000Z",
  },
  {
    id: "vista-v2",
    title: "UPPAbaby VISTA V2 Stroller",
    category: "stroller",
    price: 420,
    condition: "Good, minor scuffs on the frame",
    photo: "/listings/stroller.svg",
    sellerName: "Marcus T.",
    sellerPaypalEmail: sellerEmail,
    location: "Berkeley, CA",
    createdAt: "2026-11-02T17:00:00.000Z",
  },
  {
    id: "bike-helmet",
    title: "Kids' Bike Helmet, size S",
    category: "helmet",
    price: 18,
    condition: "Used one summer",
    photo: "/listings/helmet.svg",
    sellerName: "Priya K.",
    sellerPaypalEmail: sellerEmail,
    location: "Alameda, CA",
    createdAt: "2026-11-03T17:00:00.000Z",
  },
];
