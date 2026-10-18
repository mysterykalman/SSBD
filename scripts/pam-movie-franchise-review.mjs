/**
 * Conservative franchise collision review. No candidate is automatically removed.
 * Exact curated title memberships only: never infer franchise from a title prefix.
 * A flagged row stays unapproved until an editor verifies and chooses a replacement.
 */
export const MOVIE_FRANCHISES=Object.freeze({
 'Jurassic Park':['Jurassic Park','The Lost World: Jurassic Park','Jurassic Park III','Jurassic World','Jurassic World: Fallen Kingdom','Jurassic World Dominion','Jurassic World Rebirth'],
 'Batman':['Batman','Batman Returns','Batman Forever','Batman & Robin','Batman Begins','The Dark Knight','The Dark Knight Rises','The Batman'],
 'Star Wars':['Star Wars','The Empire Strikes Back','Return of the Jedi','The Phantom Menace','Attack of the Clones','Revenge of the Sith','The Force Awakens','The Last Jedi','The Rise of Skywalker','Rogue One: A Star Wars Story','Solo: A Star Wars Story'],
 'The Lord of the Rings':['The Lord of the Rings: The Fellowship of the Ring','The Lord of the Rings: The Two Towers','The Lord of the Rings: The Return of the King','The Hobbit: An Unexpected Journey','The Hobbit: The Desolation of Smaug','The Hobbit: The Battle of the Five Armies'],
 'Toy Story':['Toy Story','Toy Story 2','Toy Story 3','Toy Story 4'],
 'Shrek':['Shrek','Shrek 2','Shrek the Third','Shrek Forever After'],
 'The Godfather':['The Godfather','The Godfather Part II','The Godfather Part III'],
 'Back to the Future':['Back to the Future','Back to the Future Part II','Back to the Future Part III'],
 'Indiana Jones':['Raiders of the Lost Ark','Indiana Jones and the Temple of Doom','Indiana Jones and the Last Crusade','Indiana Jones and the Kingdom of the Crystal Skull','Indiana Jones and the Dial of Destiny'],
 'Avatar':['Avatar','Avatar: The Way of Water','Avatar: Fire and Ash'],
 'The Matrix':['The Matrix','The Matrix Reloaded','The Matrix Revolutions','The Matrix Resurrections'],
 'Spider-Man':['Spider-Man','Spider-Man 2','Spider-Man 3','The Amazing Spider-Man','The Amazing Spider-Man 2','Spider-Man: Homecoming','Spider-Man: Far From Home','Spider-Man: No Way Home','Spider-Man: Into the Spider-Verse','Spider-Man: Across the Spider-Verse'],
 'Frozen':['Frozen','Frozen II'],
 'Finding Nemo':['Finding Nemo','Finding Dory'],
 'The Lion King':['The Lion King','The Lion King II: Simba’s Pride','Mufasa: The Lion King']
});
const normalize=s=>String(s).normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
const index=new Map();
for(const [franchise,titles] of Object.entries(MOVIE_FRANCHISES))
 for(const title of titles){
  const key=normalize(title);
  if(index.has(key))throw Error('Conflicting curated movie franchise membership: '+title);
  index.set(key,franchise);
 }
export function flagMovieFranchiseCollisions(rows){
 const groups=new Map(),unmapped=[];
 for(const row of rows){
  if(row.category!=='Movies')continue;
  const franchise=index.get(normalize(row.name));
  if(!franchise){unmapped.push(row.id);continue;}
  if(!groups.has(franchise))groups.set(franchise,[]);
  groups.get(franchise).push(row);
 }
 const collisions=[...groups].filter(([,entries])=>entries.length>1).map(([franchise,entries])=>({
  franchise,candidateIds:entries.map(r=>r.id),candidateNames:entries.map(r=>r.name),
  editorialDecision:'PENDING_KEEP_ONE_OR_REPLACE',automaticRemoval:false
 }));
 return {status:'REVIEW_ONLY',collisions,unmappedCandidateIds:unmapped,
  caution:'Curated list is not exhaustive; unmapped films still require editorial franchise review'};
}
