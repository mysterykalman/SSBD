# Filling in Pam's knowledge

## What Pam's knowledge is

Pam plays 20 Questions from one data file:

- **File:** `src/client/mom-mode/knowledge.runtime.json` (12 MB, shipped with the game).
- **Shape:** a grid of **52,648 answers** (things you could be thinking of) × **1,065 questions**.
- **Each cell:** Yes, No, Sometimes, or blank ("unknown").

During a game, every answer you give raises the answers whose cell matches and lowers the ones whose
cell disagrees. A blank cell does nothing either way.

## Where the data comes from today

The file is built by scripts in `scripts/` (`build-mom-*.mjs`, `mom-runtime-compiler.mjs`) from public
databases, mainly **Wikidata**, plus a small hand-written seed (`src/client/mom-mode/knowledge*.js`).
Wikidata records encyclopedia facts: "noodle is a food", "DHL is a company", "Taylor Swift is a
person".

## The problem

Only **0.68%** of the grid is filled in.

- **The top-level category questions are filled:** "Is it a person / place / animal / food / object…?"
  is known for about 22,000 answers.
- **The everyday questions are almost entirely blank.** For example:

| Question | Answers that have it filled (of 52,648) |
|---|---|
| Would you find it in a home? | 88 |
| Is it bigger than an adult human? | 62 |
| Can you eat it? | 29 |
| Does it have legs? | 25 |
| Could it hurt you? | 21 |
| Does it have fur or hair? | 11 |
| Can you wear it? | 8 |

- **The sources don't contain these facts.** Wikidata says "noodle is a food", but nobody wrote down
  "a noodle is not bigger than a person" or "you'd find noodles at home", so the scripts had nothing
  to copy. The pipeline also has a deliberate rule never to guess: missing stays blank. A wrong "No"
  would eliminate the right answer.
- **About half the answers (29,351) have no data at all**, because they're obscure (e.g. "Bathymetry",
  "DHL Group") and the sources had nothing usable about them.

## What happens in play

Pam narrows down to the right kind of thing with the category questions, then has nothing useful to
ask. The everyday questions that would separate a dog from a cat, or a chair from a toothbrush, are
blank. So she drifts, reaches for very narrow "Is it a ___?" questions, and gets pulled toward
obscure answers she knows nothing about.

## What needs to populate it

Everyday common-sense answers for the **87 general questions** in `questions.csv`: the 14 category
questions plus 73 everyday ones (size, where it's found, edible, legs, fur, wearable, makes a sound,
has a screen…). An AI model like ChatGPT knows these well.

The other 978 questions are narrow follow-ups (e.g. "Is the person mainly known as an actor?"). They
only matter once a branch is chosen, so leave them for later.

## The files in this folder

| File | What it is |
|---|---|
| `questions.csv` | The 87 questions to fill: `question_id`, the question text, type. |
| `fill-top-2000.csv` | **The sheet to fill.** The 2,000 most likely answers (most common first) × the 87 questions. Cells Pam already knows are pre-filled; the rest are blank. |
| `all-concepts.csv` | All 52,648 answers ranked by likelihood, with how many cells each already has. Use it for later batches after the top 2,000. |

## How to fill it (in ChatGPT)

1. Work in batches of about **100 rows** (one batch = one message). Paste the header row plus the rows.
2. Use this prompt:

> You are filling in a 20-Questions knowledge table. Each row is a thing someone might think of
> (`name`, with its `category`). Each column after `category` is a question, identified by its
> `question_id`; the full wording is in this list: [paste questions.csv].
> For every blank cell, answer how a typical person would answer that question about that thing:
> `Y` = yes, `N` = no, `S` = sometimes / it depends, leave blank only if it truly can't be answered.
> Keep every cell that is already filled exactly as it is. Do not add, remove, rename or reorder
> rows or columns. Return the result as CSV only, same header, no commentary.

3. **Rules for the answers:**
   - Answer like a typical player, not a scientist. A tomato is a fruit botanically, but most people
     say No to "Is it a fruit?", so `N` or `S`.
   - Use `S` for genuine "it depends" (e.g. "Is it usually cold?" for water).
   - Never change the `concept_id` column. It's how the answers get matched back.
   - Leave pre-filled cells alone. If one looks wrong, note it separately rather than overwriting it.
4. Save each batch back into one CSV with the same header and columns.

## Sending it back

Send the filled CSV here. An import script will:

1. Merge your answers into Pam's knowledge file. Your answers fill blanks; pre-filled cells you flag
   as wrong get corrected.
2. Re-run the 60-game simulation to show the before/after win rate.
3. Keep the build's safety check: the file must still have at least 50,000 answers.

Start with the first 300–500 rows. That covers most of what people actually pick, and is enough to
measure the improvement before doing more.
