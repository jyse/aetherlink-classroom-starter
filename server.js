// Minimal static + JSON-data server for the Aether Library starter repo.
// Deliberately plain: Node's built-in http/fs modules only, no framework, no build step.

import { createServer } from "node:http";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");
const DATA_DIR = join(__dirname, "data");
const PORT = process.env.PORT || 3000;
const MAX_BODY_BYTES = 20_000; // small classroom app — no need for large uploads

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

async function sendJsonFile(res, fileName) {
  try {
    const raw = await readFile(join(DATA_DIR, fileName), "utf8");
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(raw);
  } catch (err) {
    res.writeHead(err.code === "ENOENT" ? 404 : 500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: `Could not read ${fileName}: ${err.message}` }));
  }
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw Object.assign(new Error("Request body too large"), { statusCode: 413 });
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw Object.assign(new Error(`Invalid JSON body: ${err.message}`), { statusCode: 400 });
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

// POST /api/submissions — writes the single-slot latest submission for the
// Explain It Back game (data/latest-submission.json). A new submission
// clears any previous feedback, since the feedback belongs to the round
// that has just ended.
async function handleCreateSubmission(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return sendJson(res, err.statusCode || 400, { error: err.message });
  }

  const term = typeof body.term === "string" ? body.term.trim() : "";
  const explanation = typeof body.explanation === "string" ? body.explanation.trim() : "";

  if (!term || !explanation) {
    return sendJson(res, 400, { error: "Both \"term\" and \"explanation\" are required." });
  }

  const submission = { term, explanation, submittedAt: new Date().toISOString() };

  try {
    await writeFile(join(DATA_DIR, "latest-submission.json"), JSON.stringify(submission, null, 2));
    // Reset feedback for the new round — stale feedback from a previous
    // term/answer would be confusing to show against a new submission.
    await unlink(join(DATA_DIR, "latest-feedback.json")).catch((err) => {
      if (err.code !== "ENOENT") throw err;
    });
  } catch (err) {
    return sendJson(res, 500, { error: `Could not save submission: ${err.message}` });
  }

  return sendJson(res, 201, { ok: true, submission });
}

// GET /api/feedback — reads data/latest-feedback.json if a human has asked
// Claude Code (via the term-checker skill) to write one. Not auto-polled by
// the frontend; the participant clicks "Check feedback" to call this.
async function handleGetFeedback(res) {
  try {
    const raw = await readFile(join(DATA_DIR, "latest-feedback.json"), "utf8");
    return sendJson(res, 200, { available: true, feedback: JSON.parse(raw) });
  } catch (err) {
    if (err.code === "ENOENT") {
      return sendJson(res, 200, { available: false });
    }
    return sendJson(res, 500, { error: `Could not read feedback: ${err.message}` });
  }
}

async function sendStatic(res, requestPath) {
  const safePath = normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(PUBLIC_DIR, safePath === "/" ? "index.html" : safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    const type = CONTENT_TYPES[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(body);
  } catch (err) {
    if (err.code === "ENOENT") {
      // SPA-style fallback: unknown paths get index.html so /profiles, /glossary work on refresh.
      try {
        const body = await readFile(join(PUBLIC_DIR, "index.html"));
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    } else {
      res.writeHead(500);
      res.end("Server error");
    }
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/profiles") {
    return sendJsonFile(res, "profiles.json");
  }
  if (url.pathname === "/api/glossary") {
    return sendJsonFile(res, "glossary.json");
  }
  if (url.pathname === "/api/concept-cards") {
    return sendJsonFile(res, "concept-cards.json");
  }
  if (url.pathname === "/api/submissions" && req.method === "POST") {
    return handleCreateSubmission(req, res);
  }
  if (url.pathname === "/api/feedback" && req.method === "GET") {
    return handleGetFeedback(res);
  }

  return sendStatic(res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`Aether Library running at http://localhost:${PORT}`);
});
