// Stable, game-facing vocabulary for Pam's 20 Questions reasoning.
// Public-source evidence is normalized into these traits; Pam never asks raw
// Wikidata/WordNet/ConceptNet predicates directly.

const t=(id,q,group,parents=[])=>({id,q,group,parents});

export const TRAITS=[
 t('living','Is it alive?','domain'),
 t('person','Is it a person?','domain'),
 t('real_person','Is it a real person?','person',['person']),
 t('animal','Is it an animal?','domain'),
 t('plant','Is it a plant?','domain'),
 t('place','Is it a place?','domain'),
 t('object','Is it a physical object?','domain'),
 t('food_drink','Is it something you can eat or drink?','domain'),
 t('media_work','Is it a creative work, like a book, movie, song, or game?','domain'),
 t('event','Is it an event or something that happened?','domain'),
 t('organization','Is it an organization, company, or group?','domain'),
 t('abstract','Is it an idea, feeling, or other abstract concept?','domain'),
 t('manmade','Was it made or created by people?','physical'),

 t('mammal','Is it a mammal?','animal',['animal']),
 t('bird','Is it a bird?','animal',['animal']),
 t('fish','Is it a fish?','animal',['animal']),
 t('reptile','Is it a reptile?','animal',['animal']),
 t('amphibian','Is it an amphibian?','animal',['animal']),
 t('insect','Is it an insect?','animal',['animal']),
 t('domesticated','Is it commonly domesticated?','animal',['animal']),
 t('pet','Is it commonly kept as a pet?','animal',['animal']),
 t('wild','Would you normally think of it as a wild animal?','animal',['animal']),
 t('flies','Can it normally fly?','animal',['animal']),
 t('swims','Does it normally spend a lot of time swimming?','animal',['animal']),

 t('tree','Is it a tree?','plant',['plant']),
 t('flower','Is it a flower?','plant',['plant']),
 t('fruit_plant','Does it grow a fruit people commonly eat?','plant',['plant']),

 t('country','Is it a country?','place',['place']),
 t('city','Is it a city or town?','place',['place']),
 t('natural_place','Is it mainly a natural place or feature?','place',['place']),
 t('building','Is it a building or major built structure?','place',['place']),
 t('landmark','Is it a famous landmark or monument?','place',['place']),
 t('water_place','Is water central to the place, like a river, lake, or ocean?','place',['place']),
 t('mountain','Is it a mountain or major peak?','place',['place']),
 t('park','Is it a park or protected outdoor area?','place',['place']),

 t('vehicle','Is it a vehicle?','object',['object']),
 t('car','Is it a car or truck?','object',['vehicle']),
 t('aircraft','Does it travel through the air?','object',['vehicle']),
 t('watercraft','Does it travel on water?','object',['vehicle']),
 t('tool','Is it a tool?','object',['object']),
 t('device','Is it a device or piece of equipment?','object',['object']),
 t('electronic','Does it use electronics?','object',['object']),
 t('furniture','Is it furniture?','object',['object']),
 t('clothing','Is it something you wear?','object',['object']),
 t('container','Is it mainly used to hold or contain something?','object',['object']),
 t('toy','Is it mainly a toy?','object',['object']),
 t('musical_instrument','Is it a musical instrument?','object',['object']),
 t('weapon','Is it mainly a weapon?','object',['object']),
 t('sports_equipment','Is it mainly used for a sport?','object',['object']),
 t('office_school','Would you commonly find it in an office or school?','object',['object']),
 t('kitchen','Would you commonly find it in a kitchen?','object',['object']),
 t('bathroom','Would you commonly find it in a bathroom?','object',['object']),
 t('outdoors','Would you normally associate it with being outdoors?','physical'),
 t('handheld','Can a person normally hold it in one hand?','physical',['object']),
 t('larger_than_person','Is it usually larger than a person?','physical',['object']),
 t('metal','Is it commonly made mostly of metal?','material',['object']),
 t('wood','Is it commonly made mostly of wood?','material',['object']),
 t('plastic','Is plastic a common major material?','material',['object']),
 t('glass','Is glass a common major material?','material',['object']),
 t('paper','Is paper or cardboard a major material?','material',['object']),
 t('fabric','Is fabric a major material?','material',['object']),
 t('round','Is it usually round or circular?','shape',['object']),
 t('soft','Is it usually soft to the touch?','physical',['object']),

 t('prepared_food','Is it a prepared food rather than a raw ingredient?','food',['food_drink']),
 t('drink','Is it a drink?','food',['food_drink']),
 t('sweet','Would most people describe it as sweet?','food',['food_drink']),
 t('baked','Is it commonly baked?','food',['food_drink']),
 t('fruit_food','Is it a fruit?','food',['food_drink']),
 t('vegetable_food','Is it a vegetable?','food',['food_drink']),
 t('meat','Is it meat or primarily made from meat?','food',['food_drink']),

 t('film','Is it a movie?','media',['media_work']),
 t('tv_series','Is it a television series?','media',['media_work']),
 t('book','Is it a book or major written work?','media',['media_work']),
 t('novel','Is it a novel?','media',['book']),
 t('play','Is it a play?','media',['book']),
 t('music_work','Is it mainly a piece of music or a recording?','media',['media_work']),
 t('song','Is it a song?','media',['music_work']),
 t('album','Is it an album?','media',['music_work']),
 t('video_game','Is it a video game?','media',['media_work']),
 t('artwork','Is it mainly known as a work of visual art?','media',['media_work']),
 t('painting','Is it a painting?','media',['artwork']),
 t('sculpture','Is it a sculpture?','media',['artwork']),
 t('animated','Is it animated?','media',['film']),
 t('fiction','Is it fictional?','media'),
 t('science_fiction','Is science fiction central to it?','media',['media_work']),
 t('fantasy','Is fantasy central to it?','media',['media_work']),

 t('fictional_character','Is it a fictional character?','person',['person']),
 t('actor','Is the person mainly known as an actor?','person',['person']),
 t('musician','Is the person mainly known for music?','person',['person']),
 t('athlete','Is the person mainly known for sports?','person',['person']),
 t('politician','Is the person mainly known for politics or government?','person',['person']),
 t('scientist','Is the person mainly known for science?','person',['person']),
 t('writer','Is the person mainly known as a writer?','person',['person']),
 t('artist','Is the person mainly known as an artist?','person',['person']),
 t('chef','Is the person mainly known for cooking or food?','person',['person']),

 t('historical_event','Is it mainly a historical event?','event',['event']),
 t('war','Is it a war or battle?','event',['event']),
 t('disaster','Is it a disaster?','event',['event']),
 t('space_event','Is space exploration central to it?','event',['event']),

 t('company','Is it a company?','organization',['organization']),
 t('brand','Is it mainly known as a brand?','organization',['organization']),
 t('sports_team','Is it a sports team?','organization',['organization']),

 t('science_concept','Is it mainly a scientific idea or phenomenon?','abstract',['abstract']),
 t('emotion','Is it an emotion or feeling?','abstract',['abstract']),
 t('time_concept','Is it closely related to time?','abstract',['abstract']),
 t('money_concept','Is it closely related to money or economics?','abstract',['abstract'])
];

