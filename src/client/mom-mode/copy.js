(function(global) {
"use strict";
const copy = {
 bio:"Pam somehow knows what happened before you've finished explaining it. She's cheerful, patient, a little nosy, and remembers everything. Every mystery is a chance for a tiny life lesson. She's usually right, and she'll remind you.",
 intro:{lead:"Hello, honey. Come sit for a minute.",question:"Think of absolutely anything. Keep it to yourself. I'll figure it out.",aside:"I already have a hunch. But go on, make it interesting."},
 early:["All right. Let's see what we're working with.","Mm-hmm. That's helpful."],
 middle:["Oh, I have a few ideas.","This is starting to sound familiar."],
 close:["Now I have a pretty good idea.","Just one more thing."],
 guess:"All right, I'm going to say it.",
 correct:{lead:"There it is!",question:"I knew it. I just wanted to hear you say it.",aside:"Would you like some lemonade?"},
 incorrect:{lead:"Well, would you look at that.",question:"You got one past me.",aside:"I'll remember this. And I do remember everything."},
 replay:"Another one? Lovely. I've got all afternoon.",
 exit:"All right, dear. Don't forget your jacket.",
 asides:[
 [/person|human|someone|character/i,"I probably know their mother."],
 [/fly|flying|airplane|plane/i,"Text me when you land."],
 [/fragile|break|delicate/i,"Then maybe use two hands."],
 [/bedroom|your room/i,"Speaking of which, clean your room."],
 [/food|eat|edible|fruit/i,"Save room for dinner."],
 [/batter|electric/i,"We never have the right batteries."],
 [/water|swim|ocean/i,"Janice insists walking to the pool counts as exercise."],
 [/pet|animal|fur/i,"If it sheds, you're in charge of the vacuum."]
 ]
};
const asideFor=(q,n)=>n%2===0?(copy.asides.find(([p])=>p.test(q))||[])[1]||"":"";
const leadFor=(n,max)=>n>=Math.max(4,max-3)?copy.close[(n-1)%copy.close.length]:n>=3?copy.middle[(n-1)%copy.middle.length]:copy.early[(n-1)%copy.early.length];
global.PamCopy={copy,asideFor,leadFor};
})(window);
