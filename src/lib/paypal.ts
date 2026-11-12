import { paypalAmount } from "./money";
import type { LineVerdict } from "./types";

const DEFAULT_BASE = "https://api-m.sandbox.paypal.com";

export function paypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function baseUrl(): string {
  return (process.env.PAYPAL_API_BASE || DEFAULT_BASE).replace(/\/$/, "");
}

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly debugId?: string,
  ) {
    super(message);
  }
}

type PayPalBody = {
  message?: string;
  error_description?: string;
  debug_id?: string;
  details?: { issue?: string; description?: string }[];
  links?: { href: string; rel: string }[];
  id?: string;
  status?: string;
  purchase_units?: {
    payments?: { captures?: { id?: string; status?: string }[] };
  }[];
};

function failureMessage(body: PayPalBody): string {
  const detail = body.details?.[0];
  if (detail?.issue && detail.description) {
    return `${detail.issue}: ${detail.description}`;
  }
  return (
    body.message ||
    body.error_description ||
    "PayPal rejected the request."
  );
}

async function accessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) {
    throw new PayPalError("PayPal sandbox credentials are not set.");
  }
  const response = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const body = (await response.json()) as PayPalBody & { access_token?: string };
  if (!response.ok || !body.access_token) {
    throw new PayPalError(failureMessage(body), body.debug_id);
  }
  return body.access_token;
}

export async function createPayPalOrder(input: {
  exhibitId: string;
  mandateHash: string;
  merchantName: string;
  buyerOrg: string;
  lines: LineVerdict[];
  basketCents: number;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ orderId: string; approveUrl?: string; status?: string }> {
  const token = await accessToken();
  const items = input.lines.map((line) => ({
    name: line.name.slice(0, 127),
    sku: line.sku,
    quantity: String(line.qty),
    category: "PHYSICAL_GOODS" as const,
    unit_amount: {
      currency_code: "USD",
      value: paypalAmount(line.unitPriceCents),
    },
  }));
  const value = paypalAmount(input.basketCents);
  const response = await fetch(`${baseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": input.exhibitId,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: "clearance",
          description: `${input.merchantName} cart cleared against a ${input.buyerOrg} letter`.slice(
            0,
            127,
          ),
          custom_id: input.mandateHash.slice(0, 127),
          invoice_id: input.exhibitId.slice(0, 127),
          amount: {
            currency_code: "USD",
            value,
            breakdown: {
              item_total: { currency_code: "USD", value },
            },
          },
          items,
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: input.merchantName.slice(0, 127) || "Clearance",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: input.returnUrl,
            cancel_url: input.cancelUrl,
          },
        },
      },
    }),
  });
  const body = (await response.json()) as PayPalBody;
  if (!response.ok || !body.id) {
    throw new PayPalError(failureMessage(body), body.debug_id);
  }
  const approve = body.links?.find(
    (link) => link.rel === "payer-action" || link.rel === "approve",
  );
  return { orderId: body.id, approveUrl: approve?.href, status: body.status };
}

export async function capturePayPalOrder(orderId: string): Promise<{
  captureId?: string;
  status?: string;
}> {
  const token = await accessToken();
  const response = await fetch(
    `${baseUrl()}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `cap_${orderId}`,
      },
    },
  );
  const body = (await response.json()) as PayPalBody;
  if (!response.ok) {
    const issue = body.details?.[0]?.issue;
    if (issue === "ORDER_ALREADY_CAPTURED") {
      return readCapture(orderId, token);
    }
    throw new PayPalError(failureMessage(body), body.debug_id);
  }
  const capture = body.purchase_units?.[0]?.payments?.captures?.[0];
  return { captureId: capture?.id, status: body.status || capture?.status };
}

async function readCapture(orderId: string, token: string) {
  const response = await fetch(`${baseUrl()}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await response.json()) as PayPalBody;
  if (!response.ok) {
    throw new PayPalError(failureMessage(body), body.debug_id);
  }
  const capture = body.purchase_units?.[0]?.payments?.captures?.[0];
  return { captureId: capture?.id, status: body.status };
}

export function rehearsalCaptureId(): string {
  return `REHEARSAL-${Date.now().toString(36).toUpperCase()}`;
}
