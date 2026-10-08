// Dataset v3 additions (original, hand-written data; no third-party association norms).
//
// Why: the engine-2.1 review game of 2026-10-08 (10:56, Gary, 14 moves, rated 1 star) hit five
// everyday words the graph did not know (battleship, twigs, chicks, tuna, surfing), and a coverage
// check of ~470 everyday words found 128 more (animals, food, actions, places, vehicles, clothes,
// animal parts, nature). An unknown word leaves the bot answering only the other word, which reads
// as ignoring the player. These rows add those words with ordinary, familiar links, so a known word
// is the normal case. Same row shape as data.js: [id, englishLabel, frenchLabel, tags, links].

export const DATASET_VERSION = "lexicon-3";

export const ADDED_CONCEPTS_3 = [
  // From the 10:56 game
  ["battleship", "battleship", "cuirassé", ["ocean", "transport", "game"], ["ship", "boat", "sea", "ocean", "navy", "captain", "submarine", "board_game", "anchor", "sailor"]],
  ["twig", "twig", "brindille", ["nature", "plant"], ["branch", "tree", "stick", "nest", "wood", "leaf", "forest", "bird", "fire"]],
  ["chick", "chick", "poussin", ["animal", "farm"], ["chicken", "egg", "hen", "bird", "baby", "farm", "nest", "yellow", "feather", "easter"]],
  ["tuna", "tuna", "thon", ["animal", "ocean", "food"], ["fish", "sea", "ocean", "sandwich", "salad", "shark", "whale", "dolphin", "boat"]],
  ["navy", "navy", "marine", ["ocean", "job", "transport"], ["ship", "sailor", "sea", "boat", "captain", "battleship", "anchor", "blue"]],

  // Sea and water
  ["seagull", "seagull", "mouette", ["animal", "ocean", "sky"], ["bird", "beach", "sea", "fish", "wing", "fly", "sand", "ocean", "boat"]],
  ["sailor", "sailor", "marin", ["ocean", "job"], ["boat", "ship", "sea", "captain", "anchor", "navy", "pirate", "ocean", "island"]],
  ["anchor", "anchor", "ancre", ["ocean", "transport"], ["boat", "ship", "sea", "sailor", "rope", "captain", "pirate", "ocean"]],
  ["seal", "seal", "phoque", ["animal", "ocean", "cold"], ["sea", "fish", "ocean", "ice", "penguin", "polar_bear", "whale", "swim", "beach"]],
  ["coral", "coral", "corail", ["ocean", "nature"], ["sea", "ocean", "fish", "reef", "starfish", "swim", "island", "pink", "dive"]],
  ["reef", "reef", "récif", ["ocean", "nature"], ["coral", "sea", "ocean", "fish", "dive", "shark", "island", "starfish"]],
  ["canoe", "canoe", "canoë", ["transport", "water", "sport"], ["boat", "paddle", "river", "lake", "row", "camping", "water", "kayak"]],
  ["kayak", "kayak", "kayak", ["transport", "water", "sport"], ["boat", "paddle", "river", "lake", "canoe", "water", "sea", "row"]],
  ["paddle", "paddle", "pagaie", ["water", "sport"], ["boat", "canoe", "kayak", "row", "river", "lake", "water", "swim"]],
  ["row", "row", "ramer", ["water", "sport"], ["boat", "paddle", "canoe", "river", "lake", "kayak", "race", "team"]],

  // Farm
  ["donkey", "donkey", "âne", ["animal", "farm"], ["horse", "farm", "carrot", "pony", "hay", "barn", "ride", "tail"]],
  ["calf", "calf", "veau", ["animal", "farm"], ["cow", "baby", "farm", "milk", "barn", "bull", "field"]],
  ["bull", "bull", "taureau", ["animal", "farm"], ["cow", "horn", "farm", "red", "field", "calf", "strong", "cowboy"]],
  ["piglet", "piglet", "porcelet", ["animal", "farm"], ["pig", "baby", "farm", "mud", "pink", "barn", "cute"]],
  ["lamb", "lamb", "agneau", ["animal", "farm"], ["sheep", "baby", "wool", "farm", "field", "spring", "cute", "white"]],
  ["hen", "hen", "poule pondeuse", ["animal", "farm"], ["chicken", "egg", "chick", "farm", "rooster", "nest", "feather", "barn"]],
  ["rooster", "rooster", "coq", ["animal", "farm", "sound"], ["chicken", "hen", "farm", "morning", "chick", "barn", "feather", "loud"]],
  ["goose", "goose", "oie", ["animal", "farm"], ["duck", "bird", "farm", "pond", "feather", "egg", "swan", "lake"]],
  ["turkey", "turkey", "dinde", ["animal", "farm", "food", "holiday"], ["chicken", "bird", "farm", "dinner", "feather", "holiday", "christmas", "thanksgiving"]],
  ["fence", "fence", "clôture", ["farm", "home"], ["farm", "garden", "field", "gate", "wood", "yard", "horse", "cow"]],
  ["gate", "gate", "portail", ["home", "farm"], ["fence", "door", "garden", "farm", "key", "castle", "field"]],
  ["wheat", "wheat", "blé", ["farm", "plant", "food"], ["bread", "farm", "field", "flour", "corn", "tractor", "farmer", "grow"]],
  ["flour", "flour", "farine", ["food", "kitchen"], ["bread", "cake", "bake", "wheat", "sugar", "egg", "cookie", "kitchen", "baker"]],
  ["thanksgiving", "Thanksgiving", "Thanksgiving", ["holiday", "celebration", "food"], ["turkey", "dinner", "family", "pie", "pumpkin", "autumn", "holiday"]],

  // Wild animals
  ["deer", "deer", "cerf", ["animal", "nature"], ["forest", "horn", "reindeer", "wood", "field", "fox", "rabbit", "wild"]],
  ["moose", "moose", "élan", ["animal", "nature", "cold"], ["deer", "horn", "forest", "snow", "bear", "big", "lake"]],
  ["gorilla", "gorilla", "gorille", ["animal", "nature"], ["monkey", "jungle", "banana", "zoo", "strong", "big", "forest"]],
  ["koala", "koala", "koala", ["animal", "nature"], ["tree", "kangaroo", "zoo", "bear", "sleep", "cute", "leaf"]],
  ["hippo", "hippo", "hippopotame", ["animal", "water"], ["river", "zoo", "water", "big", "mud", "elephant", "crocodile"]],
  ["rhino", "rhino", "rhinocéros", ["animal", "nature"], ["horn", "zoo", "elephant", "big", "hippo", "strong", "giraffe"]],
  ["lizard", "lizard", "lézard", ["animal", "nature", "hot"], ["snake", "crocodile", "dinosaur", "rock", "sun", "tail", "desert", "green"]],
  ["toad", "toad", "crapaud", ["animal", "nature", "water"], ["frog", "pond", "green", "jump", "mud", "fly", "witch"]],
  ["rat", "rat", "rat", ["animal"], ["mouse", "cheese", "tail", "sewer", "pet", "hamster", "city"]],
  ["sewer", "sewer", "égout", ["city"], ["rat", "dirty", "water", "street", "city", "smell"]],
  ["smell", "smell", "odeur", ["body"], ["nose", "flower", "skunk", "cook", "soap", "dirty", "cheese", "perfume"]],
  ["perfume", "perfume", "parfum", ["home", "body"], ["smell", "flower", "nose", "bottle", "pretty", "gift"]],
  ["hedgehog", "hedgehog", "hérisson", ["animal", "nature"], ["garden", "forest", "leaf", "cute", "small", "night", "autumn"]],
  ["raccoon", "raccoon", "raton laveur", ["animal", "nature", "night"], ["mask", "tail", "night", "forest", "trash", "city", "squirrel"]],
  ["trash", "trash", "poubelle", ["home", "city"], ["dirty", "clean", "kitchen", "raccoon", "street", "box", "smell"]],
  ["skunk", "skunk", "mouffette", ["animal", "nature"], ["smell", "tail", "black", "white", "forest", "night"]],
  ["beaver", "beaver", "castor", ["animal", "water", "nature"], ["river", "wood", "tree", "tooth", "tail", "lake", "dam"]],
  ["dam", "dam", "barrage", ["water", "nature"], ["river", "beaver", "lake", "water", "wood", "bridge"]],
  ["otter", "otter", "loutre", ["animal", "water"], ["river", "fish", "swim", "water", "cute", "sea", "beaver"]],

  // Birds
  ["crow", "crow", "corbeau", ["animal", "sky"], ["bird", "black", "farm", "field", "fly", "wing", "halloween"]],
  ["pigeon", "pigeon", "pigeon", ["animal", "city", "sky"], ["bird", "city", "park", "fly", "street", "feather", "bread"]],
  ["robin", "robin", "rouge-gorge", ["animal", "sky", "season"], ["bird", "red", "spring", "worm", "nest", "egg", "garden"]],
  ["swan", "swan", "cygne", ["animal", "water"], ["bird", "lake", "pond", "white", "duck", "feather", "goose"]],
  ["flamingo", "flamingo", "flamant", ["animal", "water"], ["bird", "pink", "leg", "lake", "zoo", "feather"]],
  ["peacock", "peacock", "paon", ["animal", "color"], ["bird", "feather", "tail", "blue", "green", "zoo", "pretty"]],
  ["ostrich", "ostrich", "autruche", ["animal"], ["bird", "egg", "run", "fast", "leg", "feather", "zoo"]],
  ["hawk", "hawk", "faucon", ["animal", "sky"], ["bird", "eagle", "fly", "sky", "wing", "mouse", "owl"]],
  ["sparrow", "sparrow", "moineau", ["animal", "sky"], ["bird", "small", "nest", "tree", "seed", "fly", "garden"]],

  // Insects
  ["wasp", "wasp", "guêpe", ["animal", "nature"], ["bee", "sting", "insect", "summer", "yellow", "nest", "fly"]],
  ["sting", "sting", "piqûre", ["nature", "body"], ["bee", "wasp", "hurt", "jellyfish", "scorpion", "insect"]],
  ["scorpion", "scorpion", "scorpion", ["animal", "hot"], ["desert", "sting", "tail", "spider", "sand", "insect"]],
  ["beetle", "beetle", "scarabée", ["animal", "nature"], ["insect", "bug", "ladybug", "ant", "garden", "leaf", "black"]],
  ["bug", "bug", "bestiole", ["animal", "nature"], ["insect", "ant", "beetle", "spider", "ladybug", "garden", "small"]],
  ["mosquito", "mosquito", "moustique", ["animal", "nature", "season"], ["bite", "summer", "insect", "fly", "night", "camping", "itch"]],
  ["bite", "bite", "morsure", ["body", "food"], ["tooth", "mosquito", "eat", "dog", "shark", "snake", "apple"]],
  ["itch", "itch", "démangeaison", ["body"], ["mosquito", "scratch", "skin", "bite", "sock"]],
  ["scratch", "scratch", "griffure", ["body"], ["cat", "itch", "claw", "paw", "hurt"]],
  ["skin", "skin", "peau", ["body"], ["body", "hand", "face", "sunscreen", "soap", "itch"]],

  // Animal parts
  ["beak", "beak", "bec", ["animal", "body"], ["bird", "feather", "wing", "nest", "parrot", "duck", "eagle"]],
  ["claw", "claw", "griffe", ["animal", "body"], ["cat", "paw", "bear", "crab", "eagle", "scratch", "lion"]],
  ["whisker", "whisker", "moustache", ["animal", "body"], ["cat", "mouse", "kitten", "nose", "face", "fur"]],
  ["horn", "horn", "corne", ["animal", "body", "music"], ["bull", "deer", "rhino", "unicorn", "goat", "trumpet", "car"]],
  ["hoof", "hoof", "sabot", ["animal", "body"], ["horse", "cow", "pony", "goat", "shoe", "donkey"]],

  // Trees and nature
  ["log", "log", "bûche", ["nature", "fire"], ["wood", "tree", "fire", "forest", "camping", "branch", "cabin"]],
  ["cabin", "cabin", "chalet", ["home", "nature"], ["wood", "forest", "log", "lake", "mountain", "camping", "snow"]],
  ["stick", "stick", "bâton", ["nature", "toy"], ["branch", "tree", "dog", "twig", "wood", "throw", "fire"]],
  ["bark", "bark", "aboyer", ["animal", "sound"], ["dog", "puppy", "loud", "tree", "wolf", "noise"]],
  ["noise", "noise", "bruit", ["sound"], ["loud", "sound", "music", "drum", "quiet", "bark"]],
  ["sound", "sound", "son", ["sound"], ["music", "noise", "ear", "loud", "quiet", "song", "radio"]],
  ["root", "root", "racine", ["nature", "plant"], ["tree", "plant", "grow", "seed", "flower", "carrot", "dirt"]],
  ["dirt", "dirt", "terreau", ["nature"], ["mud", "garden", "dirty", "root", "worm", "plant", "dig"]],
  ["bush", "bush", "buisson", ["nature", "plant"], ["tree", "garden", "leaf", "green", "flower", "hide", "rose"]],
  ["rose", "rose", "rosier", ["nature", "plant"], ["flower", "red", "garden", "love", "valentine", "pink", "bush"]],
  ["acorn", "acorn", "gland", ["nature", "plant", "season"], ["tree", "squirrel", "oak", "autumn", "seed", "forest", "nut"]],
  ["oak", "oak", "chêne", ["nature", "plant"], ["tree", "acorn", "wood", "forest", "leaf", "branch"]],
  ["nut", "nut", "noix", ["food", "nature"], ["squirrel", "acorn", "peanut", "tree", "snack", "autumn"]],

  // Fruit and vegetables
  ["peach", "peach", "pêche", ["food", "sweet"], ["fruit", "apple", "pie", "summer", "orange", "tree", "sweet", "pink"]],
  ["lime", "lime", "citron vert", ["food"], ["lemon", "green", "fruit", "juice", "sour", "drink"]],
  ["sour", "sour", "acide", ["food"], ["lemon", "lime", "candy", "sweet", "taste"]],
  ["taste", "taste", "goût", ["food", "body"], ["eat", "mouth", "food", "sweet", "sour", "yummy"]],
  ["yummy", "yummy", "miam", ["food", "feeling"], ["food", "cake", "eat", "taste", "cookie", "pizza", "dinner"]],
  ["coconut", "coconut", "noix de coco", ["food", "nature"], ["palm_tree", "island", "beach", "fruit", "milk", "monkey"]],
  ["mango", "mango", "mangue", ["food", "sweet"], ["fruit", "banana", "pineapple", "juice", "orange", "summer"]],
  ["onion", "onion", "oignon", ["food", "plant"], ["vegetable", "cry", "garlic", "soup", "cook", "potato", "burger"]],
  ["garlic", "garlic", "ail", ["food", "plant"], ["onion", "vampire", "cook", "bread", "smell", "pasta", "vegetable"]],
  ["broccoli", "broccoli", "brocoli", ["food", "plant"], ["vegetable", "green", "carrot", "tree", "dinner", "salad"]],
  ["lettuce", "lettuce", "laitue", ["food", "plant"], ["salad", "vegetable", "green", "rabbit", "sandwich", "tomato", "burger"]],
  ["cucumber", "cucumber", "concombre", ["food", "plant"], ["vegetable", "salad", "green", "tomato", "garden", "pickle"]],
  ["pickle", "pickle", "cornichon", ["food"], ["cucumber", "sandwich", "burger", "green", "sour"]],
  ["pepper", "pepper", "poivron", ["food", "plant"], ["vegetable", "red", "green", "salt", "hot", "pizza", "salad"]],
  ["bean", "bean", "haricot", ["food", "plant"], ["vegetable", "pea", "green", "soup", "seed", "plant", "giant"]],
  ["pea", "pea", "petit pois", ["food", "plant"], ["vegetable", "green", "bean", "carrot", "dinner", "small", "princess"]],

  // Food and drink
  ["rice", "rice", "riz", ["food"], ["bowl", "chicken", "dinner", "lunch", "bean", "soup", "white"]],
  ["yogurt", "yogurt", "yaourt", ["food", "sweet"], ["milk", "breakfast", "spoon", "fruit", "strawberry", "cream", "cereal"]],
  ["bacon", "bacon", "bacon", ["food"], ["egg", "breakfast", "pig", "sandwich", "burger", "pancake", "meat"]],
  ["sausage", "sausage", "saucisse", ["food"], ["meat", "dog", "breakfast", "pig", "bread", "picnic", "grill"]],
  ["grill", "grill", "barbecue", ["food", "fire"], ["sausage", "burger", "hot", "summer", "picnic", "cook", "fire"]],
  ["ham", "ham", "jambon", ["food"], ["pig", "sandwich", "cheese", "bread", "meat", "lunch", "pizza"]],
  ["meat", "meat", "viande", ["food"], ["chicken", "steak", "burger", "dinner", "cook", "food", "ham"]],
  ["steak", "steak", "steak", ["food"], ["meat", "dinner", "cow", "cook", "fries", "knife", "restaurant"]],
  ["noodle", "noodle", "nouille", ["food"], ["pasta", "soup", "bowl", "chopsticks", "dinner", "rice"]],
  ["chopsticks", "chopsticks", "baguettes", ["food", "kitchen"], ["rice", "noodle", "bowl", "eat", "spoon", "fork"]],
  ["taco", "taco", "taco", ["food"], ["cheese", "meat", "tomato", "lettuce", "dinner", "sandwich", "pizza"]],
  ["waffle", "waffle", "gaufre", ["food", "sweet"], ["pancake", "breakfast", "syrup", "butter", "cream", "strawberry", "ice_cream"]],
  ["syrup", "syrup", "sirop", ["food", "sweet"], ["pancake", "waffle", "sweet", "breakfast", "sugar", "honey"]],
  ["muffin", "muffin", "muffin", ["food", "sweet"], ["cupcake", "cake", "breakfast", "bake", "chocolate", "coffee"]],
  ["popsicle", "popsicle", "glace à l’eau", ["food", "sweet", "cold"], ["ice_cream", "summer", "ice", "cold", "juice", "sweet", "stick"]],
  ["soda", "soda", "soda", ["drink", "sweet"], ["drink", "juice", "sugar", "bubble", "bottle", "pizza", "lemonade"]],
  ["chips", "chips", "chips", ["food"], ["snack", "potato", "fries", "salt", "picnic", "party", "sandwich"]],
  ["ketchup", "ketchup", "ketchup", ["food"], ["fries", "tomato", "burger", "red", "sausage", "bottle"]],
  ["salt", "salt", "sel", ["food", "kitchen"], ["pepper", "sea", "fries", "sugar", "cook", "chips"]],

  // Actions
  ["kick", "kick", "taper", ["sport"], ["ball", "soccer", "foot", "goal", "leg", "karate"]],
  ["karate", "karate", "karaté", ["sport"], ["kick", "fight", "belt", "sport", "punch", "strong"]],
  ["fight", "fight", "bagarre", ["adventure"], ["sword", "knight", "angry", "karate", "dragon", "war", "punch"]],
  ["punch", "punch", "coup de poing", ["sport"], ["hand", "fight", "karate", "hit", "strong"]],
  ["hit", "hit", "frapper", ["sport"], ["ball", "baseball", "punch", "hurt", "drum", "bat"]],
  ["war", "war", "guerre", ["adventure"], ["fight", "soldier", "battleship", "sword", "army", "peace"]],
  ["soldier", "soldier", "soldat", ["job", "adventure"], ["army", "war", "helmet", "fight", "battleship", "brave"]],
  ["army", "army", "armée", ["job", "adventure"], ["soldier", "war", "navy", "fight", "tank", "brave"]],
  ["tank", "tank", "char", ["transport", "adventure"], ["army", "war", "soldier", "truck", "big"]],
  ["peace", "peace", "paix", ["feeling"], ["war", "love", "quiet", "calm", "friend", "dove"]],
  ["dove", "dove", "colombe", ["animal", "sky"], ["bird", "peace", "white", "pigeon", "wedding", "fly"]],
  ["dig", "dig", "creuser", ["nature"], ["sand", "dirt", "shovel", "dog", "garden", "hole", "treasure"]],
  ["shovel", "shovel", "pelle", ["home", "nature"], ["dig", "sand", "snow", "garden", "dirt", "bucket"]],
  ["hole", "hole", "trou", ["nature"], ["dig", "sock", "mouse", "rabbit", "golf", "ground"]],
  ["ground", "ground", "par terre", ["nature"], ["floor", "dirt", "grass", "hole", "earth", "fall"]],
  ["fall", "fall", "tomber", ["nature"], ["autumn", "leaf", "trip", "hurt", "snow", "rain", "ground"]],
  ["drive", "drive", "conduire", ["transport"], ["car", "road", "bus", "truck", "taxi", "wheel"]],
  ["sail", "sail", "voile", ["transport", "water"], ["boat", "sailboat", "wind", "sea", "ship", "lake", "pirate"]],
  ["hunt", "hunt", "chasser", ["nature", "adventure"], ["lion", "fox", "wolf", "treasure", "egg", "forest", "easter"]],

  // Places and home
  ["room", "room", "pièce", ["home"], ["bedroom", "kitchen", "bathroom", "house", "door", "window", "home", "wall"]],
  ["garage", "garage", "garage", ["home", "transport"], ["car", "door", "bike", "house", "tool", "truck"]],
  ["tool", "tool", "outil", ["home", "job"], ["hammer", "builder", "garage", "box", "fix", "nail"]],
  ["nail", "nail", "clou", ["home", "body"], ["hammer", "wood", "finger", "tool", "builder", "metal"]],
  ["metal", "metal", "métal", ["science"], ["robot", "iron", "gold", "silver", "car", "nail"]],
  ["iron", "iron", "fer", ["science", "home"], ["metal", "clothes", "hot", "shirt", "strong"]],
  ["silver", "silver", "argenté", ["color"], ["gold", "metal", "medal", "ring", "jewel", "shiny"]],
  ["fix", "fix", "réparer", ["job"], ["tool", "hammer", "broken", "car", "builder", "help"]],
  ["broken", "broken", "cassé", ["home"], ["fix", "glass", "toy", "hurt", "sad", "phone"]],
  ["stairs", "stairs", "escalier", ["home"], ["up", "down", "house", "climb", "floor", "ladder", "step"]],
  ["ladder", "ladder", "échelle", ["home", "job"], ["climb", "tree", "roof", "firefighter", "stairs", "up"]],
  ["up", "up", "haut", ["sky"], ["down", "sky", "climb", "stairs", "high", "jump"]],
  ["down", "down", "bas", ["home"], ["up", "stairs", "fall", "floor", "ground", "slide"]],
  ["high", "high", "en hauteur", ["sky"], ["up", "sky", "tall", "mountain", "tower", "jump"]],
  ["tall", "tall", "élancé", ["shape"], ["giraffe", "tree", "tower", "high", "big", "short"]],
  ["short", "short", "court", ["shape"], ["tall", "small", "shorts", "long", "hair"]],
  ["long", "long", "long", ["shape", "time"], ["short", "hair", "snake", "train", "giraffe", "road", "time"]],
  ["step", "step", "pas", ["home"], ["stairs", "walk", "foot", "dance", "climb"]],
  ["carpet", "carpet", "tapis", ["home"], ["floor", "rug", "living_room", "vacuum", "magic", "soft"]],
  ["rug", "rug", "carpette", ["home"], ["carpet", "floor", "soft", "living_room", "cozy"]],
  ["living_room", "living room", "salon", ["home"], ["sofa", "tv", "home", "rug", "lamp", "family", "room"]],
  ["church", "church", "église", ["city", "celebration"], ["wedding", "bell", "christmas", "sing", "town", "tower"]],
  ["bell", "bell", "cloche", ["sound", "school"], ["church", "school", "christmas", "ring", "door", "bike", "sound"]],

  // Vehicles
  ["motorcycle", "motorcycle", "moto", ["transport"], ["bike", "helmet", "fast", "road", "car", "wheel", "scooter"]],
  ["scooter", "scooter", "trottinette", ["transport", "toy"], ["bike", "skateboard", "wheel", "ride", "park", "helmet", "motorcycle"]],
  ["taxi", "taxi", "taxi", ["transport", "city"], ["car", "yellow", "city", "airport", "street", "drive", "bus"]],
  ["van", "van", "camionnette", ["transport"], ["car", "truck", "bus", "family", "road", "drive", "camping"]],

  // Clothes and accessories
  ["shorts", "shorts", "short", ["clothes", "season"], ["pants", "summer", "shirt", "beach", "swimsuit", "sock", "hot"]],
  ["skirt", "skirt", "jupe", ["clothes"], ["dress", "girl", "pants", "pretty", "shirt", "dance"]],
  ["sandal", "sandal", "sandale", ["clothes", "season"], ["shoe", "summer", "beach", "foot", "sand", "sock"]],
  ["necklace", "necklace", "collier", ["clothes"], ["ring", "jewel", "gold", "neck", "gift", "pretty", "pearl"]],
  ["neck", "neck", "cou", ["body"], ["head", "giraffe", "scarf", "necklace", "body"]],
  ["pearl", "pearl", "perle", ["ocean"], ["shell", "necklace", "white", "jewel", "sea", "oyster"]],
  ["oyster", "oyster", "huître", ["ocean", "food"], ["pearl", "shell", "sea", "food", "crab"]],
  ["bag", "bag", "sac", ["clothes", "travel"], ["backpack", "suitcase", "shop", "school", "box", "gift", "pocket"]],

  // School and play
  ["recess", "recess", "récréation", ["school", "game"], ["school", "playground", "play", "friend", "lunch", "game", "bell"]],
  ["string", "string", "ficelle", ["toy"], ["kite", "balloon", "rope", "yarn", "tie", "gift"]],
  ["yarn", "yarn", "pelote", ["home", "art"], ["wool", "knit", "cat", "sweater", "scarf", "ball"]],
  ["knit", "knit", "tricoter", ["home", "art"], ["yarn", "wool", "sweater", "scarf", "grandma", "mitten"]],
  ["tie", "tie", "cravate", ["clothes"], ["shirt", "suit", "dad", "knot", "wedding", "office"]],
  ["suit", "suit", "costume", ["clothes", "job"], ["tie", "shirt", "wedding", "office", "jacket", "pants"]],
  ["office", "office", "entreprise", ["job", "city"], ["desk", "computer", "work", "paper", "boss", "suit", "meeting"]],
  ["work", "work", "travail", ["job"], ["job", "office", "boss", "money", "busy", "computer"]],
  ["job", "job", "métier", ["job"], ["work", "doctor", "teacher", "money", "office", "firefighter"]],
  ["boss", "boss", "patron", ["job"], ["office", "work", "meeting", "job", "money"]],
  ["meeting", "meeting", "réunion", ["job"], ["office", "boss", "work", "talk", "table", "calendar"]],
  ["calendar", "calendar", "calendrier", ["time"], ["day", "week", "month", "year", "birthday", "time", "meeting"]],
  ["month", "month", "mois", ["time"], ["year", "week", "calendar", "day", "time", "season"]],
  ["talk", "talk", "parler", ["sound"], ["phone", "friend", "mouth", "word", "speak", "meeting"]],
  ["speak", "speak", "dire", ["sound"], ["talk", "word", "mouth", "language", "voice"]],
  ["voice", "voice", "voix", ["sound", "music"], ["sing", "song", "speak", "loud", "quiet", "mouth"]],
  ["language", "language", "langue", ["school"], ["word", "speak", "letter", "french", "english", "book"]],
  ["french", "French", "français", ["school"], ["language", "france", "paris", "croissant", "bread"]],
  ["english", "English", "anglais", ["school"], ["language", "word", "book", "letter", "read"]],
  ["france", "France", "France", ["travel"], ["paris", "french", "croissant", "bread", "cheese", "travel"]],
  ["paris", "Paris", "Paris", ["city", "travel"], ["france", "tower", "city", "french", "travel", "croissant"]]
];

