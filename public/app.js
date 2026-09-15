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

async function initGameData() {
  try {
    const [glossaryRes, cardsRes] = await Promise.all([fetch("/api/glossary"), fetch("/api/concept-cards")]);
    glossaryTerms = glossaryRes.ok ? await glossaryRes.json() : [];
    if (cardsRes.ok) conceptCards = await cardsRes.json();
  } catch {
    glossaryTerms = [];
  }
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

initTheme();
initNav();
initProfiles();
initGlossary();
initLibrary();
initGame();
