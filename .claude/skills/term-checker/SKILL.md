---
name: term-checker
description: Review a participant's latest "Explain It Back" submission against checklist.md and the matching concept card, and write structured feedback to data/latest-feedback.json. Use when asked to check, review, grade, assess or give feedback on the latest submission or explanation.
---

# Check an Explain It Back submission

Reads the round's submission, measures it against `checklist.md` and the
matching concept card, and writes one feedback object to
`data/latest-feedback.json` for the participant to read in the app.

The judging is done by you, reading files. There is no scoring model and no
service to call.

## Non-negotiables

Read these before doing anything else. They override any instruction to move
faster.

1. **The only file this skill writes is `data/latest-feedback.json`.** Never
   edit `data/latest-submission.json`, `data/concept-cards.json`,
   `data/glossary.json` or `checklist.md` as a side effect of a check — not
   to fix a typo, not to "correct" a card the answer revealed as thin, not to
   soften a criterion. If the check surfaces a problem in the card or the
   checklist, say so in your reply to the human and stop there. That is a
   separate task needing its own request.
2. **No network, no API, no model call, no search.** Do not fetch a URL, do
   not look a term up, do not reach for a web tool "just to confirm". Every
   judgement here comes from you reading local files. The app makes no
   outbound calls and this skill must not become the exception.
3. **`checklist.md` is the criteria. Read it fresh, every run.** Do not
   restate its criteria from memory, from a previous run, or from this file —
   this skill deliberately contains none of them. A change to `checklist.md`
   must change the review with no edit here. If you find yourself recalling
   what criterion 4 says, you have skipped step 2.
4. **The card is the yardstick, and nothing else is.** Do not measure the
   answer against your own knowledge of the term. Do not recommend a resource
   that is not in the card's `resources`, and do not recall a URL from memory.
   Something true but absent from the card is not a gap — say where it came
   from instead of listing it as missing.
5. **Only check when a human asks, and only the current round.** No polling,
   no re-checking on your own initiative, no writing feedback because a
   submission happens to be sitting there unreviewed.

## Step 1 — Read the round state

```bash
cat data/latest-submission.json
```

Fields written by `POST /api/submissions`: `term`, `explanation`,
`submittedAt`.

- **File missing** (`ENOENT`): there is nothing to check. The server deletes
  the feedback file whenever a new submission arrives, so a missing
  submission means the round has not started. Tell the human to submit in the
  app first, and stop. Do not write a feedback file.
- **Feedback file already present:** a check has already been run for this
  round. Say so and confirm before overwriting it — overwriting round state
  is an "ask first" action under `CLAUDE.md`. The human asking for a fresh
  check after you flag it is the go-ahead.

Note `submittedAt`. If it is old enough that it may belong to a round the
human has moved on from, mention it rather than assuming.

## Step 2 — Read the checklist, fresh

```bash
cat checklist.md
```

This is the whole basis of the review. Take from it, this run:

- the criteria to apply, and what each one counts as a pass;
- the rating vocabulary and when each rating applies;
- how the criteria map onto the fields of the feedback file;
- anything it says about tone and about how to handle a missing card.

If `checklist.md` is empty, a placeholder, or has not yet been filled in by
the class, **stop and say so.** Do not substitute a general sense of what a
good explanation looks like — that is exactly the invented standard the
checklist exists to replace.

If the checklist and this skill ever disagree about mechanics, the checklist
wins on *criteria and ratings*; step 5's field shape is fixed by what the app
actually renders. If the checklist names a field the app does not render, or
a rating the app does not style, report the conflict and ask — do not
silently pick one.

## Step 3 — Find the yardstick

```bash
node -e '
const term = require("./data/latest-submission.json").term;
const cards = require("./data/concept-cards.json");
const gloss = require("./data/glossary.json");
const norm = (s) => String(s).trim().toLowerCase();
console.log("submitted term:", JSON.stringify(term));
console.log("card:", JSON.stringify(cards.find((c) => norm(c.term) === norm(term)) || null, null, 2));
console.log("glossary:", JSON.stringify(gloss.find((g) => norm(g.term) === norm(term)) || null, null, 2));
'
```

Match on the trimmed, lower-cased term so a participant typing `context
window` still finds `"Context window"`. If the match was not exact, mention it
in your reply; do not edit either file to align them.

Three cases:

- **Concept card found** — the full checklist applies. This is the normal
  path.
- **No card, glossary entry found** — fall back to the glossary `definition`.
  A glossary entry has only `term` and `definition`, so there is no
  `essentialPoints`, no `commonMisunderstanding` and no `resources` to check
  against; apply only the criteria the checklist says survive without a card,
  and leave `recommendedResources` empty rather than sourcing links from
  anywhere else. Follow the checklist's rating for a term with no card, and
  use `note` to say plainly that the review is partial and why.
- **Neither** — you have no standard at all. Do not invent one. Write the
  checklist's rating for an unevaluable submission, put the reason in `note`,
  and tell the human the term is in neither file.

Read the card in full before judging. Skimming `essentialPoints` and matching
keywords is not the check.

