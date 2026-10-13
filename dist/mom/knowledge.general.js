(function(global){
"use strict";

// Curated general-knowledge anchors for Stump Mom. This layer covers cultural,
// historical, scientific and product concepts that a broadly knowledgeable adult
// could reasonably know, with reusable traits designed for 20 Questions.
const FEATURES=[];
const OBJECTS=[];
const feature=(id,q,group,requires)=>FEATURES.push({id,q,label:id,group,...(requires?{requires}:{})});
const add=(name,kind,yes=[],opts={})=>OBJECTS.push({name,kind,proper:opts.proper??true,article:opts.article,weight:opts.weight||2.2,source:"general-knowledge",yes:[...new Set(yes)],maybe:opts.maybe||[]});

// Domain gates. These are deliberately broad so Pam establishes what kind of
// thing she is dealing with before asking niche questions.
feature("gk_artwork","Is it mainly known as a work of art?","culture","manmade");
feature("gk_sculpture","Is it a sculpture?","culture","gk_artwork");
feature("gk_painting","Is it a painting?","culture","gk_artwork");
feature("gk_human_figure","Does it depict a human figure?","culture","gk_artwork");
feature("gk_marble","Is it made primarily of marble?","culture","gk_sculpture");
feature("gk_ancient","Is it from the ancient world?","history","manmade");
feature("gk_greek","Is it strongly associated with ancient Greece?","history","gk_ancient");
feature("gk_roman","Is it strongly associated with ancient Rome?","history","gk_ancient");
feature("gk_museum","Would you strongly associate it with a major museum?","culture","manmade");
feature("gk_louvre","Is it strongly associated with the Louvre?","culture","gk_museum");
feature("gk_landmark","Is it a famous landmark or monument?","place","place");
feature("gk_building","Is it a building or major built structure?","place","gk_landmark");
feature("gk_tower","Is it a tower?","place","gk_building");
feature("gk_bridge","Is it a bridge?","place","gk_building");
feature("gk_statue_monument","Is it a monumental statue?","place","gk_landmark");
feature("gk_europe","Is it strongly associated with Europe?","place","gk_landmark");
feature("gk_usa","Is it strongly associated with the United States?","place","gk_landmark");
feature("gk_france","Is it strongly associated with France?","place","gk_landmark");
feature("gk_italy","Is it strongly associated with Italy?","place","gk_landmark");
feature("gk_uk","Is it strongly associated with the United Kingdom?","place","gk_landmark");
feature("gk_book","Is it a book or major written work?","culture","manmade");
feature("gk_novel","Is it a novel?","culture","gk_book");
feature("gk_play","Is it a play?","culture","gk_book");
feature("gk_written_pre1900","Was it written before 1900?","culture","gk_book");
feature("gk_film","Is it a movie?","culture","manmade");
feature("gk_animated","Is it animated?","culture","gk_film");
feature("gk_scifi","Is science fiction central to it?","culture","manmade");
feature("gk_fantasy","Is fantasy central to it?","culture","manmade");
feature("gk_tv","Is it a television series?","culture","manmade");
feature("gk_music_work","Is it mainly known as a piece of recorded or composed music?","culture","manmade");
feature("gk_song","Is it a song?","culture","gk_music_work");
feature("gk_album","Is it an album?","culture","gk_music_work");
feature("gk_classical","Is it classical music?","culture","gk_music_work");
feature("gk_invention","Is it especially famous as an invention?","science","manmade");
feature("gk_transport_invention","Is transportation central to the invention?","science","gk_invention");
feature("gk_communication_invention","Is communication central to the invention?","science","gk_invention");
feature("gk_science","Is it a scientific idea, phenomenon, or discovery?","science","nature");
feature("gk_space","Is it strongly associated with space or astronomy?","science","nature");
feature("gk_biology","Is it mainly associated with biology?","science","nature");
feature("gk_physics","Is it mainly associated with physics?","science","nature");
feature("gk_chemistry","Is it mainly associated with chemistry?","science","nature");
feature("gk_event","Is it a major historical event?","history","manmade");
feature("gk_war","Is it a war or battle?","history","gk_event");
feature("gk_space_event","Is it a space-exploration event?","history","gk_event");
feature("gk_disaster","Is it a famous disaster?","history","gk_event");
feature("gk_mythology","Is it from mythology?","culture","fictional");
feature("gk_greek_myth","Is it from Greek mythology?","culture","gk_mythology");
feature("gk_brand","Is it a well-known brand or company?","culture","manmade");
feature("gk_product","Is it a specific well-known consumer product?","culture","manmade");
feature("gk_game","Is it a video game?","culture","gk_product");
feature("gk_console","Is it a video game console?","culture","gk_product");
feature("gk_vehicle_product","Is it a specific vehicle model?","culture","gk_product");

const ART=[
 ["Venus de Milo",["manmade","gk_artwork","gk_sculpture","gk_human_figure","gk_marble","gk_ancient","gk_greek","gk_museum","gk_louvre"]],
 ["Mona Lisa",["manmade","gk_artwork","gk_painting","gk_human_figure","gk_museum","gk_louvre"]],
 ["David",["manmade","gk_artwork","gk_sculpture","gk_human_figure","gk_marble","gk_museum","gk_europe","gk_italy"]],
 ["The Thinker",["manmade","gk_artwork","gk_sculpture","gk_human_figure","gk_museum","gk_europe","gk_france"]],
 ["The Starry Night",["manmade","gk_artwork","gk_painting","gk_museum"]],
 ["The Scream",["manmade","gk_artwork","gk_painting","gk_human_figure","gk_museum","gk_europe"]],
 ["Girl with a Pearl Earring",["manmade","gk_artwork","gk_painting","gk_human_figure","gk_museum","gk_europe"]],
 ["The Birth of Venus",["manmade","gk_artwork","gk_painting","gk_human_figure","gk_museum","gk_europe","gk_italy"]],
 ["Guernica",["manmade","gk_artwork","gk_painting","gk_human_figure","gk_museum","gk_europe"]],
 ["American Gothic",["manmade","gk_artwork","gk_painting","gk_human_figure","gk_museum","gk_usa"]]
];
for(const [n,t] of ART)add(n,"artwork",t,{weight:3});

const LANDMARKS=[
 ["Statue of Liberty",["place","manmade","gk_landmark","gk_statue_monument","gk_usa"]],
 ["Colosseum",["place","manmade","gk_landmark","gk_building","gk_ancient","gk_roman","gk_europe","gk_italy"]],
 ["Big Ben",["place","manmade","gk_landmark","gk_building","gk_tower","gk_europe","gk_uk"]],
 ["Golden Gate Bridge",["place","manmade","gk_landmark","gk_building","gk_bridge","gk_usa"]],
 ["Leaning Tower of Pisa",["place","manmade","gk_landmark","gk_building","gk_tower","gk_europe","gk_italy"]],
 ["Arc de Triomphe",["place","manmade","gk_landmark","gk_building","gk_europe","gk_france"]],
 ["Stonehenge",["place","manmade","gk_landmark","gk_ancient","gk_europe","gk_uk"]],
 ["Parthenon",["place","manmade","gk_landmark","gk_building","gk_ancient","gk_greek","gk_europe"]],
 ["Great Pyramid of Giza",["place","manmade","gk_landmark","gk_building","gk_ancient"]],
 ["Sydney Opera House",["place","manmade","gk_landmark","gk_building"]]
];
for(const [n,t] of LANDMARKS)add(n,"place",t,{weight:2.8});

const BOOKS=[
 ["Hamlet",["manmade","gk_book","gk_play","gk_written_pre1900"]],
 ["Romeo and Juliet",["manmade","gk_book","gk_play","gk_written_pre1900"]],
 ["Pride and Prejudice",["manmade","gk_book","gk_novel","gk_written_pre1900"]],
 ["Moby-Dick",["manmade","gk_book","gk_novel","gk_written_pre1900"]],
 ["The Great Gatsby",["manmade","gk_book","gk_novel"]],
 ["1984",["manmade","gk_book","gk_novel","gk_scifi"]],
 ["The Hobbit",["manmade","gk_book","gk_novel","gk_fantasy"]],
 ["Harry Potter and the Philosopher's Stone",["manmade","gk_book","gk_novel","gk_fantasy"]],
 ["To Kill a Mockingbird",["manmade","gk_book","gk_novel"]],
 ["The Catcher in the Rye",["manmade","gk_book","gk_novel"]]
];
for(const [n,t] of BOOKS)add(n,"book",t,{weight:2.7});

const FILMS=[
 ["Star Wars",["manmade","gk_film","gk_scifi"]],
 ["The Godfather",["manmade","gk_film"]],
 ["Jaws",["manmade","gk_film"]],
 ["E.T. the Extra-Terrestrial",["manmade","gk_film","gk_scifi"]],
 ["Jurassic Park",["manmade","gk_film","gk_scifi"]],
 ["The Matrix",["manmade","gk_film","gk_scifi"]],
 ["Titanic",["manmade","gk_film"]],
 ["Toy Story",["manmade","gk_film","gk_animated"]],
 ["The Lion King",["manmade","gk_film","gk_animated"]],
 ["Frozen",["manmade","gk_film","gk_animated","gk_fantasy"]]
];
for(const [n,t] of FILMS)add(n,"film",t,{weight:2.6});

const TV=["Friends","The Simpsons","Seinfeld","The Office","Breaking Bad","Game of Thrones","Stranger Things","Sesame Street"];
for(const n of TV)add(n,"television",["manmade","gk_tv"],{weight:2.5});

const SCIENCE=[
 ["Photosynthesis",["nature","gk_science","gk_biology"]],
 ["Gravity",["nature","gk_science","gk_physics","gk_space"]],
 ["Evolution",["nature","gk_science","gk_biology"]],
 ["DNA",["nature","gk_science","gk_biology"]],
 ["Relativity",["nature","gk_science","gk_physics","gk_space"]],
 ["Plate tectonics",["nature","gk_science"]],
 ["Periodic table",["manmade","gk_science","gk_chemistry"]],
 ["Black hole",["nature","gk_science","gk_physics","gk_space"]],
 ["Big Bang",["nature","gk_science","gk_physics","gk_space"]],
 ["Atom",["nature","gk_science","gk_physics","gk_chemistry"]]
];
for(const [n,t] of SCIENCE)add(n,"science",t,{weight:2.5});

const INVENTIONS=[
 ["Printing press",["manmade","gk_invention","gk_communication_invention"]],
 ["Telephone",["manmade","gk_invention","gk_communication_invention"]],
 ["Light bulb",["manmade","gk_invention"]],
 ["Airplane",["manmade","vehicle","gk_invention","gk_transport_invention"]],
 ["Steam engine",["manmade","gk_invention","gk_transport_invention"]],
 ["Radio",["manmade","electronic","gk_invention","gk_communication_invention"]],
 ["Television",["manmade","electronic","gk_invention","gk_communication_invention"]],
 ["World Wide Web",["manmade","electronic","gk_invention","gk_communication_invention"]]
];
for(const [n,t] of INVENTIONS)add(n,"invention",t,{weight:2.4});

const EVENTS=[
 ["Apollo 11 moon landing",["manmade","gk_event","gk_space_event","gk_space","gk_usa"]],
 ["French Revolution",["manmade","gk_event","gk_france","gk_europe"]],
 ["American Revolution",["manmade","gk_event","gk_usa"]],
 ["World War I",["manmade","gk_event","gk_war","gk_europe"]],
 ["World War II",["manmade","gk_event","gk_war","gk_europe"]],
 ["Titanic sinking",["manmade","gk_event","gk_disaster"]],
 ["Chernobyl disaster",["manmade","gk_event","gk_disaster","gk_europe"]],
 ["Fall of the Berlin Wall",["manmade","gk_event","gk_europe"]]
];
for(const [n,t] of EVENTS)add(n,"event",t,{weight:2.5});

const MYTH=[
 ["Zeus",["fictional","gk_mythology","gk_greek_myth"]],
 ["Athena",["fictional","gk_mythology","gk_greek_myth"]],
 ["Hercules",["fictional","gk_mythology","gk_greek_myth"]],
 ["Medusa",["fictional","gk_mythology","gk_greek_myth"]],
 ["Poseidon",["fictional","gk_mythology","gk_greek_myth"]],
 ["Thor",["fictional","gk_mythology"]],
 ["Odin",["fictional","gk_mythology"]]
];
for(const [n,t] of MYTH)add(n,"mythology",t,{weight:2.4});

const PRODUCTS=[
 ["Nintendo Switch",["manmade","electronic","gk_product","gk_console"]],
 ["PlayStation 5",["manmade","electronic","gk_product","gk_console"]],
 ["Xbox",["manmade","electronic","gk_product","gk_console"]],
 ["iPhone",["manmade","electronic","gk_product"]],
 ["Tesla Model 3",["manmade","vehicle","electronic","gk_product","gk_vehicle_product"]],
 ["Rubik's Cube",["manmade","toy","gk_product"]],
 ["Barbie",["manmade","toy","gk_product"]],
 ["LEGO",["manmade","toy","gk_brand","gk_product"]]
];
for(const [n,t] of PRODUCTS)add(n,"product",t,{weight:2.6});

const BRANDS=["Apple","Nintendo","Nike","Coca-Cola","Disney","McDonald's","Google","Microsoft"];
for(const n of BRANDS)add(n,"brand",["manmade","gk_brand"],{weight:2.4});

const MUSIC=[
 ["Beethoven's Fifth Symphony",["manmade","music","gk_music_work","gk_classical"]],
 ["The Four Seasons",["manmade","music","gk_music_work","gk_classical"]],
 ["Bohemian Rhapsody",["manmade","music","gk_music_work","gk_song"]],
 ["Imagine",["manmade","music","gk_music_work","gk_song"]],
 ["Thriller",["manmade","music","gk_music_work","gk_album"]],
 ["Abbey Road",["manmade","music","gk_music_work","gk_album"]]
];
for(const [n,t] of MUSIC)add(n,"music",t,{weight:2.5});

global.MOM_GENERAL_KNOWLEDGE={
 meta:{source:"curated category-based general knowledge",version:1},
 FEATURES,OBJECTS
};
})(typeof window!=="undefined"?window:globalThis);