/** New links between existing concepts (undirected), found missing while adding the rows above. */
export const ADDED_LINKS_3 = [
  ["chicken", "bird"], ["chicken", "fish"], ["chicken", "dinner"], ["sea", "seagull"], ["sea", "bird"],
  ["paw", "pet"], ["fish", "pet"], ["wood", "tree"], ["wood", "fence"], ["farm", "fence"], ["ship", "boat"],
  ["surf", "wave"], ["surf", "beach"], ["surf", "ocean"], ["surf", "sea"], ["surf", "summer"], ["surf", "board_game"],
  ["egg", "chick"], ["nest", "twig"], ["horse", "farm"], ["seahorse", "fish"], ["seahorse", "sea"], ["aquarium", "pet"]
];

/** Compounds and set phrases (undirected, per language). */
export const ADDED_PHRASES_3 = {
  en: [["battleship", "ship"], ["bird", "nest"], ["sea", "gull"]],
  fr: []
};

/** Category memberships for the new concepts: [category, members]. */
export const ADDED_MEMBERS_3 = [
  ["bird", ["chick", "seagull", "hen", "rooster", "goose", "turkey", "crow", "pigeon", "robin", "swan", "flamingo", "peacock", "ostrich", "hawk", "sparrow", "dove"]],
  ["animal", ["donkey", "calf", "bull", "lamb", "deer", "moose", "gorilla", "koala", "hippo", "rhino", "lizard", "toad", "rat", "hedgehog", "raccoon", "skunk", "beaver", "otter", "seal", "tuna"]],
  ["insect", ["wasp", "beetle", "bug", "mosquito"]],
  ["farm", ["donkey", "calf", "bull", "lamb", "hen", "rooster", "goose", "turkey", "piglet", "chick", "fence", "wheat"]],
  ["fruit", ["peach", "lime", "coconut", "mango"]],
  ["vegetable", ["onion", "garlic", "broccoli", "lettuce", "cucumber", "pepper", "bean", "pea"]],
  ["food", ["rice", "yogurt", "bacon", "sausage", "ham", "meat", "steak", "noodle", "taco", "waffle", "muffin", "chips", "ketchup", "tuna"]],
  ["dessert", ["popsicle", "waffle", "muffin"]],
  ["drink", ["soda"]],
  ["ocean", ["tuna", "seal", "coral", "reef", "seagull", "battleship"]],
  ["clothes", ["shorts", "skirt", "sandal", "necklace", "tie", "suit"]],
  ["pet", ["rat"]]
];

