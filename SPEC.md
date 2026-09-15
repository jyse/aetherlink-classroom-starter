# Aether Library — Technical Specification (starter repo)

**Repo:** [github.com/jyse/aetherlink-classroom-starter](https://github.com/jyse/aetherlink-classroom-starter)
**Status:** Starter state — shell and Game fully working; Profiles, Glossary
page, Library page, both Claude Code skills, and `checklist.md`'s content are
built by participants across the course.

## 1. Purpose

Aether Library is the hands-on practice project for the AetherLink × Worldline
Wave 2 two-day classroom. Each participant clones their own copy of this
starter repo and works alone (no pairing, no shared state — that comes later,
in the separate five-day support programme). Across the two days they use
Claude Code to grow a small AI knowledge library: add a profile, contribute
glossary terms, enrich terms into full "concept cards," build two reusable
Claude Code skills, and play a learning game that gets real AI feedback with
no external API calls.

## 2. Architecture at a glance

| Layer | Choice | Why |
|---|---|---|
| Server | Plain Node (`http`/`fs` built-ins only) | No framework, no build step — `npm start` and it's running |
| Frontend | Static HTML/CSS/vanilla JS, no framework | Zero build tooling; a participant can read the whole client in one sitting |
| Data | Flat JSON files in `data/` | No database — matches a solo, single-machine, disposable practice environment |
| State (the game) | Two files, single slot each | `data/latest-submission.json` / `data/latest-feedback.json` — no history, resets each round (by design, not a limitation) |
| Auth | None | Intentional — no accounts, no secrets, nothing to compromise |

**Dependencies: zero.** `package.json`'s `dependencies` is an empty object, so
`npm install` needs no internet access at all — matters on a locked-down
corporate network.

**No MCP anywhere in this repo, on purpose.** Nothing in this repo's own code
requires MCP. Later course work connects to real external systems
(Jira/GitLab/Confluence), configured separately, outside this repo.

## 3. Data model

### `data/glossary.json`
```json
{
  "term": "string",
  "definition": "string"
}
```
Deliberately minimal — just a term and a plain-language definition. The
richer detail (example, misconception, resources, etc.) belongs to a concept
card, built by *enriching* a glossary term rather than duplicated at the
glossary level. Starts as an empty array (`[]`) in this starter repo —
participants add entries as they go.

### `data/concept-cards.json`
```json
{
  "term": "string",
  "explanation": "string",
  "example": "string",
  "commonMisunderstanding": "string",
  "essentialPoints": ["string", "..."],
  "relatedConcepts": ["string", "..."],
  "resources": [{ "label": "string", "url": "string" }]
}
```
An enriched, "graduated" version of a glossary term. Starts as an empty array
(`[]`) — no seeded example in this starter repo. The Game's "Reveal" button
and `GET /api/concept-cards` already work against this file even while it's
empty; they just fall back to showing the plain glossary entry until a card
exists for a given term.

### `data/profiles.json`
Does not exist yet in this starter repo. Its shape — `name`, `role`, `team`,
`experience`, `learningGoal`, `workflowToImprove` — is defined by
`scripts/validate.js`'s `profile` schema, which is ready to validate the file
the moment it's created. There is no `/api/profiles` route and no Profiles
page yet either; all of it is built from scratch.

### `data/fixtures/`
`glossary-complete.json` and `glossary-incomplete.json` — used only by
`npm run validate:fixtures` to demonstrate the validator actually catches a
broken entry (a deliberately missing field), not to seed the app itself.

## 4. Frontend pages

All four pages live in one static SPA-style shell (`public/index.html` +
`public/app.js`), client-side routed by nav clicks — no page reloads, no
router library. All four nav buttons are visible from the start.

| Page | Status | Backing endpoint |
|---|---|---|
| **Profiles** | Empty placeholder — no data file, no endpoint, no rendering | none yet |
| **Glossary** | Empty placeholder page, but the data and endpoint already exist | `GET /api/glossary` |
| **Library** | Empty placeholder page, but the data and endpoint already exist | `GET /api/concept-cards` |
| **Game** ("Explain It Back") | Fully working | see §6 |

Dark navy / cyan / violet visual system (`--bg:#06111e`, `--cyan:#69e2f2`,
`--violet:#b99aff`), plus a light theme (toggle button, persisted to
`localStorage`). Inter font. The full stylesheet, including rules for
Profiles cards, the Glossary term-list, and the Library field-accordion, is
copied in as-is even though those pages aren't built yet — a consistent
design system to build against from day one.

## 5. Server API

| Route | Method | Behaviour |
|---|---|---|
| `/api/glossary`, `/api/concept-cards` | GET | Streams the matching file in `data/` as-is |
| `/api/submissions` | POST | Body `{term, explanation}` (both required, trimmed, non-empty) → writes `data/latest-submission.json` with a server-set `submittedAt` timestamp; also deletes any stale `data/latest-feedback.json` so a new round never shows an old verdict. 20KB request-body cap. |
| `/api/feedback` | GET | Reads `data/latest-feedback.json` if present → `{available: true, feedback: {...}}`; otherwise `{available: false}` (200 either way — absence is a normal state, not an error) |
| anything else | GET | Serves the matching file under `public/`, falling back to `index.html` for unknown paths (SPA-style) |

No route requires authentication. No route touches anything outside `data/`
and `public/`. There is no `/api/profiles` route in this starter repo.

## 6. The Explain It Back game and the file-based feedback bridge

This is the most architecturally interesting part of the repo, because it
connects a browser app to Claude Code **without any network call between
them and without a server-side model API key.**

**Why this design exists:** every participant already has an authenticated
Claude Code session open in their own terminal. The design makes the
*filesystem* the interface between the browser app and that session, since
they already share one (they're both running against the same repo on the
same machine):

```
┌─────────────┐   POST /api/submissions   ┌──────────┐
│   Browser   │ ────────────────────────▶ │ server.js│──▶ data/latest-submission.json
└─────────────┘                            └──────────┘
                                                             │
                          (participant, in their terminal)  │ reads
                                    "Check my latest         ▼
                                     submission using   ┌──────────────┐
                                     the term-checker   │ Claude Code   │──▶ reads checklist.md
                                     skill."             │ (term-checker)│
                                                          └──────────────┘
                                                             │ writes
                                                             ▼
┌─────────────┐   GET /api/feedback       ┌──────────┐  data/latest-feedback.json
│   Browser   │ ◀──────────────────────── │ server.js│◀──────────┘
└─────────────┘  (on manual button click)  └──────────┘
```

Five explicit steps, each human-triggered on purpose (no auto-polling
anywhere in this loop):

1. Participant reads the shown term, writes an explanation, clicks **Submit**.
2. The participant tells their *own* Claude Code session (already open,
   already authenticated, in the same repo) to check it.
3. Claude Code reads `data/latest-submission.json` and `checklist.md` as
   plain local files — normal file-read, not MCP — applies the
   `term-checker` skill (built by the participant), and writes
   `data/latest-feedback.json`.
4. The participant clicks **Check feedback**. Before that file exists, the
   panel explicitly says it's waiting for step 2 rather than looking broken
   or silently empty.
5. **Reveal** (independent of the above) shows the approved concept card for
   the current term at any time, for self-review, falling back to the plain
   glossary entry if no concept card exists yet for that term.

## 7. Claude Code skills

`.claude/skills/` does not exist in this starter repo. Two skills are built
from scratch across the course:

- **`create-concept-card`** — turns a glossary term into a concept card.
- **`term-checker`** — reads `checklist.md` and
  `data/latest-submission.json`, compares, writes `data/latest-feedback.json`.

A Claude Code skill lives at `.claude/skills/<name>/SKILL.md` — that's a
location/format note only; what each skill should actually contain is course
work, not something this spec prescribes.

## 8. `checklist.md`

Repo-root, plain markdown. In this starter repo it contains only a title and
a one-line note that the class defines the criteria together — no criteria
are pre-filled. The `term-checker` skill (once built) is expected to read
this file fresh every time it checks a submission, rather than hardcoding
criteria into the skill itself.

## 9. Validation

```bash
npm run validate            # checks glossary.json and concept-cards.json shape (and profiles.json, once it exists)
npm run validate:fixtures   # demonstrates the validator on a known-good and a known-broken fixture
```

`scripts/validate.js` checks required fields are present and non-empty,
required lists are non-empty, and `resources` entries are shaped correctly.
An empty top-level array is treated as valid (0 well-formed entries is still
well-formed) — both `data/glossary.json` and `data/concept-cards.json` start
this way. `data/profiles.json` is validated automatically once it exists;
until then, the default `npm run validate` run simply doesn't check a file
that isn't there yet. Exits non-zero on failure with the specific problem
named.

## 10. Reset

```bash
npm run reset   # git checkout -- .
```
Restores every tracked file to the last commit. Deliberately does **not**
touch untracked files (like a participant's own `notes/day1-learning-note.md`)
or the git-ignored round-state files (`data/latest-submission.json`,
`data/latest-feedback.json`) — those are cleared by hand if a fully clean
game-state is wanted.

## 11. Security / scope boundaries

- No authentication, no secrets, no real Worldline data or systems anywhere
  in this repo.
- No database — nothing to persist beyond the current git-ignored round
  state.
- No outbound network calls anywhere in the app's own code.
- `CLAUDE.md` intentionally does not yet define approved commands, privacy
  boundaries, validation expectations, or a human-approval boundary — that's
  built out by the participant later in the course, as part of reviewing and
  improving the project's own Claude Code instructions.
