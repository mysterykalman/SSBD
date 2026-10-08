// Gary's branching narrative (Solo). Presentation only: nothing here reads or changes the bot's word,
// the scoring or the game state, and nothing is stored. Every beat is re-derived from the game's own
// revealed moves, so the same game always shows the same dialogue (a reload never changes it).
//
// Gary is the player's reluctant teammate: same goal (say the same word), guarded about admitting he
// cares. Each completed move gets ONE paired beat from ONE branch: a BEFORE line (after the player
// locks in, before the reveal) and an AFTER line (once both words are visible); wins add a POST-WIN
// line, a 20-move miss a FOLLOW-UP. Lines from different pairs are never combined.
//
// The English copy is the approved script, word for word, except the lines that revealed the
// internal move cap (the game never mentions it), which were rewritten in the same voice.
// French is a faithful translation.
// The branch selection and rotation are shared with Milo (src/client/narrative.js).

import {createNarrative, levelOf, trendOf} from "./narrative.js";

/** A beat's lines by language: [before, after, extra?]. Keys: `${branch}.${pair}`. */
const SCRIPT = {
  opening: {
    a: {en: ["All right. We each pick a word and somehow try to end up in the same place. I’ve been given worse instructions.", "Okay. That could have gone much worse. I’m choosing to view this as acceptable."],
      fr: ["Bon. On choisit chacun un mot et on essaie d’une manière ou d’une autre d’arriver au même endroit. On m’a déjà donné de pires consignes.", "OK. Ça aurait pu bien plus mal se passer. Je choisis de considérer ça comme acceptable."]},
    b: {en: ["Apparently we’re doing this. Pick a word. I’ll pick one. Eventually, statistics suggest something will happen.", "Different words. Fine. Now we have something to work with."],
      fr: ["Apparemment, on fait ça. Choisis un mot. J’en choisis un. Tôt ou tard, les statistiques suggèrent qu’il se passera quelque chose.", "Des mots différents. Bon. Maintenant, on a de quoi travailler."]},
    c: {en: ["I have a word. You have a word. This feels unnecessarily suspenseful.", "Right. Not the same word. That would have been suspiciously efficient."],
      fr: ["J’ai un mot. Tu as un mot. C’est inutilement haletant.", "D’accord. Pas le même mot. Ça aurait été d’une efficacité suspecte."]}
  },
  close: {
    a: {en: ["Wait. I think we’re circling the same idea now. Please don’t ruin this for both of us.", "That was uncomfortably close. We may actually know what we’re doing."],
      fr: ["Attends. Je crois qu’on tourne autour de la même idée. S’il te plaît, ne gâche pas ça pour nous deux.", "C’était d’une proximité gênante. On sait peut-être vraiment ce qu’on fait."]},
    b: {en: ["I think we’re close. This is usually where things go wrong.", "Almost. I’m going to avoid having confidence for another round."],
      fr: ["Je crois qu’on est proches. C’est en général là que ça se gâte.", "Presque. Je vais éviter d’avoir confiance pendant encore un tour."]},
    c: {en: ["Don’t say anything. I think I know where this is going.", "Same neighbourhood. Different house. Annoying, but useful."],
      fr: ["Ne dis rien. Je crois que je sais où ça va.", "Même quartier. Maison différente. Agaçant, mais utile."]},
    d: {en: ["Okay. There’s a pattern forming. I don’t trust it.", "That almost worked. Which somehow makes missing more irritating."],
      fr: ["OK. Un schéma se dessine. Je ne m’y fie pas.", "Ça a presque marché. Ce qui rend le raté encore plus irritant, curieusement."]},
    e: {en: ["I dislike how plausible this feels.", "Very close. Please remain exactly this competent."],
      fr: ["Je n’aime pas à quel point ça paraît plausible.", "Très proche. Reste exactement aussi compétent, s’il te plaît."]}
  },
  recovery: {
    a: {en: ["Okay. New plan. Less wandering around and more accidentally having the same thought.", "Better. Not good. Better."],
      fr: ["OK. Nouveau plan. Moins errer et plus avoir la même idée par accident.", "Mieux. Pas bien. Mieux."]},
    b: {en: ["I think we may have found our way back. I’m withholding celebration.", "There. That at least resembles progress."],
      fr: ["Je crois qu’on a peut-être retrouvé le chemin. Je retiens toute célébration.", "Voilà. Ça ressemble au moins à un progrès."]},
    c: {en: ["I have another idea. This one has the advantage of making some sense.", "Okay. We’re moving in one direction again. Let’s not examine how long that took."],
      fr: ["J’ai une autre idée. Celle-ci a l’avantage d’avoir un certain sens.", "OK. On avance de nouveau dans une seule direction. N’examinons pas combien de temps ça a pris."]},
    d: {en: ["I’m cautiously revising my opinion of how badly this is going.", "That helped. I will not be taking questions."],
      fr: ["Je révise prudemment mon avis sur la gravité de la situation.", "Ça a aidé. Je ne prendrai pas de questions."]}
  },
  improving: {
    a: {en: ["I think we may be getting closer. I’m not prepared to make a statement beyond that.", "Fine. That one made sense. Let’s not make a whole thing out of it."],
      fr: ["Je crois qu’on se rapproche peut-être. Je ne suis pas prêt à faire une déclaration au-delà.", "Bon. Celui-là avait du sens. N’en faisons pas toute une histoire."]},
    b: {en: ["I see a route here. I would prefer not to discuss how optimistic that sounds.", "That was better. Please don’t get confident."],
      fr: ["Je vois un chemin. Je préférerais ne pas discuter de l’optimisme que ça laisse entendre.", "C’était mieux. Ne prends pas confiance, s’il te plaît."]},
    c: {en: ["Okay. I have something. There is an uncomfortable amount of logic behind it.", "Hm. We’re starting to overlap. I don’t trust this."],
      fr: ["OK. J’ai quelque chose. Il y a une quantité gênante de logique derrière.", "Hm. On commence à se recouper. Je ne m’y fie pas."]},
    d: {en: ["I think I know what you’re doing now. That feels dangerous.", "Closer. I’m acknowledging that once."],
      fr: ["Je crois que je vois ce que tu fais maintenant. Ça paraît dangereux.", "Plus près. Je le reconnais une fois."]},
    e: {en: ["We appear to be moving toward the same idea. Nobody react.", "That worked better than expected. Continue behaving normally."],
      fr: ["On semble se diriger vers la même idée. Personne ne réagit.", "Ça a mieux marché que prévu. Continue à te comporter normalement."]}
  },
  drifting: {
    a: {en: ["I think we may have made this worse. Good news: I have another idea, which has historically gone very well.", "Right. That did not fix it. I’d like that noted without assigning blame."],
      fr: ["Je crois qu’on a peut-être empiré les choses. Bonne nouvelle : j’ai une autre idée, ce qui s’est toujours très bien passé jusqu’ici.", "D’accord. Ça n’a rien réglé. J’aimerais que ce soit noté, sans désigner de coupable."]},
    b: {en: ["We were closer a minute ago. I’m choosing not to investigate what happened.", "Okay. We’ve gone sideways."],
      fr: ["On était plus proches il y a une minute. Je choisis de ne pas enquêter sur ce qui s’est passé.", "OK. On est partis de travers."]},
    c: {en: ["I’m recalculating. Not mathematically. Mostly emotionally.", "That did not help as much as I hoped."],
      fr: ["Je recalcule. Pas mathématiquement. Surtout émotionnellement.", "Ça n’a pas aidé autant que je l’espérais."]},
    d: {en: ["I had a theory. The theory has been placed under review.", "We are moving in a direction. I’m withholding judgment on whether it’s useful."],
      fr: ["J’avais une théorie. La théorie a été placée en cours d’examen.", "On avance dans une direction. Je réserve mon jugement sur son utilité."]},
    e: {en: ["Let’s pretend the last round was exploratory.", "Different directions again. Excellent. Very collaborative."],
      fr: ["Faisons comme si le dernier tour était exploratoire.", "Encore des directions différentes. Excellent. Très collaboratif."]}
  },
  stuck: {
    a: {en: ["We’ve been doing this long enough that one of us should probably have learned something.", "Apparently not that round."],
      fr: ["On fait ça depuis assez longtemps pour que l’un de nous ait sans doute appris quelque chose.", "Apparemment pas à ce tour-ci."]},
    b: {en: ["I have a theory. Historically, this is not good news.", "No. Fine. The theory has been withdrawn."],
      fr: ["J’ai une théorie. Historiquement, ce n’est pas une bonne nouvelle.", "Non. Bon. La théorie est retirée."]},
    c: {en: ["We seem to have established several ways not to match. That is technically data.", "Another data point. Thrilling."],
      fr: ["On semble avoir établi plusieurs façons de ne pas trouver le même mot. Techniquement, ce sont des données.", "Encore une donnée. Palpitant."]},
    d: {en: ["I no longer know whether we’re narrowing this down or creating new problems.", "New problem. Good to have that cleared up."],
      fr: ["Je ne sais plus si on resserre les possibilités ou si on crée de nouveaux problèmes.", "Nouveau problème. Bien d’avoir clarifié ça."]},
    e: {en: ["At some point probability has to become embarrassed and help us.", "Not yet, apparently."],
      fr: ["À un moment, les probabilités vont bien finir par avoir honte et nous aider.", "Pas encore, apparemment."]}
  },
  strange: {
    a: {en: ["I have something fairly normal. I’m mentioning that now for reasons that may become obvious.", "That is not where I thought you were going. I can see it. Eventually."],
      fr: ["J’ai quelque chose d’assez normal. Je le précise maintenant pour des raisons qui vont peut-être devenir évidentes.", "Ce n’est pas là que je pensais que tu allais. Je vois le lien. Finalement."]},
    b: {en: ["I’m going to commit to my answer before either of us has time to reconsider our choices.", "Okay. That took me a second. I’ll allow it."],
      fr: ["Je vais m’engager sur ma réponse avant que l’un de nous ait le temps de reconsidérer ses choix.", "OK. Il m’a fallu une seconde. J’accepte."]},
    c: {en: ["I feel reasonably good about mine, which means yours is probably about to surprise me.", "Bold. Not wrong, exactly. Bold."],
      fr: ["Je suis plutôt content du mien, ce qui veut dire que le tien va sans doute me surprendre.", "Audacieux. Pas faux, exactement. Audacieux."]},
    d: {en: ["All right. Let’s see what happened.", "I’m going to need a moment with that one."],
      fr: ["Bon. Voyons ce qui s’est passé.", "Il va me falloir un moment avec celui-là."]},
    e: {en: ["I have my word. I’m prepared to defend it within reason.", "I see the connection. I wish I’d seen it faster."],
      fr: ["J’ai mon mot. Je suis prêt à le défendre, dans la limite du raisonnable.", "Je vois le lien. J’aurais aimé le voir plus vite."]}
  },
  strong: {
    a: {en: ["Okay. I actually feel fairly good about this one. That usually means trouble.", "Annoyingly, that works."],
      fr: ["OK. Je me sens plutôt bien avec celui-là. En général, ça annonce des ennuis.", "C’est agaçant, mais ça marche."]},
    b: {en: ["I know what I want to say. I dislike how much confidence I have in it.", "That was annoyingly sensible."],
      fr: ["Je sais ce que je veux dire. Je n’aime pas la confiance que j’ai là-dedans.", "C’était agaçant de bon sens."]},
    c: {en: ["This feels almost straightforward. I’m immediately suspicious.", "Fine. We’re thinking along similar lines."],
      fr: ["Ça paraît presque simple. Je suis immédiatement méfiant.", "Bon. On pense dans le même sens."]},
    d: {en: ["I have something that seems obvious now. I’m sure that won’t be important.", "That was good. I was hoping it wouldn’t make sense."],
      fr: ["J’ai quelque chose qui paraît évident, là. Je suis sûr que ça n’aura aucune importance.", "C’était bien. J’espérais que ça n’aurait aucun sens."]},
    e: {en: ["Okay. This one has potential. I regret saying that out loud.", "That was close enough to be concerning."],
      fr: ["OK. Celui-là a du potentiel. Je regrette de l’avoir dit à voix haute.", "C’était assez proche pour être inquiétant."]}
  },
  good: {
    a: {en: ["I have something. I’m not saying it’s good, but it survives basic inspection.", "Hm. Different answer, same general neighbourhood. I can work with that."],
      fr: ["J’ai quelque chose. Je ne dis pas que c’est bien, mais ça survit à une inspection de base.", "Hm. Réponse différente, même quartier en gros. Je peux faire avec."]},
    b: {en: ["All right. I have a word. It meets the minimum requirements for confidence.", "Fine. I can follow that."],
      fr: ["Bon. J’ai un mot. Il remplit les conditions minimales de confiance.", "Bon. Je peux suivre."]},
    c: {en: ["I think this makes sense. I’ve made that mistake before.", "That’s more reasonable than I expected."],
      fr: ["Je crois que ça a du sens. J’ai déjà fait ce faux pas.", "C’est plus raisonnable que prévu."]},
    d: {en: ["I have an answer. Nothing about it requires an explanation yet.", "Okay. I see what you did there."],
      fr: ["J’ai une réponse. Rien ne demande encore d’explication.", "OK. Je vois ce que tu as fait."]},
    e: {en: ["This feels defensible. Let’s leave it at that.", "Not the same, but I can see the route."],
      fr: ["Ça paraît défendable. Restons-en là.", "Pas le même, mais je vois le chemin."]}
  },
  weak: {
    a: {en: ["I have a word. I would describe my confidence as 'available upon request.'", "Okay. We took different exits there. Let’s quietly return to the highway."],
      fr: ["J’ai un mot. Je décrirais ma confiance comme « disponible sur demande ».", "OK. On a pris des sorties différentes. Revenons discrètement sur l’autoroute."]},
    b: {en: ["This one feels less like an answer and more like a proposal.", "Yeah. We were not having the same thought."],
      fr: ["Celui-là ressemble moins à une réponse qu’à une proposition.", "Ouais. On n’avait pas la même idée."]},
    c: {en: ["I’ve committed to something. That is the strongest statement I’m prepared to make.", "Not especially close. Still technically a game."],
      fr: ["Je me suis engagé sur quelque chose. C’est la déclaration la plus forte que je suis prêt à faire.", "Pas spécialement proche. Techniquement, c’est toujours une partie."]},
    d: {en: ["I have something. Please keep expectations at a responsible level.", "Different directions. Fine. We have another round."],
      fr: ["J’ai quelque chose. Merci de garder des attentes à un niveau responsable.", "Directions différentes. Bon. Il nous reste un tour."]},
    e: {en: ["I’m not confident about this, which at least means I’m paying attention.", "That didn’t bring us closer. Useful to know."],
      fr: ["Je n’en suis pas sûr, ce qui veut au moins dire que je fais attention.", "Ça ne nous a pas rapprochés. Bon à savoir."]}
  },
  veryWeak: {
    a: {en: ["I’m going to be honest. I have no idea whether this helps.", "Good. Neither of us appears to have solved anything."],
      fr: ["Je vais être honnête. Je n’ai aucune idée si ça aide.", "Bien. Aucun de nous ne semble avoir résolu quoi que ce soit."]},
    b: {en: ["This may technically qualify as a word choice.", "That went about as well as advertised."],
      fr: ["Ceci peut techniquement être qualifié de choix de mot.", "Ça s’est passé à peu près comme annoncé."]},
    c: {en: ["I have something. I’m already preparing to distance myself from it.", "Right. We can safely rule out whatever that was."],
      fr: ["J’ai quelque chose. Je me prépare déjà à prendre mes distances.", "D’accord. On peut écarter sans risque ce que c’était."]},
    d: {en: ["I’m not expecting much here. It feels healthier.", "Correct level of expectation."],
      fr: ["Je n’attends pas grand-chose, là. Ça paraît plus sain.", "Bon niveau d’attente."]},
    e: {en: ["This is less confidence and more procedural compliance.", "No match. Shocking absolutely no one."],
      fr: ["C’est moins de la confiance que du respect de la procédure.", "Pas le même mot. Ça ne surprend absolument personne."]}
  },
  normal: {
    a: {en: ["Okay. I have something. Let’s see what damage we’ve done.", "Different again. Fine. We keep going."],
      fr: ["OK. J’ai quelque chose. Voyons les dégâts.", "Encore différent. Bon. On continue."]},
    b: {en: ["All right. Word selected. Expectations managed.", "Not it. We have more information now, allegedly."],
      fr: ["Bon. Mot choisi. Attentes maîtrisées.", "Pas ça. On a plus d’informations maintenant, paraît-il."]},
    c: {en: ["I’ve got one. I’m choosing not to overthink that.", "Different answers. Nothing catastrophic."],
      fr: ["J’en ai un. Je choisis de ne pas trop y réfléchir.", "Réponses différentes. Rien de catastrophique."]},
    d: {en: ["Okay. Mine is locked in. Whatever happens next is between us and probability.", "Still no match. Probability remains unhelpful."],
      fr: ["OK. Le mien est validé. La suite, c’est entre nous et les probabilités.", "Toujours pas le même mot. Les probabilités restent inutiles."]},
    e: {en: ["I have a word. Let’s get this over with.", "Not the same. Apparently we're continuing."],
      fr: ["J’ai un mot. Finissons-en.", "Pas le même. Apparemment, on continue."]}
  },
  long: {
    a: {en: ["We’ve been doing this long enough that stopping now would feel irresponsible.", "Still not it. Fine. We continue."],
      fr: ["On fait ça depuis assez longtemps pour qu’arrêter maintenant paraisse irresponsable.", "Toujours pas ça. Bon. On continue."]},
    b: {en: ["I was told this had an ending. I’m starting to suspect that was motivational language.", "No match. The evidence against an ending continues to grow."],
      fr: ["On m’avait dit que ça avait une fin. Je commence à soupçonner que c’était du langage motivant.", "Pas le même mot. Les preuves contre l’existence d’une fin continuent de s’accumuler."]},
    c: {en: ["I no longer remember why we started, but I do want to finish.", "Not it. Unfortunately, I remain invested."],
      fr: ["Je ne me souviens plus pourquoi on a commencé, mais je veux finir.", "Pas ça. Malheureusement, je reste impliqué."]},
    d: {en: ["We have now spent enough time on this that I’m classifying it as a project.", "No match. The project remains open."],
      fr: ["On a maintenant passé assez de temps là-dessus pour que je classe ça comme un projet.", "Pas le même mot. Le projet reste ouvert."]},
    e: {en: ["I’m not saying I care. I’m saying I would object to losing now.", "Still nothing. My objection stands."],
      fr: ["Je ne dis pas que ça m’importe. Je dis que je m’opposerais à perdre maintenant.", "Toujours rien. Mon objection est maintenue."]}
  },
  veryLong: {
    a: {en: ["At this point I’m less interested in winning than in proving this can end.", "Apparently we require further evidence."],
      fr: ["À ce stade, gagner m’intéresse moins que prouver que ça peut finir.", "Apparemment, il nous faut des preuves supplémentaires."]},
    b: {en: ["We have invested too much time in this to suddenly become sensible.", "No. Again."],
      fr: ["On a investi trop de temps là-dedans pour devenir raisonnables d’un coup.", "Non. Encore."]},
    c: {en: ["At this point I’m emotionally invested, which was not part of the original agreement.", "Still not it. This has become personal in a very administrative way."],
      fr: ["À ce stade, je suis émotionnellement impliqué, ce qui ne faisait pas partie de l’accord initial.", "Toujours pas ça. C’est devenu personnel, d’une façon très administrative."]},
    d: {en: ["I would like to remind the game that my patience is a finite resource.", "It appears to be testing that theory."],
      fr: ["J’aimerais rappeler au jeu que ma patience est une ressource limitée.", "Il semble vouloir vérifier cette théorie."]},
    e: {en: ["We’ve been at this for a while. I’m remaining calm because one of us should.", "Not it. I’m revising the calm part."],
      fr: ["Ça fait un moment qu’on y est. Je reste calme parce qu’il faut bien que l’un de nous le soit.", "Pas ça. Je révise la partie « calme »."]}
  },
  fastWin: {
    a: {en: ["I have a good feeling about this, which is concerning because I usually don’t.", "...we got it already.", "I had prepared significantly more complaining."],
      fr: ["J’ai un bon pressentiment, ce qui est inquiétant parce que d’habitude je n’en ai pas.", "...on l’a déjà.", "J’avais préparé nettement plus de plaintes."]},
    b: {en: ["Wait. This feels suspiciously obvious.", "...that’s a match.", "Well. That was disturbingly efficient."],
      fr: ["Attends. Ça paraît suspicieusement évident.", "...c’est le même mot.", "Bon. C’était d’une efficacité troublante."]},
    c: {en: ["I think this might be it. Which seems premature.", "...we got it.", "I’m not sure we were supposed to be this competent."],
      fr: ["Je crois que ça pourrait être ça. Ce qui paraît prématuré.", "...on l’a.", "Je ne suis pas sûr qu’on était censés être aussi compétents."]}
  },
  normalWin: {
    a: {en: ["Hang on. I think this might actually be it.", "...we got it.", "I’m not saying we make a good team. I’m saying the evidence is becoming inconvenient."],
      fr: ["Attends. Je crois que ça pourrait vraiment être ça.", "...on l’a.", "Je ne dis pas qu’on forme une bonne équipe. Je dis que les preuves deviennent gênantes."]},
    b: {en: ["Wait. Don’t get excited. I think I know what you’re thinking.", "...that’s it.", "Fine. We make a tolerable team."],
      fr: ["Attends. Ne t’emballe pas. Je crois que je sais à quoi tu penses.", "...c’est ça.", "Bon. On forme une équipe tolérable."]},
    c: {en: ["I have an uncomfortable amount of confidence in this.", "...we got it.", "I had several complaints prepared. This is inconvenient."],
      fr: ["J’ai une quantité gênante de confiance là-dedans.", "...on l’a.", "J’avais plusieurs plaintes de prêtes. C’est gênant."]},
    d: {en: ["I think we may finally be having the same thought.", "...yes. That’s a match.", "I’m going to need a minute to be quietly pleased about this."],
      fr: ["Je crois qu’on a peut-être enfin la même idée.", "...oui. C’est le même mot.", "Il va me falloir une minute pour être discrètement content."]},
    e: {en: ["Okay. Nobody ruin this.", "...we got it.", "That was actually satisfying. Don’t quote me."],
      fr: ["OK. Que personne ne gâche ça.", "...on l’a.", "C’était vraiment satisfaisant. Ne me cite pas."]}
  },
  lateWin: {
    a: {en: ["I think this is it. I’m aware I’ve said similar things before.", "...finally. We got it.", "I would like the record to show that persistence eventually became a strategy."],
      fr: ["Je crois que c’est ça. Je sais que j’ai déjà dit des choses semblables.", "...enfin. On l’a.", "J’aimerais qu’il soit consigné que la persévérance a fini par devenir une stratégie."]},
    b: {en: ["Wait. I think we may actually be done.", "...that’s a match.", "Good. I was starting to develop opinions about this."],
      fr: ["Attends. Je crois qu’on a peut-être vraiment fini.", "...c’est le même mot.", "Bien. Je commençais à me faire des opinions là-dessus."]},
    c: {en: ["I have a feeling this is either it or a particularly cruel near miss.", "...we got it.", "Fine. Worth it. Mostly."],
      fr: ["J’ai l’impression que c’est soit ça, soit un raté particulièrement cruel.", "...on l’a.", "Bon. Ça valait le coup. Surtout."]},
    d: {en: ["I think we’re about to justify all of that.", "...yes. Finally.", "I’m choosing to remember only the successful parts."],
      fr: ["Je crois qu’on est sur le point de justifier tout ça.", "...oui. Enfin.", "Je choisis de ne me souvenir que des parties réussies."]}
  },
  veryLateWin: {
    a: {en: ["If this isn’t it, I’m filing for overtime.", "...finally. We got it.", "I would like the record to show that I never stopped believing in us. Please ignore the previous seventeen rounds."],
      fr: ["Si ce n’est pas ça, je déclare des heures supplémentaires.", "...enfin. On l’a.", "J’aimerais qu’il soit consigné que je n’ai jamais cessé de croire en nous. Merci d’ignorer les dix-sept tours précédents."]},
    b: {en: ["I think this is it. It needs to be. I’ve already mentally closed the file.", "...that’s a match.", "Good. The file can remain closed."],
      fr: ["Je crois que c’est ça. Il le faut. J’ai déjà mentalement fermé le dossier.", "...c’est le même mot.", "Bien. Le dossier peut rester fermé."]},
    c: {en: ["At this point, not matching would feel administratively wasteful.", "...we got it.", "Excellent. I will now pretend this was always under control."],
      fr: ["À ce stade, ne pas trouver le même mot serait un gâchis administratif.", "...on l’a.", "Excellent. Je vais maintenant faire comme si tout était sous contrôle depuis le début."]},
    d: {en: ["I’m going to say this once: I think we have it.", "...finally.", "That took exactly as long as I was afraid it would."],
      fr: ["Je vais le dire une fois : je crois qu’on l’a.", "...enfin.", "Ça a pris exactement le temps que je craignais."]}
  },
  exhausted: {
    a: {en: ["I have a word. I’ve stopped predicting how this goes.", "No match.", "Well. We have successfully proven that two people can think near each other for quite a while."],
      fr: ["J’ai un mot. J’ai arrêté de prédire comment ça va tourner.", "Pas le même mot.", "Bon. Nous avons prouvé avec succès que deux personnes peuvent penser à côté l’une de l’autre pendant un bon moment."]},
    b: {en: ["Here’s mine. No pressure, except the very specific pressure I have now put on it.", "Not it.", "Fine. We didn’t get there. I’m still counting this as suspiciously close to teamwork."],
      fr: ["Voilà le mien. Aucune pression, à part la pression très précise que je viens de lui mettre.", "Pas ça.", "Bon. On n’y est pas arrivés. Je compte quand même ça comme étrangement proche du travail d’équipe."]},
    c: {en: ["I have a word. I have nothing useful to add to that.", "No match.", "I would like to formally conclude whatever this was."],
      fr: ["J’ai un mot. Je n’ai rien d’utile à ajouter.", "Pas le même mot.", "J’aimerais conclure officiellement ce que c’était."]}
  }
};

