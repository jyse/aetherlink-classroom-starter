# Explanation checklist

The criteria for a good "explain this AI term back in your own words" answer.

This file is the single source of truth for how a submission in the "Explain
It Back" game is reviewed. The `term-checker` skill reads it fresh at run
time, so changing the criteria here changes the review — no skill edit needed.

## How to use it

The matching concept card in `data/concept-cards.json` is the yardstick. A
submission is measured against that card, not against a general sense of what
a good answer sounds like.

Two things that follow from this:

- **Different words are fine; different meaning is not.** The participant is
  explaining the term in their own words, so an answer that uses none of the
  card's phrasing can still be complete. Judge what the answer conveys, not
  how closely it echoes the source.
- **Only the card defines "missing".** If something is absent from the
  concept card, its absence from the answer is not a gap. Say plainly when a
  point comes from outside the card instead of listing it as missing.

If no concept card exists for the term, only criteria 1 and 3 can be applied
with any confidence. Say so rather than inventing a standard.

## The criteria

### 1. Central meaning

The answer conveys what the term actually is, matching the card's
`explanation`.

- The core idea is there, not just a related or adjacent one.
- Where the card draws a distinction that defines the term, the answer draws
  it too — the model choosing the next step versus a hardcoded path for
  *Agent*, or the model emitting a request versus executing it for *Tool
  call*.
- The answer would let someone who did not know the term recognise it
  correctly afterwards.

### 2. Important elements

The answer covers the points the card lists in `essentialPoints`.

- Not all of them — these lists run to six items and are deliberately
  thorough. Look for the ones that carry the meaning.
- A point counts as covered when the idea is present, even if compressed into
  half a sentence or expressed in different vocabulary.
- Note which essential points are *not* covered; that list feeds criterion 5.

### 3. A practical example

The answer grounds the term in something concrete, in the spirit of the
card's `example`.

- Any example works — it does not have to be the card's. A participant's own
  example from their own work is a better sign of understanding, not a worse
  one.
- What matters is that it is specific enough to be checkable: an actual
  situation, not a restatement of the definition with "for example" in front
  of it.
- An example that contradicts the explanation is an incorrect claim
  (criterion 4), not a missing example.

### 4. No incorrect claims

Nothing in the answer is factually wrong about the term.

- Check against the card's `commonMisunderstanding` first — that field exists
  because it records the mistake people actually make with this term.
- Also check for claims the card contradicts elsewhere, and for claims that
  are simply untrue of the world.
- Distinguish three things and treat them differently: a wrong claim,
  a simplification that stays true, and a point the card does not address.
  Only the first is an error. Say which one you are looking at.
- Quote or paraphrase the specific claim. "Some of this is inaccurate" is not
  usable feedback.

### 5. Nothing important missing

Relative to the concept card, nothing significant is left out.

- This is criterion 2 stated as a gap: which essential points did the answer
  not reach?
- Weight by importance. A missing defining distinction matters more than a
  missing caveat.
- Where the card names a trade-off or a cost — latency and blast radius for
  *Agent*, degraded recall as a window fills for *Context window* — an answer
  that gives only the upside is incomplete, not wrong.
- Keep this list short and ranked. Three well-chosen gaps are more useful
  than eight.

### 6. Resources worth recommending

Point the participant at what would close the gaps found above.

- Recommend from the card's `resources` list. Do not invent sources or URLs,
  and do not recall a link from memory — if it is not in the card, it does
  not go in the feedback.
- Pick for the gaps actually found rather than listing everything the card
  has. Tie each recommendation to a specific gap.
- The card's `relatedConcepts` are fair to mention as next terms to explore,
  but they are not a substitute for a resource.
- If the answer is strong and has no real gaps, recommending nothing is a
  valid outcome.

## Writing the feedback

Feedback is written to `data/latest-feedback.json` only when a human asks for
a check. The fields the page renders are `rating`, `whatWasUnderstood`,
`missingElements`, `incorrectClaims`, `recommendedResources` and an optional
`note`. The criteria above map onto them directly: 1 and 2 into
`whatWasUnderstood`, 5 into `missingElements`, 4 into `incorrectClaims`, 6
into `recommendedResources`.

Use one of these four ratings — the page styles exactly these:

- **Strong explanation** — central meaning right, the essential points that
  carry it are present, an example that holds up, no incorrect claims.
- **Partially complete** — the core is right but there are real gaps, or the
  example is missing or too vague to check.
- **Review this concept** — the central meaning is off, or an incorrect claim
  would mislead someone relying on the answer.
- **Unable to evaluate** — no concept card for this term, or the submission
  is too short to assess. Say which.

Tone: address the participant directly, lead with what they got right, and be
specific about everything else. The point of the game is a clearer
understanding of the term, not a score.