export const TRAIT_BY_ID=new Map(TRAITS.map(x=>[x.id,x]));

const RULES=[
 ['person',/\b(person|human|people|individual|real person)\b/],
 ['fictional_character',/\b(fictional character|fictional person|character from fiction)\b/],
 ['real_person',/\b(real person|human being)\b/],
 ['animal',/\b(animal|fauna|creature|vertebrate|invertebrate)\b/],
 ['mammal',/\b(mammal|canine|feline|primate|rodent|cetacean|ungulate)\b/],
 ['bird',/\b(bird|avian)\b/],['fish',/\bfish\b/],['reptile',/\breptile\b/],['amphibian',/\bamphibian\b/],['insect',/\binsect\b/],
 ['plant',/\b(plant|flora|vegetation)\b/],['tree',/\btree\b/],['flower',/\bflower\b/],
 ['place',/\b(place|location|geographic|geographical|territory)\b/],['country',/\b(country|sovereign state|nation state)\b/],['city',/\b(city|town|municipality)\b/],
 ['building',/\b(building|structure|edifice|architectural structure)\b/],['landmark',/\b(landmark|monument)\b/],['mountain',/\b(mountain|peak)\b/],['park',/\bpark|national park\b/],
 ['water_place',/\b(river|lake|ocean|sea|bay|waterfall|canal)\b/],
 ['object',/\b(object|artifact|artefact|physical object|whole|instrumentality)\b/],
 ['vehicle',/\b(vehicle|transport|conveyance)\b/],['car',/\b(car|automobile|truck|pickup truck)\b/],['aircraft',/\b(aircraft|airplane|aeroplane|helicopter)\b/],['watercraft',/\b(boat|ship|watercraft|vessel)\b/],
 ['tool',/\btool\b/],['device',/\b(device|equipment|machine|appliance)\b/],['electronic',/\b(electronic|computer|digital device|electrical device)\b/],
 ['furniture',/\bfurniture\b/],['clothing',/\b(clothing|garment|apparel|wearable)\b/],['container',/\b(container|receptacle)\b/],['toy',/\btoy\b/],['musical_instrument',/\bmusical instrument\b/],['weapon',/\bweapon\b/],['sports_equipment',/\bsport(s)? equipment\b/],
 ['food_drink',/\b(food|beverage|drink|dish|ingredient|edible)\b/],['drink',/\b(beverage|drink)\b/],['fruit_food',/\bfruit\b/],['vegetable_food',/\bvegetable\b/],['meat',/\bmeat\b/],
 ['media_work',/\b(creative work|media work|publication|entertainment|artwork|literary work|musical work|film|movie|book|song|television series|video game)\b/],['film',/\b(film|movie|motion picture)\b/],['tv_series',/\b(television series|tv series|television program)\b/],
 ['book',/\b(book|written work|literary work|publication)\b/],['novel',/\bnovel\b/],['play',/\bplay|theatrical work\b/],['song',/\bsong\b/],['album',/\balbum\b/],['music_work',/\b(musical work|music|composition|recording)\b/],['video_game',/\bvideo game\b/],
 ['artwork',/\b(artwork|work of art|visual art)\b/],['painting',/\bpainting\b/],['sculpture',/\bsculpture\b/],['animated',/\banimat(ed|ion)\b/],['science_fiction',/\bscience fiction\b/],['fantasy',/\bfantasy\b/],
 ['event',/\b(event|occurrence|happening)\b/],['war',/\b(war|battle|military conflict|armed conflict)\b/],['disaster',/\b(disaster|catastrophe)\b/],
 ['organization',/\b(organization|organisation|group|institution)\b/],['company',/\b(company|business|corporation|enterprise)\b/],['brand',/\bbrand\b/],['sports_team',/\b(sports team|football club|baseball team|hockey team|basketball team)\b/],
 ['abstract',/\b(abstract|concept|idea|feeling|state|quality)\b/],['science_concept',/\b(scientific|phenomenon|theory|law of nature)\b/],['emotion',/\b(emotion|feeling)\b/]
];

