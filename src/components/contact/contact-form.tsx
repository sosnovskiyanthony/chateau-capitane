"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { ctaClassName } from "@/components/ui/cta-class";
import { fieldClasses, focusRing, labelClasses } from "@/components/ui/styles";
import { site } from "@/lib/data/site";
import type { Dictionary } from "@/lib/i18n/en";

const optionalClasses = "font-normal normal-case tracking-normal text-ivory-muted";

type Status = "idle" | "sending" | "sent" | "invalid" | "failed";

/** A label above its control; `optional` adds the "(optional)" hint. */
function Field({
  id,
  label,
  optional,
  wide = false,
  children,
}: {
  id: string;
  label: string;
  /** The "(optional)" hint in the page's language; leave out for a required field. */
  optional?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className={labelClasses}>
        {label}
        {optional ? (
          <>
            {" "}
            <span className={optionalClasses}>{optional}</span>
          </>
        ) : null}
      </label>
      {children}
    </div>
  );
}

/** Event packages as { id, label } from the server page, so menus stay out of the browser bundle. */
export function ContactForm({
  packages,
  strings: s,
}: {
  packages: { id: string; label: string }[];
  strings: Dictionary["contact"]["form"];
}) {
  const [status, setStatus] = useState<Status>("idle");
  const sending = useRef(false);
  const submission = useRef<{ body: string; key: string } | null>(null);
  const eventField = useRef<HTMLSelectElement>(null);

  // Private-events links pass ?event=<package id> (or "undecided"); unknown values are ignored.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("event");
    const select = eventField.current;
    if (select && requested && Array.from(select.options).some((option) => option.value === requested)) {
      select.value = requested;
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const form = event.currentTarget;
    sending.current = true;
    setStatus("sending");

    try {
      const body = JSON.stringify(Object.fromEntries(new FormData(form)));
      // Keep the key when retrying unchanged fields after an uncertain response.
      if (submission.current?.body !== body) {
        submission.current = { body, key: crypto.randomUUID() };
      }
      // Validated and recorded by src/app/api/contact/route.ts (202 once stored).
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": submission.current.key,
        },
        body,
      });
      if (response.status === 400) {
        setStatus("invalid");
        return;
      }
      if (!response.ok) {
        // A conflicting key never clears; the next attempt starts a new submission.
        if (response.status === 409) submission.current = null;
        throw new Error(`Contact form failed with status ${response.status}`);
      }
      form.reset();
      submission.current = null;
      setStatus("sent");
    } catch {
      setStatus("failed");
    } finally {
      sending.current = false;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl">
      <div className="grid gap-x-6 gap-y-7 sm:grid-cols-2">
        <Field id="name" label={s.name} wide>
          <input id="name" name="name" type="text" required autoComplete="name" className={fieldClasses} />
        </Field>

        <Field id="email" label={s.email}>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            spellCheck={false}
            className={fieldClasses}
          />
        </Field>

        <Field id="phone" label={s.phone} optional={s.optional}>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={fieldClasses} />
        </Field>

        <Field id="event" label={s.event} optional={s.optional} wide>
          <select id="event" name="event" ref={eventField} defaultValue="" className={fieldClasses}>
            <option value="">{s.eventNone}</option>
            <option value="undecided">{s.eventUndecided}</option>
            {packages.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id="date" label={s.date} optional={s.optional}>
          <input id="date" name="date" type="date" autoComplete="off" className={fieldClasses} />
        </Field>

        <Field id="guests" label={s.guests} optional={s.optional}>
          <input
            id="guests"
            name="guests"
            type="number"
            min={1}
            inputMode="numeric"
            autoComplete="off"
            className={fieldClasses}
          />
        </Field>

        <Field id="message" label={s.message} wide>
          <textarea id="message" name="message" required rows={5} className={fieldClasses} />
        </Field>

        {/* Honeypot: hidden from people and screen readers, so only bots fill it in. */}
        <div aria-hidden="true" className="sr-only">
          <label htmlFor="company">Company</label>
          <input
            id="company"
            name="company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className={`mt-10 disabled:cursor-wait disabled:opacity-70 ${ctaClassName("primary")}`}
      >
        {status === "sending" ? s.sending : s.send}
      </button>

      <p aria-live="polite" className="mt-4 text-sm leading-6 text-ivory-muted">
        {status === "sent"
          ? s.sent
          : null}
        {status === "invalid"
          ? s.invalid
          : null}
        {status === "failed" ? (
          <>
            {s.failedBefore}
            <a
              href={site.phone.href}
              className={`font-semibold tabular-nums text-gold hover:text-gold-bright ${focusRing}`}
            >
              {site.phone.display}
            </a>
            {s.failedAfter}
          </>
        ) : null}
      </p>
    </form>
  );
}
