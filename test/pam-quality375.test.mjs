import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {loadPamClassicModel,pamTraitIndex} from '../scripts/pam-classic-model.mjs';

const ROOT=process.cwd();
const qualityDoc=JSON.parse(await readFile(path.join(ROOT,'data','pam20q','quality','quality-375.json'),'utf8'));
const {questions,targets,weights,baseTargetCount,extensionCount}=await loadPamClassicModel();
const intendedNames=["marble","lighter","washing machine","submarine","mop","pinball","leaf","strainer","blowtorch","bench","radiator","crutch","cooler","cash register","kettle","helmet","wagon","television","gong","bulldozer","cabinet","sprinkler","raspberry","clamp","tripod","plunger","electric scooter","beetle","lantern","bed","bush","crayon","remote control","rollerblade","radio","harp","mousetrap","apricot","water heater","lemonade","papaya","avocado","measuring cup","wheelbarrow","banjo","wrench","almond","hula hoop","megaphone","magnifier","barrel","trailer","nutcracker","pavement","hoe","saltshaker","whiteboard","carafe","antenna","limousine","mat","bean","gourd","wardrobe","stretcher","shredder","flask","grill","duffel bag","chisel","pulley","canister","squash","sandbox","barrette","projector","vending machine","hose","funnel","vise","chili","ladle","salad","beaver","marmot","pom-pom","smoothie","nectarine","hearing aid","garbage truck","clock tower","hibiscus","playpen","beaker","basketball hoop","chihuahua","hourglass","paperweight","fishbowl","barn","gate","tuba","cassette","propeller","garage","domino","shower curtain","pebble","tamale","walnut","jukebox","cauldron","mackerel","curtain","pinwheel","bookshelf","noisemaker","ski lift","coat rack","hammock","carousel","seesaw","tambourine","stopwatch","footrest","tape recorder","cap","mud","brace","ficus","mixer","shell","mortar","pump","reel","seed","frame","keyboard","wheelchair","windshield wiper","gift","blimp","circus","lumber","anemone","chariot","railing","trombone","cellphone","washboard","peppermint","police car","soldering iron","tap","cola","hawk","loom","soap","badge","chute","guava","pedal","tower","engine","glider","marker","meteor","slicer","blowfish","driveway","chinaware","incubator","snowboard","convertible","photocopier","answering machine","lid","buoy","dove","sack","sink","tail","tile","wasp","pecan","stamp","stilt","binder","bumper","cotton","cymbal","dinghy","pallet","eclipse","cardinal","monument","touchpad","dollhouse","headlight","telegraph","grapefruit","train set","Dump truck","serving dish","ping-pong table","fog","pug","claw","coil","cord","cork","dome","ramp","sail","cabin","cloth","kazoo","laser","spade","stall","tongs","tooth","fiddle","locker","muscle","puppet","rudder","stylus","webcam","anchovy","counter","crowbar","leather","stomach","barbecue","eggplant","figurine","mulberry","odometer","amplifier","cartridge","windshield","breathalyzer","defibrillator","Shot put","petri dish","orange juice","watering can","cutting board","microwave oven","ax","rag","yak","bark","cane","cart","crib","curb","dill","fish","hull","knot","plug","root","altar","blade","chess","quill","straw","bonsai","bureau","camper","cattle","hanger","hurdle","rattle","velcro","ceiling","hairpin","inkwell","uniform","cockatoo","briefcase","casserole","milkshake","seat belt","cookie jar","totem pole","coffee table","water cooler","computer screen","rearview mirror","moss","nest","pond","shed","silk","vent","yoyo","basin","brook","chime","coast","crate","crown","motel","mural","nacho","pager","pasta","patio","ruler","storm","coffin","marlin","peeler","tuxedo","blossom","garland","notepad","roaster","stirrup","magnolia","polisher","cardboard","harvester","hurricane","periscope","pistachio","dishwasher","flip-flop","towel rack","grocery store","rocking horse","stained glass","bulletin board","brass","petal","sauce","spool","torch","fender","nutmeg","possum","shield","urinal","capsule","goggles","seabird","turbine","walkman","wildcat","internet","escalator","mistletoe","reflector","taillight","chessboard","rollerskate","ski pole","gas pedal","fire alarm","bus station","dried fruit","napkin ring","waffle iron","laser pointer","parking meter","first-aid kit","ash","ham","hay","ivy","keg","oar"];
const intendedSet=new Set(intendedNames.map(name=>name.toLowerCase()));
const byName=new Map(qualityDoc.profiles.map(profile=>[String(profile.name).toLowerCase(),profile]));
const qualityProfiles=intendedNames.map(name=>byName.get(name.toLowerCase())).filter(Boolean);
assert.equal(intendedNames.length,375);
assert.equal(qualityProfiles.length,375,'quality staging file is missing one or more intended profiles');

