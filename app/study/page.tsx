import StudyModeClient from "@/components/StudyModeClient";

type Search = { context?: string | string[] };

export default async function StudyPage(props: {
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
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-[max(1rem,env(safe-area-inset-left))] py-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(2rem,env(safe-area-inset-top))] font-pixel sm:pb-24 sm:px-6 md:max-w-xl md:py-12">
      <StudyModeClient initialContext={ctx} />
    </main>
  );
}
