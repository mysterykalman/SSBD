export const ODD_ONE_IN_CHARACTERS = Object.freeze({
  1: Object.freeze({
    id: "owen",
    name: "Owen",
    difficulty: "Easy",
    relationship: "He’s with you.",
    core: "We’ll figure it out.",
    blurb: "Curious, enthusiastic, and very willing to form a theory before the evidence is ready.",
    initials: "O",
    accent: "orange",
    lines: Object.freeze({
      intro: "Okay. Sixteen words. Four groups. Let’s see what they’re hiding.",
      firstSelection: "Okay, I see something happening here.",
      correct: "Yes! Those four found each other.",
      correctAgain: "There we go. Four fewer suspects.",
      wrong: "Nope. I liked it, though.",
      wrongAlt: "Not it. Honestly, they looked convincing.",
      oneAway: "Three right! One of them has wandered into the wrong group.",
      severalFailed: "Okay. New plan. We have been staring at the same idea for a suspiciously long time.",
      twoLeft: "Eight words. This is where they start acting suspicious.",
      finalFour: "Last four. We know they belong together. Now we just have to figure out why.",
      win: "We got all four! I knew these words were up to something.",
      loss: "Okay, puzzle. You win. Show us what you were doing.",
      replay: "Again? I have several new theories and almost no evidence."
    })
  }),
  2: Object.freeze({
    id: "zoe",
    name: "Zoe",
    difficulty: "Medium",
    relationship: "She’s teasing you.",
    core: "The puzzle is trying something. Don’t make it easy for it.",
    blurb: "Quick, observant, and just sarcastic enough to be useful.",
    initials: "Z",
    accent: "teal",
    lines: Object.freeze({
      intro: "Four groups. Sixteen words. At least a few of them are definitely lying.",
      firstSelection: "Interesting. I don’t trust it yet.",
      correct: "Yep. Clean. Suspiciously clean.",
      correctAgain: "Good. Apparently they were telling the truth.",
      wrong: "Nope. I see why you picked it, though. Which is probably the problem.",
      wrongAlt: "Yeah. They wanted you to pick that.",
      oneAway: "Three right. One fraud.",
      severalFailed: "We’re circling the answer. Not elegantly, but technically circling.",
      twoLeft: "Eight left. Fewer places for them to hide.",
      finalFour: "Last four. Don’t just submit them. I want to know what their deal is.",
      win: "Nice. You successfully refused to be manipulated by sixteen words.",
      loss: "Fine. Puzzle wins. I respect it slightly less now.",
      replay: "Sure. Maybe this one will be less smug."
    })
  }),
  3: Object.freeze({
    id: "martin",
    name: "Martin",
    difficulty: "Hard",
    relationship: "He’s competing with you.",
    core: "Yes. That’s more or less what I had.",
    blurb: "Weekend-crossword confidence, plus a flexible relationship with the historical record.",
    initials: "M",
    accent: "coral",
    lines: Object.freeze({
      intro: "Let’s have a look. I usually get a sense for these fairly quickly.",
      firstSelection: "Yes. I can see the argument.",
      correct: "Yes. That’s the one I had.",
      correctAgain: "Exactly. We’re settling into it now.",
      wrong: "Interesting. I was considering that mostly as a test.",
      wrongAlt: "Not quite. I had some reservations.",
      oneAway: "One away. Good. The idea is sound. The execution needs attention.",
      severalFailed: "We may have become attached to an elegant theory with the minor flaw of being wrong.",
      twoLeft: "Eight remaining. This should become fairly manageable.",
      finalFour: "And there we are. The final four.",
      win: "Nicely done. I thought we handled that rather well.",
      loss: "I’d like to see the solution. Purely to assess the construction.",
      replay: "Certainly. I’d like another look at one."
    })
  }),
  4: Object.freeze({
    id: "braine",
    name: "Professor Braine",
    difficulty: "Very Hard",
    relationship: "He’s trying to make you better at this.",
    core: "You can solve this. Please stop wasting good reasoning on bad assumptions.",
    blurb: "Dry, precise, demanding, and quietly entertained by questionable decisions.",
    initials: "PB",
    accent: "purple",
    lines: Object.freeze({
      intro: "Four groups. Sixteen words. Try not to become emotionally attached to your first theory.",
      firstSelection: "An opening hypothesis. Let us see whether it survives contact with evidence.",
      correct: "Good. Evidence, reasoning, correct conclusion. A pleasant sequence.",
      correctAgain: "Correct. Your methodology appears to be recovering.",
      wrong: "A confident submission. We’ll quietly remove it from the academic record.",
      wrongAlt: "An interesting theory. Reality has declined to participate.",
      oneAway: "Three correct. One has joined the group under questionable credentials.",
      severalFailed: "We appear to be conducting the same experiment repeatedly and expecting a more cooperative result.",
      twoLeft: "Eight words. At this point, ambiguity is becoming considerably less defensible.",
      finalFour: "The last four are unavoidable. I’ll still require an explanation.",
      win: "Excellent. You were wrong in several productive ways.",
      loss: "Well, the puzzle has made its case. Let’s see where yours collapsed.",
      replay: "Certainly. Let’s see whether any of that learning was permanent."
    })
  })
});

export function oddOneInCharacter(tier) {
  return ODD_ONE_IN_CHARACTERS[tier] || ODD_ONE_IN_CHARACTERS[1];
}
