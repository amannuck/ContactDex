import type { Metadata } from "next";
import "./globals.css";
import AppNav from "@/components/AppNav";
import BotpressWidget from "@/components/BotpressWidget";

export const metadata: Metadata = {
  title: "ContactDex",
  description:
    "Pokédex-style personal CRM with Professor Oak-powered capture and study mode.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans text-slate-100">
        <AppNav />
        {children}
        <BotpressWidget />
      </body>
    </html>
  );
}
