# Career Compass — explore your next chapter

A private, editable career-exploration prototype for a recent graduate (generic starter data; no personal details). It makes information manageable: one next step on Home, then progressive detail.

## Run it
No build and no dependencies. From this folder:

```
python3 -m http.server 4180
# open http://localhost:4180
```
(Opening `index.html` directly also works in most browsers.)

## Tests
```
node test/scoring.test.js
node test/userdata.test.js
```
Covers ranking edge cases (all unknown, all neutral, hard avoid / must-have, preference changes, importance weights, custom activities) and seed-data integrity (every cross-reference resolves).

## What's in it
Home · Explore (filters, compare up to 3) · Role detail · Preferences (live re-ranking with "why") · Résumé help (tracker funnel → where the search is stalling → copy-ready prompts for your own AI; skill check tucked below) · Projects (real-business hypotheticals + public-data alternatives, one current project, reflection) · Learning · Plan (30-day checklist, tracker, search links, watchlist).

## How ranking works (`scoring.js`)
- Role attributes (1–5 per activity), your interest (1–5 or Unsure), and résumé readiness are **kept separate**.
- Per known activity: similarity = 1 − |desired − role| / 4, weighted by importance (1–3). Unknown activities are excluded.
- Blend with the starting hypothesis (`baselineFit`) by `min(1, answered/4)`: with no answers it's the seed hypothesis only (labelled low confidence); with 4+ it's fully preference-driven.
- Hard rules: *must avoid* flags roles with that activity ≥4; *must have* flags roles ≤2. Flagged roles sink and are labelled "Check your constraints" — never hidden.
- Output is a **tier** (strong / possible / explore carefully) plus reasons. No percentages are shown.
- Readiness is a separate sort; it never excludes a path. A low coding preference lowers coding-heavy roles; it doesn't penalise existing coding skills.

## Assumptions to review
- All role values are **estimates**, shown hatched — edit `data.js`.
- Every preference starts as Unsure, so no path is favoured until you answer.
- Learning items are topics only: no invented prices, providers or links, all marked unverified.
- Real-business projects are hypothetical; no company facts are asserted. Sample résumé bullets are labelled proposed.
- No job postings are seeded. Add roles you have verified to the tracker yourself.
- No contact details are stored anywhere.

## Fonts & licenses
Inter and Figtree are bundled in `fonts/` (SIL Open Font License 1.1; license text kept beside the files). See `LICENSES.md`. Nothing is loaded from a CDN.

## Public vs. personal version
This repo contains only generic data, so it is safe to publish. A personalised start (pre-filled preferences, notes, tracker leads) is just an **export file** that someone imports with "Import a file" in the footer. Keep such files out of the repo (store them privately and send them directly); the data lives only in the importing person's browser.

## Privacy and your data
- **Where it lives:** your answers, preferences, résumé assessment, reflections and progress are stored only in your browser (`localStorage`, key `careerCompass.v1`). The site itself holds only generic content.
- **Nothing is sent anywhere.** The app makes no network requests of its own and uses no AI service or analytics. A Content-Security-Policy in `index.html` blocks scripts from connecting out. The only outbound links are search links (LinkedIn, Indeed, Google) that open in a new tab when you click them, sent with no referrer.
- **Updates don’t overwrite your data.** New versions of the site change content and features only. Saved data is validated and upgraded on load (`userdata.js`), keeps answers for items that were later removed, and gets defaults for anything new.
- **Full backup:** "Download full backup" (Dashboard or footer) saves everything to one JSON file. "Import a file" restores it, including on a new device.
- **Mentor summary:** Dashboard → "Share a progress summary with your mentor". A short text summary of steps, chosen paths, projects, courses and application counts. It never includes notes, reflections, profile details, links or contact information. Preferences and employer names are shared only if you tick the boxes. You see a preview before you copy or download it.
- **A personalised start** is a profile file (same format as a backup) that you import once. Keep those files out of this repository and send them privately.

## Publishing (GitHub Pages)
1. Push this repo to GitHub (`main`). The repo only has generic content, so it is safe to make public.
2. Repo → Settings → Pages → Source: **GitHub Actions**. The workflow in `.github/workflows/pages.yml` runs the tests, then publishes only the files the app needs.
3. Your URL will be `https://<user>.github.io/<repo>/`. Keep it stable: browser storage is tied to the address, so a new address starts with empty data (a backup restores it).
4. Each later push to `main` updates the site. People keep their data and get the new version on their next visit (a refresh may be needed).
5. Before sharing, give the person a personalised profile file privately (if you made one), and ask them to open the site once and use Import.

Notes: Safari may clear a site’s storage after about 7 days without a visit unless the site is added to the Dock or Home Screen, so the app nudges for backups every 14 days. Browser storage is not encrypted, so on a shared computer use a separate browser profile.
