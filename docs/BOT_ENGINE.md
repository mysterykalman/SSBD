# Solo bot engine, game logs and review

This covers how Gary and Milo choose their word (engine-2.4, dataset lexicon-4), how they talk (their narratives), how Solo games are logged, how to review them, and how to replay decisions. Section 0 is the current engine; sections 1–2 are the history it builds on (engine-2.2 is frozen in `src/shared/engine-2.2.js` for replay only).

## 0. Engine-2.4: the human-first Solo engine (current)

Engine-2.4 is engine-2.3 with one rule added (2026-10-09): **every answer is a direct link of at least one of the two latest words**, so the player can always see where Gary's or Milo's word came from without reconstructing the trail. Recovery hubs reached only through shared neighbours or two-step paths (DESSERT + PENCIL → HOME, SWIM + PENCIL → PARK) are gone; in 1,200 simulated games they were about 2 % of rounds, now 0 %. `test/latest-word.test.mjs` checks it for both characters in English and French. Everything below about engine-2.3 still applies.

Playing Solo should feel like trying to get on the same wavelength as a character. The player should almost always understand why the character chose their word.

### Philosophy

- **Human first.** The bot optimises for the word another ordinary person would plausibly blurt out within a few seconds for **both** words, not for the cleverest graph path. An answer that needs explaining is a bad answer.
  - Good: MICROWAVE + OVEN → HOT / KITCHEN, BED + MOON → NIGHT / DREAM, PAW + FISH → PET / CAT, TREES + BIRD → NEST.
  - Bad (engine-2.2 and earlier): VACATION + FARM → TURKEY, POTATOES + CHRISTMAS → SOUP, CHICKEN + SEA → HORSE.
- **Difficulty must never be created by choosing implausible words.** Milo and Gary differ only in how predictable they are among answers that are all genuinely good.
- **Simulation priorities, in order:** plausibility, both inputs contribute, vocabulary, fairness, character difficulty, convergence, length. No randomness is added to stretch a game.

### The quality floor

Every candidate is scored as before (connection to each input, plausibility from the *kind* of link on each side, familiarity, cue; see section 2). A candidate is **high quality** only when:

- **both** sides are direct links (category, compound, curated, member or link): shared-neighbour hops, half-compounds ("sea" → HORSE because of "seahorse"), tag matches and two-step paths never pass, however strong the other side is;
- its plausibility is ≥ 0.78 and its weaker side is ≥ 0.6 (the weak side matters as much as the strong one);
- it is not a lazy piece of an input (a word built from an input passes only when it is tied directly to both: RAIN + BOW → RAINBOW). A generic word (FOOD, BIG…) is marked down by 0.10 in score and plausibility, so it only passes when both of its links are first-thought ones (TALL + BEAR → BIG), and a more specific shared answer still wins.

When something clears the floor, the pick is always one of those words (`stage: shared-direct`, `highQuality: true`).

**Anchored** (below the threshold, not recovery): when nothing clears the floor but a first-thought word for one input (category, compound or curated, ≥ 0.8) is clearly tied to the other (3+ shared neighbours), the single best one is played (DESSERT + EGG → CAKE). It is logged as `stage: anchored`, `highQuality: false`.

### Recovery mode

Recovery replaces "low quality but valid". When no answer is high quality or anchored, the bot deliberately plays a **simple, broad, familiar, concrete hub word related to both inputs**: it ranks connected candidates (weak side ≥ 0.12) by breadth, familiarity, connection, concreteness and plausibility, with a bonus for one that is also clearly tied to the other. Since engine-2.4 the hub **must** be a direct link of at least one of the two words. Vague words (THING, NICE…, unless directly tied to both words) and gloomy ones are never recovery words, and a recovery word is never a narrow word for only one input. Recovery is always the single most readable hub (no variety). When nothing connects both, the broadest familiar word of the stronger side is used. An input still not understood after spelling, spacing and inflection checks is also recovery (a broad answer from the known word). Every recovery decision is logged with `recovery: true` and a `recoveryReason`.

### Milo and Gary: same engine, two difficulty profiles

