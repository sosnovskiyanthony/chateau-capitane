"use client";

import { useActionState, type ReactNode } from "react";

import { login, setPasswordFromLink, type FormState } from "@/app/admin/actions";
import { ctaClassName } from "@/components/ui/cta-link";

// Same field styling as the contact form.
const fieldClasses =
  "mt-2.5 w-full border border-ivory/45 bg-ink-950 px-4 py-3 text-ivory focus-visible:border-gold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold";
const labelClasses = "block text-xs font-semibold uppercase tracking-caps text-ivory";

function Field({ name, label, type, autoComplete }: { name: string; label: string; type: string; autoComplete: string }) {
  return (
    <div>
      <label htmlFor={name} className={labelClasses}>{label}</label>
      <input id={name} name={name} type={type} autoComplete={autoComplete} required className={fieldClasses} />
    </div>
  );
}

function Form({ action, pending, state, submit, children }: {
  action: (form: FormData) => void; pending: boolean; state: FormState; submit: string; children: ReactNode;
}) {
  return (
    <form action={action} className="grid max-w-md gap-7">
      {children}
      <button type="submit" disabled={pending}
        className={`disabled:cursor-wait disabled:opacity-70 ${ctaClassName("primary")}`}>
        {pending ? "Please wait…" : submit}
      </button>
      <p role="alert" className="text-sm leading-6 text-ivory-muted">{state?.error}</p>
    </form>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <Form action={action} pending={pending} state={state} submit="Sign in">
      <Field name="email" label="Email" type="email" autoComplete="username" />
      <Field name="password" label="Password" type="password" autoComplete="current-password" />
    </Form>
  );
}

export function SetPasswordForm({ type, tokenHash }: { type: string; tokenHash: string }) {
  const [state, action, pending] = useActionState(setPasswordFromLink, undefined);
  return (
    <Form action={action} pending={pending} state={state} submit="Save password and sign in">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="token_hash" value={tokenHash} />
      <Field name="password" label="New password (at least 12 characters)" type="password" autoComplete="new-password" />
      <Field name="confirm" label="Repeat password" type="password" autoComplete="new-password" />
    </Form>
  );
}
