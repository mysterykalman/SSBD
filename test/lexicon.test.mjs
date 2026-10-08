import {test} from "node:test";
import assert from "node:assert/strict";
import {CONCEPTS, PHRASES, TAGS} from "../src/shared/lexicon/data.js";
import {EXTRA_WORDS} from "../src/shared/lexicon/vocab.js";
import {getLexicon} from "../src/shared/lexicon/index.js";
import {ENGINE1_DATASET, chooseOpening, chooseResponse, wordForms, rankCandidates} from "../src/shared/bot.js";
import {STRONGEST_CONFIG, selectBotWord} from "../src/shared/engine.js";
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
  assert.ok(CONCEPTS.length >= 450 && CONCEPTS.length <= 650, `${CONCEPTS.length} concepts`);
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
    // Engine-1 (retired, frozen on its last validated dataset) is swept over its own vocabulary.
    const lex = getLexicon(lang, ENGINE1_DATASET);
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
    assert.ok(strong / sharing >= 0.85, `${lang}: strong for ${strong}/${sharing}`);
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

test("Solo openings never start a game on a spooky or sad word", async () => {
  const {chooseOpening} = await import("../src/shared/bot.js");
  const {seededRandom} = await import("../src/shared/rules.js");
  const gloomy = new Set(["nightmare", "scary", "ghost", "monster", "cauchemar", "effrayant", "fantôme", "monstre", "peur", "fear"]);
  for (const language of ["en", "fr"]) {
    for (let seed = 1; seed <= 300; seed++) {
      const {word} = chooseOpening({language, rng: seededRandom(seed * 7919)});
      if (gloomy.has(word)) throw new Error(`gloomy opening ${word} (${language}, seed ${seed})`);
    }
  }
});

test("phrase data: enough everyday phrases, known concepts, labels appear in the phrase", () => {
  const byId = new Map(CONCEPTS.map(row => [row[0], row]));
  for (const [lang, index, min] of [["en", 1, 150], ["fr", 2, 100]]) {
    const rows = PHRASES[lang];
    assert.ok(rows.length >= min, `${lang} has ${rows.length} phrases`);
    const seen = new Set();
    for (const [a, b, phrase] of rows) {
      assert.ok(byId.has(a) && byId.has(b), `${lang} ${a}+${b}`);
      assert.notEqual(a, b);
      const pair = [a, b].sort().join("+");
      assert.ok(!seen.has(pair), `${lang} repeats ${pair}`);
      seen.add(pair);
      const phraseKey = wordKey(phrase);
      for (const id of [a, b]) {
        const label = wordKey(byId.get(id)[index]);
        assert.ok(phraseKey.includes(label) || (label.length >= 4 && phraseKey.includes(label.slice(0, -1))), `${lang} "${phrase}" lacks ${label}`);
      }
    }
  }
  const en = getLexicon("en"), fr = getLexicon("fr");
  assert.ok(en.concepts.get("snow").phrases.has("ball"));
  assert.ok(en.concepts.get("ball").phrases.has("snow"), "phrases are undirected");
  assert.ok(fr.concepts.get("apple").phrases.has("earth"), "pomme de terre");
  assert.ok(!en.concepts.get("apple").phrases.has("earth"), "phrases are per language");
});

test("a common phrase counts as a strong link for that side", () => {
  // "snow" + "dog": only "ball" (snowball + a dog's ball) is tied directly to both.
  for (let seed = 1; seed <= 10; seed++) {
    const pick = chooseResponse({prompts: ["snow", "dog"], rng: rng(seed)});
    assert.deepEqual(pick, {word: "ball", quality: "strong"});
  }
  // "pomme" + "terre": "ver" (ver de terre, a worm in an apple) is a strong, eligible answer through
  // its phrase. (Gary may still prefer ARBRE: apple → tree is the more likely human first thought.)
  const ver = rankCandidates({prompts: ["pomme", "terre"], language: "fr"}).ranked.find(r => r.word === "ver");
  assert.ok(ver && ver.tier === 1 && ver.b >= 0.95, JSON.stringify(ver));
  // Exclusions still win over phrases, including plural forms.
  const pick = chooseResponse({prompts: ["snow", "dog"], excludeKeys: new Set(["balls"]), rng: rng(1)});
  assert.notEqual(pick.word, "ball");
});

