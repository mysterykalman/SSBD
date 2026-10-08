// Milo's branching narrative (Solo). Presentation only: nothing here reads or changes the bot's word,
// the scoring or the game state, and nothing is stored. Every beat is re-derived from the game's own
// revealed moves, so the same game always shows the same dialogue (a reload never changes it).
//
// Milo is youthful, playful, energetic and curious: easily excited, a little impatient, friendly.
// Not a coach, not constantly congratulating, never helping (he commits his word before seeing the
// player's, like Gary). Same structure and precedence as Gary's narrative (src/client/narrative.js):
// one paired BEFORE/AFTER beat per move from one branch, a POST-WIN line on wins and a FOLLOW-UP
// after a 20-move miss. Milo's normal win is moves 4–10 (late from 11), and he has one long-game
// branch (from move 10), no separate very-long one.
//
// The English copy is the approved script, word for word, except the lines that revealed the
// internal move cap (the game never mentions it), which were rewritten in the same voice.
// French is a faithful translation.

import {createNarrative, levelOf, trendOf} from "./narrative.js";

/** A beat's lines by language: [before, after, extra?]. Keys: `mn.${branch}.${pair}.${i}`. */
const SCRIPT = {
  opening: {
    a: {en: ["Okay, I picked one. I’ve been ready for this since, like, five minutes before we started.", "Oh! Completely different. Great. Now it gets interesting."],
      fr: ["OK, j’en ai choisi un. J’étais prêt depuis, genre, cinq minutes avant qu’on commence.", "Oh ! Complètement différent. Génial. Maintenant, ça devient intéressant."]},
    b: {en: ["I have a word. I changed my mind twice, which feels like a strong start.", "Okay, not even close. I kind of love that."],
      fr: ["J’ai un mot. J’ai changé d’avis deux fois, ce qui me semble être un bon départ.", "OK, même pas proche. J’adore un peu ça."]},
    c: {en: ["Ready. And no, I’m not changing it again.", "Different words. Fine. Now we have clues."],
      fr: ["Prêt. Et non, je ne le change plus.", "Des mots différents. Bon. Maintenant, on a des indices."]}
  },
  close: {
    a: {en: ["Wait. I think our brains are finally in the same room.", "NO. That was so close."],
      fr: ["Attends. Je crois que nos cerveaux sont enfin dans la même pièce.", "NON. C’était tellement proche."]},
    b: {en: ["Okay, okay. I think I know where you’re going.", "Almost! We were basically standing next to the same word."],
      fr: ["OK, OK. Je crois que je vois où tu vas.", "Presque ! On était pratiquement à côté du même mot."]},
    c: {en: ["Hang on. This feels really close.", "Ahhh! Same idea, wrong word."],
      fr: ["Attends. Là, ça a l’air vraiment proche.", "Ahhh ! Même idée, pas le même mot."]},
    d: {en: ["I have a really good feeling about this one.", "That was painfully close. Again."],
      fr: ["J’ai un très bon pressentiment pour celui-là.", "C’était douloureusement proche. Encore."]},
    e: {en: ["I think we’re circling it now.", "Yep. Definitely close. My brain is officially invested."],
      fr: ["Je crois qu’on tourne autour, maintenant.", "Ouais. Clairement proche. Mon cerveau est officiellement à fond dedans."]}
  },
  recovery: {
    a: {en: ["Okay, I think we found the road again.", "Yes. Better. Much less wandering."],
      fr: ["OK, je crois qu’on a retrouvé la route.", "Oui. Mieux. Beaucoup moins d’errance."]},
    b: {en: ["I have an idea that actually connects to what we were doing. Huge development.", "Okay! We’re back."],
      fr: ["J’ai une idée qui a vraiment un lien avec ce qu’on faisait. Énorme avancée.", "OK ! On est de retour."]},
    c: {en: ["New plan. Let’s pretend the last couple of rounds were research.", "See? Research."],
      fr: ["Nouveau plan. On fait comme si les derniers tours étaient de la recherche.", "Tu vois ? De la recherche."]},
    d: {en: ["Wait, I think this makes sense again.", "Much better. I was starting to wonder."],
      fr: ["Attends, je crois que ça a de nouveau du sens.", "Beaucoup mieux. Je commençais à me poser des questions."]}
  },
  improving: {
    a: {en: ["I think we’re getting closer. Don’t do anything unpredictable.", "Yep. Closer."],
      fr: ["Je crois qu’on se rapproche. Ne fais rien d’imprévisible.", "Ouais. Plus près."]},
    b: {en: ["Oh, I think I see the path now.", "Okay, that definitely moved us in the right direction."],
      fr: ["Oh, je crois que je vois le chemin, maintenant.", "OK, ça nous a clairement emmenés dans la bonne direction."]},
    c: {en: ["I have one. And for once I feel weirdly confident.", "That worked! Not enough, but still."],
      fr: ["J’en ai un. Et pour une fois, je me sens bizarrement sûr de moi.", "Ça a marché ! Pas assez, mais quand même."]},
    d: {en: ["Wait. I think I’m starting to understand how your brain works.", "Yep. That was more like it."],
      fr: ["Attends. Je crois que je commence à comprendre comment marche ton cerveau.", "Ouais. Là, c’était plus ça."]},
    e: {en: ["I think we’re actually narrowing this down.", "Closer again. This is getting suspicious."],
      fr: ["Je crois qu’on est vraiment en train de cerner le truc.", "Encore plus près. Ça devient louche."]}
  },
  drifting: {
    a: {en: ["I think we somehow got farther apart. That feels rude.", "Yeah. We definitely took different roads there."],
      fr: ["Je crois qu’on s’est éloignés, je ne sais pas comment. C’est un peu malpoli.", "Ouais. On a clairement pris des routes différentes, là."]},
    b: {en: ["Okay, I may have lost the plot a little.", "Nope. That did not find the plot."],
      fr: ["OK, j’ai peut-être un peu perdu le fil.", "Non. Ça n’a pas retrouvé le fil."]},
    c: {en: ["I have another idea. I’m less confident than I was ten seconds ago.", "Okay. Maybe not that direction."],
      fr: ["J’ai une autre idée. Je suis moins sûr de moi qu’il y a dix secondes.", "OK. Peut-être pas dans cette direction."]},
    d: {en: ["I think our brains just missed an exit.", "Yep. We’re off the highway."],
      fr: ["Je crois que nos cerveaux viennent de rater une sortie.", "Ouais. On a quitté l’autoroute."]},
    e: {en: ["New attempt. We’re going to pretend that last one was intentional.", "It was not."],
      fr: ["Nouvel essai. On va faire comme si le dernier était voulu.", "Il ne l’était pas."]}
  },
  stuck: {
    a: {en: ["We have tried several things now. Statistically, one of them should have helped.", "Apparently statistics are taking the day off."],
      fr: ["On a essayé plusieurs trucs, maintenant. Statistiquement, l’un d’eux aurait dû aider.", "Apparemment, les statistiques ont pris leur journée."]},
    b: {en: ["I’m running out of ways to say 'I have an idea.'", "Good news: I’ll need another one."],
      fr: ["Je commence à manquer de façons de dire « j’ai une idée ».", "Bonne nouvelle : il va m’en falloir une autre."]},
    c: {en: ["We are extremely committed to almost understanding each other.", "Still committed."],
      fr: ["On est extrêmement déterminés à presque se comprendre.", "Toujours déterminés."]},
    d: {en: ["Okay. One of these rounds has to suddenly make us look smart.", "Not that one."],
      fr: ["OK. Un de ces tours va forcément nous faire passer pour des génies d’un coup.", "Pas celui-là."]},
    e: {en: ["I feel like the answer is hiding from us now.", "Still hiding."],
      fr: ["J’ai l’impression que la réponse se cache de nous, maintenant.", "Elle se cache toujours."]}
  },
  strange: {
    a: {en: ["Okay, I have mine. Please prepare to explain yours if necessary.", "Ohhh. Okay. That actually took me a second."],
      fr: ["OK, j’ai le mien. Prépare-toi à expliquer le tien si nécessaire.", "Ohhh. OK. Il m’a fallu une seconde, là."]},
    b: {en: ["I’m committing to this before I talk myself out of it.", "That is absolutely not where my brain went."],
      fr: ["Je m’engage sur celui-là avant de me convaincre du contraire.", "Ce n’est absolument pas là que mon cerveau est allé."]},
    c: {en: ["I feel normal about my answer. We’ll see how long that lasts.", "Huh. I can see it. Eventually."],
      fr: ["Je me sens normal à propos de ma réponse. On verra combien de temps ça dure.", "Hein. Je vois le lien. Au bout d’un moment."]},
    d: {en: ["Ready. Let’s see how strange this gets.", "Pretty strange. Not bad, though."],
      fr: ["Prêt. Voyons à quel point ça devient étrange.", "Assez étrange. Pas mal, cela dit."]},
    e: {en: ["I have mine.", "Okay, hear me out: I kind of like yours."],
      fr: ["J’ai le mien.", "OK, écoute-moi bien : j’aime un peu le tien."]}
  },
  strong: {
    a: {en: ["Okay. This one feels good.", "Oh, that connects really well."],
      fr: ["OK. Celui-là, je le sens bien.", "Oh, ça se relie vraiment bien."]},
    b: {en: ["I think this is a pretty good one.", "Wait, that was a good one too."],
      fr: ["Je crois que celui-là est plutôt bon.", "Attends, le tien aussi était bon."]},
    c: {en: ["I have something that feels almost obvious.", "Yep. Same kind of thought."],
      fr: ["J’ai quelque chose qui paraît presque évident.", "Ouais. Le même genre d’idée."]},
    d: {en: ["Okay, I’m feeling weirdly confident.", "That was annoyingly sensible."],
      fr: ["OK, je me sens bizarrement sûr de moi.", "C’était d’un bon sens agaçant."]},
    e: {en: ["This one makes sense in my head. Always dangerous.", "Okay! That worked."],
      fr: ["Celui-là a du sens dans ma tête. Toujours dangereux.", "OK ! Ça a marché."]}
  },
  good: {
    a: {en: ["I have something. Let’s see.", "Yeah! I can see that."],
      fr: ["J’ai quelque chose. Voyons voir.", "Ouais ! Je vois le lien."]},
    b: {en: ["Okay, mine’s locked.", "Different, but I get it."],
      fr: ["OK, le mien est verrouillé.", "Différent, mais je comprends."]},
    c: {en: ["I think this makes sense.", "Yep. Same neighbourhood."],
      fr: ["Je crois que ça a du sens.", "Ouais. Même quartier."]},
    d: {en: ["I’ve got one.", "Okay, I can follow that."],
      fr: ["J’en ai un.", "OK, je peux suivre."]},
    e: {en: ["This feels reasonable.", "Not the same, but definitely connected."],
      fr: ["Ça me paraît raisonnable.", "Pas pareil, mais clairement lié."]}
  },
  weak: {
    a: {en: ["I have an answer. I’m not deeply attached to it.", "Yeah. We were thinking about very different things."],
      fr: ["J’ai une réponse. Je n’y suis pas très attaché.", "Ouais. On pensait à des choses très différentes."]},
    b: {en: ["Okay, this one might be a stretch.", "Yep. Stretch confirmed."],
      fr: ["OK, celui-là est peut-être un peu tiré par les cheveux.", "Ouais. Tiré par les cheveux, c’est confirmé."]},
    c: {en: ["I picked something. That is all I’m promising.", "Not close. We try again."],
      fr: ["J’ai choisi quelque chose. C’est tout ce que je promets.", "Pas proche. On réessaie."]},
    d: {en: ["I’m slightly worried about mine.", "Reasonable concern."],
      fr: ["Je m’inquiète un peu pour le mien.", "Inquiétude raisonnable."]},
    e: {en: ["Okay. Let’s just see what happens.", "Different directions. That happens."],
      fr: ["OK. Voyons juste ce qui se passe.", "Des directions différentes. Ça arrive."]}
  },
  veryWeak: {
    a: {en: ["I honestly have no idea if this helps.", "It did not."],
      fr: ["Honnêtement, je ne sais pas du tout si ça aide.", "Ça n’a pas aidé."]},
    b: {en: ["This one felt better before I locked it in.", "Yeah. I see the problem now."],
      fr: ["Celui-là me paraissait mieux avant que je le verrouille.", "Ouais. Je vois le souci, maintenant."]},
    c: {en: ["I have a word. I would like everyone to keep expectations low.", "Excellent decision."],
      fr: ["J’ai un mot. J’aimerais que tout le monde garde des attentes modestes.", "Excellente décision."]},
    d: {en: ["I’m trying something.", "We have learned not to try that."],
      fr: ["J’essaie un truc.", "On a appris à ne pas essayer ça."]},
    e: {en: ["This could go either way.", "It went the other way."],
      fr: ["Ça peut aller dans un sens comme dans l’autre.", "C’est allé dans l’autre sens."]}
  },
  normal: {
    a: {en: ["Okay, I’ve got one.", "Different again. Keep going."],
      fr: ["OK, j’en ai un.", "Encore différent. On continue."]},
    b: {en: ["Ready.", "Nope. Next clue."],
      fr: ["Prêt.", "Non. Indice suivant."]},
    c: {en: ["I have mine. Let’s see yours.", "Different. Interesting."],
      fr: ["J’ai le mien. Voyons le tien.", "Différent. Intéressant."]},
    d: {en: ["Locked.", "Not it. Again."],
      fr: ["Verrouillé.", "Pas ça. Encore."]},
    e: {en: ["Okay. Reveal time.", "Still different. We’ve got more to work with now."],
      fr: ["OK. C’est l’heure de la révélation.", "Toujours différent. On a plus de matière, maintenant."]}
  },
  long: {
    a: {en: ["Okay, we have been doing this for a while now.", "Still going. I respect the commitment."],
      fr: ["OK, ça fait un moment qu’on fait ça, maintenant.", "On continue. Je respecte la détermination."]},
    b: {en: ["I’m pretty sure this was supposed to be easier.", "Apparently not."],
      fr: ["Je suis à peu près sûr que c’était censé être plus facile.", "Apparemment, non."]},
    c: {en: ["We’ve come too far to suddenly start making sense.", "See? Consistency."],
      fr: ["On est allés trop loin pour commencer à avoir du sens d’un coup.", "Tu vois ? De la constance."]},
    d: {en: ["I really want to know where this ends now.", "Not there."],
      fr: ["Maintenant, je veux vraiment savoir où ça se termine.", "Pas là."]},
    e: {en: ["At this point I’m refusing to stop on principle.", "Again."],
      fr: ["À ce stade, je refuse d’arrêter par principe.", "Encore."]}
  },
  fastWin: {
    a: {en: ["Wait. I have a really good feeling about this.", "YES! Already?!", "Okay, we might actually be good at this."],
      fr: ["Attends. J’ai un très bon pressentiment.", "OUI ! Déjà ?!", "OK, on est peut-être vraiment doués pour ça."]},
    b: {en: ["Okay, this feels suspiciously easy.", "WE GOT IT.", "That was ridiculously fast."],
      fr: ["OK, ça paraît étrangement facile.", "ON L’A.", "C’était ridiculement rapide."]},
    c: {en: ["I think this might be it.", "YES!", "I was absolutely prepared for that to take longer."],
      fr: ["Je crois que ça pourrait être ça.", "OUI !", "J’étais complètement prêt à ce que ça prenne plus longtemps."]}
  },
  normalWin: {
    a: {en: ["Wait. I think this might actually be it.", "YES! We got it!", "Okay, that was really satisfying."],
      fr: ["Attends. Je crois que ça pourrait vraiment être ça.", "OUI ! On l’a !", "OK, c’était vraiment satisfaisant."]},
    b: {en: ["Okay. I think I know what you’re thinking.", "THAT’S IT!", "I knew we were getting closer."],
      fr: ["OK. Je crois que je sais à quoi tu penses.", "C’EST ÇA !", "Je savais qu’on se rapprochait."]},
    c: {en: ["I have a good feeling about this.", "YES!", "Okay. Again. Immediately."],
      fr: ["J’ai un bon pressentiment.", "OUI !", "OK. Encore. Tout de suite."]},
    d: {en: ["Wait. Don’t say anything.", "WE GOT IT.", "That was so good."],
      fr: ["Attends. Ne dis rien.", "ON L’A.", "C’était trop bien."]},
    e: {en: ["I think our brains are finally doing the same thing.", "YES!", "See? Eventually they cooperate."],
      fr: ["Je crois que nos cerveaux font enfin la même chose.", "OUI !", "Tu vois ? Ils finissent par coopérer."]}
  },
  lateWin: {
    a: {en: ["Wait. I really think this is it.", "FINALLY! We got it!", "Okay, that was worth it."],
      fr: ["Attends. Je crois vraiment que c’est ça.", "ENFIN ! On l’a !", "OK, ça valait le coup."]},
    b: {en: ["I swear if this isn’t it...", "YES!", "Thank you. I needed that."],
      fr: ["Je te jure, si ce n’est pas ça...", "OUI !", "Merci. J’en avais besoin."]},
    c: {en: ["Okay. I think we actually have it.", "WE GOT IT.", "I was starting to take this personally."],
      fr: ["OK. Je crois qu’on l’a vraiment.", "ON L’A.", "Je commençais à le prendre personnellement."]},
    d: {en: ["This has to be it.", "YES!", "Okay. I can relax now."],
      fr: ["Ça doit être ça.", "OUI !", "OK. Je peux me détendre, maintenant."]}
  },
  veryLateWin: {
    a: {en: ["Please be it. Please be it. Please be it.", "YES!", "FINALLY."],
      fr: ["Pourvu que ce soit ça. Pourvu que ce soit ça. Pourvu que ce soit ça.", "OUI !", "ENFIN."]},
    b: {en: ["I refuse to believe we can miss again.", "WE GOT IT.", "Okay. That took years off my life."],
      fr: ["Je refuse de croire qu’on puisse encore rater.", "ON L’A.", "OK. Ça m’a coûté des années de vie."]},
    c: {en: ["Okay. I’m emotionally involved now.", "YES!", "Worth it."],
      fr: ["OK. Je suis émotionnellement impliqué, maintenant.", "OUI !", "Ça valait le coup."]},
    d: {en: ["I think this is it. I need this to be it.", "FINALLY!", "Okay. That was ridiculous. Again?"],
      fr: ["Je crois que c’est ça. J’ai besoin que ce soit ça.", "ENFIN !", "OK. C’était ridicule. On recommence ?"]}
  },
  exhausted: {
    a: {en: ["Okay. Here goes.", "Nooo.", "Our brains really refused to cooperate on that one. Honestly, kind of impressive."],
      fr: ["OK. C’est parti.", "Nooon.", "Nos cerveaux n’ont vraiment pas voulu coopérer sur celle-là. Honnêtement, c’est presque impressionnant."]},
    b: {en: ["Okay. I have a really specific feeling about this.", "Not it.", "Okay. That one got away. But in a very committed way."],
      fr: ["OK. J’ai un pressentiment très précis.", "Pas ça.", "OK. Celle-là nous a échappé. Mais d’une manière très déterminée."]},
    c: {en: ["Okay. Please do something useful, brain.", "Nope.", "I still want another round."],
      fr: ["OK. S’il te plaît, fais quelque chose d’utile, cerveau.", "Non.", "Je veux quand même une autre manche."]}
  }
};

