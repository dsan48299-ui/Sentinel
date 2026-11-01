"use client";

import { useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";

type Props = { invoiceId: string; onPaid: () => void };

export default function PayPalInvoiceButton({ invoiceId, onPaid }: Props) {
  const [error, setError] = useState("");
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  if (!clientId) return <span className="payment-setup">PayPal setup required</span>;
  return <div className="paypal-button-wrap">
    <PayPalScriptProvider options={{ clientId, currency: "USD", intent: "capture" }}>
      <PayPalButtons
        style={{ layout: "horizontal", height: 34, tagline: false, label: "pay" }}
        createOrder={async () => {
          setError("");
          const response = await fetch("/api/paypal/create-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Could not create PayPal order.");
          return data.id;
        }}
        onApprove={async (data) => {
          const response = await fetch("/api/paypal/capture-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: data.orderID }) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Payment capture failed.");
          onPaid();
        }}
        onError={(err) => setError(err instanceof Error ? err.message : "PayPal checkout encountered an error.")}
      />
    </PayPalScriptProvider>
    {error && <small className="payment-error">{error}</small>}
  </div>;
}
