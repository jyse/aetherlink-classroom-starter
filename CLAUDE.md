# Aether Library

## Purpose

This is a starter repository for the AetherLink classroom (Teaching Days 1-2).
It is a small, self-contained stand-in for the AetherLink Academy: a place to
practise exploring a project, making a plan, changing it, testing the result, and
having a human review the evidence — all with Claude Code. The practical project
built here is called the Aether Library, and most of it is built by the
participant across the course, not shipped finished.

There is no database, no authentication, and no shared or real-time state. Each
participant works in their own local copy.

## Structure

- `server.js` — a tiny Node server (built-in `http`/`fs` only) that serves the
  frontend in `public/` and exposes read endpoints (`/api/glossary`,
  `/api/concept-cards`, `/api/feedback`) plus one write endpoint
  (`POST /api/submissions`), backed by the JSON files in `data/`. There is no
  `/api/profiles` route yet — that's added as part of building the Profiles
  page.
- `public/` — the frontend: plain HTML, CSS, and vanilla JS. No framework, no
  build step. `index.html` loads `style.css` and `app.js` directly.
  `public/assets/` holds the AetherBOT mascot images. All four nav
  destinations (Profiles, Glossary, Library, Game) are visible in the
  sidebar, but only Game is currently wired up to real data and behaviour.
  Profiles, Glossary and Library are empty placeholder sections — no
  data-driven rendering yet.
- `data/glossary.json` — AI terminology entries. Starts as an empty array
  (`[]`); the Game's random-term picker and the `GET /api/glossary` endpoint
  both work against it already, even while it's empty.
- `data/concept-cards.json` — enriched concept cards. Also starts as an empty
  array; the Game's "Reveal" button and `GET /api/concept-cards` work against
  it already.
- `data/profiles.json` does **not** exist yet in this repo. There is no
  Profiles page, no `/api/profiles` route, and no profile-rendering code in
  `app.js` — that entire feature (data file, endpoint, page, and a
  participant's own entry) is built from scratch as course work.
- `data/latest-submission.json` / `data/latest-feedback.json` — the Explain It
  Back game's single-slot round state (git-ignored; regenerated each round).
- `data/fixtures/` — example glossary entries (one complete set, one
  deliberately incomplete) used to exercise `npm run validate`.
- `scripts/validate.js` — basic shape validation for the JSON data files.
  Validates `data/glossary.json` and `data/concept-cards.json` by default;
  picks up `data/profiles.json` automatically once it exists.
- `checklist.md` — currently just a title and a note that the class defines
  this together; it has no criteria yet. The `term-checker` skill (built
  later, from scratch) will read whatever this file says at the time.
- There is no `.claude/skills/` directory yet. Both `create-concept-card` and
  `term-checker` are built entirely by the participant later in the course —
  no skeleton exists here to start from.
- `notes/` — where a participant's own learning notes live (not pre-filled).

## Data shape

A glossary entry has just `term` and `definition` — deliberately minimal. The
example/misconception/related-concepts/resources detail belongs to a concept
card, built by *enriching* a glossary term, not duplicated at the glossary
level.

A concept card entry has: `term`, `explanation`, `example`,
`commonMisunderstanding`, `essentialPoints` (list), `relatedConcepts` (list),
`resources` (list of `{ label, url }`).

A profile entry (once `data/profiles.json` exists) is expected to have:
`name`, `role`, `team`, `experience`, `learningGoal`, `workflowToImprove` —
see `scripts/validate.js`'s `profile` schema for the exact required fields.

Keep new entries consistent with this shape and with the existing tone —
plain language, no invented facts.
