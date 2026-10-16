export const ODD_ONE_IN_CHARACTERS = Object.freeze({
  1: Object.freeze({
    tier: 1,
    id: "owen",
    name: "Owen",
    shortName: "OWEN",
    difficulty: "Easy",
    relationship: "Already has an idea.",
    state: "Already has a theory.",
    core: "We’ll figure it out.",
    picker: "It’s probably one of the words.",
    image: "/odd-one-in/owen.png",
    accent: "orange",
    lines: Object.freeze({
      intro: "Okay. Sixteen words. Four groups. Let’s see what they’re hiding.",
      observation: "Nothing suspicious here. Obviously.",
      firstSelection: "Okay, I see something happening here.",
      fourSelected: "That’s four. Want to see if they belong together?",
      wrong: "Hmm. Not quite, but I can see the idea.",
      oneAway: "Ooh, close. One of those doesn’t belong.",
      severalFailed: "Okay. New plan. We have been staring at the same idea for a suspiciously long time.",
      correct1: "Nice! Those clearly belong together.",
      correct2: "Two down. This is starting to look less impossible.",
      correct3: "Three groups! We’ve basically cornered the last four.",
      twoGroups: "Eight words. This is where they start acting suspicious.",
      finalFour: "Well. These four have nowhere left to hide.",
      win: "We did it! That was a real puzzle and now it is a former puzzle.",
      loss: "Okay, puzzle. You win. Show us what you were doing.",
      replay: "Again? I have several new theories and almost no evidence."
    })
  }),
  2: Object.freeze({
    tier: 2,
    id: "zoe",
    name: "Zoe",
    shortName: "ZOE",
    difficulty: "Medium",
    relationship: "Can spot a trap from across the room.",
    state: "Currently suspicious of everything.",
    core: "The puzzle is trying something. Don’t make it easy for it.",
    picker: "Usually after saying, “Wait…”",
    image: "/odd-one-in/zoe.png",
    accent: "teal",
    lines: Object.freeze({
      intro: "Four groups. Sixteen words. At least a few of them are definitely lying.",
      observation: "The puzzle is trying something. I can feel it.",
      firstSelection: "Interesting. I don’t trust it yet.",
      fourSelected: "Okayyy. You seem very sure about these.",
      wrong: "Interesting theory. The puzzle disagrees.",
      oneAway: "Oh, rude. One of those is wrong.",
      severalFailed: "We’re circling the answer. Not elegantly, but technically circling.",
      correct1: "Yep. Knew those four were hanging out together.",
      correct2: "Two down. The rest are getting nervous.",
      correct3: "Three groups. Now the last four have nowhere to hide.",
      twoGroups: "Eight words. This is where they start acting suspicious.",
      finalFour: "Last four. I still don’t trust them.",
      win: "Fine. You’re annoyingly good at this.",
      loss: "Fine. Puzzle wins. I respect it slightly less now.",
      replay: "Sure. Maybe this one will be less smug."
    })
  }),
  3: Object.freeze({
    tier: 3,
    id: "martin",
    name: "Martin",
    shortName: "MARTIN",
    difficulty: "Hard",
    relationship: "Does the weekend crossword.",
    state: "Has seen puzzles before. He’ll mention it.",
    core: "Yes. That’s more or less what I had.",
    picker: "Has been waiting all week for this.",
    image: "/odd-one-in/martin.png",
    accent: "coral",
    lines: Object.freeze({
      intro: "Let’s have a look. I usually get a sense for these fairly quickly.",
      observation: "There’s usually one obvious trap. Usually.",
      firstSelection: "Yes. I can see the argument.",
      fourSelected: "Four words. Bold. Let’s see if they deserve the confidence.",
      wrong: "Interesting. Not where I would have gone, obviously.",
      oneAway: "One away. Good. The idea is sound. The execution needs attention.",
      severalFailed: "We may have become attached to an elegant theory with the minor flaw of being wrong.",
      correct1: "Good. That was more or less what I was thinking.",
      correct2: "Two groups down. Nice pace.",
      correct3: "Three groups. We’ve reduced this to the formalities.",
      twoGroups: "Eight remaining. This should become fairly manageable.",
      finalFour: "And there we are. The final four.",
      win: "Nicely done. Almost exactly how I would have solved it.",
      loss: "I’d like to see the solution. Purely to assess the construction.",
      replay: "Certainly. I’d like another look at one."
    })
  }),
  4: Object.freeze({
    tier: 4,
    id: "braine",
    name: "Professor Braine",
    shortName: "PROF. BRAINE",
    difficulty: "Very Hard",
    relationship: "Believes mistakes are educational.",
    state: "Your reasoning is under observation.",
    core: "You can solve this. Stop wasting good reasoning on bad assumptions.",
    picker: "Conveniently, there may be several.",
    image: "/odd-one-in/professor-braine.png",
    accent: "purple",
    lines: Object.freeze({
      intro: "Four groups. Sixteen words. Try not to become emotionally attached to your first theory.",
      observation: "Observe first. Commit later. A radical system, I know.",
      firstSelection: "An opening hypothesis. Let us see whether it survives contact with evidence.",
      fourSelected: "A hypothesis. Excellent. Now we test it.",
      wrong: "An instructive failure.",
      oneAway: "Three convincing words and one saboteur. Reconsider.",
      severalFailed: "We appear to be conducting the same experiment repeatedly and expecting a more cooperative result.",
      correct1: "Good. A defensible conclusion.",
      correct2: "Two groups resolved. Your methodology appears to be recovering.",
      correct3: "Three groups. At this point, the remaining ambiguity is largely ceremonial.",
      twoGroups: "Eight words remain. Reduce assumptions.",
      finalFour: "The last four are unavoidable. I’ll still require an explanation.",
      win: "Excellent. I had only prepared three corrective lectures.",
      loss: "Well, the puzzle has made its case. Let’s see where yours collapsed.",
      replay: "Certainly. Let’s see whether any of that learning was permanent."
    })
  })
});

export function oddOneInCharacter(tier) {
  return ODD_ONE_IN_CHARACTERS[tier] || ODD_ONE_IN_CHARACTERS[1];
}

export function oddOneInLine(characterId, event) {
  const character = Object.values(ODD_ONE_IN_CHARACTERS).find(item => item.id === characterId) || ODD_ONE_IN_CHARACTERS[1];
  return character.lines[event] || character.lines.intro;
}