Same lexicon, same scoring, same floor, same fairness rules (each commits before the reveal from the shared state only). Only the selection profile differs (`ENGINE_CONFIG.profiles`):

| | Milo (easier) | Gary (harder) |
|---|---|---|
| Ranking | the score plus a small bonus for familiar, concrete, first-thought (curated) words | the score |
| Near-best range | answers ≤ 0.02 from the top (virtually equal), at most 2 | answers ≤ 0.15 from the top, at most 3, all above the floor |
| Choice in the range | 80 % / 20 % | 45 % / 35 % / 20 % |
| Effect | plays the obvious answer; converges fast because he is predictable, never because he helps | sometimes plays the second or third genuinely strong reading (BED + MOON → NIGHT or DREAM) |

Gary's range only ever holds high-quality candidates, so he is never handed a weaker word to make the game last longer. The target game lengths (Milo usually 3–6 moves, Gary 5–9) are a consequence, never forced.

### Opening pool

The first word comes from a **derived** pool (`openingPool`): single short words with 12+ links, most of them to other well-connected words (bridgeable), in a familiar concrete class (animal, food, object, place, nature, event, activity), nothing gloomy, generic, vague or job-related, plus the everyday seeds people reach for first (dog, school, beach, pizza, music, car, rain, movie, home, game, book, summer, food, family, park, water, party, night, tree, snow). A short vetting list removes derived words that make poor first words (a bare verb or colour, a utensil). About 60 words in English and French.

### Player-style adaptation (light tie-breaker)

The bot still commits before seeing the current word. From the **previous revealed rounds only** (`history`), it learns the share of each word class in the player's own words: animal, food, event, people, activity, place, object, nature, abstract, descriptive (from the words' topic tags). From two revealed rounds on, a candidate already inside the near-best range gets `0.05 × share of its class`. This only reorders near-equal answers; it never adds a word outside the range.

### Near-miss momentum

When the last revealed round's two words were closely related (a direct link either way, e.g. WARM / HOT), the decision records a near-match state, and candidates inside the near-best range get `0.15 × (weak side − 0.6)`: the answers most tied to *both* words of the cluster come first. Revealed history only.

### Vocabulary (lexicon-4, `src/shared/lexicon/additions4.js`)

- 297 new words with ordinary, familiar links (plus 233 English and 18 French synonyms and variants, and 90 missing links between existing words): work and jobs (business, coworker, accountant, plumber…), school (principal, cafeteria, locker…), travel and places (vacation, trip, hotel, passport, village, mall, bank…), home (laundry, dishes, toaster, kettle, heater, curtain, crate, cage, nap…), food (gravy, roast, stew, sushi, squash, zucchini, berries…), animals, holidays, activities, body, descriptive words (heavy, sharp, fluffy, shiny, empty…) and basic ideas (luck, hope, idea, secret, memory, danger…).
- Derivations: SUNNY → sun and FOGGY → fog (a doubled consonant before a derivational ending), ROASTED → roast (inflection), COOKING → cook, DAYTIME → day, CUBICLE → office, DESTINATION → trip, NAP has its own word (sleep, bed, tired…), HEAT its own (hot, warm, sun…), CAGE / CRATE their own.
- **VACATION** was an alias of HOLIDAY (a festive holiday here), so VACATION + FARM read as HOLIDAY + FARM and led to TURKEY. It is now its own word (beach, trip, summer…).
- No aggressive mis-normalisation: a guessed head or tail of an unknown word must now cover ≥ 70 % of it (HOTEL was read as HOT, PASSPORT as SPORT, ALARM as ARM); real words one letter away from a new word (stamp, swap, create…) are known as words so they are never "corrected" into it (STAMP → SWAMP).
- Missing everyday links found by simulated games (tea–breakfast, sea–food, party–food, rain–cozy, movie–cozy…).
- Audit: of the 1,352 real words the speller knows, 992 were not understood by lexicon-3 and 648 by lexicon-4 (the rest are mostly function words, numbers, months and days). A sweep of ~560 everyday words across the categories above leaves 14 unresolved (rare foods and a few abstract words).

