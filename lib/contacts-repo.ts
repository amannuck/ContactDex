import { readContacts } from "./contacts";
import type { Contact } from "./types";

export async function getContact(id: string): Promise<Contact | undefined> {
  const list = await readContacts();
  return list.find((c) => c.id === id);
}
