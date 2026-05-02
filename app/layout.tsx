import type { Metadata } from "next";
import "./globals.css";
import AppNav from "@/components/AppNav";
import EventPrepAssistant from "@/components/EventPrepAssistant";

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
  return (
    <html lang="en">
      <body className="antialiased font-sans text-slate-100">
        <AppNav />
        {children}
        <EventPrepAssistant />
      </body>
    </html>
  );
}
