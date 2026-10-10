# Mom Mode engine assessment

Reviewed 2026-10-11. Objective: ship a broad, local 20 Questions experience without an LLM or a paid/public runtime service, and avoid rebuilding an inference engine unless licensing makes direct reuse impractical.

| Candidate | Licence | Outcome |
| --- | --- | --- |
| [thoregraepel/twenty-questions](https://github.com/thoregraepel/twenty-questions) | No licence declared | Strongest technical reference. Its current implementation uses a Bayesian posterior and expected information gain over 104 objects and 59 features. The repository documents 100% truthful self-play within 20 questions, with a mean around 7.9 questions. It is not copied or vendored because no reuse licence is declared. |
| [NRR385/MindMancer](https://github.com/NRR385/MindMancer) | MIT | Complete multi-service implementation, but its seeded universe is very small and integration requires MongoDB, Python and Node services. |
| [Aaklon/akinator](https://github.com/Aaklon/akinator) | AGPL-3.0 | Sophisticated Go implementation, but the repository does not ship the broad knowledge database Mom Mode needs. |
| [face-hh/rustinator](https://github.com/face-hh/rustinator) | Apache-2.0 | Permissive, but a small desktop-oriented dataset with weak/random question selection. |
| [googlecreativelab/mystery-animal](https://github.com/googlecreativelab/mystery-animal) | Apache-2.0 | Archived and the player guesses the animal, which is the reverse game direction. |
| [DoricRedPanda/OpenAkinator](https://github.com/DoricRedPanda/OpenAkinator) | GPL-3.0 | Terminal-oriented C project with a tiny bundled sample dataset. |
| [evobyte-apps/open-20-questions](https://github.com/evobyte-apps/open-20-questions) | MIT | Django/Angular application that still requires a database to be populated with useful game knowledge. |
| [rouge8/20questions](https://github.com/rouge8/20questions) | MIT | Old Python 2/web.py project whose own documentation reports corrupted knowledge and minimal error handling. |

## Decision

No reviewed permissively licensed repository met the product requirement of a mature, broad, prepopulated game that could be dropped into SSBD without substantial infrastructure or data work. The strongest technical fallback, thoregraepel/twenty-questions, has no declared open-source licence. Public visibility and personal use do not grant permission to copy or modify it.

Mom Mode therefore uses an independently authored local implementation of the same general, published Bayesian 20 Questions approach: maintain a posterior distribution over known concepts, score unused questions by expected entropy reduction, update the posterior after each answer, and guess once confidence is high or the 20-question budget requires a decision. No source code or dataset from the unlicensed fallback was copied, vendored or bundled.

This is the licensing-driven exception to the original preference to reskin an upstream engine. The adapter keeps the UI isolated so a suitably licensed mature engine can replace it later without rewriting Pam or the Mom Mode interface.

## Shipped knowledge and answer model

The bundled Mom Mode knowledge file is independently authored for this project. It contains 167 familiar concepts across people, animals, foods, household objects, tools, technology, transport, places and other common categories, described by 106 possible traits/questions. The engine accepts five responses: Yes, Probably, Not sure, Probably not and No. The middle responses use soft evidence rather than being flattened into hard yes/no answers.

No external API, LLM, remote Akinator service or hidden runtime dependency is used.

## Verification

A deterministic truthful self-play benchmark over every bundled concept produced:

- 167 / 167 concepts solved within the 20-question limit
- mean 10.68 turns
- worst case 20 turns
- no duplicate feature vectors in the bundled knowledge base

These figures apply only to the bundled known-concept universe under the engine's own truth table. They are not a claim that arbitrary real-world concepts outside the knowledge base will be guessed correctly.

## Source and licence note

Technical reference: https://github.com/thoregraepel/twenty-questions at commit `688dee26b201f210d03ed516eb38d51ee0d1e13a`.

Upstream licence status at review time: no root licence or declared GitHub licence detected. Reuse status in SSBD: none. No upstream code or data is bundled.

Mom Mode-specific engine, adapter, knowledge data, UI and Pam scripting in this repository are original SSBD project work. The Pam portrait is the project-supplied asset at `src/client/mom-mode/pam.webp`.
