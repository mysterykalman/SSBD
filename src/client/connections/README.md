# Odd One In: native puzzle engine

Odd One In uses the SSBD-native interface and game generator. No additional framework is required.

## Content library

- The library contains **600 authored six-word families**, 150 for each difficulty.
- Four deterministic four-word variants per family produce **2,400 reusable groups**, 600 per difficulty.
- The original 200 families remain intact; 400 additional families live in `*-expansion.js` files.
- The expanded material spans familiar categories, geography, music, literature, fictional worlds, concepts, etymology, word patterns, arts, science and specialist trivia, rather than relying primarily on compound-word templates.
- Authoring schema: `{i,d,c,t,p,a,w}` means unique family ID, difficulty, visible answer category, connection mechanic, topic, anchor words and six source words.
- Every family generates four group variants using the indices in `CONNECTION_VARIANTS`. A six-word family must contain six **distinct**, clear matches for its answer category.

## Game generation

`generator.js` composes four independently sourced families using tier recipes. It rejects overlapping or incompatible groups, scans the full family bank for alternate predefined four-word solutions and bounds three-word near-misses by difficulty.

The browser stores exact puzzle signatures, the last 48 family IDs, and a recency-ordered history of up to 700 family IDs in `ssbd.connections.v3`. The generator prefers families never used in that retained history, then families outside the recent window, and allows a repeat only when necessary to produce a valid board. Existing players' previously stored `recentFamilies` seed the new history automatically. Records are browser-local and do not follow users to another browser/device.

## Characters

Difficulty levels remain Owen, Zoe, Martin and **Dr. Jones**. The Dr. Jones UI name and standee label replace Professor Braine, while retaining the existing fourth-tier artwork path for compatibility.

## Checks

Run `node --test test/connections-native.test.mjs` to validate library size, word-set uniqueness, all four tier recipes, board quality, recent-history reuse avoidance and the Dr. Jones name.

A GitHub Actions workflow checks the native puzzle test suite and source checks on pull requests that touch Odd One In.