const OCCUPATIONS=[
 ['actor',/\b(actor|actress|film actor|television actor)\b/],['musician',/\b(musician|singer|rapper|composer|guitarist|pianist)\b/],['athlete',/\b(athlete|footballer|baseball player|hockey player|basketball player|tennis player|racing driver)\b/],['politician',/\b(politician|president|prime minister|legislator|statesman)\b/],['scientist',/\b(scientist|physicist|chemist|biologist|astronomer|mathematician)\b/],['writer',/\b(writer|author|novelist|poet|playwright|journalist)\b/],['artist',/\b(artist|painter|sculptor|illustrator)\b/],['chef',/\b(chef|cook|restaurateur)\b/]
];

function isTaxonomicEvidence(type='') {
 const normalized=String(type||'').toLowerCase().replaceAll('_',' ').replaceAll('-',' ').trim();
 return /^(?:is ?a|instance ?of|hypernym|category|taxonomy|taxonomic|superordinate|class|subclass ?of)$/.test(normalized);
}

export function mapEvidence(evidence){
 const out=new Set();
 for(const ev of evidence||[]){
  const type=String(ev.type||'').toLowerCase();
  const raw=String(ev.trait||'').toLowerCase().replaceAll('_',' ');
  const text=`${type} ${raw}`;
  const taxonomic=isTaxonomicEvidence(type);
  // Root/subtype classification must come from taxonomy. Relationship objects are
  // not classifications of the subject (e.g. library HasA book != library IsA book).
  if(taxonomic){
   if(/\bfictional character\b|\bfictional person\b|\bcharacter from fiction\b/.test(text)) out.add('fictional_character');
   if(/\breal person\b|\bhuman being\b/.test(text)) out.add('real_person');
   for(const [id,re] of RULES) if(re.test(text)) out.add(id);
  }
  // Occupations describe people even though they are not an IsA edge in Wikidata.
  if(/\boccupation\b/.test(type)){
   if(/\bfictional character\b|\bfictional person\b|\bcharacter from fiction\b/.test(text)) out.add('fictional_character');
   for(const [id,re] of OCCUPATIONS) if(re.test(text)) out.add(id);
  }
  if(/madeof|made of|material/.test(text)){
   if(/\bmetal|steel|iron|aluminium|aluminum\b/.test(text))out.add('metal');
   if(/\bwood|wooden|timber\b/.test(text))out.add('wood');
   if(/\bplastic\b/.test(text))out.add('plastic');
   if(/\bglass\b/.test(text))out.add('glass');
   if(/\bpaper|cardboard\b/.test(text))out.add('paper');
   if(/\bfabric|cloth|textile\b/.test(text))out.add('fabric');
  }
  if(/hasproperty|has property|attribute|feature/.test(text)){
   if(/\b(round|circular)\b/.test(text))out.add('round');
   if(/\bsoft\b/.test(text))out.add('soft');
   if(/\bsweet\b/.test(text))out.add('sweet');
  }
  if(/atlocation|at location|location/.test(text)){
   if(/\b(kitchen)\b/.test(text))out.add('kitchen');
   if(/\b(bathroom|washroom)\b/.test(text))out.add('bathroom');
   if(/\b(office|school|classroom)\b/.test(text))out.add('office_school');
   if(/\b(outdoor|outside|garden|forest|road|street)\b/.test(text))out.add('outdoors');
  }
 }
 if(out.has('fictional_character')) { out.delete('real_person'); out.delete('person'); }
 if(out.has('real_person')) out.add('person');
 return expandParents(out);
}