test("compound and plural prompts resolve; unknown words resolve to nothing", () => {
  const en = getLexicon("en"), fr = getLexicon("fr");
  assert.deepEqual(en.resolveAll("firetruck"), ["fire", "truck"]);
  assert.deepEqual(en.resolveAll("snowy"), ["snow"]);
  assert.deepEqual(fr.resolveAll("pommes de terre"), ["potato"]);
  for (const odd of ["s", "I", "a", "", "zorblax", "velvet", "marble"]) assert.deepEqual(en.resolveAll(odd), [], odd);
});

// Independent judge for bot quality: 3 = direct link or phrase, 2.5 / 2 = shares
// three / two neighbours, 1 = one shared neighbour or tag, 0 = unrelated.
function judgeSide(lex, promptId, pickId) {
  if (!promptId || !pickId || promptId === pickId) return 0;
  const p = lex.concepts.get(promptId), c = lex.concepts.get(pickId);
  if (p.links.has(pickId) || p.phrases.has(pickId)) return 3;
  let shared = 0;
  for (const n of c.near) if (p.near.has(n)) shared++;
  if (shared >= 3) return 2.5;
  if (shared === 2) return 2;
  return shared === 1 || c.tags.some(tag => p.tags.includes(tag)) ? 1 : 0;
}
const isUsed = (used, key) => [...wordForms(key)].some(form => used.has(form));
const BRIDGE_STAGES = new Set(["shared-direct", "direct-plus-indirect", "indirect-both", "weak-fallback"]);
/** The engine's strongest answer for an input (a quality window of one). */
const strongestWord = input => selectBotWord({...input, config: STRONGEST_CONFIG}).word;