### The human evaluation fixture

`test/fixtures/human-eval.json` lists, for each pair, what an ordinary person would accept (`accept`), what is fine but less obvious (`alternate`) and what would need explaining (`reject`). Tests check the character of the output, not one exact word: Milo must play an `accept` word, Gary an `accept` or `alternate` word, neither a `reject` word; pairs with no good shared answer must be marked recovery. The reported examples are in it (VACATION + FARM is never TURKEY; POTATOES + CHRISTMAS is DINNER, never SOUP; CHICKEN + SEA is never HORSE). **Limitation:** the exported "not having any fun" game files were not available offline (no database access from the build), so the reported rounds are rebuilt from the quoted words and seeds are not the games' own.

### Narrative architecture

Both characters speak through one branching narrative system (`src/client/narrative.js`): one paired BEFORE/AFTER beat per move from one branch, chosen from the direction of the game (match, exhausted, opening, close, recovery, improving, drifting, stuck, strange, strong, good, weak, very weak, normal, long). Pairs are never split, a branch cycles through all its pairs before any repeats, the same line never comes twice in a row, and everything is re-derived from the revealed moves (a reload shows the same dialogue). Gary's approved script is unchanged (`gary-narrative.js`); Milo has his own approved script (`milo-narrative.js`) with the same precedence, his own win ranges (fast 2–3, normal 4–10, late 11–16, very late 17–20) and one long-game branch from move 10. The narrative never reads or changes the bot's word.

Each round is a scene: lock in → BEFORE line during the countdown → both words → AFTER line → the next pair ("Next: A + B"). A match adds "THAT’S A MATCH! You both said WORD." and the POST-WIN line on the result card; a 20-move miss adds the FOLLOW-UP on the game-over card. No generic system sentence is stacked on the character's lines.

### Simulations and manual review

- `node scripts/convergence.mjs` plays simulated games per character against several stand-ins for the player, including `human` (usually one of the six best-scoring words, the best ones most often; two times in five a first thought about only one word).
- `node scripts/solo-review.mjs --games 20 --transcripts 10` prints full transcripts and every recovery or anchored round to read.

Results on engine-2.3 / lexicon-4 (2026-10-08). The stand-ins share the engine's word graph, so every game converges far faster than real ones. Treat these as a comparison between Milo and Gary and between versions, not as a forecast. Live numbers come from `/review`.

| Bot | Stand-in (EN, 300 games) | ≤ 3 | ≤ 5 | ≤ 10 | Median |
|---|---|---|---|---|---|
| Milo | human | 53 % | 89 % | 100 % | 3 |
| Gary | human | 52 % | 88 % | 99 % | 3 |
| Milo | predictor (engine-1 model) | 68 % | 89 % | 99 % | 3 |
| Gary | predictor (engine-1 model) | 61 % | 84 % | 98 % | 3 |

Manual review: 20 Milo and 20 Gary games (`solo-review.mjs`, seed 7000), with 10 transcripts read in full.

- **Round quality:** 61 % of rounds were high quality, 15 % anchored and 24 % recovery. Most recovery rounds fall on move 2, where the pair is two unrelated opening words; from move 3 on, recovery was 12 %.
- **Unresolved inputs:** 0 %.
- **Answers that needed explaining:** 5 of about 90 non-opening rounds.
  - PARTY + PAN → TEA (CAKE was already played).
  - CAKE + OWL → TREE.
  - CLOUD + KITCHEN → RAIN.
  - ISLAND + EGG → SEA.
  - DANCE + SEA → PARTY.
  - All five come from two unrelated words or from the obvious answer being blocked.
- **Fixed during the review:** TEA + EGG now reaches BREAKFAST.
- **Narrative flow:** in every transcript each move had one paired beat. Openings came first, close and win beats followed the rounds as expected, and no line was repeated in a row.



## 1. Why the old choices were poor (engine-1 on lexicon-1)

The reference game was replayed through the original engine on its original data with `node scripts/replay.mjs`. It still reproduces every logged choice:

