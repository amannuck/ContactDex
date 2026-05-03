import FlashcardsClient from "@/components/FlashcardsClient";

type Search = { context?: string | string[] };

export const metadata = {
  title: "Flashcards — ContactDex",
  description: "Portrait flashcards to memorize your Dex connections.",
};

export default async function FlashcardsPage(props: {
  searchParams?: Promise<Search>;
}) {
  const sp = (await props.searchParams) ?? {};
  const raw = sp.context;
  const ctx =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw) && typeof raw[0] === "string"
        ? raw[0]
        : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-8 font-pixel sm:px-6">
      <FlashcardsClient initialContext={ctx} />
    </main>
  );
}