/**
 * Lexicon-3 aliases: everyday variants of existing concepts (a real concept with the same spelling
 * always wins). Plurals and gerunds of these follow the usual rules.
 */
export const ALIASES_3 = {
  en: {
    surfing: "surf", surfer: "surf", diving: "dive", hopping: "jump", hop: "jump", camp: "camping", yard: "garden",
    town: "city", palace: "castle", cafe: "restaurant", café: "restaurant", bicycle: "bike", teddy: "teddy_bear", lego: "blocks",
    block: "blocks", jeans: "pants", trousers: "pants", boot: "boots", mother: "mom", father: "dad", beef: "meat", pork: "meat",
    spaghetti: "pasta", macaroni: "pasta", duckling: "duck", alligator: "crocodile", gull: "seagull", seashell: "shell",
    chickens: "chicken", fries: "fries", sneaker: "shoe", trainers: "shoe", kitty: "cat", sea_horse: "seahorse",
    tv: "tv", telly: "tv", television: "tv", hotdog: "sausage", grandmother: "grandma", grandfather: "grandpa",
    granny: "grandma", nana: "grandma", grandad: "grandpa", grampa: "grandpa", fishes: "fish", sheeps: "sheep",
    mice: "mouse", geese: "goose", feet: "foot", wolves: "wolf", leaves: "leaf", knives: "knife", calves: "calf",
    children: "child", puppies: "puppy", ponies: "pony", babies: "baby", tunafish: "tuna", hamburger: "burger",
    cheeseburger: "burger", guineapig: "hamster"
  },
  fr: {
    surf: "surf", plongée: "dive", vélo: "bike", bicyclette: "bike", maman: "mom", papa: "dad", mouettes: "seagull",
    poussins: "chick", brindilles: "twig", requin: "shark", spaghettis: "pasta", nouilles: "noodle"
  }
};
