# Solo bot engine, game logs and review

This covers how Gary and Milo choose their word (engine-2.0, dataset lexicon-2), how Solo games are logged, how to review them, and how to replay decisions.

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

## 2. Engine-2.0 (`src/shared/engine.js`)

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
- **Speed.** About 17 ms for the first call (it builds the lexicon index), then a median of 0.5 ms (p95 1.9 ms) on 500 random pairs.

### Candidates

Each input contributes its curated links, compound phrases ("table lamp") and category members. Two-step neighbours are added only when no stage-1 or stage-2 word exists. Blocked words and the inputs themselves are rejected after normalisation: case, accents, spacing and plural/lemma forms (`lemmaKeys`), the same rule the game uses for duplicates.

### Score (all terms 0–1 unless stated)

Relation of a candidate to one input word:

| Relation | Score |
|---|---|
| category ↔ member | 1.00 |
| compound + link | 1.00 |
| compound only | 0.95 |
| curated rank r | 0.90 − 0.02·r (minimum 0.70) |
| member | 0.75 |
| link | 0.70 |
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
- `final = 0.70·connection + 0.15·familiarity + 0.15·cue − oneSided − generic − piece`. In practice the range is about −0.3 to 1.0.

### Stages (used in order; recorded in every decision)

| Stage | Rule | Low quality? |
|---|---|---|
| 1 shared-direct | weak ≥ 0.70 (directly linked to both) | no |
| 2 direct-plus-indirect | weak ≥ 0.30 and strong ≥ 0.70 | no |
| 3 indirect-both | weak ≥ 0.30 | no |
| 4 weak-fallback | weak ≥ 0.12 | yes |
| 5 best-available | weak > 0 | yes |
| 6 one-input-only | linked to one input only | yes |
| unknown-input / no-known-input | one or both inputs are not in the vocabulary | yes |
| opening | round 1 (there is no pair yet) | — |

Within the first stage that has candidates, the strong pool is every word within 0.03 of the best score, up to 3 words. One is picked with the seeded random generator. Randomness never reaches a weaker word, and a word is never empty, blocked, or a repeat.

### Dataset (lexicon-2, `src/shared/lexicon/additions.js`)

- 54 new everyday concepts, each with at least five links.
- New links (table–lamp, table–restaurant, birthday–dinner, christmas–dinner, gift–wrap…) and compounds.
- English and French aliases (present → gift, house → home, teeth → tooth…).
- lexicon-1 is still loadable (`getLexicon(lang, "lexicon-1")`) so old decisions can be replayed.

### Licensing

All association data in this repository is original, hand-curated content. **No third-party association norms are included.**

- Small World of Words is licensed for research and is not cleared for use in this product.
- ConceptNet (CC BY-SA 4.0) would need attribution and share-alike review.

Neither was imported. Importing any external dataset needs a licence review first.

## 3. Game logs

### What is stored

| Record | Fields |
|---|---|
| Game | id (the game's own random id), mode, character, language, started / last activity / ended timestamps, status (`in_progress`, `matched`, `exhausted` = 20 moves without a match, `ended` = player started another game; `abandoned` is inferred at read time after 24 h of inactivity), rounds, app version, engine version, dataset version, config, seed |
| Round | the pair the bot answered, user word, bot word, normalised keys, match, reveal time, decision time (ms), stage, low-quality flag, and the full decision (inputs, sources, candidates with A/B relations, weaker side, every score component, final score and rank, rejections, pool, selected word, config) |

No names, player ids, emails or IP addresses are stored.

### When and where it is stored

- **On the device.** Each round is written to `localStorage["ssbd.gamelog"]` as soon as it is revealed. The bot's hidden word is never logged before the reveal.
- **Upload.** The device queue uploads to `POST /api/log/batch` with backoff (15 s → 5 min), when the browser comes back online, and when the tab is shown. The queue survives refreshes and restarts. Partial games are captured round by round.
- **On the server.** Uploads are idempotent: rounds are keyed by game id + round and never overwritten; a game's status only moves forward.
- **Central tables.** Supabase `bot_games`, `bot_rounds` and `bot_reviews`. Row-level security is on and there is no anon or authenticated access; only the server writes.

### Setup

The **migration `supabase/migrations/20261009120000_bot_game_logs.sql` must be applied to the production database.** Until it is, uploads fail and stay queued on each device (harmlessly).

## 4. Private review screen (`/review`)

1. Set a long random **`REVIEW_TOKEN`** environment variable in Vercel (server-side only; never `NEXT_PUBLIC_`). Without it, every `/api/review/*` endpoint returns 404.
2. Open `https://<your-domain>/review` and enter the token. It is kept for that browser tab only and sent as a bearer header. A wrong token returns 401. The page is `noindex`.
3. Use the screen:
   - **Filters:** character, language, outcome, engine version, dates, and "flagged or low quality".
   - **Rounds table:** Round | Previous pair | User | Gary/Milo | Match | Automated | Human flags. Expand a round for the full decision.
   - **Human flags** (weak, one-sided, too obscure, too generic, good connection) and a note. They are stored apart from the automated low-quality indicator.
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
