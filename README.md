# Aether Library — starter repo

The starter repository for the AetherLink Worldline Wave 2 classroom
(Teaching Days 1-2). This is a safe repository, not a toy prompt: a genuinely
small, real, runnable project with clean git status and no real data or
secrets, that you explore, change, test, and review with Claude Code.

The practical project you build here is the **Aether Library** — a small
AI knowledge library that grows across the two teaching days: participant
profiles, an AI glossary, enriched concept cards, and a learning game. Most
of it does not exist yet in this repo on purpose — you build it.

Each participant clones their own copy and works alone — no pairing, no shared
state, no real-time collaboration. That comes later, in the separate five-day
support programme.

## What's already here

- The app shell: header, logo, light/dark theme toggle, and a sidebar with
  all four destinations (Profiles, Glossary, Library, Game) — fully working.
- The full visual design system (`public/style.css`), including styles for
  pages that aren't built yet, so what you build later matches everything
  else without extra CSS work.
- The **Explain It Back** learning game — fully working, including the
  file-based bridge to your own Claude Code session described below.
- `data/glossary.json` and `data/concept-cards.json`, present as empty
  arrays, with their read endpoints (`GET /api/glossary`,
  `GET /api/concept-cards`) already wired up — the Game depends on both,
  even before either has a page of its own.

## What you build across the course

- **Profiles** — the data file, the `GET /api/profiles` endpoint, the page
  itself, and your own entry in it.
- **Glossary page** and **Library page** — the data already exists and the
  read endpoints already work; the page UI that renders them is yours to
  build.
- Two Claude Code skills, `create-concept-card` and `term-checker`, built
  entirely from scratch under `.claude/skills/` — there is no skeleton here
  to start from.
- `checklist.md` — currently just a placeholder heading. The class defines
  what a good "explain this term back" answer contains, together, as part of
  building the game's feedback loop.

## Setup

```bash
npm install
npm start
```

**`npm install` needs no internet access.** This repo has zero npm
dependencies. That matters on a locked-down corporate network:
cloning/copying this folder and running `npm install && npm start` works
completely offline, with no package registry required at any point.

Then open http://localhost:3000. All four pages are reachable from the
sidebar immediately, so you can see the whole target shape from the start:

- **Profiles**, **Glossary**, **Library** — currently empty placeholders.
  Nothing is broken; there's just nothing to render yet.
- **Game** ("Explain It Back") — fully working, described below.

## Reset to a known-good state

If you get stuck or want to start a task over, discard local changes and
return to the last commit:

```bash
npm run reset
```

This runs `git checkout -- .`, which restores every tracked file. It will not
touch new files you've created (like `notes/day1-learning-note.md`), only
files that were already committed. It also won't touch
`data/latest-submission.json` or `data/latest-feedback.json` — those are
git-ignored round state for the game, not tracked files; delete them by hand
if you want a completely clean slate for the game specifically.

## Validating the data files

```bash
npm run validate
```

Checks `data/glossary.json` and `data/concept-cards.json` against basic shape
requirements — required fields present and non-empty, required lists
non-empty, `resources` entries shaped correctly. An empty array is a valid,
passing result — there's nothing wrong with 0 entries. Once
`data/profiles.json` exists (after you build the Profiles feature),
`npm run validate` picks it up automatically and validates it too. Exits
non-zero if anything fails, with a list of what's wrong.

To see it catch a genuinely broken entry, there are two fixture files under
`data/fixtures/`: one complete, one deliberately missing a field. Run:

```bash
npm run validate:fixtures
```

This validates both fixtures against the glossary schema and prints PASS for
the complete one and FAIL (with the specific missing field) for the
incomplete one. That command always exits 0 — the incomplete fixture failing
is the expected, correct outcome, not a bug — it's there so you can see the
validator actually catch something before relying on it.

You can also point the validator at any single file directly:

```bash
node scripts/validate.js data/fixtures/glossary-incomplete.json glossary
```

## The Explain It Back game and the submission/feedback file bridge

The Game page shows one random glossary term, an answer box, and a Submit
button. It works like this:

1. You read the term, write your own explanation, and click **Submit**. The
   app `POST`s it to the local server, which writes it to
   `data/latest-submission.json` — a single slot, no history. Submitting
   again overwrites it and clears any previous feedback file, since that
   feedback belonged to the previous round.
2. You tell your own Claude Code session (running in your terminal, in this
   same repo) to check it — for example: *"Check my latest submission using
   the term-checker skill."* (You'll build that skill yourself later in the
   course — until then, there's nothing to invoke yet.)
3. Claude Code reads `data/latest-submission.json` and `checklist.md`
   directly (plain local file reads — no network call, no MCP needed for
   this), applies the `term-checker` skill, and writes structured feedback
   to `data/latest-feedback.json`.
4. Back in the app, you click the **Check feedback** button — it is
   deliberately manual, not auto-polling, so every step stays visibly
   human-triggered. It `GET`s `/api/feedback`, which reads
   `data/latest-feedback.json` if present. Before that file exists, the panel
   clearly says it's waiting for you to ask Claude Code to check it, rather
   than looking broken or silently empty.
5. You can also click **Reveal** at any time, independent of the feedback
   flow, to see the approved concept card for the current term (or, before
   one exists, the basic glossary entry instead) and self-review your own
   answer against it.

**Why files instead of an API key:** Claude Code, running in your own
terminal, is already authenticated. There is no server-side model call
anywhere in this app; "AI feedback" is entirely your own Claude Code session
doing file-based work against `checklist.md` and the submission file.

## Skills

Claude Code skills in this project live under `.claude/skills/<name>/SKILL.md`
— that folder doesn't exist yet in this starter repo. You'll create
`create-concept-card` and `term-checker` there yourself as part of the
course; this README isn't the place to say what should go inside one.

## Project structure

- `server.js` — a tiny Node server (built-in `http`/`fs` only, no framework)
  that serves `public/` and exposes:
  - `GET /api/glossary`, `GET /api/concept-cards` — read the matching JSON
    file in `data/`.
  - `POST /api/submissions` — writes `data/latest-submission.json` (single
    slot) and clears `data/latest-feedback.json`.
  - `GET /api/feedback` — reads `data/latest-feedback.json` if present.
  - There is no `/api/profiles` route yet.
- `public/` — the frontend: plain HTML, CSS, and vanilla JS. No build step.
  `public/assets/` holds the AetherBOT mascot images.
- `data/glossary.json` — starts empty; AI terminology entries go here.
- `data/concept-cards.json` — starts empty; enriched concept cards go here.
- `data/fixtures/` — one complete and one deliberately incomplete glossary
  fixture, for exercising `npm run validate`.
- `checklist.md` — currently just a placeholder; the class fills this in
  together.
- `scripts/validate.js` — the `npm run validate` implementation.
- `notes/day1-learning-note-template.md` — copy this to
  `notes/day1-learning-note.md` and fill it in at the end of Day 1. You'll use
  it again on Day 2.
- `CLAUDE.md` — project instructions for Claude Code. Intentionally minimal
  to start; you'll review and improve it yourself during the course.

## About MCP and this repo

This repo does **not** use MCP anywhere — deliberately. Nothing in this
repository requires MCP to work. Later course work connects to real external
systems (Jira/GitLab/Confluence) — that's configured separately, outside this
repo, not anything in this folder.
