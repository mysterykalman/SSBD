# Actual combined Pam knowledge preview (research only)

The Node module `scripts/pam-combined-research.mjs` **loads the real original 1,775 production targets and 156 questions**, applies the reviewed corrections, then loads the original Brotli-compressed 1,650-target expansion, removes exact-name duplicates, compiles its real research questions and creates **one question-major matrix**. It does not mutate production.

It reports the actual total subjects, question count, exact-name conflicts and answer coverage. The original 276,900 cells retain their exact states and known masks. Every old question on a new target and every new question on an old target defaults to **unknown, not No**. Tests assert this for every relevant cell.

To verify:

```sh
node --test test/pam-combined-research.test.mjs
node --test test/pam-real-roster-benchmark.test.mjs
node scripts/pam-real-roster-benchmark.mjs artifacts/pam-real-roster-benchmark.json
```

The resulting merged matrix is diagnostic, NOT playable: existing Pam's four-category opening and experimental thematic routing have not been combined; every cross-library fact must be reviewed or deliberately treated as unknown; category/question semantics and gameplay acceptance are pending. This checkpoint supplies a complete matrix and tests that no legacy data was destroyed, not new verified facts or a release.
