// Vanilla JS, no build step. Fetches real data from the tiny server's API
// endpoints. Profiles, Glossary and Library are nav placeholders only in
// this starter repo — participants build their pages across the course.
// The Explain It Back game is fully working already.

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
// Used by the Game's Reveal panel below. The Library page doesn't exist yet
// in this starter repo, but when it's built it can reuse this same helper —
// keep it working against the concept-card shape in data/concept-cards.json.

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
initGame();
