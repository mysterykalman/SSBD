# Solo bot engine, game logs and review

This covers how Gary and Milo choose their word (engine-2.2, dataset lexicon-3), how Solo games are logged, how to review them, and how to replay decisions.

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

## 2. Engine-2.2 (`src/shared/engine.js`)

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
   - **Filters:** character, language, outcome, engine version, dates, and "flagged or low quality".
   - **Rounds table:** Round | Previous pair | User | Gary/Milo | Match | Automated | Human flags. Expand a round for the full decision.
   - **Human flags** (weak, one-sided, too obscure, too generic, good connection) and a note. They are stored apart from the automated low-quality indicator.
   - **Player rating:** a column in the games list, on the game header, as `player_rating` in JSON, as the last CSV column, and as a metrics row (mean, with rated/won counts).
   - **Exports:** CSV (one row per round; cells are quoted, and cells starting with `= + - @` are neutralised against spreadsheet formulas) and JSON (with full decisions).
   - **Metrics** (each with its denominator): match within 5 and within 10 moves, median moves to a match, ended/abandoned by round, the rates of reviewed weak, one-sided and good rounds, fallback rate, low-quality rate, repeated/invalid bot words (should be 0), and decision latency. They are shown overall and per character × engine version, and can be filtered by language.

The **This device** section works without a token. It shows this browser's own log and offers a device CSV/JSON export and "Upload now". Use it when central logging is not set up.

## 5. Replay and regression

- `node scripts/replay.mjs` runs `test/fixtures/bot-replay.json` (versioned, `replay-1`) through engine-1 on lexicon-1 and the current engine, side by side. Use `--format csv` or `--format json` for other output, and `--out <file>` to write to a file.
- `node scripts/replay.mjs --log export.json` replays rounds from a review JSON export. Each round is rebuilt with its exact pair, the words used before it, and its seed.
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