export function expandParents(input){
 const out=new Set(input);
 const intrinsic={
  person:['living'],animal:['living'],mammal:['animal'],bird:['animal'],fish:['animal'],reptile:['animal'],amphibian:['animal'],insect:['animal'],plant:['living'],tree:['plant'],flower:['plant'],
  country:['place'],city:['place'],natural_place:['place'],building:['place','manmade'],landmark:['place'],water_place:['place'],mountain:['place'],park:['place'],
  vehicle:['object','manmade'],car:['vehicle'],aircraft:['vehicle'],watercraft:['vehicle'],tool:['object','manmade'],device:['object','manmade'],electronic:['device'],furniture:['object','manmade'],clothing:['object','manmade'],container:['object','manmade'],toy:['object','manmade'],musical_instrument:['object','manmade'],weapon:['object','manmade'],sports_equipment:['object','manmade'],
  prepared_food:['food_drink'],drink:['food_drink'],sweet:['food_drink'],baked:['prepared_food'],fruit_food:['food_drink'],vegetable_food:['food_drink'],meat:['food_drink'],
  film:['media_work','manmade'],tv_series:['media_work','manmade'],book:['media_work','manmade'],novel:['book'],play:['book'],music_work:['media_work','manmade'],song:['music_work'],album:['music_work'],video_game:['media_work','manmade'],artwork:['media_work','manmade'],painting:['artwork'],sculpture:['artwork'],animated:['film'],science_fiction:['media_work'],fantasy:['media_work'],
  real_person:['person'],fictional_character:['fiction'],actor:['person'],musician:['person'],athlete:['person'],politician:['person'],scientist:['person'],writer:['person'],artist:['person'],chef:['person'],
  historical_event:['event'],war:['event'],disaster:['event'],space_event:['event'],company:['organization'],brand:['organization'],sports_team:['organization'],science_concept:['abstract'],emotion:['abstract'],time_concept:['abstract'],money_concept:['abstract']
 };
 let changed=true;
 while(changed){changed=false;for(const id of [...out])for(const p of intrinsic[id]||[]){if(!out.has(p)){out.add(p);changed=true;}}}
 return out;
}

export function featureRecords(){
 return TRAITS.map(x=>({id:x.id,q:x.q,label:x.id,group:x.group,requires:x.parents[0]||null}));
}
