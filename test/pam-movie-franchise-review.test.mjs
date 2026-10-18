import test from 'node:test';
import assert from 'node:assert/strict';
import {movieFranchiseForTitle,selectMovieFranchiseRepresentatives,
 flagMovieFranchiseCollisions} from '../scripts/pam-movie-franchise-review.mjs';
const rows=names=>names.map((name,i)=>({id:'PAM-'+String(i+1).padStart(4,'0'),
 name,category:'Movies'}));
test('curated film sequels normalize year disambiguators and common alternate franchise titles',()=>{
 for(const [title,expected] of [
  ['Batman (1989 film)','Batman'],['The Dark Knight','Batman'],
  ['Star Wars: A New Hope','Star Wars'],['The Empire Strikes Back','Star Wars'],
  ['The Terminator','Terminator'],['Terminator 2: Judgment Day','Terminator'],
  ['Aliens','Alien'],['Dune: Part Two','Dune'],
  ['Inside Out 2','Inside Out'],['Inside Out (2015 film)','Inside Out'],
  ['Toy Story 3','Toy Story'],['Top Gun: Maverick','Top Gun'],
  ['The Lord of the Rings: The Return of the King','The Lord of the Rings'],
  ['Avengers: Infinity War','Avengers'],
  ['Spider-Man: No Way Home','Spider-Man'],
  ['Harry Potter and the Philosopher\'s Stone','Harry Potter'],
  ['Wicked (2024 film)','Wicked'],
 ])assert.equal(movieFranchiseForTitle(title),expected,title);
 assert.equal(movieFranchiseForTitle('Citizen Kane'),null);
 assert.equal(movieFranchiseForTitle('The Shawshank Redemption'),null);
});
test('one representative per franchise excludes sibling films while preserving isolated standalone films',()=>{
 const options=rows(['Batman (1989 film)','Batman Begins','The Dark Knight',
 'The Terminator','Terminator 2: Judgment Day','Dune (2021 film)','Dune: Part Two',
 'Citizen Kane','Arrival','Star Wars: A New Hope','Return of the Jedi']);
 const selected=selectMovieFranchiseRepresentatives(options);
 assert.equal(selected.exclude.length,5);
 assert.equal(selected.retained.find(x=>x.family==='Batman')?.name,'The Dark Knight');
 assert.equal(selected.retained.find(x=>x.family==='Terminator')?.name,'The Terminator');
 assert.equal(selected.retained.find(x=>x.family==='Star Wars')?.name,'Star Wars: A New Hope');
 assert.equal(selected.retained.find(x=>x.family==='Dune')?.name,'Dune (2021 film)');
 assert.equal(flagMovieFranchiseCollisions(options).collisions.length,4);
 assert.equal(options.length,11,'the research list is preserved for provenance');
});
