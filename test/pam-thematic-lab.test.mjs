import test from 'node:test';
import assert from 'node:assert/strict';
import {
 loadThematicRoster,traitsFromWorkBook,compileThematicModel,
 collisionAudit,applyAnswer,oracleTrial,selectQuestion
} from '../scripts/pam-thematic-lab.mjs';

const targets=await loadThematicRoster();
const model=compileThematicModel(targets);
const stats=collisionAudit(model);
const item=name=>targets.find(x=>x.name===name);

const COUNTS={
 'Cities':150,'Countries':100,'Monuments, Paintings & Sculptures':300,
 'Landmarks':200,'Bands & Music Groups':200,'People':200,'Brands':200,
 'Movies':150,'TV Shows':50,'Musicals':50,'Car Companies':50
};

test('the workbook-derived roster is complete, stable and never auto-approved',()=>{
 assert.equal(targets.length,1650);
 const seen=new Set();
 for(let i=0;i<1650;i++){
  assert.equal(targets[i].id,`PAM-${String(i+1).padStart(4,'0')}`);
  assert.equal(targets[i].review_status,'candidate_unreviewed');
  assert.ok(!seen.has(targets[i].name.toLocaleLowerCase('en')));
  seen.add(targets[i].name.toLocaleLowerCase('en'));
 }
 assert.deepEqual(Object.fromEntries(Object.keys(COUNTS).map(c=>[c,targets.filter(x=>x.category===c).length])),COUNTS);
});

test('semantic question bank is distinct, punctuated and does not filter by answer-name spelling',()=>{
 const texts=new Set();
 for(const q of model.questions){
  assert.ok(q.text.endsWith('?'),q.text);
  assert.ok(q.text.length<=145,q.text);
  assert.ok(!/(start with|name begin|letter of|alphabet|spell)/i.test(q.text),q.text);
  assert.ok(!texts.has(q.text),'Duplicate text: '+q.text);
  texts.add(q.text);
  assert.ok(q.yes>0&&q.no>0);
  assert.equal(q.known.length,1650);
  assert.equal(q.states.length,1650);
 }
 assert.ok(model.questions.length>=150);
});

test('film release years are factual dates, not inferred from title or broad subcategory',()=>{
 const x=item('The Wizard of Oz (1939)');
 assert.ok(x);
 const facts=traitsFromWorkBook(x);
 assert.equal(facts.get('movie_decade'),'1930s');
 assert.equal(facts.get('movie_period'),'before 1980');
 const y=item('Star Wars: A New Hope');
 assert.equal(traitsFromWorkBook(y).get('movie_decade'),'1970s');
});

test('scientist and artist traits follow the supplied context and do not automatically infer nationality',()=>{
 const curie=traitsFromWorkBook(item('Marie Curie'));
 assert.ok(curie.get('person_occupation').includes('physics'));
 assert.ok(curie.get('person_occupation').includes('chemistry'));
 assert.equal(curie.has('person_nationality'),false);
 const mona=traitsFromWorkBook(item('Mona Lisa'));
 assert.equal(mona.get('painting_artist'),'Leonardo da Vinci');
 assert.equal(mona.has('painting_year'),false);
});

test('questions have an explicit unknown state and do not interpret it as no',()=>{
 const q=model.questions.find(x=>x.field==='movie_decade'&&x.value==='1930s');
 const city=targets.findIndex(x=>x.name==='Montréal');
 const wizard=targets.findIndex(x=>x.name==='The Wizard of Oz (1939)');
 assert.ok(q);
 assert.equal(q.known[city],0,'year of a film is not a known fact about a city');
 assert.equal(q.known[wizard],1);
 assert.equal(q.states[wizard],3);
 const remaining=applyAnswer(model,[city,wizard],q,'yes');
 assert.deepEqual(remaining,[city,wizard],'unknown is retained, not incorrectly eliminated');
});

test('soft answers are not incorrectly treated as certain hard eliminations',()=>{
 const q=model.questions.find(x=>x.field==='movie_decade'&&x.value==='1930s');
 const targetsInMovie=targets.flatMap((x,i)=>x.category==='Movies'?[i]:[]);
 assert.ok(targetsInMovie.length>=150);
 assert.deepEqual(applyAnswer(model,targetsInMovie,q,'probably'),targetsInMovie);
 assert.deepEqual(applyAnswer(model,targetsInMovie,q,'probably_not'),targetsInMovie);
 assert.deepEqual(applyAnswer(model,targetsInMovie,q,'unknown'),targetsInMovie);
});

test('no unverified candidate can be considered launch-ready merely because it is in the list',()=>{
 assert.equal(stats.count,1650);
 assert.equal(stats.uniqueProfiles+stats.collidingProfiles,1650);
 assert.ok(stats.collidingProfiles>0,'Actual workbook coverage must be audited rather than assumed');
 assert.ok(model.questions.length>0);
});

test('the oracle never hallucinates an answer for an insufficiently differentiated class',()=>{
 const beatles=targets.findIndex(x=>x.name==='The Beatles');
 assert.ok(beatles>=0);
 const trial=oracleTrial(model,beatles,{limit:20});
 assert.equal(trial.correct,false,'The workbook lacks artist-specific Beatles traits; must not guess at random');
 assert.ok(trial.reason);
 assert.ok(trial.log.length<=20);
});

test('selection is deterministic and a family cooldown can only change eligible ranking',()=>{
 const remaining=Array.from({length:targets.length},(_,i)=>i);
 const original=selectQuestion(model,remaining);
 const copy=selectQuestion(model,remaining);
 assert.equal(original?.id,copy?.id);
 const newChoice=selectQuestion(model,remaining,new Set([original.id]));
 assert.notEqual(newChoice?.id,original.id);
});