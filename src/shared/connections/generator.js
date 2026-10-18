import {CONNECTION_FAMILIES, CONNECTION_GROUPS} from "./library.js";

export const CONNECTION_RECIPES = Object.freeze({
  1: Object.freeze(["easy", "easy", "easy", "medium"]),
  2: Object.freeze(["easy", "easy", "medium", "hard"]),
  3: Object.freeze(["easy", "medium", "hard", "very_hard"]),
  4: Object.freeze(["medium", "hard", "very_hard", "very_hard"])
});

export const CONNECTION_TIER_NAMES = Object.freeze({1: "Easy", 2: "Medium", 3: "Hard", 4: "Very Hard"});
const NEAR_MISS_LIMITS = Object.freeze({1: 1, 2: 2, 3: 3, 4: 4});
const FAMILY_WORDS = new Map(CONNECTION_FAMILIES.map(family => [family.i, new Set(family.w)]));
const GROUPS_BY_DIFFICULTY = new Map();
for (const group of CONNECTION_GROUPS) {
  if (!GROUPS_BY_DIFFICULTY.has(group.difficulty)) GROUPS_BY_DIFFICULTY.set(group.difficulty, []);
  GROUPS_BY_DIFFICULTY.get(group.difficulty).push(group);
}


// A mechanic describes how a player discovers a link, not simply its subject.
// Semantic groups are split into setting, attribute and taxonomy so easy games
// do not feel like four interchangeable shopping lists.
export function connectionMechanic(group) {
  const theme = group.theme || "";
  const category = (group.category || "").toLowerCase();
  if (/anagram|hidden_word|letter_|heteronym|contronym|parts_of_speech|polysemy/.test(theme)) return "wordplay";
  if (/prefix|suffix|compound|dual_anchor|follow |precede |before |after /.test(theme + " " + category)) return "phrases";
  if (/silent|palindrome|rhym|letters|vowels|consonants|pronounc|spelled|spelling|word ending|word starting|words beginning|words containing|acronym/.test(category)) return "wordplay";
  if (/named after|named for|borrowed from|origin|both |shared by|also |second meaning|opposite meaning|same word|double meaning/.test(category)) return "lateral";
  if (/things (found|used|in|on|at)|found at|on a |in a |at a |equipment|supplies|tools|workplace|used for|used to/.test(category)) return "setting";
  if (/with |without |have |containing |red and|colours and|shapes and|forms of|types of teeth/.test(category)) return "attribute";
  if (/^(words meaning|words that mean|ways to|synonyms|meaning |terms for)/.test(category)) return "language";
  if (theme.startsWith("specialist") || theme === "cultural" || ["history", "literature", "fiction", "film", "television", "science", "mythology", "geography", "music", "arts"].includes(group.topic)) return "knowledge";
  return "taxonomy";
}

export function inspectConnectionsBalance(groups, tier) {
  const mechanics = groups.map(connectionMechanic);
  const counts = new Map();
  for (const mechanic of mechanics) counts.set(mechanic, (counts.get(mechanic) || 0) + 1);
  const distinct = counts.size;
  const largest = Math.max(0, ...counts.values());
  const minimum = tier === 1 ? 2 : 3;
  return Object.freeze({
    valid: distinct >= minimum && largest <= 2,
    mechanics: Object.freeze(mechanics),
    distinct,
    minimum,
    largest
  });
}