/** One-off lines (rotated per game), word for word. */
const LINES = {
  alreadyUsed: {en: ["We already used that one. I checked.", "That word’s already been played. Unfortunately, I remember.", "We used that already. Try another one.", "Already played. I have notes."],
    fr: ["On a déjà utilisé celui-là. J’ai vérifié.", "Ce mot a déjà été joué. Malheureusement, je m’en souviens.", "On l’a déjà utilisé. Essaie un autre mot.", "Déjà joué. J’ai des notes."]},
  typo: {en: ["Good. That makes more sense.", "Right. That’s the word I thought you meant.", "Okay. Administrative issue resolved."],
    fr: ["Bien. Ça a plus de sens.", "D’accord. C’est le mot que je pensais que tu voulais dire.", "OK. Problème administratif résolu."]},
  waiting: {en: ["No rush. I’m pretending not to watch the clock.", "Take your time. I’ve already committed to mine, so now I just sit here.", "I’m still here. Against several expectations.", "This is fine. I have nowhere else I’m required to be in this fictional scenario."],
    fr: ["Pas de presse. Je fais semblant de ne pas regarder l’heure.", "Prends ton temps. Je me suis déjà engagé sur le mien, donc maintenant je reste assis là.", "Je suis toujours là. Contre plusieurs pronostics.", "Tout va bien. Je n’ai nulle part ailleurs où être dans ce scénario fictif."]},
  rematch: {en: ["Again? Fine. We have established a process.", "Round two. I brought a pen.", "All right. Apparently one successful collaboration was not enough.", "Fine. But this time I’m managing expectations from the beginning."],
    fr: ["Encore ? Bon. On a établi une procédure.", "Deuxième manche. J’ai apporté un stylo.", "Bon. Apparemment, une collaboration réussie ne suffisait pas.", "Bon. Mais cette fois, je gère les attentes dès le départ."]}
};

