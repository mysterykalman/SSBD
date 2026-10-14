(function(global){
"use strict";
const copy={
 bio:"Pam’s a mom. Of course she notices everything. Pick something good, honey. She’d hate to crush your spirit before dinner.",
 intro:{lead:"Okay, honey.",question:"Think of a person, place, animal, food, or thing. Write it down and lock it in.",aside:"Once it’s locked, that’s your answer. No changing your mind halfway through. I raised children. I’ll know."},
 early:["Mhm.","Okay.","Alright.","Good.","Noted."],
 middle:["That helps.","Okay. I have a direction.","Interesting.","Mhm. Keep going.","That narrows things down."],
 close:["Oh. I have you now.","Mhm. I know that look.","I think I know where this is going.","You’re getting very pleased with yourself.","Okay. Now this is interesting."],
 surprise:["Oh. Well, that changes things.","Hm. I remember what you said earlier.","That was suspiciously specific.","Very clever.","Well. You made that unnecessarily interesting."],
 hunch:["I have a pretty good idea.","Oh, I have something.","Mhm. I think I know.","I could guess now.","You may have made this too easy."],
 hunchAside:["Make me guess, or let me keep digging.","Your call. I can guess now or keep asking.","I’m ready to guess. Unless you’d like to make this harder on yourself.","We can stop here. Or you can give me more information. Very generous of you."],
 guess:["Alright. I have it.","Okay. Here’s what you’re thinking.","Mhm. I know this one.","Fine. Let’s see if I’m right.","I’m ready."],
 correct:["I knew it.","There it is.","Of course.","That’s what I thought.","Mhm. Got you."],
 fast:["That was quick. You’ll do better next time.","You made that very easy for me.","Well, that hardly seemed fair.","Very clever. For about three questions.","Sweetheart, you practically gift-wrapped that one."],
 long:["Okay, you made me work for that.","You picked a good one.","That took longer than I’d like to admit.","Well done. Annoying, but well done.","You almost had me. Don’t get used to it."],
 loss:["Okay. You got me.","Fine. That was a good one.","Alright. I’ll give you that.","Very clever. Now go put your shoes where they belong.","You got me. Enjoy this responsibly.","Fine. You win. Dinner is still at six."],
 // "Fine. I don’t know." is the stumped result line itself, so it is never also her lead.
 stumped:["Twenty questions. Hm.","Alright. You earned that one.","Well played, honey.","Okay. I’m officially annoyed."],
 stumpedResult:"Fine. I don’t know.",
 uncertain:["You picked the thing.","That’s a very committed “not sure.”","You do know what you’re thinking of, right?","Honey.","I’m going to need slightly more confidence than that."],
 probably:["Probably. Very reassuring.","I’ll take “probably.”","Good. Nothing says confidence like “probably.”","Mhm. Strong start.","We’re being brave with the word “probably” today."],
 probablyNot:["Probably not. Excellent.","I’m writing down “mostly no.”","That almost helped.","Good. Very decisive.","Mhm. Clear as mud."],
 milestones:{
  100:"One hundred points. Look at you.",
  250:"Two hundred and fifty. You’re enjoying this.",
  500:"Five hundred. Okay. Now I’m paying attention.",
  1000:"A thousand points. Very clever.",
  2000:"Two thousand. You clearly came prepared.",
  5000:"Five thousand. Fine. You’re the favourite."
 },
 callbacks:[
  {id:"kitchen",line:"You were very clear about the kitchen question. I remember these things."},
  {id:"person",line:"You said person. I remember."},
  {id:"animal",line:"The animal answer is doing a lot of work here."},
  {id:"electronic",line:"Right. Electricity. That matters."},
  {id:"household",line:"So we’re still in the house. Good."},
  {id:"food",line:"Food. I knew that was going to matter."}
 ],
 rare:[
  "This is starting to feel like the aquarium incident.",
  "You always choose something with complications.",
  "This is very you.",
  "I’m not saying you’re overthinking it. I’m noticing that you’re overthinking it.",
  "You look confident. That’s usually when I worry about you.",
  "Oh, you came prepared. Cute.",
  "You’re making me work for it. Rude.",
  "I was going to go easy on you. Then you did that.",
  "Very clever. Now behave yourself.",
  "I have raised people with better poker faces than this. Fortunately, that is completely irrelevant here."
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
 if(state.number===11||state.number===17){
  // Which rare line depends on the game's answers so far, so different games hear different ones.
  const seed=(state.history||[]).reduce((sum,h)=>sum+String(h.answer||"").length+String(h.id||"").length,0);
  return pick(copy.rare,state.number+seed);
 }
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
function resultAside(){return"";}
function milestoneLine(points){return copy.milestones[points]||"";}
global.PamCopy={copy,leadFor,hunchLead,hunchAside,guessLead,resultLine,resultAside,reactionFor,milestoneLine};
})(window);