function stateAtFor(modelWeights,modelTargets,q,t){return modelWeights[q*modelTargets.length+t];}
function categoryForModel(modelWeights,modelTargets,targetIndex){
 let best='other',bestScore=-Infinity;
 for(const [name,q] of Object.entries({animal:0,vegetable:1,mineral:2,other:3})){
  const state=stateAtFor(modelWeights,modelTargets,q,targetIndex),score=(state&1)?((state&2)?3:2):((state&2)?0:1);
  if(score>bestScore){bestScore=score;best=name;}
 }
 return best;
}
function oracleAnswerFor(modelWeights,modelTargets,q,targetIndex){const state=stateAtFor(modelWeights,modelTargets,q,targetIndex);return (state&1)?((state&2)?'yes':'probably'):((state&2)?'no':'doubtful');}
async function makeEngine(modelTargets,modelWeights,suffix){
 global.window={PAM_CLASSIC_MODEL:{questions,targets:modelTargets,weightsB64:modelWeights.toString('base64'),layout:'question-major',states:4,baseTargets:baseTargetCount,extensionTargets:modelTargets.length-baseTargetCount}};
 if(!global.atob)global.atob=value=>Buffer.from(value,'base64').toString('binary');
 await import(`${pathToFileURL(path.join(ROOT,'src','client','mom-mode','engine.js')).href}?${suffix}`);
 return window.PamClassic20Q;
}
function playWith(engine,modelWeights,modelTargets,targetIndex,{noise=false}={}){
 const game=engine.createGame({budget:20,minGuessQuestions:7});
 let next=engine.choose(game);
 assert.equal(next.kind,'category');
 next=engine.setCategory(game,categoryForModel(modelWeights,modelTargets,targetIndex));
 let softenedYes=false,softenedNo=false;
 for(let guard=0;guard<50;guard++){
  if(next.kind==='question'){
   let answer=oracleAnswerFor(modelWeights,modelTargets,next.index,targetIndex);
   if(noise&&answer==='yes'&&!softenedYes){answer='probably';softenedYes=true;}
   else if(noise&&answer==='no'&&!softenedNo){answer='doubtful';softenedNo=true;}
   next=engine.answer(game,next,answer);continue;
  }
  if(next.kind==='hunch'){next=next.index===targetIndex?engine.commitGuess(game,next):engine.deferGuess(game,next);continue;}
  if(next.kind==='guess')return next;
  throw new Error(`Unexpected Pam state ${next.kind}`);
 }
 throw new Error('Pam did not produce a guess');
}
function compileQualityProfile(profile){
 const states=new Uint8Array(questions.length);states.fill(2);
 const categoryIndex={animal:0,vegetable:1,mineral:2,other:3}[profile.category];
 if(categoryIndex==null)throw new Error(`Unknown quality category ${profile.category} for ${profile.name}`);
 for(let q=0;q<4;q++)states[q]=q===categoryIndex?3:2;
 const apply=(key,value)=>{const index=pamTraitIndex[key];if(index==null)throw new Error(`Unknown quality trait ${key} for ${profile.name}`);states[index]=value;};
 for(const key of profile.yes||[])apply(key,3);
 for(const key of profile.weakYes||[])apply(key,1);
 for(const key of profile.no||[])apply(key,2);
 return states;
}