test("bot quality in simulated games and random pairs (EN and FR)", t => {
  for (const lang of ["en", "fr"]) {
    const lex = getLexicon(lang);
    const all = [...lex.concepts.values()];
    const records = [];
    const judge = (prompts, used, word, source, stage, top) => {
      const [a, b] = prompts.map(p => lex.resolve(p));
      const c = lex.resolve(word);
      assert.ok(c, `${lang}: ${word} is a lexicon word`);
      const sa = judgeSide(lex, a, c), sb = judgeSide(lex, b, c);
      // The engine's single strongest answer (before varying among equally good ones).
      const t = lex.resolve(top);
      const ta = judgeSide(lex, a, t), tb = judgeSide(lex, b, t);
      let strongPossible = false;
      for (const x of all) {
        if (x.id === a || x.id === b || isUsed(used, x.key)) continue;
        if (judgeSide(lex, a, x.id) === 3 && judgeSide(lex, b, x.id) === 3) { strongPossible = true; break; }
      }
      // Was a meaningful two-sided word available at all (engine stages 1-4)? The engine logs the
      // stage it reached; a lazy piece of a prompt (BASKET for BASKETBALL) is never counted as a bridge.
      const bridgeable = BRIDGE_STAGES.has(stage);
      records.push({prompts, word, sa, sb, ta, tb, strongPossible, source, bridgeable});
    };
    // Realistic games: the "player" answers with a word related to one or both prompts.
    for (let g = 0; g < 60; g++) {
      const random = rng(1000 + g), botRng = rng(5000 + g);
      const used = new Set();
      let player = all[Math.floor(random() * all.length)].label;
      let bot = chooseOpening({language: lang, excludeKeys: used, rng: botRng}).word;
      for (let move = 2; move <= 20 && wordKey(player) !== wordKey(bot); move++) {
        used.add(wordKey(player));
        used.add(wordKey(bot));
        const prompts = [player, bot];
        const input = {pair: prompts, blocked: [...used], language: lang, seed: Math.floor(botRng() * 1e9)};
        const pick = selectBotWord(input);
        const next = pick.word;
        assert.ok(!isUsed(used, wordKey(next)), `${lang}: reused ${next}`);
        judge(prompts, used, next, "game", pick.decision.stage, strongestWord(input));
        const ids = prompts.map(p => lex.resolve(p));
        const pool = all.filter(x => !isUsed(used, x.key) && ids.some(id => lex.concepts.get(id).near.has(x.id)));
        const both = pool.filter(x => ids.every(id => lex.concepts.get(id).near.has(x.id)));
        const source = both.length && random() < 0.5 ? both : pool.length ? pool : all.filter(x => !isUsed(used, x.key));
        player = source[Math.floor(random() * source.length)].label;
        bot = next;
      }
    }
    // Random concept pairs.
    const random = rng(lang === "fr" ? 77 : 33);
    for (let i = 0; i < 300; i++) {
      const a = all[Math.floor(random() * all.length)], b = all[Math.floor(random() * all.length)];
      if (a.id === b.id) continue;
      const input = {pair: [a.label, b.label], blocked: [], language: lang, seed: i + 1};
      const pick = selectBotWord(input);
      judge([a.label, b.label], new Set([a.key, b.key]), pick.word, "random", pick.decision.stage, strongestWord(input));
    }
    const possible = records.filter(r => r.strongPossible);
    const strong = possible.filter(r => r.ta === 3 && r.tb === 3);
    const sampledStrong = possible.filter(r => r.sa === 3 && r.sb === 3);
    const unrelated = records.filter(r => r.sa === 0 && r.sb === 0);
    const weakest = [...records].sort((x, y) => (Math.min(x.sa, x.sb) - Math.min(y.sa, y.sb)) || (x.sa + x.sb - y.sa - y.sb)).slice(0, 20);
    t.diagnostic(`${lang}: ${records.length} picks; strongest answer strong where possible ${strong.length}/${possible.length}; sampled pick ${sampledStrong.length}/${possible.length}; unrelated to both ${unrelated.length}`);
    t.diagnostic(`${lang} weakest: ${weakest.map(r => `${r.prompts.join(" + ")} -> ${r.word} [${r.sa},${r.sb}]`).join("; ")}`);
    assert.ok(possible.length >= 100, `${lang}: only ${possible.length} pairs had a strong answer`);
    // Gary aims for the player's most likely answer, which is often a strong first thought of one word
    // that plausibly fits the other (GAME for SISTER + PLAY), not always a word linked directly to both.
    // So "directly linked to both" is a sanity floor here, not the goal; relating to both is required below.
    // Since engine-2.1 the played word is sampled from a neighbourhood around the strongest answer (so
    // it is not always the most convergent bridge): the floor applies to that strongest answer, and every
    // sampled word must still relate to both prompts (checked below).
    assert.ok(strong.length / possible.length >= 0.75, `${lang}: strong for ${strong.length}/${possible.length}`);
    // Every pick relates meaningfully (link, shared neighbour or category) to BOTH prompts whenever the
    // data allows it. A weak, balanced last-resort pick is only allowed when no meaningful two-sided word
    // exists (the bot never falls back to a one-sided word instead), and it stays rare.
    const gaps = records.filter(r => Math.min(r.sa, r.sb) === 0);
    for (const r of gaps) assert.ok(!r.bridgeable, `${lang}: ${r.prompts.join("+")} -> ${r.word} although a two-sided word existed`);
    assert.ok(gaps.length <= records.length * 0.04, `${lang}: ${gaps.length}/${records.length} unbridgeable picks`);
    t.diagnostic(`${lang}: unbridgeable random pairs ${gaps.length} (${unrelated.length} unrelated to both)`);
    // Whenever a direct-both word existed, the bot never settled for a one-sided word.
    for (const r of possible) assert.ok(Math.min(r.sa, r.sb) >= 2, `${lang}: ${r.prompts.join("+")} -> ${r.word}`);
  }
});

