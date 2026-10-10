(function(global){
"use strict";
const copy={
 bio:"Pam is the kind of mom who remembers where you left your shoes, what you said three Tuesdays ago, and exactly when you started making up an excuse. She knows a lot, asks annoyingly good questions, and takes being stumped a little personally.",
 intro:{
  lead:"Alright. Try me.",
  question:"Think of a person, place, animal, food, character, or thing. Your job is to stump Mom.",
  aside:"I get 20 turns. Every wrong guess costs me one. Pick something fair and don’t change it halfway through."
 },
 early:["Okay.","Mhm.","Good to know.","Alright."],
 middle:["That narrows things down.","I’m getting somewhere.","Okay, I have a theory.","Interesting."],
 close:["Oh, I’m getting close.","You’re running out of places to hide.","I have a pretty good idea.","Don’t celebrate yet."],
 surprise:["Now hang on.","That answer changed things.","Interesting. I was not expecting that.","Okay. Recalculating."],
 guess:["I think you’re thinking of...","Alright. I’m calling it.","I have a guess.","Let’s see if I’ve got you."],
 correct:["I knew it.","There it is.","Of course.","That’s what I thought.","Nice try."],
 fast:["That was practically written on your face.","You’ll need something harder than that.","See? Eyes in the back of my head."],
 long:["You made me work for that one.","That was annoyingly good.","I was one question away from blaming the database."],
 wrongGuess:[
  "Fine. That was a strategic mistake.",
  "No? Hm. Don’t get excited.",
  "Alright, cross that one off.",
  "Interesting. I’m still not giving you the point."
 ],
 stumped:[
  "Okay. You got me.",
  "You win. Enjoy this.",
  "Fine. I have officially been stumped.",
  "I know a lot of things. Apparently this was not one of them."
 ],
 stumpedAsides:[
  "This will be mentioned exactly once and then never again.",
  "Enjoy your victory lap. Quietly.",
  "I’m blaming your answers, obviously.",
  "That was a good one. I hate that for me."
 ],
 asides:[
  [/\bfly|flying|airplane|air\b/i,"Text me when you land."],
  [/fragile|break easily|delicate/i,"Then maybe use two hands."],
  [/bedroom|your room/i,"Speaking of which, clean your room."],
  [/\bfood\b|eat it|edible|dessert/i,"Save room for dinner."],
  [/batter/i,"We never have the right ones."],
  [/refrigerator|cold\?|frozen/i,"And close the door when you’re done."],
  [/specific real person|person\?|profession|job/i,"I probably know their mother."],
  [/woman|girl|female/i,"It’s not Janice, is it?"],
  [/water|swim|ocean|sea/i,"Janice says walking to the pool counts as exercise."],
  [/pet|fur|hair/i,"If it sheds, you’re in charge of the vacuum."],
  [/wear it|clothing|jacket/i,"Take a jacket."],
  [/container|hold things/i,"Not the good Tupperware."],
  [/kitchen/i,"There’s lemonade in the fridge."],
  [/school/i,"Did you finish your homework first?"],
  [/cleaning/i,"Funny you should mention that."],
  [/music|sound/i,"Keep it down if Janice comes over."]
 ]
};
const pick=(arr,n)=>arr[Math.abs((Number(n)||1)-1)%arr.length];
function asideFor(q,n){if((Number(n)||1)%3===1)return"";const hit=copy.asides.find(([p])=>p.test(q));return hit?hit[1]:"";}
function leadFor(n,max,surprise){if(surprise)return pick(copy.surprise,n);if(n>=Math.max(6,max-4))return pick(copy.close,n);if(n>=5)return pick(copy.middle,n);return pick(copy.early,n);}
function guessLead(n,wrong=0){return wrong?pick(["I’m trying again.","Okay, new guess.","You bought yourself time. Not much."],n+wrong):pick(copy.guess,n);}
function wrongGuessLead(name,n){return`${pick(copy.wrongGuess,n)} ${name} is out.`;}
function wrongGuessAside(name){return`That miss cost me a turn. I still have questions.`;}
function stumpedAside(result){return pick(copy.stumpedAsides,(result.turns||20)+(result.wrongGuesses||0));}
function resultLine(result){
 if(result.winner==="player")return pick(copy.stumped,(result.turns||20)+(result.wrongGuesses||0));
 if(result.fast)return pick(copy.fast,result.turns);
 if(result.long)return pick(copy.long,result.turns);
 return pick(copy.correct,result.turns);
}
global.PamCopy={copy,asideFor,leadFor,guessLead,wrongGuessLead,wrongGuessAside,stumpedAside,resultLine};
})(window);
