const ROOT_NEGATIVES = {
  person: ['animal','plant','place','object','food_drink','media_work','event','organization','abstract'],
  animal: ['person','plant','place','food_drink','media_work','event','organization','abstract'],
  plant: ['person','animal','place','food_drink','media_work','event','organization','abstract'],
  place: ['person','animal','plant','food_drink','media_work','event','organization','abstract'],
  food_drink: ['person','animal','plant','place','media_work','event','organization','abstract'],
  object: ['person','place','food_drink','media_work','event','organization','abstract'],
  media_work: ['person','animal','plant','place','food_drink','event','organization','abstract'],
  event: ['person','animal','plant','place','food_drink','object','media_work','organization','abstract'],
  organization: ['person','animal','plant','place','food_drink','object','media_work','event','abstract'],
  abstract: ['person','animal','plant','place','food_drink','object','media_work','event','organization']
};

const EXCLUSIVE_GROUPS = [
  ['real_person','fictional_character'],
  ['mammal','bird','fish','reptile','amphibian','insect']
];

export function deriveSafeNegativeTraitIds(positiveIds=[]) {
  const yes = new Set(positiveIds);
  const no = new Set();

  for (const [root, negatives] of Object.entries(ROOT_NEGATIVES)) {
    if (!yes.has(root)) continue;
    for (const id of negatives) if (!yes.has(id)) no.add(id);
  }

  for (const group of EXCLUSIVE_GROUPS) {
    const present = group.filter(id => yes.has(id));
    if (present.length !== 1) continue;
    for (const id of group) if (!yes.has(id)) no.add(id);
  }

  // Intentionally do not infer animal/plant -> !object or place -> !object.
  // Those overlaps can be reasonable in ordinary language and must remain Unknown.
  for (const id of yes) no.delete(id);
  return [...no].sort();
}

export const SAFE_NEGATIVE_RULES = Object.freeze({ROOT_NEGATIVES,EXCLUSIVE_GROUPS});