test("one-letter and unknown prompts never crash and still give one valid word", () => {
  for (const lang of ["en", "fr"]) {
    const lex = getLexicon(lang);
    const known = lang === "fr" ? "chien" : "dog";
    const dogId = lex.resolve(known);
    for (const odd of ["s", "I", "a", "é", "zorblax", "velvet", "marble", "", "   ", "x-y"]) {
      for (const prompts of [[odd, known], [known, odd], [odd, "q"]]) {
        for (let seed = 1; seed <= 5; seed++) {
          const pick = selectBotWord({pair: prompts, language: lang, seed});
          assert.equal(typeof pick.word, "string");
          assert.ok(validateWord(pick.word).ok, `${prompts} -> ${pick.word}`);
          assert.ok(lex.byKey.has(wordKey(pick.word)), `${lang}: ${pick.word} is from the ${lang} pool`);
          assert.notEqual(wordKey(pick.word), wordKey(known));
          // With one known prompt, the word is tied directly to it.
          if (prompts.includes(known)) {
            const c = lex.concepts.get(lex.resolve(pick.word));
            assert.ok(c.links.has(dogId) || c.phrases.has(dogId), `${prompts} -> ${pick.word}`);
          }
        }
      }
    }
  }
  // Odd input shapes.
  assert.ok(chooseResponse({prompts: ["s"], rng: rng(1)}).word);
  assert.ok(chooseResponse({prompts: [], rng: rng(1)}).word);
});

test("chooseResponse returns exactly one word, deterministic per rng, stable per pair, varied across pairs", () => {
  const pairs = [["sun", "moon"], ["rain", "garden"], ["pizza", "party"], ["dragon", "castle"], ["snow", "winter"], ["cat", "milk"]];
  const answers = new Set();
  for (const lang of ["en", "fr"]) {
    const lex = getLexicon(lang);
    for (const [a, b] of pairs) {
      const prompts = lang === "fr" ? [lex.concepts.get(a).label, lex.concepts.get(b).label] : [a, b];
      const words = new Set();
      for (let seed = 1; seed <= 20; seed++) {
        const pick = chooseResponse({prompts, language: lang, rng: rng(seed)});
        assert.deepEqual(Object.keys(pick).sort(), ["quality", "word"]);
        assert.equal(typeof pick.word, "string");
        assert.ok(pick.word.split(" ").length <= 3 && validateWord(pick.word).ok, pick.word);
        assert.ok(!/[,;/+]/.test(pick.word), `one word only: ${pick.word}`);
        assert.deepEqual(chooseResponse({prompts, language: lang, rng: rng(seed)}), pick, "same rng, same word");
        words.add(pick.word);
      }
      // Gary aims for the semantic centre: the same pair gets the same (or a near-tied) answer.
      assert.ok(words.size <= 2, `${a}+${b}: ${[...words]}`);
      for (const word of words) answers.add(word);
    }
  }
  assert.ok(answers.size >= pairs.length * 2 - 1, `variety comes from the prompts: only ${answers.size} answers`);
});

test("speller never suggests for one- or two-letter input and stays non-blocking", () => {
  for (const lang of ["en", "fr"]) {
    const speller = createSpeller(getLexicon(lang).words);
    for (const raw of ["s", "I", "a", "é", "x", "zz", "ab", "", "  ", "-"]) assert.equal(speller.suggest(raw), null, raw);
    // Unknown words get no suggestion rather than an error.
    for (const raw of ["zorblax", "qqqqqqqqqqqqqqqqqqqqqqqq", "s s s"]) assert.equal(speller.suggest(raw), null, raw);
  }
});
