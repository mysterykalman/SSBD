(function(global){
"use strict";
const copy={
 bio:"Pam has a way of knowing what happened before you finish explaining it. She’s cheerful, patient, a little nosy, remembers everything, and somehow turns nearly every situation into a small life lesson. Annoyingly, she’s usually right.",
 intro:{lead:"Ready? Good. And sit up straight.",question:"Think of a common person, place, animal, food, or thing. Don’t tell me.",aside:"Pick one and stick with it. No changing your mind halfway through."},
 early:["Okay.","Mhm.","Good to know.","Alright."],
 middle:["That narrows things down.","I’m starting to see it.","Okay, I have an idea.","Interesting."],
 close:["Oh, I think I know.","I have a pretty good idea.","You’re not as mysterious as you think.","I think I’ve got you."],
 surprise:["Now hang on.","That doesn’t quite match what you told me earlier.","Interesting. That changes things."],
 guess:["I think you’re thinking of...","Alright. I’ve got it.","I have a pretty good idea."],
 correct:["I knew it.","There we go.","Of course.","That’s what I thought."],
 incorrect:["Well, nobody’s perfect.","Alright. You got me.","Hm. I’ll give you that one.","Okay, that was a good one."],
 fast:["Well, that didn’t take long.","That one was practically written on your face.","See? Eyes in the back of my head."],
 long:["You picked a good one.","Okay, you’re making me work for this.","This is turning into a whole thing."],
 asides:[
  [/\bfly|flying|airplane|air\b/i,"Text me when you land."],
  [/fragile|break easily|delicate/i,"Then maybe use two hands."],
  [/bedroom|your room/i,"Speaking of which, clean your room."],
  [/\bfood\b|eat it|edible|dessert/i,"Save room for dinner."],
  [/batter/i,"We never have the right ones."],
  [/refrigerator|cold\?|frozen/i,"And close the door when you’re done."],
  [/person\?|profession|job/i,"I probably know their mother."],
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
function guessLead(n){return pick(copy.guess,n);}
function resultLine(result){if(result.correct&&result.fast)return pick(copy.fast,result.turns);if(result.correct)return pick(copy.correct,result.turns);if(!result.correct&&result.long)return pick(copy.long,result.turns);return pick(copy.incorrect,result.turns);}
global.PamCopy={copy,asideFor,leadFor,guessLead,resultLine};
})(window);
