import test from "node:test";
import assert from "node:assert/strict";
import {CONNECTION_FAMILIES, CONNECTION_GROUPS} from "../src/shared/connections/library.js";
import {CONNECTION_RECIPES, connectionGroupsCompatible, generateConnectionsGame, inspectConnectionsBoard} from "../src/shared/connections/generator.js";
import {ODD_ONE_IN_CHARACTERS} from "../src/client/connections/characters.js";

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

test("connections library has 600 families and 2400 reusable groups", () => {
  assert.equal(CONNECTION_FAMILIES.length, 600);
  assert.equal(CONNECTION_GROUPS.length, 2400);
  const counts = Object.groupBy(CONNECTION_GROUPS, group => group.difficulty);
  assert.equal(counts.easy.length, 600);
  assert.equal(counts.medium.length, 600);
  assert.equal(counts.hard.length, 600);
  assert.equal(counts.very_hard.length, 600);
  assert.equal(new Set(CONNECTION_GROUPS.map(group => group.id)).size, 2400);
  assert.equal(new Set(CONNECTION_GROUPS.map(group => [...group.words].sort().join("|"))).size, 2400);
  assert.equal(new Set(CONNECTION_FAMILIES.map(family => family.i)).size, 600);
  assert.ok(new Set(CONNECTION_FAMILIES.map(family => family.category)).size > 500);
  assert.ok(new Set(CONNECTION_FAMILIES.map(family => family.p)).size >= 15);
});

test("every reusable group contains four unique words", () => {
  for (const group of CONNECTION_GROUPS) {
    assert.equal(group.words.length, 4, group.id);
    assert.equal(new Set(group.words).size, 4, group.id);
  }
});

test("generated games respect tier recipes and board QA", () => {
  for (let tier = 1; tier <= 4; tier++) {
    const used = [];
    const recent = [];
    for (let index = 0; index < 50; index++) {
      const game = generateConnectionsGame({tier, usedSignatures: used, recentFamilyIds: recent, seenFamilyIds: recent, rng: seeded(tier * 10000 + index)});
      assert.deepEqual(game.recipe, CONNECTION_RECIPES[tier]);
      assert.equal(game.groups.length, 4);
      assert.equal(game.board.length, 16);
      assert.equal(new Set(game.board).size, 16);
      assert.equal(game.qa.valid, true);
      assert.equal(game.qa.alternateGroups.length, 0);
      assert.deepEqual(game.groups.map(group => group.difficulty).sort(), [...CONNECTION_RECIPES[tier]].sort());
      for (let left = 0; left < game.groups.length; left++) {
        for (let right = left + 1; right < game.groups.length; right++) {
          assert.equal(connectionGroupsCompatible(game.groups[left], game.groups[right]), true);
        }
      }
      const inspected = inspectConnectionsBoard(game.groups, tier);
      assert.equal(inspected.valid, true);
      used.push(game.signature);
      recent.push(...game.groups.map(group => group.familyId));
      if (recent.length > 32) recent.splice(0, recent.length - 32);
    }
    assert.equal(new Set(used).size, 50);
  }
});


test("new puzzles avoid previously played families while unused families are available", () => {
  for (const tier of [1, 2, 3, 4]) {
    const seen = [];
    const signatures = [];
    for (let round = 0; round < 35; round++) {
      const puzzle = generateConnectionsGame({
        tier,
        recentFamilyIds: seen.slice(-48),
        seenFamilyIds: seen,
        usedSignatures: signatures,
        rng: seeded(tier * 1000 + round)
      });
      for (const group of puzzle.groups) {
        assert.ok(!seen.includes(group.familyId), `Repeated family ${group.familyId} on tier ${tier} game ${round}`);
        seen.push(group.familyId);
      }
      signatures.push(puzzle.signature);
    }
  }
});

test("the very hard character is Dr. Jones", () => {
  assert.equal(ODD_ONE_IN_CHARACTERS[4].name, "Dr. Jones");
  assert.equal(ODD_ONE_IN_CHARACTERS[4].shortName, "DR. JONES");
  assert.equal(ODD_ONE_IN_CHARACTERS[4].id, "jones");
});