| Latest pair | engine-1 chose | Root cause (from the decision record) |
|---|---|---|
| LAMP + RESTAURANT | CHRISTMAS | No word was linked to both. LAMP and RESTAURANT had no shared link (no TABLE edge on either side), so the engine fell to tier 2 and picked a word that shared only a tag with each (support 0.10 / 0.10). |
| GIFTS + DINNER | PIZZA | PIZZA was supported 0.25 by GIFTS and 0.65 by DINNER. The human-likelihood term (weight 0.70) beat balance, so a one-sided word won. |
| PRESENTS + PIZZA | FOOD | PRESENTS was not in the vocabulary, so the engine answered from PIZZA alone. FOOD is also a generic word. |
| PAN + CAKE | BIRTHDAY | PAN was not in the vocabulary, so the engine answered from CAKE alone. |

There were three causes:

1. **Vocabulary gaps.** Everyday words (pan, presents, knife, house, teeth…) were unknown, and common links were missing (table–lamp, table–restaurant, birthday–dinner).
2. **The ranking favoured "what a person would say about either word" over "what links both".** A strong link to one word could outweigh a weak link to the other.
3. **No penalties for generic words or one-sided links.** The fallback was a single "tier" ladder, with no record of why a stage was used.

## 2. Engine-2.2 (previous engine; frozen in `src/shared/engine-2.2.js` on lexicon-3 for replay)

Engine-2.3 keeps this scoring and adds the floor, profiles, recovery, openings and tie-breakers above.

`selectBotWord({pair, blocked, language, character, seed, config})` → `{word, quality, decision}`

- **Explicit inputs only.**
  - `pair` is the latest revealed pair. It is the only semantic input.
  - `blocked` holds every word already played in the game, by either side; it is used only for blocking.
  - `seed` is the game seed plus the round number (`moveSeed`).
  - `config` is `ENGINE_CONFIG`.
- **Fair play.**
  - The bot's word is chosen and stored (`hidden`) before the player's word is submitted. The player's word is never an input.
  - Gary and Milo call the same function with the same inputs and get the same word; `character` is recorded but ignored.
  - A same-round match (both type the same word) is a win.
- **Offline.** Local, non-generative and deterministic; no network and no paid AI dependency.
- **Speed.** About 27 ms for the first call (it builds the lexicon index), then a median of 0.4 ms (p95 3.1 ms) on 500 random pairs.
- **Goal.** Every answer should make the player think "yeah, I can see why you said that." The order of priorities is:
  1. a humanly plausible answer;
  2. reading the player's word correctly;
  3. both words meaningfully contributing;
  4. identical, fair play for Gary and Milo;
  5. variety among equally good answers;
  6. game length, last.

### Candidates

Each input contributes its curated links, compound phrases ("table lamp") and category members. Two-step neighbours are added only when no stage-1 or stage-2 word exists. Blocked words and the inputs themselves are rejected after normalisation: case, accents, spacing and plural/lemma forms (`lemmaKeys`), the same rule the game uses for duplicates.

### Score (all terms 0–1 unless stated)

Relation of a candidate to one input word. Each relation is scaled by how sure we are of that input: an exact or inflected word 1, a likely typing slip 1 (high) or 0.9 (medium), a guessed head word 0.75.

| Relation | Score |
|---|---|
| category ↔ member | 1.00 |
| compound + link | 1.00 |
| curated rank r | 0.90 − 0.02·r (minimum 0.70) |
| member | 0.75 |
| link | 0.70 |
| only the other half of a compound (SEA → HORSE via "seahorse") | 0.45 (was 0.95 before engine-2.2) |
| shared neighbours (3 / 2 / 1) | 0.40 / 0.30 / 0.12 |
| shared tag only | 0.05 |
| none | 0 |

The final score is built from these terms:

- `weak = min(relA, relB)`, `strong = max(relA, relB)`
- `connection = 0.65·weak + 0.35·strong` (the weaker side counts most)
- `familiarity = 0.7·min(1, links/12) + 0.3·(short label)` (common, simple words)
- `cue = max over inputs of 1/(1 + 0.25·curatedRank)` (how readily the word comes to mind)
- `oneSided = 0.30·max(0, strong − weak − 0.45)` (penalty, 0–0.17)
- `generic = 0.10` for words such as FOOD, THING, ANIMAL, FUN (penalty)
- `piece = 0.10` for a lazy piece of a compound input (penalty)
- `plausibility` (0–1): how easy the link is for a person to see, from the *kind* of link on each side.
  - Kind values: category 1, compound 1, curated 0.95, member 0.85, link 0.8, shared-3 0.45, shared-2 0.35, compound part 0.3, shared-1 0.15, tag 0.05.
  - Formula: 0.6·weaker side + 0.4·stronger side.
  - Minus 0.10 for a graph-only path (no direct link on either side), and minus 0.10 for a generic word.
- `final = 0.60·connection + 0.15·plausibility + 0.10·familiarity + 0.15·cue − oneSided − generic − piece`. In practice the range is about −0.3 to 1.0.

### Stages (used in order; recorded in every decision)

| Stage | Rule | Low quality? |
|---|---|---|
| 1 shared-direct | weak ≥ 0.70 (directly linked to both) | no |
| 2 direct-plus-indirect | weak ≥ 0.30 and strong ≥ 0.70 | no |
| 3 indirect-both | weak ≥ 0.30 | no |
| 4 weak-fallback | weak ≥ 0.12 | yes |
| 5 best-available | weak > 0 | yes |
| 6 one-input-only | linked to one input only | yes |
| unknown-input | one input is still not understood after spelling, spacing and inflection checks: a broad word directly tied to the other (see below) | yes |
| no-known-input | neither input is understood: a friendly familiar word | yes |
| opening | round 1 (there is no pair yet) | — |

The word is picked from the **quality window** (below), in every stage. Every draw uses the seeded random generator, so the same game and move always give the same word. A word is never empty, blocked, or a repeat.

### Fairness audit (2026-10)

Playtesters reported that Gary seemed to match unrealistically fast, as if he could see the player's answer. The full decision path was audited:

- `lockBotWord` in `src/shared/solo.js` is the only place a Solo bot word is chosen.
- It runs at game start and immediately after each reveal, so the next round's word is committed before the player's next word exists.
- Its only inputs are:
  - the pair both players just saw;
  - the revealed words;
  - language, character and the move seed.
- The committed word is stored in the saved game (`hidden`), so a reload reveals the same word. A rejected attempt doesn't change it.
- `submitSoloWord` re-chooses only when the stored word is missing or already used. It reads revealed words only, never the word being submitted.

`test/fairness.test.mjs` guards all of this, including a source check of the engine call.

**The real cause was predictability, not leaked information.** Engine-2.0 almost always played the single strongest bridge. Any player who thinks "most obvious link" therefore matched it almost immediately.

### Quality window (engine-2.2; replaces engine-2.1's band quotas)

Engine-2.1 drew from fixed band quotas: 20% strongest, 35% strong, 30% reasonable, 15% lateral. It sometimes picked a clearly weaker word just to fill a quota (PAW + FISH → DOG instead of PET). That was artificial difficulty, so the quotas are gone.

Within the reached stage, the best answer is always eligible. Other answers are eligible only if they are:
- within **0.04** of its final score; and
- within **0.10** of its plausibility; and
- not a generic word or a piece of an input.

At most 3 answers are eligible (`ENGINE_CONFIG.window`).

- If one answer is clearly best, it is chosen.
- If several are equally good (PAW + FISH → PET or CAT), the move's seed picks between them.

The window is logged with every decision (`decision.window`).

**Game length is not a target.** A 3- or 4-move game is fine when that is the natural outcome. `node scripts/convergence.mjs` still reports match-by-move as information.

Against simulated players that share the bot's vocabulary, engine-2.2 converges fast:

| Simulated player (EN, 300 games) | Matched by move 3 | By move 5 | Median moves |
|---|---|---|---|
| Always plays the strongest answer | 96% | 100% | 2 |
| Engine-1 human-prediction model | 82% | 95% | 2 |

