"use client";

import { startTransition, useActionState, type ReactNode } from "react";

import { saveSection } from "@/app/admin/content/actions";
import { ctaClassName } from "@/components/ui/cta-link";

/** Submits without React's automatic form reset, so a refused save keeps every typed edit on screen.
 * Without JavaScript the plain form action still works.
 */
export function ContentEditorForm({ section, base, children }: { section: string; base: number | null; children: ReactNode }) {
  const [state, action, pending] = useActionState(saveSection, undefined);
  return (
    <form action={action} className="mt-10 grid gap-10"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}>
      <input type="hidden" name="section" value={section} />
      <input type="hidden" name="base" value={base ?? ""} />
      {children}
      <div className="grid gap-4">
        <p role="alert" className="text-sm font-semibold leading-6 text-gold-bright">{state?.error && `Not saved: ${state.error}`}</p>
        <button type="submit" disabled={pending}
          className={`justify-self-start disabled:cursor-wait disabled:opacity-70 ${ctaClassName("primary")}`}>
          {pending ? "Saving…" : "Save draft"}
        </button>
      </div>
    </form>
  );
}
