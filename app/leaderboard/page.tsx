import Link from "next/link";
import LeaderboardList from "@/components/LeaderboardList";
import {
  readContacts,
  sortContactsByEvolutionLeaderboard,
} from "@/lib/contacts";

export const metadata = {
  title: "Evolution leaderboard — ContactDex",
  description:
    "Connections ranked by evolution path — strongest bonds at the top.",
};

export default async function LeaderboardPage() {
  const contacts = await readContacts();
  const ranked = sortContactsByEvolutionLeaderboard(contacts);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-[max(1.5rem,env(safe-area-inset-top))] font-pixel sm:py-10 sm:pb-24">
      <Link
        href="/"
        className="mb-6 inline-flex min-h-11 items-center text-sm text-slate-400 transition hover:text-white sm:mb-8 sm:min-h-0"
      >
        ← Gallery
      </Link>

      <header className="mb-10">
        <h1 className="font-pixel-display text-2xl font-normal leading-snug text-white sm:text-3xl md:text-4xl">
          Evolution leaderboard
        </h1>
        <p className="mt-2 max-w-xl text-slate-400">
          Every connection in your Dex, ordered from the strongest evolution
          path to the lowest. Within the same stage, people with more logged
          interactions rank higher.
        </p>
      </header>

      <LeaderboardList contacts={ranked} />
    </main>
  );
}
