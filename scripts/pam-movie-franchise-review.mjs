/**
 * Conservative franchise collision review. No candidate is automatically removed.
 * Exact curated title memberships only: never infer franchise from a title prefix.
 * A flagged row stays unapproved until an editor verifies and chooses a replacement.
 */
export const MOVIE_FRANCHISES=Object.freeze({
 'Jurassic Park':['Jurassic Park','The Lost World: Jurassic Park','Jurassic Park III','Jurassic World','Jurassic World: Fallen Kingdom','Jurassic World Dominion','Jurassic World Rebirth'],
 'Batman':['Batman (1989 film)','Batman','Batman Returns','Batman Forever','Batman & Robin','Batman Begins','The Dark Knight','The Dark Knight Rises','The Batman'],
 'Star Wars':['Star Wars: A New Hope','Star Wars','The Empire Strikes Back','Return of the Jedi','The Phantom Menace','Attack of the Clones','Revenge of the Sith','The Force Awakens','The Last Jedi','The Rise of Skywalker','Rogue One: A Star Wars Story','Solo: A Star Wars Story'],
 'The Lord of the Rings':['The Lord of the Rings: The Fellowship of the Ring','The Lord of the Rings: The Two Towers','The Lord of the Rings: The Return of the King','The Hobbit: An Unexpected Journey','The Hobbit: The Desolation of Smaug','The Hobbit: The Battle of the Five Armies'],
 'Toy Story':['Toy Story','Toy Story 2','Toy Story 3','Toy Story 4'],
 'Shrek':['Shrek','Shrek 2','Shrek the Third','Shrek Forever After'],
 'The Godfather':['The Godfather','The Godfather Part II','The Godfather Part III'],
 'Back to the Future':['Back to the Future','Back to the Future Part II','Back to the Future Part III'],
 'Indiana Jones':['Raiders of the Lost Ark','Indiana Jones and the Temple of Doom','Indiana Jones and the Last Crusade','Indiana Jones and the Kingdom of the Crystal Skull','Indiana Jones and the Dial of Destiny'],
 'Avatar':['Avatar (2009 film)','Avatar','Avatar: The Way of Water','Avatar: Fire and Ash'],
 'The Matrix':['The Matrix','The Matrix Reloaded','The Matrix Revolutions','The Matrix Resurrections'],
 'Spider-Man':['Spider-Man (2002 film)','Spider-Man','Spider-Man 2','Spider-Man 3','The Amazing Spider-Man','The Amazing Spider-Man 2','Spider-Man: Homecoming','Spider-Man: Far From Home','Spider-Man: No Way Home','Spider-Man: Into the Spider-Verse','Spider-Man: Across the Spider-Verse'],
 'Frozen':['Frozen (2013 film)','Frozen','Frozen II'],
 'Finding Nemo':['Finding Nemo','Finding Dory'],
 'The Lion King':['The Lion King (1994 film)','The Lion King','The Lion King II: Simba’s Pride','Mufasa: The Lion King'],
 'Alien':['Alien','Alien (1979 film)','Aliens','Alien 3','Alien: Resurrection','Prometheus','Alien: Covenant','Alien: Romulus'],
 'Terminator':['The Terminator','Terminator 2: Judgment Day','Terminator 3: Rise of the Machines','Terminator Salvation','Terminator Genisys','Terminator: Dark Fate'],
 'Harry Potter':['Harry Potter and the Philosopher\'s Stone','Harry Potter and the Sorcerer\'s Stone','Harry Potter and the Chamber of Secrets','Harry Potter and the Prisoner of Azkaban','Harry Potter and the Goblet of Fire','Harry Potter and the Order of the Phoenix','Harry Potter and the Half-Blood Prince','Harry Potter and the Deathly Hallows: Part 1','Harry Potter and the Deathly Hallows: Part 2'],
 'Dune':['Dune (2021 film)','Dune','Dune: Part Two','Dune: Part Three'],
 'Inside Out':['Inside Out (2015 film)','Inside Out','Inside Out 2'],
 'Top Gun':['Top Gun','Top Gun (1986)','Top Gun: Maverick'],
 'Avengers':['The Avengers','The Avengers (2012 film)','Avengers: Age of Ultron','Avengers: Infinity War','Avengers: Endgame'],
 'Bourne':['The Bourne Identity','The Bourne Supremacy','The Bourne Ultimatum','The Bourne Legacy','Jason Bourne'],
 'Pirates of the Caribbean':['Pirates of the Caribbean: The Curse of the Black Pearl','Pirates of the Caribbean: Dead Man\'s Chest','Pirates of the Caribbean: At World\'s End','Pirates of the Caribbean: On Stranger Tides','Pirates of the Caribbean: Dead Men Tell No Tales'],
 'Hunger Games':['The Hunger Games (2012 film)','The Hunger Games','The Hunger Games: Catching Fire','The Hunger Games: Mockingjay – Part 1','The Hunger Games: Mockingjay – Part 2'],
 'Kill Bill':['Kill Bill: Volume 1','Kill Bill: Volume 2'],
 'Jumanji':['Jumanji (1995 film)','Jumanji','Jumanji: Welcome to the Jungle','Jumanji: The Next Level'],
 'Mad Max':['Mad Max','Mad Max 2','Mad Max Beyond Thunderdome','Mad Max: Fury Road','Furiosa: A Mad Max Saga'],
 'Rocky':['Rocky','Rocky II','Rocky III','Rocky IV','Rocky V','Rocky Balboa','Creed','Creed II','Creed III'],
 'Monsters Inc':['Monsters, Inc.','Monsters University'],
 'Wicked':['Wicked (2024 film)','Wicked: For Good'],
 'Knives Out':['Knives Out (2019)','Knives Out','Glass Onion: A Knives Out Mystery','Wake Up Dead Man: A Knives Out Mystery']

});
export const normalizeMovieTitle=s=>String(s).normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
export const PREFERRED_FRANCHISE_FILMS=Object.freeze({
 'Batman':'The Dark Knight','Spider-Man':'Spider-Man: Into the Spider-Verse',
 'Star Wars':'Star Wars: A New Hope','Terminator':'The Terminator',
 'The Lord of the Rings':'The Lord of the Rings: The Fellowship of the Ring',
 'Toy Story':'Toy Story','Alien':'Alien','Avengers':'The Avengers (2012 film)',
 'Top Gun':'Top Gun (1986)','Dune':'Dune (2021 film)',
 'Inside Out':'Inside Out (2015 film)','The Godfather':'The Godfather',
 'Jurassic Park':'Jurassic Park','Frozen':'Frozen (2013 film)',
 'Knives Out':'Knives Out (2019)','Wicked':'Wicked (2024 film)'
});
const index=new Map();
for(const [franchise,titles] of Object.entries(MOVIE_FRANCHISES))
 for(const title of titles){
  const key=normalizeMovieTitle(title);
  if(index.has(key))throw Error('Conflicting curated movie franchise membership: '+title);
  index.set(key,franchise);
 }
