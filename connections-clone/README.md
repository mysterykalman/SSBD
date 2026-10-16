# SSBD Connections Prototype

This is an isolated, unskinned Clonections-style prototype added to SSBD for gameplay testing.

Source inspiration: https://github.com/lk101101/clonections

## What changed

- Preserves the Clonections interaction model and visual treatment for now.
- Replaces the original mock puzzle with the 50 hand-authored SSBD grouping puzzles.
- Adds Previous / Next controls so all 50 puzzles can be reviewed quickly.
- Keeps the prototype isolated under `connections-clone/` so the main SSBD build is unaffected.

## Run locally

```bash
cd connections-clone
npm install
npm start
```

## Puzzle data

The 50 puzzles are split across five JSON files under `src/data/`, 10 puzzles per file. `App.jsx` combines them into a single 50-puzzle set.
