// Vanilla JS, no build step. Fetches real data from the tiny server's API
// endpoints. Profiles, Glossary, Library and the Explain It Back game all
// render from real data.

const THEME_KEY = "academy-practice-theme";

// Explain It Back game state — kept in memory only, resets on page reload.
let glossaryTerms = [];
let conceptCards = [];
let currentGameTerm = null;

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") {
    document.documentElement.dataset.theme = saved;
  }
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
  });
}

function initNav() {
  const buttons = document.querySelectorAll("nav button[data-view]");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("selected"));
      button.classList.add("selected");
      document.querySelectorAll(".view").forEach((view) => {
        view.hidden = view.id !== `view-${button.dataset.view}`;
      });
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Shared concept-card field rendering ---------------------------------
// Used by both the Library page and the Game's Reveal panel below — keep it
// working against the concept-card shape in data/concept-cards.json.

function fieldSection(label, bodyHtml, accent) {
  return `
    <details class="field-row field-row--${accent}">
      <summary>${escapeHtml(label)}</summary>
      <div class="field-body">${bodyHtml}</div>
    </details>
  `;
}

function conceptCardFieldsHtml(c) {
  return [
    fieldSection("Explanation", `<p>${escapeHtml(c.explanation || "")}</p>`, "cyan"),
    fieldSection("Example", `<p>${escapeHtml(c.example || "")}</p>`, "violet"),
    fieldSection("Common misunderstanding", `<p>${escapeHtml(c.commonMisunderstanding || "")}</p>`, "cyan"),
    fieldSection(
      "Essential points",
      `<ul>${(c.essentialPoints || []).map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`,
      "violet"
    ),
    fieldSection(
      "Related concepts",
      `<div class="tag-list">${(c.relatedConcepts || []).map((r) => `<span class="chip">${escapeHtml(r)}</span>`).join("")}</div>`,
      "cyan"
    ),
    fieldSection(
      "Resources",
      `<ul>${(c.resources || [])
        .map((r) => `<li><a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">${escapeHtml(r.label)}</a></li>`)
        .join("")}</ul>`,
      "violet"
    ),
  ].join("");
}

function findConceptCard(term) {
  return conceptCards.find((c) => c.term.toLowerCase() === String(term || "").toLowerCase());
}

// --- Profiles ------------------------------------------------------------
// Renders data/profiles.json (served by GET /api/profiles) into the Profiles
// page, reusing the card/avatar styles already in style.css.

function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function profileFieldHtml(label, value) {
  if (!value) return "";
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function profileCardHtml(profile) {
  const subtitle = [profile.role, profile.team].filter(Boolean).join(" · ");
  return `
    <article class="card">
      <div class="card-header">
        <div class="avatar">${escapeHtml(initials(profile.name))}</div>
        <div>
          <h3>${escapeHtml(profile.name || "Unnamed participant")}</h3>
          ${subtitle ? `<small>${escapeHtml(subtitle)}</small>` : ""}
        </div>
      </div>
      <dl>
        ${profileFieldHtml("Experience", profile.experience)}
        ${profileFieldHtml("Learning goal", profile.learningGoal)}
        ${profileFieldHtml("Workflow to improve", profile.workflowToImprove)}
      </dl>
      ${profile.note ? `<p class="muted">${escapeHtml(profile.note)}</p>` : ""}
    </article>
  `;
}

async function initProfiles() {
  const list = document.getElementById("profiles-list");
  list.innerHTML = '<p class="loading">Loading profiles&hellip;</p>';

  let profiles;
  try {
    const res = await fetch("/api/profiles");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed: ${res.status}`);
    }
    profiles = await res.json();
  } catch (err) {
    list.innerHTML = `<p class="error-message">Could not load profiles: ${escapeHtml(err.message)}</p>`;
    return;
  }

  if (!Array.isArray(profiles) || profiles.length === 0) {
    list.innerHTML = `
      <div class="card-grid">
        <div class="empty-state">
          <img src="/assets/aetherbot-pointing.png" alt="" class="mascot mascot-empty" />
          <p class="muted">No profiles yet — add an entry to data/profiles.json.</p>
        </div>
      </div>
    `;
    return;
  }

  list.innerHTML = `<div class="card-grid">${profiles.map(profileCardHtml).join("")}</div>`;
}

