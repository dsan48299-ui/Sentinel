const baseUrl = (process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com").replace(/\/$/, "");

export function paypalConfigured() {
  return Boolean(process.env.NEXT_PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

export async function paypalAccessToken() {
  const id = process.env.NEXT_PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PayPal is not configured. Add NEXT_PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  const response = await fetch(baseUrl + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("PayPal authentication failed.");
  return data.access_token as string;
}

export async function paypalRequest(path: string, method: string, body?: unknown, requestId?: string) {
  const token = await paypalAccessToken();
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("PayPal API error", response.status, data?.name || "unknown");
    throw new Error("PayPal could not complete the payment request.");
  }
  return data;
}
