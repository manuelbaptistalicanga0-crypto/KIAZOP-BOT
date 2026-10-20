import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kiazop Bot | Demo",
  description: "Testa a normalização de webhooks WhatsApp do Kiazop Bot.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt"><body>{children}</body></html>;
}