export function movieFranchiseForTitle(title){
 const full=normalizeMovieTitle(title);
 return index.get(full)||index.get(full.replace(/\s+\d{4}(?:\s+film)?$/,''))||null;
}
export function selectMovieFranchiseRepresentatives(rows){
 const families=new Map();
 for(const row of rows){if(row.category!=='Movies')continue;
  const family=movieFranchiseForTitle(row.name);if(!family)continue;
  if(!families.has(family))families.set(family,[]);
  families.get(family).push(row);
 }
 const exclude=[],retained=[];
 for(const [family,members] of families){
  const preference=normalizeMovieTitle(PREFERRED_FRANCHISE_FILMS[family]||'');
  const keeper=members.find(x=>normalizeMovieTitle(x.name)===preference)||members[0];
  retained.push({family,id:keeper.id,name:keeper.name});
  for(const x of members){if(x.id===keeper.id)continue;
   exclude.push({family,id:x.id,name:x.name,retainedId:keeper.id,retainedName:keeper.name,
    reason:'One playable film per franchise; new candidate excluded from staged playable pool'});
  }
 }
 return{retained,exclude,needsVerifiedReplacement:exclude.length};
}
export function flagMovieFranchiseCollisions(rows){
 const groups=new Map(),unmapped=[];
 for(const row of rows){
  if(row.category!=='Movies')continue;
  const franchise=movieFranchiseForTitle(row.name);
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
