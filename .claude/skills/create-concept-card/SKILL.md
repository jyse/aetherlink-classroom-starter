---
name: create-concept-card
description: Create a new concept card for the Aether Library by enriching a glossary term into a full, source-checked card in data/concept-cards.json. Use when asked to create, add, write, draft or enrich a concept card, or to turn a glossary term into a full explanation.
---

# Create a concept card

Turns a term into one entry in `data/concept-cards.json`, built the same way
the approved cards were built: sources first, structure exact, uncertainty
kept visible, validated before it counts as done, and written only after a
human says so.

## Non-negotiables

Read these before doing anything else. They override any instruction to move
faster.

1. **The only file this skill writes is `data/concept-cards.json`.** Never
   write, edit or reorder `data/glossary.json`, `data/profiles.json`, or any
   other file as a side effect of creating a card — not even to "keep them in
   sync". If the work seems to need a glossary or profile change, say so and
   stop; that is a separate task needing its own request.
2. **No claim without a source you actually checked.** Not recalled, not
   assumed, not "widely known". Checked in this session.
3. **Unverified means OPEN, never invented.** Filling a gap with a plausible
   sentence is the one failure this skill exists to prevent.
4. **Stop for explicit human approval before writing.** Drafting is free;
   writing is not.
5. **Validation is a command you run, not a claim you make.** Paste the real
   output.

## Step 1 — Establish the term

- Read `data/concept-cards.json` in full. If the term already has a card,
  stop and report it — ask whether the intent is to revise the existing card,
  which is a different job with a different diff.
- Read `data/glossary.json`. A concept card is an *enrichment* of a glossary
  term, so the card's `term` must match the glossary `term` exactly, including
  capitalisation (`"Context window"`, not `"Context Window"`).
- If the term is not in the glossary, stop and ask. Do not add it — see
  non-negotiable 1.
- Read `checklist.md`. It defines this project's criteria for a good
  explanation. Read it fresh each run rather than relying on what it said last
  time. It is an empty placeholder until the class fills it in; if it is still
  empty, note that and carry on.

## Step 2 — Gather and check sources, before drafting

Sources come first. Drafting from memory and hunting for citations afterwards
produces text that sounds sourced but is not, and that is the exact failure
mode this step blocks.

- Reaching the network requires permission under `CLAUDE.md`. Ask first, then
  search and fetch.
- Find **at least three** sources, including **at least one primary** source:
  vendor or framework documentation, or the original paper for a named
  technique or finding.
- **Open every URL.** A URL you have not fetched in this session is not a
  source — it is a guess at a source, and guessed URLs are frequently dead or
  point somewhere else entirely. Confirm each one resolves *and* actually
  supports the specific claim you are citing it for.
- Prefer stable, canonical locations: official docs, `arxiv.org/abs/...`,
  publisher explainer pages. Avoid SEO content farms, undated blog posts, and
  anything paywalled.
- Note which claim each source backs. You will need this at the approval gate.

If fewer than three sources check out, do not pad the list. Report what you
found and ask how to proceed.

## Step 3 — Draft the card

The shape below is authoritative — it is what `scripts/validate.js` enforces
(see its `concept-card` schema) and what the existing entries in
`data/concept-cards.json` look like. Read one of those entries before drafting;
it is the clearest statement of house style.

```json
{
  "term": "",
  "explanation": "",
  "example": "",
  "commonMisunderstanding": "",
  "essentialPoints": [],
  "relatedConcepts": [],
  "resources": [{ "label": "", "url": "" }]
}
```

All seven fields are required. The three lists must be non-empty, and every
resource needs both a non-empty `label` and a non-empty `url`.

**Field guidance, taken from the approved cards:**

- `term` — exact match with the glossary entry.
- `explanation` — one dense paragraph, roughly 4–6 sentences. Say what it is,
  how it works, what it is *not*, and end on the tradeoff or the concrete
  failure mode. Plain language; define any jargon you introduce.