// --- Glossary ------------------------------------------------------------
// Renders data/glossary.json (served by GET /api/glossary) into the Glossary
// page. Glossary entries are deliberately minimal — term and definition only.
// The richer example/misconception/resources detail belongs to a concept card.

function glossaryEntryHtml(entry) {
  return `
    <dt>${escapeHtml(entry.term || "Untitled term")}</dt>
    <dd>${escapeHtml(entry.definition || "")}</dd>
  `;
}

async function initGlossary() {
  const list = document.getElementById("glossary-list");
  list.innerHTML = '<p class="loading">Loading glossary&hellip;</p>';

  let entries;
  try {
    const res = await fetch("/api/glossary");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed: ${res.status}`);
    }
    entries = await res.json();
  } catch (err) {
    list.innerHTML = `<p class="error-message">Could not load glossary: ${escapeHtml(err.message)}</p>`;
    return;
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    list.innerHTML = `
      <div class="card-grid">
        <div class="empty-state">
          <img src="/assets/aetherbot-pointing.png" alt="" class="mascot mascot-empty" />
          <p class="muted">No glossary terms yet — add an entry to data/glossary.json.</p>
        </div>
      </div>
    `;
    return;
  }

  list.innerHTML = `
    <article class="card">
      <dl class="term-list">${entries.map(glossaryEntryHtml).join("")}</dl>
    </article>
  `;
}

// --- Library -------------------------------------------------------------
// Renders data/concept-cards.json (served by GET /api/concept-cards) into the
// Library page. Each card is one term with its six fields as collapsible rows,
// reusing conceptCardFieldsHtml() — the same markup the Game's Reveal panel
// shows, so an approved card looks identical in both places.

function conceptCardHtml(card) {
  return `
    <article class="card concept-card">
      <span class="chip">${escapeHtml(card.term || "Untitled term")}</span>
      <div class="field-accordion">${conceptCardFieldsHtml(card)}</div>
    </article>
  `;
}

async function initLibrary() {
  const list = document.getElementById("library-list");
  list.innerHTML = '<p class="loading">Loading concept cards&hellip;</p>';

  let cards;
  try {
    const res = await fetch("/api/concept-cards");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed: ${res.status}`);
    }
    cards = await res.json();
  } catch (err) {
    list.innerHTML = `<p class="error-message">Could not load concept cards: ${escapeHtml(err.message)}</p>`;
    return;
  }

  if (!Array.isArray(cards) || cards.length === 0) {
    list.innerHTML = `
      <div class="card-grid">
        <div class="empty-state">
          <img src="/assets/aetherbot-pointing.png" alt="" class="mascot mascot-empty" />
          <p class="muted">No concept cards yet — enrich a glossary term into data/concept-cards.json.</p>
        </div>
      </div>
    `;
    return;
  }

  list.innerHTML = `<div class="card-grid">${cards.map(conceptCardHtml).join("")}</div>`;
}

// --- Explain It Back game -----------------------------------------------

// The Game and AetherBOT both need the same two files. Fetch them once and
// share the promise, so whichever asks second reuses the first request.
let libraryDataReady = null;

function loadLibraryData() {
  if (!libraryDataReady) {
    libraryDataReady = (async () => {
      try {
        const [glossaryRes, cardsRes] = await Promise.all([fetch("/api/glossary"), fetch("/api/concept-cards")]);
        glossaryTerms = glossaryRes.ok ? await glossaryRes.json() : [];
        if (cardsRes.ok) conceptCards = await cardsRes.json();
      } catch {
        glossaryTerms = [];
      }
    })();
  }
  return libraryDataReady;
}

