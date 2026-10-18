import {EASY_FAMILIES} from "./easy-families.js";
import {MEDIUM_FAMILIES} from "./medium-families.js";
import {HARD_FAMILIES} from "./hard-families.js";
import {VERY_HARD_FAMILIES} from "./very-hard-families.js";
import {EASY_EXPANSION} from "./easy-expansion.js";
import {MEDIUM_EXPANSION} from "./medium-expansion.js";
import {HARD_EXPANSION} from "./hard-expansion.js";
import {VERY_HARD_EXPANSION} from "./very-hard-expansion.js";

export const CONNECTION_FAMILIES = Object.freeze([
  ...EASY_FAMILIES,
  ...MEDIUM_FAMILIES,
  ...HARD_FAMILIES,
  ...VERY_HARD_FAMILIES,
  ...EASY_EXPANSION,
  ...MEDIUM_EXPANSION,
  ...HARD_EXPANSION,
  ...VERY_HARD_EXPANSION
]);

export const CONNECTION_TIER_COUNTS = Object.freeze({easy: 600, medium: 600, hard: 600, very_hard: 600});

export const CONNECTION_VARIANTS = Object.freeze([
  Object.freeze([0, 1, 2, 3]),
  Object.freeze([0, 1, 4, 5]),
  Object.freeze([2, 3, 4, 5]),
  Object.freeze([0, 2, 4, 5])
]);

export const CONNECTION_GROUPS = Object.freeze(CONNECTION_FAMILIES.flatMap(family =>
  CONNECTION_VARIANTS.map((indexes, index) => Object.freeze({
    id: `${family.i}-${index + 1}`,
    familyId: family.i,
    difficulty: family.d,
    category: family.c,
    theme: family.t,
    topic: family.p,
    anchors: Object.freeze([...(family.a || [])]),
    words: Object.freeze(indexes.map(wordIndex => family.w[wordIndex]))
  }))
));