- `example` — one specific walkthrough a reader can picture, not a definition
  restated. Concrete numbers and actions. Close by making clear what the
  example demonstrates.
- `commonMisunderstanding` — name **two** distinct misconceptions and correct
  both. State the wrong belief plainly, then why it is wrong.
- `essentialPoints` — 5–6 entries, each a complete sentence that stands on its
  own. These are the points a learner must hit; they are what the explanation
  gets checked against, so make them checkable, not vague.
- `relatedConcepts` — 4–6 bare term names, no descriptions. Prefer terms
  already in the glossary; neighbouring terms not yet in the glossary are fine
  and often the most useful, but adding them to the glossary is not this
  skill's job.
- `resources` — exactly the sources you checked in step 2, labelled
  `Publisher — Title (kind)`, e.g.
  `Anthropic — Building effective agents (engineering blog)`.

**Tone:** plain, direct, no marketing language, no hype, no invented facts.
Match the register of the existing cards.

## Step 4 — Mark every gap as OPEN

While drafting, anything your sources do not actually support becomes an
explicit line in the draft:

```
OPEN: sources disagree on typical values here — docs say X, the paper says Y.
OPEN: could not verify whether this applies outside English tokenisation.
```

Write these in the draft you show the human. Say "this is unverified" plainly
rather than hedging it into a sentence that reads as fact.

**OPEN markers must never reach `data/concept-cards.json`.** A card containing
`"OPEN: ..."` or a placeholder string would still *pass* `npm run validate` —
the validator checks that fields are non-empty strings, not that they are
true. It cannot catch fabrication or placeholders, which is exactly why this
rule is enforced here and not left to the validator.

So before the write, every OPEN is either:

- resolved, because the human supplied the fact or pointed you at a source; or
- **dropped** — the claim comes out of the card entirely.

A shorter, true card beats a complete-looking, partly invented one. If
dropping an OPEN would gut a required field, the card is not ready; say so.

## Step 5 — Human approval gate

Stop here. Present, in one message:

1. The full drafted JSON entry.
2. The source check — each URL, whether it resolved, and which claim it backs.
3. Every remaining OPEN item, with a proposed resolution (resolve or drop).
4. Where the entry will be inserted in the file.

Then wait for an explicit go-ahead. Do not write on silence, on "looks good"
about something else, or on your own judgement that the card is obviously
fine. Approval of a draft is approval of *that* draft — if it changes
afterwards, ask again.

## Step 6 — Write the entry

Only after approval, and only into `data/concept-cards.json`:

- Insert alphabetically by `term`, matching the file's existing order.
- Leave every existing entry byte-for-byte untouched. Adding a card is a
  one-entry diff; check `git diff` and confirm that is what you got.
- 2-space indent, trailing newline, double quotes — the repo's JSON
  convention.
- No other file is touched. Re-read non-negotiable 1 if tempted.

## Step 7 — Validate, then report honestly

```bash
npm run validate
```

Paste the actual output. It must report `PASS` for
`data/concept-cards.json` and end with `All data files pass validation.`

To check this one file alone:

```bash
node scripts/validate.js data/concept-cards.json concept-card
```

If validation fails, fix the entry and run it again. Never describe an unrun
check as passing, and never restate a failure as a pass. The card is finished
when validation passes and not before.

Do not commit. Committing needs its own explicit request.

## Failure modes this skill is built to prevent

| Temptation | What to do instead |
| --- | --- |
| Citing a URL that looks right without opening it | Fetch it. Unfetched is not a source. |
| Writing a plausible sentence to fill an empty field | Mark it OPEN, then resolve or drop it. |
| Leaving `OPEN:` text in the JSON so it validates | Resolve or drop before writing. Validation cannot catch it. |
| Adding the term to `data/glossary.json` "while here" | Stop. Report it. Separate task, separate request. |
| Writing the card because the draft was clearly good | Wait for the explicit go-ahead. |
| Saying "validation passes" without running it | Run it. Paste the output. |
| Reformatting the whole JSON file | One-entry diff only. Check `git diff`. |