This is an upper bound. Real players don't share the graph, so judge real play in `/review` by quality first: flags, rating, low-quality rate. Look at match-by-move second.

### Unknown words: a broad answer, not a one-sided continuation

When one word is still not understood after the input-understanding steps (section 2b), engine-2.1 scored only the other word. The result was a narrow word that ignored the player: CHICKS + SHELL → SEA, SURFING + TAIL → CAT.

Engine-2.2 keeps only candidates **directly** tied to the known word (category, compound, curated, member, link) and scores them for breadth:
- `0.5·relation + 0.2·familiarity + 0.3·breadth`
- breadth is 1 for a category word, otherwise links/15 (at most 1).

The result is a broad, familiar word, such as BARN → FARM. It is logged as `stage: unknown-input, fallback: broad-known-side`, flagged low quality.

With lexicon-3 and the input steps below, this is now rare: every word of the 10:56 game is understood.

### The 10:56 game: an engine-2.1 failure, and what changed

Game `4ac661bf-57c3-440d-a14e-1c8dbf4e4225` (Gary, 14 moves, rated 1 star, started 2026-10-08T14:56:10Z). It is rebuilt from its round words in `test/fixtures/bot-replay.json` (cases `g1056-*`) and asserted in `test/engine.test.mjs`. The original log wasn't available offline, so the seeds are not the game's own.

| Pair Gary answered | engine-2.1 | Cause | engine-2.2 |
|---|---|---|---|
| BATTLESHIP + BARN | farm | BATTLESHIP unknown → one-sided | a weak bridge, flagged low quality (the two words share almost nothing) |
| WOOD + FARM | bird | only shared neighbours (graph-only) | fence |
| TWIGS + EGG | shell | TWIGS unknown | branch / chicken |
| CHICKS + SHELL | sea | CHICKS unknown | sea, flagged low quality (EGG, the natural answer, was already played) |
| CHICKEN + SEA | horse | SEA → HORSE only through "seahorse" (compound half scored 0.95) | fish |
| TUNA + HORSE | ride | TUNA unknown | animal |
| SURFING + TAIL | cat | SURFING unknown | ocean / fish |
| PAW + FISH | dog | the 15% lateral quota sampled DOG over PET | pet |

### 2b. Understanding the player's word (`src/shared/understand.js`)

Both the engine and the "Did you mean?" prompt read a typed word the same way. The steps run in order, and the first hit wins:

1. **exact:** the word, or a listed synonym/variant (alias).
2. **plural:** twigs → twig.
3. **morphology:** the game's own inflection rules (`src/shared/morph.js`), e.g. surfing → surf, riding → ride.
4. **compound:** two known words written together or apart, e.g. birdnest → bird + nest.
5. **fuzzy:** a typing slip of a known word, e.g. battelship → battleship, chikcen → chicken, aqurium → aquarium. A sound-alike pass catches spellings like elefant → elephant and sizzors → scissors.
6. **derived:** a known word plus an ending, e.g. snowy → snow.
7. **component:** the head of an unknown longer word, low confidence.
8. **unresolved.**

**Spacing never matters** (sea horse = seahorse, ice cream = icecream, play ground = playground). Comparison keys drop spaces, case, accents and apostrophes, and a spacing variant is logged (`spacing: true`).

**Fuzzy matching is conservative.**
- Only words of 4+ letters.
- Never a word the speller already knows as a real word ("draft" stays draft; "carpet" is no longer read as car + pet).
- One change, or two for 8+ letters keeping the first two letters.
- One unique closest concept.
- **High** confidence: a typical slip (swapped neighbours, a letter left out or doubled, a sound-alike letter, a sound-alike spelling).
- **Medium:** any other single change after the first letter.
- Anything else is **low** and is not guessed.

### "Did you mean?" (browser)

| Confidence | What the player sees |
|---|---|
| high | "You typed: battelship / Did you mean BATTLESHIP?" with **Use battleship** (main button) and **Keep battelship**. Locking in asks once before playing; Use or Keep then locks in straight away. |
| medium | The quiet hint as before. It never blocks the lock-in. |
| low | Nothing; the word is played as typed. |