async function initGameData() {
  await loadLibraryData();
  pickRandomGameTerm();
}

function pickRandomGameTerm() {
  const chip = document.getElementById("game-term-chip");
  const loadingEl = document.getElementById("game-term-loading");

  if (!glossaryTerms.length) {
    loadingEl.textContent = "No glossary terms available yet — add one on the Glossary page first.";
    loadingEl.hidden = false;
    chip.hidden = true;
    currentGameTerm = null;
    return;
  }

  currentGameTerm = glossaryTerms[Math.floor(Math.random() * glossaryTerms.length)];
  chip.textContent = currentGameTerm.term;
  chip.hidden = false;
  loadingEl.hidden = true;

  document.getElementById("game-answer").value = "";
  document.getElementById("game-submit-status").textContent = "";
  resetFeedbackPanel();
  resetRevealPanel();
}

function resetFeedbackPanel() {
  document.getElementById("game-feedback-body").innerHTML = `
    <div class="waiting-note">
      <img src="/assets/aetherbot-thinking.png" alt="AetherBOT thinking" class="mascot mascot-inline" />
      <p class="muted">Submit an explanation, tell your Claude Code session to check it (for example: <em>"Check my latest submission using the term-checker skill."</em>), then click "Check feedback".</p>
    </div>
  `;
}

function resetRevealPanel() {
  document.getElementById("game-reveal-body").innerHTML =
    '<p class="muted">Reveal the approved card any time to self-review, independent of Claude\'s feedback.</p>';
}

async function submitExplanation() {
  const statusEl = document.getElementById("game-submit-status");
  const answerEl = document.getElementById("game-answer");
  const answer = answerEl.value.trim();

  if (!currentGameTerm) {
    statusEl.textContent = "No term loaded — click \"New term\" first.";
    return;
  }
  if (!answer) {
    statusEl.textContent = "Write an explanation before submitting.";
    return;
  }

  statusEl.textContent = "Submitting…";
  try {
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ term: currentGameTerm.term, explanation: answer }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);

    const time = new Date(data.submission.submittedAt).toLocaleTimeString();
    statusEl.textContent = `Submitted at ${time}. Now ask Claude Code to check it, then click "Check feedback".`;
    resetFeedbackPanel();
  } catch (err) {
    statusEl.textContent = `Could not submit: ${err.message}`;
  }
}

async function checkFeedback() {
  const body = document.getElementById("game-feedback-body");
  body.innerHTML = '<p class="loading">Checking&hellip;</p>';
  try {
    const res = await fetch("/api/feedback");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);

    if (!data.available) {
      body.innerHTML = `
        <div class="waiting-note">
          <img src="/assets/aetherbot-thinking.png" alt="AetherBOT thinking" class="mascot mascot-inline" />
          <p class="muted">Waiting for you to ask Claude Code to check this — try: <em>"Check my latest submission using the term-checker skill."</em></p>
        </div>
      `;
      return;
    }
    body.innerHTML = feedbackMarkup(data.feedback);
  } catch (err) {
    body.innerHTML = `<p class="error-message">Could not load feedback: ${err.message}</p>`;
  }
}

