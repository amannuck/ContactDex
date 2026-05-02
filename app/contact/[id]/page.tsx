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
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <Link
        href="/"
        className="mb-8 inline-flex text-sm text-slate-400 transition hover:text-white"
      >
        ← Gallery
      </Link>
      <ContactDetailClient contact={contact} />
    </main>
  );
}
