(function(global){
"use strict";
const copy={
 bio:"Pam remembers where you left your shoes, what you said three Tuesdays ago, and exactly when you started making up an excuse. She does not consider this nosy. She considers it paying attention.",
 intro:{lead:"Okay, honey.",question:"Think of a common person, place, animal, food, or thing. Don’t tell me.",aside:"I get up to 20 questions and one guess. No changing your mind halfway through. I’ll know."},
 early:["Mhm.","Okay.","Alright.","Good."],
 middle:["That helps.","I’m getting somewhere.","Okay. I have a direction.","Interesting."],
 close:["Oh, I have you now.","No, no. I’ve got something.","I think I know where this is going.","You look very pleased with yourself."],
 surprise:["Oh. Well, that changes things.","Hm. I’m remembering what you said earlier.","That answer was suspiciously specific.","Okay. I’m going to pretend that helped."],
 hunch:["I have a pretty good idea.","Oh, I have something.","I could make a guess right now.","Mhm. I think I know."],
 hunchAside:["You can make me say it, or buy me another question.","Your call. I can guess now, or keep asking.","You can make me lock it in, or give me one more question."],
 guess:["Alright. I have it.","Okay. Here’s what you’re thinking.","I know this one."],
 correct:["I knew it.","There it is.","Of course.","That’s what I thought."],
 fast:["That was practically written on your face.","See? This is why moms don’t need instructions.","You made that very easy for me."],
 long:["You picked a good one.","Okay, you made me work for that.","That was more complicated than it needed to be."],
 loss:["Okay. You got me.","Fine. That was a good one.","Alright. I’ll give you that."],
 stumped:["Twenty questions. Nothing.","Okay. I officially don’t know.","Fine. You found one."],
 uncertain:["You picked the thing.","That’s a very committed ‘not sure.’","You do know what you’re thinking of, right?"],
 probably:["Probably. Very reassuring.","I’ll take ‘probably.’","Good. Nothing says confidence like ‘probably.’"],
 probablyNot:["Probably not. Excellent.","That narrows it down almost enough to be useful.","I’m writing down ‘mostly no.’"],
 milestones:{
  100:"One hundred points. I’ve noticed.",
  250:"Two hundred and fifty. You’re enjoying this too much.",
  500:"Five hundred. Okay. This is becoming a thing.",
  1000:"A thousand points. I’m going to remember this.",
  2000:"Two thousand. You clearly came prepared.",
  5000:"Five thousand. Fine. Family legend. Happy?"
 },
 callbacks:[
  {id:"kitchen",line:"You were very clear about the kitchen question. I’m keeping that."},
  {id:"person",line:"You said person. I remember these things."},
  {id:"animal",line:"The animal answer is doing a lot of work here."},
  {id:"electronic",line:"Right. Electricity. That matters."},
  {id:"household",line:"So we’re still in the house. Good."},
  {id:"food",line:"Food. I knew that was going to matter."}
 ],
 rare:[
  "This is starting to feel like the aquarium incident.",
  "You always choose something with complications.",
  "This is very you.",
  "I’m not saying you’re overthinking it. I’m noticing that you’re overthinking it."
 ]
};
const pick=(arr,n)=>arr[Math.abs((Number(n)||1)-1)%arr.length];
function reactionFor(state){
 const prev=state&&state.previous;
 if(!prev)return"";
 if(prev.answer==="unknown")return pick(copy.uncertain,state.number);
 if(prev.answer==="probably"&&state.number%3===0)return pick(copy.probably,state.number);
 if(prev.answer==="probably_not"&&state.number%3===1)return pick(copy.probablyNot,state.number);
 if(state.surprise)return pick(copy.surprise,state.number);
 if(state.number>=7&&state.number%5===0){
  const hit=copy.callbacks.find(c=>(state.history||[]).some(h=>h.id===c.id&&["yes","probably"].includes(h.answer)));
  if(hit)return hit.line;
 }
 if(state.number===11||state.number===17)return pick(copy.rare,state.number);
 return"";
}
function leadFor(state){
 const n=state.number,max=state.maxQuestions;
 const reaction=reactionFor(state);
 if(reaction)return reaction;
 if(n>=Math.max(6,max-4))return pick(copy.close,n);
 if(n>=5)return pick(copy.middle,n);
 return pick(copy.early,n);
}
function hunchLead(n){return pick(copy.hunch,n);}
function hunchAside(n){return pick(copy.hunchAside,n);}
function guessLead(n){return pick(copy.guess,n);}
function resultLine(result){
 if(result.stumped)return pick(copy.stumped,result.turns||20);
 if(result.correct&&result.fast)return pick(copy.fast,result.turns);
 if(result.correct&&result.long)return pick(copy.long,result.turns);
 if(result.correct)return pick(copy.correct,result.turns);
 return pick(copy.loss,result.turns);
}
function resultAside(result){
 if(result.stumped)return`You made it through all 20. ${result.score} points.`;
 if(result.correct)return`${result.score} points. ${result.fast?"You were not subtle.":result.long?"And with very little cooperation.":"Mom knows."}`;
 return`${result.score} points. A wrong guess is still a wrong guess.`;
}
function milestoneLine(points){return copy.milestones[points]||"";}
global.PamCopy={copy,leadFor,hunchLead,hunchAside,guessLead,resultLine,resultAside,reactionFor,milestoneLine};
})(window);
