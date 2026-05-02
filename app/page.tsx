import ContactsGallery from "@/components/ContactsGallery";
import { readContacts } from "@/lib/contacts";

export default async function Home() {
  const contacts = await readContacts();
  const tagOptions = [...new Set(contacts.flatMap((c) => c.tags))].sort((a, b) =>
    a.localeCompare(b),
  );
  return (
    <main className="min-h-screen pb-12">
      <ContactsGallery contacts={contacts} tagOptions={tagOptions} />
    </main>
  );
}