function feedbackMarkup(fb) {
  const ratingSlug = String(fb.rating || "unknown")
    .toLowerCase()
    .replace(/[^a-z]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `
    <span class="feedback-rating rating-${escapeHtml(ratingSlug)}">${escapeHtml(fb.rating || "Unknown")}</span>
    <p>${escapeHtml(fb.whatWasUnderstood || "")}</p>
    ${listFieldHtml("Missing elements", fb.missingElements)}
    ${listFieldHtml("Incorrect claims", fb.incorrectClaims)}
    ${listFieldHtml("Recommended resources", fb.recommendedResources)}
    ${fb.note ? `<p class="muted feedback-note">${escapeHtml(fb.note)}</p>` : ""}
  `;
}

function listFieldHtml(label, items) {
  if (!items || !items.length) return "";
  return `
    <div class="feedback-list">
      <dt>${escapeHtml(label)}</dt>
      <dd><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></dd>
    </div>
  `;
}

function revealConceptCard() {
  const body = document.getElementById("game-reveal-body");
  if (!currentGameTerm) return;

  const card = findConceptCard(currentGameTerm.term);
  if (card) {
    body.innerHTML = `<div class="field-accordion">${conceptCardFieldsHtml(card)}</div>`;
    return;
  }

  body.innerHTML = `
    <p class="muted">No enriched concept card exists yet for "${escapeHtml(
      currentGameTerm.term
    )}" — showing the basic glossary entry it would be built from instead.</p>
    <dl>
      <div><dt>Definition</dt><dd>${escapeHtml(currentGameTerm.definition || "")}</dd></div>
    </dl>
  `;
}

function initGame() {
  document.getElementById("game-next").addEventListener("click", pickRandomGameTerm);
  document.getElementById("game-submit").addEventListener("click", submitExplanation);
  document.getElementById("game-check-feedback").addEventListener("click", checkFeedback);
  document.getElementById("game-reveal").addEventListener("click", revealConceptCard);
  initGameData();
}

// --- AetherBOT -----------------------------------------------------------
// A deterministic glossary tutor. Every answer is looked up in
// data/glossary.json and data/concept-cards.json (already loaded by
// loadLibraryData) — there is no model here and nothing leaves the machine.
// When AetherBOT cannot answer from those two files it says so plainly and
// offers what it does have, rather than inventing an answer.

let botCurrentTerm = null;
let botGreeted = false;

// Ways of asking, mapped onto one concept-card field each. First match wins,
// so the more specific patterns come first. Tested against botNormalize()
// output, which is lowercase and punctuation-free ("what's" -> "what s").
const BOT_INTENTS = [
  { name: "list", test: /\b(list|all|which|what) (the )?(terms|words|concepts)\b|\bwhat do you know\b|\bwhat can you (do|help)\b|\bhelp me\b|\bmenu\b/ },
  { name: "misconception", test: /\bwrong\b|\bmistakes?\b|\bmisunderstand|\bmisconcep|\bconfus|\bmyth\b|\bmixed? up\b|\btrips? people\b/ },
  { name: "example", test: /\bexamples?\b|\bfor instance\b|\bin practice\b|\bconcrete\b|\bshow me\b|\buse case\b|\bwhen would\b/ },
  { name: "essentials", test: /\bkey points?\b|\bessential|\bmain points?\b|\bsummar|\bremember\b|\btl dr\b|\bin short\b/ },
  { name: "related", test: /\brelated\b|\bsimilar\b|\bconnected\b|\bwhat next\b|\bother terms?\b|\bwhat else\b/ },
  { name: "resources", test: /\bresources?\b|\breading\b|\bread more\b|\blinks?\b|\bsources?\b|\blearn more\b|\bwhere can i\b/ },
  { name: "definition", test: /\bwhat is\b|\bwhat s\b|\bwhat are\b|\bdefine\b|\bdefinition\b|\bmeans?\b|\bmeaning\b|\bexplain\b|\btell me about\b/ },
];

// What AetherBOT can offer for any one term — label plus the phrasing that
// triggers it, so a tapped chip travels the same path as a typed question.
const BOT_MENU = [
  ["Explanation", "what is"],
  ["Example", "give me an example of"],
  ["Common mistake", "what do people get wrong about"],
  ["Key points", "key points of"],
  ["Related", "what is related to"],
  ["Resources", "resources for"],
];

function botNormalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Looks for any glossary term inside the message, tolerating case and a
// trailing plural. The longest match wins, so "context window" beats a term
// that happens to be a substring of it.
function botFindTerm(text) {
  const haystack = ` ${botNormalize(text)} `;
  let best = null;
  glossaryTerms.forEach((entry) => {
    const needle = botNormalize(entry.term);
    if (!needle) return;
    const variants = [needle, `${needle}s`, needle.replace(/s$/, "")];
    const matched = variants.some((variant) => haystack.includes(` ${variant} `));
    if (matched && (!best || needle.length > botNormalize(best.term).length)) best = entry;
  });
  return best;
}

function botDetectIntent(text) {
  const normalized = botNormalize(text);
  const intent = BOT_INTENTS.find((candidate) => candidate.test.test(normalized));
  return intent ? intent.name : null;
}

// Filler around a term in a plain "what is X" question. Whatever is left after
// removing the term and these words is the part AetherBOT was not asked about.
const BOT_FILLER = /\b(what|whats|is|are|was|a|an|the|of|do|does|did|mean|means|meaning|tell|me|about|explain|define|definition|please|can|you|could|again|so|and|s|it|that|this|for|in|on)\b/g;

function botIsDefinitionRequest(text, entry) {
  const needle = botNormalize(entry.term);
  let rest = botNormalize(text);
  [`${needle}s`, needle].forEach((variant) => {
    rest = rest.split(variant).join(" ");
  });
  return rest.replace(BOT_FILLER, " ").replace(/\s+/g, " ").trim() === "";
}

function botCannotAnswerHtml(entry) {
  return `
    <p>That isn't something I can answer from my card for <strong>${escapeHtml(entry.term)}</strong> — I only know what the Library holds, and I'd rather tell you that than make something up.</p>
    <p class="bot-hint">Here's what I do have for ${escapeHtml(entry.term)}:</p>
    ${botMenuHtml(entry.term)}
  `;
}

function botUnknownHtml() {
  return `
    <p>I couldn't find that in the glossary. I only teach the terms the Library holds, so rather than guess, here's everything I know:</p>
    ${botTermChipsHtml(botAllTerms())}
  `;
}

function botTermChipsHtml(terms) {
  return `<div class="bot-chips">${terms
    .map((term) => `<button type="button" class="bot-chip" data-term="${escapeHtml(term)}">${escapeHtml(term)}</button>`)
    .join("")}</div>`;
}

function botMenuHtml(term) {
  return `<div class="bot-chips">${BOT_MENU.map(
    ([label, phrase]) =>
      `<button type="button" class="bot-chip bot-chip--menu" data-ask="${escapeHtml(`${phrase} ${term}`)}">${escapeHtml(label)}</button>`
  ).join("")}</div>`;
}

// Related concepts become tappable when they are themselves glossary terms,
// and stay as plain chips when they are not — no dead ends.
function botRelatedChipsHtml(related) {
  return `<div class="bot-chips">${related
    .map((name) => {
      const known = glossaryTerms.some((entry) => entry.term.toLowerCase() === String(name).toLowerCase());
      return known
        ? `<button type="button" class="bot-chip" data-term="${escapeHtml(name)}">${escapeHtml(name)}</button>`
        : `<span class="chip">${escapeHtml(name)}</span>`;
    })
    .join("")}</div>`;
}

function botAllTerms() {
  return glossaryTerms.map((entry) => entry.term);
}

function botNoCardHtml(entry, wanted) {
  return `
    <p>There's no concept card for <strong>${escapeHtml(entry.term)}</strong> in the Library yet, so I don't have ${escapeHtml(wanted)} for it.</p>
    <p>Here's the glossary definition instead:</p>
    <p class="bot-quote">${escapeHtml(entry.definition || "")}</p>
  `;
}

// One answer per intent, each read straight off the concept card.
function botFieldHtml(entry, card, intent) {
  const term = escapeHtml(entry.term);

  if (intent === "example") {
    if (!card || !card.example) return botNoCardHtml(entry, "an example");
    return `<p>An example of <strong>${term}</strong>:</p><p class="bot-quote">${escapeHtml(card.example)}</p>`;
  }

  if (intent === "misconception") {
    if (!card || !card.commonMisunderstanding) return botNoCardHtml(entry, "the common misunderstanding");
    return `<p>What people most often get wrong about <strong>${term}</strong>:</p><p class="bot-quote">${escapeHtml(card.commonMisunderstanding)}</p>`;
  }

  if (intent === "essentials") {
    const points = (card && card.essentialPoints) || [];
    if (!points.length) return botNoCardHtml(entry, "a list of key points");
    return `<p>The essential points for <strong>${term}</strong>:</p><ul class="bot-list">${points
      .map((point) => `<li>${escapeHtml(point)}</li>`)
      .join("")}</ul>`;
  }

  if (intent === "related") {
    const related = (card && card.relatedConcepts) || [];
    if (!related.length) return botNoCardHtml(entry, "a list of related concepts");
    return `<p>Concepts related to <strong>${term}</strong> — tap any I also have in the glossary:</p>${botRelatedChipsHtml(related)}`;
  }

  if (intent === "resources") {
    const resources = (card && card.resources) || [];
    if (!resources.length) return botNoCardHtml(entry, "any resources");
    return `<p>Where to read more about <strong>${term}</strong>:</p><ul class="bot-list">${resources
      .map(
        (resource) =>
          `<li><a href="${escapeHtml(resource.url)}" target="_blank" rel="noopener">${escapeHtml(resource.label)}</a></li>`
      )
      .join("")}</ul>`;
  }

  // Default: the definition, deepened by the card's explanation when one exists.
  const definition = `<p><strong>${term}</strong> — ${escapeHtml(entry.definition || "")}</p>`;
  const explanation = card && card.explanation ? `<p class="bot-quote">${escapeHtml(card.explanation)}</p>` : "";
  const follow = card
    ? `<p class="bot-hint">Want more on ${term}?</p>${botMenuHtml(entry.term)}`
    : `<p class="bot-hint">There's no concept card for ${term} yet, so the definition is all I have.</p>`;
  return `${definition}${explanation}${follow}`;
}

function botAnswerHtml(text) {
  if (!glossaryTerms.length) {
    return `<p>I can't reach the glossary right now, so I have nothing to teach from. Check the server is running, then reload the page.</p>`;
  }

  const normalized = botNormalize(text);

  if (/^(hi|hello|hey|yo|hallo|hoi|good (morning|afternoon|evening))\b/.test(normalized)) {
    return `<p>Hello! Can I help you with a term from the glossary?</p>${botTermChipsHtml(botAllTerms())}`;
  }
  if (/\b(thanks|thank you|thx|cheers|dank je|dankje)\b/.test(normalized)) {
    return `<p>Any time. Ask me about another term whenever you like.</p>${botTermChipsHtml(botAllTerms())}`;
  }

  const found = botFindTerm(text);
  if (found) botCurrentTerm = found;
  const intent = botDetectIntent(text);

  if (intent === "list" && !found) {
    return `<p>I know ${glossaryTerms.length} term${glossaryTerms.length === 1 ? "" : "s"} so far. Tap one and I'll explain it:</p>${botTermChipsHtml(botAllTerms())}`;
  }

  const fieldIntent = intent && intent !== "definition" && intent !== "list";

  // A glossary term appears in this message.
  if (found) {
    const card = findConceptCard(found.term);
    if (fieldIntent) return botFieldHtml(found, card, intent);
    // "agent", "what is an agent" — nothing asked beyond the term itself.
    if (intent === "definition" || botIsDefinitionRequest(text, found)) {
      return botFieldHtml(found, card, "definition");
    }
    // The term is there, but the actual question ("why does it cost more?")
    // is not one the card answers. Say so instead of answering something else.
    return botCannotAnswerHtml(found);
  }

  // No term in this message. A field question is a follow-up about the term we
  // were already discussing; "what is X" names a new subject we don't know.
  if (botCurrentTerm && fieldIntent) {
    return botFieldHtml(botCurrentTerm, findConceptCard(botCurrentTerm.term), intent);
  }
  if (botCurrentTerm && intent === "definition" && /\b(it|that|this|one|again)\b/.test(normalized)) {
    return botFieldHtml(botCurrentTerm, findConceptCard(botCurrentTerm.term), "definition");
  }
  if (botCurrentTerm && !intent) return botCannotAnswerHtml(botCurrentTerm);

  return botUnknownHtml();
}

function botAppend(role, html) {
  const log = document.getElementById("bot-log");
  const row = document.createElement("div");
  row.className = `bot-msg bot-msg--${role}`;
  row.innerHTML =
    role === "bot"
      ? `<img src="/assets/aetherbot-thinking.png" alt="AetherBOT" class="bot-avatar" /><div class="bot-bubble">${html}</div>`
      : `<div class="bot-bubble">${html}</div>`;
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
  return row;
}

// A short pause with a typing indicator. Purely cosmetic — the answer is
// already computed — but it makes the exchange read as a conversation.
function botReply(html) {
  const log = document.getElementById("bot-log");
  const row = document.createElement("div");
  row.className = "bot-msg bot-msg--bot";
  row.innerHTML = `<img src="/assets/aetherbot-thinking.png" alt="" class="bot-avatar" /><div class="bot-bubble bot-typing"><span></span><span></span><span></span></div>`;
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
  window.setTimeout(() => {
    row.remove();
    botAppend("bot", html);
  }, 420);
}

function botSend(text) {
  const value = String(text || "").trim();
  if (!value) return;
  botAppend("you", `<p>${escapeHtml(value)}</p>`);
  document.getElementById("bot-input").value = "";
  botReply(botAnswerHtml(value));
}

function botGreetingHtml() {
  if (!glossaryTerms.length) {
    return `<p>Hi, I'm <strong>AetherBOT</strong>. The glossary is empty right now, so there's nothing for me to teach yet — add a term on the Glossary page and reload.</p>`;
  }
  return `
    <p>Hi, I'm <strong>AetherBOT</strong>. Can I help you with a term from the glossary?</p>
    <p class="bot-hint">I know ${glossaryTerms.length} term${glossaryTerms.length === 1 ? "" : "s"}. Tap one, or ask me things like <em>"give me an example"</em> or <em>"what do people get wrong about it?"</em></p>
    ${botTermChipsHtml(botAllTerms())}
  `;
}

async function botOpen() {
  document.getElementById("aetherbot").classList.add("bot--open");
  document.getElementById("bot-panel").hidden = false;
  document.getElementById("bot-launcher").setAttribute("aria-expanded", "true");
  await loadLibraryData();
  if (!botGreeted) {
    botGreeted = true;
    botAppend("bot", botGreetingHtml());
  }
  document.getElementById("bot-input").focus();
}

function botClose() {
  document.getElementById("aetherbot").classList.remove("bot--open");
  document.getElementById("bot-panel").hidden = true;
  document.getElementById("bot-launcher").setAttribute("aria-expanded", "false");
  document.getElementById("bot-launcher").focus();
}

function initAetherbot() {
  const launcher = document.getElementById("bot-launcher");
  const panel = document.getElementById("bot-panel");

  launcher.addEventListener("click", () => {
    if (panel.hidden) botOpen();
    else botClose();
  });
  document.getElementById("bot-close").addEventListener("click", botClose);

  document.getElementById("bot-form").addEventListener("submit", (event) => {
    event.preventDefault();
    botSend(document.getElementById("bot-input").value);
  });

  // Term chips and menu chips are rendered into messages, so the log handles
  // their clicks by delegation rather than each message wiring its own.
  document.getElementById("bot-log").addEventListener("click", (event) => {
    const chip = event.target.closest(".bot-chip");
    if (!chip) return;
    botSend(chip.dataset.ask || `what is ${chip.dataset.term}`);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) botClose();
  });
}

initTheme();
initNav();
initProfiles();
initGlossary();
initLibrary();
initGame();
initAetherbot();
