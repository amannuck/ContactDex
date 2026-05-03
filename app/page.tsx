import ContactsGallery from "@/components/ContactsGallery";
import { readContacts } from "@/lib/contacts";

export default async function Home() {
  const contacts = await readContacts();
  const tagOptions = [...new Set(contacts.flatMap((c) => c.tags))].sort((a, b) =>
    a.localeCompare(b),
  );
  return (
    <main className="min-h-screen pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] font-pixel sm:pb-20">
      <ContactsGallery contacts={contacts} tagOptions={tagOptions} />
    </main>
  );
}
