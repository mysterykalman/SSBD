import test from "node:test";
import assert from "node:assert/strict";
import {CONNECTION_FAMILIES, CONNECTION_GROUPS} from "../src/shared/connections/library.js";
import {CONNECTION_RECIPES, connectionGroupsCompatible, generateConnectionsGame, inspectConnectionsBoard} from "../src/shared/connections/generator.js";

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
