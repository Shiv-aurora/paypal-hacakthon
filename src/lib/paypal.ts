import { randomUUID } from "crypto";

// Thin PayPal REST client (sandbox). When credentials are missing every call is
// simulated so the UI can run end to end; deals record which mode they used.
const BASE = process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";

export const paypalLive = () => Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

let token: { value: string; expires: number } | null = null;

async function accessToken() {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return token.value;
}

async function call<T>(method: string, path: string, body?: unknown, requestId?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": requestId ?? randomUUID(),
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PayPal ${method} ${path} failed: ${res.status} ${text}`);
  return (text ? JSON.parse(text) : {}) as T;
}

const money = (n: number) => ({ currency_code: "USD", value: n.toFixed(2) });
const fakeId = (prefix: string) => `${prefix}-SIM-${randomUUID().slice(0, 8).toUpperCase()}`;

interface PayPalOrder {
  id: string;
  status: string;
  purchase_units: { payments?: { authorizations?: { id: string; status: string }[] } }[];
}

export async function createHoldOrder(opts: { dealId: string; amount: number; description: string }) {
  if (!paypalLive()) return { id: fakeId("ORDER"), status: "CREATED" };
  return call<PayPalOrder>(
    "POST",
    "/v2/checkout/orders",
    {
      intent: "AUTHORIZE",
      purchase_units: [
        {
          reference_id: opts.dealId,
          custom_id: opts.dealId,
          description: opts.description.slice(0, 127),
          soft_descriptor: "CLEARED HOLD",
          amount: money(opts.amount),
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Recallhold",
            user_action: "CONTINUE",
            shipping_preference: "NO_SHIPPING",
          },
        },
      },
    },
    `order-${opts.dealId}`,
  );
}

export async function authorizeOrder(orderId: string) {
  if (!paypalLive()) return { authorizationId: fakeId("AUTH"), status: "CREATED" };
  const order = await call<PayPalOrder>("POST", `/v2/checkout/orders/${orderId}/authorize`, {}, `auth-${orderId}`);
  const auth = order.purchase_units[0]?.payments?.authorizations?.[0];
  if (!auth) throw new Error("PayPal returned no authorization");
  return { authorizationId: auth.id, status: auth.status };
}

export async function captureHold(authorizationId: string) {
  if (!paypalLive()) return { id: fakeId("CAPTURE"), status: "COMPLETED" };
  return call<{ id: string; status: string }>(
    "POST",
    `/v2/payments/authorizations/${authorizationId}/capture`,
    { final_capture: true },
    `capture-${authorizationId}`,
  );
}

export async function voidHold(authorizationId: string) {
  if (!paypalLive()) return { status: "VOIDED" };
  await call("POST", `/v2/payments/authorizations/${authorizationId}/void`, undefined, `void-${authorizationId}`);
  return { status: "VOIDED" };
}

export async function payoutSeller(opts: { dealId: string; email: string; amount: number; note: string }) {
  if (!paypalLive()) return { batchId: fakeId("PAYOUT"), status: "SUCCESS" };
  const res = await call<{ batch_header: { payout_batch_id: string; batch_status: string } }>(
    "POST",
    "/v1/payments/payouts",
    {
      sender_batch_header: {
        sender_batch_id: `cleared-${opts.dealId}`,
        email_subject: "Your item cleared its safety check. You've been paid!",
        email_message: opts.note,
      },
      items: [
        {
          recipient_type: "EMAIL",
          receiver: opts.email,
          amount: money(opts.amount),
          note: opts.note,
          sender_item_id: opts.dealId,
        },
      ],
    },
    `payout-${opts.dealId}`,
  );
  return { batchId: res.batch_header.payout_batch_id, status: res.batch_header.batch_status };
}
