// Dataset v2 additions to the curated association graph (original, hand-written data: no third-party
// association norms are included; see docs/BOT_ENGINE.md for the licensing notes).
//
// Why: the review of real games found everyday words the graph did not know ("presents", "pan",
// "house", "teeth", "knife"...). When a word is unknown the bot can only answer from the other word,
// which reads as ignoring the player. These rows add the missing words, common synonyms and spelling
// variants (as aliases of an existing concept), and a few familiar links and compounds that were
// missing ("table lamp", "restaurant table", "birthday dinner").
//
// Same row shape as data.js: [id, englishLabel, frenchLabel, tags, links]. Links are undirected.

export const DATASET_VERSION = "lexicon-2";

export const ADDED_CONCEPTS = [
  // Kitchen and home
  ["pan", "pan", "poêle", ["home", "food"], ["cook", "kitchen", "pancake", "egg", "stove", "hot", "oven", "cake", "fry"]],
  ["stove", "stove", "cuisinière", ["home", "hot"], ["kitchen", "cook", "pan", "hot", "oven", "soup", "fire"]],
  ["knife", "knife", "couteau", ["food", "home"], ["fork", "spoon", "cut", "kitchen", "bread", "butter", "plate", "table", "sharp"]],
  ["bottle", "bottle", "bouteille", ["drink", "home"], ["water", "milk", "drink", "juice", "baby", "glass"]],
  ["meal", "meal", "repas", ["food", "family"], ["dinner", "lunch", "breakfast", "food", "eat", "table", "family", "plate", "cook", "restaurant"]],
  ["microwave", "microwave", "micro-ondes", ["home", "tech", "hot"], ["kitchen", "popcorn", "hot", "food", "oven"]],
  ["sink", "sink", "évier", ["home", "water"], ["kitchen", "bathroom", "water", "wash", "soap", "dishes", "cup", "plate", "bubble"]],
  ["shelf", "shelf", "étagère", ["home"], ["book", "wall", "toy", "closet", "box", "kitchen", "home", "plant"]],
  ["wall", "wall", "mur", ["home", "city"], ["house", "home", "paint", "door", "window", "castle", "picture", "climb", "brick"]],
  ["floor", "floor", "sol", ["home"], ["carpet", "house", "clean", "dance", "mop", "home", "kitchen", "bed", "shoe"]],
  ["mirror", "mirror", "miroir", ["home", "magic"], ["face", "glass", "bathroom", "hair", "magic", "princess"]],
  ["bathroom", "bathroom", "salle de bain", ["home", "water"], ["bath", "shower", "toilet", "sink", "soap", "toothbrush", "towel", "mirror"]],
  ["shower", "shower", "douche", ["home", "water"], ["bath", "bathroom", "water", "soap", "shampoo", "towel", "wet"]],
  ["toilet", "toilet", "toilettes", ["home"], ["bathroom", "paper", "water", "home", "soap", "clean", "sink"]],
  ["vacuum", "vacuum", "aspirateur", ["home", "tech"], ["clean", "floor", "carpet", "dust", "home", "robot", "mop", "bucket"]],
  ["mop", "mop", "serpillière", ["home"], ["clean", "floor", "bucket", "water", "wet"]],
  ["shampoo", "shampoo", "shampoing", ["body", "home"], ["hair", "bath", "shower", "soap", "bubble", "wash"]],
  ["brush", "brush", "brosse", ["home", "art"], ["paint", "hair", "comb", "toothbrush", "clean", "artist"]],
  ["comb", "comb", "peigne", ["body", "home"], ["hair", "brush", "mirror", "princess", "clean", "bath"]],
  ["hammer", "hammer", "marteau", ["home", "job"], ["nail", "tool", "build", "wood", "builder", "box", "castle", "home"]],
  ["rope", "rope", "corde", ["sport", "adventure"], ["climb", "jump", "boat", "swing", "pirate", "knot"]],
  ["camera", "camera", "appareil photo", ["tech", "art"], ["photo", "picture", "video", "phone", "smile", "movie"]],
  ["watch", "watch", "montre", ["time", "clothes"], ["time", "clock", "wrist", "hour", "tv", "movie", "phone", "morning"]],
  ["pocket", "pocket", "poche", ["clothes"], ["jeans", "coat", "money", "key", "pants", "jacket", "hand"]],
  ["ribbon", "ribbon", "ruban", ["celebration", "clothes"], ["gift", "bow", "hair", "wrap", "prize", "red"]],
  ["wrap", "wrap", "emballer", ["celebration"], ["gift", "paper", "ribbon", "box", "tape"]],
  // People
  ["boy", "boy", "garçon", ["family"], ["girl", "kid", "child", "brother", "son", "friend", "school", "man"]],
  ["girl", "girl", "fillette", ["family"], ["boy", "kid", "child", "sister", "daughter", "friend", "school", "woman"]],
  ["man", "man", "homme", ["family"], ["woman", "dad", "boy", "person", "family", "friend", "king", "baby"]],
  ["woman", "woman", "dame", ["family"], ["man", "mom", "girl", "person", "family", "friend", "queen", "baby"]],
  ["waiter", "waiter", "serveur", ["job", "food"], ["restaurant", "menu", "table", "plate", "food", "dinner"]],
  // School
  ["crayon", "crayon", "crayon de couleur", ["school", "art", "color"], ["draw", "color", "paper", "pencil", "picture", "marker", "school"]],
  ["marker", "marker", "feutre", ["school", "art"], ["draw", "pen", "color", "chalkboard", "crayon"]],
  ["ruler", "ruler", "règle", ["school", "shape"], ["measure", "line", "pencil", "school", "math", "straight", "paper", "desk", "king", "art"]],
  ["glue", "glue", "colle", ["school", "art"], ["stick", "paper", "craft", "scissors", "tape", "school", "art", "box"]],
  ["tape", "tape", "scotch", ["school", "home"], ["stick", "glue", "paper", "gift", "wrap", "box"]],
  ["chalk", "chalk", "craie", ["school", "art"], ["chalkboard", "draw", "white", "teacher", "art", "school"]],
  ["chalkboard", "chalkboard", "tableau noir", ["school"], ["teacher", "chalk", "classroom", "write", "school", "lesson"]],
  ["test", "test", "contrôle", ["school"], ["school", "teacher", "study", "homework", "question", "answer", "lesson", "pencil", "class"]],
  ["classroom", "classroom", "salle de classe", ["school"], ["school", "teacher", "desk", "chalkboard", "lesson", "class"]],
  // City, sport, celebrations
  ["street", "street", "rue", ["city"], ["road", "car", "house", "city", "walk", "parade"]],
  ["market", "market", "marché", ["city", "food"], ["shop", "fruit", "vegetable", "money", "farmer"]],
  ["menu", "menu", "menu", ["food"], ["restaurant", "waiter", "food", "dinner", "pizza", "chef", "table"]],
  ["ticket", "ticket", "billet", ["city"], ["movie", "train", "bus", "plane", "concert", "theater"]],
  ["theater", "theater", "théâtre", ["art", "music"], ["play", "stage", "show", "actor", "ticket", "movie"]],
  ["stadium", "stadium", "stade", ["sport", "city"], ["soccer", "team", "race", "concert", "crowd", "ball", "sport", "game"]],
  ["baseball", "baseball", "baseball", ["sport"], ["bat", "ball", "team", "catch", "sport", "game", "run"]],
  ["hockey", "hockey", "hockey", ["sport", "cold"], ["ice", "skate", "team", "goal", "sport", "ball", "game"]],
  ["golf", "golf", "golf", ["sport"], ["ball", "grass", "hole", "sport", "game", "club", "flag"]],
  ["parade", "parade", "défilé", ["celebration", "city"], ["music", "costume", "street", "balloon", "holiday", "band"]],
  ["flag", "flag", "drapeau", ["city", "sport"], ["wind", "castle", "pirate", "red", "race", "country"]],
  // Time
  ["week", "week", "semaine", ["time"], ["day", "weekend", "school", "month", "time", "holiday"]],
  ["weekend", "weekend", "week-end", ["time", "holiday"], ["week", "fun", "sleep", "party", "family"]],
  ["afternoon", "afternoon", "après-midi", ["time"], ["morning", "evening", "day", "lunch", "nap", "snack", "tea"]]
];