const qualitySeen=new Set(targets.map(name=>String(name).trim().toLowerCase()));
for(const profile of qualityProfiles){const key=String(profile.name).trim().toLowerCase();assert.ok(!qualitySeen.has(key),`quality target duplicates existing target exactly: ${profile.name}`);qualitySeen.add(key);}
const qualityTargets=[...targets,...qualityProfiles.map(p=>p.name)];
const qualityWeights=Buffer.alloc(questions.length*qualityTargets.length);
for(let q=0;q<questions.length;q++)weights.copy(qualityWeights,q*qualityTargets.length,q*targets.length,(q+1)*targets.length);
for(let e=0;e<qualityProfiles.length;e++){const states=compileQualityProfile(qualityProfiles[e]);const targetIndex=targets.length+e;for(let q=0;q<questions.length;q++)qualityWeights[q*qualityTargets.length+targetIndex]=states[q];}
const BaselineEngine=await makeEngine(targets,weights,'quality-baseline');
const QualityEngine=await makeEngine(qualityTargets,qualityWeights,'quality-375');

test('375 quality candidates are structurally valid in the real Pam model',()=>{
 assert.equal(baseTargetCount,1200);assert.equal(extensionCount,200);assert.equal(targets.length,1400);assert.equal(qualityProfiles.length,375);assert.equal(qualityTargets.length,1775);assert.equal(QualityEngine.N,1775);assert.equal(QualityEngine.F,156);assert.equal(qualityWeights.length,276900);assert.equal(new Set(qualityTargets.map(name=>name.toLowerCase())).size,qualityTargets.length);
});

test('375 quality candidates achieve exact full-model self-play',()=>{
 let exact=0;const failures=[];
 for(let i=0;i<qualityProfiles.length;i++){const index=targets.length+i;const guess=playWith(QualityEngine,qualityWeights,qualityTargets,index);if(guess.index===index)exact++;else failures.push({target:qualityTargets[index],guess:guess.label,guessIndex:guess.index});}
 console.log(`PAM_QUALITY_375_EXACT=${exact}/${qualityProfiles.length}`);if(failures.length)console.log('PAM_QUALITY_375_MISSES='+JSON.stringify(failures));assert.equal(exact,qualityProfiles.length,`375 quality batch has ${failures.length} full-model self-play misses`);
});

test('adding the 375 candidates does not change deterministic baseline guesses',()=>{
 const changed=[];for(let index=0;index<targets.length;index++){const before=playWith(BaselineEngine,weights,targets,index);const after=playWith(QualityEngine,qualityWeights,qualityTargets,index);if(before.label!==after.label)changed.push({target:targets[index],before:before.label,after:after.label});}
 console.log(`PAM_QUALITY_375_BASELINE_CHANGED=${changed.length}/${targets.length}`);if(changed.length)console.log('PAM_QUALITY_375_BASELINE_CHANGES='+JSON.stringify(changed));assert.equal(changed.length,0,`375 quality batch changes ${changed.length} existing deterministic guesses`);
});

test('375 quality candidates remain robust to one softened yes and one softened no',()=>{
 let exact=0;const failures=[];for(let i=0;i<qualityProfiles.length;i++){const index=targets.length+i;const guess=playWith(QualityEngine,qualityWeights,qualityTargets,index,{noise:true});if(guess.index===index)exact++;else failures.push({target:qualityTargets[index],guess:guess.label});}
 const rate=exact/qualityProfiles.length;console.log(`PAM_QUALITY_375_NOISE=${exact}/${qualityProfiles.length} (${(rate*100).toFixed(1)}%)`);if(failures.length)console.log('PAM_QUALITY_375_NOISE_MISSES='+JSON.stringify(failures));assert.ok(rate>=0.90,`375 quality noise self-play ${(rate*100).toFixed(1)}% is below 90%`);
});
