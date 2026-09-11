# Château Capitaine

Marketing website for Château Capitaine, built with [Next.js](https://nextjs.org).

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- File-based SEO: `sitemap.ts` and `robots.ts` generate `/sitemap.xml` and `/robots.txt`

## Getting Started

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Structure

- `src/app/page.tsx` — homepage
- `src/app/about/page.tsx` — about page
- `src/app/gallery/page.tsx` — gallery page
- `src/app/contact/page.tsx` — contact page
- `src/app/sitemap.ts` / `src/app/robots.ts` — SEO metadata routes