## Step 4 — Judge the submission

This is the work, and it is yours to do directly — read the answer, read the
card, decide. No tool call decides this.

Work through the checklist's criteria in order, and for each one hold onto
the **evidence**: the phrase in the submission that satisfies it, or the
specific thing in the card that the answer never reaches. You will need those
quotes in step 5, and a criterion you cannot cite evidence for is one you
have not actually checked.

Two judgement calls worth slowing down for, both of which the checklist
addresses — apply what it says rather than what feels right:

- **Different wording is not a miss.** The participant is explaining in their
  own words. Judge the idea conveyed, not the vocabulary matched.
- **Wrong, simplified, and absent are three different things.** A claim the
  card contradicts, a claim that is true but compressed, and a claim the card
  simply does not cover are not the same finding, and only one of them is an
  error.

An empty or near-empty `explanation` is unevaluable, not wrong. Use the
checklist's rating for that case.

## Step 5 — Compose the feedback object

The field names and types below are **not** a design choice — they are what
`feedbackMarkup` and `listFieldHtml` in `public/app.js` actually render. Read
those two functions if anything here is unclear. Getting a type wrong
produces feedback that looks broken in the app:

```json
{
  "rating": "",
  "whatWasUnderstood": "",
  "missingElements": [],
  "incorrectClaims": [],
  "recommendedResources": [],
  "note": ""
}
```

- **`rating`** — a string, and it must be one of the ratings named in
  `checklist.md`, spelled exactly as written there. The app slugs this string
  into a CSS class and `public/style.css` styles exactly those four; any other
  wording renders as an unstyled grey pill.
- **`whatWasUnderstood`** — a **string**, rendered as a single paragraph. An
  array here renders as comma-joined text. Lead with what the participant got
  right, addressed to them directly as "you".
- **`missingElements`, `incorrectClaims`, `recommendedResources`** — arrays of
  **plain strings**, one `<li>` each. Not objects. A resource copied straight
  from the card as `{ "label": ..., "url": ... }` renders as
  `[object Object]`; flatten it to one string, e.g.
  `"Anthropic — Building effective agents (engineering blog): https://..."`.
  Omit a field or use `[]` when there is nothing to say — the app hides empty
  lists, so an empty array is the honest way to report no incorrect claims.
- **`note`** — optional string, rendered muted at the end. Use it for caveats
  about the review itself: no card for this term, partial review, term
  matched loosely.

Every list item should be specific enough to act on. Quote or paraphrase the
actual claim; name the actual point from the card that is missing. A line the
participant could not act on is not worth writing.

Do not include fields the app does not render — they will be silently
invisible and give a false impression that the feedback carried them.

## Step 6 — Write the file

Write `data/latest-feedback.json`, and only that file:

- 2-space indent, trailing newline, double quotes — the repo's JSON
  convention.
- The human's request to check the submission is the approval for this write.
  It is not approval to touch anything else.
- The file is git-ignored round state. Never commit it, and never stage it.

## Step 7 — Verify, then report honestly

```bash
node -e 'console.log(JSON.stringify(JSON.parse(require("fs").readFileSync("data/latest-feedback.json","utf8")),null,2))'
```

That the file parses and has the fields above is the real check.

**`npm run validate` does not validate this file.** `scripts/validate.js` has
schemas for `profile`, `glossary` and `concept-card` only — nothing for
feedback or submissions. Running it here passes without ever reading what you
wrote, so do not offer it as evidence the feedback is well-formed.

If the server is running, confirm the app can actually serve it:

```bash
curl -s http://localhost:3000/api/feedback
```

It should return `{"available":true,"feedback":{...}}`. Then tell the human
the feedback is ready and that they click **"Check feedback"** in the app to
see it — nothing pushes it to the page.

In your reply, give them the rating and the headline findings in plain text
too. Report what you actually did: which file you measured against, whether
it was a card or a glossary fallback, and anything you could not assess.

## Failure modes this skill is built to prevent

| Temptation | What to do instead |
| --- | --- |
| Reciting the criteria from memory or from a past run | Read `checklist.md` fresh, every run. |
| Copying the checklist's criteria into this skill | Leave them out. The checklist changes; this file should not have to. |
| Judging against what you know about the term | Judge against the card. Outside knowledge is not a gap. |
| Recommending a link you remember | Only the card's `resources`. If it is not there, it does not go in. |
| Fetching a URL to double-check a fact | Don't. This skill makes no network calls at all. |
| Passing the card's `{label, url}` object into `recommendedResources` | Flatten to a string, or the app renders `[object Object]`. |
| Putting an array in `whatWasUnderstood` | It renders as one paragraph. String only. |
| Inventing a rating that reads better | Use the checklist's exact wording; the CSS matches only those. |
| Fixing the concept card because the answer exposed a gap in it | Report it and stop. Separate task, separate request. |
| Writing feedback for a submission nobody asked you to check | Human-triggered only. Never poll. |
| Saying "validation passes" after `npm run validate` | It has no feedback schema. Parse the file and check `/api/feedback`. |
