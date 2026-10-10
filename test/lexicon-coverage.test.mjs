// Coverage of ordinary words (engine-2.5): an everyday word the player types should be understood as
// itself, so it never collapses into a one-sided fallback or gets misread as a different word.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getLexicon} from "../src/shared/lexicon/index.js";
import {understandWord} from "../src/shared/understand.js";

const FIXTURE = JSON.parse(readFileSync(new URL("./fixtures/common-words.json", import.meta.url), "utf8"));
const WORDS = [...new Set(Object.values(FIXTURE.words).flat())];

test("everyday words (the audit list) are understood, and not by guessing", () => {
  const lex = getLexicon("en");
  const missing = [], guessed = [];
  for (const word of WORDS) {
    const u = understandWord(word, "en", lex);
    if (u.unresolved) missing.push(word);
    else if (u.method === "fuzzy" && u.confidence !== "high") guessed.push(`${word}→${u.via}`);
  }
  assert.ok(WORDS.length > 900);
  assert.ok(missing.length <= WORDS.length * 0.01, `not understood: ${missing.join(", ")}`);
  assert.deepEqual(guessed, [], "a real everyday word is never read as a doubtful correction");
});

test("the previous dataset is still loadable (old decisions replay on the data they used)", () => {
  const old = getLexicon("en", "lexicon-4");
  assert.equal(old.dataset, "lexicon-4");
  assert.ok(old.concepts.size < getLexicon("en").concepts.size);
  assert.equal(old.resolve("goggles"), null, "lexicon-4 never knew goggles");
});
