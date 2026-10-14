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
// Milo is the kid who has been in school all day and wants to play right now: kinetic, impatient,
// teasing but never mean. The English copy is the approved script, word for word. French is a
// faithful translation.

import {createNarrative, levelOf, trendOf} from "./narrative.js";

/** A beat's lines by language: [before, after, extra?]. Keys: `mn.${branch}.${pair}.${i}`. */
const SCRIPT = {
  opening: {
    a: {en: ["Okay, I picked one. Hurry up.", "Oh! Completely different. Good. Now we have something to chase."],
      fr: ["OK, j’en ai choisi un. Dépêche-toi.", "Oh ! Complètement différent. Tant mieux. Maintenant, on a quelque chose à poursuivre."]},
    b: {en: ["Got mine. Your turn. Come onnn.", "Wow. We did not go the same way at all."],
      fr: ["J’ai le mien. À toi. Allez, quoiii.", "Wow. On n’est pas du tout partis du même côté."]},
    c: {en: ["Ready. Been ready. Still ready.", "Different words. Fine. Race you to the next one."],
      fr: ["Prêt. Déjà prêt. Toujours prêt.", "Des mots différents. Bon. Le premier au prochain a gagné."]}
  },
  close: {
    a: {en: ["Wait. I think I know where you’re going.", "NO. We were right there."],
      fr: ["Attends. Je crois que je vois où tu vas.", "NON. On y était presque."]},
    b: {en: ["Okay, don’t mess this up. I think we’re close.", "Ahhh! Same idea. Wrong word."],
      fr: ["OK, ne gâche pas tout. Je crois qu’on est proches.", "Ahhh ! Même idée. Pas le bon mot."]},
    c: {en: ["I think our brains finally caught up to each other.", "Almost! Again. Again."],
      fr: ["Je crois que nos cerveaux se sont enfin rattrapés.", "Presque ! Encore. Encore."]},
    d: {en: ["Oh, this one feels good.", "That was SO close."],
      fr: ["Oh, celui-là, je le sens bien.", "C’était TELLEMENT proche."]},
    e: {en: ["We’re right there. I can feel it.", "Yep. Close. Don’t slow down now."],
      fr: ["On y est presque. Je le sens.", "Ouais. Proche. Ralentis pas maintenant."]}
  },
  recovery: {
    a: {en: ["Okay. We got lost for a second. I found us.", "Yes! Back on track."],
      fr: ["OK. On s’est perdus une seconde. Je nous ai retrouvés.", "Oui ! On est repartis."]},
    b: {en: ["New plan. Follow me.", "See? Much better."],
      fr: ["Nouveau plan. Suis-moi.", "Tu vois ? Beaucoup mieux."]},
    c: {en: ["I know where we went wrong. Probably.", "Okay! We’re moving again."],
      fr: ["Je sais où on s’est trompés. Sans doute.", "OK ! On avance de nouveau."]},
    d: {en: ["Wait, wait. I’ve got it now.", "Better. Way better."],
      fr: ["Attends, attends. Là, je l’ai.", "Mieux. Bien mieux."]}
  },
  improving: {
    a: {en: ["We’re getting closer. Keep up.", "Yep. Closer."],
      fr: ["On se rapproche. Suis le rythme.", "Ouais. Plus près."]},
    b: {en: ["Oh! I see it. Go, go, go.", "Okay, that actually worked."],
      fr: ["Oh ! Je le vois. Vas-y, vas-y, vas-y.", "OK, ça a vraiment marché."]},
    c: {en: ["Got one. Don’t overthink yours.", "Yes! Not there yet, but yes."],
      fr: ["J’en ai un. Réfléchis pas trop pour le tien.", "Oui ! Pas encore, mais oui."]},
    d: {en: ["I think I’m figuring your brain out.", "Ha! Knew it."],
      fr: ["Je crois que je commence à comprendre ton cerveau.", "Ha ! Je le savais."]},
    e: {en: ["We’re closing in.", "Closer again. Told you."],
      fr: ["On se rapproche du but.", "Encore plus près. Je te l’avais dit."]}
  },
  drifting: {
    a: {en: ["Uh-oh. I think we ran past it.", "Yep. Way past it."],
      fr: ["Oh oh. Je crois qu’on l’a dépassé en courant.", "Ouais. Largement dépassé."]},
    b: {en: ["Okay, I might have gone the wrong way.", "Nope. Definitely the wrong way."],
      fr: ["OK, je suis peut-être parti du mauvais côté.", "Non. Clairement du mauvais côté."]},
    c: {en: ["New one. Pretend the last thing never happened.", "Good idea. It was terrible."],
      fr: ["Un nouveau. On fait comme si le dernier n’avait jamais existé.", "Bonne idée. Il était nul."]},
    d: {en: ["I think our brains just ran into different rooms.", "Yep. Completely different rooms."],
      fr: ["Je crois que nos cerveaux viennent de courir dans des pièces différentes.", "Ouais. Des pièces complètement différentes."]},
    e: {en: ["Reset. Go again.", "Still wrong. Faster this time."],
      fr: ["On recommence. Vas-y.", "Toujours raté. Mais plus vite."]}
  },
  stuck: {
    a: {en: ["Okay, how are we STILL here?", "Apparently very easily."],
      fr: ["OK, comment on est ENCORE là ?", "Apparemment, très facilement."]},
    b: {en: ["I have another idea. Obviously.", "Cool. Need another one."],
      fr: ["J’ai une autre idée. Évidemment.", "Cool. Il en faut une autre."]},
    c: {en: ["We are really good at almost getting this.", "Still almost."],
      fr: ["On est vraiment doués pour presque y arriver.", "Toujours presque."]},
    d: {en: ["One of these has to make us look smart eventually.", "Not that one."],
      fr: ["Un de ces tours va bien finir par nous faire passer pour des génies.", "Pas celui-là."]},
    e: {en: ["I swear the answer is running away from us.", "Catch it next round."],
      fr: ["Je te jure, la réponse nous fuit.", "On l’attrape au prochain tour."]}
  },
  strange: {
    a: {en: ["Okay, mine makes sense. Yours better.", "...Okay. I see it. Took me a second."],
      fr: ["OK, le mien a du sens. Le tien a intérêt aussi.", "… OK. Je vois. Il m’a fallu une seconde."]},
    b: {en: ["I’m locking this before I change my mind.", "You went THAT way?"],
      fr: ["Je valide avant de changer d’avis.", "T’es parti PAR LÀ ?"]},
    c: {en: ["Mine feels normal. Which is suspicious.", "Huh. Weird. I like it."],
      fr: ["Le mien a l’air normal. C’est louche.", "Tiens. Bizarre. J’aime bien."]},
    d: {en: ["Ready. Let’s see what you did.", "Wow. Okay. That’s a choice."],
      fr: ["Prêt. Voyons ce que tu as fait.", "Wow. OK. C’est un choix."]},
    e: {en: ["Got mine.", "Wait. Yours is actually kind of great."],
      fr: ["J’ai le mien.", "Attends. Le tien est franchement génial."]}
  },
  strong: {
    a: {en: ["Oh, this one’s good.", "YES. That connects."],
      fr: ["Oh, celui-là est bien.", "OUI. Ça se tient."]},
    b: {en: ["I like mine. A lot.", "Yours was good too. Annoying."],
      fr: ["J’aime bien le mien. Beaucoup.", "Le tien était bien aussi. Agaçant."]},
    c: {en: ["This feels obvious.", "Yep. Same place."],
      fr: ["Ça a l’air évident.", "Ouais. Même endroit."]},
    d: {en: ["Okay, I’m weirdly sure about this.", "Ha! That worked."],
      fr: ["OK, je suis bizarrement sûr de moi.", "Ha ! Ça a marché."]},
    e: {en: ["This better work because I really like it.", "Okay! Worth it."],
      fr: ["Ça a intérêt à marcher, parce que je l’adore.", "OK ! Ça valait le coup."]}
  },
  good: {
    a: {en: ["Got one.", "Yeah, I see yours."],
      fr: ["J’en ai un.", "Ouais, je vois le tien."]},
    b: {en: ["Locked.", "Different, but okay."],
      fr: ["Validé.", "Différent, mais OK."]},
    c: {en: ["This makes sense to me.", "Yep. Same neighbourhood."],
      fr: ["Pour moi, ça se tient.", "Ouais. Même quartier."]},
    d: {en: ["Ready.", "Okay, I get it."],
      fr: ["Prêt.", "OK, je comprends."]},
    e: {en: ["I’ve got something.", "Not the same, but close enough to keep going."],
      fr: ["J’ai un truc.", "Pas pareil, mais assez proche pour continuer."]}
  },
  weak: {
    a: {en: ["I picked something. Don’t ask questions.", "Yeah. We went completely different ways."],
      fr: ["J’ai choisi un truc. Pose pas de questions.", "Ouais. On est partis dans des directions complètement différentes."]},
    b: {en: ["This might be terrible.", "Confirmed."],
      fr: ["Ça va peut-être être nul.", "Confirmé."]},
    c: {en: ["Okay, I’m trying something.", "Let’s not try that again."],
      fr: ["OK, je tente un truc.", "On ne retente pas ça."]},
    d: {en: ["I don’t love mine.", "Good instinct."],
      fr: ["J’aime pas trop le mien.", "Bon instinct."]},
    e: {en: ["Whatever. Let’s see.", "Nope. Run it back."],
      fr: ["Tant pis. On verra.", "Non. On la refait."]}
  },
  veryWeak: {
    a: {en: ["I have absolutely no idea if this works.", "It did not."],
      fr: ["Je n’ai absolument aucune idée si ça marche.", "Ça n’a pas marché."]},
    b: {en: ["This was better in my head.", "Much better in your head."],
      fr: ["C’était mieux dans ma tête.", "Bien mieux dans ta tête."]},
    c: {en: ["Nobody get excited about this one.", "Excellent advice."],
      fr: ["Que personne ne s’emballe pour celui-là.", "Excellent conseil."]},
    d: {en: ["I’m trying a thing.", "Stop trying that thing."],
      fr: ["J’essaie un truc.", "Arrête d’essayer ce truc."]},
    e: {en: ["Could work. Could be awful.", "Awful won."],
      fr: ["Ça peut marcher. Ou être affreux.", "Affreux a gagné."]}
  },
  normal: {
    a: {en: ["Got one.", "Nope. Again."],
      fr: ["J’en ai un.", "Non. Encore."]},
    b: {en: ["Ready.", "Different. Go."],
      fr: ["Prêt.", "Différent. Vas-y."]},
    c: {en: ["Mine’s done. Hurry up.", "Huh. Okay. Next one."],
      fr: ["Le mien est prêt. Dépêche-toi.", "Tiens. OK. Au suivant."]},
    d: {en: ["Locked.", "Not it. Again."],
      fr: ["Validé.", "Pas ça. Encore."]},
    e: {en: ["Reveal it.", "Different again. Keep moving."],
      fr: ["Révèle-le.", "Encore différent. On avance."]}
  },
  long: {
    a: {en: ["We have been doing this FOREVER.", "Still going. Fine by me."],
      fr: ["Ça fait UNE ÉTERNITÉ qu’on joue.", "On continue. Ça me va."]},
    b: {en: ["Wasn’t this supposed to be easy?", "Apparently not."],
      fr: ["C’était pas censé être facile ?", "Apparemment pas."]},
    c: {en: ["We’ve gone too far to quit now.", "Exactly. Again."],
      fr: ["On est allés trop loin pour abandonner.", "Exactement. Encore."]},
    d: {en: ["I need to know how this ends.", "Not like that."],
      fr: ["Il faut que je sache comment ça finit.", "Pas comme ça."]},
    e: {en: ["I’m not stopping. Just so you know.", "Good. Again."],
      fr: ["Je m’arrête pas. Je te préviens.", "Bien. Encore."]}
  },
  fastWin: {
    a: {en: ["Wait. I think this is it.", "YES! ALREADY?!", "Again. Right now."],
      fr: ["Attends. Je crois que c’est ça.", "OUI ! DÉJÀ ?!", "Encore. Tout de suite."]},
    b: {en: ["Ohhh, this feels way too easy.", "WE GOT IT.", "That was FAST."],
      fr: ["Ohhh, ça a l’air beaucoup trop facile.", "ON L’A.", "C’était RAPIDE."]},
    c: {en: ["I think we have it.", "YES!", "Okay, that was awesome."],
      fr: ["Je crois qu’on l’a.", "OUI !", "OK, c’était génial."]}
  },
  normalWin: {
    a: {en: ["Wait. I think this is actually it.", "YES! WE GOT IT!", "Again. Again. Again."],
      fr: ["Attends. Je crois que c’est vraiment ça.", "OUI ! ON L’A !", "Encore. Encore. Encore."]},
    b: {en: ["Oh! I know where you’re going.", "THAT’S IT!", "Ha! I knew we were getting there."],
      fr: ["Oh ! Je sais où tu vas.", "C’EST ÇA !", "Ha ! Je savais qu’on y arrivait."]},
    c: {en: ["I have a really good feeling about this.", "YES!", "Okay. Rematch. Immediately."],
      fr: ["J’ai un très bon pressentiment.", "OUI !", "OK. Revanche. Tout de suite."]},
    d: {en: ["Wait. Don’t say anything.", "WE GOT IT.", "That was SO good."],
      fr: ["Attends. Dis rien.", "ON L’A.", "C’était TROP bien."]},
    e: {en: ["I think our brains finally did the same thing.", "YES!", "Took them long enough."],
      fr: ["Je crois que nos cerveaux ont enfin fait la même chose.", "OUI !", "Ils en ont mis du temps."]}
  },
  lateWin: {
    a: {en: ["This has to be it.", "FINALLY!", "YES. Worth it."],
      fr: ["Ça doit être ça.", "ENFIN !", "OUI. Ça valait le coup."]},
    b: {en: ["If we miss again I’m blaming you.", "YES!", "Okay, never mind. We’re amazing."],
      fr: ["Si on rate encore, c’est ta faute.", "OUI !", "OK, laisse tomber. On est géniaux."]},
    c: {en: ["I think we actually have it.", "WE GOT IT.", "Finally! I was starting to take that personally."],
      fr: ["Je crois qu’on l’a vraiment.", "ON L’A.", "Enfin ! Je commençais à le prendre perso."]},
    d: {en: ["Come on. Be it.", "YES!", "Okay. Again?"],
      fr: ["Allez. Sois le bon.", "OUI !", "OK. On recommence ?"]}
  },
  veryLateWin: {
    a: {en: ["Please be it. Please be it. Please be it.", "YES!", "FINALLY."],
      fr: ["Pourvu que ce soit ça. Pourvu que ce soit ça. Pourvu que ce soit ça.", "OUI !", "ENFIN."]},
    b: {en: ["We are NOT missing again.", "WE GOT IT.", "Told you."],
      fr: ["On ne rate PAS encore.", "ON L’A.", "Je te l’avais dit."]},
    c: {en: ["Okay, now I really care.", "YES!", "Worth every single one."],
      fr: ["OK, là, ça me tient vraiment à cœur.", "OUI !", "Ça valait chaque tour."]},
    d: {en: ["This is it. It has to be.", "FINALLY!", "That was ridiculous. Again?"],
      fr: ["C’est ça. Ça doit être ça.", "ENFIN !", "C’était n’importe quoi. On recommence ?"]}
  },
  exhausted: {
    a: {en: ["Okay. Last shot. Go.", "Nooo.", "Our brains really refused to cooperate. Kind of impressive."],
      fr: ["OK. On tente. Vas-y.", "Nooon.", "Nos cerveaux n’ont vraiment pas voulu coopérer. C’est presque impressionnant."]},
    b: {en: ["I have a really good feeling about this.", "Nope.", "Okay. It got away. Rematch?"],
      fr: ["J’ai un très bon pressentiment.", "Non.", "OK. Il nous a échappé. Revanche ?"]},
    c: {en: ["Come on, brain. Do something useful.", "Nope.", "Again. I’m not done."],
      fr: ["Allez, cerveau. Rends-toi utile.", "Non.", "Encore. J’ai pas fini."]}
  }
};

