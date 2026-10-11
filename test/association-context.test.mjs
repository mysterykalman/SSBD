import test from "node:test";
import assert from "node:assert/strict";

import {associationContextScore, buildAssociationContext, describeAssociation, isDirectAssociationKind} from "../src/shared/association-context.js";
import {getLexicon} from "../src/shared/lexicon/index.js";

const lex = getLexicon("en");

test("describes direct curated and graph associations", () => {
  const beach = lex.resolve("beach"), sand = lex.resolve("sand"), dog = lex.resolve("dog");
  assert.ok(beach && sand && dog);
  const beachSand = describeAssociation(lex, beach, sand);
  assert.ok(beachSand.strength >= 0.7);
  assert.equal(isDirectAssociationKind(beachSand.kind), true);
  assert.equal(describeAssociation(lex, dog, dog).kind, "same");
});

test("rolling context preserves recent semantic direction", () => {
  const context = buildAssociationContext({
    lex,
    history: [
      {a: "beach", b: "sand"},
      {a: "glass", b: "window"}
    ],
    pair: ["window", "house"]
  });
  assert.ok(context.recentWords.includes("beach"));
  assert.ok(context.recentWords.includes("house"));
  assert.ok(context.recentIds.length >= 5);
  assert.ok(context.dominantTags.length > 0);
  assert.ok(context.relationshipTypes.length > 0);
});

test("a contextually coherent candidate scores above an unrelated one", () => {
  const context = buildAssociationContext({lex, history: [{a: "dog", b: "cat"}], pair: ["pet", "home"]});
  const animal = lex.concepts.get(lex.resolve("animal"));
  const rocket = lex.concepts.get(lex.resolve("rocket"));
  assert.ok(animal && rocket);
  assert.ok(associationContextScore(lex, animal, context) > associationContextScore(lex, rocket, context));
});

test("future Mom traits plug into the same scoring interface", () => {
  const fake = {
    concepts: new Map([
      ["sand", {id: "sand", tags: ["beach"], kinds: new Map(), links: new Set(["glass"]), phrases: new Set(), near: new Set(["glass"]), out: new Map(), semanticTraits: ["material", "granular"]}],
      ["glass", {id: "glass", tags: ["home"], kinds: new Map(), links: new Set(["sand", "window"]), phrases: new Set(), near: new Set(["sand", "window"]), out: new Map(), semanticTraits: ["material", "transparent"]}],
      ["window", {id: "window", tags: ["home"], kinds: new Map(), links: new Set(["glass"]), phrases: new Set(), near: new Set(["glass"]), out: new Map(), semanticTraits: ["transparent", "building_part"]}],
      ["banana", {id: "banana", tags: ["food"], kinds: new Map(), links: new Set(), phrases: new Set(), near: new Set(), out: new Map(), semanticTraits: ["fruit", "yellow"]}]
    ])
  };
  const context = {
    recentWords: ["sand", "glass"], recentIds: ["sand", "glass"], dominantTags: [["home", 1]], dominantCategories: [],
    dominantTraits: [["material", 2], ["transparent", 1]], relationshipTypes: [["link", 1]], unresolved: 0
  };
  assert.ok(associationContextScore(fake, fake.concepts.get("window"), context) > associationContextScore(fake, fake.concepts.get("banana"), context));
});