export function shuffleConnections(items, rng = Math.random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swap = Math.floor(rng() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled;
}

export function connectionGroupsCompatible(left, right) {
  if (!left || !right || left.familyId === right.familyId) return false;
  if (left.words.some(word => right.words.includes(word))) return false;

  const leftAnchors = left.anchors || [];
  const rightAnchors = right.anchors || [];
  if (leftAnchors.some(anchor => rightAnchors.includes(anchor))) return false;
  if (leftAnchors.some(anchor => right.words.includes(anchor))) return false;
  if (rightAnchors.some(anchor => left.words.includes(anchor))) return false;

  const leftFamily = FAMILY_WORDS.get(left.familyId);
  const rightFamily = FAMILY_WORDS.get(right.familyId);
  if (left.words.some(word => rightFamily?.has(word))) return false;
  if (right.words.some(word => leftFamily?.has(word))) return false;

  if (left.difficulty === "easy" && right.difficulty === "easy" && left.topic === right.topic) return false;
  if (left.difficulty === "very_hard" && right.difficulty === "very_hard" && left.theme === right.theme) return false;


  return true;
}

export function inspectConnectionsBoard(groups, tier) {
  const intendedFamilies = new Set(groups.map(group => group.familyId));
  const boardWords = new Set(groups.flatMap(group => group.words));
  const alternateGroups = [];
  const nearMisses = [];

  for (const family of CONNECTION_FAMILIES) {
    if (intendedFamilies.has(family.i)) continue;
    const matches = family.w.filter(word => boardWords.has(word));
    if (matches.length >= 4) alternateGroups.push({familyId: family.i, category: family.c, words: matches});
    else if (matches.length === 3) nearMisses.push({familyId: family.i, category: family.c, words: matches});
  }

  return Object.freeze({
    valid: alternateGroups.length === 0 && nearMisses.length <= NEAR_MISS_LIMITS[tier],
    alternateGroups: Object.freeze(alternateGroups),
    nearMisses: Object.freeze(nearMisses),
    nearMissLimit: NEAR_MISS_LIMITS[tier]
  });
}

export function generateConnectionsGame({tier = 1, recentFamilyIds = [], seenFamilyIds = [], usedSignatures = [], rng = Math.random, maxAttempts = 12000} = {}) {
  const recipe = CONNECTION_RECIPES[tier];
  if (!recipe) throw new Error(`Unknown Connections tier: ${tier}`);

  const recent = new Set(recentFamilyIds);
  const seen = new Set(seenFamilyIds);
  const used = new Set(usedSignatures);
  const pools = Object.fromEntries([...GROUPS_BY_DIFFICULTY].map(([difficulty, groups]) => [difficulty, shuffleConnections(groups, rng)]));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const chosen = [];

    for (const difficulty of recipe) {
      let candidates = pools[difficulty].filter(candidate => chosen.every(group => connectionGroupsCompatible(group, candidate)));
      const neverSeen = candidates.filter(candidate => !seen.has(candidate.familyId));
      const recentlyUnseen = candidates.filter(candidate => !recent.has(candidate.familyId));
      if (neverSeen.length) candidates = neverSeen;
      else if (recentlyUnseen.length) candidates = recentlyUnseen;
      if (!candidates.length) break;

      const balanced = candidates.filter(candidate => {
        const mechanics = [...chosen, candidate].map(connectionMechanic);
        const counts = new Map();
        for (const mechanic of mechanics) counts.set(mechanic, (counts.get(mechanic) || 0) + 1);
        return Math.max(...counts.values()) <= 2 && (chosen.length !== 3 || inspectConnectionsBalance([...chosen, candidate], tier).valid);
      });
      if (balanced.length) candidates = balanced;
      else if (chosen.length >= 2) break;
      const sampleSize = Math.min(candidates.length, 24);
      const candidate = candidates[Math.floor(rng() * sampleSize)];
      chosen.push(candidate);
    }

    if (chosen.length !== 4) continue;
    const signature = chosen.map(group => group.id).sort().join("|");
    if (used.has(signature)) continue;

    const qa = inspectConnectionsBoard(chosen, tier);
    const balance = inspectConnectionsBalance(chosen, tier);
    if (!qa.valid || !balance.valid) continue;

    return Object.freeze({
      tier,
      recipe,
      groups: Object.freeze(shuffleConnections(chosen, rng)),
      board: Object.freeze(shuffleConnections(chosen.flatMap(group => group.words), rng)),
      signature,
      balance,
      qa
    });
  }

  throw new Error(`Unable to generate a compatible Tier ${tier} Connections game.`);
}
