import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Château Capitaine",
  description: "Learn about the history and story of Château Capitaine.",
};

export default function AboutPage() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-6 py-32 px-16 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
          About
        </h1>
        <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Content coming soon.
        </p>
      </main>
    </div>
  );
}