The word is never changed without the player's say-so. Purely structural clean-up (trimming, case, curly apostrophes, spacing) needs no confirmation because the game already treats those as the same word.

### Dataset (lexicon-3, `src/shared/lexicon/additions3.js`; lexicon-2 in `additions.js`)

- **lexicon-3** fixes the coverage gaps the 10:56 game exposed. A check of about 470 everyday words had found 128 unknown; now 4 remain (ambiguous: guinea, crop, skip, board).
  - 195 new concepts: animals, food, actions, places, vehicles, clothes, animal parts, nature, work and school.
  - New category memberships.
  - 73 aliases (61 English, 12 French), e.g. surfing → surf, mother → mom, bicycle → bike, hamburger → burger, spaghetti → pasta.
  - A guard that real words are never split into pieces.
  - Every new label is unique in both languages (tested).
- **lexicon-2** (earlier):
  - 54 new everyday concepts, each with at least five links.
- New links (table–lamp, table–restaurant, birthday–dinner, christmas–dinner, gift–wrap…) and compounds.
- English and French aliases (present → gift, house → home, teeth → tooth…).
- Every version is still loadable (`getLexicon(lang, "lexicon-1" | "lexicon-2" | "lexicon-3")`) so old decisions can be replayed on their data.

### Licensing

All association data in this repository is original, hand-curated content. **No third-party association norms are included.**

- Small World of Words is licensed for research and is not cleared for use in this product.
- ConceptNet (CC BY-SA 4.0) would need attribution and share-alike review.

Neither was imported. Importing any external dataset needs a licence review first.

## 3. Game logs

### What is stored