/** Milo's one-off lines: a repeated word, an accepted spelling correction, a long think, a rematch. */
const LINES = {
  alreadyUsed: {en: ["We already used that!", "Nope. Taken. Pick another.", "That one again? Come on."], fr: ["On l’a déjà utilisé !", "Non. Déjà pris. Choisis-en un autre.", "Encore celui-là ? Allez."]},
  typo: {en: ["Ohhh. Yep. That makes way more sense.", "Okay, THAT word.", "Got it."], fr: ["Ohhh. Ouais. Ça a beaucoup plus de sens.", "OK, CE mot-là.", "Compris."]},
  waiting: {en: ["You’re still thinking?", "I already picked mine like twelve years ago.", "Come onnn.", "Hurry up, my brain is getting bored.", "I’m waiting.", "Catch up!"], fr: ["Tu réfléchis encore ?", "J’ai choisi le mien il y a genre douze ans.", "Allez, quoiii.", "Dépêche-toi, mon cerveau s’ennuie.", "J’attends.", "Rattrape-moi !"]},
  rematch: {en: ["Again? YES.", "Okay, go go go.", "Absolutely. I’m ready.", "Rematch. Right now."], fr: ["Encore ? OUI.", "OK, vas-y vas-y vas-y.", "Carrément. Je suis prêt.", "Revanche. Tout de suite."]}
};

const milo = createNarrative({
  prefix: "mn",
  script: SCRIPT,
  lines: LINES,
  // Joke concepts: two pairs leaning on the same one are not clustered (a fresh pair is preferred).
  concepts: {
    rooms: /\brooms?\b/i, chase: /\bran\b|running|\brace\b|\bchase\b|\bcatch\b/i, wrongWay: /wrong way|different ways?/i,
    hurry: /hurry|come onn/i, again: /\bagain\. again\b/i
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
