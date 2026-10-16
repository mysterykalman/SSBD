# Native Connections mode

This is the SSBD-native replacement for the earlier React/Clonections prototype.

- No React runtime or separate package.
- No light/dark mode toggle. The mode uses the single SSBD visual treatment.
- Puzzle content lives under `src/shared/connections/` as 200 source families that expand to 800 reusable groups.
- `generator.js` owns compatibility, anti-collision, alternate-solution and tier recipe logic.
- `native.js` owns browser interaction only: tier picker, selection, submit, one-away feedback, mistakes, shuffle, deselect, solved groups, reveal and replay.
- Recent family IDs and exact game signatures are stored locally to reduce repetition.

The mode is currently loaded from the existing secondary browser bundle (`audio-entry.js`) to avoid touching the large main app entry during the local-only experiment. It should receive its own build entry when this branch is prepared for production merge.