| Record | Fields |
|---|---|
| Game | id (the game's own random id), mode, character, language, started / last activity / ended timestamps, player rating (1–5, won games only, once), status (`in_progress`, `matched`, `exhausted` = 20 moves without a match, `ended` = player started another game; `abandoned` is inferred at read time after 24 h of inactivity), rounds, app version, engine version, dataset version, config, seed |
| Round | the pair the bot answered, user word, bot word, normalised keys, match, reveal time, decision time (ms), stage, low-quality flag, how the player's word was read (`player_input`: what they typed, any spelling suggestion with its confidence and whether they took it, normalised form, what it was understood as and how — spelling, spacing, inflection — or unresolved; stored on the server inside the round's decision as `playerInput`, no schema change), and the full decision (each input's understanding, plausibility per candidate, the quality window) (inputs, sources, candidates with A/B relations, weaker side, every score component, final score and rank, rejections, pool, selected word, config) |

No names, player ids, emails or IP addresses are stored.

### When and where it is stored

- **On the device.** Each round is written to `localStorage["ssbd.gamelog"]` as soon as it is revealed. The bot's hidden word is never logged before the reveal.
- **Upload.** The device queue uploads to `POST /api/log/batch` with backoff (15 s → 5 min), when the browser comes back online, and when the tab is shown. The queue survives refreshes and restarts. Partial games are captured round by round.
- **On the server.** Uploads are idempotent: rounds are keyed by game id + round and never overwritten; a game's status only moves forward.
- **Central tables.** Supabase `bot_games`, `bot_rounds` and `bot_reviews`. Row-level security is on and there is no anon or authenticated access; only the server writes.

### Player rating

After a Solo win, the card asks for 1–5 stars, inline, with no submit button.

- The rating is saved at once on the game (`playerRating`) and on its log record (`player_rating`), then queued as `pending.ratings`.
- It leaves that queue only when the server lists the game in `rated`. This works whether the game was already uploaded (it is updated in place) or not (the rating travels with it).
- The server writes a rating once and never overwrites it.
- A rated game never asks again.

### Setup

Apply these migrations to the production database:

- **`supabase/migrations/20261009120000_bot_game_logs.sql`** (game logs). Until it is applied, uploads fail and stay queued on each device, which does no harm.
- **`supabase/migrations/20261010120000_bot_games_player_rating.sql`** (rating column). Until it is applied, games and rounds still log normally; ratings stay queued on each device and upload once the column exists.

## 4. Private review screen (`/review`)

1. Set a long random **`REVIEW_TOKEN`** environment variable in Vercel (server-side only; never `NEXT_PUBLIC_`). Without it, every `/api/review/*` endpoint returns 404.
2. Open `https://<your-domain>/review` and enter the token. It is kept for that browser tab only and sent as a bearer header. A wrong token returns 401. The page is `noindex`.
3. Use the screen:
   - **Filters:** character, language, outcome, engine version, dates, "flagged or low quality", and "highlighted".
   - **Games list:** a Highlights column (recovery > 25 % of rounds, unresolved input > 10 %, repeated low-quality rounds, a 1–2 star rating) and the first bad round; highlighted games are shaded.
   - **Game header:** character and difficulty profile, language, outcome and match move, rounds, engine version, rating, and the highlights.
   - **Rounds table:** Round | Previous pair | User | Gary/Milo | Rank | Plausibility | Weak side | Recovery | Unresolved input | Near-match | Style tie-break | Match | Automated | Human flags. The first bad round (recovery, unresolved input, low quality, or flagged weak/one-sided) is outlined and labelled. Expand a round for the full decision: quality tier and recovery reason, pick rank/plausibility/weak side, the near-best range and its rule, the tie-breakers, every candidate.
   - **Human flags** (weak, one-sided, too obscure, too generic, good connection) and a note. They are stored apart from the automated low-quality indicator.
   - **Player rating:** a column in the games list, on the game header, as `player_rating` in JSON, as the last CSV column, and as a metrics row (mean, with rated/won counts).
   - **Exports:** CSV (one row per round; cells are quoted, and cells starting with `= + - @` are neutralised against spreadsheet formulas) and JSON (with full decisions).
   - **Metrics** (each with its denominator): match within 5 and within 10 moves, median moves to a match, ended/abandoned by round, the rates of reviewed weak, one-sided and good rounds, fallback rate, low-quality rate, **recovery rounds, unresolved input, answers below the high-quality threshold, near-match rounds, style tie-breaks, average plausibility and average weak-side relation of the bot's answers, highlighted games**, repeated/invalid bot words (should be 0), and decision latency. They are shown overall and per character × engine version, and can be filtered by language. For engine-2.2 and older, recovery and the threshold come from the stage.
   - **CSV:** after the original columns: `player_rating`, `difficulty_profile`, `recovery`, `unresolved_input`, `high_quality`, `pick_rank`, `pick_plausibility`, `pick_weak_side`, `near_match`, `style_tie_break`.

The **This device** section works without a token. It shows this browser's own log and offers a device CSV/JSON export and "Upload now". Use it when central logging is not set up.

## 5. Replay and regression

- `node scripts/replay.mjs` runs `test/fixtures/bot-replay.json` (versioned, now `replay-4`) through engine-1 on lexicon-1, engine-2.2 on lexicon-3 (frozen copy) and the current engine, side by side. Use `--format csv` or `--format json` for other output, and `--out <file>` to write to a file.
- `node scripts/replay.mjs --log export.json` replays rounds from a review JSON export. Each round is rebuilt with its exact pair, the words used before it, the revealed rounds (for the tie-breakers), the character and its seed. Rounds logged by engine-2.2 are reproduced exactly by the frozen engine-2.2 column.
- `test/replay.test.mjs` enforces the fixtures:
  - `pass` cases must give an acceptable word;
  - `known-gap` cases document open weaknesses and must still be safe.

**Logs never change rankings automatically.** The engine and dataset have no code path from the logs. To act on a reviewed round:

1. Export it from `/review` (JSON).
2. Add it to the fixtures with its flags and an `expect` block. Bump `version` if expectations change.
3. Change the data or the config.
4. Run `node scripts/replay.mjs` and `npm test`, compare old vs new, then bump `ENGINE_VERSION` / `DATASET_VERSION`.

Known gaps (in the fixtures):

- SNOW + MAN: no SNOWMAN concept.
- BARK + TREE: BARK is unknown.
- RING + PHONE: only the jewellery sense of RING.