/**
 * Familiar connections the graph was missing between existing concepts (undirected links).
 * Each one is an everyday phrase or use a 10-year-old would recognise.
 */
export const ADDED_LINKS = [
  ["table", "lamp"], // table lamp
  ["table", "restaurant"], // a restaurant table, "table for two"
  ["birthday", "dinner"], // birthday dinner
  ["christmas", "dinner"], // Christmas dinner
  ["gift", "wrap"],
  ["lamp", "desk"], // desk lamp
  ["restaurant", "family"],
  ["kitchen", "table"],
  ["pan", "pancake"]
];

/** Compounds and set phrases (per language), like data.js PHRASES. */
export const ADDED_PHRASES = {
  en: [["table", "lamp"], ["desk", "lamp"], ["birthday", "dinner"], ["christmas", "dinner"], ["cake", "pan"], ["pan", "pancake"]],
  fr: [["table", "lamp"], ["birthday", "dinner"]]
};

/**
 * Typed words that mean an existing concept (synonyms, spelling variants, verb forms). Resolved
 * after an exact match, so a real concept with the same spelling always wins. Plurals of these are
 * handled by the usual plural rules ("presents" → present → gift).
 */
export const ALIASES = {
  en: {
    present: "gift", house: "home", teeth: "tooth", couch: "sofa", store: "shop", supper: "dinner",
    cinema: "movie", theatre: "theater", film: "movie", vacation: "holiday", freezer: "fridge", cupboard: "closet",
    blackboard: "chalkboard", whiteboard: "chalkboard", exam: "test", quiz: "test", bookshelf: "shelf",
    swimming: "swim", running: "run", jumping: "jump", dancing: "dance", singing: "sing", reading: "read",
    writing: "write", drawing: "draw", cooking: "cook", baking: "bake", painting: "paint", skating: "skate",
    kids: "kid", children: "child", mum: "mom", mommy: "mom", mummy: "mom", daddy: "dad", puppy: "dog", kitty: "cat",
    kitten: "cat", bunny: "rabbit", sweets: "candy", sweet: "candy", soccerball: "soccer"
  },
  fr: {
    cinéma: "movie", maman: "mom", papa: "dad", natation: "swim", cuisine: "kitchen", souper: "dinner",
    chiot: "dog", chaton: "cat", lapin: "rabbit", bonbons: "candy", vacance: "holiday"
  }
};
