# Pam late-game reasoning change

This change addresses the observed late-game drift where Pam narrowed to an electronic device and then jumped across unrelated categories and leaf guesses.

Changes:

- Removes the late-turn bonus that favored specific leaf questions simply because the game was near question 20.
- Strengthens same-family repetition penalties so Pam does not serially probe sibling subtypes.
- Blocks contradictory ontology roots once an object/technology branch is positively established.
- Requires the vehicle branch before asking car, aircraft, or watercraft leaf questions.
- Normalizes the awkward `Is it a clothing?` wording to `Is it clothing or something you wear?`.
- Adds same-device Pam question/answer traces to `/review`, including ranking diagnostics and top candidates.
