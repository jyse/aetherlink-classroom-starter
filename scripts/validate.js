#!/usr/bin/env node
// Basic shape validation for this repo's flat-file data.
// No schema library — plain checks, since the data files are small and the
// point is to demonstrate the idea, not build a general validator.
//
// Usage:
//   node scripts/validate.js
//     Validates data/glossary.json and data/concept-cards.json (always
//     present in this starter repo, starting as empty arrays — that's
//     valid). Also validates data/profiles.json against the "profile"
//     schema, but only if that file exists — it doesn't exist yet in a
//     fresh clone of this starter repo (Assignment 2 creates it). Once it
//     exists, this command picks it up automatically. Exits 1 if anything
//     fails.
//
//   node scripts/validate.js <relative-file> <schema>
//     Validates one file against one schema. <schema> is one of
//     "profile", "glossary", "concept-card". Exits 1 if it fails.
//     Used against the fixtures in data/fixtures/, and also works fine
//     if you point it at data/profiles.json by hand before it exists —
//     you'll get a clear "could not read file" result, which is expected.
//
//   node scripts/validate.js --fixtures
//     Runs the glossary schema against both test fixtures and prints
//     the result for each. Demonstration only — always exits 0, because
//     the incomplete fixture is SUPPOSED to fail.

import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

const SCHEMAS = {
  profile: {
    requiredStrings: ["name", "role", "experience", "learningGoal", "workflowToImprove"],
  },
  glossary: {
    requiredStrings: ["term", "definition"],
  },
  "concept-card": {
    requiredStrings: ["term", "explanation", "example", "commonMisunderstanding"],
    requiredArrays: ["essentialPoints", "relatedConcepts", "resources"],
  },
};

function entryLabel(entry) {
  return entry && (entry.term || entry.name) ? `"${entry.term || entry.name}"` : "(no term/name)";
}

function validateEntry(entry, schema, index) {
  const errors = [];

  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    return [`entry ${index}: not an object`];
  }

  for (const field of schema.requiredStrings || []) {
    if (!isNonEmptyString(entry[field])) {
      errors.push(`entry ${index} ${entryLabel(entry)}: missing or empty required field "${field}"`);
    }
  }

  for (const field of schema.requiredArrays || []) {
    if (!isNonEmptyArray(entry[field])) {
      errors.push(`entry ${index} ${entryLabel(entry)}: missing or empty required list "${field}"`);
    }
  }

  if (schema.requiredArrays?.includes("resources") && Array.isArray(entry.resources)) {
    entry.resources.forEach((resource, i) => {
      const bad =
        !resource ||
        typeof resource !== "object" ||
        !isNonEmptyString(resource.label) ||
        !isNonEmptyString(resource.url);
      if (bad) {
        errors.push(`entry ${index} ${entryLabel(entry)}: resources[${i}] needs a non-empty "label" and "url"`);
      }
    });
  }

  return errors;
}

async function validateFile(relativePath, schemaKey) {
  const schema = SCHEMAS[schemaKey];
  if (!schema) {
    return { relativePath, ok: false, errors: [`unknown schema "${schemaKey}"`] };
  }

  const fullPath = join(ROOT, relativePath);
  let raw;
  try {
    raw = await readFile(fullPath, "utf8");
  } catch (err) {
    return { relativePath, ok: false, errors: [`could not read file: ${err.message}`] };
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return { relativePath, ok: false, errors: [`invalid JSON: ${err.message}`] };
  }

  if (!Array.isArray(data)) {
    return { relativePath, ok: false, errors: ["top level of file must be a JSON array"] };
  }

  // An empty array is a valid, passing state — 0 well-formed entries is
  // still well-formed. data/glossary.json and data/concept-cards.json
  // legitimately start empty in this starter repo, before any assignment
  // has added an entry yet.
  if (data.length === 0) {
    return { relativePath, ok: true, errors: [], count: 0 };
  }

  const errors = data.flatMap((entry, i) => validateEntry(entry, schema, i));
  return { relativePath, ok: errors.length === 0, errors, count: data.length };
}

async function fileExists(relativePath) {
  try {
    await access(join(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

function printResult(result) {
  if (result.ok) {
    console.log(`  PASS  ${result.relativePath} (${result.count} entr${result.count === 1 ? "y" : "ies"})`);
  } else {
    console.log(`  FAIL  ${result.relativePath}`);
    for (const err of result.errors) {
      console.log(`        - ${err}`);
    }
  }
  return result.ok;
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "--fixtures") {
    console.log("Validating test fixtures against the glossary schema (demonstration only):\n");
    printResult(await validateFile("data/fixtures/glossary-complete.json", "glossary"));
    printResult(await validateFile("data/fixtures/glossary-incomplete.json", "glossary"));
    console.log(
      "\nThe incomplete fixture is EXPECTED to fail above — that's the validator doing its job, not a bug."
    );
    return;
  }

  if (args.length === 2) {
    const [file, schemaKey] = args;
    const result = await validateFile(file, schemaKey);
    const ok = printResult(result);
    process.exit(ok ? 0 : 1);
  }

  if (args.length !== 0) {
    console.error("Usage: node scripts/validate.js [<file> <profile|glossary|concept-card> | --fixtures]");
    process.exit(2);
  }

  console.log("Validating repository data files:\n");

  const checks = [validateFile("data/glossary.json", "glossary"), validateFile("data/concept-cards.json", "concept-card")];

  // data/profiles.json doesn't exist yet in a fresh clone of this starter
  // repo — Assignment 2 creates it. Once it exists, pick it up
  // automatically rather than hardcoding a permanent skip.
  const hasProfiles = await fileExists("data/profiles.json");
  if (hasProfiles) {
    checks.push(validateFile("data/profiles.json", "profile"));
  }

  const results = await Promise.all(checks);
  const allOk = results.map(printResult).every(Boolean);

  if (!hasProfiles) {
    console.log("  SKIP  data/profiles.json (does not exist yet — created in Assignment 2)");
  }

  console.log("");
  if (allOk) {
    console.log("All data files pass validation.");
    process.exit(0);
  }
  console.log("Validation failed — see errors above.");
  process.exit(1);
}

main();
