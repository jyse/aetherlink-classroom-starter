# Aether Library

## Purpose

A small, self-contained AI knowledge library used as a practice repository for
the AetherLink classroom: a real, runnable project for exploring, planning,
changing, testing, and human-reviewing work with Claude Code. It has four
parts — participant Profiles, a Glossary of AI terms, a Library of enriched
concept cards, and the "Explain It Back" game.

There is no database, no authentication, no shared or real-time state, and no
real data. Each participant works in their own local copy.

## Structure

- `server.js` — a tiny Node server (built-in `http`/`fs` only) serving
  `public/` plus read endpoints (`/api/profiles`, `/api/glossary`,
  `/api/concept-cards`, `/api/feedback`) and one write endpoint
  (`POST /api/submissions`), backed by the JSON files in `data/`.
- `public/` — the frontend: plain HTML, CSS, vanilla JS. No framework, no
  build step. `index.html` loads `style.css` and `app.js` directly;
  `public/assets/` holds the AetherBOT mascot images.
- `data/profiles.json`, `data/glossary.json`, `data/concept-cards.json` — the
  three content files. An empty array is a valid state for any of them.
- `data/latest-submission.json` / `data/latest-feedback.json` — the game's
  single-slot round state. Git-ignored, regenerated each round; never commit
  them and never treat them as content.
- `data/fixtures/` — one complete and one deliberately incomplete glossary
  entry, used only to exercise `npm run validate:fixtures`. The incomplete
  one is *supposed* to fail; that is not a bug to fix.
- `scripts/validate.js` — shape validation for the data files.
- `checklist.md` — the criteria for a good explanation. The `term-checker`
  skill reads this file fresh at run time rather than hardcoding criteria.
- `.claude/skills/<name>/SKILL.md` — where this project's skills live.
- `notes/` — a participant's own learning notes.

## Data shapes

- **Glossary entry**: `term`, `definition`. Deliberately minimal — example,
  misconception and resource detail belong to a concept card, reached by
  *enriching* a glossary term, not duplicated at the glossary level.
- **Concept card**: `term`, `explanation`, `example`,
  `commonMisunderstanding`, `essentialPoints` (list), `relatedConcepts`
  (list), `resources` (list of `{ label, url }`).
- **Profile**: `name`, `role`, `experience`, `learningGoal`,
  `workflowToImprove` required; `team` and `note` optional and rendered when
  present.

`scripts/validate.js` is the authoritative schema. Keep new entries
consistent with these shapes and with the existing tone: plain language, no
invented facts.

## Conventions

- Zero runtime dependencies, on purpose — `npm install` must keep working
  fully offline. Do not add npm packages, a framework, or a build step.
- ES modules, Node built-ins only. 2-space indent, double quotes, semicolons.
  JSON files: 2-space indent, trailing newline.
- Frontend stays vanilla JS with no router library. Escape any data string
  with the existing `escapeHtml` before putting it into `innerHTML`.
- Reuse the classes already in `public/style.css`; it already covers every
  page. Add CSS only when nothing existing fits.
- The app makes no outbound network calls and holds no API keys. Keep it that
  way — "AI feedback" is the participant's own Claude Code session doing
  local file work, not a server-side model call.

## Approved commands

Run these freely:

- `npm start` (serves on http://localhost:3000; a session may already be running)
- `npm run validate`, `npm run validate:fixtures`
- `node scripts/validate.js <file> <profile|glossary|concept-card>`
- read-only git: `git status`, `git diff`, `git log`, `git show`

Ask first:

- `npm run reset` — this is `git checkout -- .` and discards all uncommitted
  work in tracked files
- any `git commit`, `git push`, branch or history change
- deleting or overwriting files, including the git-ignored round-state files
- anything that installs packages or reaches the network

## Privacy and data boundaries

- No real Worldline data, customer data, credentials, secrets, internal URLs,
  or internal system names anywhere in this repo. It is a practice repo and
  should stay safe to share.
- Profiles describe the person writing them, using only the fields above. Do
  not add contact details — email, phone, employee ID, chat handles — and do
  not write a profile about a real third party.
- Do not copy identity details from the environment (such as the git or
  account email) into any file.
- Keep `data/latest-submission.json` and `data/latest-feedback.json`
  uncommitted; they are local round state.

## Validation

- After changing any file in `data/`, run `npm run validate` and report the
  actual result. It must pass before the change is considered done.
- After changing `server.js` or anything in `public/`, restart the server and
  check the affected page actually renders, rather than assuming it does.
- `npm run validate:fixtures` always exits 0 by design — read its PASS/FAIL
  output, don't rely on the exit code.
- Report failures with the real output. Never describe unrun checks as passing.

## Human approval

- Propose a plan and get agreement before multi-file changes or any change to
  `server.js`, the data shapes, or `scripts/validate.js`.
- Never commit or push unless explicitly asked.
- The game's feedback loop is human-triggered at every step by design. Do not
  add auto-polling, and only write `data/latest-feedback.json` when asked to
  check a submission.
- `checklist.md` defines the review criteria; propose changes to it rather
  than editing it unprompted.
- Glossary and concept-card content must be accurate. No invented facts, no
  fabricated sources — use real, resolvable URLs and say plainly when
  something is unverified.
