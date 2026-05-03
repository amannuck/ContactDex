import type { Metadata } from "next";
import "./globals.css";
import AppNav from "@/components/AppNav";
import EventPrepAssistant from "@/components/EventPrepAssistant";
import { fontPixelify } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "ContactDex",
  description:
    "Personal relationship CRM — gallery, study mode, and linked imports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /* Extensions (e.g. Grammarly) inject attributes on <body> before hydrate — suppressHydrationWarning avoids false alarms on <html>/<body> only. */
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={fontPixelify.variable}
    >
      <body
        suppressHydrationWarning
        className="antialiased font-sans text-slate-100"
      >
        <AppNav />
        {children}
        <EventPrepAssistant />
      </body>
    </html>
  );
}
