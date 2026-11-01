import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CapitalFlow AI | Business cash-flow command center",
  description: "Understand payments, invoices, and cash flow in one intelligent workspace."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
