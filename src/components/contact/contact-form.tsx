"use client";

import { useRef, useState, type FormEvent } from "react";

import { ctaClassName } from "@/components/ui/cta-link";
import { site } from "@/lib/data/site";

// ivory/45 keeps field borders above 3:1 against both ink-900 and ink-950.
const fieldClasses =
  "mt-2.5 w-full border border-ivory/45 bg-ink-950 px-4 py-3 text-ivory focus-visible:border-gold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold";

const labelClasses =
  "block text-xs font-semibold uppercase tracking-caps text-ivory";

const optionalClasses = "font-normal normal-case tracking-normal text-ivory-muted";

type Status = "idle" | "sending" | "sent" | "invalid" | "failed";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const sending = useRef(false);
  const submission = useRef<{ body: string; key: string } | null>(null);

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
        <div className="sm:col-span-2">
          <label htmlFor="name" className={labelClasses}>
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className={fieldClasses}
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClasses}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            spellCheck={false}
            className={fieldClasses}
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelClasses}>
            Phone <span className={optionalClasses}>(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className={fieldClasses}
          />
        </div>

        <div>
          <label htmlFor="date" className={labelClasses}>
            Date <span className={optionalClasses}>(optional)</span>
          </label>
          <input
            id="date"
            name="date"
            type="date"
            autoComplete="off"
            className={fieldClasses}
          />
        </div>

        <div>
          <label htmlFor="guests" className={labelClasses}>
            Guests <span className={optionalClasses}>(optional)</span>
          </label>
          <input
            id="guests"
            name="guests"
            type="number"
            min={1}
            inputMode="numeric"
            autoComplete="off"
            className={fieldClasses}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="message" className={labelClasses}>
            What can we help with?
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            className={fieldClasses}
          />
        </div>

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
        {status === "sending" ? "Sending…" : "Send message"}
      </button>

      <p aria-live="polite" className="mt-4 text-sm leading-6 text-ivory-muted">
        {status === "sent"
          ? "Thank you. Your message has been recorded for our team to follow up, and we’ll reply by email. This does not confirm a booking."
          : null}
        {status === "invalid"
          ? "Some details didn’t look right. Please check the form and try again."
          : null}
        {status === "failed" ? (
          <>
            Your message didn&rsquo;t go through. Please call us at{" "}
            <a
              href={site.phone.href}
              className="font-semibold tabular-nums text-gold hover:text-gold-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              {site.phone.display}
            </a>{" "}
            and we&rsquo;ll sort it out.
          </>
        ) : null}
      </p>
    </form>
  );
}
