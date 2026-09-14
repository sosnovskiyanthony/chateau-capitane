"use client";

import { useState, type FormEvent } from "react";

import { site } from "@/lib/data/site";

const fieldClasses =
  "mt-1.5 w-full border border-stone-400 bg-stone-50 px-3 py-2 text-stone-900 focus-visible:border-wine-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-wine-700";

const labelClasses = "block text-sm font-medium text-stone-800";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    const phone = String(data.get("phone") ?? "");
    const date = String(data.get("date") ?? "");
    const guests = String(data.get("guests") ?? "");
    const message = String(data.get("message") ?? "");

    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      phone && `Phone: ${phone}`,
      date && `Date: ${date}`,
      guests && `Guests: ${guests}`,
      "",
      message,
    ]
      .filter(Boolean)
      .join("\n");

    // Phase 1 hands off to the guest's mail client. Replace this with
    // `await fetch("/api/contact", { method: "POST", body: … })` once a
    // submission handler exists server-side.
    window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(
      `Enquiry from ${name}`,
    )}&body=${encodeURIComponent(body)}`;

    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl">
      <div className="grid gap-5 sm:grid-cols-2">
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
            className={fieldClasses}
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelClasses}>
            Phone <span className="text-stone-500">(optional)</span>
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
            Date <span className="text-stone-500">(optional)</span>
          </label>
          <input
            id="date"
            name="date"
            type="date"
            className={fieldClasses}
          />
        </div>

        <div>
          <label htmlFor="guests" className={labelClasses}>
            Guests <span className="text-stone-500">(optional)</span>
          </label>
          <input
            id="guests"
            name="guests"
            type="number"
            min={1}
            inputMode="numeric"
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
      </div>

      <button
        type="submit"
        className="mt-6 inline-flex items-center justify-center bg-wine-700 px-6 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-wine-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
      >
        Send message
      </button>

      <p aria-live="polite" className="mt-4 text-sm text-stone-600">
        {sent
          ? "Your mail app should have opened with the message ready to send. If it didn’t, call us and we’ll sort it out."
          : null}
      </p>
    </form>
  );
}
