# Mom Mode engine assessment

Reviewed 2026-10-11. Objective: reskin a finished 20 Questions game, not build an inference engine.

| Candidate | Licence | Outcome |
| --- | --- | --- |
| [thoregraepel/twenty-questions](https://github.com/thoregraepel/twenty-questions) | None declared | Best technical fallback: 104 objects, 59 features, standalone browser JS, self-play tests, author-reported 100% truthful solves within 20 and 7.89 mean questions. **Do not copy without permission.** |
| [NRR385/MindMancer](https://github.com/NRR385/MindMancer) | MIT | Fully implemented and tested, but only 12 seeded characters/16 traits; requires MongoDB, Python ML service and Node gateway. Not a simple static reskin. |
| [Aaklon/akinator](https://github.com/Aaklon/akinator) | AGPL-3.0 | Sophisticated Go engine, but requires a custom knowledge database and server/binary. |
| [Nightflex/Akinator-AI-Clone](https://github.com/Nightflex/Akinator-AI-Clone) | None declared | 100-character Python/FastAPI app, self-play claims 100% accuracy, no reuse licence. |
| [face-hh/rustinator](https://github.com/face-hh/rustinator) | Apache-2.0 | Rust/Tauri desktop app; authors report a very small dataset and random question selection. |
| [googlecreativelab/mystery-animal](https://github.com/googlecreativelab/mystery-animal) | Apache-2.0 | Opposite game direction (player guesses), archived and dependent on old Actions/Dialogflow. |
| [DoricRedPanda/OpenAkinator](https://github.com/DoricRedPanda/OpenAkinator) | GPL-3.0 | C terminal game; not a browser-ready reskin. |
| [evobyte-apps/open-20-questions](https://github.com/evobyte-apps/open-20-questions) | MIT | Django/Angular implementation that requires seeding its database. |
| [rouge8/20questions](https://github.com/rouge8/20questions) | MIT | Old Python 2/web.py game; authors note corrupted knowledge and minimal error handling. |

## Decision and licence gate

No reviewed permissively licensed option satisfies the requirement of a mature, complete, prepopulated browser game that can be reskinned without significant engineering. The technical fallback is thoregraepel/twenty-questions. Its GitHub repository has no licence metadata or root LICENSE file. Public visibility and personal use do not automatically grant the right to copy or modify its source or dataset. Request explicit permission to reskin and privately integrate it before vendoring.

Until then, the Mom Mode branch contains a **design preview only** with Pam's avatar, bio, dialogue, answer controls and result screens. Sample answers do not affect the preview guess. The engine adapter intentionally refuses to pretend it can infer anything. The old FergusGriggs/20q prototype remains excluded.

## Release gate

Obtain permission or a suitably licensed equivalent; integrate actual engine and knowledge data behind the adapter; preserve required notices; run engine self-play and SSBD lint, typecheck, unit, E2E and responsive browser checks; remove preview labels; merge only when fully playable.
