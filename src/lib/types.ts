export type Category = "stroller" | "car-seat" | "crib" | "sleeper" | "helmet" | "toy" | "other";

export interface Listing {
  id: string;
  title: string;
  category: Category;
  price: number;
  condition: string;
  photo: string;
  sellerName: string;
  sellerPaypalEmail: string;
  location: string;
  createdAt: string;
}

export type DealStatus =
  | "awaiting_payment"
  | "held"
  | "checking"
  | "cleared"
  | "blocked"
  | "needs_review"
  | "paid_out"
  | "refunded";

export interface LabelReading {
  readable: boolean;
  brand: string;
  productName: string;
  modelNumber: string;
  manufactureDate: string;
  productType: string;
  searchTerms: string[];
  notes: string;
}

export interface RecallSummary {
  recallNumber: string;
  title: string;
  date: string;
  url: string;
  hazard: string;
  remedy: string;
  image?: string;
}

export interface Verdict {
  decision: "recalled" | "clear" | "needs_review";
  confidence: number;
  headline: string;
  explanation: string;
  matchedRecall: RecallSummary | null;
  callScript: string;
  saferAlternatives: string[];
}

export interface DealEvent {
  at: string;
  kind: "info" | "money" | "ai" | "danger" | "success";
  title: string;
  detail?: string;
}

export interface Deal {
  id: string;
  listingId: string;
  amount: number;
  status: DealStatus;
  buyerName: string;
  paypalOrderId?: string;
  authorizationId?: string;
  captureId?: string;
  payoutBatchId?: string;
  payoutAmount?: number;
  reading?: LabelReading;
  recallsSearched?: number;
  verdict?: Verdict;
  simulated: boolean;
  events: DealEvent[];
  createdAt: string;
  updatedAt: string;
}

export type CheckEvent =
  | { type: "step"; step: "reading" | "searching" | "matching"; detail: string; reading?: LabelReading; candidates?: number }
  | { type: "verdict"; verdict: Verdict; reading: LabelReading; recallsSearched: number }
  | { type: "money"; action: "voided" | "captured" | "paid_out" | "held"; amount: number }
  | { type: "done"; deal: Deal }
  | { type: "error"; message: string };
