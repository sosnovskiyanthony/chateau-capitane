import { notFound } from "next/navigation";

// Unmatched addresses render the language's own not-found page instead of the bare default.
export default function CatchAll() {
  notFound();
}
