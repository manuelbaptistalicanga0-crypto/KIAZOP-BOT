import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geist = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  variable: "--font-geist",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: { default: "ExecutaPro — Tarefas da equipa", template: "%s | ExecutaPro" },
  description: "Organiza tarefas, acompanha a equipa e cobra no WhatsApp.",
  applicationName: "ExecutaPro",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-AO"><body className={geist.variable}>{children}</body></html>;
}