/** Milo's one-off lines: a repeated word, an accepted spelling correction, a long think, a rematch. */
const LINES = {
  alreadyUsed: {en: ["We used that one already! Pick another.", "Already played. My memory works sometimes.", "That one’s taken. Try another."],
    fr: ["On l’a déjà utilisé ! Choisis-en un autre.", "Déjà joué. Ma mémoire marche, parfois.", "Celui-là est pris. Essaie un autre."]},
  typo: {en: ["Ohhh, okay. That makes sense.", "Yep. That’s the one I thought you meant.", "Got it."],
    fr: ["Ohhh, OK. Ça a du sens.", "Ouais. C’est celui que je pensais que tu voulais dire.", "Compris."]},
  waiting: {en: ["No rush. I’m still thinking about everything we’ve already said.", "I’m ready whenever you are.", "Take your time. I already picked mine.", "I am being extremely patient right now."],
    fr: ["Pas de presse. Je repense encore à tout ce qu’on a déjà dit.", "Je suis prêt quand tu veux.", "Prends ton temps. J’ai déjà choisi le mien.", "Je suis extrêmement patient, là."]},
  rematch: {en: ["Again? Yes.", "Okay, round two.", "Absolutely. I’m ready.", "Again. I think we can do better."],
    fr: ["Encore ? Oui.", "OK, deuxième manche.", "Carrément. Je suis prêt.", "Encore. Je crois qu’on peut faire mieux."]}
};

const milo = createNarrative({
  prefix: "mn",
  script: SCRIPT,
  lines: LINES,
  // Joke concepts: two pairs leaning on the same one are not clustered (a fresh pair is preferred).
  concepts: {
    research: /\bresearch\b/i, statistics: /statistic/i, road: /\broad|highway|\bexit\b/i, plot: /\bplot\b/i,
    committed: /commit/i, hiding: /\bhiding\b/i, confident: /confident/i
  },
  // Wins: fast on moves 2–3, normal 4–10, late 11–16, very late 17–20. One long-game branch from move 10.
  wins: {fast: 3, normal: 10, late: 16},
  long: {from: 10, veryLongFrom: null}
});

export const MILO_BRANCHES = milo.BRANCHES;
/** i18n keys for every Milo narrative line: `mn.${branch}.${pair}.${0|1|2}` and `mn.${kind}.${index}`. */
export const MILO_NARRATIVE_STRINGS = milo.STRINGS;
/** Milo's beat for every revealed move of a game, in order (see createNarrative in narrative.js). */
export const miloBeats = milo.beats;
export const MILO_NARRATIVE = milo;
export {levelOf, trendOf};