const gary = createNarrative({
  prefix: "gn",
  script: SCRIPT,
  lines: LINES,
  // Joke concepts: two pairs leaning on the same one are not clustered (a fresh pair is preferred).
  concepts: {
    confidence: /confiden/i, project: /\bproject\b/i, investment: /invest/i, overtime: /overtime/i,
    probability: /probabilit|statistic/i, record: /\bthe record\b|noted/i, administrative: /administrativ/i
  },
  // Wins: fast on moves 2–3, normal 4–11, late 12–16, very late 17–20. Long-game variants from
  // move 10, very long from move 16.
  wins: {fast: 3, normal: 11, late: 16},
  long: {from: 10, veryLongFrom: 16}
});

export const BRANCHES = gary.BRANCHES;
export const ONE_OFF = gary.ONE_OFF;
/** i18n keys for every Gary narrative line: `gn.${branch}.${pair}.${0|1|2}` and `gn.${kind}.${index}`. */
export const GARY_NARRATIVE_STRINGS = gary.STRINGS;
export const {pairKeys, pairsOf, oneOffKeys, englishOf, conceptsOf, branchFor, oneOffLine} = gary;
export {levelOf, trendOf};
/** Gary's beat for every revealed move of a game, in order (see createNarrative in narrative.js). */
export const garyBeats = gary.beats;
export const GARY_NARRATIVE = gary;
