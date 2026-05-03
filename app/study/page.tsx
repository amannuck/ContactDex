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
    <main className="mx-auto min-h-screen max-w-xl px-4 py-12 font-pixel">
      <StudyModeClient initialContext={ctx} />
    </main>
  );
}
