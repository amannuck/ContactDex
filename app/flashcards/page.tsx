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
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-[max(1rem,env(safe-area-inset-left))] py-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1.25rem,env(safe-area-inset-top))] font-pixel sm:px-6 sm:py-8 sm:pb-24">
      <FlashcardsClient initialContext={ctx} />
    </main>
  );
}
