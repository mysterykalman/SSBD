import {test} from "node:test";
import assert from "node:assert/strict";
import {CONCEPTS, TAGS} from "../src/shared/lexicon/data.js";
import {EXTRA_WORDS} from "../src/shared/lexicon/vocab.js";
import {getLexicon} from "../src/shared/lexicon/index.js";
import {chooseOpening, chooseResponse, wordForms} from "../src/shared/bot.js";
import {createSpeller, validateWord, wordKey} from "../src/shared/words.js";

// Local seeded RNG so these tests do not depend on rules.js.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REQUIRED = `sun moon star sky cloud rain snow storm rainbow light night day dream sleep bed space rocket planet dog cat bird fish
horse cow pig lion tiger elephant monkey bear frog bee butterfly dragon unicorn castle princess knight pirate treasure magic wizard book
story school teacher pencil family home love friend mom dad baby pizza apple banana cake cookie ice_cream chocolate candy bread cheese
milk water beach ocean wave sand boat island music song dance drum guitar piano game ball soccer team win toy puzzle red blue green
yellow orange purple pink color paint art time clock summer winter spring autumn birthday party gift christmas halloween ghost monster
robot computer phone car train plane bike bus doctor firefighter police farm tree flower forest mountain river fire ice hot cold happy
sad scary fun heart hand eye tooth shoe hat sock door window kitchen garden park zoo circus clown jungle desert volcano dinosaur egg
chicken nest wing feather tail paw bone honey leaf seed carrot juice tea soup picnic camping tent map adventure hero superhero cape crown
king queen pet animal candle library read write`.split(/\s+/);

test("concept data is well formed", () => {
  assert.ok(CONCEPTS.length >= 450 && CONCEPTS.length <= 600, `${CONCEPTS.length} concepts`);
  const ids = new Set();
  for (const row of CONCEPTS) {
    assert.equal(row.length, 5, JSON.stringify(row));
    const [id, en, fr, tags, links] = row;
    assert.match(id, /^[a-z][a-z_]*$/, id);
    assert.ok(!ids.has(id), `duplicate id ${id}`);
    ids.add(id);
    for (const label of [en, fr]) {
      assert.equal(label, label.toLowerCase(), label);
      const v = validateWord(label);
      assert.ok(v.ok && v.word === label, `label ${label} must be a valid word as typed`);
    }
    assert.ok(en.split(" ").length <= 2, `English label ${en} has too many words`);
    assert.ok(tags.length >= 1 && tags.length <= 4, `${id} tags`);
    for (const tag of tags) assert.ok(TAGS.includes(tag), `${id} has unknown tag ${tag}`);
    assert.ok(links.length <= 12, `${id} lists ${links.length} links`);
    assert.equal(new Set(links).size, links.length, `${id} repeats a link`);
  }
  for (const [id, , , , links] of CONCEPTS) {
    for (const other of links) {
      assert.ok(ids.has(other), `${id} links to missing ${other}`);
      assert.notEqual(other, id, `${id} links to itself`);
    }
  }
  for (const id of REQUIRED) assert.ok(ids.has(id), `required concept ${id} missing`);
});

test("labels are unique per language by word key", () => {
  for (const index of [1, 2]) {
    const seen = new Map();
    for (const row of CONCEPTS) {
      const key = wordKey(row[index]);
      assert.ok(!seen.has(key), `${row[index]} (${row[0]}) clashes with ${seen.get(key)}`);
      seen.set(key, row[0]);
    }
  }
});

test("every concept has at least five undirected links", () => {
  for (const lang of ["en", "fr"]) {
    for (const concept of getLexicon(lang).concepts.values()) {
      assert.ok(concept.links.size >= 5, `${concept.id} has ${concept.links.size} links`);
    }
  }
});

test("extra vocabulary is clean and has no duplicates", () => {
  for (const lang of ["en", "fr"]) {
    const words = EXTRA_WORDS[lang];
    assert.ok(words.length >= 900, `${lang} has ${words.length} extra words`);
    const keys = new Set();
    for (const w of words) {
      assert.equal(w, w.toLowerCase(), w);
      assert.ok(!w.includes(" "), `${w} should be a single word`);
      assert.ok(validateWord(w).ok, w);
      assert.ok(!keys.has(wordKey(w)), `duplicate ${lang} word ${w}`);
      keys.add(wordKey(w));
    }
  }
});

test("lexicon resolves labels, plurals and accent-free spellings", () => {
  const en = getLexicon("en"), fr = getLexicon("fr");
  assert.equal(en.resolve("Ice Cream"), "ice_cream");
  assert.equal(en.resolve("puppies"), "puppy");
  assert.equal(en.resolve("wolves"), "wolf");
  assert.equal(en.resolve("dragons"), "dragon");
  assert.equal(fr.resolve("etoile"), "star");
  assert.equal(fr.resolve("chevaux"), "horse");
  assert.equal(fr.resolve("Château"), "castle");
  assert.equal(fr.resolve("arc en ciel"), "rainbow");
  for (const [id, en_, fr_] of CONCEPTS) {
    assert.equal(en.resolve(en_), id, en_);
    assert.equal(fr.resolve(fr_), id, fr_);
  }
});

test("wordForms covers common singular/plural spellings", () => {
  const has = (a, b) => wordForms(a).has(b);
  assert.ok(has("star", "stars"));
  assert.ok(has("stars", "star"));
  assert.ok(has("box", "boxes"));
  assert.ok(has("puppy", "puppies"));
  assert.ok(has("puppies", "puppy"));
  assert.ok(has("leaf", "leaves"));
  assert.ok(has("cheval", "chevaux"));
  assert.ok(has("chevaux", "cheval"));
  assert.ok(has("gateau", "gateaux"));
  assert.ok(!has("prince", "princess"));
});

test("bot never returns a plural or singular of a used word", () => {
  const exclude = new Set(["skies", "stars", "nights", "spaces", "lights", "planets"]);
  for (let seed = 1; seed <= 30; seed++) {
    const pick = chooseResponse({prompts: ["sun", "moon"], excludeKeys: exclude, rng: rng(seed)});
    for (const form of wordForms(wordKey(pick.word))) assert.ok(!exclude.has(form), `${pick.word} matches an excluded word`);
  }
  const fr = new Set(["etoiles", "ciels", "nuits"]);
  for (let seed = 1; seed <= 30; seed++) {
    const pick = chooseResponse({prompts: ["soleil", "lune"], language: "fr", excludeKeys: fr, rng: rng(seed)});
    assert.ok(!["etoile", "ciel", "nuit"].includes(wordKey(pick.word)), pick.word);
  }
  // Plural prompts are treated like their singular.
  for (let seed = 1; seed <= 10; seed++) {
    const pick = chooseResponse({prompts: ["dogs", "cats"], rng: rng(seed)});
    assert.ok(!["dog", "cat"].includes(wordKey(pick.word)), pick.word);
  }
});

test("bot sweep: linked pairs give valid, mostly strong answers in both languages", () => {
  for (const lang of ["en", "fr"]) {
    const lex = getLexicon(lang);
    const all = [...lex.concepts.values()];
    const random = rng(lang === "fr" ? 99 : 42);
    let sharing = 0, strong = 0;
    for (let i = 0; i < 200; i++) {
      const a = all[Math.floor(random() * all.length)];
      // B is a neighbour or a neighbour's neighbour of A: the "linked region".
      const n1 = [...a.links];
      let b = lex.concepts.get(n1[Math.floor(random() * n1.length)]);
      if (random() < 0.5) {
        const n2 = [...b.links].filter(id => id !== a.id);
        if (n2.length) b = lex.concepts.get(n2[Math.floor(random() * n2.length)]);
      }
      if (a.id === b.id) continue;
      // Some already-used words, including neighbours of A.
      const used = new Set(n1.filter(() => random() < 0.25).map(id => lex.concepts.get(id).key));
      const pick = chooseResponse({prompts: [a.label, b.label], language: lang, excludeKeys: used, rng: rng(i + 1)});
      const key = wordKey(pick.word);
      assert.ok(pick.word, `${a.label}+${b.label}`);
      assert.notEqual(key, a.key, `${a.label}+${b.label} -> prompt`);
      assert.notEqual(key, b.key, `${a.label}+${b.label} -> prompt`);
      for (const form of wordForms(key)) assert.ok(!used.has(form), `${a.label}+${b.label} -> used ${pick.word}`);
      const remaining = [...a.links].filter(id => b.links.has(id) && !used.has(lex.concepts.get(id).key));
      if (remaining.length) {
        sharing++;
        if (pick.quality === "strong") strong++;
      }
    }
    assert.ok(sharing >= 60, `${lang}: only ${sharing} pairs share a neighbour`);
    assert.ok(strong / sharing >= 0.7, `${lang}: strong for ${strong}/${sharing}`);
  }
});

test("French openings and responses come from the French pool", () => {
  const fr = getLexicon("fr");
  const openings = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const o = chooseOpening({language: "fr", rng: rng(seed)});
    assert.ok(fr.resolve(o.word), o.word);
    openings.add(o.word);
  }
  assert.ok(openings.size >= 15);
  const pick = chooseResponse({prompts: ["chien", "chat"], language: "fr", rng: rng(3)});
  assert.equal(pick.quality, "strong");
  assert.ok(fr.byKey.has(wordKey(pick.word)), pick.word);
});

test("speller with the full lexicon: confident fixes only", () => {
  const en = createSpeller(getLexicon("en").words), fr = createSpeller(getLexicon("fr").words);
  assert.equal(fr.suggest("chocolat"), null);
  assert.equal(fr.suggest("chocolta"), "chocolat");
  assert.equal(fr.suggest("grenouile"), "grenouille");
  assert.equal(fr.suggest("papilon"), "papillon");
  assert.equal(fr.suggest("soliel"), "soleil");
  assert.equal(fr.suggest("fromge"), "fromage");
  assert.equal(fr.suggest("chatteau"), "château");
  for (const ok of ["etoile", "elephant", "chateau", "noel", "ete", "foret", "chevaux", "animaux", "gateaux", "etoiles", "arc en ciel", "bonhomme de neige"]) {
    assert.equal(fr.suggest(ok), null, ok);
  }
  assert.equal(en.suggest("freind"), "friend");
  assert.equal(en.suggest("dinosuar"), "dinosaur");
  assert.equal(en.suggest("buterfly"), "butterfly");
  assert.equal(en.suggest("choclate"), "chocolate");
  for (const ok of ["butterfly", "puppies", "wolves", "boxes", "unicorns", "cats", "ice cream", "zorblax", "quuxify"]) {
    assert.equal(en.suggest(ok), null, ok);
  }
  // Every concept label and extra word is known as typed.
  for (const [lang, speller] of [["en", en], ["fr", fr]]) {
    for (const w of getLexicon(lang).words) assert.equal(speller.suggest(w), null, `${lang} ${w}`);
  }
});
