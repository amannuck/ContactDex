import Link from "next/link";
import { notFound } from "next/navigation";
import ContactDetailClient from "@/components/ContactDetailClient";
import { getContact } from "@/lib/contacts-repo";

type Params = { params: Promise<{ id: string }> };

export default async function ContactPage({ params }: Params) {
  const { id } = await params;
  const contact = await getContact(id);
  if (!contact) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-[max(2rem,env(safe-area-inset-top))] font-pixel sm:pb-24 sm:pt-10">
      <Link
        href="/"
        className="mb-6 inline-flex min-h-11 items-center text-sm text-slate-400 transition hover:text-white sm:mb-8 sm:min-h-0"
      >
        ← Gallery
      </Link>
      <ContactDetailClient contact={contact} />
    </main>
  );
}
