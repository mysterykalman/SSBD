// src/shared/lexicon/data.js
var CONCEPTS = [
  // Sky, weather, space
  ["sun", "sun", "soleil", ["sky", "light", "hot"], ["moon", "sky", "day", "summer", "star", "light", "beach", "hot", "sunflower", "yellow", "space"]],
  ["moon", "moon", "lune", ["sky", "night", "space"], ["sky", "night", "star", "space", "rocket", "planet", "dream", "light", "astronaut", "owl"]],
  ["star", "star", "\xE9toile", ["sky", "night", "space"], ["sky", "night", "space", "planet", "wish", "light", "shine", "rocket", "shape"]],
  ["sky", "sky", "ciel", ["sky", "nature"], ["cloud", "bird", "plane", "rainbow", "blue", "star", "kite", "fly", "space", "night", "day"]],
  ["cloud", "cloud", "nuage", ["sky", "weather"], ["rain", "sky", "storm", "white", "soft", "snow", "wind", "thunder", "plane"]],
  ["rain", "rain", "pluie", ["weather", "water", "sky"], ["cloud", "umbrella", "puddle", "storm", "rainbow", "water", "flower", "grow", "garden", "wet", "boots", "spring"]],
  ["snow", "snow", "neige", ["weather", "cold", "season"], ["winter", "cold", "snowman", "sled", "ice", "white", "mountain", "ski", "christmas", "snowflake", "mitten"]],
  ["storm", "storm", "orage", ["weather", "sky", "sound"], ["thunder", "lightning", "rain", "wind", "cloud", "scary", "loud"]],
  ["rainbow", "rainbow", "arc-en-ciel", ["sky", "color", "weather"], ["rain", "color", "sun", "sky", "unicorn", "red", "purple", "cloud"]],
  ["thunder", "thunder", "tonnerre", ["weather", "sound"], ["lightning", "storm", "loud", "cloud", "scary"]],
  ["lightning", "lightning", "\xE9clair", ["weather", "light"], ["thunder", "storm", "fast", "electricity", "bright"]],
  ["wind", "wind", "vent", ["weather", "nature"], ["kite", "storm", "leaf", "autumn", "cloud", "boat", "cold"]],
  ["umbrella", "umbrella", "parapluie", ["weather"], ["rain", "wet", "boots", "puddle", "coat", "beach"]],
  ["puddle", "puddle", "flaque", ["weather", "water"], ["rain", "boots", "mud", "wet", "jump"]],
  ["snowman", "snowman", "bonhomme de neige", ["cold", "season"], ["snow", "winter", "carrot", "scarf", "cold", "hat"]],
  ["snowflake", "snowflake", "flocon", ["cold", "weather"], ["snow", "winter", "ice", "cold", "white"]],
  ["light", "light", "lumi\xE8re", ["light"], ["sun", "lamp", "bright", "dark", "candle", "star", "day", "flashlight", "shine"]],
  ["night", "night", "nuit", ["night", "time"], ["moon", "star", "dark", "sleep", "dream", "bed", "owl", "bat", "day", "pajamas"]],
  ["day", "day", "jour", ["time", "light"], ["sun", "night", "morning", "light", "time", "sky"]],
  ["morning", "morning", "matin", ["time"], ["breakfast", "sun", "day", "school", "coffee"]],
  ["dark", "dark", "sombre", ["night", "color"], ["night", "black", "scary", "light", "flashlight", "bat"]],
  ["dream", "dream", "r\xEAve", ["night", "feeling"], ["sleep", "night", "bed", "wish", "pillow", "moon", "unicorn", "nightmare"]],
  ["nightmare", "nightmare", "cauchemar", ["night", "feeling"], ["dream", "scary", "monster", "night", "sleep", "ghost"]],
  ["sleep", "sleep", "dormir", ["night", "home"], ["bed", "night", "dream", "pillow", "tired", "pajamas", "blanket"]],
  ["bed", "bed", "lit", ["home", "night"], ["sleep", "pillow", "blanket", "night", "dream", "bedroom", "pajamas", "teddy_bear"]],
  ["pillow", "pillow", "oreiller", ["home", "night"], ["bed", "sleep", "soft", "dream", "blanket", "feather"]],
  ["blanket", "blanket", "couverture", ["home", "night"], ["bed", "pillow", "warm", "soft", "sleep", "cozy"]],
  ["space", "space", "espace", ["space", "science"], ["rocket", "planet", "star", "moon", "astronaut", "alien", "sun", "earth"]],
  ["rocket", "rocket", "fus\xE9e", ["space", "transport"], ["space", "moon", "astronaut", "planet", "fast", "fire", "fly", "star"]],
  ["planet", "planet", "plan\xE8te", ["space", "science"], ["space", "earth", "star", "moon", "rocket", "alien", "round"]],
  ["earth", "earth", "terre", ["space", "nature"], ["planet", "world", "space", "moon", "nature", "round"]],
  ["astronaut", "astronaut", "astronaute", ["space", "job"], ["rocket", "space", "moon", "planet", "helmet", "star"]],
  ["alien", "alien", "extraterrestre", ["space", "story"], ["space", "planet", "green", "rocket", "monster"]],
  // Animals
  ["animal", "animal", "animal", ["animal"], ["pet", "zoo", "farm", "dog", "cat", "jungle", "fur", "paw", "tail", "forest", "wild"]],
  ["pet", "pet", "animal domestique", ["pet", "animal", "home"], ["dog", "cat", "fish", "hamster", "rabbit", "animal", "home", "love", "fur", "paw", "tail", "vet"]],
  ["dog", "dog", "chien", ["animal", "pet"], ["cat", "bone", "puppy", "paw", "tail", "fur", "pet", "ball", "walk", "wolf"]],
  ["puppy", "puppy", "chiot", ["animal", "pet"], ["dog", "baby", "cute", "play", "paw"]],
  ["cat", "cat", "chat", ["animal", "pet"], ["dog", "mouse", "milk", "kitten", "paw", "tail", "fur", "pet", "fish"]],
  ["kitten", "kitten", "chaton", ["animal", "pet"], ["cat", "baby", "cute", "milk"]],
  ["fur", "fur", "fourrure", ["animal", "body"], ["dog", "cat", "bear", "soft", "warm", "rabbit", "fox"]],
  ["paw", "paw", "patte", ["animal", "body"], ["dog", "cat", "bear", "foot"]],
  ["tail", "tail", "queue", ["animal", "body"], ["dog", "cat", "monkey", "mouse", "fox", "fish", "horse"]],
  ["bird", "bird", "oiseau", ["animal", "sky"], ["nest", "wing", "feather", "fly", "egg", "sky", "tree", "sing", "owl", "parrot"]],
  ["fish", "fish", "poisson", ["animal", "ocean", "water"], ["water", "ocean", "swim", "sea", "shark", "boat", "pet", "river", "aquarium"]],
  ["horse", "horse", "cheval", ["animal", "farm"], ["farm", "ride", "unicorn", "knight", "tail", "pony", "hay"]],
  ["pony", "pony", "poney", ["animal", "farm"], ["horse", "ride", "farm", "cute", "unicorn"]],
  ["cow", "cow", "vache", ["animal", "farm"], ["milk", "farm", "grass", "cheese", "barn", "farmer"]],
  ["pig", "pig", "cochon", ["animal", "farm"], ["farm", "mud", "pink", "barn"]],
  ["sheep", "sheep", "mouton", ["animal", "farm"], ["farm", "wool", "grass", "white", "cloud", "sleep"]],
  ["chicken", "chicken", "poule", ["animal", "farm"], ["egg", "farm", "feather", "nest", "barn"]],
  ["duck", "duck", "canard", ["animal", "water", "farm"], ["pond", "feather", "swim", "farm", "wing", "bird"]],
  ["lion", "lion", "lion", ["animal"], ["tiger", "king", "roar", "zoo", "jungle", "cat", "wild"]],
  ["tiger", "tiger", "tigre", ["animal"], ["lion", "jungle", "zoo", "orange", "roar", "wild", "cat"]],
  ["elephant", "elephant", "\xE9l\xE9phant", ["animal"], ["zoo", "big", "jungle", "circus", "grey", "giraffe"]],
  ["monkey", "monkey", "singe", ["animal"], ["banana", "jungle", "tree", "zoo", "tail", "climb", "funny"]],
  ["bear", "bear", "ours", ["animal", "nature"], ["forest", "honey", "teddy_bear", "fur", "cave", "paw", "big", "winter", "panda"]],
  ["teddy_bear", "teddy bear", "nounours", ["toy", "home"], ["bear", "toy", "soft", "bed", "hug", "cute"]],
  ["frog", "frog", "grenouille", ["animal", "water"], ["pond", "jump", "green", "prince", "fly", "river"]],
  ["bee", "bee", "abeille", ["animal", "nature"], ["honey", "flower", "garden", "yellow", "insect"]],
  ["butterfly", "butterfly", "papillon", ["animal", "nature"], ["flower", "wing", "garden", "caterpillar", "color", "fly", "spring", "insect"]],
  ["caterpillar", "caterpillar", "chenille", ["animal", "nature"], ["butterfly", "leaf", "green", "insect", "garden", "grow"]],
  ["insect", "insect", "insecte", ["animal", "nature"], ["bee", "ant", "butterfly", "ladybug", "spider", "garden", "grass"]],
  ["ant", "ant", "fourmi", ["animal", "nature"], ["insect", "picnic", "small", "garden", "grass"]],
  ["ladybug", "ladybug", "coccinelle", ["animal", "nature"], ["insect", "red", "garden", "leaf"]],
  ["spider", "spider", "araign\xE9e", ["animal", "nature"], ["insect", "halloween", "scary", "leg", "ghost", "haunted_house"]],
  ["owl", "owl", "hibou", ["animal", "night", "nature"], ["night", "bird", "forest", "tree", "moon", "feather"]],
  ["bat", "bat", "chauve-souris", ["animal", "night"], ["night", "cave", "halloween", "dark", "wing", "vampire"]],
  ["wolf", "wolf", "loup", ["animal", "nature", "story"], ["forest", "moon", "dog", "fox", "wild"]],
  ["fox", "fox", "renard", ["animal", "nature"], ["forest", "orange", "tail", "wolf", "rabbit", "fur"]],
  ["rabbit", "rabbit", "lapin", ["animal", "pet"], ["carrot", "ear", "easter", "pet", "fur", "garden", "jump"]],
  ["mouse", "mouse", "souris", ["animal", "pet"], ["cat", "cheese", "small", "tail", "computer"]],
  ["hamster", "hamster", "hamster", ["animal", "pet"], ["pet", "small", "wheel", "cute", "mouse"]],
  ["parrot", "parrot", "perroquet", ["animal", "pet"], ["bird", "pirate", "jungle", "feather", "color"]],
  ["snake", "snake", "serpent", ["animal"], ["jungle", "scary", "desert", "zoo", "crocodile"]],
  ["giraffe", "giraffe", "girafe", ["animal"], ["zoo", "elephant", "zebra", "tree", "animal", "jungle"]],
  ["zebra", "zebra", "z\xE8bre", ["animal"], ["zoo", "horse", "giraffe", "black", "white"]],
  ["penguin", "penguin", "pingouin", ["animal", "cold"], ["ice", "cold", "snow", "fish", "swim", "bird", "ocean"]],
  ["panda", "panda", "panda", ["animal"], ["bear", "zoo", "black", "white", "cute"]],
  ["shark", "shark", "requin", ["animal", "ocean"], ["ocean", "fish", "tooth", "sea", "scary", "swim"]],
  ["whale", "whale", "baleine", ["animal", "ocean"], ["ocean", "sea", "big", "dolphin", "swim", "fish"]],
  ["dolphin", "dolphin", "dauphin", ["animal", "ocean"], ["ocean", "sea", "swim", "whale", "jump", "wave"]],
  ["octopus", "octopus", "pieuvre", ["animal", "ocean"], ["ocean", "sea", "arm", "fish"]],
  ["crab", "crab", "crabe", ["animal", "ocean"], ["beach", "sand", "sea", "shell", "ocean", "starfish"]],
  ["turtle", "turtle", "tortue", ["animal", "water"], ["shell", "slow", "sea", "beach", "pond", "green"]],
  ["snail", "snail", "escargot", ["animal", "nature"], ["slow", "shell", "garden", "rain", "leaf"]],
  ["dinosaur", "dinosaur", "dinosaure", ["animal", "science", "story"], ["fossil", "big", "roar", "egg", "volcano", "dragon", "bone", "museum"]],
  // Fantasy and stories
  ["dragon", "dragon", "dragon", ["magic", "story", "fire"], ["fire", "castle", "knight", "princess", "wing", "treasure", "dinosaur", "scary", "cave", "magic"]],
  ["unicorn", "unicorn", "licorne", ["magic", "story", "animal"], ["horse", "rainbow", "magic", "princess", "fairy", "dream", "sparkle"]],
  ["castle", "castle", "ch\xE2teau", ["story", "magic", "home"], ["king", "queen", "princess", "knight", "dragon", "tower", "crown", "prince", "sandcastle"]],
  ["princess", "princess", "princesse", ["story", "magic"], ["prince", "castle", "crown", "queen", "king", "dress", "fairy", "dragon"]],
  ["prince", "prince", "prince", ["story", "magic"], ["princess", "castle", "king", "frog", "crown", "knight", "horse"]],
  ["knight", "knight", "chevalier", ["story", "adventure"], ["castle", "sword", "dragon", "horse", "shield", "king", "princess"]],
  ["king", "king", "roi", ["story"], ["queen", "crown", "castle", "prince", "lion", "knight", "princess"]],
  ["queen", "queen", "reine", ["story"], ["king", "crown", "castle", "princess", "bee"]],
  ["crown", "crown", "couronne", ["story", "clothes"], ["king", "queen", "princess", "gold", "castle", "jewel", "prince"]],
  ["pirate", "pirate", "pirate", ["story", "adventure", "ocean"], ["treasure", "ship", "parrot", "island", "map", "sea", "sword", "captain"]],
  ["treasure", "treasure", "tr\xE9sor", ["adventure", "story"], ["pirate", "gold", "map", "island", "dragon", "jewel"]],
  ["magic", "magic", "magie", ["magic"], ["wizard", "wand", "fairy", "spell", "unicorn", "witch", "dragon", "sparkle"]],
  ["wizard", "wizard", "sorcier", ["magic", "story"], ["magic", "wand", "spell", "hat", "witch", "castle", "owl", "beard"]],
  ["witch", "witch", "sorci\xE8re", ["magic", "story", "holiday"], ["broom", "halloween", "hat", "spell", "cat", "wizard", "magic", "cauldron"]],
  ["fairy", "fairy", "f\xE9e", ["magic", "story"], ["wing", "magic", "wand", "princess", "flower", "sparkle", "tooth", "unicorn", "star"]],
  ["wand", "wand", "baguette magique", ["magic"], ["wizard", "magic", "fairy", "spell", "witch", "star"]],
  ["spell", "spell", "sortil\xE8ge", ["magic"], ["magic", "wizard", "witch", "wand", "potion"]],
  ["ghost", "ghost", "fant\xF4me", ["story", "holiday"], ["halloween", "scary", "haunted_house", "white", "monster", "night"]],
  ["monster", "monster", "monstre", ["story"], ["scary", "halloween", "ghost", "nightmare", "tooth", "dragon", "alien", "closet"]],
  ["hero", "hero", "h\xE9ros", ["story", "adventure"], ["superhero", "brave", "adventure", "cape", "knight", "story"]],
  ["superhero", "superhero", "super-h\xE9ros", ["story", "adventure"], ["hero", "cape", "mask", "fly", "strong"]],
  ["cape", "cape", "cape", ["clothes", "story"], ["superhero", "hero", "wizard", "fly", "mask", "costume"]],
  ["robot", "robot", "robot", ["tech", "toy", "science"], ["computer", "space", "alien", "toy", "battery"]],
  ["adventure", "adventure", "aventure", ["adventure"], ["explore", "map", "treasure", "hero", "jungle", "pirate", "camping"]],
  ["map", "map", "carte", ["adventure"], ["treasure", "pirate", "island", "adventure", "explore"]],
  ["story", "story", "histoire", ["story", "book"], ["book", "read", "bedtime", "fairy", "hero", "princess", "dragon", "write"]],
  ["book", "book", "livre", ["book", "school"], ["read", "story", "library", "school", "write", "teacher"]],
  // School
  ["school", "school", "\xE9cole", ["school"], ["teacher", "book", "pencil", "class", "student", "read", "write", "library", "backpack", "homework", "friend"]],
  ["teacher", "teacher", "ma\xEEtresse", ["school", "job"], ["school", "class", "student", "book", "read", "write"]],
  ["student", "student", "\xE9l\xE8ve", ["school"], ["school", "teacher", "class", "homework", "backpack"]],
  ["class", "class", "classe", ["school"], ["school", "teacher", "student", "desk"]],
  ["pencil", "pencil", "crayon", ["school", "art"], ["write", "draw", "paper", "eraser", "school", "pen", "color"]],
  ["pen", "pen", "stylo", ["school"], ["write", "pencil", "paper", "letter"]],
  ["paper", "paper", "papier", ["school", "art"], ["pencil", "write", "draw", "book", "letter", "scissors"]],
  ["eraser", "eraser", "gomme", ["school"], ["pencil", "school", "paper", "pen", "desk"]],
  ["read", "read", "lire", ["book", "school"], ["book", "story", "library", "write", "letter", "school", "word"]],
  ["write", "write", "\xE9crire", ["book", "school"], ["pencil", "pen", "read", "paper", "letter", "story", "word"]],
  ["library", "library", "biblioth\xE8que", ["book", "school", "city"], ["book", "read", "quiet", "story", "school"]],
  ["homework", "homework", "devoirs", ["school"], ["school", "pencil", "teacher", "student", "math"]],
  ["backpack", "backpack", "cartable", ["school", "clothes"], ["school", "book", "camping", "hike", "lunch"]],
  ["math", "math", "maths", ["school", "science"], ["number", "count", "school", "homework", "brain"]],
  ["word", "word", "mot", ["school", "book"], ["letter", "read", "write", "book", "story"]],
  ["letter", "letter", "lettre", ["school", "book"], ["write", "read", "word", "alphabet"]],
  // Family, home, feelings
  ["family", "family", "famille", ["family", "home"], ["mom", "dad", "baby", "brother", "sister", "home", "love", "grandma", "grandpa", "christmas"]],
  ["mom", "mom", "maman", ["family"], ["dad", "family", "baby", "love", "hug", "home"]],
  ["dad", "dad", "papa", ["family"], ["mom", "family", "baby", "love", "hug", "home"]],
  ["baby", "baby", "b\xE9b\xE9", ["family"], ["mom", "dad", "cry", "small", "family", "cute"]],
  ["brother", "brother", "fr\xE8re", ["family"], ["sister", "family", "mom", "dad", "play"]],
  ["sister", "sister", "s\u0153ur", ["family"], ["brother", "family", "mom", "dad", "play"]],
  ["grandma", "grandma", "mamie", ["family"], ["grandpa", "family", "cookie", "hug", "old"]],
  ["grandpa", "grandpa", "papi", ["family"], ["grandma", "family", "story", "old", "beard"]],
  ["home", "home", "maison", ["home", "family"], ["family", "door", "window", "kitchen", "bed", "roof", "garden", "key", "cozy"]],
  ["love", "love", "amour", ["feeling", "family"], ["heart", "hug", "kiss", "family", "friend", "mom", "happy"]],
  ["friend", "friend", "ami", ["feeling", "family"], ["play", "love", "hug", "share", "school", "team", "happy", "party"]],
  ["hug", "hug", "c\xE2lin", ["feeling", "family"], ["love", "mom", "dad", "friend", "teddy_bear", "warm", "arm"]],
  ["kiss", "kiss", "bisou", ["feeling", "family"], ["love", "hug", "mom", "heart"]],
  ["heart", "heart", "c\u0153ur", ["body", "feeling", "shape"], ["love", "red", "kiss", "body", "valentine", "shape"]],
  ["happy", "happy", "content", ["feeling"], ["smile", "laugh", "fun", "party", "sad", "love"]],
  ["sad", "sad", "triste", ["feeling"], ["cry", "happy", "rain", "hurt"]],
  ["scary", "scary", "effrayant", ["feeling"], ["monster", "ghost", "dark", "halloween", "spider", "nightmare", "shark", "fear"]],
  ["fear", "fear", "peur", ["feeling"], ["scary", "dark", "monster", "brave", "nightmare"]],
  ["fun", "fun", "amusant", ["feeling", "game"], ["play", "game", "party", "happy", "laugh", "friend", "park", "toy"]],
  ["smile", "smile", "sourire", ["feeling", "body"], ["happy", "laugh", "tooth", "face", "mouth", "sun"]],
  ["laugh", "laugh", "rire", ["feeling", "sound"], ["smile", "happy", "funny", "clown", "fun"]],
  ["cry", "cry", "pleurer", ["feeling"], ["sad", "baby", "hurt", "angry"]],
  ["door", "door", "porte", ["home"], ["key", "window", "home", "roof"]],
  ["window", "window", "fen\xEAtre", ["home"], ["door", "glass", "home", "eye"]],
  ["kitchen", "kitchen", "cuisine", ["home", "food"], ["cook", "oven", "fridge", "food", "plate", "spoon", "home", "table"]],
  ["garden", "garden", "jardin", ["home", "plant", "nature"], ["flower", "grass", "tree", "grow", "seed", "vegetable", "bee", "butterfly", "rain", "home"]],
  ["candle", "candle", "bougie", ["light", "fire", "celebration"], ["cake", "birthday", "fire", "light", "wish", "dark"]],
  // Body
  ["body", "body", "corps", ["body"], ["hand", "foot", "head", "arm", "leg", "heart", "eye"]],
  ["hand", "hand", "main", ["body"], ["finger", "arm", "wave", "glove", "body", "foot"]],
  ["eye", "eye", "\u0153il", ["body"], ["glasses", "face", "nose", "cry"]],
  ["tooth", "tooth", "dent", ["body"], ["smile", "dentist", "mouth", "fairy"]],
  ["foot", "foot", "pied", ["body"], ["shoe", "sock", "leg", "walk", "hand", "run"]],
  ["face", "face", "visage", ["body"], ["eye", "nose", "mouth", "smile", "head"]],
  ["head", "head", "t\xEAte", ["body"], ["hat", "hair", "face", "brain", "body"]],
  // Clothes
  ["fabric", "fabric", "tissu", ["clothes"], ["clothes", "wool", "soft", "shirt", "dress", "scarf", "mitten", "glove", "sock"]],
  ["pair", "pair", "paire", ["clothes"], ["sock", "shoe", "glove", "mitten", "boots", "eye", "ear", "glasses"]],
  ["cap", "cap", "casquette", ["clothes"], ["hat", "head", "hair", "sun", "clothes"]],
  ["clothes", "clothes", "v\xEAtements", ["clothes"], ["shirt", "dress", "shoe", "sock", "hat", "coat", "pajamas", "pants"]],
  ["shoe", "shoe", "chaussure", ["clothes"], ["foot", "sock", "boots", "walk", "run"]],
  ["sock", "sock", "chaussette", ["clothes"], ["shoe", "foot", "warm"]],
  ["hat", "hat", "chapeau", ["clothes"], ["head", "wizard", "witch", "sun", "scarf", "santa"]],
  ["boots", "boots", "bottes", ["clothes"], ["rain", "puddle", "snow", "shoe", "mud"]],
  ["coat", "coat", "manteau", ["clothes", "cold"], ["winter", "cold", "warm", "scarf", "rain", "jacket"]],
  ["scarf", "scarf", "\xE9charpe", ["clothes", "cold"], ["winter", "cold", "warm", "snowman", "coat", "mitten"]],
  ["mitten", "mitten", "moufle", ["clothes", "cold"], ["winter", "snow", "cold", "hand", "scarf"]],
  ["pajamas", "pajamas", "pyjama", ["clothes", "night"], ["sleep", "bed", "night", "cozy"]],
  ["dress", "dress", "robe", ["clothes"], ["princess", "party", "wedding"]],
  // Food
  ["food", "food", "nourriture", ["food"], ["eat", "hungry", "cook", "lunch", "dinner", "kitchen", "plate", "fruit", "vegetable"]],
  ["pizza", "pizza", "pizza", ["food"], ["cheese", "oven", "tomato", "party", "dinner", "food", "bake", "birthday", "lunch"]],
  ["apple", "apple", "pomme", ["food", "plant"], ["tree", "fruit", "red", "pie", "juice", "green", "teacher"]],
  ["banana", "banana", "banane", ["food", "plant"], ["monkey", "yellow", "fruit", "jungle", "snack"]],
  ["orange", "orange", "orange", ["color", "food"], ["fruit", "juice", "color", "pumpkin", "carrot", "fox", "tiger"]],
  ["fruit", "fruit", "fruit", ["food", "plant"], ["apple", "banana", "orange", "strawberry", "grape", "tree", "juice"]],
  ["strawberry", "strawberry", "fraise", ["food", "plant", "sweet"], ["red", "fruit", "cake", "jam", "summer"]],
  ["grape", "grape", "raisin", ["food", "plant"], ["fruit", "purple", "juice", "green", "snack"]],
  ["lemon", "lemon", "citron", ["food", "plant"], ["yellow", "juice", "fruit", "lemonade", "tea"]],
  ["cake", "cake", "g\xE2teau", ["food", "sweet", "celebration"], ["birthday", "candle", "party", "chocolate", "oven", "sugar", "dessert", "bake", "food", "snack"]],
  ["cookie", "cookie", "biscuit", ["food", "sweet"], ["chocolate", "milk", "oven", "bake", "sugar", "grandma", "dessert", "christmas"]],
  ["ice_cream", "ice cream", "glace", ["food", "sweet", "cold"], ["summer", "cold", "chocolate", "dessert", "strawberry", "beach"]],
  ["chocolate", "chocolate", "chocolat", ["food", "sweet"], ["cake", "candy", "cookie", "easter", "sweet", "brown", "ice_cream", "hot_chocolate"]],
  ["candy", "candy", "bonbon", ["food", "sweet"], ["sweet", "sugar", "halloween", "lollipop", "chocolate", "party"]],
  ["lollipop", "lollipop", "sucette", ["food", "sweet"], ["candy", "sugar", "sweet", "party", "pink"]],
  ["sweet", "sweet", "friandise", ["food", "sweet"], ["sugar", "candy", "cake", "honey", "chocolate", "dessert"]],
  ["sugar", "sugar", "sucre", ["food", "sweet"], ["sweet", "candy", "cake", "cookie", "tea"]],
  ["dessert", "dessert", "dessert", ["food", "sweet"], ["cake", "ice_cream", "pie", "cookie", "dinner", "sweet"]],
  ["bread", "bread", "pain", ["food"], ["butter", "sandwich", "bakery", "toast", "jam", "oven", "cheese"]],
  ["cheese", "cheese", "fromage", ["food"], ["mouse", "pizza", "milk", "sandwich", "cow", "bread"]],
  ["milk", "milk", "lait", ["food", "drink"], ["cow", "cookie", "cereal", "cat", "white", "glass", "baby"]],
  ["water", "water", "eau", ["water", "drink", "nature"], ["drink", "river", "ocean", "rain", "swim", "glass", "lake", "wet", "fish"]],
  ["juice", "juice", "jus", ["drink", "food"], ["orange", "apple", "glass", "breakfast", "fruit", "drink"]],
  ["tea", "tea", "th\xE9", ["drink", "hot"], ["cup", "hot", "sugar", "milk", "party", "grandma"]],
  ["hot_chocolate", "hot chocolate", "chocolat chaud", ["drink", "hot", "sweet"], ["chocolate", "winter", "cup", "milk", "warm", "cozy"]],
  ["drink", "drink", "boire", ["drink"], ["water", "juice", "milk", "glass", "cup"]],
  ["soup", "soup", "soupe", ["food", "hot"], ["spoon", "hot", "vegetable", "winter", "carrot"]],
  ["egg", "egg", "\u0153uf", ["food", "animal"], ["chicken", "nest", "bird", "breakfast", "easter", "dinosaur", "shell", "bake"]],
  ["honey", "honey", "miel", ["food", "sweet"], ["bee", "bear", "sweet", "yellow", "toast", "flower"]],
  ["carrot", "carrot", "carotte", ["food", "plant"], ["rabbit", "orange", "vegetable", "snowman", "garden", "soup"]],
  ["vegetable", "vegetable", "l\xE9gume", ["food", "plant"], ["carrot", "garden", "tomato", "salad", "soup", "farm", "potato"]],
  ["tomato", "tomato", "tomate", ["food", "plant"], ["red", "pizza", "salad", "vegetable", "garden"]],
  ["sandwich", "sandwich", "sandwich", ["food"], ["bread", "cheese", "lunch", "picnic", "butter"]],
  ["picnic", "picnic", "pique-nique", ["food", "nature", "adventure"], ["park", "sandwich", "basket", "ant", "summer", "blanket", "grass", "lunch", "sun"]],
  ["oven", "oven", "four", ["home", "food", "hot"], ["bake", "cake", "cookie", "pizza", "bread", "kitchen", "hot", "cook", "food"]],
  ["cook", "cook", "cuisiner", ["food", "home"], ["kitchen", "oven", "chef", "food", "bake", "dinner", "soup"]],
  ["bake", "bake", "p\xE2tisserie", ["food", "sweet"], ["cake", "cookie", "oven", "bread", "pie"]],
  ["party", "party", "f\xEAte", ["celebration"], ["birthday", "cake", "balloon", "dance", "music", "friend", "gift", "candy", "fun", "game", "costume"]],
  ["birthday", "birthday", "anniversaire", ["celebration"], ["cake", "candle", "party", "gift", "balloon", "wish", "friend"]],
  ["gift", "gift", "cadeau", ["celebration", "holiday"], ["birthday", "christmas", "surprise", "party", "box", "santa"]],
  ["balloon", "balloon", "ballon gonflable", ["celebration", "toy"], ["party", "birthday", "fly", "red"]],
  ["surprise", "surprise", "surprise", ["celebration", "feeling"], ["gift", "party", "birthday", "box", "happy"]],
  ["wish", "wish", "v\u0153u", ["magic", "feeling"], ["star", "birthday", "candle", "dream", "fairy"]],
  // Holidays and seasons
  ["christmas", "christmas", "no\xEBl", ["holiday", "celebration", "cold"], ["santa", "gift", "tree", "snow", "winter", "reindeer", "star", "elf", "candle", "light"]],
  ["santa", "santa", "p\xE8re no\xEBl", ["holiday", "story"], ["christmas", "gift", "reindeer", "sleigh", "elf", "beard", "red", "chimney"]],
  ["reindeer", "reindeer", "renne", ["animal", "holiday", "cold"], ["santa", "christmas", "snow", "sleigh", "elf", "winter"]],
  ["halloween", "halloween", "halloween", ["holiday", "celebration", "night"], ["ghost", "pumpkin", "witch", "costume", "candy", "scary", "spider", "bat", "monster", "autumn", "night"]],
  ["pumpkin", "pumpkin", "citrouille", ["holiday", "food", "plant"], ["halloween", "orange", "autumn", "pie", "witch", "farm", "candle"]],
  ["costume", "costume", "d\xE9guisement", ["clothes", "celebration"], ["halloween", "party", "mask", "cape", "pirate", "princess"]],
  ["easter", "easter", "p\xE2ques", ["holiday", "celebration", "season"], ["egg", "rabbit", "chocolate", "spring", "basket"]],
  ["holiday", "holiday", "vacances", ["holiday", "time"], ["beach", "summer", "travel", "camping", "fun"]],
  ["summer", "summer", "\xE9t\xE9", ["season", "hot"], ["sun", "beach", "hot", "holiday", "swim", "ice_cream", "pool", "camping", "sunflower"]],
  ["winter", "winter", "hiver", ["season", "cold"], ["snow", "cold", "ice", "christmas", "scarf", "sled", "coat", "snowman", "ski"]],
  ["spring", "spring", "printemps", ["season", "nature"], ["flower", "rain", "grow", "garden", "butterfly", "easter", "bird", "green"]],
  ["autumn", "autumn", "automne", ["season", "nature"], ["leaf", "orange", "wind", "pumpkin", "halloween", "school", "rain", "brown"]],
  ["season", "season", "saison", ["season", "time"], ["summer", "winter", "spring", "autumn", "year", "weather"]],
  ["time", "time", "temps", ["time"], ["clock", "day", "year", "night", "season"]],
  ["clock", "clock", "horloge", ["time"], ["time", "morning", "day", "year"]],
  // Beach and ocean
  ["beach", "beach", "plage", ["ocean", "holiday", "hot"], ["sand", "sea", "ocean", "wave", "sun", "summer", "shell", "swim", "sandcastle", "crab", "towel"]],
  ["ocean", "ocean", "oc\xE9an", ["ocean", "water"], ["sea", "wave", "fish", "whale", "shark", "boat", "beach", "dolphin", "blue", "island"]],
  ["sea", "sea", "mer", ["ocean", "water"], ["ocean", "wave", "beach", "fish", "boat", "shell", "sand", "blue"]],
  ["wave", "wave", "vague", ["ocean", "water"], ["sea", "ocean", "surf", "beach", "puddle"]],
  ["sand", "sand", "sable", ["ocean", "nature"], ["beach", "sandcastle", "desert", "shell", "bucket"]],
  ["sandcastle", "sandcastle", "ch\xE2teau de sable", ["ocean", "toy"], ["sand", "beach", "bucket", "castle"]],
  ["shell", "shell", "coquillage", ["ocean", "nature"], ["beach", "sea", "sand", "snail", "turtle", "crab"]],
  ["boat", "boat", "bateau", ["transport", "water"], ["sea", "ocean", "river", "fish", "pirate", "island", "ship"]],
  ["ship", "ship", "navire", ["transport", "ocean"], ["boat", "pirate", "sea", "captain", "ocean"]],
  ["island", "island", "\xEEle", ["ocean", "nature", "adventure"], ["sea", "ocean", "treasure", "pirate", "beach", "palm_tree", "boat"]],
  ["swim", "swim", "nager", ["water", "sport"], ["pool", "water", "fish", "sea", "beach", "summer", "dolphin", "duck"]],
  ["pool", "pool", "piscine", ["water", "sport"], ["swim", "summer", "puddle", "water", "dive"]],
  // Music and art
  ["music", "music", "musique", ["music", "sound"], ["song", "dance", "sing", "guitar", "piano", "drum", "party", "radio", "band"]],
  ["song", "song", "chanson", ["music"], ["sing", "music", "dance", "radio", "band", "birthday", "party"]],
  ["sing", "sing", "chanter", ["music", "sound"], ["song", "music", "bird", "band", "party"]],
  ["dance", "dance", "danse", ["music", "celebration"], ["music", "party", "song", "jump"]],
  ["drum", "drum", "tambour", ["music", "sound"], ["music", "band", "loud", "guitar", "concert"]],
  ["guitar", "guitar", "guitare", ["music"], ["music", "song", "band", "rock", "drum", "sing"]],
  ["piano", "piano", "piano", ["music"], ["music", "song", "black", "white"]],
  ["band", "band", "groupe", ["music"], ["music", "drum", "guitar", "sing", "concert", "party", "dance"]],
  ["art", "art", "art", ["art"], ["paint", "draw", "color", "museum", "picture", "artist", "pencil"]],
  ["paint", "paint", "peinture", ["art", "color"], ["art", "color", "picture", "draw", "rainbow"]],
  ["draw", "draw", "dessiner", ["art"], ["pencil", "paper", "art", "picture", "paint"]],
  ["picture", "picture", "image", ["art"], ["draw", "paint", "photo", "art"]],
  ["color", "color", "couleur", ["color", "art"], ["red", "blue", "green", "yellow", "rainbow", "paint", "pencil", "purple"]],
  ["red", "red", "rouge", ["color"], ["color", "apple", "fire", "heart", "strawberry", "blue", "rainbow", "tomato"]],
  ["blue", "blue", "bleu", ["color"], ["sky", "sea", "ocean", "color", "red", "water"]],
  ["green", "green", "vert", ["color", "nature"], ["grass", "leaf", "tree", "frog", "color", "nature"]],
  ["yellow", "yellow", "jaune", ["color"], ["sun", "banana", "lemon", "color", "bee"]],
  ["purple", "purple", "violet", ["color"], ["grape", "color", "rainbow", "pink", "unicorn", "flower"]],
  ["pink", "pink", "rose", ["color"], ["pig", "color", "princess", "flower", "purple", "candy"]],
  ["white", "white", "blanc", ["color"], ["snow", "cloud", "milk", "black", "sheep"]],
  ["black", "black", "noir", ["color"], ["white", "dark", "night", "bat", "panda", "zebra"]],
  ["brown", "brown", "marron", ["color"], ["chocolate", "bear", "autumn", "tree", "mud"]],
  // Games, sports, toys
  ["game", "game", "jeu", ["game"], ["play", "win", "toy", "fun", "team", "puzzle", "ball", "board_game", "video_game"]],
  ["play", "play", "jouer", ["game", "toy"], ["game", "toy", "friend", "fun", "park", "ball"]],
  ["toy", "toy", "jouet", ["toy"], ["play", "game", "teddy_bear", "doll", "ball", "puzzle", "robot"]],
  ["ball", "ball", "ballon", ["sport", "toy"], ["soccer", "throw", "catch", "play", "basketball", "round", "dog"]],
  ["soccer", "soccer", "foot", ["sport"], ["ball", "goal", "team", "win", "field", "player"]],
  ["team", "team", "\xE9quipe", ["sport", "game"], ["soccer", "win", "player", "friend", "basketball"]],
  ["win", "win", "gagner", ["sport", "game"], ["game", "team", "trophy", "race", "medal"]],
  ["puzzle", "puzzle", "puzzle", ["game", "toy"], ["game", "toy", "brain", "board_game", "blocks"]],
  ["doll", "doll", "poup\xE9e", ["toy"], ["toy", "play", "dress", "teddy_bear", "princess"]],
  ["kite", "kite", "cerf-volant", ["toy", "sky"], ["wind", "fly", "sky", "beach", "park", "field"]],
  ["park", "park", "parc", ["city", "nature"], ["swing", "slide", "play", "tree", "grass", "picnic", "dog"]],
  ["zoo", "zoo", "zoo", ["animal", "city"], ["animal", "lion", "elephant", "monkey", "giraffe", "tiger", "penguin", "zebra"]],
  ["circus", "circus", "cirque", ["celebration", "adventure"], ["clown", "tent", "elephant", "lion", "show"]],
  ["clown", "clown", "clown", ["celebration", "job"], ["circus", "funny", "nose", "laugh", "balloon"]],
  // Tech, transport, jobs
  ["computer", "computer", "ordinateur", ["tech"], ["screen", "mouse", "game", "robot", "tablet"]],
  ["phone", "phone", "t\xE9l\xE9phone", ["tech"], ["screen", "photo", "computer", "parrot", "tablet"]],
  ["car", "car", "voiture", ["transport", "city"], ["road", "wheel", "bus", "truck", "race"]],
  ["train", "train", "train", ["transport"], ["station", "bus", "travel", "fast"]],
  ["plane", "plane", "avion", ["transport", "sky"], ["fly", "sky", "pilot", "airport", "wing", "cloud", "travel"]],
  ["bike", "bike", "v\xE9lo", ["transport", "sport"], ["ride", "wheel", "helmet", "park", "car"]],
  ["bus", "bus", "bus", ["transport", "city"], ["school", "car", "train", "road"]],
  ["doctor", "doctor", "docteur", ["job", "body"], ["nurse", "hospital", "sick", "medicine", "vet", "dentist"]],
  ["firefighter", "firefighter", "pompier", ["job", "fire"], ["fire", "truck", "brave", "help", "police"]],
  ["police", "police", "police", ["job", "city"], ["car", "help", "firefighter", "ambulance", "city"]],
  // Nature
  ["farm", "farm", "ferme", ["farm", "animal"], ["cow", "pig", "horse", "sheep", "chicken", "barn", "tractor", "farmer", "hay"]],
  ["tree", "tree", "arbre", ["nature", "plant"], ["leaf", "forest", "bird", "apple", "branch", "wood", "nest", "climb", "green"]],
  ["flower", "flower", "fleur", ["nature", "plant"], ["garden", "bee", "butterfly", "spring", "rain", "grow", "seed", "sunflower"]],
  ["sunflower", "sunflower", "tournesol", ["plant", "nature"], ["sun", "flower", "yellow", "seed", "summer", "garden"]],
  ["grass", "grass", "herbe", ["nature", "plant"], ["green", "garden", "cow", "park", "field"]],
  ["leaf", "leaf", "feuille", ["nature", "plant"], ["tree", "green", "autumn", "wind", "branch", "caterpillar"]],
  ["seed", "seed", "graine", ["plant", "nature"], ["grow", "flower", "garden", "plant", "bird", "sunflower"]],
  ["grow", "grow", "pousser", ["plant", "nature"], ["seed", "plant", "garden", "flower", "rain", "tree"]],
  ["plant", "plant", "plante", ["plant", "nature"], ["seed", "grow", "flower", "garden", "leaf", "water", "green"]],
  ["forest", "forest", "for\xEAt", ["nature"], ["tree", "wolf", "bear", "owl", "fox", "leaf", "camping", "mushroom"]],
  ["mountain", "mountain", "montagne", ["nature", "adventure"], ["snow", "climb", "hike", "ski", "rock", "volcano"]],
  ["river", "river", "rivi\xE8re", ["nature", "water"], ["water", "fish", "boat", "bridge", "lake", "frog", "swim"]],
  ["lake", "lake", "lac", ["nature", "water"], ["water", "river", "boat", "fish", "duck", "pond", "swim"]],
  ["pond", "pond", "\xE9tang", ["nature", "water"], ["frog", "duck", "fish", "lake", "water"]],
  ["fire", "fire", "feu", ["fire", "hot"], ["hot", "dragon", "firefighter", "camping", "candle", "wood", "red"]],
  ["ice", "ice", "gla\xE7on", ["cold", "water"], ["cold", "snow", "winter", "skate", "penguin", "water"]],
  ["hot", "hot", "chaud", ["hot"], ["sun", "fire", "summer", "cold", "warm", "soup", "desert", "oven"]],
  ["cold", "cold", "froid", ["cold"], ["ice", "snow", "winter", "hot", "penguin", "scarf"]],
  ["warm", "warm", "ti\xE8de", ["hot", "feeling"], ["hot", "blanket", "sun", "cozy", "coat", "hug"]],
  ["cozy", "cozy", "douillet", ["home", "feeling"], ["blanket", "warm", "bed", "home", "hot_chocolate", "pajamas"]],
  ["jungle", "jungle", "jungle", ["nature", "animal", "adventure"], ["monkey", "tiger", "snake", "parrot", "tree", "adventure", "lion"]],
  ["desert", "desert", "d\xE9sert", ["nature", "hot"], ["sand", "hot", "camel", "cactus", "sun", "snake"]],
  ["volcano", "volcano", "volcan", ["nature", "fire", "science"], ["lava", "fire", "mountain", "hot", "dinosaur", "island"]],
  ["nest", "nest", "nid", ["animal", "nature"], ["bird", "egg", "tree", "feather", "branch"]],
  ["wing", "wing", "aile", ["animal", "body"], ["bird", "fly", "feather", "butterfly", "plane", "angel", "fairy", "dragon"]],
  ["feather", "feather", "plume", ["animal"], ["bird", "wing", "pillow", "soft", "chicken", "owl"]],
  ["fly", "fly", "voler", ["sky"], ["bird", "wing", "plane", "sky", "kite", "rocket", "superhero"]],
  ["bone", "bone", "os", ["body", "animal"], ["dog", "skeleton", "dinosaur", "fossil", "halloween", "body"]],
  ["camping", "camping", "camping", ["nature", "adventure"], ["tent", "fire", "forest", "marshmallow", "sleeping_bag", "hike", "star"]],
  ["tent", "tent", "tente", ["adventure", "nature"], ["camping", "circus", "sleeping_bag", "forest", "hike"]],
  // Describing words
  ["soft", "soft", "doux", ["feeling"], ["pillow", "blanket", "fur", "teddy_bear", "feather", "cloud", "kitten", "cozy"]],
  ["cute", "cute", "mignon", ["feeling", "animal"], ["puppy", "kitten", "baby", "panda", "rabbit", "hamster", "teddy_bear"]],
  ["big", "big", "grand", ["shape"], ["elephant", "whale", "giant", "small", "dinosaur", "bear", "mountain"]],
  ["small", "small", "petit", ["shape"], ["ant", "mouse", "baby", "big", "seed", "ladybug", "hamster"]],
  ["fast", "fast", "rapide", ["sport", "transport"], ["race", "car", "run", "rocket", "cheetah", "slow", "train"]],
  ["slow", "slow", "lent", ["animal"], ["snail", "turtle", "fast", "walk", "sleep"]],
  ["loud", "loud", "bruyant", ["sound"], ["drum", "thunder", "roar", "quiet", "music"]],
  ["quiet", "quiet", "calme", ["sound", "feeling"], ["library", "sleep", "loud", "mouse", "night"]],
  ["bright", "bright", "brillant", ["light"], ["sun", "light", "star", "lightning", "shine", "sparkle"]],
  ["wet", "wet", "mouill\xE9", ["water"], ["rain", "water", "puddle", "swim", "towel"]],
  ["wild", "wild", "sauvage", ["animal", "nature"], ["lion", "tiger", "wolf", "jungle", "forest", "animal"]],
  ["funny", "funny", "dr\xF4le", ["feeling"], ["laugh", "clown", "monkey", "smile"]],
  ["brave", "brave", "courageux", ["feeling", "adventure"], ["knight", "hero", "firefighter", "fear", "lion", "superhero"]],
  ["strong", "strong", "fort", ["body", "sport"], ["superhero", "lion", "bear", "elephant", "brave"]],
  ["old", "old", "vieux", ["time"], ["grandma", "grandpa", "castle", "dinosaur", "fossil", "new"]],
  ["new", "new", "nouveau", ["time"], ["old", "gift", "baby", "year", "birthday", "toy"]],
  ["round", "round", "rond", ["shape"], ["ball", "circle", "moon", "planet", "wheel", "earth", "orange"]],
  ["tired", "tired", "fatigu\xE9", ["feeling", "night"], ["sleep", "bed", "night", "pillow", "bedtime"]],
  ["angry", "angry", "en col\xE8re", ["feeling"], ["sad", "red", "happy", "storm"]],
  ["hungry", "hungry", "faim", ["food", "feeling"], ["food", "eat", "lunch", "dinner", "breakfast", "snack"]],
  // Activities
  ["jump", "jump", "sauter", ["sport", "game"], ["frog", "kangaroo", "rabbit", "puddle", "trampoline", "dance"]],
  ["run", "run", "courir", ["sport"], ["race", "fast", "shoe", "foot", "soccer", "walk"]],
  ["walk", "walk", "marcher", ["sport"], ["foot", "dog", "park", "hike", "shoe", "run"]],
  ["climb", "climb", "grimper", ["sport", "adventure"], ["tree", "mountain", "monkey", "rock"]],
  ["ride", "ride", "balade", ["transport"], ["horse", "bike", "pony", "car", "train", "skateboard"]],
  ["eat", "eat", "manger", ["food"], ["food", "hungry", "lunch", "dinner", "plate", "spoon", "fork"]],
  ["help", "help", "aider", ["feeling", "job"], ["friend", "firefighter", "doctor", "police", "share", "nurse"]],
  ["share", "share", "partager", ["feeling"], ["friend", "toy", "help", "cookie", "love"]],
  ["hide", "hide", "cacher", ["game"], ["hide_and_seek", "closet", "cave", "game", "play", "dark"]],
  ["hide_and_seek", "hide-and-seek", "cache-cache", ["game"], ["hide", "game", "play", "count", "friend"]],
  ["explore", "explore", "explorer", ["adventure"], ["adventure", "map", "jungle", "cave", "space", "treasure"]],
  ["travel", "travel", "voyage", ["transport", "adventure", "holiday"], ["plane", "train", "holiday", "suitcase", "map", "car", "boat"]],
  ["hike", "hike", "randonn\xE9e", ["sport", "nature", "adventure"], ["mountain", "forest", "walk", "backpack", "camping", "boots"]],
  ["ski", "ski", "ski", ["sport", "cold"], ["snow", "mountain", "winter", "sled", "cold"]],
  ["sled", "sled", "luge", ["sport", "cold"], ["snow", "winter", "hill", "ski", "snowman"]],
  ["skate", "skate", "patin", ["sport", "cold"], ["ice", "winter", "skateboard", "cold", "snow"]],
  ["race", "race", "course", ["sport"], ["run", "fast", "car", "win", "medal", "bike"]],
  ["dive", "dive", "plonger", ["water", "sport"], ["pool", "swim", "ocean", "dolphin", "submarine"]],
  ["surf", "surf", "surf", ["sport", "ocean"], ["wave", "beach", "sea", "summer", "ocean"]],
  ["roar", "roar", "rugir", ["sound", "animal"], ["lion", "tiger", "dinosaur", "dragon", "loud", "bear"]],
  ["shine", "shine", "briller", ["light"], ["sun", "star", "light", "bright", "sparkle", "gold"]],
  ["sparkle", "sparkle", "paillettes", ["light", "magic"], ["magic", "unicorn", "fairy", "star", "shine", "jewel"]],
  ["count", "count", "compter", ["school"], ["number", "math", "hide_and_seek", "finger", "school"]],
  ["throw", "throw", "lancer", ["sport"], ["ball", "catch", "basketball", "rock"]],
  ["catch", "catch", "attraper", ["sport", "game"], ["ball", "throw", "fish", "play", "game"]],
  // Places
  ["city", "city", "ville", ["city"], ["car", "bus", "park", "shop", "museum"]],
  ["road", "road", "route", ["city", "transport"], ["car", "bus", "truck", "bike", "bridge"]],
  ["bridge", "bridge", "pont", ["city", "water"], ["river", "road", "train", "car", "water"]],
  ["shop", "shop", "magasin", ["city"], ["money", "toy", "city", "bakery"]],
  ["money", "money", "argent", ["city"], ["shop", "gold", "treasure", "bakery", "pirate", "baker"]],
  ["bakery", "bakery", "boulangerie", ["food", "city"], ["bread", "cake", "baker", "croissant", "shop", "oven"]],
  ["baker", "baker", "boulanger", ["job", "food"], ["bakery", "bread", "cake", "oven", "bake", "croissant"]],
  ["croissant", "croissant", "croissant", ["food"], ["bakery", "breakfast", "butter", "bread", "baker"]],
  ["restaurant", "restaurant", "restaurant", ["food", "city"], ["chef", "food", "dinner", "pizza", "burger"]],
  ["museum", "museum", "mus\xE9e", ["city", "art", "science"], ["dinosaur", "art", "painting", "fossil"]],
  ["hospital", "hospital", "h\xF4pital", ["city", "job", "body"], ["doctor", "nurse", "sick", "ambulance", "medicine"]],
  ["airport", "airport", "a\xE9roport", ["transport", "city"], ["plane", "pilot", "suitcase", "travel", "helicopter"]],
  ["station", "station", "gare", ["transport", "city"], ["train", "travel", "bus", "city", "suitcase"]],
  ["playground", "playground", "aire de jeux", ["game", "city"], ["swing", "slide", "park", "play", "school"]],
  ["swing", "swing", "balan\xE7oire", ["game", "toy"], ["playground", "park", "slide", "play", "tree"]],
  ["slide", "slide", "toboggan", ["game", "toy"], ["playground", "park", "swing", "play", "pool"]],
  ["cave", "cave", "grotte", ["nature", "adventure"], ["bat", "bear", "dragon", "dark", "rock", "explore"]],
  ["hill", "hill", "colline", ["nature"], ["mountain", "sled", "grass", "climb", "field"]],
  ["rock", "rock", "rocher", ["nature"], ["stone", "mountain", "cave", "climb", "volcano"]],
  ["stone", "stone", "caillou", ["nature"], ["rock", "river", "throw", "beach", "castle"]],
  ["field", "field", "champ", ["farm", "nature"], ["farm", "grass", "tractor", "flower", "cow", "soccer"]],
  ["world", "world", "monde", ["nature", "space"], ["earth", "map", "travel", "planet", "nature"]],
  // Home and everyday objects
  ["bedroom", "bedroom", "chambre", ["home", "night"], ["bed", "toy", "sleep", "closet", "pillow"]],
  ["bath", "bath", "bain", ["home", "water"], ["bubble", "soap", "towel", "duck", "water", "clean"]],
  ["bubble", "bubble", "bulle", ["water", "toy"], ["bath", "soap", "water", "balloon", "swim", "fish"]],
  ["soap", "soap", "savon", ["home", "water"], ["bath", "bubble", "clean", "hand", "towel"]],
  ["clean", "clean", "propre", ["home"], ["soap", "bath", "broom", "dirty", "towel", "toothbrush"]],
  ["dirty", "dirty", "sale", ["home"], ["mud", "clean", "pig", "sock", "clothes"]],
  ["towel", "towel", "serviette", ["home", "ocean"], ["bath", "beach", "wet", "swim", "soap"]],
  ["toothbrush", "toothbrush", "brosse \xE0 dents", ["home", "body"], ["tooth", "smile", "dentist", "bath", "morning"]],
  ["key", "key", "cl\xE9", ["home"], ["door", "home", "car", "treasure", "castle", "closet"]],
  ["roof", "roof", "toit", ["home"], ["home", "rain", "chimney", "cat"]],
  ["chimney", "chimney", "chemin\xE9e", ["home", "fire"], ["santa", "fire", "roof", "christmas", "home", "wood"]],
  ["table", "table", "table", ["home"], ["chair", "plate", "dinner", "kitchen", "eat"]],
  ["chair", "chair", "chaise", ["home", "school"], ["table", "desk", "sofa", "kitchen", "class"]],
  ["sofa", "sofa", "canap\xE9", ["home"], ["tv", "cozy", "pillow", "chair", "blanket"]],
  ["tv", "tv", "t\xE9l\xE9", ["tech", "home"], ["cartoon", "movie", "sofa", "screen", "weather"]],
  ["lamp", "lamp", "lampe", ["light", "home"], ["light", "bright", "dark", "bed", "flashlight"]],
  ["flashlight", "flashlight", "lampe torche", ["light", "adventure"], ["dark", "light", "camping", "battery", "night", "cave"]],
  ["fridge", "fridge", "frigo", ["home", "cold", "food"], ["kitchen", "cold", "milk", "ice", "food"]],
  ["plate", "plate", "assiette", ["food", "home"], ["fork", "spoon", "food", "table", "dinner"]],
  ["spoon", "spoon", "cuill\xE8re", ["food", "home"], ["fork", "soup", "plate", "eat"]],
  ["fork", "fork", "fourchette", ["food", "home"], ["spoon", "plate", "eat", "table", "dinner", "pasta", "kitchen"]],
  ["cup", "cup", "tasse", ["drink", "home"], ["tea", "hot_chocolate", "drink", "coffee", "glass"]],
  ["glass", "glass", "verre", ["drink", "home"], ["water", "milk", "juice", "drink", "window", "cup"]],
  ["box", "box", "bo\xEEte", ["home"], ["gift", "toy", "surprise", "suitcase", "blocks"]],
  ["suitcase", "suitcase", "valise", ["transport", "holiday"], ["travel", "holiday", "plane", "airport", "clothes"]],
  ["basket", "basket", "panier", ["food"], ["picnic", "easter", "egg", "fruit", "shop"]],
  ["closet", "closet", "placard", ["home", "clothes"], ["clothes", "bedroom", "hide", "monster", "door"]],
  ["broom", "broom", "balai", ["home", "magic"], ["witch", "clean", "fly", "halloween", "home", "kitchen"]],
  ["scissors", "scissors", "ciseaux", ["school", "art"], ["paper", "hair", "art", "school", "draw"]],
  ["desk", "desk", "bureau", ["school", "home"], ["chair", "school", "pencil", "class", "computer"]],
  ["number", "number", "nombre", ["school"], ["math", "count", "clock", "phone", "year"]],
  ["alphabet", "alphabet", "alphabet", ["school", "book"], ["letter", "word", "read", "school", "song"]],
  // Body
  ["arm", "arm", "bras", ["body"], ["hand", "hug", "leg", "body"]],
  ["leg", "leg", "jambe", ["body"], ["foot", "arm", "run", "walk", "body"]],
  ["finger", "finger", "doigt", ["body"], ["hand", "count", "ring", "glove", "paint", "foot"]],
  ["mouth", "mouth", "bouche", ["body"], ["tooth", "smile", "kiss", "eat", "face"]],
  ["nose", "nose", "nez", ["body"], ["face", "clown", "eye", "mouth", "elephant"]],
  ["ear", "ear", "oreille", ["body", "sound"], ["rabbit", "music", "head", "elephant", "face"]],
  ["hair", "hair", "cheveux", ["body"], ["head", "beard", "face", "hat"]],
  ["beard", "beard", "barbe", ["body"], ["santa", "grandpa", "wizard", "hair", "face"]],
  ["brain", "brain", "cerveau", ["body", "science", "school"], ["head", "puzzle", "science", "school"]],
  ["hurt", "hurt", "bobo", ["body", "feeling"], ["cry", "doctor", "sick", "nurse"]],
  ["sick", "sick", "malade", ["body"], ["doctor", "medicine", "hospital", "nurse", "bed"]],
  ["medicine", "medicine", "m\xE9dicament", ["body", "job"], ["doctor", "sick", "nurse", "hospital", "vet"]],
  ["skeleton", "skeleton", "squelette", ["body", "holiday"], ["bone", "halloween", "scary", "doctor"]],
  ["glasses", "glasses", "lunettes", ["body", "clothes"], ["eye", "read", "grandpa", "sun", "face", "teacher"]],
  // Clothes
  ["shirt", "shirt", "chemise", ["clothes"], ["clothes", "pants", "dress", "sweater", "jacket"]],
  ["pants", "pants", "pantalon", ["clothes"], ["shirt", "clothes", "leg", "jacket", "sock", "shoe"]],
  ["jacket", "jacket", "veste", ["clothes"], ["coat", "rain", "clothes", "winter"]],
  ["glove", "glove", "gant", ["clothes", "cold"], ["hand", "mitten", "winter", "finger", "snow"]],
  ["helmet", "helmet", "casque", ["clothes", "sport"], ["bike", "astronaut", "knight", "firefighter", "head"]],
  ["mask", "mask", "masque", ["clothes", "celebration"], ["superhero", "costume", "halloween", "face", "party"]],
  ["swimsuit", "swimsuit", "maillot de bain", ["clothes", "water"], ["swim", "pool", "beach", "summer", "towel"]],
  // Food
  ["breakfast", "breakfast", "petit d\xE9jeuner", ["food", "time"], ["morning", "cereal", "egg", "toast", "juice", "milk", "pancake", "croissant"]],
  ["lunch", "lunch", "d\xE9jeuner", ["food", "time"], ["sandwich", "school", "food", "picnic", "eat"]],
  ["dinner", "dinner", "d\xEEner", ["food", "time"], ["food", "family", "table", "plate", "cook", "night", "soup"]],
  ["snack", "snack", "go\xFBter", ["food"], ["cookie", "apple", "hungry"]],
  ["pie", "pie", "tarte", ["food", "sweet"], ["apple", "oven", "pumpkin", "bake", "dessert", "cherry"]],
  ["pancake", "pancake", "cr\xEApe", ["food", "sweet"], ["breakfast", "sugar", "butter", "jam", "honey", "bake"]],
  ["jam", "jam", "confiture", ["food", "sweet"], ["strawberry", "bread", "toast", "pancake", "sweet"]],
  ["toast", "toast", "tartine", ["food"], ["bread", "butter", "jam", "breakfast", "honey"]],
  ["butter", "butter", "beurre", ["food"], ["bread", "toast", "croissant", "milk", "pancake"]],
  ["cereal", "cereal", "c\xE9r\xE9ales", ["food"], ["breakfast", "milk", "spoon", "morning", "corn"]],
  ["salad", "salad", "salade", ["food", "plant"], ["vegetable", "tomato", "green", "lunch", "plate", "dinner"]],
  ["potato", "potato", "pomme de terre", ["food", "plant"], ["fries", "vegetable", "farm", "soup", "dinner", "oven"]],
  ["fries", "fries", "frites", ["food"], ["potato", "burger", "restaurant", "lunch", "snack"]],
  ["burger", "burger", "hamburger", ["food"], ["fries", "cheese", "bread", "dinner"]],
  ["pasta", "pasta", "p\xE2tes", ["food"], ["cheese", "tomato", "dinner", "spoon", "pizza"]],
  ["cherry", "cherry", "cerise", ["food", "plant", "sweet"], ["red", "fruit", "pie", "tree", "cake"]],
  ["pear", "pear", "poire", ["food", "plant"], ["fruit", "tree", "green", "apple", "juice", "pie"]],
  ["watermelon", "watermelon", "past\xE8que", ["food", "plant"], ["summer", "fruit", "green", "red", "picnic", "seed"]],
  ["pineapple", "pineapple", "ananas", ["food", "plant"], ["fruit", "yellow", "juice", "island", "pizza"]],
  ["corn", "corn", "ma\xEFs", ["food", "plant", "farm"], ["popcorn", "farm", "yellow", "field", "vegetable"]],
  ["popcorn", "popcorn", "pop-corn", ["food"], ["corn", "movie", "snack", "cartoon", "party"]],
  ["marshmallow", "marshmallow", "guimauve", ["food", "sweet"], ["camping", "fire", "hot_chocolate", "soft", "candy"]],
  ["lemonade", "lemonade", "limonade", ["drink", "sweet"], ["lemon", "summer", "drink", "glass", "sugar"]],
  ["coffee", "coffee", "caf\xE9", ["drink", "hot"], ["cup", "morning", "milk", "hot", "tea"]],
  ["chef", "chef", "chef cuisinier", ["job", "food"], ["cook", "kitchen", "restaurant", "hat", "food"]],
  ["donut", "donut", "beignet", ["food", "sweet"], ["sugar", "sweet", "bakery", "round", "breakfast"]],
  // Animals more
  ["kangaroo", "kangaroo", "kangourou", ["animal"], ["jump", "zoo", "baby", "animal", "run"]],
  ["cheetah", "cheetah", "gu\xE9pard", ["animal"], ["fast", "run", "lion", "jungle", "zoo"]],
  ["squirrel", "squirrel", "\xE9cureuil", ["animal", "nature"], ["tree", "forest", "tail", "autumn", "jump", "climb"]],
  ["camel", "camel", "chameau", ["animal", "hot"], ["desert", "sand", "hot", "zoo", "animal", "palm_tree"]],
  ["crocodile", "crocodile", "crocodile", ["animal", "water"], ["river", "tooth", "jungle", "green", "zoo"]],
  ["wool", "wool", "laine", ["animal", "clothes"], ["sheep", "scarf", "sweater", "soft", "mitten", "blanket"]],
  ["sweater", "sweater", "pull", ["clothes", "cold"], ["wool", "winter", "warm", "coat", "christmas"]],
  ["goat", "goat", "ch\xE8vre", ["animal", "farm"], ["farm", "cheese", "mountain", "milk", "animal", "grass"]],
  ["hay", "hay", "foin", ["farm"], ["horse", "cow", "barn", "farm", "field", "pony"]],
  ["barn", "barn", "grange", ["farm"], ["farm", "hay", "cow", "horse", "tractor"]],
  ["tractor", "tractor", "tracteur", ["farm", "transport"], ["farm", "farmer", "field", "barn", "truck", "wheel"]],
  ["farmer", "farmer", "fermier", ["job", "farm"], ["farm", "tractor", "cow", "field", "barn"]],
  ["vet", "vet", "v\xE9t\xE9rinaire", ["job", "animal"], ["pet", "dog", "cat", "doctor", "animal"]],
  ["aquarium", "aquarium", "aquarium", ["water", "pet"], ["fish", "water", "glass", "octopus", "shark"]],
  ["jellyfish", "jellyfish", "m\xE9duse", ["animal", "ocean"], ["sea", "ocean", "beach", "octopus", "swim", "fish"]],
  ["polar_bear", "polar bear", "ours polaire", ["animal", "cold"], ["bear", "ice", "snow", "cold", "penguin", "ocean"]],
  ["eagle", "eagle", "aigle", ["animal", "sky"], ["bird", "fly", "mountain", "wing", "feather"]],
  ["mud", "mud", "boue", ["nature", "water"], ["pig", "puddle", "rain", "dirty", "boots"]],
  // Ocean, fantasy
  ["mermaid", "mermaid", "sir\xE8ne", ["magic", "ocean", "story"], ["sea", "ocean", "fish", "tail", "shell", "princess", "island"]],
  ["starfish", "starfish", "\xE9toile de mer", ["animal", "ocean"], ["star", "beach", "sea", "shell", "sand"]],
  ["submarine", "submarine", "sous-marin", ["transport", "ocean"], ["ocean", "sea", "dive", "fish", "whale"]],
  ["captain", "captain", "capitaine", ["ocean", "job"], ["ship", "pirate", "boat", "sea", "team"]],
  ["palm_tree", "palm tree", "palmier", ["plant", "hot"], ["island", "beach", "summer", "sand", "tree", "hot"]],
  ["bucket", "bucket", "seau", ["toy", "ocean"], ["sand", "beach", "water", "sandcastle", "swim"]],
  ["sword", "sword", "\xE9p\xE9e", ["story", "adventure"], ["knight", "pirate", "shield", "dragon", "castle", "treasure"]],
  ["shield", "shield", "bouclier", ["story", "adventure"], ["knight", "sword", "castle", "hero", "prince"]],
  ["tower", "tower", "tour", ["story", "city"], ["castle", "princess", "dragon"]],
  ["gold", "gold", "or", ["color", "adventure"], ["treasure", "money", "crown", "pirate", "yellow", "jewel", "shine"]],
  ["jewel", "jewel", "bijou", ["adventure"], ["crown", "treasure", "gold", "princess", "ring"]],
  ["ring", "ring", "bague", ["clothes"], ["jewel", "finger", "gold", "wedding", "princess", "queen"]],
  ["potion", "potion", "potion", ["magic"], ["witch", "wizard", "magic", "cauldron", "spell"]],
  ["cauldron", "cauldron", "chaudron", ["magic"], ["witch", "potion", "halloween", "magic", "wizard", "soup"]],
  ["vampire", "vampire", "vampire", ["story", "holiday", "night"], ["bat", "halloween", "night", "castle", "scary"]],
  ["haunted_house", "haunted house", "maison hant\xE9e", ["story", "holiday"], ["ghost", "halloween", "scary", "skeleton", "night"]],
  ["angel", "angel", "ange", ["story", "magic"], ["wing", "christmas", "cloud", "fairy", "sky"]],
  ["giant", "giant", "g\xE9ant", ["story", "magic"], ["big", "castle", "tower", "fairy_tale", "dinosaur", "whale"]],
  ["elf", "elf", "lutin", ["magic", "holiday"], ["santa", "christmas", "toy", "fairy", "small"]],
  ["sleigh", "sleigh", "tra\xEEneau", ["holiday", "cold", "transport"], ["santa", "reindeer", "snow", "christmas", "sled"]],
  ["fairy_tale", "fairy tale", "conte", ["story", "book", "magic"], ["story", "fairy", "princess", "book", "wolf", "castle"]],
  ["bedtime", "bedtime", "dodo", ["night", "home"], ["bed", "sleep", "story", "pajamas", "night", "teddy_bear"]],
  // Holidays and celebrations
  ["valentine", "valentine", "saint-valentin", ["holiday", "feeling"], ["heart", "love", "red", "flower", "kiss"]],
  ["wedding", "wedding", "mariage", ["celebration", "family"], ["dress", "ring", "cake", "love", "flower", "dance"]],
  ["fireworks", "fireworks", "feu d'artifice", ["celebration", "light", "night"], ["sky", "night", "party", "color", "holiday", "bright"]],
  ["year", "year", "ann\xE9e", ["time"], ["birthday", "season", "time"]],
  ["snowball", "snowball", "boule de neige", ["cold", "game", "season"], ["snow", "throw", "winter", "snowman", "cold", "ice"]],
  // Music, art, shows
  ["violin", "violin", "violon", ["music"], ["music", "song", "piano", "concert", "band", "stage"]],
  ["trumpet", "trumpet", "trompette", ["music", "sound"], ["music", "band", "loud", "concert", "sing", "song"]],
  ["flute", "flute", "fl\xFBte", ["music"], ["music", "song", "band", "bird", "piano", "concert"]],
  ["concert", "concert", "concert", ["music", "celebration"], ["music", "band", "sing", "stage", "guitar"]],
  ["stage", "stage", "sc\xE8ne", ["music", "art"], ["concert", "show", "dance", "sing", "band", "music"]],
  ["show", "show", "spectacle", ["art", "celebration"], ["stage", "circus", "clown", "dance", "magic"]],
  ["radio", "radio", "radio", ["music", "tech", "sound"], ["music", "song", "car", "tv", "dance"]],
  ["movie", "movie", "film", ["art", "story"], ["popcorn", "tv", "story", "cartoon", "show", "stage"]],
  ["cartoon", "cartoon", "dessin anim\xE9", ["art", "story"], ["tv", "movie", "funny", "draw"]],
  ["artist", "artist", "artiste", ["art", "job"], ["paint", "draw", "art", "museum", "painting"]],
  ["painting", "painting", "tableau", ["art"], ["paint", "artist", "museum", "picture", "color", "draw"]],
  ["photo", "photo", "photo", ["art", "tech"], ["picture", "smile", "family", "art", "birthday"]],
  // Shapes
  ["shape", "shape", "forme", ["shape"], ["circle", "square", "triangle", "star", "heart"]],
  ["circle", "circle", "cercle", ["shape"], ["round", "ball", "wheel", "square", "sun"]],
  ["square", "square", "carr\xE9", ["shape"], ["circle", "triangle", "box", "window"]],
  ["triangle", "triangle", "triangle", ["shape", "music"], ["square", "circle", "pizza", "mountain"]],
  // Games, sport, toys more
  ["board_game", "board game", "jeu de soci\xE9t\xE9", ["game", "family"], ["game", "family", "win", "toy", "play"]],
  ["video_game", "video game", "jeu vid\xE9o", ["game", "tech"], ["game", "computer", "tv", "screen", "win", "tablet"]],
  ["blocks", "blocks", "cubes", ["toy"], ["toy", "build", "tower", "square", "play"]],
  ["build", "build", "construire", ["toy", "job"], ["blocks", "home", "tower", "sandcastle", "builder"]],
  ["builder", "builder", "ma\xE7on", ["job"], ["build", "home", "helmet", "truck", "blocks"]],
  ["skateboard", "skateboard", "skate", ["sport", "toy"], ["skate", "wheel", "ride", "park", "helmet"]],
  ["trampoline", "trampoline", "trampoline", ["sport", "toy"], ["jump", "garden", "fun", "play", "sport", "playground"]],
  ["basketball", "basketball", "basket", ["sport"], ["ball", "team", "throw", "shoe", "player"]],
  ["tennis", "tennis", "tennis", ["sport"], ["ball", "player", "win", "team", "run"]],
  ["player", "player", "joueur", ["sport", "game"], ["team", "game", "soccer", "basketball", "win"]],
  ["goal", "goal", "but", ["sport"], ["soccer", "ball", "win", "team", "player", "basketball"]],
  ["trophy", "trophy", "troph\xE9e", ["sport"], ["win", "gold", "medal", "team", "sport"]],
  ["medal", "medal", "m\xE9daille", ["sport"], ["win", "gold", "race", "trophy", "sport", "team"]],
  ["sport", "sport", "sport", ["sport"], ["soccer", "basketball", "tennis", "run", "swim", "team", "ball"]],
  // Tech and science
  ["screen", "screen", "\xE9cran", ["tech"], ["computer", "tv", "phone", "tablet", "video_game"]],
  ["tablet", "tablet", "tablette", ["tech"], ["screen", "computer", "phone", "video_game", "game"]],
  ["battery", "battery", "pile", ["tech", "science"], ["robot", "flashlight", "electricity", "toy", "phone", "tablet"]],
  ["electricity", "electricity", "\xE9lectricit\xE9", ["tech", "science"], ["lightning", "battery", "lamp", "light", "computer", "tv"]],
  ["science", "science", "science", ["science", "school"], ["scientist", "planet", "dinosaur", "volcano", "space"]],
  ["scientist", "scientist", "scientifique", ["science", "job"], ["science", "robot", "space", "doctor", "fossil", "brain"]],
  ["fossil", "fossil", "fossile", ["science", "nature"], ["dinosaur", "bone", "museum", "rock"]],
  ["lava", "lava", "lave", ["fire", "nature", "hot"], ["volcano", "fire", "hot", "red", "rock"]],
  // Transport and jobs more
  ["truck", "truck", "camion", ["transport"], ["car", "road", "firefighter", "build"]],
  ["wheel", "wheel", "roue", ["transport", "shape"], ["car", "bike", "bus", "round", "circle"]],
  ["helicopter", "helicopter", "h\xE9licopt\xE8re", ["transport", "sky"], ["fly", "plane", "pilot", "sky"]],
  ["pilot", "pilot", "pilote", ["job", "transport", "sky"], ["plane", "helicopter", "fly", "airport", "sky", "astronaut"]],
  ["ambulance", "ambulance", "ambulance", ["transport", "job"], ["hospital", "doctor", "nurse", "sick"]],
  ["nurse", "nurse", "infirmi\xE8re", ["job", "body"], ["doctor", "hospital", "sick", "medicine"]],
  ["dentist", "dentist", "dentiste", ["job", "body"], ["tooth", "doctor", "smile", "toothbrush", "nurse", "mouth"]],
  ["wood", "wood", "bois", ["nature", "fire"], ["tree", "fire", "forest", "branch", "camping"]],
  ["branch", "branch", "branche", ["nature", "plant"], ["tree", "leaf", "bird", "nest", "wood"]],
  ["sleeping_bag", "sleeping bag", "sac de couchage", ["adventure", "night"], ["camping", "tent", "sleep", "night", "blanket", "pillow"]],
  // Nature more
  ["nature", "nature", "nature", ["nature"], ["tree", "forest", "flower", "animal", "river", "mountain"]],
  ["mushroom", "mushroom", "champignon", ["nature", "plant", "food"], ["forest", "autumn", "rain", "fairy", "garden", "snail"]],
  ["cactus", "cactus", "cactus", ["plant", "hot"], ["desert", "hot", "green", "sand", "plant", "flower"]],
  ["waterfall", "waterfall", "cascade", ["water", "nature"], ["river", "water", "mountain", "rock", "jungle"]],
  ["sunset", "sunset", "coucher de soleil", ["sky", "time", "color"], ["sun", "sky", "evening", "orange", "beach", "night"]],
  ["evening", "evening", "soir", ["time", "night"], ["night", "dinner", "sunset", "bedtime", "moon"]],
  ["grey", "grey", "gris", ["color"], ["cloud", "elephant", "rock", "mouse", "color", "storm"]],
  ["weather", "weather", "m\xE9t\xE9o", ["weather"], ["rain", "sun", "snow", "cloud", "wind", "storm"]],
  // Compound and phrase helpers (also used by PHRASES below)
  ["bow", "bow", "arc", ["sport", "adventure"], ["rainbow", "arrow", "gift", "violin", "knight", "hero"]],
  ["arrow", "arrow", "fl\xE8che", ["sport", "adventure"], ["bow", "knight", "map", "heart", "hero", "fast"]],
  ["worm", "worm", "ver", ["animal", "nature"], ["earth", "garden", "bird", "apple", "mud", "book", "rain", "fish"]],
  ["cream", "cream", "cr\xE8me", ["food", "sweet"], ["ice_cream", "cake", "milk", "strawberry", "dessert", "coffee", "butter"]],
  ["peanut", "peanut", "cacahu\xE8te", ["food"], ["butter", "elephant", "sandwich", "jam", "snack"]],
  ["goldfish", "goldfish", "poisson rouge", ["animal", "pet", "water"], ["fish", "gold", "pet", "aquarium", "orange", "bowl", "water"]],
  ["dragonfly", "dragonfly", "libellule", ["animal", "nature"], ["dragon", "fly", "insect", "pond", "wing", "butterfly"]],
  ["firefly", "firefly", "luciole", ["animal", "night", "light"], ["fire", "fly", "night", "light", "insect", "summer"]],
  ["seahorse", "seahorse", "hippocampe", ["animal", "ocean"], ["sea", "horse", "ocean", "fish", "starfish", "mermaid"]],
  ["lighthouse", "lighthouse", "phare", ["ocean", "light"], ["light", "sea", "boat", "island", "tower", "night"]],
  ["teapot", "teapot", "th\xE9i\xE8re", ["home", "drink"], ["tea", "cup", "kitchen", "hot", "pot"]],
  ["toothpaste", "toothpaste", "dentifrice", ["home", "body"], ["tooth", "toothbrush", "dentist", "clean", "mouth"]],
  ["cupcake", "cupcake", "cupcake", ["food", "sweet"], ["cup", "cake", "birthday", "candle", "party", "chocolate", "bake"]],
  ["notebook", "notebook", "cahier", ["school"], ["school", "pencil", "paper", "write", "book", "homework", "pen"]],
  ["sailboat", "sailboat", "voilier", ["ocean", "transport"], ["boat", "wind", "sea", "ocean", "lake", "ship", "captain"]],
  ["raincoat", "raincoat", "imperm\xE9able", ["clothes", "weather"], ["rain", "coat", "umbrella", "boots", "wet", "puddle"]],
  ["moonlight", "moonlight", "clair de lune", ["night", "light"], ["moon", "light", "night", "owl", "wolf", "dream"]],
  ["sandbox", "sandbox", "bac \xE0 sable", ["toy", "game"], ["sand", "box", "playground", "bucket", "park", "play"]],
  ["beehive", "beehive", "ruche", ["animal", "nature"], ["bee", "honey", "tree", "garden", "insect"]],
  ["doghouse", "doghouse", "niche", ["pet", "home"], ["dog", "home", "garden", "puppy", "bone"]],
  ["cowboy", "cowboy", "cowboy", ["job", "story", "adventure"], ["horse", "hat", "boots", "ride", "desert", "farm", "cow", "story"]],
  ["bathtub", "bathtub", "baignoire", ["home", "water"], ["bath", "water", "bubble", "soap", "duck", "towel"]],
  ["pot", "pot", "pot", ["home", "plant"], ["flower", "honey", "plant", "garden", "cauldron", "kitchen", "paint"]],
  ["bowl", "bowl", "bol", ["home", "food"], ["soup", "cereal", "spoon", "fish", "milk", "kitchen"]],
  ["sunglasses", "sunglasses", "lunettes de soleil", ["clothes", "hot"], ["sun", "glasses", "beach", "summer", "hot", "eye"]],
  ["sunscreen", "sunscreen", "cr\xE8me solaire", ["hot", "body"], ["sun", "beach", "cream", "summer", "hot", "swimsuit"]],
  ["treehouse", "treehouse", "cabane", ["home", "nature", "adventure"], ["tree", "home", "play", "hide", "wood", "garden"]],
  ["spaceship", "spaceship", "vaisseau spatial", ["space", "transport"], ["space", "ship", "rocket", "alien", "astronaut", "star", "planet"]]
];
var phraseRows = (text) => text.trim().split("\n").flatMap((line) => line.split("|")).map((item) => item.trim()).filter(Boolean).map((item) => {
  const [pair, phrase] = item.split(":");
  const [a, b] = pair.trim().split("+");
  return [a, b, phrase.trim()];
});
var PHRASES = {
  en: phraseRows(`
    snow+ball: snowball | snow+angel: snow angel | snow+boots: snow boots | snow+storm: snowstorm | snow+white: snow white | snow+day: snow day
    rain+bow: rainbow | rain+coat: raincoat | rain+cloud: rain cloud | rain+boots: rain boots | rain+forest: rainforest
    sun+flower: sunflower | sun+glasses: sunglasses | sun+light: sunlight | sun+hat: sun hat | sun+screen: sunscreen | sun+shine: sunshine
    star+fish: starfish | star+light: starlight | star+ship: starship | gold+star: gold star | rock+star: rock star
    moon+light: moonlight | moon+walk: moonwalk | night+light: night light | night+owl: night owl | day+light: daylight | candle+light: candlelight
    fire+truck: fire truck | fire+fly: firefly | fire+wood: firewood | fire+ball: fireball | monster+truck: monster truck
    butter+fly: butterfly | butter+cup: buttercup | peanut+butter: peanut butter | bread+butter: bread and butter
    cup+cake: cupcake | tea+cup: teacup | tea+pot: teapot | tea+party: tea party | tea+time: teatime | coffee+cup: coffee cup
    cheese+cake: cheesecake | birthday+cake: birthday cake | birthday+party: birthday party | birthday+gift: birthday gift | birthday+candle: birthday candle | birthday+song: birthday song
    chocolate+cake: chocolate cake | chocolate+milk: chocolate milk | chocolate+cookie: chocolate cookie | hot+chocolate: hot chocolate | hot+dog: hot dog
    ice+cream: ice cream | ice+skate: ice skate | ice+queen: ice queen | cream+cake: cream cake
    gold+fish: goldfish | gold+medal: gold medal | gold+crown: gold crown | cat+fish: catfish | sword+fish: swordfish | fish+bowl: fishbowl
    dragon+fly: dragonfly | sea+horse: seahorse | sea+shell: seashell | sea+lion: sea lion | sea+turtle: sea turtle
    horse+shoe: horseshoe | pony+tail: ponytail | mermaid+tail: mermaid tail | bear+hug: bear hug | lion+king: lion king | queen+bee: queen bee
    honey+bee: honeybee | honey+pot: honey pot | flower+pot: flowerpot | flower+garden: flower garden
    tooth+fairy: tooth fairy | sweet+tooth: sweet tooth | sweet+heart: sweetheart | sweet+dream: sweet dreams | day+dream: daydream
    fairy+wand: fairy wand | fairy+wing: fairy wings | magic+wand: magic wand | magic+spell: magic spell | magic+show: magic show | magic+potion: magic potion
    witch+hat: witch hat | witch+broom: witch broom | wizard+hat: wizard hat | ghost+story: ghost story
    book+worm: bookworm | earth+worm: earthworm | story+book: storybook | picture+book: picture book | book+shop: bookshop | story+time: story time
    bed+time: bedtime | play+time: playtime | bath+time: bath time | bubble+bath: bubble bath | bath+towel: bath towel | soap+bubble: soap bubble
    soup+bowl: soup bowl | cereal+bowl: cereal bowl | sand+castle: sandcastle | sand+box: sandbox | beach+ball: beach ball | beach+towel: beach towel
    foot+ball: football | basket+ball: basketball | soccer+ball: soccer ball | soccer+team: soccer team | tennis+ball: tennis ball
    swim+pool: swimming pool | water+slide: water slide | water+park: water park | skate+park: skate park
    space+ship: spaceship | rocket+ship: rocket ship | space+station: space station | pirate+ship: pirate ship
    treasure+map: treasure map | treasure+island: treasure island | school+bus: school bus | police+car: police car | race+car: race car
    train+station: train station | bike+helmet: bike helmet | mountain+bike: mountain bike | toy+car: toy car | toy+box: toy box | toy+shop: toy shop
    music+box: music box | lunch+box: lunch box | candy+shop: candy shop | apple+pie: apple pie | apple+tree: apple tree | apple+juice: apple juice
    orange+juice: orange juice | fruit+juice: fruit juice | fruit+salad: fruit salad | strawberry+jam: strawberry jam | pumpkin+pie: pumpkin pie | banana+bread: banana bread
    chicken+soup: chicken soup | tomato+soup: tomato soup | cheese+sandwich: cheese sandwich | corn+field: cornfield
    easter+egg: easter egg | egg+shell: eggshell | christmas+tree: christmas tree | christmas+gift: christmas gift | halloween+costume: halloween costume | halloween+pumpkin: halloween pumpkin
    party+hat: party hat | wedding+cake: wedding cake | wedding+ring: wedding ring | wedding+dress: wedding dress | love+song: love song
    winter+coat: winter coat | summer+holiday: summer holiday | autumn+leaf: autumn leaves | tree+frog: tree frog | frog+prince: frog prince
    bird+nest: bird nest | bird+song: birdsong | duck+pond: duck pond | farm+animal: farm animal | computer+game: computer game | clock+tower: clock tower
    ear+ring: earring | eye+glasses: eyeglasses | fruit+cake: fruitcake | christmas+light: christmas lights | christmas+sweater: christmas sweater
    picnic+blanket: picnic blanket | beach+umbrella: beach umbrella | christmas+dinner: christmas dinner | arm+chair: armchair | wheel+chair: wheelchair | sleep+walk: sleepwalk | bow+arrow: bow and arrow
  `),
  fr: phraseRows(`
    apple+earth: pomme de terre | fish+red: poisson rouge | bow+sky: arc-en-ciel | star+sea: \xE9toile de mer | castle+sand: ch\xE2teau de sable | castle+strong: ch\xE2teau fort
    glasses+sun: lunettes de soleil | chocolate+hot: chocolat chaud | cake+chocolate: g\xE2teau au chocolat | cake+birthday: g\xE2teau d'anniversaire
    candle+birthday: bougie d'anniversaire | party+birthday: f\xEAte d'anniversaire | gift+birthday: cadeau d'anniversaire | tree+christmas: arbre de no\xEBl | gift+christmas: cadeau de no\xEBl
    juice+orange: jus d'orange | juice+apple: jus de pomme | juice+fruit: jus de fruit | pie+apple: tarte aux pommes | pie+lemon: tarte au citron | pie+strawberry: tarte aux fraises
    jam+strawberry: confiture de fraises | bread+chocolate: pain au chocolat | toast+butter: tartine de beurre | toast+jam: tartine de confiture | butter+peanut: beurre de cacahu\xE8te
    salad+fruit: salade de fruits | soup+vegetable: soupe de l\xE9gumes | soup+tomato: soupe \xE0 la tomate | egg+easter: \u0153uf de p\xE2ques | rabbit+easter: lapin de p\xE2ques
    home+doll: maison de poup\xE9e | race+horse: course de chevaux | car+race: voiture de course | car+police: voiture de police | truck+firefighter: camion de pompiers
    fire+wood: feu de bois | mouse+small: petite souris | hat+witch: chapeau de sorci\xE8re | broom+witch: balai de sorci\xE8re | hat+wizard: chapeau de sorcier
    fairy_tale+fairy: conte de f\xE9es | story+evening: histoire du soir | book+picture: livre d'images | book+story: livre d'histoires | map+treasure: carte au tr\xE9sor | island+treasure: \xEEle au tr\xE9sor
    boat+pirate: bateau pirate | ship+pirate: navire pirate | queen+snow: reine des neiges | king+lion: roi lion | white+snow: blanche-neige
    night+star: nuit \xE9toil\xE9e | sky+blue: ciel bleu | sky+star: ciel \xE9toil\xE9 | bath+sun: bain de soleil | bubble+soap: bulle de savon | towel+bath: serviette de bain
    towel+beach: serviette de plage | ball+beach: ballon de plage | ball+soccer: ballon de foot | scarf+wool: \xE9charpe en laine | sweater+wool: pull en laine | coat+winter: manteau d'hiver
    boots+rain: bottes de pluie | boots+snow: bottes de neige | holiday+summer: vacances d'\xE9t\xE9 | holiday+christmas: vacances de no\xEBl | leaf+autumn: feuille d'automne
    pot+flower: pot de fleurs | pot+honey: pot de miel | pot+paint: pot de peinture | worm+earth: ver de terre | nest+bird: nid d'oiseau | queen+bee: reine des abeilles
    mouse+green: une souris verte | cup+tea: tasse de th\xE9 | cup+coffee: tasse de caf\xE9 | glass+milk: verre de lait | glass+water: verre d'eau | bowl+cereal: bol de c\xE9r\xE9ales
    bowl+soup: bol de soupe | spoon+soup: cuill\xE8re \xE0 soupe | box+music: bo\xEEte \xE0 musique | box+letter: bo\xEEte aux lettres | letter+santa: lettre au p\xE8re no\xEBl | game+map: jeu de cartes
    teacher+school: ma\xEEtresse d'\xE9cole | pencil+color: crayon de couleur | paper+gift: papier cadeau | helmet+bike: casque de v\xE9lo | plane+paper: avion en papier | boat+paper: bateau en papier
    fire+red: feu rouge | fire+green: feu vert | fish+clown: poisson-clown | tomato+cherry: tomate cerise | ice_cream+strawberry: glace \xE0 la fraise | ice_cream+chocolate: glace au chocolat
    pancake+sugar: cr\xEApe au sucre | pancake+chocolate: cr\xEApe au chocolat | beard+dad: barbe \xE0 papa | apple+love: pomme d'amour | cream+chocolate: cr\xE8me au chocolat | cheese+goat: fromage de ch\xE8vre
    tail+mermaid: queue de sir\xE8ne | tail+horse: queue de cheval | tooth+milk: dent de lait | bow+arrow: arc et fl\xE8ches | race+foot: course \xE0 pied | planet+earth: plan\xE8te terre
    snowflake+snow: flocon de neige | butterfly+night: papillon de nuit | bat+mouse: chauve-souris | horse+wood: cheval de bois | tower+magic: tour de magie | dog+wolf: chien-loup
    fish+aquarium: poisson d'aquarium | castle+princess: ch\xE2teau de princesse | cake+cream: g\xE2teau \xE0 la cr\xE8me
    blanket+picnic: couverture de pique-nique | dinner+christmas: d\xEEner de no\xEBl | sweater+christmas: pull de no\xEBl | cake+fruit: g\xE2teau aux fruits
  `)
};

// src/shared/lexicon/vocab.js
var EXTRA_WORDS = {
  en: [
    "above",
    "acorn",
    "across",
    "actor",
    "actress",
    "add",
    "afraid",
    "afternoon",
    "ago",
    "air",
    "airplane",
    "all",
    "alligator",
    "almost",
    "along",
    "alpaca",
    "also",
    "always",
    "am",
    "an",
    "anchor",
    "ancient",
    "and",
    "ankle",
    "answer",
    "anyone",
    "anything",
    "apartment",
    "apricot",
    "april",
    "apron",
    "are",
    "armchair",
    "armor",
    "around",
    "ask",
    "asked",
    "attic",
    "aubergine",
    "august",
    "aunt",
    "author",
    "avenue",
    "avocado",
    "away",
    "baa",
    "baboon",
    "back",
    "bacon",
    "bad",
    "badger",
    "badminton",
    "bag",
    "bagel",
    "balcony",
    "ballet",
    "balloons",
    "bamboo",
    "bandage",
    "bang",
    "bank",
    "bark",
    "baseball",
    "basement",
    "bathe",
    "bathroom",
    "bathtub",
    "be",
    "beak",
    "bean",
    "beanie",
    "beans",
    "beat",
    "beautiful",
    "beaver",
    "because",
    "beef",
    "been",
    "beep",
    "beet",
    "beetle",
    "begin",
    "behind",
    "beige",
    "being",
    "belly",
    "below",
    "belt",
    "bench",
    "berry",
    "beside",
    "best",
    "better",
    "between",
    "bicycle",
    "bigger",
    "biggest",
    "biscuit",
    "bison",
    "bite",
    "bitter",
    "blackberry",
    "blaze",
    "blender",
    "blink",
    "bloom",
    "blouse",
    "blueberry",
    "blunt",
    "board",
    "boil",
    "bones",
    "bonnet",
    "boom",
    "boot",
    "bored",
    "borrow",
    "bottle",
    "bottom",
    "boulder",
    "bounce",
    "bouquet",
    "bowl",
    "bowling",
    "boy",
    "bracelet",
    "brake",
    "break",
    "breeze",
    "bring",
    "broccoli",
    "broken",
    "brownie",
    "brunch",
    "brush",
    "bubbles",
    "buffalo",
    "bug",
    "building",
    "bull",
    "bumpy",
    "bun",
    "bunk",
    "bunny",
    "burn",
    "burrito",
    "bush",
    "but",
    "butcher",
    "button",
    "buy",
    "buzz",
    "bye",
    "cabbage",
    "cabinet",
    "cable",
    "calendar",
    "calf",
    "call",
    "calm",
    "came",
    "camera",
    "can",
    "canary",
    "candles",
    "canoe",
    "canvas",
    "canyon",
    "cap",
    "caramel",
    "card",
    "cards",
    "care",
    "carpet",
    "carry",
    "cart",
    "cashier",
    "cauliflower",
    "ceiling",
    "celebration",
    "celery",
    "cello",
    "centipede",
    "chalk",
    "chameleon",
    "charger",
    "chase",
    "chat",
    "cheek",
    "cheer",
    "cheerful",
    "chess",
    "chest",
    "chew",
    "chewing",
    "chewy",
    "chick",
    "child",
    "children",
    "chilly",
    "chimp",
    "chimpanzee",
    "chin",
    "chipmunk",
    "chirp",
    "chop",
    "church",
    "cinema",
    "clam",
    "clap",
    "classroom",
    "claw",
    "clay",
    "cleaner",
    "clear",
    "clementine",
    "cliff",
    "clinic",
    "close",
    "closed",
    "clouds",
    "cloudy",
    "cluck",
    "coach",
    "coast",
    "cocoa",
    "coconut",
    "coin",
    "collar",
    "college",
    "colour",
    "comb",
    "come",
    "comet",
    "compass",
    "cone",
    "conifer",
    "cool",
    "copy",
    "coral",
    "corner",
    "couch",
    "country",
    "courgette",
    "cousin",
    "coyote",
    "cracker",
    "crackle",
    "cradle",
    "cranberry",
    "crash",
    "crawl",
    "crayon",
    "crayons",
    "cream",
    "creamy",
    "creek",
    "crib",
    "cricket",
    "crimson",
    "croak",
    "crossing",
    "crow",
    "crunchy",
    "crying",
    "cucumber",
    "cupboard",
    "cupcake",
    "curious",
    "curtain",
    "curtains",
    "custard",
    "cut",
    "cycling",
    "daddy",
    "daffodil",
    "daisy",
    "damp",
    "dancer",
    "dancing",
    "dandelion",
    "date",
    "daughter",
    "dawn",
    "december",
    "deep",
    "deer",
    "delicious",
    "deliver",
    "dice",
    "did",
    "different",
    "dig",
    "dim",
    "ding",
    "dino",
    "dirt",
    "discover",
    "do",
    "does",
    "dolly",
    "done",
    "dong",
    "donkey",
    "dotted",
    "dove",
    "down",
    "dozen",
    "dragonfly",
    "drawer",
    "drawing",
    "drip",
    "drive",
    "driver",
    "drizzle",
    "drop",
    "drums",
    "dry",
    "duckling",
    "dull",
    "dumpling",
    "dusk",
    "dust",
    "dusty",
    "duvet",
    "dwarf",
    "each",
    "early",
    "earring",
    "earrings",
    "easel",
    "easy",
    "edge",
    "eggplant",
    "eight",
    "eighteen",
    "elbow",
    "eleven",
    "elk",
    "email",
    "empty",
    "emu",
    "end",
    "engine",
    "enormous",
    "enough",
    "every",
    "everybody",
    "everyone",
    "everything",
    "exam",
    "excited",
    "experiment",
    "eyebrow",
    "eyelash",
    "factory",
    "fake",
    "falcon",
    "false",
    "fan",
    "fancy",
    "far",
    "fat",
    "father",
    "faucet",
    "feast",
    "february",
    "feel",
    "fence",
    "fern",
    "ferry",
    "festival",
    "few",
    "fifteen",
    "fifty",
    "fig",
    "fill",
    "fin",
    "find",
    "finish",
    "fireman",
    "first",
    "fishing",
    "five",
    "fix",
    "fixed",
    "flag",
    "flamingo",
    "flash",
    "flat",
    "flicker",
    "float",
    "floor",
    "flour",
    "fluffy",
    "fog",
    "foggy",
    "fold",
    "follow",
    "football",
    "forehead",
    "forty",
    "found",
    "four",
    "fourteen",
    "freeze",
    "freezing",
    "fresh",
    "friday",
    "front",
    "frost",
    "frosting",
    "fry",
    "fudge",
    "full",
    "furry",
    "future",
    "fuzzy",
    "galaxy",
    "garage",
    "gardener",
    "garlic",
    "gate",
    "gave",
    "gecko",
    "genie",
    "gentle",
    "geography",
    "gerbil",
    "get",
    "gifts",
    "giggle",
    "girl",
    "give",
    "glacier",
    "glad",
    "glitter",
    "glittery",
    "glow",
    "glue",
    "go",
    "goblin",
    "goes",
    "goldfish",
    "golf",
    "gone",
    "good",
    "goodbye",
    "goose",
    "gorilla",
    "got",
    "grade",
    "grandfather",
    "grandmother",
    "grandparents",
    "granny",
    "grapefruit",
    "grasshopper",
    "gravy",
    "gray",
    "great",
    "greet",
    "grill",
    "ground",
    "growl",
    "grumpy",
    "guard",
    "guess",
    "guinea",
    "gum",
    "gym",
    "gymnastics",
    "had",
    "hail",
    "hairy",
    "half",
    "hall",
    "hallway",
    "ham",
    "harbor",
    "harbour",
    "hard",
    "hare",
    "harp",
    "has",
    "have",
    "hawk",
    "he",
    "healthy",
    "hear",
    "heater",
    "heavy",
    "hedge",
    "hedgehog",
    "heel",
    "hello",
    "hen",
    "her",
    "here",
    "hers",
    "hi",
    "high",
    "him",
    "hip",
    "hippo",
    "hippopotamus",
    "his",
    "hiss",
    "history",
    "hit",
    "hockey",
    "hold",
    "holidays",
    "hollow",
    "honk",
    "hoodie",
    "hoot",
    "hop",
    "hope",
    "horn",
    "hornet",
    "hotdog",
    "hour",
    "house",
    "how",
    "howl",
    "huge",
    "hum",
    "hummingbird",
    "hundred",
    "hurricane",
    "hurry",
    "hyena",
    "icicle",
    "icing",
    "icy",
    "if",
    "iguana",
    "imagine",
    "in",
    "indigo",
    "ink",
    "inside",
    "internet",
    "into",
    "invite",
    "is",
    "it",
    "its",
    "ivy",
    "jaguar",
    "january",
    "jar",
    "jeans",
    "jelly",
    "jellybean",
    "jet",
    "join",
    "jolly",
    "judge",
    "judo",
    "jug",
    "juggle",
    "juicy",
    "july",
    "jumper",
    "jumprope",
    "june",
    "karate",
    "kayak",
    "keep",
    "kept",
    "ketchup",
    "kettle",
    "keyboard",
    "kick",
    "kid",
    "kids",
    "kind",
    "kiwi",
    "knee",
    "knew",
    "knife",
    "knit",
    "knock",
    "know",
    "knuckle",
    "koala",
    "ladder",
    "ladybird",
    "lamb",
    "land",
    "lane",
    "laptop",
    "large",
    "lasagna",
    "last",
    "late",
    "lavender",
    "lay",
    "lead",
    "leak",
    "learn",
    "leash",
    "least",
    "leaves",
    "left",
    "leggings",
    "lemur",
    "lend",
    "leopard",
    "less",
    "lesson",
    "let",
    "lettuce",
    "librarian",
    "lick",
    "licorice",
    "lid",
    "lie",
    "lifeguard",
    "lift",
    "lightbulb",
    "like",
    "lily",
    "lime",
    "lip",
    "lips",
    "listen",
    "little",
    "living",
    "lizard",
    "llama",
    "lobster",
    "lock",
    "lonely",
    "long",
    "look",
    "lorry",
    "lose",
    "lots",
    "lovely",
    "low",
    "lunchbox",
    "lungs",
    "lynx",
    "macaroni",
    "machine",
    "mad",
    "made",
    "magical",
    "magnet",
    "mail",
    "make",
    "mall",
    "mama",
    "man",
    "mango",
    "many",
    "maple",
    "marble",
    "marbles",
    "march",
    "margarine",
    "marker",
    "market",
    "marsh",
    "maths",
    "mattress",
    "may",
    "maybe",
    "mayonnaise",
    "me",
    "meal",
    "mean",
    "measure",
    "meat",
    "meatball",
    "mechanic",
    "meet",
    "melody",
    "melon",
    "melt",
    "men",
    "mend",
    "menu",
    "meow",
    "message",
    "messy",
    "metal",
    "meteor",
    "metro",
    "microphone",
    "microwave",
    "middle",
    "midnight",
    "milkshake",
    "million",
    "mine",
    "minute",
    "mirror",
    "mist",
    "mix",
    "modern",
    "mole",
    "moment",
    "mommy",
    "monday",
    "month",
    "moo",
    "moose",
    "mop",
    "more",
    "mosquito",
    "moss",
    "most",
    "moth",
    "mother",
    "motorbike",
    "motorcycle",
    "move",
    "mow",
    "muddy",
    "muffin",
    "mug",
    "mule",
    "mum",
    "mummy",
    "munch",
    "muscle",
    "mustard",
    "my",
    "myself",
    "nail",
    "nap",
    "napkin",
    "narrow",
    "navy",
    "near",
    "neat",
    "neck",
    "necklace",
    "nectarine",
    "need",
    "neigh",
    "neighbor",
    "neighbour",
    "nephew",
    "nervous",
    "never",
    "newt",
    "next",
    "nice",
    "niece",
    "nightlight",
    "nine",
    "nineteen",
    "no",
    "nobody",
    "nod",
    "noisy",
    "noodle",
    "noodles",
    "noon",
    "normal",
    "not",
    "note",
    "notebook",
    "notes",
    "nothing",
    "november",
    "now",
    "nugget",
    "nuggets",
    "nut",
    "oak",
    "oatmeal",
    "october",
    "odd",
    "off",
    "office",
    "officer",
    "often",
    "ogre",
    "oil",
    "oink",
    "ok",
    "okay",
    "olive",
    "on",
    "one",
    "onion",
    "only",
    "onto",
    "open",
    "or",
    "orangutan",
    "orbit",
    "orchid",
    "order",
    "ornament",
    "ostrich",
    "other",
    "otter",
    "our",
    "ours",
    "out",
    "outside",
    "over",
    "overalls",
    "ox",
    "oyster",
    "page",
    "paintbrush",
    "painter",
    "palace",
    "palm",
    "pan",
    "panther",
    "papa",
    "papaya",
    "parade",
    "parent",
    "parents",
    "past",
    "path",
    "pavement",
    "pay",
    "pea",
    "peach",
    "peacock",
    "peanut",
    "peas",
    "pebble",
    "peel",
    "pelican",
    "people",
    "pepper",
    "person",
    "petal",
    "pharmacy",
    "photograph",
    "pick",
    "pigeon",
    "piglet",
    "pine",
    "pinecone",
    "plain",
    "playtime",
    "please",
    "plenty",
    "plug",
    "plum",
    "plumber",
    "pocket",
    "poem",
    "point",
    "pointy",
    "policeman",
    "polite",
    "pomegranate",
    "pop",
    "poppy",
    "popsicle",
    "porch",
    "pork",
    "porridge",
    "port",
    "post",
    "pot",
    "pour",
    "power",
    "prawn",
    "present",
    "presents",
    "press",
    "pretend",
    "pretty",
    "printer",
    "prize",
    "protect",
    "proud",
    "pudding",
    "pull",
    "pupil",
    "purr",
    "purse",
    "push",
    "put",
    "quack",
    "quick",
    "quilt",
    "quite",
    "quiz",
    "raccoon",
    "racing",
    "radiator",
    "radish",
    "raft",
    "raincoat",
    "raindrop",
    "rainy",
    "raisin",
    "rake",
    "ram",
    "raspberry",
    "rat",
    "raven",
    "real",
    "really",
    "receive",
    "recess",
    "recipe",
    "recorder",
    "referee",
    "rent",
    "reply",
    "rescue",
    "rest",
    "rhino",
    "rhinoceros",
    "rhythm",
    "ribbon",
    "rice",
    "right",
    "rinse",
    "roast",
    "robin",
    "roll",
    "rollerskate",
    "room",
    "rooster",
    "root",
    "rope",
    "rose",
    "rough",
    "rubber",
    "rude",
    "rug",
    "rugby",
    "ruler",
    "running",
    "rush",
    "said",
    "sail",
    "sailboat",
    "sailor",
    "salmon",
    "salt",
    "salty",
    "same",
    "sandals",
    "sandbox",
    "saturday",
    "sauce",
    "sausage",
    "save",
    "saw",
    "saxophone",
    "say",
    "scared",
    "schoolbag",
    "scooter",
    "scorpion",
    "scream",
    "scrub",
    "sculpture",
    "seagull",
    "seahorse",
    "seal",
    "search",
    "seat",
    "seatbelt",
    "seaweed",
    "second",
    "see",
    "seek",
    "seen",
    "seesaw",
    "sell",
    "send",
    "sentence",
    "september",
    "serious",
    "set",
    "seven",
    "seventeen",
    "sew",
    "shadow",
    "shake",
    "shallow",
    "shampoo",
    "sharp",
    "sharpener",
    "she",
    "sheet",
    "shelf",
    "shiny",
    "shore",
    "short",
    "shorts",
    "shoulder",
    "shout",
    "shovel",
    "shower",
    "shrimp",
    "shrub",
    "shut",
    "shy",
    "side",
    "sidewalk",
    "sign",
    "silent",
    "silly",
    "silver",
    "simple",
    "singer",
    "sink",
    "sip",
    "sit",
    "six",
    "sixteen",
    "skating",
    "skiing",
    "skin",
    "skinny",
    "skip",
    "skirt",
    "skunk",
    "sleepy",
    "sleet",
    "sleeve",
    "slice",
    "slippers",
    "sloth",
    "slug",
    "smaller",
    "smallest",
    "smell",
    "smoke",
    "smooth",
    "smoothie",
    "snap",
    "sneakers",
    "sneeze",
    "snore",
    "snowy",
    "so",
    "sob",
    "soda",
    "soil",
    "solid",
    "solve",
    "some",
    "somebody",
    "someone",
    "something",
    "sometimes",
    "son",
    "songs",
    "soon",
    "sorbet",
    "sorry",
    "sour",
    "spaghetti",
    "sparkly",
    "sparrow",
    "speak",
    "special",
    "spend",
    "spicy",
    "spill",
    "spin",
    "spinach",
    "splash",
    "spots",
    "spotted",
    "spread",
    "sprinkles",
    "sprout",
    "squash",
    "squeak",
    "squeeze",
    "squid",
    "stadium",
    "staircase",
    "stairs",
    "stand",
    "stars",
    "start",
    "statue",
    "steak",
    "stegosaurus",
    "stem",
    "sticker",
    "stickers",
    "sticky",
    "sting",
    "stir",
    "stomach",
    "stool",
    "stop",
    "store",
    "stormy",
    "stove",
    "strange",
    "straw",
    "stream",
    "street",
    "stretch",
    "striped",
    "stripes",
    "study",
    "subtract",
    "subway",
    "sunday",
    "sunny",
    "sunrise",
    "sunshine",
    "supermarket",
    "supper",
    "surfing",
    "surprised",
    "sushi",
    "swallow",
    "swamp",
    "swan",
    "sweep",
    "sweets",
    "swimming",
    "switch",
    "syrup",
    "taco",
    "tadpole",
    "tag",
    "take",
    "talk",
    "tall",
    "tambourine",
    "tangerine",
    "tap",
    "tape",
    "taste",
    "tasty",
    "taxi",
    "teach",
    "tear",
    "teddy",
    "teeth",
    "telephone",
    "television",
    "tell",
    "temple",
    "ten",
    "test",
    "than",
    "thank",
    "thanks",
    "thanksgiving",
    "that",
    "thaw",
    "the",
    "theater",
    "theatre",
    "their",
    "theirs",
    "them",
    "then",
    "there",
    "these",
    "they",
    "thick",
    "thief",
    "thin",
    "think",
    "third",
    "thirsty",
    "thirteen",
    "thirty",
    "this",
    "thorn",
    "those",
    "thought",
    "thousand",
    "three",
    "throne",
    "through",
    "thumb",
    "thursday",
    "tick",
    "ticket",
    "tickle",
    "tidy",
    "tie",
    "tights",
    "tin",
    "tiny",
    "toad",
    "toaster",
    "tock",
    "today",
    "toe",
    "toes",
    "toffee",
    "toilet",
    "told",
    "tomorrow",
    "tongue",
    "tonight",
    "too",
    "took",
    "toothpaste",
    "top",
    "tornado",
    "tortoise",
    "toucan",
    "touch",
    "toward",
    "town",
    "toys",
    "trace",
    "track",
    "traffic",
    "trainers",
    "tram",
    "tray",
    "treat",
    "trex",
    "triceratops",
    "tricky",
    "troll",
    "trombone",
    "trousers",
    "true",
    "trunk",
    "try",
    "tshirt",
    "tuesday",
    "tulip",
    "tummy",
    "tuna",
    "tune",
    "tunnel",
    "turkey",
    "turn",
    "turquoise",
    "tweet",
    "twelve",
    "twenty",
    "twig",
    "twin",
    "twinkle",
    "twins",
    "two",
    "ugly",
    "uncle",
    "under",
    "uniform",
    "universe",
    "university",
    "unlock",
    "untie",
    "up",
    "upset",
    "us",
    "use",
    "usually",
    "vacation",
    "valley",
    "van",
    "vanilla",
    "very",
    "vest",
    "video",
    "village",
    "villain",
    "vine",
    "vinegar",
    "violet",
    "visit",
    "voice",
    "volleyball",
    "waffle",
    "wagon",
    "waiter",
    "waitress",
    "wake",
    "wall",
    "wallaby",
    "wallet",
    "walrus",
    "want",
    "was",
    "wash",
    "wasp",
    "watch",
    "we",
    "web",
    "wednesday",
    "weed",
    "week",
    "weekend",
    "weird",
    "well",
    "went",
    "were",
    "what",
    "when",
    "where",
    "which",
    "whiskers",
    "whisper",
    "whistle",
    "who",
    "whom",
    "why",
    "wide",
    "wiggle",
    "willow",
    "windy",
    "wink",
    "wipe",
    "woman",
    "women",
    "wonder",
    "woodpecker",
    "work",
    "worm",
    "worried",
    "worse",
    "worst",
    "wrap",
    "wrist",
    "writer",
    "xylophone",
    "yacht",
    "yawn",
    "yell",
    "yes",
    "yesterday",
    "yogurt",
    "you",
    "young",
    "your",
    "yours",
    "yourself",
    "yoyo",
    "yummy",
    "zero",
    "zip",
    "zipper",
    "zucchini"
  ],
  fr: [
    "aboyer",
    "abricot",
    "acheter",
    "acide",
    "acteur",
    "actrice",
    "adorer",
    "affam\xE9",
    "agneau",
    "ail",
    "aimant",
    "aimer",
    "air",
    "ajouter",
    "algue",
    "aller",
    "alligator",
    "alors",
    "alpaga",
    "amer",
    "am\xE8re",
    "ampoule",
    "ancien",
    "ancienne",
    "ancre",
    "\xE2ne",
    "ao\xFBt",
    "appareil",
    "appartement",
    "appeler",
    "applaudir",
    "apporter",
    "apprendre",
    "appuyer",
    "apr\xE8s-midi",
    "argent\xE9",
    "argile",
    "armure",
    "arr\xEAter",
    "arroser",
    "asseoir",
    "assez",
    "assoiff\xE9",
    "attacher",
    "au",
    "aube",
    "aubergine",
    "aujourd'hui",
    "aussi",
    "auteur",
    "autocollant",
    "autour",
    "autre",
    "autruche",
    "aux",
    "avaler",
    "averse",
    "avocat",
    "avoir",
    "avril",
    "babouin",
    "bac",
    "badminton",
    "baguette",
    "baie",
    "baigner",
    "baignoire",
    "b\xE2iller",
    "balancer",
    "balayer",
    "balcon",
    "balle",
    "ballet",
    "ballons",
    "bambou",
    "banc",
    "banque",
    "barri\xE8re",
    "bas",
    "baseball",
    "basketball",
    "baskets",
    "basse",
    "batterie",
    "bavarder",
    "beau",
    "beaucoup",
    "bec",
    "beige",
    "b\xEAler",
    "b\xE9lier",
    "belle",
    "berceau",
    "b\xEAte",
    "betterave",
    "biblioth\xE9caire",
    "biche",
    "bicyclette",
    "bidon",
    "bient\xF4t",
    "billes",
    "bison",
    "bizarre",
    "blaireau",
    "blanche",
    "bleue",
    "bob",
    "bocal",
    "b\u0153uf",
    "bol",
    "bon",
    "bonjour",
    "bonne",
    "bonnet",
    "bonsoir",
    "bord",
    "boucherie",
    "boucle",
    "boueux",
    "bouger",
    "bougies",
    "bouillir",
    "bouilloire",
    "boulette",
    "boum",
    "bouquet",
    "bourdonner",
    "boussole",
    "bouteille",
    "boutique",
    "bouton",
    "boutonner",
    "bowling",
    "bracelet",
    "brillante",
    "brillants",
    "brindille",
    "brioche",
    "brise",
    "brocoli",
    "brosse",
    "brosser",
    "brouillard",
    "br\xFBler",
    "brume",
    "bruyante",
    "buisson",
    "bulles",
    "c\xE2ble",
    "cadeaux",
    "cadenas",
    "cahier",
    "caissier",
    "calendrier",
    "calmar",
    "cam\xE9l\xE9on",
    "camionnette",
    "canari",
    "caneton",
    "cano\xEB",
    "cantine",
    "caqueter",
    "car",
    "carafe",
    "caramel",
    "carnaval",
    "carr\xE9e",
    "cartes",
    "casquette",
    "cass\xE9",
    "cass\xE9e",
    "casser",
    "casserole",
    "cassis",
    "castor",
    "cave",
    "ce",
    "ceinture",
    "c\xE9l\xE9bration",
    "c\xE9leri",
    "cent",
    "cerf",
    "ces",
    "cet",
    "cette",
    "chacun",
    "chansons",
    "chanteur",
    "chanteuse",
    "chaque",
    "chargeur",
    "chariot",
    "charrette",
    "chatouiller",
    "chaude",
    "chauffeur",
    "chaussons",
    "chemin",
    "ch\xEAne",
    "chercher",
    "chevalet",
    "cheville",
    "chewing-gum",
    "chimpanz\xE9",
    "chose",
    "chou",
    "chou-fleur",
    "chouette",
    "chuchoter",
    "cil",
    "cin\xE9ma",
    "cinq",
    "cinquante",
    "clair",
    "claire",
    "clavier",
    "cl\xE9mentine",
    "cligner",
    "clignoter",
    "coasser",
    "coffre",
    "coin",
    "col",
    "colibri",
    "collant",
    "colle",
    "coll\xE8ge",
    "coller",
    "collier",
    "colombe",
    "colorier",
    "com\xE8te",
    "commander",
    "commencer",
    "comment",
    "concombre",
    "conduire",
    "contr\xF4le",
    "copier",
    "coq",
    "coquelicot",
    "corail",
    "corbeau",
    "corde",
    "cornet",
    "c\xF4t\xE9",
    "cou",
    "coucher",
    "coude",
    "coudre",
    "couette",
    "couiner",
    "couler",
    "couloir",
    "couper",
    "courageuse",
    "courgette",
    "court",
    "courte",
    "cousin",
    "cousine",
    "couteau",
    "couvercle",
    "coyote",
    "crac",
    "craie",
    "crapaud",
    "cravate",
    "cr\xE8me",
    "cr\xE9meux",
    "creuser",
    "crevette",
    "crier",
    "croire",
    "croquant",
    "croquer",
    "croustillant",
    "cueillir",
    "cuire",
    "cuisinier",
    "cuisini\xE8re",
    "cupcake",
    "curieuse",
    "curieux",
    "cygne",
    "dans",
    "danseur",
    "danseuse",
    "datte",
    "de",
    "d\xE9cembre",
    "d\xE9coration",
    "d\xE9couvrir",
    "dedans",
    "d\xE9fil\xE9",
    "d\xE9geler",
    "dehors",
    "d\xE9licieuse",
    "d\xE9licieux",
    "demain",
    "demander",
    "dentifrice",
    "dents",
    "d\xE9p\xEAcher",
    "d\xE9penser",
    "dernier",
    "derni\xE8re",
    "derri\xE8re",
    "des",
    "dessin",
    "dessous",
    "dessus",
    "deux",
    "deuxi\xE8me",
    "devant",
    "deviner",
    "devoir",
    "difficile",
    "dimanche",
    "dinde",
    "dindon",
    "dire",
    "dix",
    "donc",
    "donner",
    "dor\xE9",
    "dor\xE9e",
    "dos",
    "douce",
    "douche",
    "doucher",
    "doudou",
    "douzaine",
    "douze",
    "drap",
    "drapeau",
    "droite",
    "dromadaire",
    "du",
    "duveteux",
    "\xE9checs",
    "\xE9chelle",
    "\xE9clabousser",
    "\xE9clater",
    "\xE9corce",
    "\xE9couter",
    "\xE9crivain",
    "effray\xE9",
    "effray\xE9e",
    "\xE9glise",
    "\xE9lan",
    "elle",
    "elles",
    "emballer",
    "embrasser",
    "emprunter",
    "encourager",
    "encre",
    "enfant",
    "enfants",
    "ennuy\xE9",
    "\xE9norme",
    "enseigner",
    "ensoleill\xE9",
    "entendre",
    "entra\xEEneur",
    "entre",
    "envoyer",
    "\xE9pais",
    "\xE9paisse",
    "\xE9paule",
    "\xE9peler",
    "\xE9pinard",
    "\xE9pine",
    "\xE9plucher",
    "\xE9rable",
    "escalier",
    "esp\xE9rer",
    "essayer",
    "essuyer",
    "et",
    "\xE9tag\xE8re",
    "\xE9ternuer",
    "\xE9tinceler",
    "\xE9tirer",
    "\xE9toiles",
    "\xE9trange",
    "\xEAtre",
    "\xE9troit",
    "\xE9tudier",
    "\xE9vier",
    "excit\xE9",
    "excit\xE9e",
    "exp\xE9rience",
    "f\xE2ch\xE9",
    "f\xE2ch\xE9e",
    "facile",
    "faire",
    "falaise",
    "farine",
    "fatigu\xE9e",
    "faucon",
    "fausse",
    "fauteuil",
    "faux",
    "femme",
    "ferm\xE9e",
    "fermer",
    "fermeture",
    "ferry",
    "festin",
    "feuilles",
    "feutre",
    "feux",
    "f\xE9vrier",
    "fier",
    "fi\xE8re",
    "figue",
    "fille",
    "fils",
    "finir",
    "flamant",
    "fleurir",
    "flotter",
    "fondre",
    "football",
    "foug\xE8re",
    "fra\xEEche",
    "frais",
    "framboise",
    "frapper",
    "frein",
    "frelon",
    "frire",
    "froide",
    "front",
    "frotter",
    "fum\xE9e",
    "furieux",
    "futur",
    "galaxie",
    "garage",
    "gar\xE7on",
    "garder",
    "gauche",
    "gaufre",
    "gazouiller",
    "gecko",
    "gel\xE9e",
    "geler",
    "g\xE9nie",
    "genou",
    "gens",
    "gentil",
    "gentille",
    "g\xE9ographie",
    "gerbille",
    "germer",
    "gigantesque",
    "gilet",
    "givre",
    "gla\xE7age",
    "glac\xE9e",
    "glacier",
    "gland",
    "glisser",
    "gobelin",
    "golf",
    "gorille",
    "goutte",
    "goutter",
    "grand-m\xE8re",
    "grand-p\xE8re",
    "grande",
    "grands-parents",
    "gr\xEAle",
    "grenade",
    "grenier",
    "griffe",
    "grignoter",
    "grille-pain",
    "griller",
    "grillon",
    "grise",
    "grogner",
    "grognon",
    "gros",
    "groseille",
    "grosse",
    "gu\xEApe",
    "gym",
    "gymnastique",
    "haie",
    "hanche",
    "haricot",
    "harpe",
    "haut",
    "haute",
    "hennir",
    "h\xE9risson",
    "heure",
    "heureuse",
    "heureux",
    "hier",
    "hippocampe",
    "hippopotame",
    "hockey",
    "homard",
    "homme",
    "huile",
    "huit",
    "hu\xEEtre",
    "hululer",
    "humide",
    "hurler",
    "hy\xE8ne",
    "iguane",
    "il",
    "ils",
    "imaginer",
    "immense",
    "immeuble",
    "imperm\xE9able",
    "impoli",
    "imprimante",
    "infirmier",
    "inquiet",
    "inqui\xE8te",
    "internet",
    "interrupteur",
    "inviter",
    "jaguar",
    "jamais",
    "jambon",
    "janvier",
    "jardinier",
    "je",
    "jean",
    "jeudi",
    "jeune",
    "joli",
    "jolie",
    "jongler",
    "jonquille",
    "joue",
    "jouets",
    "joyeuse",
    "joyeux",
    "judo",
    "juge",
    "juillet",
    "juin",
    "jumeau",
    "jumeaux",
    "jumelle",
    "jupe",
    "juteux",
    "karat\xE9",
    "kayak",
    "ketchup",
    "kiwi",
    "klaxon",
    "klaxonner",
    "koala",
    "la",
    "laisse",
    "laisser",
    "laitue",
    "lama",
    "langue",
    "lapinou",
    "large",
    "larme",
    "lasagnes",
    "lavande",
    "laver",
    "laveur",
    "le",
    "l\xE9cher",
    "le\xE7on",
    "l\xE9ger",
    "l\xE9g\xE8re",
    "l\xE9murien",
    "lente",
    "l\xE9opard",
    "les",
    "leur",
    "leurs",
    "lever",
    "l\xE8vre",
    "l\xE8vres",
    "l\xE9zard",
    "libellule",
    "lierre",
    "li\xE8vre",
    "limace",
    "lisse",
    "loin",
    "long",
    "longue",
    "lourd",
    "lourde",
    "loutre",
    "lundi",
    "lyc\xE9e",
    "lynx",
    "lys",
    "ma",
    "macaronis",
    "m\xE2cher",
    "machine",
    "magicien",
    "magique",
    "magnifique",
    "mai",
    "maintenant",
    "ma\xEEtre",
    "manche",
    "manchot",
    "mandarine",
    "mangue",
    "marais",
    "march\xE9",
    "mardi",
    "marguerite",
    "marin",
    "mars",
    "matelas",
    "mauvais",
    "mauvaise",
    "mayonnaise",
    "me",
    "m\xE9canicien",
    "m\xE9chant",
    "m\xE9chante",
    "m\xE9decin",
    "meilleur",
    "meilleure",
    "m\xE9langer",
    "m\xE9lodie",
    "melon",
    "m\xEAme",
    "menton",
    "menu",
    "merci",
    "mercredi",
    "m\xE8re",
    "mes",
    "message",
    "mesurer",
    "m\xE9tal",
    "m\xE9t\xE9ore",
    "m\xE9tro",
    "mettre",
    "meugler",
    "miam",
    "miauler",
    "micro",
    "micro-ondes",
    "midi",
    "mignonne",
    "milieu",
    "milkshake",
    "mille",
    "mille-pattes",
    "million",
    "mince",
    "minuit",
    "minuscule",
    "minute",
    "miroir",
    "mixeur",
    "moche",
    "modeler",
    "moderne",
    "moi",
    "moineau",
    "moins",
    "mois",
    "moiti\xE9",
    "moment",
    "momie",
    "mon",
    "montre",
    "montrer",
    "mordre",
    "morse",
    "moteur",
    "moto",
    "mouche",
    "mouette",
    "mouill\xE9e",
    "mousse",
    "moustaches",
    "moustique",
    "moutarde",
    "muffin",
    "mulet",
    "mur",
    "m\xFBre",
    "muscle",
    "myrtille",
    "nageoire",
    "nain",
    "natation",
    "neigeux",
    "nettoyer",
    "neuf",
    "neuve",
    "neveu",
    "ni\xE8ce",
    "noire",
    "noisette",
    "noix",
    "non",
    "normal",
    "nos",
    "note",
    "notre",
    "nouilles",
    "nous",
    "nouvelle",
    "novembre",
    "nuages",
    "nuageux",
    "octobre",
    "ogre",
    "oie",
    "oignon",
    "olive",
    "ombre",
    "on",
    "oncle",
    "ongle",
    "onze",
    "orageux",
    "orang-outan",
    "orchid\xE9e",
    "orteil",
    "ou",
    "oui",
    "ouragan",
    "ouvert",
    "ouverte",
    "ouvrir",
    "page",
    "paille",
    "paillet\xE9",
    "palais",
    "palourde",
    "pamplemousse",
    "panneau",
    "pansement",
    "panth\xE8re",
    "paon",
    "pardon",
    "parent",
    "parents",
    "paresseux",
    "parfois",
    "parler",
    "pass\xE9",
    "p\xE2te",
    "patinage",
    "payer",
    "pays",
    "peau",
    "p\xEAche",
    "peigne",
    "peigner",
    "peindre",
    "peintre",
    "p\xE9lican",
    "pelle",
    "penser",
    "perdre",
    "p\xE8re",
    "personne",
    "p\xE9tale",
    "petite",
    "peu",
    "peut-\xEAtre",
    "pharmacie",
    "phoque",
    "phrase",
    "pic",
    "pi\xE8ce",
    "pierre",
    "pigeon",
    "pin",
    "pinceau",
    "piquant",
    "piq\xFBre",
    "pissenlit",
    "place",
    "plafond",
    "planter",
    "plat",
    "plate",
    "plateau",
    "plein",
    "pleine",
    "pleurs",
    "plier",
    "plombier",
    "plouf",
    "plus",
    "plusieurs",
    "pluvieux",
    "poche",
    "po\xEAle",
    "po\xE8me",
    "poignet",
    "poilu",
    "pointu",
    "pointue",
    "pois",
    "poitrine",
    "poivre",
    "poivron",
    "poli",
    "policier",
    "pop",
    "porc",
    "porcelet",
    "port",
    "portable",
    "portefeuille",
    "porter",
    "poste",
    "poster",
    "pouce",
    "poulet",
    "poumon",
    "pourquoi",
    "poursuivre",
    "poussi\xE8re",
    "poussi\xE9reux",
    "poussin",
    "pouvoir",
    "premier",
    "premi\xE8re",
    "prendre",
    "pr\xE8s",
    "presque",
    "pr\xEAter",
    "prise",
    "prix",
    "professeur",
    "profond",
    "profonde",
    "prot\xE9ger",
    "prune",
    "pudding",
    "quand",
    "quarante",
    "quatorze",
    "quatre",
    "que",
    "quel",
    "quelle",
    "quelque",
    "qui",
    "quinze",
    "quoi",
    "racine",
    "radeau",
    "radiateur",
    "radis",
    "rails",
    "ramper",
    "ranger",
    "rat",
    "raton",
    "raviolis",
    "ray\xE9",
    "ray\xE9e",
    "rayures",
    "rebondir",
    "recette",
    "recevoir",
    "r\xE9cr\xE9ation",
    "regarder",
    "r\xE8gle",
    "r\xE9glisse",
    "remplir",
    "rencontrer",
    "renverser",
    "r\xE9parer",
    "repas",
    "r\xE9pondre",
    "reposer",
    "r\xE9soudre",
    "r\xE9veil",
    "r\xE9veiller",
    "r\xEAver",
    "rhinoc\xE9ros",
    "rideau",
    "rien",
    "rigolo",
    "rigolote",
    "rincer",
    "rivage",
    "riz",
    "robinet",
    "ronde",
    "ronfler",
    "ronronner",
    "rouge-gorge",
    "rouler",
    "ruban",
    "rue",
    "rugby",
    "rugueux",
    "ruisseau",
    "rythme",
    "sa",
    "sac",
    "sal\xE9e",
    "salon",
    "salopette",
    "saluer",
    "salut",
    "samedi",
    "sandales",
    "sant\xE9",
    "sapin",
    "sauce",
    "saucisse",
    "saule",
    "saumon",
    "sauterelle",
    "sautiller",
    "sauver",
    "savoir",
    "saxophone",
    "scarab\xE9e",
    "sciences",
    "scintiller",
    "scorpion",
    "scotch",
    "sculpture",
    "sec",
    "s\xE8che",
    "s\xE9cher",
    "seconde",
    "secouer",
    "seize",
    "sel",
    "semaine",
    "sentir",
    "sept",
    "septembre",
    "s\xE9rieux",
    "serrer",
    "serveur",
    "serveuse",
    "ses",
    "seul",
    "seule",
    "seulement",
    "shampoing",
    "shooter",
    "short",
    "si",
    "si\xE8ge",
    "siffler",
    "sifflet",
    "silencieux",
    "simple",
    "sirop",
    "six",
    "soixante",
    "sol",
    "son",
    "sonner",
    "sorbet",
    "sort",
    "soulever",
    "sourcil",
    "sous",
    "souvent",
    "spaghettis",
    "sp\xE9cial",
    "stade",
    "statue",
    "steak",
    "sucr\xE9e",
    "suivre",
    "supermarch\xE9",
    "sur",
    "surpris",
    "sweat",
    "t-shirt",
    "ta",
    "tablier",
    "tabouret",
    "tac",
    "taches",
    "tachet\xE9",
    "taille-crayon",
    "talon",
    "tambourin",
    "tante",
    "taper",
    "tapis",
    "tard",
    "tartiner",
    "taupe",
    "taureau",
    "taxi",
    "te",
    "t\xE9l\xE9vision",
    "tenir",
    "terrasse",
    "tes",
    "t\xEAtard",
    "th\xE9\xE2tre",
    "thon",
    "tic",
    "ticket",
    "tige",
    "timide",
    "tirelire",
    "tirer",
    "tiroir",
    "toi",
    "toile",
    "tomber",
    "ton",
    "tornade",
    "t\xF4t",
    "toucan",
    "toucher",
    "toujours",
    "toupie",
    "tourner",
    "tourniquet",
    "tous",
    "tout",
    "toute",
    "toutes",
    "tramway",
    "tranquille",
    "travailler",
    "travers",
    "treize",
    "trente",
    "tr\xE8s",
    "tric\xE9ratops",
    "tricoter",
    "trois",
    "troisi\xE8me",
    "troll",
    "trombone",
    "trompe",
    "tronc",
    "tr\xF4ne",
    "trop",
    "trottinette",
    "trottoir",
    "trousse",
    "trouver",
    "tu",
    "tulipe",
    "tunnel",
    "turquoise",
    "tyrannosaure",
    "un",
    "une",
    "uniforme",
    "univers",
    "universit\xE9",
    "usine",
    "utiliser",
    "vall\xE9e",
    "vanille",
    "veau",
    "veilleuse",
    "vendre",
    "vendredi",
    "venir",
    "venteux",
    "ventilateur",
    "ventre",
    "ver",
    "vermicelles",
    "vers",
    "verser",
    "verte",
    "viande",
    "vide",
    "vid\xE9o",
    "vieil",
    "vieille",
    "village",
    "vinaigre",
    "vingt",
    "violette",
    "violoncelle",
    "visiter",
    "vite",
    "voile",
    "voilier",
    "voir",
    "voisin",
    "voisine",
    "voix",
    "voleur",
    "volley",
    "vos",
    "votre",
    "vouloir",
    "vous",
    "vrai",
    "vraie",
    "vraiment",
    "week-end",
    "xylophone",
    "yaourt",
    "z\xE9ro"
  ]
};

// src/shared/words.js
var MAX_WORD_LENGTH = 24;
var MAX_WORD_PARTS = 3;
var MIN_KEY_LENGTH = 1;
var EDGE_PUNCTUATION = /^[\s"'“”‘’«»`.,!?¿¡;:()[\]{}*_~-]+|[\s"'“”‘’«»`.,!?¿¡;:()[\]{}*_~-]+$/gu;
var ALLOWED = /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u;
function cleanWord(raw) {
  return String(raw ?? "").normalize("NFC").replace(/[‘’`´]/g, "'").replace(/[‐‑‒–—]/g, "-").replace(/\s+/g, " ").replace(EDGE_PUNCTUATION, "").replace(/\s*([-'])\s*/g, "$1").trim();
}
function wordKey(raw) {
  return cleanWord(raw).toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/ß/g, "ss").normalize("NFD").replace(/\p{M}/gu, "").replace(/[\s'-]+/g, "");
}
function validateWord(raw) {
  const word = cleanWord(raw);
  if (!word) return { ok: false, code: "EMPTY", word };
  if (word.length > MAX_WORD_LENGTH) return { ok: false, code: "TOO_LONG", word };
  if (!ALLOWED.test(word)) return { ok: false, code: "INVALID_CHARACTERS", word };
  const key = wordKey(word);
  if (key.length < MIN_KEY_LENGTH) return { ok: false, code: "INVALID_CHARACTERS", word };
  if (word.split(" ").length > MAX_WORD_PARTS) return { ok: false, code: "TOO_MANY_WORDS", word };
  return { ok: true, word, key };
}

// src/shared/lexicon/index.js
var cache = /* @__PURE__ */ new Map();
var PLURAL_ENDINGS = {
  en: [["s", ""], ["es", ""], ["ies", "y"], ["ves", "f"]],
  fr: [["s", ""], ["x", ""], ["e", ""], ["es", ""], ["aux", "al"]]
};
function getLexicon(language = "en") {
  const lang = language === "fr" ? "fr" : "en";
  if (!cache.has(lang)) cache.set(lang, buildLexicon(lang));
  return cache.get(lang);
}
function buildLexicon(lang) {
  const labelIndex = lang === "fr" ? 2 : 1;
  const concepts = /* @__PURE__ */ new Map();
  for (const [id, en, fr, tags] of CONCEPTS) {
    concepts.set(id, { id, label: lang === "fr" ? fr : en, key: wordKey(lang === "fr" ? fr : en), tags, links: /* @__PURE__ */ new Set(), phrases: /* @__PURE__ */ new Set(), near: /* @__PURE__ */ new Set(), out: /* @__PURE__ */ new Map() });
  }
  for (const row of CONCEPTS) {
    const [id, , , , links] = row;
    links.forEach((other, rank) => {
      if (concepts.has(other) && other !== id) concepts.get(id).out.set(other, rank);
    });
    for (const other of links) {
      if (!concepts.has(other) || other === id) continue;
      concepts.get(id).links.add(other);
      concepts.get(other).links.add(id);
    }
  }
  for (const [a, b] of PHRASES[lang] || []) {
    if (!concepts.has(a) || !concepts.has(b) || a === b) continue;
    concepts.get(a).phrases.add(b);
    concepts.get(b).phrases.add(a);
  }
  for (const concept of concepts.values()) concept.near = /* @__PURE__ */ new Set([...concept.links, ...concept.phrases]);
  const byKey = /* @__PURE__ */ new Map();
  for (const concept of concepts.values()) if (!byKey.has(concept.key)) byKey.set(concept.key, concept.id);
  const knownKeys = [...byKey.keys()].sort((x, y) => y.length - x.length);
  function exact(key) {
    if (byKey.has(key)) return byKey.get(key);
    for (const [ending, replacement] of PLURAL_ENDINGS[lang]) {
      if (key.length > ending.length + 2 && key.endsWith(ending)) {
        const stem = key.slice(0, -ending.length) + replacement;
        if (byKey.has(stem)) return byKey.get(stem);
      }
    }
    return null;
  }
  function resolveAll(raw) {
    const key = wordKey(raw);
    if (!key) return [];
    const id = exact(key);
    if (id) return [id];
    const parts = String(raw).trim().toLowerCase().split(/[\s-]+/);
    if (parts.length > 1) {
      const singular = exact(wordKey(parts.map((part) => part.length > 3 ? part.replace(/[sx]$/, "") : part).join(" ")));
      if (singular) return [singular];
    }
    if (key.length < 5) return [];
    for (let cut = key.length - 3; cut >= 3; cut--) {
      const head = exact(key.slice(0, cut)), tail = exact(key.slice(cut));
      if (head && tail && head !== tail) return [head, tail];
    }
    for (const known2 of knownKeys) {
      if (known2.length < 3 || known2.length >= key.length || known2.length / key.length < 0.6) continue;
      if (key.startsWith(known2) || key.endsWith(known2)) return [byKey.get(known2)];
    }
    return [];
  }
  function resolve(raw) {
    return resolveAll(raw)[0] ?? null;
  }
  const words = [...concepts.values()].map((c) => c.label).concat(EXTRA_WORDS[lang] || []);
  return { language: lang, labelIndex, concepts, byKey, resolve, resolveAll, words };
}

// src/shared/morph.js
var EN_IRREGULAR = {
  // nouns
  children: "child",
  mice: "mouse",
  men: "man",
  women: "woman",
  feet: "foot",
  teeth: "tooth",
  geese: "goose",
  people: "person",
  oxen: "ox",
  dice: "die",
  lice: "louse",
  cacti: "cactus",
  fungi: "fungus",
  // verbs: past / participle → base
  ran: "run",
  went: "go",
  gone: "go",
  ate: "eat",
  eaten: "eat",
  saw: "see",
  seen: "see",
  took: "take",
  taken: "take",
  gave: "give",
  given: "give",
  came: "come",
  became: "become",
  began: "begin",
  begun: "begin",
  broke: "break",
  broken: "break",
  chose: "choose",
  chosen: "choose",
  drove: "drive",
  driven: "drive",
  flew: "fly",
  flown: "fly",
  forgot: "forget",
  forgotten: "forget",
  froze: "freeze",
  frozen: "freeze",
  got: "get",
  gotten: "get",
  grew: "grow",
  grown: "grow",
  hid: "hide",
  hidden: "hide",
  knew: "know",
  known: "know",
  rode: "ride",
  ridden: "ride",
  rang: "ring",
  rung: "ring",
  rose: "rise",
  risen: "rise",
  sang: "sing",
  sung: "sing",
  sank: "sink",
  sunk: "sink",
  spoke: "speak",
  spoken: "speak",
  stole: "steal",
  stolen: "steal",
  swam: "swim",
  swum: "swim",
  threw: "throw",
  thrown: "throw",
  woke: "wake",
  woken: "wake",
  wore: "wear",
  worn: "wear",
  won: "win",
  sat: "sit",
  slept: "sleep",
  felt: "feel",
  kept: "keep",
  made: "make",
  built: "build",
  bought: "buy",
  brought: "bring",
  caught: "catch",
  taught: "teach",
  thought: "think",
  fought: "fight",
  found: "find",
  held: "hold",
  told: "tell",
  sold: "sell",
  stood: "stand",
  dug: "dig",
  drank: "drink",
  drunk: "drink",
  drew: "draw",
  drawn: "draw",
  fell: "fall",
  fallen: "fall",
  did: "do",
  done: "do",
  was: "be",
  were: "be",
  been: "be",
  had: "have",
  said: "say",
  paid: "pay",
  met: "meet",
  fed: "feed",
  shot: "shoot",
  lost: "lose",
  slid: "slide",
  spun: "spin",
  stuck: "stick",
  swung: "swing",
  blew: "blow",
  blown: "blow",
  bit: "bite",
  bitten: "bite",
  shook: "shake",
  shaken: "shake",
  tore: "tear",
  torn: "tear",
  wrote: "write",
  written: "write",
  hung: "hang",
  lit: "light",
  heard: "hear",
  ground: "grind",
  // comparatives
  better: "good",
  best: "good",
  worse: "bad",
  worst: "bad"
};
var EN_ADJECTIVES = new Set("big small fast slow tall short hot cold nice happy sad funny long soft hard loud quiet bright dark warm cool old young new strong weak high low easy busy pretty ugly clean dirty rich poor deep wide thin thick fat smart kind brave wild calm cute sweet sour late early heavy light quick near far full wet dry safe scary silly tiny huge great fresh sharp smooth rough tough lucky sunny windy rainy snowy cloudy crazy fancy friendly gentle simple close fine large loose noisy shiny sticky tasty yummy hungry sleepy angry lazy dull mild odd pale pure rare ripe sick slim sore steep tight wise grumpy".split(" "));
var EN_NOT_INFLECTED = new Set("evening morning ceiling during string wedding building painting drawing feeling meaning earring sibling darling pudding nothing something everything anything thing king ring sing spring wing swing sling sting bring cling fling news glasses pants jeans scissors shorts series species physics maths mathematics trousers pajamas pyjamas stairs hundred sacred naked wicked bed red shed sled seed need feed speed weed bleed breed ladder letter water winter summer flower tower power river silver butter dinner paper spider monster tiger number finger hamburger upper under over after never ever corner danger mother father sister brother teacher baker".split(" "));
var FR_IRREGULAR = { yeux: "oeil", cieux: "ciel", messieurs: "monsieur", mesdames: "madame" };
var knownCache = /* @__PURE__ */ new Map();
function known(lang) {
  if (!knownCache.has(lang)) {
    const set = /* @__PURE__ */ new Set();
    for (const word of getLexicon(lang).words) for (const token of tokens(word)) set.add(token);
    if (lang === "en") {
      for (const base of Object.values(EN_IRREGULAR)) set.add(base);
      for (const adjective of EN_ADJECTIVES) set.add(adjective);
    }
    knownCache.set(lang, set);
  }
  return knownCache.get(lang);
}
function tokens(raw) {
  return cleanWord(raw).toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/\p{M}/gu, "").split(/[\s'-]+/).filter(Boolean);
}
var undouble = (stem) => /([bdgklmnprstz])\1$/.test(stem) ? stem.slice(0, -1) : null;
function enLemmas(word, base) {
  const out = /* @__PURE__ */ new Set([word]);
  const add = (candidate) => {
    if (candidate && candidate.length >= 2 && base.has(candidate)) out.add(candidate);
  };
  if (EN_IRREGULAR[word]) out.add(EN_IRREGULAR[word]);
  if (EN_NOT_INFLECTED.has(word) || word.length < 3) return out;
  if (word.endsWith("ies") && word.length > 4) add(word.slice(0, -3) + "y");
  if (word.endsWith("ves") && word.length > 4) {
    add(word.slice(0, -3) + "f");
    add(word.slice(0, -3) + "fe");
  }
  if (word.endsWith("es") && word.length > 3) add(word.slice(0, -2));
  if (word.endsWith("s") && !/(ss|us|is)$/.test(word) && word.length > 2) {
    const stem = word.slice(0, -1);
    if (base.has(stem) || !base.has(word) && word.length > 4 && !/ous$/.test(word)) out.add(stem);
  }
  if (word.endsWith("ing") && word.length > 5) {
    const stem = word.slice(0, -3);
    add(stem);
    add(stem + "e");
    add(undouble(stem));
    if (stem.endsWith("y")) add(stem.slice(0, -1) + "ie");
  }
  if (word.endsWith("ed") && word.length > 4) {
    const stem = word.slice(0, -2);
    add(stem);
    add(word.slice(0, -1));
    add(undouble(stem));
    if (stem.endsWith("i")) add(stem.slice(0, -1) + "y");
  }
  for (const ending of ["est", "er"]) {
    if (!word.endsWith(ending) || word.length <= ending.length + 2) continue;
    const stem = word.slice(0, -ending.length);
    for (const candidate of [stem, stem + "e", undouble(stem), stem.endsWith("i") ? stem.slice(0, -1) + "y" : null]) {
      if (candidate && EN_ADJECTIVES.has(candidate)) out.add(candidate);
    }
  }
  return out;
}
function frLemmas(word, base) {
  const out = /* @__PURE__ */ new Set([word]);
  const add = (candidate) => {
    if (candidate && candidate.length >= 2 && base.has(candidate)) out.add(candidate);
  };
  if (FR_IRREGULAR[word]) out.add(FR_IRREGULAR[word]);
  if (word.length < 3) return out;
  if (word.endsWith("aux") && word.length > 4) {
    add(word.slice(0, -3) + "al");
    add(word.slice(0, -3) + "ail");
  }
  if (word.endsWith("x") && word.length > 3) add(word.slice(0, -1));
  if (word.endsWith("s") && word.length > 3) {
    const stem = word.slice(0, -1);
    if (base.has(stem) || !base.has(word) && word.length > 4) out.add(stem);
  }
  for (const [ending, replacement] of [["es", ""], ["e", ""], ["euses", "eur"], ["euse", "eur"], ["ives", "if"], ["ive", "if"], ["ennes", "en"], ["enne", "en"], ["elles", "el"], ["elle", "el"]]) {
    if (word.endsWith(ending) && word.length > ending.length + 2) add(word.slice(0, -ending.length) + replacement);
  }
  for (const ending of ["eant", "ant", "ons", "ent", "ees", "ez", "ee", "es", "e"]) {
    if (word.endsWith(ending) && word.length > ending.length + 2) add(word.slice(0, -ending.length) + "er");
  }
  return out;
}
function lemmaKeys(raw, language = "en") {
  const lang = language === "fr" ? "fr" : "en";
  const parts = tokens(raw);
  const result = /* @__PURE__ */ new Set([wordKey(raw)]);
  if (!parts.length) return result;
  const base = known(lang);
  const lemmatize = lang === "fr" ? frLemmas : enLemmas;
  let combos = [""];
  parts.forEach((part, i) => {
    const forms = lang === "en" && i < parts.length - 1 ? /* @__PURE__ */ new Set([part]) : lemmatize(part, base);
    const next = [];
    for (const prefix of combos) for (const form of forms) next.push(prefix + form);
    combos = next.slice(0, 32);
  });
  for (const combo of combos) result.add(combo);
  return result;
}
function sameUnderlyingWord(a, b, language = "en") {
  const keyA = wordKey(a);
  if (!keyA) return false;
  if (keyA === wordKey(b)) return true;
  const setB = lemmaKeys(b, language);
  for (const key of lemmaKeys(a, language)) if (setB.has(key)) return true;
  return false;
}

// src/shared/bot.js
function wordForms(key) {
  const out = /* @__PURE__ */ new Set([key, key + "s", key + "x", key + "es"]);
  if (key.length > 3 && /[sx]$/.test(key)) out.add(key.slice(0, -1));
  if (key.length > 4 && key.endsWith("es")) out.add(key.slice(0, -2));
  if (key.length > 4 && key.endsWith("ies")) out.add(key.slice(0, -3) + "y");
  if (key.length > 2 && key.endsWith("y")) out.add(key.slice(0, -1) + "ies");
  if (key.length > 4 && key.endsWith("ves")) out.add(key.slice(0, -3) + "f");
  if (key.length > 2 && key.endsWith("f")) out.add(key.slice(0, -1) + "ves");
  if (key.length > 4 && key.endsWith("aux")) out.add(key.slice(0, -3) + "al");
  if (key.length > 3 && key.endsWith("al")) out.add(key.slice(0, -2) + "aux");
  return out;
}
function isExcluded(key, excludeKeys) {
  for (const form of wordForms(key)) if (excludeKeys.has(form)) return true;
  return false;
}
var BOT_TUNING = {
  /** Each prompt must independently relate at least this strongly (0..1), or the candidate is rejected. */
  minPerSide: 0.45,
  weights: { weakest: 0.4, human: 0.3, average: 0.15, obvious: 0.1, novelty: 0.05 },
  /** Weighted pick among the best few (after quality filtering). */
  pick: [0.55, 0.3, 0.15],
  /** Only candidates within this share of the best score make the shortlist. */
  shortlistRatio: 0.85,
  /** Concept seen N rounds ago → extra score penalty (1 round ago is rejected outright). */
  recency: [[2, 2, 0.25], [3, 5, 0.12], [6, 8, 0.05]],
  /** Penalty for answering with a piece of a prompt word, or a word containing one. */
  containedPenalty: 0.25
};
function sideRelation(lex, promptIds, candidate) {
  let best = { strength: 0, human: 0 };
  for (const promptId of promptIds) {
    const prompt = lex.concepts.get(promptId);
    if (!prompt || prompt.id === candidate.id) continue;
    const phrase = prompt.phrases.has(candidate.id), link = prompt.links.has(candidate.id);
    const outRank = prompt.out.get(candidate.id), named = outRank !== void 0, namedBack = candidate.out.has(prompt.id);
    let shared = 0;
    for (const neighbour of candidate.near) if (prompt.near.has(neighbour)) shared++;
    const commonTag = candidate.tags.some((tag) => prompt.tags.includes(tag));
    const strength = phrase && link ? 1 : phrase ? 0.95 : named ? 0.9 : namedBack ? 0.8 : shared >= 3 ? 0.55 : shared === 2 ? 0.45 : shared === 1 ? 0.25 : commonTag ? 0.1 : 0;
    const human = named ? Math.max(0.6, 1 - outRank * 0.04) : phrase ? 0.85 : namedBack ? 0.65 : shared >= 3 ? 0.35 : shared === 2 ? 0.25 : shared === 1 ? 0.1 : 0;
    if (strength > best.strength || strength === best.strength && human > best.human) best = { strength, human };
  }
  return best;
}
function recentConcepts(lex, history) {
  const ago = /* @__PURE__ */ new Map();
  history.slice().reverse().forEach((round, i) => {
    for (const word of round) for (const id of lex.resolveAll(word)) if (!ago.has(id)) ago.set(id, i + 1);
  });
  return ago;
}
var lemmaCache = /* @__PURE__ */ new Map();
function cachedLemmas(label, language) {
  const key = `${language}:${label}`;
  if (!lemmaCache.has(key)) lemmaCache.set(key, lemmaKeys(label, language));
  return lemmaCache.get(key);
}
function rankCandidates({ prompts, language = "en", excludeKeys = /* @__PURE__ */ new Set(), history = [], tuning = BOT_TUNING }) {
  const lex = getLexicon(language);
  const list = (Array.isArray(prompts) ? prompts : []).slice(0, 2).map((p) => String(p ?? ""));
  const [idsA = [], idsB = []] = list.map((p) => lex.resolveAll(p));
  const promptIds = /* @__PURE__ */ new Set([...idsA, ...idsB]);
  const promptKeys = new Set(list.map(wordKey).filter(Boolean));
  const blocked = /* @__PURE__ */ new Set();
  for (const word of [...list, ...excludeKeys]) for (const key of lemmaKeys(word, language)) blocked.add(key);
  const ago = recentConcepts(lex, history);
  const w = tuning.weights;
  const ranked = [];
  for (const candidate of lex.concepts.values()) {
    if (promptIds.has(candidate.id)) continue;
    if (isExcluded(candidate.key, promptKeys) || isExcluded(candidate.key, excludeKeys)) continue;
    if ([...cachedLemmas(candidate.label, language)].some((key) => blocked.has(key))) continue;
    const roundsAgo = ago.get(candidate.id);
    if (roundsAgo === 1) continue;
    const a = sideRelation(lex, idsA, candidate), b = sideRelation(lex, idsB, candidate);
    if (a.strength + b.strength <= 0) continue;
    const weakest = Math.min(a.strength, b.strength), average = (a.strength + b.strength) / 2;
    const familiarity = Math.min(1, candidate.links.size / 10);
    const human = (a.human + b.human) / 2 * (0.75 + 0.25 * familiarity);
    const obvious = Math.max(0, (candidate.label.includes(" ") ? 0.65 : 1) - (candidate.label.length > 9 ? 0.2 : 0));
    const recency = tuning.recency.find(([from, to]) => roundsAgo !== void 0 && roundsAgo >= from && roundsAgo <= to);
    const novelty = recency ? 1 - recency[2] * 4 : 1;
    const contained = [...promptKeys].some((key) => key.length >= 3 && candidate.key.length >= 3 && (key.includes(candidate.key) || candidate.key.includes(key)));
    const score = weakest * w.weakest + human * w.human + average * w.average + obvious * w.obvious + Math.max(0, novelty) * w.novelty - (recency ? recency[2] : 0) - (contained ? tuning.containedPenalty : 0);
    ranked.push({
      word: candidate.label,
      id: candidate.id,
      a: a.strength,
      b: b.strength,
      weakest,
      average,
      human,
      obvious,
      novelty,
      score,
      passes: a.strength >= tuning.minPerSide && b.strength >= tuning.minPerSide
    });
  }
  ranked.sort((x, y) => y.score - x.score || x.word.localeCompare(y.word));
  return { ranked, knownA: idsA.length > 0, knownB: idsB.length > 0 };
}
function pickFromShortlist(items, rng, tuning) {
  const top = items[0].score;
  const shortlist = items.filter((item) => item.score >= top * tuning.shortlistRatio).slice(0, tuning.pick.length);
  const weights = tuning.pick.slice(0, shortlist.length);
  const total = weights.reduce((sum, x) => sum + x, 0);
  let roll = rng() * total;
  for (let i = 0; i < shortlist.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return shortlist[i];
  }
  return shortlist[shortlist.length - 1];
}
var GLOOMY_OPENINGS = /* @__PURE__ */ new Set(["nightmare", "scary", "fear", "ghost", "monster", "haunted_house", "skeleton", "zombie", "witch", "spider", "snake", "shark", "sad", "angry", "cry", "storm", "volcano", "dark"]);
function chooseOpening({ language = "en", excludeKeys = /* @__PURE__ */ new Set(), rng = Math.random }) {
  const lex = getLexicon(language);
  const pool = [...lex.concepts.values()].filter((c) => c.links.size >= 7 && !c.label.includes(" ") && !GLOOMY_OPENINGS.has(c.id) && !isExcluded(c.key, excludeKeys));
  const fallback = [...lex.concepts.values()].filter((c) => !isExcluded(c.key, excludeKeys));
  const list = pool.length ? pool : fallback;
  if (!list.length) throw new Error("No words left for the bot");
  return { word: list[Math.floor(rng() * list.length)].label, quality: "opening" };
}
function chooseResponse({ prompts, language = "en", excludeKeys = /* @__PURE__ */ new Set(), history = [], rng = Math.random, tuning = BOT_TUNING }) {
  const { ranked } = rankCandidates({ prompts, language, excludeKeys, history, tuning });
  const strong = ranked.filter((item) => item.passes);
  if (strong.length) return { word: pickFromShortlist(strong, rng, tuning).word, quality: "strong" };
  if (ranked.length) {
    const bridges = ranked.slice().sort((x, y) => y.weakest - x.weakest || y.score - x.score);
    const best = bridges[0].weakest > 0 ? bridges.filter((item) => item.weakest > 0).map((item) => ({ ...item, score: item.weakest + item.score / 10 })) : ranked;
    return { word: pickFromShortlist(best, rng, tuning).word, quality: "loose" };
  }
  const list = (Array.isArray(prompts) ? prompts : []).map((p) => wordKey(String(p ?? ""))).filter(Boolean);
  return { ...chooseOpening({ language, excludeKeys: /* @__PURE__ */ new Set([...excludeKeys, ...list]), rng }), quality: "loose" };
}

// src/shared/rules.js
var MAX_MOVES = 20;
var FINISHED = /* @__PURE__ */ new Set(["MATCHED", "EXHAUSTED"]);
function moveOutcome(number, wordA, wordB, language = "en") {
  if (sameUnderlyingWord(wordA, wordB, language)) return "MATCHED";
  return number >= MAX_MOVES ? "EXHAUSTED" : "REVEALED";
}
function isFinished(game) {
  return FINISHED.has(game.status);
}
function checkWord(game, side, raw) {
  if (isFinished(game)) return { ok: false, code: "GAME_OVER" };
  const valid = validateWord(raw);
  if (!valid.ok) return valid;
  const language = game.language || "en";
  const forms = lemmaKeys(valid.word, language);
  const own = game.moves.flatMap((m) => m.words ? [lemmaKeys(m.words[side], language)] : []);
  const overlaps = (set) => [...set].some((key) => forms.has(key));
  if (own.length && overlaps(own[own.length - 1])) return { ok: false, code: "SAME_AS_LAST", word: valid.word };
  if (own.some(overlaps)) return { ok: false, code: "ALREADY_USED", word: valid.word };
  return valid;
}
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = state + 1831565813 >>> 0;
    let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

// src/server/api.js
var BOT = "BOT";
var FINISHED2 = /* @__PURE__ */ new Set(["MATCHED", "EXHAUSTED", "COMPLETE"]);
var isPlayable = (row) => row.status !== "WAITING" && !FINISHED2.has(row.status);
var NOTIFICATION_LIMIT = 50;
var json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
var fail = (status, code, error, extra = {}) => json({ error, code, ...extra }, status);
var uuid = () => crypto.randomUUID();
var now = () => (/* @__PURE__ */ new Date()).toISOString();
var joinCode = () => {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 4; i++) out += letters[Math.floor(Math.random() * letters.length)];
  return out + "-" + Math.floor(10 + Math.random() * 90);
};
async function all(db, sql, args = []) {
  return (await db.prepare(sql).bind(...args).all()).results || [];
}
async function first(db, sql, args = []) {
  return (await all(db, sql, args))[0] || null;
}
var ready = null;
function ensureSchema(db) {
  ready ??= (async () => {
    await db.batch([
      db.prepare("CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, recovery_code TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL)"),
      db.prepare("CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, join_code TEXT UNIQUE NOT NULL, status TEXT NOT NULL, round_number INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
      db.prepare("CREATE TABLE IF NOT EXISTS game_players (game_id TEXT NOT NULL, player_id TEXT NOT NULL, slot INTEGER NOT NULL, joined_at TEXT NOT NULL, PRIMARY KEY(game_id, player_id), UNIQUE(game_id, slot))"),
      db.prepare("CREATE TABLE IF NOT EXISTS rounds (id TEXT PRIMARY KEY, game_id TEXT NOT NULL, round_number INTEGER NOT NULL, previous_a TEXT, previous_b TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL, revealed_at TEXT, UNIQUE(game_id, round_number))"),
      db.prepare("CREATE TABLE IF NOT EXISTS submissions (round_id TEXT NOT NULL, player_id TEXT NOT NULL, word TEXT NOT NULL, submitted_at TEXT NOT NULL, PRIMARY KEY(round_id, player_id))"),
      db.prepare("CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, player_id TEXT NOT NULL, game_id TEXT, kind TEXT NOT NULL, message TEXT NOT NULL, read_at TEXT, created_at TEXT NOT NULL)")
    ]).catch(() => {
    });
    for (const sql of [
      "ALTER TABLE games ADD COLUMN language TEXT DEFAULT 'en'",
      "ALTER TABLE rounds ADD COLUMN bot_quality TEXT DEFAULT NULL",
      "ALTER TABLE rounds ADD COLUMN bot_reason TEXT DEFAULT NULL",
      "ALTER TABLE games ADD COLUMN rematch_of TEXT"
    ]) {
      try {
        await db.prepare(sql).run();
      } catch {
      }
    }
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}
async function rematchIdFor(gameId) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`rematch:${gameId}`));
  const bytes = new Uint8Array(digest).slice(0, 16);
  bytes[6] = bytes[6] & 15 | 80;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
async function loadGame(db, gameId) {
  const game = await first(db, "SELECT * FROM games WHERE id = ?", [gameId]);
  if (!game) return null;
  const members = await all(db, "SELECT gp.player_id, gp.slot, p.display_name FROM game_players gp LEFT JOIN players p ON p.id = gp.player_id WHERE gp.game_id = ? ORDER BY gp.slot", [gameId]);
  const rounds = await all(db, "SELECT * FROM rounds WHERE game_id = ? ORDER BY round_number", [gameId]);
  const submissions = await all(db, "SELECT s.round_id, s.player_id, s.word, s.submitted_at FROM submissions s JOIN rounds r ON r.id = s.round_id WHERE r.game_id = ?", [gameId]);
  const slotOf = new Map(members.map((m) => [m.player_id, m.slot === 1 ? "a" : "b"]));
  const moves = rounds.map((round) => {
    const played = submissions.filter((s) => s.round_id === round.id);
    const bySide = {};
    for (const s of played) {
      const side = slotOf.get(s.player_id);
      if (side) bySide[side] = s;
    }
    const status2 = round.status === "COMPLETE" ? "MATCHED" : round.status;
    const revealed = status2 !== "OPEN";
    return {
      id: round.id,
      number: round.round_number,
      prompts: round.previous_a || round.previous_b ? [round.previous_a, round.previous_b] : null,
      status: status2,
      openedAt: round.created_at,
      revealedAt: round.revealed_at,
      words: revealed && bySide.a && bySide.b ? { a: bySide.a.word, b: bySide.b.word } : null,
      submitted: bySide,
      botQuality: round.bot_quality || null
    };
  });
  let rematchId = null;
  if (FINISHED2.has(game.status)) {
    const candidate = await rematchIdFor(game.id);
    const linked = await first(db, "SELECT id FROM games WHERE id = ? AND rematch_of = ?", [candidate, game.id]);
    rematchId = linked ? linked.id : null;
  }
  const status = game.status === "COMPLETE" ? "MATCHED" : game.status === "MATCHED" || game.status === "EXHAUSTED" ? game.status : "ACTIVE";
  return { row: game, members, moves, slotOf, rematchId, rules: { status, language: game.language === "fr" ? "fr" : "en", moves } };
}
var isLegacySolo = (loaded) => loaded.members.some((m) => m.player_id === BOT);
function viewFor(loaded, playerId) {
  const { row, members, moves, slotOf } = loaded;
  const side = slotOf.get(playerId);
  const otherSide = side === "a" ? "b" : "a";
  const other = members.find((m) => m.player_id !== playerId);
  const bot = isLegacySolo(loaded);
  const status = (
    /** @type {GameView["status"]} */
    row.status === "COMPLETE" ? "MATCHED" : row.status
  );
  return {
    kind: bot ? "legacy-solo" : "family",
    id: row.id,
    joinCode: row.join_code,
    language: row.language === "fr" ? "fr" : "en",
    status,
    waitingForPlayer: status === "WAITING",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    maxMoves: MAX_MOVES,
    you: { side, name: members.find((m) => m.player_id === playerId)?.display_name || null },
    opponent: { side: otherSide, bot, name: bot ? null : other?.display_name || null, joined: Boolean(other) },
    rematchId: bot ? null : loaded.rematchId,
    moves: moves.map((move) => ({
      number: move.number,
      prompts: move.prompts,
      status: move.status,
      openedAt: move.openedAt,
      revealedAt: move.revealedAt,
      words: move.words,
      botQuality: move.botQuality,
      mine: move.status === "OPEN" && side ? move.submitted[side]?.word || null : null,
      otherLocked: move.status === "OPEN" ? Boolean(move.submitted[otherSide]) : false
    }))
  };
}
var notify = (db, playerId, gameId, kind, message, key, at) => db.prepare("INSERT OR IGNORE INTO notifications VALUES(?,?,?,?,?,?,?)").bind(`${gameId}:${key}:${playerId}`, playerId, gameId, kind, message, null, at);
async function revealIfReady(db, loaded) {
  const { row, members, moves } = loaded;
  const move = moves[moves.length - 1];
  if (!isPlayable(row) || !move || move.status !== "OPEN" || !move.submitted.a || !move.submitted.b) return false;
  const a = move.submitted.a.word, b = move.submitted.b.word, at = now();
  const outcome = moveOutcome(move.number, a, b, row.language === "fr" ? "fr" : "en");
  const humans = isLegacySolo(loaded) ? [] : members;
  const statements = [
    db.prepare("UPDATE rounds SET status = ?, revealed_at = ? WHERE id = ? AND status = 'OPEN'").bind(outcome, at, move.id)
  ];
  if (outcome === "REVEALED") {
    statements.push(
      db.prepare("UPDATE games SET round_number = ?, status = 'ACTIVE', updated_at = ? WHERE id = ? AND round_number = ?").bind(move.number + 1, at, row.id, move.number),
      db.prepare("INSERT OR IGNORE INTO rounds (id,game_id,round_number,previous_a,previous_b,status,created_at,revealed_at) VALUES(?,?,?,?,?,?,?,?)").bind(`${row.id}:${move.number + 1}`, row.id, move.number + 1, a, b, "OPEN", at, null),
      ...humans.map((m) => notify(db, m.player_id, row.id, "READY_TO_REVEAL", "New move ready! Find the next connection!", `reveal-${move.number}`, at))
    );
  } else {
    statements.push(
      db.prepare("UPDATE games SET status = ?, updated_at = ? WHERE id = ? AND status = 'ACTIVE'").bind(outcome, at, row.id),
      ...humans.map((m) => notify(db, m.player_id, row.id, outcome === "MATCHED" ? "GAME_COMPLETE" : "GAME_EXHAUSTED", outcome === "MATCHED" ? "You matched! Same thing!" : "20 moves used. Try a rematch!", `end`, at))
    );
  }
  await db.batch(statements);
  return true;
}
function legacyBotWord(loaded) {
  const move = loaded.moves[loaded.moves.length - 1];
  const excludeKeys = /* @__PURE__ */ new Set();
  for (const m of loaded.moves) for (const s of Object.values(m.submitted)) if (m !== move) excludeKeys.add(wordKey(s.word));
  const rng = seededRandom(hashString(`${loaded.row.id}:${move.number}`));
  const language = loaded.row.language === "fr" ? "fr" : "en";
  return move.prompts ? chooseResponse({ prompts: move.prompts, language, excludeKeys, rng, history: loaded.moves.flatMap((m) => m.words ? [[m.words.a, m.words.b]] : []) }) : chooseOpening({ language, excludeKeys, rng });
}
async function settle(db, loaded) {
  const move = loaded.moves[loaded.moves.length - 1];
  if (!isPlayable(loaded.row) || !move || move.status !== "OPEN") return loaded;
  const botSide = loaded.slotOf.get(BOT);
  let changed = false;
  if (botSide && !move.submitted[botSide] && Object.keys(move.submitted).length) {
    const pick = legacyBotWord(loaded);
    const at = now();
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO submissions VALUES(?,?,?,?)").bind(move.id, BOT, pick.word, at),
      db.prepare("UPDATE rounds SET bot_quality = ?, bot_reason = NULL WHERE id = ? AND status = 'OPEN'").bind(pick.quality, move.id)
    ]);
    changed = true;
  }
  if (changed) loaded = await reload(db, loaded);
  if (await revealIfReady(db, loaded)) changed = true;
  return changed ? reload(db, loaded) : loaded;
}
async function reload(db, loaded) {
  const fresh = await loadGame(db, loaded.row.id);
  if (!fresh) throw new Error(`Game ${loaded.row.id} disappeared`);
  return fresh;
}
var MESSAGES = {
  EMPTY: "Add a word first, then lock it in.",
  TOO_LONG: "That word is a bit long. Try a shorter one.",
  INVALID_CHARACTERS: "Use letters only (spaces, hyphens and apostrophes are fine).",
  TOO_SHORT: "Try a word with at least two letters.",
  // retired: one-letter words are allowed
  TOO_MANY_WORDS: "Try one word (or a short phrase of up to three words).",
  SAME_AS_LAST: "You just played that word. Try a different one!",
  ALREADY_USED: "You already used that word in this game. Try a new one!",
  GAME_OVER: "This game is over. Start a new game to play again."
};
async function submit(db, body) {
  const playerId = String(body.player_id || "");
  const loaded = await loadGame(db, String(body.game_id || ""));
  if (!loaded) return fail(404, "GAME_NOT_FOUND", "Game not found");
  const side = loaded.slotOf.get(playerId);
  if (!side) return fail(403, "NOT_A_MEMBER", "You are not part of this game");
  const current = loaded.moves[loaded.moves.length - 1];
  const asked = Number(body.move) || current.number;
  const askedMove = loaded.moves.find((m) => m.number === asked);
  if (askedMove && askedMove.submitted[side]) {
    if (askedMove.status === "OPEN" && wordKey(askedMove.submitted[side].word) !== wordKey(body.word)) {
      return fail(409, "ALREADY_LOCKED", "Your word for this move is already locked in.", { game: viewFor(loaded, playerId) });
    }
    return json({ ok: true, duplicate: true, game: viewFor(await settle(db, loaded), playerId) });
  }
  if (loaded.row.status === "WAITING") return fail(409, "WAITING_FOR_PLAYER", "Waiting for the other player to join.");
  if (FINISHED2.has(loaded.row.status)) return fail(409, "GAME_OVER", MESSAGES.GAME_OVER, { game: viewFor(loaded, playerId) });
  if (asked !== current.number || current.status !== "OPEN") return fail(409, "STALE_MOVE", "This move already finished. Here is the latest.", { game: viewFor(loaded, playerId) });
  const check = checkWord(loaded.rules, side, body.word);
  if (!check.ok) return fail(400, check.code, MESSAGES[check.code] || "That word can't be used.", { word: check.word });
  const at = now();
  const statements = [db.prepare("INSERT OR IGNORE INTO submissions VALUES(?,?,?,?)").bind(current.id, playerId, check.word, at)];
  const botSide = loaded.slotOf.get(BOT);
  if (botSide && !current.submitted[botSide]) {
    const pick = legacyBotWord(loaded);
    statements.push(
      db.prepare("INSERT OR IGNORE INTO submissions VALUES(?,?,?,?)").bind(current.id, BOT, pick.word, at),
      db.prepare("UPDATE rounds SET bot_quality = ?, bot_reason = NULL WHERE id = ?").bind(pick.quality, current.id)
    );
  }
  await db.batch(statements);
  let fresh = await reload(db, loaded);
  const mine = fresh.moves.find((m) => m.number === current.number)?.submitted[side];
  if (!mine) return fail(503, "NOT_SAVED", "We couldn't save your word. Please try again.");
  if (wordKey(mine.word) !== check.key) return fail(409, "ALREADY_LOCKED", "Your word for this move is already locked in.", { game: viewFor(fresh, playerId) });
  if (await revealIfReady(db, fresh)) fresh = await reload(db, fresh);
  else if (!isLegacySolo(fresh)) {
    const other = fresh.members.find((m) => m.player_id !== playerId);
    if (other) await notify(db, other.player_id, loaded.row.id, "YOUR_TURN", "Your friend played. Your turn!", `turn-${current.number}`, at).run().catch(() => {
    });
  }
  return json({ ok: true, game: viewFor(fresh, playerId) });
}
async function rematch(db, body) {
  const playerId = String(body.player_id || "");
  const player = await first(db, "SELECT id, display_name FROM players WHERE id = ?", [playerId]);
  if (!player) return fail(403, "UNKNOWN_PLAYER", "Please choose a name first.");
  const loaded = await loadGame(db, String(body.game_id || ""));
  if (!loaded) return fail(404, "GAME_NOT_FOUND", "Game not found");
  if (!loaded.slotOf.has(playerId)) return fail(403, "NOT_A_MEMBER", "You are not part of this game");
  if (isLegacySolo(loaded)) return fail(409, "NOT_FAMILY_GAME", "Rematches are for family games.");
  if (!FINISHED2.has(loaded.row.status) || loaded.members.length !== 2) return fail(409, "GAME_NOT_FINISHED", "Finish this game first, then start a rematch.");
  const id = await rematchIdFor(loaded.row.id);
  const existing = () => first(db, "SELECT id, join_code FROM games WHERE id = ?", [id]);
  const found = await existing();
  if (found) return json({ id: found.id, join_code: found.join_code, existing: true });
  const created = now();
  const language = loaded.row.language === "fr" ? "fr" : "en";
  const others = loaded.members.filter((m) => m.player_id !== playerId);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = joinCode();
    try {
      await db.batch([
        db.prepare("INSERT INTO games (id,join_code,status,round_number,created_at,updated_at,language,rematch_of) VALUES(?,?,?,?,?,?,?,?)").bind(id, code, "ACTIVE", 1, created, created, language, loaded.row.id),
        ...loaded.members.map((m) => db.prepare("INSERT INTO game_players VALUES(?,?,?,?)").bind(id, m.player_id, m.slot, created)),
        db.prepare("INSERT INTO rounds (id,game_id,round_number,previous_a,previous_b,status,created_at,revealed_at) VALUES(?,?,?,?,?,?,?,?)").bind(`${id}:1`, id, 1, null, null, "OPEN", created, null),
        ...others.map((m) => notify(db, m.player_id, id, "REMATCH", `${player.display_name} wants a rematch!`, "rematch", created))
      ]);
      return json({ id, join_code: code, existing: false });
    } catch {
      const raced = await existing();
      if (raced) return json({ id: raced.id, join_code: raced.join_code, existing: true });
    }
  }
  return fail(500, "GAME_CREATE_FAILED", "Could not create a game right now. Please try again.");
}
var FAMILY_NOTIFICATION = "n.player_id = ? AND n.game_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM game_players b WHERE b.game_id = n.game_id AND b.player_id = 'BOT')";
async function unreadCount(db, playerId) {
  const row = await first(db, `SELECT COUNT(*) AS n FROM notifications n WHERE ${FAMILY_NOTIFICATION} AND n.read_at IS NULL`, [playerId]);
  return Number(row?.n || 0);
}
async function listNotifications(db, playerId) {
  return all(db, `SELECT n.id, n.kind, n.game_id, n.created_at, n.read_at,
    (SELECT p.display_name FROM game_players o JOIN players p ON p.id = o.player_id WHERE o.game_id = n.game_id AND o.player_id != n.player_id LIMIT 1) AS opponent_name
    FROM notifications n WHERE ${FAMILY_NOTIFICATION}
    ORDER BY n.created_at DESC, n.rowid DESC LIMIT ${NOTIFICATION_LIMIT}`, [playerId]);
}
async function handleApi(request, env) {
  const db = env.DB;
  if (!db) return fail(503, "NO_DATABASE", "Database is not configured");
  await ensureSchema(db);
  const url = new URL(request.url);
  const path = url.pathname;
  let body = {};
  if (request.method !== "GET") {
    try {
      body = await request.json();
    } catch {
    }
  }
  if (path === "/api/health") return json({ ok: true });
  if (path === "/api/player" && request.method === "POST") {
    const created = now(), playerId = uuid();
    const displayName = String(body.display_name || "").replace(/\s+/g, " ").trim().slice(0, 24) || "Player";
    const base = displayName.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "PLAYER";
    for (let attempt = 0; attempt < 5; attempt++) {
      const recoveryCode = base + "-" + Math.floor(1e3 + Math.random() * 9e3);
      try {
        await db.prepare("INSERT INTO players VALUES(?,?,?,?,?)").bind(playerId, displayName, recoveryCode, created, created).run();
        return json({ id: playerId, display_name: displayName, recovery_code: recoveryCode });
      } catch {
      }
    }
    return fail(500, "PLAYER_CREATE_FAILED", "Could not create a player right now. Please try again.");
  }
  if (path === "/api/player/recover" && request.method === "POST") {
    const found = await first(db, "SELECT id, display_name, recovery_code FROM players WHERE recovery_code = ?", [String(body.recovery_code || "").toUpperCase().trim()]);
    return found ? json(found) : fail(404, "RECOVERY_NOT_FOUND", "Recovery code not found");
  }
  if (path === "/api/games" && request.method === "POST") {
    const player = await first(db, "SELECT id FROM players WHERE id = ?", [String(body.player_id || "")]);
    if (!player) return fail(403, "UNKNOWN_PLAYER", "Please choose a name first.");
    const created = now(), gameId = uuid(), solo = body.solo === true;
    const language = body.language === "fr" ? "fr" : "en";
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = joinCode();
      try {
        await db.batch([
          db.prepare("INSERT INTO games (id,join_code,status,round_number,created_at,updated_at,language) VALUES(?,?,?,?,?,?,?)").bind(gameId, code, solo ? "ACTIVE" : "WAITING", 1, created, created, language),
          db.prepare("INSERT INTO game_players VALUES(?,?,?,?)").bind(gameId, player.id, 1, created),
          ...solo ? [db.prepare("INSERT INTO game_players VALUES(?,?,?,?)").bind(gameId, BOT, 2, created)] : [],
          db.prepare("INSERT INTO rounds (id,game_id,round_number,previous_a,previous_b,status,created_at,revealed_at) VALUES(?,?,?,?,?,?,?,?)").bind(`${gameId}:1`, gameId, 1, null, null, "OPEN", created, null)
        ]);
        return json({ id: gameId, join_code: code, language });
      } catch {
      }
    }
    return fail(500, "GAME_CREATE_FAILED", "Could not create a game right now. Please try again.");
  }
  if (path === "/api/games/join" && request.method === "POST") {
    const playerId = String(body.player_id || "");
    const player = await first(db, "SELECT id, display_name FROM players WHERE id = ?", [playerId]);
    if (!player) return fail(403, "UNKNOWN_PLAYER", "Please choose a name first.");
    const code = String(body.join_code || "").toUpperCase().replace(/\s+/g, "").trim();
    const game = await first(db, "SELECT * FROM games WHERE join_code = ?", [code]);
    if (!game) return fail(404, "GAME_NOT_FOUND", "We couldn't find a game with that code.");
    const members = await all(db, "SELECT player_id, slot FROM game_players WHERE game_id = ?", [game.id]);
    if (members.some((m) => m.player_id === playerId)) return json({ id: game.id, join_code: game.join_code });
    if (members.length >= 2) return fail(409, "GAME_FULL", "That game already has two players.");
    const joined = now();
    try {
      await db.batch([
        db.prepare("INSERT INTO game_players VALUES(?,?,?,?)").bind(game.id, playerId, 2, joined),
        db.prepare("UPDATE games SET status = 'ACTIVE', updated_at = ? WHERE id = ? AND status = 'WAITING'").bind(joined, game.id),
        ...members.map((m) => notify(db, m.player_id, game.id, "PLAYER_JOINED", `${player.display_name} joined your game!`, "joined", joined))
      ]);
    } catch {
      const member = await first(db, "SELECT 1 AS ok FROM game_players WHERE game_id = ? AND player_id = ?", [game.id, playerId]);
      if (member) return json({ id: game.id, join_code: game.join_code });
      return fail(409, "GAME_FULL", "That game already has two players.");
    }
    return json({ id: game.id, join_code: game.join_code });
  }
  if (path === "/api/dashboard" && request.method === "GET") {
    const playerId = url.searchParams.get("player_id") || "";
    const player = await first(db, "SELECT id, display_name FROM players WHERE id = ?", [playerId]);
    if (!player) return fail(403, "UNKNOWN_PLAYER", "Please choose a name first.");
    await db.prepare("UPDATE players SET last_seen_at = ? WHERE id = ?").bind(now(), playerId).run();
    const games = await all(db, `SELECT g.id, g.join_code, g.status, g.round_number, g.created_at, g.updated_at, g.language,
      EXISTS(SELECT 1 FROM game_players b WHERE b.game_id = g.id AND b.player_id = 'BOT') AS bot,
      (SELECT p2.display_name FROM game_players o JOIN players p2 ON p2.id = o.player_id WHERE o.game_id = g.id AND o.player_id != ? LIMIT 1) AS opponent_name,
      EXISTS(SELECT 1 FROM rounds r JOIN submissions s ON s.round_id = r.id WHERE r.game_id = g.id AND r.round_number = g.round_number AND s.player_id = ?) AS locked
      FROM games g JOIN game_players gp ON gp.game_id = g.id WHERE gp.player_id = ? ORDER BY g.updated_at DESC LIMIT 50`, [playerId, playerId, playerId]);
    const notes = await all(db, `SELECT n.id, n.game_id, n.kind, n.message, n.created_at FROM notifications n WHERE ${FAMILY_NOTIFICATION} AND n.read_at IS NULL ORDER BY n.created_at DESC, n.rowid DESC LIMIT 10`, [playerId]);
    return json({
      player,
      games: games.map((g) => ({ ...g, bot: Boolean(g.bot), locked: Boolean(g.locked), status: g.status === "COMPLETE" ? "MATCHED" : g.status })),
      notifications: notes,
      max_moves: MAX_MOVES
    });
  }
  if (path === "/api/notifications" && request.method === "GET") {
    const playerId = url.searchParams.get("player_id") || "";
    const player = await first(db, "SELECT id FROM players WHERE id = ?", [playerId]);
    if (!player) return fail(403, "UNKNOWN_PLAYER", "Please choose a name first.");
    return json({ notifications: await listNotifications(db, playerId), unread: await unreadCount(db, playerId) });
  }
  if (path === "/api/notifications/read" && request.method === "POST") {
    const playerId = String(body.player_id || "");
    const player = await first(db, "SELECT id FROM players WHERE id = ?", [playerId]);
    if (!player) return fail(403, "UNKNOWN_PLAYER", "Please choose a name first.");
    const at = now();
    if (body.all === true) {
      await db.prepare("UPDATE notifications SET read_at = ? WHERE player_id = ? AND read_at IS NULL").bind(at, playerId).run();
    } else if (Array.isArray(body.ids)) {
      const ids = [...new Set(body.ids.slice(0, 200).map(String))];
      if (ids.length) await db.batch(ids.map((nid) => db.prepare("UPDATE notifications SET read_at = ? WHERE id = ? AND player_id = ? AND read_at IS NULL").bind(at, nid, playerId)));
    }
    return json({ ok: true, unread: await unreadCount(db, playerId) });
  }
  if (path === "/api/games/rematch" && request.method === "POST") return rematch(db, body);
  if (path === "/api/game" && request.method === "GET") {
    const playerId = url.searchParams.get("player_id") || "";
    const loaded = await loadGame(db, url.searchParams.get("id") || "");
    if (!loaded) return fail(404, "GAME_NOT_FOUND", "Game not found");
    if (!loaded.slotOf.has(playerId)) return fail(403, "NOT_A_MEMBER", "You are not part of this game");
    return json({ ok: true, game: viewFor(await settle(db, loaded), playerId) });
  }
  if (path === "/api/submit" && request.method === "POST") return submit(db, body);
  return fail(404, "NOT_FOUND", "Not found");
}

// virtual:assets
var assets = { "/index.html": { "body": '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="theme-color" content="#fff4df">\n<meta name="description" content="A warm, playful word-connection game for kids and families.">\n<title>Same Same but Different</title>\n<link rel="icon" href="/icon.svg" type="image/svg+xml">\n<link rel="manifest" href="/manifest.webmanifest">\n<link rel="stylesheet" href="/assets/styles.0b3586b782.css">\n</head>\n<body>\n<a class="skip" href="#app">Skip to game</a>\n<header class="topbar">\n  <a class="brand" id="brandLink" href="/"><span class="brand-top" id="brandTop">Same Same</span><span class="brand-bottom" id="brandBottom">but different</span></a>\n  <div class="top-actions">\n    <span class="offline-pill" id="offlinePill" hidden></span>\n    <div class="lang-switch" id="langGroup" role="group" aria-label="Language">\n      <button type="button" data-lang="en" aria-pressed="true"><span aria-hidden="true">EN</span><span class="sr-only">English</span></button>\n      <button type="button" data-lang="fr" aria-pressed="false"><span aria-hidden="true">FR</span><span class="sr-only" lang="fr">Fran\xE7ais</span></button>\n    </div>\n    <button type="button" class="bell" id="notifBtn" aria-label="Notifications" hidden><svg class="bell-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3a6 6 0 0 0-6 6v3.2L4.3 15.6A1 1 0 0 0 5.2 17h13.6a1 1 0 0 0 .9-1.4L18 12.2V9a6 6 0 0 0-6-6Z"/><path d="M9.5 19a2.5 2.5 0 0 0 5 0"/></svg><span class="bell-count" id="notifCount" hidden></span></button>\n    <button type="button" class="avatar" id="profileBtn" aria-label="Profile">?</button>\n  </div>\n</header>\n<main id="app" tabindex="-1"><p class="boot">Loading\u2026</p></main>\n<div class="toasts" id="toasts" aria-live="polite"></div>\n<dialog id="dialog" class="dialog"></dialog>\n<noscript><p class="boot">This game needs JavaScript turned on.</p></noscript>\n<script type="module" src="/assets/app.2b788f7188.js"></script>\n</body>\n</html>\n', "type": "text/html; charset=utf-8", "cache": "no-cache", "etag": '"4f06e14613"' }, "/assets/app.2b788f7188.js": { "body": 'var ge=[["sun","sun","soleil",["sky","light","hot"],["moon","sky","day","summer","star","light","beach","hot","sunflower","yellow","space"]],["moon","moon","lune",["sky","night","space"],["sky","night","star","space","rocket","planet","dream","light","astronaut","owl"]],["star","star","\\xE9toile",["sky","night","space"],["sky","night","space","planet","wish","light","shine","rocket","shape"]],["sky","sky","ciel",["sky","nature"],["cloud","bird","plane","rainbow","blue","star","kite","fly","space","night","day"]],["cloud","cloud","nuage",["sky","weather"],["rain","sky","storm","white","soft","snow","wind","thunder","plane"]],["rain","rain","pluie",["weather","water","sky"],["cloud","umbrella","puddle","storm","rainbow","water","flower","grow","garden","wet","boots","spring"]],["snow","snow","neige",["weather","cold","season"],["winter","cold","snowman","sled","ice","white","mountain","ski","christmas","snowflake","mitten"]],["storm","storm","orage",["weather","sky","sound"],["thunder","lightning","rain","wind","cloud","scary","loud"]],["rainbow","rainbow","arc-en-ciel",["sky","color","weather"],["rain","color","sun","sky","unicorn","red","purple","cloud"]],["thunder","thunder","tonnerre",["weather","sound"],["lightning","storm","loud","cloud","scary"]],["lightning","lightning","\\xE9clair",["weather","light"],["thunder","storm","fast","electricity","bright"]],["wind","wind","vent",["weather","nature"],["kite","storm","leaf","autumn","cloud","boat","cold"]],["umbrella","umbrella","parapluie",["weather"],["rain","wet","boots","puddle","coat","beach"]],["puddle","puddle","flaque",["weather","water"],["rain","boots","mud","wet","jump"]],["snowman","snowman","bonhomme de neige",["cold","season"],["snow","winter","carrot","scarf","cold","hat"]],["snowflake","snowflake","flocon",["cold","weather"],["snow","winter","ice","cold","white"]],["light","light","lumi\\xE8re",["light"],["sun","lamp","bright","dark","candle","star","day","flashlight","shine"]],["night","night","nuit",["night","time"],["moon","star","dark","sleep","dream","bed","owl","bat","day","pajamas"]],["day","day","jour",["time","light"],["sun","night","morning","light","time","sky"]],["morning","morning","matin",["time"],["breakfast","sun","day","school","coffee"]],["dark","dark","sombre",["night","color"],["night","black","scary","light","flashlight","bat"]],["dream","dream","r\\xEAve",["night","feeling"],["sleep","night","bed","wish","pillow","moon","unicorn","nightmare"]],["nightmare","nightmare","cauchemar",["night","feeling"],["dream","scary","monster","night","sleep","ghost"]],["sleep","sleep","dormir",["night","home"],["bed","night","dream","pillow","tired","pajamas","blanket"]],["bed","bed","lit",["home","night"],["sleep","pillow","blanket","night","dream","bedroom","pajamas","teddy_bear"]],["pillow","pillow","oreiller",["home","night"],["bed","sleep","soft","dream","blanket","feather"]],["blanket","blanket","couverture",["home","night"],["bed","pillow","warm","soft","sleep","cozy"]],["space","space","espace",["space","science"],["rocket","planet","star","moon","astronaut","alien","sun","earth"]],["rocket","rocket","fus\\xE9e",["space","transport"],["space","moon","astronaut","planet","fast","fire","fly","star"]],["planet","planet","plan\\xE8te",["space","science"],["space","earth","star","moon","rocket","alien","round"]],["earth","earth","terre",["space","nature"],["planet","world","space","moon","nature","round"]],["astronaut","astronaut","astronaute",["space","job"],["rocket","space","moon","planet","helmet","star"]],["alien","alien","extraterrestre",["space","story"],["space","planet","green","rocket","monster"]],["animal","animal","animal",["animal"],["pet","zoo","farm","dog","cat","jungle","fur","paw","tail","forest","wild"]],["pet","pet","animal domestique",["pet","animal","home"],["dog","cat","fish","hamster","rabbit","animal","home","love","fur","paw","tail","vet"]],["dog","dog","chien",["animal","pet"],["cat","bone","puppy","paw","tail","fur","pet","ball","walk","wolf"]],["puppy","puppy","chiot",["animal","pet"],["dog","baby","cute","play","paw"]],["cat","cat","chat",["animal","pet"],["dog","mouse","milk","kitten","paw","tail","fur","pet","fish"]],["kitten","kitten","chaton",["animal","pet"],["cat","baby","cute","milk"]],["fur","fur","fourrure",["animal","body"],["dog","cat","bear","soft","warm","rabbit","fox"]],["paw","paw","patte",["animal","body"],["dog","cat","bear","foot"]],["tail","tail","queue",["animal","body"],["dog","cat","monkey","mouse","fox","fish","horse"]],["bird","bird","oiseau",["animal","sky"],["nest","wing","feather","fly","egg","sky","tree","sing","owl","parrot"]],["fish","fish","poisson",["animal","ocean","water"],["water","ocean","swim","sea","shark","boat","pet","river","aquarium"]],["horse","horse","cheval",["animal","farm"],["farm","ride","unicorn","knight","tail","pony","hay"]],["pony","pony","poney",["animal","farm"],["horse","ride","farm","cute","unicorn"]],["cow","cow","vache",["animal","farm"],["milk","farm","grass","cheese","barn","farmer"]],["pig","pig","cochon",["animal","farm"],["farm","mud","pink","barn"]],["sheep","sheep","mouton",["animal","farm"],["farm","wool","grass","white","cloud","sleep"]],["chicken","chicken","poule",["animal","farm"],["egg","farm","feather","nest","barn"]],["duck","duck","canard",["animal","water","farm"],["pond","feather","swim","farm","wing","bird"]],["lion","lion","lion",["animal"],["tiger","king","roar","zoo","jungle","cat","wild"]],["tiger","tiger","tigre",["animal"],["lion","jungle","zoo","orange","roar","wild","cat"]],["elephant","elephant","\\xE9l\\xE9phant",["animal"],["zoo","big","jungle","circus","grey","giraffe"]],["monkey","monkey","singe",["animal"],["banana","jungle","tree","zoo","tail","climb","funny"]],["bear","bear","ours",["animal","nature"],["forest","honey","teddy_bear","fur","cave","paw","big","winter","panda"]],["teddy_bear","teddy bear","nounours",["toy","home"],["bear","toy","soft","bed","hug","cute"]],["frog","frog","grenouille",["animal","water"],["pond","jump","green","prince","fly","river"]],["bee","bee","abeille",["animal","nature"],["honey","flower","garden","yellow","insect"]],["butterfly","butterfly","papillon",["animal","nature"],["flower","wing","garden","caterpillar","color","fly","spring","insect"]],["caterpillar","caterpillar","chenille",["animal","nature"],["butterfly","leaf","green","insect","garden","grow"]],["insect","insect","insecte",["animal","nature"],["bee","ant","butterfly","ladybug","spider","garden","grass"]],["ant","ant","fourmi",["animal","nature"],["insect","picnic","small","garden","grass"]],["ladybug","ladybug","coccinelle",["animal","nature"],["insect","red","garden","leaf"]],["spider","spider","araign\\xE9e",["animal","nature"],["insect","halloween","scary","leg","ghost","haunted_house"]],["owl","owl","hibou",["animal","night","nature"],["night","bird","forest","tree","moon","feather"]],["bat","bat","chauve-souris",["animal","night"],["night","cave","halloween","dark","wing","vampire"]],["wolf","wolf","loup",["animal","nature","story"],["forest","moon","dog","fox","wild"]],["fox","fox","renard",["animal","nature"],["forest","orange","tail","wolf","rabbit","fur"]],["rabbit","rabbit","lapin",["animal","pet"],["carrot","ear","easter","pet","fur","garden","jump"]],["mouse","mouse","souris",["animal","pet"],["cat","cheese","small","tail","computer"]],["hamster","hamster","hamster",["animal","pet"],["pet","small","wheel","cute","mouse"]],["parrot","parrot","perroquet",["animal","pet"],["bird","pirate","jungle","feather","color"]],["snake","snake","serpent",["animal"],["jungle","scary","desert","zoo","crocodile"]],["giraffe","giraffe","girafe",["animal"],["zoo","elephant","zebra","tree","animal","jungle"]],["zebra","zebra","z\\xE8bre",["animal"],["zoo","horse","giraffe","black","white"]],["penguin","penguin","pingouin",["animal","cold"],["ice","cold","snow","fish","swim","bird","ocean"]],["panda","panda","panda",["animal"],["bear","zoo","black","white","cute"]],["shark","shark","requin",["animal","ocean"],["ocean","fish","tooth","sea","scary","swim"]],["whale","whale","baleine",["animal","ocean"],["ocean","sea","big","dolphin","swim","fish"]],["dolphin","dolphin","dauphin",["animal","ocean"],["ocean","sea","swim","whale","jump","wave"]],["octopus","octopus","pieuvre",["animal","ocean"],["ocean","sea","arm","fish"]],["crab","crab","crabe",["animal","ocean"],["beach","sand","sea","shell","ocean","starfish"]],["turtle","turtle","tortue",["animal","water"],["shell","slow","sea","beach","pond","green"]],["snail","snail","escargot",["animal","nature"],["slow","shell","garden","rain","leaf"]],["dinosaur","dinosaur","dinosaure",["animal","science","story"],["fossil","big","roar","egg","volcano","dragon","bone","museum"]],["dragon","dragon","dragon",["magic","story","fire"],["fire","castle","knight","princess","wing","treasure","dinosaur","scary","cave","magic"]],["unicorn","unicorn","licorne",["magic","story","animal"],["horse","rainbow","magic","princess","fairy","dream","sparkle"]],["castle","castle","ch\\xE2teau",["story","magic","home"],["king","queen","princess","knight","dragon","tower","crown","prince","sandcastle"]],["princess","princess","princesse",["story","magic"],["prince","castle","crown","queen","king","dress","fairy","dragon"]],["prince","prince","prince",["story","magic"],["princess","castle","king","frog","crown","knight","horse"]],["knight","knight","chevalier",["story","adventure"],["castle","sword","dragon","horse","shield","king","princess"]],["king","king","roi",["story"],["queen","crown","castle","prince","lion","knight","princess"]],["queen","queen","reine",["story"],["king","crown","castle","princess","bee"]],["crown","crown","couronne",["story","clothes"],["king","queen","princess","gold","castle","jewel","prince"]],["pirate","pirate","pirate",["story","adventure","ocean"],["treasure","ship","parrot","island","map","sea","sword","captain"]],["treasure","treasure","tr\\xE9sor",["adventure","story"],["pirate","gold","map","island","dragon","jewel"]],["magic","magic","magie",["magic"],["wizard","wand","fairy","spell","unicorn","witch","dragon","sparkle"]],["wizard","wizard","sorcier",["magic","story"],["magic","wand","spell","hat","witch","castle","owl","beard"]],["witch","witch","sorci\\xE8re",["magic","story","holiday"],["broom","halloween","hat","spell","cat","wizard","magic","cauldron"]],["fairy","fairy","f\\xE9e",["magic","story"],["wing","magic","wand","princess","flower","sparkle","tooth","unicorn","star"]],["wand","wand","baguette magique",["magic"],["wizard","magic","fairy","spell","witch","star"]],["spell","spell","sortil\\xE8ge",["magic"],["magic","wizard","witch","wand","potion"]],["ghost","ghost","fant\\xF4me",["story","holiday"],["halloween","scary","haunted_house","white","monster","night"]],["monster","monster","monstre",["story"],["scary","halloween","ghost","nightmare","tooth","dragon","alien","closet"]],["hero","hero","h\\xE9ros",["story","adventure"],["superhero","brave","adventure","cape","knight","story"]],["superhero","superhero","super-h\\xE9ros",["story","adventure"],["hero","cape","mask","fly","strong"]],["cape","cape","cape",["clothes","story"],["superhero","hero","wizard","fly","mask","costume"]],["robot","robot","robot",["tech","toy","science"],["computer","space","alien","toy","battery"]],["adventure","adventure","aventure",["adventure"],["explore","map","treasure","hero","jungle","pirate","camping"]],["map","map","carte",["adventure"],["treasure","pirate","island","adventure","explore"]],["story","story","histoire",["story","book"],["book","read","bedtime","fairy","hero","princess","dragon","write"]],["book","book","livre",["book","school"],["read","story","library","school","write","teacher"]],["school","school","\\xE9cole",["school"],["teacher","book","pencil","class","student","read","write","library","backpack","homework","friend"]],["teacher","teacher","ma\\xEEtresse",["school","job"],["school","class","student","book","read","write"]],["student","student","\\xE9l\\xE8ve",["school"],["school","teacher","class","homework","backpack"]],["class","class","classe",["school"],["school","teacher","student","desk"]],["pencil","pencil","crayon",["school","art"],["write","draw","paper","eraser","school","pen","color"]],["pen","pen","stylo",["school"],["write","pencil","paper","letter"]],["paper","paper","papier",["school","art"],["pencil","write","draw","book","letter","scissors"]],["eraser","eraser","gomme",["school"],["pencil","school","paper","pen","desk"]],["read","read","lire",["book","school"],["book","story","library","write","letter","school","word"]],["write","write","\\xE9crire",["book","school"],["pencil","pen","read","paper","letter","story","word"]],["library","library","biblioth\\xE8que",["book","school","city"],["book","read","quiet","story","school"]],["homework","homework","devoirs",["school"],["school","pencil","teacher","student","math"]],["backpack","backpack","cartable",["school","clothes"],["school","book","camping","hike","lunch"]],["math","math","maths",["school","science"],["number","count","school","homework","brain"]],["word","word","mot",["school","book"],["letter","read","write","book","story"]],["letter","letter","lettre",["school","book"],["write","read","word","alphabet"]],["family","family","famille",["family","home"],["mom","dad","baby","brother","sister","home","love","grandma","grandpa","christmas"]],["mom","mom","maman",["family"],["dad","family","baby","love","hug","home"]],["dad","dad","papa",["family"],["mom","family","baby","love","hug","home"]],["baby","baby","b\\xE9b\\xE9",["family"],["mom","dad","cry","small","family","cute"]],["brother","brother","fr\\xE8re",["family"],["sister","family","mom","dad","play"]],["sister","sister","s\\u0153ur",["family"],["brother","family","mom","dad","play"]],["grandma","grandma","mamie",["family"],["grandpa","family","cookie","hug","old"]],["grandpa","grandpa","papi",["family"],["grandma","family","story","old","beard"]],["home","home","maison",["home","family"],["family","door","window","kitchen","bed","roof","garden","key","cozy"]],["love","love","amour",["feeling","family"],["heart","hug","kiss","family","friend","mom","happy"]],["friend","friend","ami",["feeling","family"],["play","love","hug","share","school","team","happy","party"]],["hug","hug","c\\xE2lin",["feeling","family"],["love","mom","dad","friend","teddy_bear","warm","arm"]],["kiss","kiss","bisou",["feeling","family"],["love","hug","mom","heart"]],["heart","heart","c\\u0153ur",["body","feeling","shape"],["love","red","kiss","body","valentine","shape"]],["happy","happy","content",["feeling"],["smile","laugh","fun","party","sad","love"]],["sad","sad","triste",["feeling"],["cry","happy","rain","hurt"]],["scary","scary","effrayant",["feeling"],["monster","ghost","dark","halloween","spider","nightmare","shark","fear"]],["fear","fear","peur",["feeling"],["scary","dark","monster","brave","nightmare"]],["fun","fun","amusant",["feeling","game"],["play","game","party","happy","laugh","friend","park","toy"]],["smile","smile","sourire",["feeling","body"],["happy","laugh","tooth","face","mouth","sun"]],["laugh","laugh","rire",["feeling","sound"],["smile","happy","funny","clown","fun"]],["cry","cry","pleurer",["feeling"],["sad","baby","hurt","angry"]],["door","door","porte",["home"],["key","window","home","roof"]],["window","window","fen\\xEAtre",["home"],["door","glass","home","eye"]],["kitchen","kitchen","cuisine",["home","food"],["cook","oven","fridge","food","plate","spoon","home","table"]],["garden","garden","jardin",["home","plant","nature"],["flower","grass","tree","grow","seed","vegetable","bee","butterfly","rain","home"]],["candle","candle","bougie",["light","fire","celebration"],["cake","birthday","fire","light","wish","dark"]],["body","body","corps",["body"],["hand","foot","head","arm","leg","heart","eye"]],["hand","hand","main",["body"],["finger","arm","wave","glove","body","foot"]],["eye","eye","\\u0153il",["body"],["glasses","face","nose","cry"]],["tooth","tooth","dent",["body"],["smile","dentist","mouth","fairy"]],["foot","foot","pied",["body"],["shoe","sock","leg","walk","hand","run"]],["face","face","visage",["body"],["eye","nose","mouth","smile","head"]],["head","head","t\\xEAte",["body"],["hat","hair","face","brain","body"]],["fabric","fabric","tissu",["clothes"],["clothes","wool","soft","shirt","dress","scarf","mitten","glove","sock"]],["pair","pair","paire",["clothes"],["sock","shoe","glove","mitten","boots","eye","ear","glasses"]],["cap","cap","casquette",["clothes"],["hat","head","hair","sun","clothes"]],["clothes","clothes","v\\xEAtements",["clothes"],["shirt","dress","shoe","sock","hat","coat","pajamas","pants"]],["shoe","shoe","chaussure",["clothes"],["foot","sock","boots","walk","run"]],["sock","sock","chaussette",["clothes"],["shoe","foot","warm"]],["hat","hat","chapeau",["clothes"],["head","wizard","witch","sun","scarf","santa"]],["boots","boots","bottes",["clothes"],["rain","puddle","snow","shoe","mud"]],["coat","coat","manteau",["clothes","cold"],["winter","cold","warm","scarf","rain","jacket"]],["scarf","scarf","\\xE9charpe",["clothes","cold"],["winter","cold","warm","snowman","coat","mitten"]],["mitten","mitten","moufle",["clothes","cold"],["winter","snow","cold","hand","scarf"]],["pajamas","pajamas","pyjama",["clothes","night"],["sleep","bed","night","cozy"]],["dress","dress","robe",["clothes"],["princess","party","wedding"]],["food","food","nourriture",["food"],["eat","hungry","cook","lunch","dinner","kitchen","plate","fruit","vegetable"]],["pizza","pizza","pizza",["food"],["cheese","oven","tomato","party","dinner","food","bake","birthday","lunch"]],["apple","apple","pomme",["food","plant"],["tree","fruit","red","pie","juice","green","teacher"]],["banana","banana","banane",["food","plant"],["monkey","yellow","fruit","jungle","snack"]],["orange","orange","orange",["color","food"],["fruit","juice","color","pumpkin","carrot","fox","tiger"]],["fruit","fruit","fruit",["food","plant"],["apple","banana","orange","strawberry","grape","tree","juice"]],["strawberry","strawberry","fraise",["food","plant","sweet"],["red","fruit","cake","jam","summer"]],["grape","grape","raisin",["food","plant"],["fruit","purple","juice","green","snack"]],["lemon","lemon","citron",["food","plant"],["yellow","juice","fruit","lemonade","tea"]],["cake","cake","g\\xE2teau",["food","sweet","celebration"],["birthday","candle","party","chocolate","oven","sugar","dessert","bake","food","snack"]],["cookie","cookie","biscuit",["food","sweet"],["chocolate","milk","oven","bake","sugar","grandma","dessert","christmas"]],["ice_cream","ice cream","glace",["food","sweet","cold"],["summer","cold","chocolate","dessert","strawberry","beach"]],["chocolate","chocolate","chocolat",["food","sweet"],["cake","candy","cookie","easter","sweet","brown","ice_cream","hot_chocolate"]],["candy","candy","bonbon",["food","sweet"],["sweet","sugar","halloween","lollipop","chocolate","party"]],["lollipop","lollipop","sucette",["food","sweet"],["candy","sugar","sweet","party","pink"]],["sweet","sweet","friandise",["food","sweet"],["sugar","candy","cake","honey","chocolate","dessert"]],["sugar","sugar","sucre",["food","sweet"],["sweet","candy","cake","cookie","tea"]],["dessert","dessert","dessert",["food","sweet"],["cake","ice_cream","pie","cookie","dinner","sweet"]],["bread","bread","pain",["food"],["butter","sandwich","bakery","toast","jam","oven","cheese"]],["cheese","cheese","fromage",["food"],["mouse","pizza","milk","sandwich","cow","bread"]],["milk","milk","lait",["food","drink"],["cow","cookie","cereal","cat","white","glass","baby"]],["water","water","eau",["water","drink","nature"],["drink","river","ocean","rain","swim","glass","lake","wet","fish"]],["juice","juice","jus",["drink","food"],["orange","apple","glass","breakfast","fruit","drink"]],["tea","tea","th\\xE9",["drink","hot"],["cup","hot","sugar","milk","party","grandma"]],["hot_chocolate","hot chocolate","chocolat chaud",["drink","hot","sweet"],["chocolate","winter","cup","milk","warm","cozy"]],["drink","drink","boire",["drink"],["water","juice","milk","glass","cup"]],["soup","soup","soupe",["food","hot"],["spoon","hot","vegetable","winter","carrot"]],["egg","egg","\\u0153uf",["food","animal"],["chicken","nest","bird","breakfast","easter","dinosaur","shell","bake"]],["honey","honey","miel",["food","sweet"],["bee","bear","sweet","yellow","toast","flower"]],["carrot","carrot","carotte",["food","plant"],["rabbit","orange","vegetable","snowman","garden","soup"]],["vegetable","vegetable","l\\xE9gume",["food","plant"],["carrot","garden","tomato","salad","soup","farm","potato"]],["tomato","tomato","tomate",["food","plant"],["red","pizza","salad","vegetable","garden"]],["sandwich","sandwich","sandwich",["food"],["bread","cheese","lunch","picnic","butter"]],["picnic","picnic","pique-nique",["food","nature","adventure"],["park","sandwich","basket","ant","summer","blanket","grass","lunch","sun"]],["oven","oven","four",["home","food","hot"],["bake","cake","cookie","pizza","bread","kitchen","hot","cook","food"]],["cook","cook","cuisiner",["food","home"],["kitchen","oven","chef","food","bake","dinner","soup"]],["bake","bake","p\\xE2tisserie",["food","sweet"],["cake","cookie","oven","bread","pie"]],["party","party","f\\xEAte",["celebration"],["birthday","cake","balloon","dance","music","friend","gift","candy","fun","game","costume"]],["birthday","birthday","anniversaire",["celebration"],["cake","candle","party","gift","balloon","wish","friend"]],["gift","gift","cadeau",["celebration","holiday"],["birthday","christmas","surprise","party","box","santa"]],["balloon","balloon","ballon gonflable",["celebration","toy"],["party","birthday","fly","red"]],["surprise","surprise","surprise",["celebration","feeling"],["gift","party","birthday","box","happy"]],["wish","wish","v\\u0153u",["magic","feeling"],["star","birthday","candle","dream","fairy"]],["christmas","christmas","no\\xEBl",["holiday","celebration","cold"],["santa","gift","tree","snow","winter","reindeer","star","elf","candle","light"]],["santa","santa","p\\xE8re no\\xEBl",["holiday","story"],["christmas","gift","reindeer","sleigh","elf","beard","red","chimney"]],["reindeer","reindeer","renne",["animal","holiday","cold"],["santa","christmas","snow","sleigh","elf","winter"]],["halloween","halloween","halloween",["holiday","celebration","night"],["ghost","pumpkin","witch","costume","candy","scary","spider","bat","monster","autumn","night"]],["pumpkin","pumpkin","citrouille",["holiday","food","plant"],["halloween","orange","autumn","pie","witch","farm","candle"]],["costume","costume","d\\xE9guisement",["clothes","celebration"],["halloween","party","mask","cape","pirate","princess"]],["easter","easter","p\\xE2ques",["holiday","celebration","season"],["egg","rabbit","chocolate","spring","basket"]],["holiday","holiday","vacances",["holiday","time"],["beach","summer","travel","camping","fun"]],["summer","summer","\\xE9t\\xE9",["season","hot"],["sun","beach","hot","holiday","swim","ice_cream","pool","camping","sunflower"]],["winter","winter","hiver",["season","cold"],["snow","cold","ice","christmas","scarf","sled","coat","snowman","ski"]],["spring","spring","printemps",["season","nature"],["flower","rain","grow","garden","butterfly","easter","bird","green"]],["autumn","autumn","automne",["season","nature"],["leaf","orange","wind","pumpkin","halloween","school","rain","brown"]],["season","season","saison",["season","time"],["summer","winter","spring","autumn","year","weather"]],["time","time","temps",["time"],["clock","day","year","night","season"]],["clock","clock","horloge",["time"],["time","morning","day","year"]],["beach","beach","plage",["ocean","holiday","hot"],["sand","sea","ocean","wave","sun","summer","shell","swim","sandcastle","crab","towel"]],["ocean","ocean","oc\\xE9an",["ocean","water"],["sea","wave","fish","whale","shark","boat","beach","dolphin","blue","island"]],["sea","sea","mer",["ocean","water"],["ocean","wave","beach","fish","boat","shell","sand","blue"]],["wave","wave","vague",["ocean","water"],["sea","ocean","surf","beach","puddle"]],["sand","sand","sable",["ocean","nature"],["beach","sandcastle","desert","shell","bucket"]],["sandcastle","sandcastle","ch\\xE2teau de sable",["ocean","toy"],["sand","beach","bucket","castle"]],["shell","shell","coquillage",["ocean","nature"],["beach","sea","sand","snail","turtle","crab"]],["boat","boat","bateau",["transport","water"],["sea","ocean","river","fish","pirate","island","ship"]],["ship","ship","navire",["transport","ocean"],["boat","pirate","sea","captain","ocean"]],["island","island","\\xEEle",["ocean","nature","adventure"],["sea","ocean","treasure","pirate","beach","palm_tree","boat"]],["swim","swim","nager",["water","sport"],["pool","water","fish","sea","beach","summer","dolphin","duck"]],["pool","pool","piscine",["water","sport"],["swim","summer","puddle","water","dive"]],["music","music","musique",["music","sound"],["song","dance","sing","guitar","piano","drum","party","radio","band"]],["song","song","chanson",["music"],["sing","music","dance","radio","band","birthday","party"]],["sing","sing","chanter",["music","sound"],["song","music","bird","band","party"]],["dance","dance","danse",["music","celebration"],["music","party","song","jump"]],["drum","drum","tambour",["music","sound"],["music","band","loud","guitar","concert"]],["guitar","guitar","guitare",["music"],["music","song","band","rock","drum","sing"]],["piano","piano","piano",["music"],["music","song","black","white"]],["band","band","groupe",["music"],["music","drum","guitar","sing","concert","party","dance"]],["art","art","art",["art"],["paint","draw","color","museum","picture","artist","pencil"]],["paint","paint","peinture",["art","color"],["art","color","picture","draw","rainbow"]],["draw","draw","dessiner",["art"],["pencil","paper","art","picture","paint"]],["picture","picture","image",["art"],["draw","paint","photo","art"]],["color","color","couleur",["color","art"],["red","blue","green","yellow","rainbow","paint","pencil","purple"]],["red","red","rouge",["color"],["color","apple","fire","heart","strawberry","blue","rainbow","tomato"]],["blue","blue","bleu",["color"],["sky","sea","ocean","color","red","water"]],["green","green","vert",["color","nature"],["grass","leaf","tree","frog","color","nature"]],["yellow","yellow","jaune",["color"],["sun","banana","lemon","color","bee"]],["purple","purple","violet",["color"],["grape","color","rainbow","pink","unicorn","flower"]],["pink","pink","rose",["color"],["pig","color","princess","flower","purple","candy"]],["white","white","blanc",["color"],["snow","cloud","milk","black","sheep"]],["black","black","noir",["color"],["white","dark","night","bat","panda","zebra"]],["brown","brown","marron",["color"],["chocolate","bear","autumn","tree","mud"]],["game","game","jeu",["game"],["play","win","toy","fun","team","puzzle","ball","board_game","video_game"]],["play","play","jouer",["game","toy"],["game","toy","friend","fun","park","ball"]],["toy","toy","jouet",["toy"],["play","game","teddy_bear","doll","ball","puzzle","robot"]],["ball","ball","ballon",["sport","toy"],["soccer","throw","catch","play","basketball","round","dog"]],["soccer","soccer","foot",["sport"],["ball","goal","team","win","field","player"]],["team","team","\\xE9quipe",["sport","game"],["soccer","win","player","friend","basketball"]],["win","win","gagner",["sport","game"],["game","team","trophy","race","medal"]],["puzzle","puzzle","puzzle",["game","toy"],["game","toy","brain","board_game","blocks"]],["doll","doll","poup\\xE9e",["toy"],["toy","play","dress","teddy_bear","princess"]],["kite","kite","cerf-volant",["toy","sky"],["wind","fly","sky","beach","park","field"]],["park","park","parc",["city","nature"],["swing","slide","play","tree","grass","picnic","dog"]],["zoo","zoo","zoo",["animal","city"],["animal","lion","elephant","monkey","giraffe","tiger","penguin","zebra"]],["circus","circus","cirque",["celebration","adventure"],["clown","tent","elephant","lion","show"]],["clown","clown","clown",["celebration","job"],["circus","funny","nose","laugh","balloon"]],["computer","computer","ordinateur",["tech"],["screen","mouse","game","robot","tablet"]],["phone","phone","t\\xE9l\\xE9phone",["tech"],["screen","photo","computer","parrot","tablet"]],["car","car","voiture",["transport","city"],["road","wheel","bus","truck","race"]],["train","train","train",["transport"],["station","bus","travel","fast"]],["plane","plane","avion",["transport","sky"],["fly","sky","pilot","airport","wing","cloud","travel"]],["bike","bike","v\\xE9lo",["transport","sport"],["ride","wheel","helmet","park","car"]],["bus","bus","bus",["transport","city"],["school","car","train","road"]],["doctor","doctor","docteur",["job","body"],["nurse","hospital","sick","medicine","vet","dentist"]],["firefighter","firefighter","pompier",["job","fire"],["fire","truck","brave","help","police"]],["police","police","police",["job","city"],["car","help","firefighter","ambulance","city"]],["farm","farm","ferme",["farm","animal"],["cow","pig","horse","sheep","chicken","barn","tractor","farmer","hay"]],["tree","tree","arbre",["nature","plant"],["leaf","forest","bird","apple","branch","wood","nest","climb","green"]],["flower","flower","fleur",["nature","plant"],["garden","bee","butterfly","spring","rain","grow","seed","sunflower"]],["sunflower","sunflower","tournesol",["plant","nature"],["sun","flower","yellow","seed","summer","garden"]],["grass","grass","herbe",["nature","plant"],["green","garden","cow","park","field"]],["leaf","leaf","feuille",["nature","plant"],["tree","green","autumn","wind","branch","caterpillar"]],["seed","seed","graine",["plant","nature"],["grow","flower","garden","plant","bird","sunflower"]],["grow","grow","pousser",["plant","nature"],["seed","plant","garden","flower","rain","tree"]],["plant","plant","plante",["plant","nature"],["seed","grow","flower","garden","leaf","water","green"]],["forest","forest","for\\xEAt",["nature"],["tree","wolf","bear","owl","fox","leaf","camping","mushroom"]],["mountain","mountain","montagne",["nature","adventure"],["snow","climb","hike","ski","rock","volcano"]],["river","river","rivi\\xE8re",["nature","water"],["water","fish","boat","bridge","lake","frog","swim"]],["lake","lake","lac",["nature","water"],["water","river","boat","fish","duck","pond","swim"]],["pond","pond","\\xE9tang",["nature","water"],["frog","duck","fish","lake","water"]],["fire","fire","feu",["fire","hot"],["hot","dragon","firefighter","camping","candle","wood","red"]],["ice","ice","gla\\xE7on",["cold","water"],["cold","snow","winter","skate","penguin","water"]],["hot","hot","chaud",["hot"],["sun","fire","summer","cold","warm","soup","desert","oven"]],["cold","cold","froid",["cold"],["ice","snow","winter","hot","penguin","scarf"]],["warm","warm","ti\\xE8de",["hot","feeling"],["hot","blanket","sun","cozy","coat","hug"]],["cozy","cozy","douillet",["home","feeling"],["blanket","warm","bed","home","hot_chocolate","pajamas"]],["jungle","jungle","jungle",["nature","animal","adventure"],["monkey","tiger","snake","parrot","tree","adventure","lion"]],["desert","desert","d\\xE9sert",["nature","hot"],["sand","hot","camel","cactus","sun","snake"]],["volcano","volcano","volcan",["nature","fire","science"],["lava","fire","mountain","hot","dinosaur","island"]],["nest","nest","nid",["animal","nature"],["bird","egg","tree","feather","branch"]],["wing","wing","aile",["animal","body"],["bird","fly","feather","butterfly","plane","angel","fairy","dragon"]],["feather","feather","plume",["animal"],["bird","wing","pillow","soft","chicken","owl"]],["fly","fly","voler",["sky"],["bird","wing","plane","sky","kite","rocket","superhero"]],["bone","bone","os",["body","animal"],["dog","skeleton","dinosaur","fossil","halloween","body"]],["camping","camping","camping",["nature","adventure"],["tent","fire","forest","marshmallow","sleeping_bag","hike","star"]],["tent","tent","tente",["adventure","nature"],["camping","circus","sleeping_bag","forest","hike"]],["soft","soft","doux",["feeling"],["pillow","blanket","fur","teddy_bear","feather","cloud","kitten","cozy"]],["cute","cute","mignon",["feeling","animal"],["puppy","kitten","baby","panda","rabbit","hamster","teddy_bear"]],["big","big","grand",["shape"],["elephant","whale","giant","small","dinosaur","bear","mountain"]],["small","small","petit",["shape"],["ant","mouse","baby","big","seed","ladybug","hamster"]],["fast","fast","rapide",["sport","transport"],["race","car","run","rocket","cheetah","slow","train"]],["slow","slow","lent",["animal"],["snail","turtle","fast","walk","sleep"]],["loud","loud","bruyant",["sound"],["drum","thunder","roar","quiet","music"]],["quiet","quiet","calme",["sound","feeling"],["library","sleep","loud","mouse","night"]],["bright","bright","brillant",["light"],["sun","light","star","lightning","shine","sparkle"]],["wet","wet","mouill\\xE9",["water"],["rain","water","puddle","swim","towel"]],["wild","wild","sauvage",["animal","nature"],["lion","tiger","wolf","jungle","forest","animal"]],["funny","funny","dr\\xF4le",["feeling"],["laugh","clown","monkey","smile"]],["brave","brave","courageux",["feeling","adventure"],["knight","hero","firefighter","fear","lion","superhero"]],["strong","strong","fort",["body","sport"],["superhero","lion","bear","elephant","brave"]],["old","old","vieux",["time"],["grandma","grandpa","castle","dinosaur","fossil","new"]],["new","new","nouveau",["time"],["old","gift","baby","year","birthday","toy"]],["round","round","rond",["shape"],["ball","circle","moon","planet","wheel","earth","orange"]],["tired","tired","fatigu\\xE9",["feeling","night"],["sleep","bed","night","pillow","bedtime"]],["angry","angry","en col\\xE8re",["feeling"],["sad","red","happy","storm"]],["hungry","hungry","faim",["food","feeling"],["food","eat","lunch","dinner","breakfast","snack"]],["jump","jump","sauter",["sport","game"],["frog","kangaroo","rabbit","puddle","trampoline","dance"]],["run","run","courir",["sport"],["race","fast","shoe","foot","soccer","walk"]],["walk","walk","marcher",["sport"],["foot","dog","park","hike","shoe","run"]],["climb","climb","grimper",["sport","adventure"],["tree","mountain","monkey","rock"]],["ride","ride","balade",["transport"],["horse","bike","pony","car","train","skateboard"]],["eat","eat","manger",["food"],["food","hungry","lunch","dinner","plate","spoon","fork"]],["help","help","aider",["feeling","job"],["friend","firefighter","doctor","police","share","nurse"]],["share","share","partager",["feeling"],["friend","toy","help","cookie","love"]],["hide","hide","cacher",["game"],["hide_and_seek","closet","cave","game","play","dark"]],["hide_and_seek","hide-and-seek","cache-cache",["game"],["hide","game","play","count","friend"]],["explore","explore","explorer",["adventure"],["adventure","map","jungle","cave","space","treasure"]],["travel","travel","voyage",["transport","adventure","holiday"],["plane","train","holiday","suitcase","map","car","boat"]],["hike","hike","randonn\\xE9e",["sport","nature","adventure"],["mountain","forest","walk","backpack","camping","boots"]],["ski","ski","ski",["sport","cold"],["snow","mountain","winter","sled","cold"]],["sled","sled","luge",["sport","cold"],["snow","winter","hill","ski","snowman"]],["skate","skate","patin",["sport","cold"],["ice","winter","skateboard","cold","snow"]],["race","race","course",["sport"],["run","fast","car","win","medal","bike"]],["dive","dive","plonger",["water","sport"],["pool","swim","ocean","dolphin","submarine"]],["surf","surf","surf",["sport","ocean"],["wave","beach","sea","summer","ocean"]],["roar","roar","rugir",["sound","animal"],["lion","tiger","dinosaur","dragon","loud","bear"]],["shine","shine","briller",["light"],["sun","star","light","bright","sparkle","gold"]],["sparkle","sparkle","paillettes",["light","magic"],["magic","unicorn","fairy","star","shine","jewel"]],["count","count","compter",["school"],["number","math","hide_and_seek","finger","school"]],["throw","throw","lancer",["sport"],["ball","catch","basketball","rock"]],["catch","catch","attraper",["sport","game"],["ball","throw","fish","play","game"]],["city","city","ville",["city"],["car","bus","park","shop","museum"]],["road","road","route",["city","transport"],["car","bus","truck","bike","bridge"]],["bridge","bridge","pont",["city","water"],["river","road","train","car","water"]],["shop","shop","magasin",["city"],["money","toy","city","bakery"]],["money","money","argent",["city"],["shop","gold","treasure","bakery","pirate","baker"]],["bakery","bakery","boulangerie",["food","city"],["bread","cake","baker","croissant","shop","oven"]],["baker","baker","boulanger",["job","food"],["bakery","bread","cake","oven","bake","croissant"]],["croissant","croissant","croissant",["food"],["bakery","breakfast","butter","bread","baker"]],["restaurant","restaurant","restaurant",["food","city"],["chef","food","dinner","pizza","burger"]],["museum","museum","mus\\xE9e",["city","art","science"],["dinosaur","art","painting","fossil"]],["hospital","hospital","h\\xF4pital",["city","job","body"],["doctor","nurse","sick","ambulance","medicine"]],["airport","airport","a\\xE9roport",["transport","city"],["plane","pilot","suitcase","travel","helicopter"]],["station","station","gare",["transport","city"],["train","travel","bus","city","suitcase"]],["playground","playground","aire de jeux",["game","city"],["swing","slide","park","play","school"]],["swing","swing","balan\\xE7oire",["game","toy"],["playground","park","slide","play","tree"]],["slide","slide","toboggan",["game","toy"],["playground","park","swing","play","pool"]],["cave","cave","grotte",["nature","adventure"],["bat","bear","dragon","dark","rock","explore"]],["hill","hill","colline",["nature"],["mountain","sled","grass","climb","field"]],["rock","rock","rocher",["nature"],["stone","mountain","cave","climb","volcano"]],["stone","stone","caillou",["nature"],["rock","river","throw","beach","castle"]],["field","field","champ",["farm","nature"],["farm","grass","tractor","flower","cow","soccer"]],["world","world","monde",["nature","space"],["earth","map","travel","planet","nature"]],["bedroom","bedroom","chambre",["home","night"],["bed","toy","sleep","closet","pillow"]],["bath","bath","bain",["home","water"],["bubble","soap","towel","duck","water","clean"]],["bubble","bubble","bulle",["water","toy"],["bath","soap","water","balloon","swim","fish"]],["soap","soap","savon",["home","water"],["bath","bubble","clean","hand","towel"]],["clean","clean","propre",["home"],["soap","bath","broom","dirty","towel","toothbrush"]],["dirty","dirty","sale",["home"],["mud","clean","pig","sock","clothes"]],["towel","towel","serviette",["home","ocean"],["bath","beach","wet","swim","soap"]],["toothbrush","toothbrush","brosse \\xE0 dents",["home","body"],["tooth","smile","dentist","bath","morning"]],["key","key","cl\\xE9",["home"],["door","home","car","treasure","castle","closet"]],["roof","roof","toit",["home"],["home","rain","chimney","cat"]],["chimney","chimney","chemin\\xE9e",["home","fire"],["santa","fire","roof","christmas","home","wood"]],["table","table","table",["home"],["chair","plate","dinner","kitchen","eat"]],["chair","chair","chaise",["home","school"],["table","desk","sofa","kitchen","class"]],["sofa","sofa","canap\\xE9",["home"],["tv","cozy","pillow","chair","blanket"]],["tv","tv","t\\xE9l\\xE9",["tech","home"],["cartoon","movie","sofa","screen","weather"]],["lamp","lamp","lampe",["light","home"],["light","bright","dark","bed","flashlight"]],["flashlight","flashlight","lampe torche",["light","adventure"],["dark","light","camping","battery","night","cave"]],["fridge","fridge","frigo",["home","cold","food"],["kitchen","cold","milk","ice","food"]],["plate","plate","assiette",["food","home"],["fork","spoon","food","table","dinner"]],["spoon","spoon","cuill\\xE8re",["food","home"],["fork","soup","plate","eat"]],["fork","fork","fourchette",["food","home"],["spoon","plate","eat","table","dinner","pasta","kitchen"]],["cup","cup","tasse",["drink","home"],["tea","hot_chocolate","drink","coffee","glass"]],["glass","glass","verre",["drink","home"],["water","milk","juice","drink","window","cup"]],["box","box","bo\\xEEte",["home"],["gift","toy","surprise","suitcase","blocks"]],["suitcase","suitcase","valise",["transport","holiday"],["travel","holiday","plane","airport","clothes"]],["basket","basket","panier",["food"],["picnic","easter","egg","fruit","shop"]],["closet","closet","placard",["home","clothes"],["clothes","bedroom","hide","monster","door"]],["broom","broom","balai",["home","magic"],["witch","clean","fly","halloween","home","kitchen"]],["scissors","scissors","ciseaux",["school","art"],["paper","hair","art","school","draw"]],["desk","desk","bureau",["school","home"],["chair","school","pencil","class","computer"]],["number","number","nombre",["school"],["math","count","clock","phone","year"]],["alphabet","alphabet","alphabet",["school","book"],["letter","word","read","school","song"]],["arm","arm","bras",["body"],["hand","hug","leg","body"]],["leg","leg","jambe",["body"],["foot","arm","run","walk","body"]],["finger","finger","doigt",["body"],["hand","count","ring","glove","paint","foot"]],["mouth","mouth","bouche",["body"],["tooth","smile","kiss","eat","face"]],["nose","nose","nez",["body"],["face","clown","eye","mouth","elephant"]],["ear","ear","oreille",["body","sound"],["rabbit","music","head","elephant","face"]],["hair","hair","cheveux",["body"],["head","beard","face","hat"]],["beard","beard","barbe",["body"],["santa","grandpa","wizard","hair","face"]],["brain","brain","cerveau",["body","science","school"],["head","puzzle","science","school"]],["hurt","hurt","bobo",["body","feeling"],["cry","doctor","sick","nurse"]],["sick","sick","malade",["body"],["doctor","medicine","hospital","nurse","bed"]],["medicine","medicine","m\\xE9dicament",["body","job"],["doctor","sick","nurse","hospital","vet"]],["skeleton","skeleton","squelette",["body","holiday"],["bone","halloween","scary","doctor"]],["glasses","glasses","lunettes",["body","clothes"],["eye","read","grandpa","sun","face","teacher"]],["shirt","shirt","chemise",["clothes"],["clothes","pants","dress","sweater","jacket"]],["pants","pants","pantalon",["clothes"],["shirt","clothes","leg","jacket","sock","shoe"]],["jacket","jacket","veste",["clothes"],["coat","rain","clothes","winter"]],["glove","glove","gant",["clothes","cold"],["hand","mitten","winter","finger","snow"]],["helmet","helmet","casque",["clothes","sport"],["bike","astronaut","knight","firefighter","head"]],["mask","mask","masque",["clothes","celebration"],["superhero","costume","halloween","face","party"]],["swimsuit","swimsuit","maillot de bain",["clothes","water"],["swim","pool","beach","summer","towel"]],["breakfast","breakfast","petit d\\xE9jeuner",["food","time"],["morning","cereal","egg","toast","juice","milk","pancake","croissant"]],["lunch","lunch","d\\xE9jeuner",["food","time"],["sandwich","school","food","picnic","eat"]],["dinner","dinner","d\\xEEner",["food","time"],["food","family","table","plate","cook","night","soup"]],["snack","snack","go\\xFBter",["food"],["cookie","apple","hungry"]],["pie","pie","tarte",["food","sweet"],["apple","oven","pumpkin","bake","dessert","cherry"]],["pancake","pancake","cr\\xEApe",["food","sweet"],["breakfast","sugar","butter","jam","honey","bake"]],["jam","jam","confiture",["food","sweet"],["strawberry","bread","toast","pancake","sweet"]],["toast","toast","tartine",["food"],["bread","butter","jam","breakfast","honey"]],["butter","butter","beurre",["food"],["bread","toast","croissant","milk","pancake"]],["cereal","cereal","c\\xE9r\\xE9ales",["food"],["breakfast","milk","spoon","morning","corn"]],["salad","salad","salade",["food","plant"],["vegetable","tomato","green","lunch","plate","dinner"]],["potato","potato","pomme de terre",["food","plant"],["fries","vegetable","farm","soup","dinner","oven"]],["fries","fries","frites",["food"],["potato","burger","restaurant","lunch","snack"]],["burger","burger","hamburger",["food"],["fries","cheese","bread","dinner"]],["pasta","pasta","p\\xE2tes",["food"],["cheese","tomato","dinner","spoon","pizza"]],["cherry","cherry","cerise",["food","plant","sweet"],["red","fruit","pie","tree","cake"]],["pear","pear","poire",["food","plant"],["fruit","tree","green","apple","juice","pie"]],["watermelon","watermelon","past\\xE8que",["food","plant"],["summer","fruit","green","red","picnic","seed"]],["pineapple","pineapple","ananas",["food","plant"],["fruit","yellow","juice","island","pizza"]],["corn","corn","ma\\xEFs",["food","plant","farm"],["popcorn","farm","yellow","field","vegetable"]],["popcorn","popcorn","pop-corn",["food"],["corn","movie","snack","cartoon","party"]],["marshmallow","marshmallow","guimauve",["food","sweet"],["camping","fire","hot_chocolate","soft","candy"]],["lemonade","lemonade","limonade",["drink","sweet"],["lemon","summer","drink","glass","sugar"]],["coffee","coffee","caf\\xE9",["drink","hot"],["cup","morning","milk","hot","tea"]],["chef","chef","chef cuisinier",["job","food"],["cook","kitchen","restaurant","hat","food"]],["donut","donut","beignet",["food","sweet"],["sugar","sweet","bakery","round","breakfast"]],["kangaroo","kangaroo","kangourou",["animal"],["jump","zoo","baby","animal","run"]],["cheetah","cheetah","gu\\xE9pard",["animal"],["fast","run","lion","jungle","zoo"]],["squirrel","squirrel","\\xE9cureuil",["animal","nature"],["tree","forest","tail","autumn","jump","climb"]],["camel","camel","chameau",["animal","hot"],["desert","sand","hot","zoo","animal","palm_tree"]],["crocodile","crocodile","crocodile",["animal","water"],["river","tooth","jungle","green","zoo"]],["wool","wool","laine",["animal","clothes"],["sheep","scarf","sweater","soft","mitten","blanket"]],["sweater","sweater","pull",["clothes","cold"],["wool","winter","warm","coat","christmas"]],["goat","goat","ch\\xE8vre",["animal","farm"],["farm","cheese","mountain","milk","animal","grass"]],["hay","hay","foin",["farm"],["horse","cow","barn","farm","field","pony"]],["barn","barn","grange",["farm"],["farm","hay","cow","horse","tractor"]],["tractor","tractor","tracteur",["farm","transport"],["farm","farmer","field","barn","truck","wheel"]],["farmer","farmer","fermier",["job","farm"],["farm","tractor","cow","field","barn"]],["vet","vet","v\\xE9t\\xE9rinaire",["job","animal"],["pet","dog","cat","doctor","animal"]],["aquarium","aquarium","aquarium",["water","pet"],["fish","water","glass","octopus","shark"]],["jellyfish","jellyfish","m\\xE9duse",["animal","ocean"],["sea","ocean","beach","octopus","swim","fish"]],["polar_bear","polar bear","ours polaire",["animal","cold"],["bear","ice","snow","cold","penguin","ocean"]],["eagle","eagle","aigle",["animal","sky"],["bird","fly","mountain","wing","feather"]],["mud","mud","boue",["nature","water"],["pig","puddle","rain","dirty","boots"]],["mermaid","mermaid","sir\\xE8ne",["magic","ocean","story"],["sea","ocean","fish","tail","shell","princess","island"]],["starfish","starfish","\\xE9toile de mer",["animal","ocean"],["star","beach","sea","shell","sand"]],["submarine","submarine","sous-marin",["transport","ocean"],["ocean","sea","dive","fish","whale"]],["captain","captain","capitaine",["ocean","job"],["ship","pirate","boat","sea","team"]],["palm_tree","palm tree","palmier",["plant","hot"],["island","beach","summer","sand","tree","hot"]],["bucket","bucket","seau",["toy","ocean"],["sand","beach","water","sandcastle","swim"]],["sword","sword","\\xE9p\\xE9e",["story","adventure"],["knight","pirate","shield","dragon","castle","treasure"]],["shield","shield","bouclier",["story","adventure"],["knight","sword","castle","hero","prince"]],["tower","tower","tour",["story","city"],["castle","princess","dragon"]],["gold","gold","or",["color","adventure"],["treasure","money","crown","pirate","yellow","jewel","shine"]],["jewel","jewel","bijou",["adventure"],["crown","treasure","gold","princess","ring"]],["ring","ring","bague",["clothes"],["jewel","finger","gold","wedding","princess","queen"]],["potion","potion","potion",["magic"],["witch","wizard","magic","cauldron","spell"]],["cauldron","cauldron","chaudron",["magic"],["witch","potion","halloween","magic","wizard","soup"]],["vampire","vampire","vampire",["story","holiday","night"],["bat","halloween","night","castle","scary"]],["haunted_house","haunted house","maison hant\\xE9e",["story","holiday"],["ghost","halloween","scary","skeleton","night"]],["angel","angel","ange",["story","magic"],["wing","christmas","cloud","fairy","sky"]],["giant","giant","g\\xE9ant",["story","magic"],["big","castle","tower","fairy_tale","dinosaur","whale"]],["elf","elf","lutin",["magic","holiday"],["santa","christmas","toy","fairy","small"]],["sleigh","sleigh","tra\\xEEneau",["holiday","cold","transport"],["santa","reindeer","snow","christmas","sled"]],["fairy_tale","fairy tale","conte",["story","book","magic"],["story","fairy","princess","book","wolf","castle"]],["bedtime","bedtime","dodo",["night","home"],["bed","sleep","story","pajamas","night","teddy_bear"]],["valentine","valentine","saint-valentin",["holiday","feeling"],["heart","love","red","flower","kiss"]],["wedding","wedding","mariage",["celebration","family"],["dress","ring","cake","love","flower","dance"]],["fireworks","fireworks","feu d\'artifice",["celebration","light","night"],["sky","night","party","color","holiday","bright"]],["year","year","ann\\xE9e",["time"],["birthday","season","time"]],["snowball","snowball","boule de neige",["cold","game","season"],["snow","throw","winter","snowman","cold","ice"]],["violin","violin","violon",["music"],["music","song","piano","concert","band","stage"]],["trumpet","trumpet","trompette",["music","sound"],["music","band","loud","concert","sing","song"]],["flute","flute","fl\\xFBte",["music"],["music","song","band","bird","piano","concert"]],["concert","concert","concert",["music","celebration"],["music","band","sing","stage","guitar"]],["stage","stage","sc\\xE8ne",["music","art"],["concert","show","dance","sing","band","music"]],["show","show","spectacle",["art","celebration"],["stage","circus","clown","dance","magic"]],["radio","radio","radio",["music","tech","sound"],["music","song","car","tv","dance"]],["movie","movie","film",["art","story"],["popcorn","tv","story","cartoon","show","stage"]],["cartoon","cartoon","dessin anim\\xE9",["art","story"],["tv","movie","funny","draw"]],["artist","artist","artiste",["art","job"],["paint","draw","art","museum","painting"]],["painting","painting","tableau",["art"],["paint","artist","museum","picture","color","draw"]],["photo","photo","photo",["art","tech"],["picture","smile","family","art","birthday"]],["shape","shape","forme",["shape"],["circle","square","triangle","star","heart"]],["circle","circle","cercle",["shape"],["round","ball","wheel","square","sun"]],["square","square","carr\\xE9",["shape"],["circle","triangle","box","window"]],["triangle","triangle","triangle",["shape","music"],["square","circle","pizza","mountain"]],["board_game","board game","jeu de soci\\xE9t\\xE9",["game","family"],["game","family","win","toy","play"]],["video_game","video game","jeu vid\\xE9o",["game","tech"],["game","computer","tv","screen","win","tablet"]],["blocks","blocks","cubes",["toy"],["toy","build","tower","square","play"]],["build","build","construire",["toy","job"],["blocks","home","tower","sandcastle","builder"]],["builder","builder","ma\\xE7on",["job"],["build","home","helmet","truck","blocks"]],["skateboard","skateboard","skate",["sport","toy"],["skate","wheel","ride","park","helmet"]],["trampoline","trampoline","trampoline",["sport","toy"],["jump","garden","fun","play","sport","playground"]],["basketball","basketball","basket",["sport"],["ball","team","throw","shoe","player"]],["tennis","tennis","tennis",["sport"],["ball","player","win","team","run"]],["player","player","joueur",["sport","game"],["team","game","soccer","basketball","win"]],["goal","goal","but",["sport"],["soccer","ball","win","team","player","basketball"]],["trophy","trophy","troph\\xE9e",["sport"],["win","gold","medal","team","sport"]],["medal","medal","m\\xE9daille",["sport"],["win","gold","race","trophy","sport","team"]],["sport","sport","sport",["sport"],["soccer","basketball","tennis","run","swim","team","ball"]],["screen","screen","\\xE9cran",["tech"],["computer","tv","phone","tablet","video_game"]],["tablet","tablet","tablette",["tech"],["screen","computer","phone","video_game","game"]],["battery","battery","pile",["tech","science"],["robot","flashlight","electricity","toy","phone","tablet"]],["electricity","electricity","\\xE9lectricit\\xE9",["tech","science"],["lightning","battery","lamp","light","computer","tv"]],["science","science","science",["science","school"],["scientist","planet","dinosaur","volcano","space"]],["scientist","scientist","scientifique",["science","job"],["science","robot","space","doctor","fossil","brain"]],["fossil","fossil","fossile",["science","nature"],["dinosaur","bone","museum","rock"]],["lava","lava","lave",["fire","nature","hot"],["volcano","fire","hot","red","rock"]],["truck","truck","camion",["transport"],["car","road","firefighter","build"]],["wheel","wheel","roue",["transport","shape"],["car","bike","bus","round","circle"]],["helicopter","helicopter","h\\xE9licopt\\xE8re",["transport","sky"],["fly","plane","pilot","sky"]],["pilot","pilot","pilote",["job","transport","sky"],["plane","helicopter","fly","airport","sky","astronaut"]],["ambulance","ambulance","ambulance",["transport","job"],["hospital","doctor","nurse","sick"]],["nurse","nurse","infirmi\\xE8re",["job","body"],["doctor","hospital","sick","medicine"]],["dentist","dentist","dentiste",["job","body"],["tooth","doctor","smile","toothbrush","nurse","mouth"]],["wood","wood","bois",["nature","fire"],["tree","fire","forest","branch","camping"]],["branch","branch","branche",["nature","plant"],["tree","leaf","bird","nest","wood"]],["sleeping_bag","sleeping bag","sac de couchage",["adventure","night"],["camping","tent","sleep","night","blanket","pillow"]],["nature","nature","nature",["nature"],["tree","forest","flower","animal","river","mountain"]],["mushroom","mushroom","champignon",["nature","plant","food"],["forest","autumn","rain","fairy","garden","snail"]],["cactus","cactus","cactus",["plant","hot"],["desert","hot","green","sand","plant","flower"]],["waterfall","waterfall","cascade",["water","nature"],["river","water","mountain","rock","jungle"]],["sunset","sunset","coucher de soleil",["sky","time","color"],["sun","sky","evening","orange","beach","night"]],["evening","evening","soir",["time","night"],["night","dinner","sunset","bedtime","moon"]],["grey","grey","gris",["color"],["cloud","elephant","rock","mouse","color","storm"]],["weather","weather","m\\xE9t\\xE9o",["weather"],["rain","sun","snow","cloud","wind","storm"]],["bow","bow","arc",["sport","adventure"],["rainbow","arrow","gift","violin","knight","hero"]],["arrow","arrow","fl\\xE8che",["sport","adventure"],["bow","knight","map","heart","hero","fast"]],["worm","worm","ver",["animal","nature"],["earth","garden","bird","apple","mud","book","rain","fish"]],["cream","cream","cr\\xE8me",["food","sweet"],["ice_cream","cake","milk","strawberry","dessert","coffee","butter"]],["peanut","peanut","cacahu\\xE8te",["food"],["butter","elephant","sandwich","jam","snack"]],["goldfish","goldfish","poisson rouge",["animal","pet","water"],["fish","gold","pet","aquarium","orange","bowl","water"]],["dragonfly","dragonfly","libellule",["animal","nature"],["dragon","fly","insect","pond","wing","butterfly"]],["firefly","firefly","luciole",["animal","night","light"],["fire","fly","night","light","insect","summer"]],["seahorse","seahorse","hippocampe",["animal","ocean"],["sea","horse","ocean","fish","starfish","mermaid"]],["lighthouse","lighthouse","phare",["ocean","light"],["light","sea","boat","island","tower","night"]],["teapot","teapot","th\\xE9i\\xE8re",["home","drink"],["tea","cup","kitchen","hot","pot"]],["toothpaste","toothpaste","dentifrice",["home","body"],["tooth","toothbrush","dentist","clean","mouth"]],["cupcake","cupcake","cupcake",["food","sweet"],["cup","cake","birthday","candle","party","chocolate","bake"]],["notebook","notebook","cahier",["school"],["school","pencil","paper","write","book","homework","pen"]],["sailboat","sailboat","voilier",["ocean","transport"],["boat","wind","sea","ocean","lake","ship","captain"]],["raincoat","raincoat","imperm\\xE9able",["clothes","weather"],["rain","coat","umbrella","boots","wet","puddle"]],["moonlight","moonlight","clair de lune",["night","light"],["moon","light","night","owl","wolf","dream"]],["sandbox","sandbox","bac \\xE0 sable",["toy","game"],["sand","box","playground","bucket","park","play"]],["beehive","beehive","ruche",["animal","nature"],["bee","honey","tree","garden","insect"]],["doghouse","doghouse","niche",["pet","home"],["dog","home","garden","puppy","bone"]],["cowboy","cowboy","cowboy",["job","story","adventure"],["horse","hat","boots","ride","desert","farm","cow","story"]],["bathtub","bathtub","baignoire",["home","water"],["bath","water","bubble","soap","duck","towel"]],["pot","pot","pot",["home","plant"],["flower","honey","plant","garden","cauldron","kitchen","paint"]],["bowl","bowl","bol",["home","food"],["soup","cereal","spoon","fish","milk","kitchen"]],["sunglasses","sunglasses","lunettes de soleil",["clothes","hot"],["sun","glasses","beach","summer","hot","eye"]],["sunscreen","sunscreen","cr\\xE8me solaire",["hot","body"],["sun","beach","cream","summer","hot","swimsuit"]],["treehouse","treehouse","cabane",["home","nature","adventure"],["tree","home","play","hide","wood","garden"]],["spaceship","spaceship","vaisseau spatial",["space","transport"],["space","ship","rocket","alien","astronaut","star","planet"]]],Ve=e=>e.trim().split(`\n`).flatMap(a=>a.split("|")).map(a=>a.trim()).filter(Boolean).map(a=>{let[t,r]=a.split(":"),[o,n]=t.trim().split("+");return[o,n,r.trim()]}),Ke={en:Ve(`\n    snow+ball: snowball | snow+angel: snow angel | snow+boots: snow boots | snow+storm: snowstorm | snow+white: snow white | snow+day: snow day\n    rain+bow: rainbow | rain+coat: raincoat | rain+cloud: rain cloud | rain+boots: rain boots | rain+forest: rainforest\n    sun+flower: sunflower | sun+glasses: sunglasses | sun+light: sunlight | sun+hat: sun hat | sun+screen: sunscreen | sun+shine: sunshine\n    star+fish: starfish | star+light: starlight | star+ship: starship | gold+star: gold star | rock+star: rock star\n    moon+light: moonlight | moon+walk: moonwalk | night+light: night light | night+owl: night owl | day+light: daylight | candle+light: candlelight\n    fire+truck: fire truck | fire+fly: firefly | fire+wood: firewood | fire+ball: fireball | monster+truck: monster truck\n    butter+fly: butterfly | butter+cup: buttercup | peanut+butter: peanut butter | bread+butter: bread and butter\n    cup+cake: cupcake | tea+cup: teacup | tea+pot: teapot | tea+party: tea party | tea+time: teatime | coffee+cup: coffee cup\n    cheese+cake: cheesecake | birthday+cake: birthday cake | birthday+party: birthday party | birthday+gift: birthday gift | birthday+candle: birthday candle | birthday+song: birthday song\n    chocolate+cake: chocolate cake | chocolate+milk: chocolate milk | chocolate+cookie: chocolate cookie | hot+chocolate: hot chocolate | hot+dog: hot dog\n    ice+cream: ice cream | ice+skate: ice skate | ice+queen: ice queen | cream+cake: cream cake\n    gold+fish: goldfish | gold+medal: gold medal | gold+crown: gold crown | cat+fish: catfish | sword+fish: swordfish | fish+bowl: fishbowl\n    dragon+fly: dragonfly | sea+horse: seahorse | sea+shell: seashell | sea+lion: sea lion | sea+turtle: sea turtle\n    horse+shoe: horseshoe | pony+tail: ponytail | mermaid+tail: mermaid tail | bear+hug: bear hug | lion+king: lion king | queen+bee: queen bee\n    honey+bee: honeybee | honey+pot: honey pot | flower+pot: flowerpot | flower+garden: flower garden\n    tooth+fairy: tooth fairy | sweet+tooth: sweet tooth | sweet+heart: sweetheart | sweet+dream: sweet dreams | day+dream: daydream\n    fairy+wand: fairy wand | fairy+wing: fairy wings | magic+wand: magic wand | magic+spell: magic spell | magic+show: magic show | magic+potion: magic potion\n    witch+hat: witch hat | witch+broom: witch broom | wizard+hat: wizard hat | ghost+story: ghost story\n    book+worm: bookworm | earth+worm: earthworm | story+book: storybook | picture+book: picture book | book+shop: bookshop | story+time: story time\n    bed+time: bedtime | play+time: playtime | bath+time: bath time | bubble+bath: bubble bath | bath+towel: bath towel | soap+bubble: soap bubble\n    soup+bowl: soup bowl | cereal+bowl: cereal bowl | sand+castle: sandcastle | sand+box: sandbox | beach+ball: beach ball | beach+towel: beach towel\n    foot+ball: football | basket+ball: basketball | soccer+ball: soccer ball | soccer+team: soccer team | tennis+ball: tennis ball\n    swim+pool: swimming pool | water+slide: water slide | water+park: water park | skate+park: skate park\n    space+ship: spaceship | rocket+ship: rocket ship | space+station: space station | pirate+ship: pirate ship\n    treasure+map: treasure map | treasure+island: treasure island | school+bus: school bus | police+car: police car | race+car: race car\n    train+station: train station | bike+helmet: bike helmet | mountain+bike: mountain bike | toy+car: toy car | toy+box: toy box | toy+shop: toy shop\n    music+box: music box | lunch+box: lunch box | candy+shop: candy shop | apple+pie: apple pie | apple+tree: apple tree | apple+juice: apple juice\n    orange+juice: orange juice | fruit+juice: fruit juice | fruit+salad: fruit salad | strawberry+jam: strawberry jam | pumpkin+pie: pumpkin pie | banana+bread: banana bread\n    chicken+soup: chicken soup | tomato+soup: tomato soup | cheese+sandwich: cheese sandwich | corn+field: cornfield\n    easter+egg: easter egg | egg+shell: eggshell | christmas+tree: christmas tree | christmas+gift: christmas gift | halloween+costume: halloween costume | halloween+pumpkin: halloween pumpkin\n    party+hat: party hat | wedding+cake: wedding cake | wedding+ring: wedding ring | wedding+dress: wedding dress | love+song: love song\n    winter+coat: winter coat | summer+holiday: summer holiday | autumn+leaf: autumn leaves | tree+frog: tree frog | frog+prince: frog prince\n    bird+nest: bird nest | bird+song: birdsong | duck+pond: duck pond | farm+animal: farm animal | computer+game: computer game | clock+tower: clock tower\n    ear+ring: earring | eye+glasses: eyeglasses | fruit+cake: fruitcake | christmas+light: christmas lights | christmas+sweater: christmas sweater\n    picnic+blanket: picnic blanket | beach+umbrella: beach umbrella | christmas+dinner: christmas dinner | arm+chair: armchair | wheel+chair: wheelchair | sleep+walk: sleepwalk | bow+arrow: bow and arrow\n  `),fr:Ve(`\n    apple+earth: pomme de terre | fish+red: poisson rouge | bow+sky: arc-en-ciel | star+sea: \\xE9toile de mer | castle+sand: ch\\xE2teau de sable | castle+strong: ch\\xE2teau fort\n    glasses+sun: lunettes de soleil | chocolate+hot: chocolat chaud | cake+chocolate: g\\xE2teau au chocolat | cake+birthday: g\\xE2teau d\'anniversaire\n    candle+birthday: bougie d\'anniversaire | party+birthday: f\\xEAte d\'anniversaire | gift+birthday: cadeau d\'anniversaire | tree+christmas: arbre de no\\xEBl | gift+christmas: cadeau de no\\xEBl\n    juice+orange: jus d\'orange | juice+apple: jus de pomme | juice+fruit: jus de fruit | pie+apple: tarte aux pommes | pie+lemon: tarte au citron | pie+strawberry: tarte aux fraises\n    jam+strawberry: confiture de fraises | bread+chocolate: pain au chocolat | toast+butter: tartine de beurre | toast+jam: tartine de confiture | butter+peanut: beurre de cacahu\\xE8te\n    salad+fruit: salade de fruits | soup+vegetable: soupe de l\\xE9gumes | soup+tomato: soupe \\xE0 la tomate | egg+easter: \\u0153uf de p\\xE2ques | rabbit+easter: lapin de p\\xE2ques\n    home+doll: maison de poup\\xE9e | race+horse: course de chevaux | car+race: voiture de course | car+police: voiture de police | truck+firefighter: camion de pompiers\n    fire+wood: feu de bois | mouse+small: petite souris | hat+witch: chapeau de sorci\\xE8re | broom+witch: balai de sorci\\xE8re | hat+wizard: chapeau de sorcier\n    fairy_tale+fairy: conte de f\\xE9es | story+evening: histoire du soir | book+picture: livre d\'images | book+story: livre d\'histoires | map+treasure: carte au tr\\xE9sor | island+treasure: \\xEEle au tr\\xE9sor\n    boat+pirate: bateau pirate | ship+pirate: navire pirate | queen+snow: reine des neiges | king+lion: roi lion | white+snow: blanche-neige\n    night+star: nuit \\xE9toil\\xE9e | sky+blue: ciel bleu | sky+star: ciel \\xE9toil\\xE9 | bath+sun: bain de soleil | bubble+soap: bulle de savon | towel+bath: serviette de bain\n    towel+beach: serviette de plage | ball+beach: ballon de plage | ball+soccer: ballon de foot | scarf+wool: \\xE9charpe en laine | sweater+wool: pull en laine | coat+winter: manteau d\'hiver\n    boots+rain: bottes de pluie | boots+snow: bottes de neige | holiday+summer: vacances d\'\\xE9t\\xE9 | holiday+christmas: vacances de no\\xEBl | leaf+autumn: feuille d\'automne\n    pot+flower: pot de fleurs | pot+honey: pot de miel | pot+paint: pot de peinture | worm+earth: ver de terre | nest+bird: nid d\'oiseau | queen+bee: reine des abeilles\n    mouse+green: une souris verte | cup+tea: tasse de th\\xE9 | cup+coffee: tasse de caf\\xE9 | glass+milk: verre de lait | glass+water: verre d\'eau | bowl+cereal: bol de c\\xE9r\\xE9ales\n    bowl+soup: bol de soupe | spoon+soup: cuill\\xE8re \\xE0 soupe | box+music: bo\\xEEte \\xE0 musique | box+letter: bo\\xEEte aux lettres | letter+santa: lettre au p\\xE8re no\\xEBl | game+map: jeu de cartes\n    teacher+school: ma\\xEEtresse d\'\\xE9cole | pencil+color: crayon de couleur | paper+gift: papier cadeau | helmet+bike: casque de v\\xE9lo | plane+paper: avion en papier | boat+paper: bateau en papier\n    fire+red: feu rouge | fire+green: feu vert | fish+clown: poisson-clown | tomato+cherry: tomate cerise | ice_cream+strawberry: glace \\xE0 la fraise | ice_cream+chocolate: glace au chocolat\n    pancake+sugar: cr\\xEApe au sucre | pancake+chocolate: cr\\xEApe au chocolat | beard+dad: barbe \\xE0 papa | apple+love: pomme d\'amour | cream+chocolate: cr\\xE8me au chocolat | cheese+goat: fromage de ch\\xE8vre\n    tail+mermaid: queue de sir\\xE8ne | tail+horse: queue de cheval | tooth+milk: dent de lait | bow+arrow: arc et fl\\xE8ches | race+foot: course \\xE0 pied | planet+earth: plan\\xE8te terre\n    snowflake+snow: flocon de neige | butterfly+night: papillon de nuit | bat+mouse: chauve-souris | horse+wood: cheval de bois | tower+magic: tour de magie | dog+wolf: chien-loup\n    fish+aquarium: poisson d\'aquarium | castle+princess: ch\\xE2teau de princesse | cake+cream: g\\xE2teau \\xE0 la cr\\xE8me\n    blanket+picnic: couverture de pique-nique | dinner+christmas: d\\xEEner de no\\xEBl | sweater+christmas: pull de no\\xEBl | cake+fruit: g\\xE2teau aux fruits\n  `)};var Je={en:["above","acorn","across","actor","actress","add","afraid","afternoon","ago","air","airplane","all","alligator","almost","along","alpaca","also","always","am","an","anchor","ancient","and","ankle","answer","anyone","anything","apartment","apricot","april","apron","are","armchair","armor","around","ask","asked","attic","aubergine","august","aunt","author","avenue","avocado","away","baa","baboon","back","bacon","bad","badger","badminton","bag","bagel","balcony","ballet","balloons","bamboo","bandage","bang","bank","bark","baseball","basement","bathe","bathroom","bathtub","be","beak","bean","beanie","beans","beat","beautiful","beaver","because","beef","been","beep","beet","beetle","begin","behind","beige","being","belly","below","belt","bench","berry","beside","best","better","between","bicycle","bigger","biggest","biscuit","bison","bite","bitter","blackberry","blaze","blender","blink","bloom","blouse","blueberry","blunt","board","boil","bones","bonnet","boom","boot","bored","borrow","bottle","bottom","boulder","bounce","bouquet","bowl","bowling","boy","bracelet","brake","break","breeze","bring","broccoli","broken","brownie","brunch","brush","bubbles","buffalo","bug","building","bull","bumpy","bun","bunk","bunny","burn","burrito","bush","but","butcher","button","buy","buzz","bye","cabbage","cabinet","cable","calendar","calf","call","calm","came","camera","can","canary","candles","canoe","canvas","canyon","cap","caramel","card","cards","care","carpet","carry","cart","cashier","cauliflower","ceiling","celebration","celery","cello","centipede","chalk","chameleon","charger","chase","chat","cheek","cheer","cheerful","chess","chest","chew","chewing","chewy","chick","child","children","chilly","chimp","chimpanzee","chin","chipmunk","chirp","chop","church","cinema","clam","clap","classroom","claw","clay","cleaner","clear","clementine","cliff","clinic","close","closed","clouds","cloudy","cluck","coach","coast","cocoa","coconut","coin","collar","college","colour","comb","come","comet","compass","cone","conifer","cool","copy","coral","corner","couch","country","courgette","cousin","coyote","cracker","crackle","cradle","cranberry","crash","crawl","crayon","crayons","cream","creamy","creek","crib","cricket","crimson","croak","crossing","crow","crunchy","crying","cucumber","cupboard","cupcake","curious","curtain","curtains","custard","cut","cycling","daddy","daffodil","daisy","damp","dancer","dancing","dandelion","date","daughter","dawn","december","deep","deer","delicious","deliver","dice","did","different","dig","dim","ding","dino","dirt","discover","do","does","dolly","done","dong","donkey","dotted","dove","down","dozen","dragonfly","drawer","drawing","drip","drive","driver","drizzle","drop","drums","dry","duckling","dull","dumpling","dusk","dust","dusty","duvet","dwarf","each","early","earring","earrings","easel","easy","edge","eggplant","eight","eighteen","elbow","eleven","elk","email","empty","emu","end","engine","enormous","enough","every","everybody","everyone","everything","exam","excited","experiment","eyebrow","eyelash","factory","fake","falcon","false","fan","fancy","far","fat","father","faucet","feast","february","feel","fence","fern","ferry","festival","few","fifteen","fifty","fig","fill","fin","find","finish","fireman","first","fishing","five","fix","fixed","flag","flamingo","flash","flat","flicker","float","floor","flour","fluffy","fog","foggy","fold","follow","football","forehead","forty","found","four","fourteen","freeze","freezing","fresh","friday","front","frost","frosting","fry","fudge","full","furry","future","fuzzy","galaxy","garage","gardener","garlic","gate","gave","gecko","genie","gentle","geography","gerbil","get","gifts","giggle","girl","give","glacier","glad","glitter","glittery","glow","glue","go","goblin","goes","goldfish","golf","gone","good","goodbye","goose","gorilla","got","grade","grandfather","grandmother","grandparents","granny","grapefruit","grasshopper","gravy","gray","great","greet","grill","ground","growl","grumpy","guard","guess","guinea","gum","gym","gymnastics","had","hail","hairy","half","hall","hallway","ham","harbor","harbour","hard","hare","harp","has","have","hawk","he","healthy","hear","heater","heavy","hedge","hedgehog","heel","hello","hen","her","here","hers","hi","high","him","hip","hippo","hippopotamus","his","hiss","history","hit","hockey","hold","holidays","hollow","honk","hoodie","hoot","hop","hope","horn","hornet","hotdog","hour","house","how","howl","huge","hum","hummingbird","hundred","hurricane","hurry","hyena","icicle","icing","icy","if","iguana","imagine","in","indigo","ink","inside","internet","into","invite","is","it","its","ivy","jaguar","january","jar","jeans","jelly","jellybean","jet","join","jolly","judge","judo","jug","juggle","juicy","july","jumper","jumprope","june","karate","kayak","keep","kept","ketchup","kettle","keyboard","kick","kid","kids","kind","kiwi","knee","knew","knife","knit","knock","know","knuckle","koala","ladder","ladybird","lamb","land","lane","laptop","large","lasagna","last","late","lavender","lay","lead","leak","learn","leash","least","leaves","left","leggings","lemur","lend","leopard","less","lesson","let","lettuce","librarian","lick","licorice","lid","lie","lifeguard","lift","lightbulb","like","lily","lime","lip","lips","listen","little","living","lizard","llama","lobster","lock","lonely","long","look","lorry","lose","lots","lovely","low","lunchbox","lungs","lynx","macaroni","machine","mad","made","magical","magnet","mail","make","mall","mama","man","mango","many","maple","marble","marbles","march","margarine","marker","market","marsh","maths","mattress","may","maybe","mayonnaise","me","meal","mean","measure","meat","meatball","mechanic","meet","melody","melon","melt","men","mend","menu","meow","message","messy","metal","meteor","metro","microphone","microwave","middle","midnight","milkshake","million","mine","minute","mirror","mist","mix","modern","mole","moment","mommy","monday","month","moo","moose","mop","more","mosquito","moss","most","moth","mother","motorbike","motorcycle","move","mow","muddy","muffin","mug","mule","mum","mummy","munch","muscle","mustard","my","myself","nail","nap","napkin","narrow","navy","near","neat","neck","necklace","nectarine","need","neigh","neighbor","neighbour","nephew","nervous","never","newt","next","nice","niece","nightlight","nine","nineteen","no","nobody","nod","noisy","noodle","noodles","noon","normal","not","note","notebook","notes","nothing","november","now","nugget","nuggets","nut","oak","oatmeal","october","odd","off","office","officer","often","ogre","oil","oink","ok","okay","olive","on","one","onion","only","onto","open","or","orangutan","orbit","orchid","order","ornament","ostrich","other","otter","our","ours","out","outside","over","overalls","ox","oyster","page","paintbrush","painter","palace","palm","pan","panther","papa","papaya","parade","parent","parents","past","path","pavement","pay","pea","peach","peacock","peanut","peas","pebble","peel","pelican","people","pepper","person","petal","pharmacy","photograph","pick","pigeon","piglet","pine","pinecone","plain","playtime","please","plenty","plug","plum","plumber","pocket","poem","point","pointy","policeman","polite","pomegranate","pop","poppy","popsicle","porch","pork","porridge","port","post","pot","pour","power","prawn","present","presents","press","pretend","pretty","printer","prize","protect","proud","pudding","pull","pupil","purr","purse","push","put","quack","quick","quilt","quite","quiz","raccoon","racing","radiator","radish","raft","raincoat","raindrop","rainy","raisin","rake","ram","raspberry","rat","raven","real","really","receive","recess","recipe","recorder","referee","rent","reply","rescue","rest","rhino","rhinoceros","rhythm","ribbon","rice","right","rinse","roast","robin","roll","rollerskate","room","rooster","root","rope","rose","rough","rubber","rude","rug","rugby","ruler","running","rush","said","sail","sailboat","sailor","salmon","salt","salty","same","sandals","sandbox","saturday","sauce","sausage","save","saw","saxophone","say","scared","schoolbag","scooter","scorpion","scream","scrub","sculpture","seagull","seahorse","seal","search","seat","seatbelt","seaweed","second","see","seek","seen","seesaw","sell","send","sentence","september","serious","set","seven","seventeen","sew","shadow","shake","shallow","shampoo","sharp","sharpener","she","sheet","shelf","shiny","shore","short","shorts","shoulder","shout","shovel","shower","shrimp","shrub","shut","shy","side","sidewalk","sign","silent","silly","silver","simple","singer","sink","sip","sit","six","sixteen","skating","skiing","skin","skinny","skip","skirt","skunk","sleepy","sleet","sleeve","slice","slippers","sloth","slug","smaller","smallest","smell","smoke","smooth","smoothie","snap","sneakers","sneeze","snore","snowy","so","sob","soda","soil","solid","solve","some","somebody","someone","something","sometimes","son","songs","soon","sorbet","sorry","sour","spaghetti","sparkly","sparrow","speak","special","spend","spicy","spill","spin","spinach","splash","spots","spotted","spread","sprinkles","sprout","squash","squeak","squeeze","squid","stadium","staircase","stairs","stand","stars","start","statue","steak","stegosaurus","stem","sticker","stickers","sticky","sting","stir","stomach","stool","stop","store","stormy","stove","strange","straw","stream","street","stretch","striped","stripes","study","subtract","subway","sunday","sunny","sunrise","sunshine","supermarket","supper","surfing","surprised","sushi","swallow","swamp","swan","sweep","sweets","swimming","switch","syrup","taco","tadpole","tag","take","talk","tall","tambourine","tangerine","tap","tape","taste","tasty","taxi","teach","tear","teddy","teeth","telephone","television","tell","temple","ten","test","than","thank","thanks","thanksgiving","that","thaw","the","theater","theatre","their","theirs","them","then","there","these","they","thick","thief","thin","think","third","thirsty","thirteen","thirty","this","thorn","those","thought","thousand","three","throne","through","thumb","thursday","tick","ticket","tickle","tidy","tie","tights","tin","tiny","toad","toaster","tock","today","toe","toes","toffee","toilet","told","tomorrow","tongue","tonight","too","took","toothpaste","top","tornado","tortoise","toucan","touch","toward","town","toys","trace","track","traffic","trainers","tram","tray","treat","trex","triceratops","tricky","troll","trombone","trousers","true","trunk","try","tshirt","tuesday","tulip","tummy","tuna","tune","tunnel","turkey","turn","turquoise","tweet","twelve","twenty","twig","twin","twinkle","twins","two","ugly","uncle","under","uniform","universe","university","unlock","untie","up","upset","us","use","usually","vacation","valley","van","vanilla","very","vest","video","village","villain","vine","vinegar","violet","visit","voice","volleyball","waffle","wagon","waiter","waitress","wake","wall","wallaby","wallet","walrus","want","was","wash","wasp","watch","we","web","wednesday","weed","week","weekend","weird","well","went","were","what","when","where","which","whiskers","whisper","whistle","who","whom","why","wide","wiggle","willow","windy","wink","wipe","woman","women","wonder","woodpecker","work","worm","worried","worse","worst","wrap","wrist","writer","xylophone","yacht","yawn","yell","yes","yesterday","yogurt","you","young","your","yours","yourself","yoyo","yummy","zero","zip","zipper","zucchini"],fr:["aboyer","abricot","acheter","acide","acteur","actrice","adorer","affam\\xE9","agneau","ail","aimant","aimer","air","ajouter","algue","aller","alligator","alors","alpaga","amer","am\\xE8re","ampoule","ancien","ancienne","ancre","\\xE2ne","ao\\xFBt","appareil","appartement","appeler","applaudir","apporter","apprendre","appuyer","apr\\xE8s-midi","argent\\xE9","argile","armure","arr\\xEAter","arroser","asseoir","assez","assoiff\\xE9","attacher","au","aube","aubergine","aujourd\'hui","aussi","auteur","autocollant","autour","autre","autruche","aux","avaler","averse","avocat","avoir","avril","babouin","bac","badminton","baguette","baie","baigner","baignoire","b\\xE2iller","balancer","balayer","balcon","balle","ballet","ballons","bambou","banc","banque","barri\\xE8re","bas","baseball","basketball","baskets","basse","batterie","bavarder","beau","beaucoup","bec","beige","b\\xEAler","b\\xE9lier","belle","berceau","b\\xEAte","betterave","biblioth\\xE9caire","biche","bicyclette","bidon","bient\\xF4t","billes","bison","bizarre","blaireau","blanche","bleue","bob","bocal","b\\u0153uf","bol","bon","bonjour","bonne","bonnet","bonsoir","bord","boucherie","boucle","boueux","bouger","bougies","bouillir","bouilloire","boulette","boum","bouquet","bourdonner","boussole","bouteille","boutique","bouton","boutonner","bowling","bracelet","brillante","brillants","brindille","brioche","brise","brocoli","brosse","brosser","brouillard","br\\xFBler","brume","bruyante","buisson","bulles","c\\xE2ble","cadeaux","cadenas","cahier","caissier","calendrier","calmar","cam\\xE9l\\xE9on","camionnette","canari","caneton","cano\\xEB","cantine","caqueter","car","carafe","caramel","carnaval","carr\\xE9e","cartes","casquette","cass\\xE9","cass\\xE9e","casser","casserole","cassis","castor","cave","ce","ceinture","c\\xE9l\\xE9bration","c\\xE9leri","cent","cerf","ces","cet","cette","chacun","chansons","chanteur","chanteuse","chaque","chargeur","chariot","charrette","chatouiller","chaude","chauffeur","chaussons","chemin","ch\\xEAne","chercher","chevalet","cheville","chewing-gum","chimpanz\\xE9","chose","chou","chou-fleur","chouette","chuchoter","cil","cin\\xE9ma","cinq","cinquante","clair","claire","clavier","cl\\xE9mentine","cligner","clignoter","coasser","coffre","coin","col","colibri","collant","colle","coll\\xE8ge","coller","collier","colombe","colorier","com\\xE8te","commander","commencer","comment","concombre","conduire","contr\\xF4le","copier","coq","coquelicot","corail","corbeau","corde","cornet","c\\xF4t\\xE9","cou","coucher","coude","coudre","couette","couiner","couler","couloir","couper","courageuse","courgette","court","courte","cousin","cousine","couteau","couvercle","coyote","crac","craie","crapaud","cravate","cr\\xE8me","cr\\xE9meux","creuser","crevette","crier","croire","croquant","croquer","croustillant","cueillir","cuire","cuisinier","cuisini\\xE8re","cupcake","curieuse","curieux","cygne","dans","danseur","danseuse","datte","de","d\\xE9cembre","d\\xE9coration","d\\xE9couvrir","dedans","d\\xE9fil\\xE9","d\\xE9geler","dehors","d\\xE9licieuse","d\\xE9licieux","demain","demander","dentifrice","dents","d\\xE9p\\xEAcher","d\\xE9penser","dernier","derni\\xE8re","derri\\xE8re","des","dessin","dessous","dessus","deux","deuxi\\xE8me","devant","deviner","devoir","difficile","dimanche","dinde","dindon","dire","dix","donc","donner","dor\\xE9","dor\\xE9e","dos","douce","douche","doucher","doudou","douzaine","douze","drap","drapeau","droite","dromadaire","du","duveteux","\\xE9checs","\\xE9chelle","\\xE9clabousser","\\xE9clater","\\xE9corce","\\xE9couter","\\xE9crivain","effray\\xE9","effray\\xE9e","\\xE9glise","\\xE9lan","elle","elles","emballer","embrasser","emprunter","encourager","encre","enfant","enfants","ennuy\\xE9","\\xE9norme","enseigner","ensoleill\\xE9","entendre","entra\\xEEneur","entre","envoyer","\\xE9pais","\\xE9paisse","\\xE9paule","\\xE9peler","\\xE9pinard","\\xE9pine","\\xE9plucher","\\xE9rable","escalier","esp\\xE9rer","essayer","essuyer","et","\\xE9tag\\xE8re","\\xE9ternuer","\\xE9tinceler","\\xE9tirer","\\xE9toiles","\\xE9trange","\\xEAtre","\\xE9troit","\\xE9tudier","\\xE9vier","excit\\xE9","excit\\xE9e","exp\\xE9rience","f\\xE2ch\\xE9","f\\xE2ch\\xE9e","facile","faire","falaise","farine","fatigu\\xE9e","faucon","fausse","fauteuil","faux","femme","ferm\\xE9e","fermer","fermeture","ferry","festin","feuilles","feutre","feux","f\\xE9vrier","fier","fi\\xE8re","figue","fille","fils","finir","flamant","fleurir","flotter","fondre","football","foug\\xE8re","fra\\xEEche","frais","framboise","frapper","frein","frelon","frire","froide","front","frotter","fum\\xE9e","furieux","futur","galaxie","garage","gar\\xE7on","garder","gauche","gaufre","gazouiller","gecko","gel\\xE9e","geler","g\\xE9nie","genou","gens","gentil","gentille","g\\xE9ographie","gerbille","germer","gigantesque","gilet","givre","gla\\xE7age","glac\\xE9e","glacier","gland","glisser","gobelin","golf","gorille","goutte","goutter","grand-m\\xE8re","grand-p\\xE8re","grande","grands-parents","gr\\xEAle","grenade","grenier","griffe","grignoter","grille-pain","griller","grillon","grise","grogner","grognon","gros","groseille","grosse","gu\\xEApe","gym","gymnastique","haie","hanche","haricot","harpe","haut","haute","hennir","h\\xE9risson","heure","heureuse","heureux","hier","hippocampe","hippopotame","hockey","homard","homme","huile","huit","hu\\xEEtre","hululer","humide","hurler","hy\\xE8ne","iguane","il","ils","imaginer","immense","immeuble","imperm\\xE9able","impoli","imprimante","infirmier","inquiet","inqui\\xE8te","internet","interrupteur","inviter","jaguar","jamais","jambon","janvier","jardinier","je","jean","jeudi","jeune","joli","jolie","jongler","jonquille","joue","jouets","joyeuse","joyeux","judo","juge","juillet","juin","jumeau","jumeaux","jumelle","jupe","juteux","karat\\xE9","kayak","ketchup","kiwi","klaxon","klaxonner","koala","la","laisse","laisser","laitue","lama","langue","lapinou","large","larme","lasagnes","lavande","laver","laveur","le","l\\xE9cher","le\\xE7on","l\\xE9ger","l\\xE9g\\xE8re","l\\xE9murien","lente","l\\xE9opard","les","leur","leurs","lever","l\\xE8vre","l\\xE8vres","l\\xE9zard","libellule","lierre","li\\xE8vre","limace","lisse","loin","long","longue","lourd","lourde","loutre","lundi","lyc\\xE9e","lynx","lys","ma","macaronis","m\\xE2cher","machine","magicien","magique","magnifique","mai","maintenant","ma\\xEEtre","manche","manchot","mandarine","mangue","marais","march\\xE9","mardi","marguerite","marin","mars","matelas","mauvais","mauvaise","mayonnaise","me","m\\xE9canicien","m\\xE9chant","m\\xE9chante","m\\xE9decin","meilleur","meilleure","m\\xE9langer","m\\xE9lodie","melon","m\\xEAme","menton","menu","merci","mercredi","m\\xE8re","mes","message","mesurer","m\\xE9tal","m\\xE9t\\xE9ore","m\\xE9tro","mettre","meugler","miam","miauler","micro","micro-ondes","midi","mignonne","milieu","milkshake","mille","mille-pattes","million","mince","minuit","minuscule","minute","miroir","mixeur","moche","modeler","moderne","moi","moineau","moins","mois","moiti\\xE9","moment","momie","mon","montre","montrer","mordre","morse","moteur","moto","mouche","mouette","mouill\\xE9e","mousse","moustaches","moustique","moutarde","muffin","mulet","mur","m\\xFBre","muscle","myrtille","nageoire","nain","natation","neigeux","nettoyer","neuf","neuve","neveu","ni\\xE8ce","noire","noisette","noix","non","normal","nos","note","notre","nouilles","nous","nouvelle","novembre","nuages","nuageux","octobre","ogre","oie","oignon","olive","ombre","on","oncle","ongle","onze","orageux","orang-outan","orchid\\xE9e","orteil","ou","oui","ouragan","ouvert","ouverte","ouvrir","page","paille","paillet\\xE9","palais","palourde","pamplemousse","panneau","pansement","panth\\xE8re","paon","pardon","parent","parents","paresseux","parfois","parler","pass\\xE9","p\\xE2te","patinage","payer","pays","peau","p\\xEAche","peigne","peigner","peindre","peintre","p\\xE9lican","pelle","penser","perdre","p\\xE8re","personne","p\\xE9tale","petite","peu","peut-\\xEAtre","pharmacie","phoque","phrase","pic","pi\\xE8ce","pierre","pigeon","pin","pinceau","piquant","piq\\xFBre","pissenlit","place","plafond","planter","plat","plate","plateau","plein","pleine","pleurs","plier","plombier","plouf","plus","plusieurs","pluvieux","poche","po\\xEAle","po\\xE8me","poignet","poilu","pointu","pointue","pois","poitrine","poivre","poivron","poli","policier","pop","porc","porcelet","port","portable","portefeuille","porter","poste","poster","pouce","poulet","poumon","pourquoi","poursuivre","poussi\\xE8re","poussi\\xE9reux","poussin","pouvoir","premier","premi\\xE8re","prendre","pr\\xE8s","presque","pr\\xEAter","prise","prix","professeur","profond","profonde","prot\\xE9ger","prune","pudding","quand","quarante","quatorze","quatre","que","quel","quelle","quelque","qui","quinze","quoi","racine","radeau","radiateur","radis","rails","ramper","ranger","rat","raton","raviolis","ray\\xE9","ray\\xE9e","rayures","rebondir","recette","recevoir","r\\xE9cr\\xE9ation","regarder","r\\xE8gle","r\\xE9glisse","remplir","rencontrer","renverser","r\\xE9parer","repas","r\\xE9pondre","reposer","r\\xE9soudre","r\\xE9veil","r\\xE9veiller","r\\xEAver","rhinoc\\xE9ros","rideau","rien","rigolo","rigolote","rincer","rivage","riz","robinet","ronde","ronfler","ronronner","rouge-gorge","rouler","ruban","rue","rugby","rugueux","ruisseau","rythme","sa","sac","sal\\xE9e","salon","salopette","saluer","salut","samedi","sandales","sant\\xE9","sapin","sauce","saucisse","saule","saumon","sauterelle","sautiller","sauver","savoir","saxophone","scarab\\xE9e","sciences","scintiller","scorpion","scotch","sculpture","sec","s\\xE8che","s\\xE9cher","seconde","secouer","seize","sel","semaine","sentir","sept","septembre","s\\xE9rieux","serrer","serveur","serveuse","ses","seul","seule","seulement","shampoing","shooter","short","si","si\\xE8ge","siffler","sifflet","silencieux","simple","sirop","six","soixante","sol","son","sonner","sorbet","sort","soulever","sourcil","sous","souvent","spaghettis","sp\\xE9cial","stade","statue","steak","sucr\\xE9e","suivre","supermarch\\xE9","sur","surpris","sweat","t-shirt","ta","tablier","tabouret","tac","taches","tachet\\xE9","taille-crayon","talon","tambourin","tante","taper","tapis","tard","tartiner","taupe","taureau","taxi","te","t\\xE9l\\xE9vision","tenir","terrasse","tes","t\\xEAtard","th\\xE9\\xE2tre","thon","tic","ticket","tige","timide","tirelire","tirer","tiroir","toi","toile","tomber","ton","tornade","t\\xF4t","toucan","toucher","toujours","toupie","tourner","tourniquet","tous","tout","toute","toutes","tramway","tranquille","travailler","travers","treize","trente","tr\\xE8s","tric\\xE9ratops","tricoter","trois","troisi\\xE8me","troll","trombone","trompe","tronc","tr\\xF4ne","trop","trottinette","trottoir","trousse","trouver","tu","tulipe","tunnel","turquoise","tyrannosaure","un","une","uniforme","univers","universit\\xE9","usine","utiliser","vall\\xE9e","vanille","veau","veilleuse","vendre","vendredi","venir","venteux","ventilateur","ventre","ver","vermicelles","vers","verser","verte","viande","vide","vid\\xE9o","vieil","vieille","village","vinaigre","vingt","violette","violoncelle","visiter","vite","voile","voilier","voir","voisin","voisine","voix","voleur","volley","vos","votre","vouloir","vous","vrai","vraie","vraiment","week-end","xylophone","yaourt","z\\xE9ro"]};var ot=/^[\\s"\'\u201C\u201D\u2018\u2019\xAB\xBB`.,!?\xBF\xA1;:()[\\]{}*_~-]+|[\\s"\'\u201C\u201D\u2018\u2019\xAB\xBB`.,!?\xBF\xA1;:()[\\]{}*_~-]+$/gu,nt=/^[\\p{L}\\p{M}]+(?:[ \'-][\\p{L}\\p{M}]+)*$/u;function B(e){return String(e??"").normalize("NFC").replace(/[\u2018\u2019`\xB4]/g,"\'").replace(/[\u2010\u2011\u2012\u2013\u2014]/g,"-").replace(/\\s+/g," ").replace(ot,"").replace(/\\s*([-\'])\\s*/g,"$1").trim()}function k(e){return B(e).toLowerCase().replace(/\u0153/g,"oe").replace(/\xE6/g,"ae").replace(/\xDF/g,"ss").normalize("NFD").replace(new RegExp("\\\\p{M}","gu"),"").replace(/[\\s\'-]+/g,"")}function Xe(e){let a=B(e);if(!a)return{ok:!1,code:"EMPTY",word:a};if(a.length>24)return{ok:!1,code:"TOO_LONG",word:a};if(!nt.test(a))return{ok:!1,code:"INVALID_CHARACTERS",word:a};let t=k(a);return t.length<1?{ok:!1,code:"INVALID_CHARACTERS",word:a}:a.split(" ").length>3?{ok:!1,code:"TOO_MANY_WORDS",word:a}:{ok:!0,word:a,key:t}}function it(e,a,t=1/0){if(Math.abs(e.length-a.length)>t)return t+1;let r=[];for(let o=0;o<=e.length;o++)r.push(new Array(a.length+1).fill(0)),r[o][0]=o;for(let o=0;o<=a.length;o++)r[0][o]=o;for(let o=1;o<=e.length;o++){let n=1/0;for(let l=1;l<=a.length;l++){let u=e[o-1]===a[l-1]?0:1,d=Math.min(r[o-1][l]+1,r[o][l-1]+1,r[o-1][l-1]+u);o>1&&l>1&&e[o-1]===a[l-2]&&e[o-2]===a[l-1]&&(d=Math.min(d,r[o-2][l-2]+1)),r[o][l]=d,d<n&&(n=d)}if(n>t)return t+1}return r[e.length][a.length]}var st=[["s",""],["x",""],["es",""],["ies","y"],["ves","f"],["aux","al"]];function lt(e,a){for(let[t,r]of st)if(e.length>t.length+1&&e.endsWith(t)&&a.has(e.slice(0,-t.length)+r))return!0;return!1}var ct=[/^[aeiouy]{2}$/,/^[sz]{2}$/,/^[ck]{2}$/,/^[cs]{2}$/,/^[kq]{2}$/,/^[gj]{2}$/],ut=(e,a)=>ct.some(t=>t.test(e+a));function dt(e,a){if(e.length===a.length){let t=[];for(let r=0;r<e.length;r++)e[r]!==a[r]&&t.push(r);return t.length===2&&t[1]===t[0]+1&&e[t[0]]===a[t[1]]&&e[t[1]]===a[t[0]]?!0:t.length===1&&t[0]>0&&e.length>=4&&ut(e[t[0]],a[t[0]])}if(e.length+1===a.length){for(let t=1;t<a.length;t++)if(a.slice(0,t)+a.slice(t+1)===e)return e.length>=4;return!1}if(e.length===a.length+1){for(let t=0;t<e.length;t++)if(e.slice(0,t)+e.slice(t+1)===a&&(e[t]===e[t-1]||e[t]===e[t+1]))return!0}return!1}function pt(e,a){for(let t of["ed","ing","er","est","ly","d"])if(e.length>t.length+2&&e.endsWith(t)){let r=e.slice(0,-t.length);if(a.has(r)||a.has(r+"e")||r.at(-1)===r.at(-2)&&a.has(r.slice(0,-1)))return!0}return!1}function Qe(e){let a=new Map;for(let r of e){let o=k(r);o.length>=2&&!a.has(o)&&a.set(o,r)}let t=new Map;for(let r of a.keys())t.has(r.length)||t.set(r.length,[]),t.get(r.length).push(r);return{has(r){return a.has(k(r))},suggest(r){let o=k(r);if(o.length<3||a.has(o)||lt(o,a)||pt(o,a))return null;let n=o.length>=8?2:1,l=n+1,u=[];for(let p=o.length-n;p<=o.length+n;p++)for(let h of t.get(p)||[]){let m=it(o,h,Math.min(n,l));m<l?(l=m,u=[h]):m===l&&u.push(h)}if(l>n||u.length!==1)return null;let d=u[0];return l===1&&!dt(o,d)||l===2&&d.slice(0,2)!==o.slice(0,2)?null:a.get(d)}}}var fe=new Map,ht={en:[["s",""],["es",""],["ies","y"],["ves","f"]],fr:[["s",""],["x",""],["e",""],["es",""],["aux","al"]]};function D(e="en"){let a=e==="fr"?"fr":"en";return fe.has(a)||fe.set(a,mt(a)),fe.get(a)}function mt(e){let a=e==="fr"?2:1,t=new Map;for(let[p,h,m,f]of ge)t.set(p,{id:p,label:e==="fr"?m:h,key:k(e==="fr"?m:h),tags:f,links:new Set,phrases:new Set,near:new Set,out:new Map});for(let p of ge){let[h,,,,m]=p;m.forEach((f,b)=>{t.has(f)&&f!==h&&t.get(h).out.set(f,b)});for(let f of m)!t.has(f)||f===h||(t.get(h).links.add(f),t.get(f).links.add(h))}for(let[p,h]of Ke[e]||[])!t.has(p)||!t.has(h)||p===h||(t.get(p).phrases.add(h),t.get(h).phrases.add(p));for(let p of t.values())p.near=new Set([...p.links,...p.phrases]);let r=new Map;for(let p of t.values())r.has(p.key)||r.set(p.key,p.id);let o=[...r.keys()].sort((p,h)=>h.length-p.length);function n(p){if(r.has(p))return r.get(p);for(let[h,m]of ht[e])if(p.length>h.length+2&&p.endsWith(h)){let f=p.slice(0,-h.length)+m;if(r.has(f))return r.get(f)}return null}function l(p){let h=k(p);if(!h)return[];let m=n(h);if(m)return[m];let f=String(p).trim().toLowerCase().split(/[\\s-]+/);if(f.length>1){let b=n(k(f.map(v=>v.length>3?v.replace(/[sx]$/,""):v).join(" ")));if(b)return[b]}if(h.length<5)return[];for(let b=h.length-3;b>=3;b--){let v=n(h.slice(0,b)),y=n(h.slice(b));if(v&&y&&v!==y)return[v,y]}for(let b of o)if(!(b.length<3||b.length>=h.length||b.length/h.length<.6)&&(h.startsWith(b)||h.endsWith(b)))return[r.get(b)];return[]}function u(p){return l(p)[0]??null}let d=[...t.values()].map(p=>p.label).concat(Je[e]||[]);return{language:e,labelIndex:a,concepts:t,byKey:r,resolve:u,resolveAll:l,words:d}}var we={children:"child",mice:"mouse",men:"man",women:"woman",feet:"foot",teeth:"tooth",geese:"goose",people:"person",oxen:"ox",dice:"die",lice:"louse",cacti:"cactus",fungi:"fungus",ran:"run",went:"go",gone:"go",ate:"eat",eaten:"eat",saw:"see",seen:"see",took:"take",taken:"take",gave:"give",given:"give",came:"come",became:"become",began:"begin",begun:"begin",broke:"break",broken:"break",chose:"choose",chosen:"choose",drove:"drive",driven:"drive",flew:"fly",flown:"fly",forgot:"forget",forgotten:"forget",froze:"freeze",frozen:"freeze",got:"get",gotten:"get",grew:"grow",grown:"grow",hid:"hide",hidden:"hide",knew:"know",known:"know",rode:"ride",ridden:"ride",rang:"ring",rung:"ring",rose:"rise",risen:"rise",sang:"sing",sung:"sing",sank:"sink",sunk:"sink",spoke:"speak",spoken:"speak",stole:"steal",stolen:"steal",swam:"swim",swum:"swim",threw:"throw",thrown:"throw",woke:"wake",woken:"wake",wore:"wear",worn:"wear",won:"win",sat:"sit",slept:"sleep",felt:"feel",kept:"keep",made:"make",built:"build",bought:"buy",brought:"bring",caught:"catch",taught:"teach",thought:"think",fought:"fight",found:"find",held:"hold",told:"tell",sold:"sell",stood:"stand",dug:"dig",drank:"drink",drunk:"drink",drew:"draw",drawn:"draw",fell:"fall",fallen:"fall",did:"do",done:"do",was:"be",were:"be",been:"be",had:"have",said:"say",paid:"pay",met:"meet",fed:"feed",shot:"shoot",lost:"lose",slid:"slide",spun:"spin",stuck:"stick",swung:"swing",blew:"blow",blown:"blow",bit:"bite",bitten:"bite",shook:"shake",shaken:"shake",tore:"tear",torn:"tear",wrote:"write",written:"write",hung:"hang",lit:"light",heard:"hear",ground:"grind",better:"good",best:"good",worse:"bad",worst:"bad"},ea=new Set("big small fast slow tall short hot cold nice happy sad funny long soft hard loud quiet bright dark warm cool old young new strong weak high low easy busy pretty ugly clean dirty rich poor deep wide thin thick fat smart kind brave wild calm cute sweet sour late early heavy light quick near far full wet dry safe scary silly tiny huge great fresh sharp smooth rough tough lucky sunny windy rainy snowy cloudy crazy fancy friendly gentle simple close fine large loose noisy shiny sticky tasty yummy hungry sleepy angry lazy dull mild odd pale pure rare ripe sick slim sore steep tight wise grumpy".split(" ")),gt=new Set("evening morning ceiling during string wedding building painting drawing feeling meaning earring sibling darling pudding nothing something everything anything thing king ring sing spring wing swing sling sting bring cling fling news glasses pants jeans scissors shorts series species physics maths mathematics trousers pajamas pyjamas stairs hundred sacred naked wicked bed red shed sled seed need feed speed weed bleed breed ladder letter water winter summer flower tower power river silver butter dinner paper spider monster tiger number finger hamburger upper under over after never ever corner danger mother father sister brother teacher baker".split(" ")),Ze={yeux:"oeil",cieux:"ciel",messieurs:"monsieur",mesdames:"madame"},be=new Map;function ft(e){if(!be.has(e)){let a=new Set;for(let t of D(e).words)for(let r of aa(t))a.add(r);if(e==="en"){for(let t of Object.values(we))a.add(t);for(let t of ea)a.add(t)}be.set(e,a)}return be.get(e)}function aa(e){return B(e).toLowerCase().replace(/\u0153/g,"oe").replace(/\xE6/g,"ae").normalize("NFD").replace(new RegExp("\\\\p{M}","gu"),"").split(/[\\s\'-]+/).filter(Boolean)}var ye=e=>/([bdgklmnprstz])\\1$/.test(e)?e.slice(0,-1):null;function bt(e,a){let t=new Set([e]),r=o=>{o&&o.length>=2&&a.has(o)&&t.add(o)};if(we[e]&&t.add(we[e]),gt.has(e)||e.length<3)return t;if(e.endsWith("ies")&&e.length>4&&r(e.slice(0,-3)+"y"),e.endsWith("ves")&&e.length>4&&(r(e.slice(0,-3)+"f"),r(e.slice(0,-3)+"fe")),e.endsWith("es")&&e.length>3&&r(e.slice(0,-2)),e.endsWith("s")&&!/(ss|us|is)$/.test(e)&&e.length>2){let o=e.slice(0,-1);(a.has(o)||!a.has(e)&&e.length>4&&!/ous$/.test(e))&&t.add(o)}if(e.endsWith("ing")&&e.length>5){let o=e.slice(0,-3);r(o),r(o+"e"),r(ye(o)),o.endsWith("y")&&r(o.slice(0,-1)+"ie")}if(e.endsWith("ed")&&e.length>4){let o=e.slice(0,-2);r(o),r(e.slice(0,-1)),r(ye(o)),o.endsWith("i")&&r(o.slice(0,-1)+"y")}for(let o of["est","er"]){if(!e.endsWith(o)||e.length<=o.length+2)continue;let n=e.slice(0,-o.length);for(let l of[n,n+"e",ye(n),n.endsWith("i")?n.slice(0,-1)+"y":null])l&&ea.has(l)&&t.add(l)}return t}function yt(e,a){let t=new Set([e]),r=o=>{o&&o.length>=2&&a.has(o)&&t.add(o)};if(Ze[e]&&t.add(Ze[e]),e.length<3)return t;if(e.endsWith("aux")&&e.length>4&&(r(e.slice(0,-3)+"al"),r(e.slice(0,-3)+"ail")),e.endsWith("x")&&e.length>3&&r(e.slice(0,-1)),e.endsWith("s")&&e.length>3){let o=e.slice(0,-1);(a.has(o)||!a.has(e)&&e.length>4)&&t.add(o)}for(let[o,n]of[["es",""],["e",""],["euses","eur"],["euse","eur"],["ives","if"],["ive","if"],["ennes","en"],["enne","en"],["elles","el"],["elle","el"]])e.endsWith(o)&&e.length>o.length+2&&r(e.slice(0,-o.length)+n);for(let o of["eant","ant","ons","ent","ees","ez","ee","es","e"])e.endsWith(o)&&e.length>o.length+2&&r(e.slice(0,-o.length)+"er");return t}function I(e,a="en"){let t=a==="fr"?"fr":"en",r=aa(e),o=new Set([k(e)]);if(!r.length)return o;let n=ft(t),l=t==="fr"?yt:bt,u=[""];r.forEach((d,p)=>{let h=t==="en"&&p<r.length-1?new Set([d]):l(d,n),m=[];for(let f of u)for(let b of h)m.push(f+b);u=m.slice(0,32)});for(let d of u)o.add(d);return o}function ke(e,a,t="en"){let r=k(e);if(!r)return!1;if(r===k(a))return!0;let o=I(a,t);for(let n of I(e,t))if(o.has(n))return!0;return!1}function ve(e,a,t="en"){let r=k(e),o=k(a);if(!r)return null;if(r===o)return"exact";if(!ke(e,a,t))return null;let[n,l]=r.length>=o.length?[r,o]:[o,r];return n===l+"s"||n===l+"es"||n===l+"x"||l.endsWith("y")&&n===l.slice(0,-1)+"ies"||/fe?$/.test(l)&&n===l.replace(/fe?$/,"ves")||l.endsWith("al")&&n===l.slice(0,-2)+"aux"||["children","mice","men","women","feet","teeth","geese","people","oxen","yeux"].includes(n)||["children","mice","men","women","feet","teeth","geese","people","oxen","yeux"].includes(l)?"plural":"variant"}var Q=20,q=2,wt=["a","b"],kt=new Set(["MATCHED","EXHAUSTED"]);function vt(e,a,t,r="en"){return ke(a,t,r)?"MATCHED":e>=Q?"EXHAUSTED":"REVEALED"}function ta({id:e,mode:a="solo",language:t="en",seed:r=0,now:o=new Date().toISOString()}){return{schema:q,id:e,mode:a,language:t==="fr"?"fr":"en",seed:r,status:"ACTIVE",createdAt:o,updatedAt:o,revealSeen:0,moves:[ra(1,null,o)]}}function ra(e,a,t){return{number:e,prompts:a,words:null,status:"OPEN",openedAt:t,revealedAt:null}}function W(e){return e.moves[e.moves.length-1]}function C(e){return kt.has(e.status)}function Te(e,a){let t=new Set;for(let r of e.moves)if(r.words)for(let o of a?[a]:wt)t.add(k(r.words[o]));return t}function te(e,a,t){if(C(e))return{ok:!1,code:"GAME_OVER"};let r=Xe(t);if(!r.ok)return r;let o=e.language||"en",n=I(r.word,o),l=e.moves.flatMap(d=>d.words?[I(d.words[a],o)]:[]),u=d=>[...d].some(p=>n.has(p));return l.length&&u(l[l.length-1])?{ok:!1,code:"SAME_AS_LAST",word:r.word}:l.some(u)?{ok:!1,code:"ALREADY_USED",word:r.word}:r}function oa(e,a,t=new Date().toISOString()){if(C(e))throw new Error("Game is already finished");let r=W(e);if(!r||r.status!=="OPEN")throw new Error("Move is not open");let o=a?.a,n=a?.b;if(!o||!n||!k(o)||!k(n))throw new Error("Both words are needed to reveal a move");let l=vt(r.number,o,n,e.language),u={...r,words:{a:o,b:n},status:l,revealedAt:t},d=[...e.moves.slice(0,-1),u];return l==="REVEALED"&&d.push(ra(r.number+1,[o,n],t)),{...e,moves:d,status:l==="REVEALED"?"ACTIVE":l,updatedAt:t}}function Tt(e){let a=e>>>0;return()=>{a=a+1831565813>>>0;let t=a;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}}function St(e){let a=2166136261;for(let t=0;t<e.length;t++)a=Math.imul(a^e.charCodeAt(t),16777619);return a>>>0}function na(e,a){return Tt(St(`${e.seed}:${e.id}:${a}`))}function xt(e){let a=new Set([e,e+"s",e+"x",e+"es"]);return e.length>3&&/[sx]$/.test(e)&&a.add(e.slice(0,-1)),e.length>4&&e.endsWith("es")&&a.add(e.slice(0,-2)),e.length>4&&e.endsWith("ies")&&a.add(e.slice(0,-3)+"y"),e.length>2&&e.endsWith("y")&&a.add(e.slice(0,-1)+"ies"),e.length>4&&e.endsWith("ves")&&a.add(e.slice(0,-3)+"f"),e.length>2&&e.endsWith("f")&&a.add(e.slice(0,-1)+"ves"),e.length>4&&e.endsWith("aux")&&a.add(e.slice(0,-3)+"al"),e.length>3&&e.endsWith("al")&&a.add(e.slice(0,-2)+"aux"),a}function re(e,a){for(let t of xt(e))if(a.has(t))return!0;return!1}var la={minPerSide:.45,weights:{weakest:.4,human:.3,average:.15,obvious:.1,novelty:.05},pick:[.55,.3,.15],shortlistRatio:.85,recency:[[2,2,.25],[3,5,.12],[6,8,.05]],containedPenalty:.25};function ia(e,a,t){let r={strength:0,human:0};for(let o of a){let n=e.concepts.get(o);if(!n||n.id===t.id)continue;let l=n.phrases.has(t.id),u=n.links.has(t.id),d=n.out.get(t.id),p=d!==void 0,h=t.out.has(n.id),m=0;for(let y of t.near)n.near.has(y)&&m++;let f=t.tags.some(y=>n.tags.includes(y)),b=l&&u?1:l?.95:p?.9:h?.8:m>=3?.55:m===2?.45:m===1?.25:f?.1:0,v=p?Math.max(.6,1-d*.04):l?.85:h?.65:m>=3?.35:m===2?.25:m===1?.1:0;(b>r.strength||b===r.strength&&v>r.human)&&(r={strength:b,human:v})}return r}function Et(e,a){let t=new Map;return a.slice().reverse().forEach((r,o)=>{for(let n of r)for(let l of e.resolveAll(n))t.has(l)||t.set(l,o+1)}),t}var Se=new Map;function At(e,a){let t=`${a}:${e}`;return Se.has(t)||Se.set(t,I(e,a)),Se.get(t)}function jt({prompts:e,language:a="en",excludeKeys:t=new Set,history:r=[],tuning:o=la}){let n=D(a),l=(Array.isArray(e)?e:[]).slice(0,2).map(y=>String(y??"")),[u=[],d=[]]=l.map(y=>n.resolveAll(y)),p=new Set([...u,...d]),h=new Set(l.map(k).filter(Boolean)),m=new Set;for(let y of[...l,...t])for(let M of I(y,a))m.add(M);let f=Et(n,r),b=o.weights,v=[];for(let y of n.concepts.values()){if(p.has(y.id)||re(y.key,h)||re(y.key,t)||[...At(y.label,a)].some(z=>m.has(z)))continue;let M=f.get(y.id);if(M===1)continue;let U=ia(n,u,y),Y=ia(n,d,y);if(U.strength+Y.strength<=0)continue;let He=Math.min(U.strength,Y.strength),Ue=(U.strength+Y.strength)/2,et=Math.min(1,y.links.size/10),Ye=(U.human+Y.human)/2*(.75+.25*et),Be=Math.max(0,(y.label.includes(" ")?.65:1)-(y.label.length>9?.2:0)),ae=o.recency.find(([z,rt])=>M!==void 0&&M>=z&&M<=rt),Fe=ae?1-ae[2]*4:1,at=[...h].some(z=>z.length>=3&&y.key.length>=3&&(z.includes(y.key)||y.key.includes(z))),tt=He*b.weakest+Ye*b.human+Ue*b.average+Be*b.obvious+Math.max(0,Fe)*b.novelty-(ae?ae[2]:0)-(at?o.containedPenalty:0);v.push({word:y.label,id:y.id,a:U.strength,b:Y.strength,weakest:He,average:Ue,human:Ye,obvious:Be,novelty:Fe,score:tt,passes:U.strength>=o.minPerSide&&Y.strength>=o.minPerSide})}return v.sort((y,M)=>M.score-y.score||y.word.localeCompare(M.word)),{ranked:v,knownA:u.length>0,knownB:d.length>0}}function sa(e,a,t){let r=e[0].score,o=e.filter(d=>d.score>=r*t.shortlistRatio).slice(0,t.pick.length),n=t.pick.slice(0,o.length),l=n.reduce((d,p)=>d+p,0),u=a()*l;for(let d=0;d<o.length;d++)if(u-=n[d],u<=0)return o[d];return o[o.length-1]}var Ct=new Set(["nightmare","scary","fear","ghost","monster","haunted_house","skeleton","zombie","witch","spider","snake","shark","sad","angry","cry","storm","volcano","dark"]);function xe({language:e="en",excludeKeys:a=new Set,rng:t=Math.random}){let r=D(e),o=[...r.concepts.values()].filter(u=>u.links.size>=7&&!u.label.includes(" ")&&!Ct.has(u.id)&&!re(u.key,a)),n=[...r.concepts.values()].filter(u=>!re(u.key,a)),l=o.length?o:n;if(!l.length)throw new Error("No words left for the bot");return{word:l[Math.floor(t()*l.length)].label,quality:"opening"}}function ca({prompts:e,language:a="en",excludeKeys:t=new Set,history:r=[],rng:o=Math.random,tuning:n=la}){let{ranked:l}=jt({prompts:e,language:a,excludeKeys:t,history:r,tuning:n}),u=l.filter(p=>p.passes);if(u.length)return{word:sa(u,o,n).word,quality:"strong"};if(l.length){let p=l.slice().sort((m,f)=>f.weakest-m.weakest||f.score-m.score),h=p[0].weakest>0?p.filter(m=>m.weakest>0).map(m=>({...m,score:m.weakest+m.score/10})):l;return{word:sa(h,o,n).word,quality:"loose"}}let d=(Array.isArray(e)?e:[]).map(p=>k(String(p??""))).filter(Boolean);return{...xe({language:a,excludeKeys:new Set([...t,...d]),rng:o}),quality:"loose"}}function Ee(e){if(C(e))return e;let a=W(e),t=na(e,a.number),r=Te(e),o=a.prompts?ca({prompts:a.prompts,language:e.language,excludeKeys:r,rng:t,history:e.moves.flatMap(d=>d.words?[[d.words.a,d.words.b]]:[])}):xe({language:e.language,excludeKeys:r,rng:t}),{hidden:n,...l}=a,u={...l,hidden:{b:o.word,quality:o.quality}};return{...e,moves:[...e.moves.slice(0,-1),u]}}function ua({id:e,language:a="en",seed:t,now:r=new Date().toISOString()}){let o=ta({id:e,mode:"solo",language:a,seed:t??Math.floor(Math.random()*4294967296),now:r});return Ee(o)}function da(e,a,t=new Date().toISOString()){let r=te(e,"a",a);if(!r.ok)return r;let o=W(e).hidden?.b;(!o||Te(e).has(k(o)))&&(e=Ee(e));let n=W(e),l=n.hidden?.b;if(!l)return{ok:!1,code:"BOT_NOT_READY"};let u=n.hidden?.quality??"loose",d=oa(e,{a:r.word,b:l},t),p=d.moves.find(m=>m.number===n.number);if(!p)return{ok:!1,code:"BOT_NOT_READY"};let h={...p,botQuality:u};return delete h.hidden,d={...d,moves:d.moves.map(m=>m.number===n.number?h:m)},d=Ee(d),{ok:!0,game:d,move:h}}function pa(e){if(!e.hidden)return e;let{hidden:a,...t}=e;return t}var Ae=null;function ha(){if(Ae!==null)return Ae;let e=!1;try{e||(e=new URLSearchParams(location.search).get("debug")==="1")}catch{}try{e||(e=localStorage.getItem("ssbd_debug")==="1")}catch{}try{e||(e=navigator.webdriver===!0)}catch{}return Ae=e,e}function _(e,a={}){if(!ha())return;let t={event:e,at:Date.now(),...a},r=window.__submitTrace??(window.__submitTrace=[]);r.push(t),r.length>200&&r.splice(0,r.length-200);try{console.debug("[submit]",e,t)}catch{}}ha();var Mt={brandTop:"Same Same",brandBottom:"but different",skip:"Skip to game",langLabel:"Language",profileButton:"Your profile",profileButtonNamed:"Your profile: {name}",offline:"Offline \\xB7 Solo still works",offlineShort:"Offline",backOnline:"You\'re back online!",nowOffline:"You\'re offline. Solo games keep working.",heroKicker:"A word adventure for the whole family",heroTitle:"Think alike. Be surprising.",heroCopy:"You and your partner each pick a word, then reveal them at the same time. Those two words become your next clue: find a word that connects them. Say the same word to win!",soloTitle:"Play Solo",soloCopy:"Play against Gary from Accounting. Works without internet.",soloStart:"Start a Solo game",familyTitle:"Family game",familyCopy:"Play with someone on another device.",familyCreate:"Create a game",familyJoin:"Join with a code",familyOffline:"Family games need the internet. Solo works right now!",familyNews:"Something new in your family games!",gamesTitle:"Your games",gamesEmpty:"No games yet. Start one above!",gameInLang:"In {lang}",openGame:"{action}: {title}, {date}",resume:"Resume",view:"View",solo:"Solo",you:"You",bot:"Gary",friend:"Your friend",vs:"You vs {name}",waitingJoin:"Waiting for a friend to join",progressLabel:"Game progress",moveOf:"Move {n} of {max}",movesLeft:"{n} moves left",oneMoveLeft:"Last move!",statusActive:"In progress",statusYourTurn:"Your turn",statusTheirTurn:"Waiting for {name}",statusMatched:"Matched!",statusExhausted:"20 moves played",back:"\\u2190 Games",firstTitle:"Start with any word",firstSolo:"Type any word you like. Gary is picking his own word right now. Then you both reveal!",firstFamily:"Type any word you like. {name} is picking one too. Then you both reveal!",promptTitle:"What connects these two?",promptCopy:"Type one word that goes with both.",placeholder:"Your word",lockIn:"Lock it in",locking:"Locking\\u2026",botReady:"Gary has picked his word. \\u{1F512}",otherLocked:"{name} has locked a word. \\u{1F512}",otherThinking:"{name} is still thinking\\u2026",youLocked:"You locked in {word}. Waiting for {name}\\u2026",shareTitle:"Invite a friend",shareCopy:"Share this code. The game starts when they join.",copyLink:"Copy invite link",copied:"Invite link copied!",didYouMean:"Did you mean {word}?",useSuggestion:"Use {word}",keepMine:"Keep mine",revealTitle:"Reveal!",revealSaid:"{name}: {word}.",revealMatch:"SAME WORD! You win!",revealDifferent:"Nice connection! The trail continues.",revealLoose:"Gary stretched a little on that one.",nextUp:"Next up",winTitle:"Same same!",winCopy:"You both said {word} on move {n}. \\u{1F389}",exhaustedTitle:"Game over!",exhaustedCopy:"You made it through all 20 moves! That\'s the end of this round.",newSolo:"New Solo game",newFamily:"New family game",trailTitle:"Word trail",trailEmpty:"Your word trail will grow here, one move at a time.",start:"Start",matchBadge:"Match!",langNoteTitle:"This game is in {game}.",langNoteCopy:"Its words stay in {game}. Start a new game to play in {ui}.",langNoteFamily:"Words are shown just as they were typed. They are not translated.",langNewGame:"New game in {ui}",langEnglish:"English",langFrench:"French",nameTitle:"What should we call you?",nameCopy:"Your name is shown to the people you play with.",nameLabel:"Your name",namePlaceholder:"e.g. Sam",continue:"Continue",cancel:"Cancel",close:"Close",joinTitle:"Join a family game",joinCopy:"Type the code your friend shared, like ABCD-12.",joinLabel:"Game code",join:"Join",haveRecovery:"I have a recovery code",recoveryTitle:"Welcome back",recoveryCopy:"Type the recovery code you saved.",recoveryLabel:"Recovery code",recover:"Recover",profileTitle:"Hi, {name}!",profileCopy:"Save this recovery code to use your family games on another device:",profileSolo:"Solo games are saved on this device only.",loading:"Loading\\u2026",retry:"Try again",dismiss:"Dismiss",errEMPTY:"Type a word first, then lock it in.",errTOO_LONG:"That\'s a long one! Try a word with 24 letters or fewer.",errINVALID_CHARACTERS:"Letters only, please! Spaces, hyphens and apostrophes are fine too.",errTOO_SHORT:"Type at least one letter, then lock it in!",errTOO_MANY_WORDS:"Try one word, or a short phrase of up to three words.",errSAME_AS_LAST:"You just played {word}. Try a different word!",errALREADY_USED:"You already used {word} in this game. Try a new one!",errGAME_OVER:"This game is all done. Start a new one!",errALREADY_LOCKED:"Your word for this move is already locked in.",errSTALE_MOVE:"That move already finished. Here\'s the latest.",errWAITING_FOR_PLAYER:"Your friend hasn\'t joined yet.",errGAME_NOT_FOUND:"We couldn\'t find that game. Check the code?",errGAME_FULL:"That game already has two players.",errRECOVERY_NOT_FOUND:"We couldn\'t find that recovery code.",errUNKNOWN_PLAYER:"Pick a name first!",errNOT_A_MEMBER:"That game belongs to someone else.",errNETWORK:"We can\'t reach the game right now. Check your internet and try again!",errSERVER:"Oops! That didn\'t work. Let\'s try again.",errSTORAGE:"This browser can\'t save your games, so your Solo game may disappear if you reload the page.",updateReady:"A new version is ready.",reload:"Reload",sameTime:"Same time!",revealYourWord:"Your word",revealBotWord:"Gary\'s word",revealTheirWord:"{name}\'s word",revealNextStarts:"Next move starts with {a} + {b}",keepPlaying:"Keep playing",revealSeeEnd:"Continue",lockedIn:"You locked in {word}! \\u{1F512}",revealMatchPlural:"Plural schmural. Same same!",revealMatchVariant:"Close enough. Same same!",winCopyVariant:"{a} and {b}: close enough! Same same on move {n}. \\u{1F389}",garyName:"Gary",garyTitle:"Gary from Accounting",garyMeet:"Meet your rival",garyIntro1:"Hi. I\'m Gary.",garyIntro2:"I do words now.",garyIntro3:"Apparently.",garyIntroSigh:"sigh \\u{1F611}",garyIntroCta:"Fine, Gary. Let\'s play.",garyMeetAgain:"Meet Gary again",garySigh:"sigh \\u{1F611}",garyFine:"fine",garyThere:"there",garyUgh:"ugh",garyApparently:"apparently",garyThisAgain:"this again",garyReally:"really?",garyOkayThen:"okay then",garyNoted:"noted",garyObject:"I object",garyRude:"rude",garyWow:"wow",garyNeedMinute:"I need a minute",garyDoneNow:"can we be done now",garyUnnecessary:"this feels unnecessary",garyConcerns:"I have concerns",garyWasGoingTo:"I was going to say that",garyAnnoyinglyGood:"that\'s annoyingly good",garyPleased:"you\'re very pleased with yourself",garyHappy:"there. happy? \\u{1F644}",garyDots:"...",garyInconvenient:"well that\'s inconvenient",garyYouWin:"fine. you win this one \\u{1F611}",garyStillDoing:"we\'re still doing this?",garyToldEnding:"I was told this had an ending",garyFinally:"finally",garySameTime:"...same time tomorrow?",progressToGo:"{n} moves to go",progressAdventure:"{n} words into the adventure",progressStart:"Your word adventure starts here!",progressFinale:"All 20 moves played!",progressLabel2:"Word adventure progress",revealNice:"Nice connection! The trail continues.",revealNewWords:"New words, new possibilities!",revealNextPair:"Your next two words",gameOverTitle:"Game over!",gameOverCopy:"You made it through all 20 moves! That\'s the end of this round.",gameOverAww:"Aww, no match this time.",playAgain:"Play again",returnHome:"Return home",viewHistory:"View history",nowPlaying:"Now playing",startingPair:"Starting pair",revealedPair:"Revealed pair",nextPrompt:"Next round\'s words",notifTitle:"Notifications",notifButton:"Notifications",notifButtonUnread:"Notifications: {n} new",notifEmpty:"No news yet. Go play!",notifLoading:"Checking for news\\u2026",notifError:"We couldn\'t load your news. Try again soon!",notifMarkAll:"Mark all as read",notifNew:"New",notifYourTurn:"{name} played. Your turn!",notifReveal:"Reveal time in your game with {name}!",notifJoined:"{name} joined your game!",notifMatch:"You and {name} said the same word!",notifComplete:"Your game with {name} made it through all 20 moves!",notifRematch:"{name} wants a rematch!",rematch:"Rematch",rematchSent:"Rematch started! Your friend will get a notification.",botInitial:"B",badgeFor:"{name}",progressMatched:"Matched on move {n}!",hiddenWord:"Hidden until the reveal",notifOpen:"Open game"},_t={brandTop:"Same Same",brandBottom:"but different",skip:"Aller au jeu",langLabel:"Langue",profileButton:"Ton profil",profileButtonNamed:"Ton profil : {name}",offline:"Hors ligne \\xB7 le solo marche quand m\\xEAme",offlineShort:"Hors ligne",backOnline:"Te revoil\\xE0 en ligne !",nowOffline:"Tu es hors ligne. Les parties solo continuent.",heroKicker:"Une aventure de mots pour toute la famille",heroTitle:"Pensez pareil. Surprenez-vous.",heroCopy:"Ton partenaire et toi choisissez chacun un mot, puis vous les r\\xE9v\\xE9lez en m\\xEAme temps. Ces deux mots deviennent votre prochain indice : trouvez un mot qui les relie. Dites le m\\xEAme mot pour gagner !",soloTitle:"Jouer en solo",soloCopy:"Joue contre Gary de la comptabilit\\xE9. \\xC7a marche m\\xEAme sans internet.",soloStart:"Commencer une partie solo",familyTitle:"Partie en famille",familyCopy:"Joue avec quelqu\\u2019un sur un autre appareil.",familyCreate:"Cr\\xE9er une partie",familyJoin:"Rejoindre avec un code",familyOffline:"Les parties en famille ont besoin d\\u2019internet. Le solo marche tout de suite !",familyNews:"Du nouveau dans tes parties en famille !",gamesTitle:"Tes parties",gamesEmpty:"Aucune partie pour l\\u2019instant. Lance-toi !",gameInLang:"En {lang}",openGame:"{action} : {title}, {date}",resume:"Reprendre",view:"Voir",solo:"Solo",you:"Toi",bot:"Gary",friend:"Ton ami\\xB7e",vs:"Toi contre {name}",waitingJoin:"On attend que quelqu\\u2019un te rejoigne",progressLabel:"Progression de la partie",moveOf:"Coup {n} sur {max}",movesLeft:"Encore {n} coups",oneMoveLeft:"Dernier coup !",statusActive:"En cours",statusYourTurn:"\\xC0 toi",statusTheirTurn:"On attend {name}",statusMatched:"M\\xEAme mot !",statusExhausted:"20 coups jou\\xE9s",back:"\\u2190 Parties",firstTitle:"Commence avec le mot de ton choix",firstSolo:"Tape le mot que tu veux. Gary choisit le sien en ce moment. Ensuite, vous r\\xE9v\\xE9lez vos mots en m\\xEAme temps !",firstFamily:"Tape le mot que tu veux. {name} en choisit un aussi. Ensuite, vous r\\xE9v\\xE9lez vos mots en m\\xEAme temps !",promptTitle:"Qu\\u2019est-ce qui relie ces deux mots ?",promptCopy:"Tape un mot qui va avec les deux.",placeholder:"Ton mot",lockIn:"Je verrouille",locking:"Verrouillage\\u2026",botReady:"Gary a choisi son mot. \\u{1F512}",otherLocked:"{name} a verrouill\\xE9 son mot. \\u{1F512}",otherThinking:"{name} r\\xE9fl\\xE9chit encore\\u2026",youLocked:"Tu as verrouill\\xE9 {word}. On attend {name}\\u2026",shareTitle:"Inviter quelqu\\u2019un",shareCopy:"Partage ce code. La partie commence d\\xE8s que la personne te rejoint.",copyLink:"Copier le lien d\\u2019invitation",copied:"Lien d\\u2019invitation copi\\xE9 !",didYouMean:"Tu voulais dire {word} ?",useSuggestion:"Prendre {word}",keepMine:"Garder le mien",revealTitle:"R\\xE9v\\xE9lation !",revealSaid:"{name} : {word}.",revealMatch:"LE M\\xCAME MOT ! Tu as gagn\\xE9 !",revealDifferent:"Belle connexion ! Le parcours continue.",revealLoose:"Gary a \\xE9t\\xE9 un peu cr\\xE9atif sur ce coup-l\\xE0.",nextUp:"\\xC0 suivre",winTitle:"Pareil pareil !",winCopy:"Vous avez tous les deux dit {word} au coup {n}. \\u{1F389}",exhaustedTitle:"Partie termin\\xE9e !",exhaustedCopy:"Tu as jou\\xE9 les 20 coups ! C\\u2019est la fin de cette partie.",newSolo:"Nouvelle partie solo",newFamily:"Nouvelle partie en famille",trailTitle:"Parcours de mots",trailEmpty:"Ton parcours de mots grandira ici, un coup \\xE0 la fois.",start:"D\\xE9part",matchBadge:"Pareil !",langNoteTitle:"Cette partie est en {game}.",langNoteCopy:"Ses mots restent en {game}. Lance une nouvelle partie pour jouer en {ui}.",langNoteFamily:"Les mots sont affich\\xE9s tels qu\\u2019ils ont \\xE9t\\xE9 tap\\xE9s. Ils ne sont pas traduits.",langNewGame:"Nouvelle partie en {ui}",langEnglish:"anglais",langFrench:"fran\\xE7ais",nameTitle:"Comment t\\u2019appelles-tu ?",nameCopy:"Ton nom est montr\\xE9 aux personnes avec qui tu joues.",nameLabel:"Ton nom",namePlaceholder:"ex. Sam",continue:"Continuer",cancel:"Annuler",close:"Fermer",joinTitle:"Rejoindre une partie en famille",joinCopy:"Tape le code qu\\u2019on t\\u2019a envoy\\xE9, par exemple ABCD-12.",joinLabel:"Code de la partie",join:"Rejoindre",haveRecovery:"J\\u2019ai un code de r\\xE9cup\\xE9ration",recoveryTitle:"Bon retour",recoveryCopy:"Tape le code de r\\xE9cup\\xE9ration que tu as gard\\xE9.",recoveryLabel:"Code de r\\xE9cup\\xE9ration",recover:"R\\xE9cup\\xE9rer",profileTitle:"Salut, {name} !",profileCopy:"Garde ce code de r\\xE9cup\\xE9ration pour retrouver tes parties en famille sur un autre appareil :",profileSolo:"Les parties solo sont gard\\xE9es sur cet appareil seulement.",loading:"Chargement\\u2026",retry:"R\\xE9essayer",dismiss:"Fermer",errEMPTY:"Tape d\\u2019abord un mot, puis verrouille-le.",errTOO_LONG:"C\\u2019est long ! Essaie un mot de 24 lettres ou moins.",errINVALID_CHARACTERS:"Seulement des lettres, s\\u2019il te pla\\xEEt ! Les espaces, traits d\\u2019union et apostrophes, c\\u2019est permis aussi.",errTOO_SHORT:"Tape au moins une lettre, puis verrouille ton mot !",errTOO_MANY_WORDS:"Essaie un seul mot, ou une petite expression de trois mots maximum.",errSAME_AS_LAST:"Tu viens de jouer {word}. Essaie un autre mot !",errALREADY_USED:"Tu as d\\xE9j\\xE0 utilis\\xE9 {word} dans cette partie. Essaie un nouveau mot !",errGAME_OVER:"Cette partie est finie. Lance-en une nouvelle !",errALREADY_LOCKED:"Ton mot pour ce coup est d\\xE9j\\xE0 verrouill\\xE9.",errSTALE_MOVE:"Ce coup est d\\xE9j\\xE0 termin\\xE9. Voici la suite.",errWAITING_FOR_PLAYER:"Personne ne t\\u2019a encore rejoint.",errGAME_NOT_FOUND:"On ne trouve pas cette partie. Tu peux v\\xE9rifier le code ?",errGAME_FULL:"Cette partie a d\\xE9j\\xE0 deux joueurs.",errRECOVERY_NOT_FOUND:"On ne trouve pas ce code de r\\xE9cup\\xE9ration.",errUNKNOWN_PLAYER:"Choisis d\\u2019abord un nom.",errNOT_A_MEMBER:"Cette partie appartient \\xE0 quelqu\\u2019un d\\u2019autre.",errNETWORK:"On n\\u2019arrive pas \\xE0 joindre le jeu. V\\xE9rifie ta connexion internet et r\\xE9essaie !",errSERVER:"Oups ! \\xC7a n\\u2019a pas march\\xE9. On r\\xE9essaie ?",errSTORAGE:"Ce navigateur ne peut pas garder tes parties : ta partie solo pourrait dispara\\xEEtre si tu recharges la page.",updateReady:"Une nouvelle version est pr\\xEAte.",reload:"Recharger",sameTime:"En m\\xEAme temps !",revealYourWord:"Ton mot",revealBotWord:"Mot de Gary",revealTheirWord:"Mot de {name}",revealNextStarts:"Le prochain coup commence avec {a} + {b}",keepPlaying:"On continue",revealSeeEnd:"Continuer",lockedIn:"Tu as verrouill\\xE9 {word} ! \\u{1F512}",revealMatchPlural:"Pluriel, singulier\\u2026 pareil pareil !",revealMatchVariant:"Presque pareil, \\xE7a compte ! Pareil pareil !",winCopyVariant:"{a} et {b} : \\xE7a compte ! Pareil pareil au coup {n}. \\u{1F389}",garyName:"Gary",garyTitle:"Gary de la comptabilit\\xE9",garyMeet:"Voici ton rival",garyIntro1:"Salut. Moi, c\\u2019est Gary.",garyIntro2:"Je fais des mots maintenant.",garyIntro3:"Apparemment.",garyIntroSigh:"soupir \\u{1F611}",garyIntroCta:"D\\u2019accord, Gary. On joue.",garyMeetAgain:"Revoir Gary",garySigh:"soupir \\u{1F611}",garyFine:"bon",garyThere:"voil\\xE0",garyUgh:"pff",garyApparently:"apparemment",garyThisAgain:"encore \\xE7a",garyReally:"s\\xE9rieux ?",garyOkayThen:"bon, d\\u2019accord",garyNoted:"not\\xE9",garyObject:"je proteste",garyRude:"pas gentil",garyWow:"wow",garyNeedMinute:"j\\u2019ai besoin d\\u2019une minute",garyDoneNow:"on peut arr\\xEAter l\\xE0 ?",garyUnnecessary:"c\\u2019\\xE9tait vraiment utile ?",garyConcerns:"j\\u2019ai des doutes",garyWasGoingTo:"j\\u2019allais le dire",garyAnnoyinglyGood:"c\\u2019est bien. \\xE7a m\\u2019\\xE9nerve",garyPleased:"\\xE7a te fait plaisir, hein",garyHappy:"voil\\xE0. \\xE7a te va ? \\u{1F644}",garyDots:"...",garyInconvenient:"bon. \\xE7a m\\u2019arrange pas",garyYouWin:"bon. tu gagnes celle-l\\xE0 \\u{1F611}",garyStillDoing:"on fait encore \\xE7a ?",garyToldEnding:"on m\\u2019avait dit qu\\u2019il y avait une fin",garyFinally:"enfin",garySameTime:"...m\\xEAme heure demain ?",progressToGo:"Encore {n} coups",progressAdventure:"{n} mots dans l\\u2019aventure",progressStart:"Ton aventure de mots commence ici !",progressFinale:"Les 20 coups sont jou\\xE9s !",progressLabel2:"Progression de l\\u2019aventure",revealNice:"Belle connexion ! Le parcours continue.",revealNewWords:"Nouveaux mots, nouvelles id\\xE9es !",revealNextPair:"Tes deux prochains mots",gameOverTitle:"Partie termin\\xE9e !",gameOverCopy:"Tu as jou\\xE9 les 20 coups ! C\\u2019est la fin de cette partie.",gameOverAww:"Oh, pas de mot pareil cette fois.",playAgain:"Rejouer",returnHome:"Retour \\xE0 l\\u2019accueil",viewHistory:"Voir le parcours",nowPlaying:"En ce moment",startingPair:"Mots de d\\xE9part",revealedPair:"Mots r\\xE9v\\xE9l\\xE9s",nextPrompt:"Mots du prochain tour",notifTitle:"Notifications",notifButton:"Notifications",notifButtonUnread:"Notifications : {n} nouvelles",notifEmpty:"Rien de neuf pour l\\u2019instant. Va jouer !",notifLoading:"On regarde s\\u2019il y a du nouveau\\u2026",notifError:"On n\\u2019arrive pas \\xE0 charger les nouvelles. R\\xE9essaie bient\\xF4t !",notifMarkAll:"Tout marquer comme lu",notifNew:"Nouveau",notifYourTurn:"{name} a jou\\xE9. \\xC0 toi !",notifReveal:"C\\u2019est l\\u2019heure de la r\\xE9v\\xE9lation avec {name} !",notifJoined:"{name} a rejoint ta partie !",notifMatch:"{name} et toi avez dit le m\\xEAme mot !",notifComplete:"Ta partie avec {name} a jou\\xE9 les 20 coups !",notifRematch:"{name} veut une revanche !",rematch:"Revanche",rematchSent:"Revanche lanc\\xE9e ! Ton ami\\xB7e va recevoir une notification.",botInitial:"R",badgeFor:"{name}",progressMatched:"Pareil au coup {n} !",hiddenWord:"Cach\\xE9 jusqu\\u2019\\xE0 la r\\xE9v\\xE9lation",notifOpen:"Ouvrir la partie"};function Nt(e){return e.replace(/[ \xA0]+([!?;:\xBB])/g,"\\u202F$1").replace(/(\xAB)[ \xA0]+/g,"$1\\u202F")}var ma={en:Mt,fr:Object.fromEntries(Object.entries(_t).map(([e,a])=>[e,Nt(a)]))};function oe(e,a){return e(a==="fr"?"langFrench":"langEnglish")}function ga(e){return(a,t={})=>{let r=e();return(ma[r]?.[a]??ma.en[a]??a).replace(/\\{(\\w+)\\}/g,(n,l)=>t[l]??"")}}var G="ssbd.store",fa="ssbd_language",ba="ssbd_player",Ot=30,Lt=new Set(["OPEN","REVEALED","MATCHED","EXHAUSTED"]);function ne(e){try{return localStorage.getItem(e)}catch{return null}}function P(e,a){try{return localStorage.setItem(e,a),!0}catch{return!1}}var N=e=>!!e&&typeof e=="object"&&!Array.isArray(e);function ie(){return{schema:q,solo:{},seen:{},last:null}}function Rt(e,a){if(!N(a)||!Array.isArray(a.moves)||!a.moves.length)return null;if(a.schema===q)return a.id===e?a:{...a,id:e};if(typeof a.schema=="number"&&a.schema>q||!a.moves.every((l,u)=>N(l)&&l.number===u+1&&Lt.has(l.status)&&(l.words===null||l.words===void 0||N(l.words)&&typeof l.words.a=="string"&&typeof l.words.b=="string")))return null;let r=a.moves[a.moves.length-1],o=r.status==="OPEN"||r.status==="REVEALED"?"ACTIVE":r.status,n=a.updatedAt||a.createdAt||new Date(0).toISOString();return{mode:"solo",seed:0,revealSeen:0,createdAt:n,...a,schema:q,id:e,status:o,updatedAt:n,language:a.language==="fr"?"fr":"en",moves:a.moves.map(l=>({prompts:null,openedAt:null,revealedAt:null,...l,words:l.words||null}))}}function ka(e){return N(e)&&(e.kind==="solo"||e.kind==="family")&&typeof e.id=="string"&&e.id?e:null}function ya(e){if(!N(e))return ie();if(typeof e.schema=="number"&&e.schema>q)return P(`${G}.backup.v${e.schema}`,JSON.stringify(e)),ie();let a=ie(),t={};for(let[r,o]of Object.entries(N(e.solo)?e.solo:{})){let n=Rt(r,o);n?a.solo[r]=n:o!=null&&(t[r]=o)}if(Object.keys(t).length&&P(`${G}.backup.v${Number(e.schema)||0}`,JSON.stringify({schema:e.schema,solo:t})),N(e.seen))for(let[r,o]of Object.entries(e.seen))Number.isFinite(o)&&(a.seen[r]=o);return a.last=ka(e.last),a}var wa=e=>[e.moves.length,e.moves.filter(a=>a.words).length,String(e.updatedAt||"")];function va(e,a){let t=wa(e),r=wa(a);for(let o=0;o<t.length;o++){if(t[o]>r[o])return e;if(t[o]<r[o])return a}return e}function It(e,a){let t={...e,solo:{...a.solo},seen:{...a.seen}};for(let[n,l]of Object.entries(e.solo))t.solo[n]=t.solo[n]?va(l,t.solo[n]):l;for(let[n,l]of Object.entries(e.seen))t.seen[n]=Math.max(l,t.seen[n]||0);let r=e.last,o=a.last;return t.last=r?o&&String(o.at||"")>String(r.at||"")?o:r:o,t}function Ta(){let e;try{e=ya(JSON.parse(ne(G)||"null"))}catch{e=ie()}let a=P(G,JSON.stringify(e));function t(){let n=ne(G);if(n==null)return;let l;try{l=JSON.parse(n)}catch{return}N(l)&&typeof l.schema=="number"&&l.schema>q||(e=It(e,ya(l)))}function r(n,l){let u=Object.keys(e.solo).filter(p=>!l.has(p));u.sort((p,h)=>{let m=C(e.solo[p])?1:0,f=C(e.solo[h])?1:0;return m!==f?m-f:String(e.solo[h].updatedAt||"").localeCompare(String(e.solo[p].updatedAt||""))});let d=Math.max(0,n-l.size);for(let p of u.slice(d))delete e.solo[p]}function o(n){let l=new Set;n&&l.add(n),e.last?.kind==="solo"&&l.add(e.last.id),r(Ot,l),a=P(G,JSON.stringify(e));let u=Object.keys(e.solo).length;for(;!a&&u>l.size;)u=Math.max(l.size,Math.floor(u/2)),r(u,l),a=P(G,JSON.stringify(e));return a}return{get healthy(){return a},language(){let n=ne(fa);return n==="fr"||n==="en"?n:null},setLanguage(n){return P(fa,n==="fr"?"fr":"en")},player(){try{let n=JSON.parse(ne(ba)||"null");return N(n)?n:null}catch{return null}},setPlayer(n){return P(ba,JSON.stringify(n))},soloGames(){return t(),Object.values(e.solo)},soloGame(n){return t(),e.solo[n]||null},saveSolo(n){return t(),e.solo[n.id]=e.solo[n.id]?va(n,e.solo[n.id]):n,o(n.id)},seen(n){return t(),e.seen[n]||0},markSeen(n,l){return t(),e.seen[n]=Math.max(l,e.seen[n]||0),o()},last(){return t(),e.last},setLast(n){t();let l=ka(n);return e.last=l&&{kind:l.kind,id:l.id,at:new Date().toISOString()},o(l?.kind==="solo"?l.id:null)}}}var x={name:"garyName",title:"garyTitle",intro:{kicker:"garyMeet",lines:["garyIntro1","garyIntro2","garyIntro3"],aside:"garyIntroSigh",cta:"garyIntroCta"},reactions:{resigned:[["garySigh","before"],["garyFine","before"],["garyApparently","before"],["garyThisAgain","before"],["garyOkayThen","before"],["garyThere","after"]],competitive:[["garyObject","after"],["garyRude","after"],["garyWasGoingTo","after"],["garyAnnoyinglyGood","after"],["garyPleased","after"]],dramatic:[["garyNeedMinute","after"],["garyConcerns","after"],["garyUnnecessary","after"],["garyDoneNow","after"],["garyHappy","after"]],minimal:[["garyUgh","before"],["garyReally","before"],["garyWow","after"],["garyNoted","after"]]},special:{match:[["garyDots","garyInconvenient"],["garyDots","garyYouWin"]],middle:["garyStillDoing"],nearEnd:["garyToldEnding"],gameOver:["garyFinally","garySameTime"]}},qt=.3,zt=.7,Sa=.2,Dt=6;function xa({status:e,move:a,recent:t=[],random:r=Math.random}){let o=new Set(t);if(e==="MATCHED"){if(r()>=zt)return null;let h=x.special.match.filter(([,f])=>!o.has(f));return{when:"after",keys:[...(h.length?h:x.special.match)[Math.floor(r()*(h.length||x.special.match.length))]]}}if(e==="EXHAUSTED")return null;if(a>=9&&a<=11&&!o.has("garyStillDoing")&&r()<Sa)return{when:"after",keys:["garyStillDoing"]};if(a>=17&&a<=19&&!o.has("garyToldEnding")&&r()<Sa)return{when:"after",keys:["garyToldEnding"]};if(r()>=qt)return null;let n=Object.keys(x.reactions),l=n[Math.floor(r()*n.length)],u=x.reactions[l].filter(([h])=>!o.has(h));u.length||(u=Object.values(x.reactions).flat().filter(([h])=>!o.has(h))),u.length||(u=x.reactions[l]);let[d,p]=u[Math.floor(r()*u.length)];return{when:p,keys:[d]}}var je="ssbd.gary.recent";function Ea(e){try{return JSON.parse(sessionStorage.getItem(je)||"{}")[e]||[]}catch{return[]}}function Aa(e,a){try{let t=JSON.parse(sessionStorage.getItem(je)||"{}");t[e]=[...t[e]||[],...a].slice(-Dt),sessionStorage.setItem(je,JSON.stringify(t))}catch{}}var ja="ssbd_gary_met";function Ca(){try{return localStorage.getItem(ja)==="1"}catch{return!0}}function Ma(){try{localStorage.setItem(ja,"1")}catch{}}function Ce(){let e=typeof window<"u"?window.__garyRandom:void 0;return typeof e=="function"?e():Math.random()}function Wt(e){try{return[...new Intl.Segmenter(void 0,{granularity:"grapheme"}).segment(e)].map(a=>a.segment)}catch{return Array.from(e)}}function F(e,a,{reduced:t=!1,maxTotal:r=900,alive:o=()=>!0}={}){let n=Wt(a),l=document.createElement("span"),u=document.createElement("span"),d=document.createElement("span");if(l.className="typed",u.className="ghost",d.className="sr-only",l.setAttribute("aria-hidden","true"),u.setAttribute("aria-hidden","true"),d.textContent=a,e.replaceChildren(l,u,d),e.dataset.full=a,t||!n.length)return l.textContent=a,Promise.resolve();u.textContent=a;let p=Math.min(70,r/n.length);return new Promise(h=>{let m=0,f=()=>{if(!o())return l.textContent=a,u.textContent="",h();if(m++,l.textContent=n.slice(0,m).join(""),u.textContent=n.slice(m).join(""),m>=n.length)return h();let b=50+Ce()*40;setTimeout(f,Math.min(b,p*1.3))};setTimeout(f,Math.min(60,p))})}function Z(e="meh",a=""){let t=document.createElement("span");return t.className=`gary-art-wrap ${a}`,t.setAttribute("aria-hidden","true"),t.innerHTML=`<svg class="gary-art gary-${e}" viewBox="0 0 120 120" focusable="false">\n  <path class="g-shirt" d="M14 122c3-21 21-32 46-32s43 11 46 32z"/>\n  <path class="g-tie" d="M56 95l4 5 4-5 5 27H51z"/>\n  <path class="g-collar" d="M43 90l17 9 17-9-5-7-12 7-12-7z"/>\n  <ellipse class="g-ear" cx="27" cy="58" rx="7" ry="10"/>\n  <ellipse class="g-ear" cx="93" cy="58" rx="7" ry="10"/>\n  <ellipse class="g-head" cx="60" cy="55" rx="32" ry="35"/>\n  <path class="g-hair" d="M31 47c-7-9-4-21 5-25M89 47c7-9 4-21-5-25M50 21c3-8 13-9 17-3M60 20c4-6 12-5 14 1"/>\n  <path class="g-brow" d="M37 45l15-5M83 45l-15-5"/>\n  <rect class="g-glass" x="34" y="47" width="21" height="15" rx="5"/>\n  <rect class="g-glass" x="65" y="47" width="21" height="15" rx="5"/>\n  <path class="g-bridge" d="M55 54h10"/>\n  <g class="g-open"><circle class="g-eye" cx="45" cy="56.5" r="2.6"/><circle class="g-eye" cx="75" cy="56.5" r="2.6"/><path class="g-lid" d="M38 53.5h14M68 53.5h14"/></g>\n  <g class="g-shut"><path class="g-lid" d="M38 56q7 4 14 0M68 56q7 4 14 0"/></g>\n  <ellipse class="g-nose" cx="60" cy="67" rx="8.5" ry="7.5"/>\n  <path class="g-mouth" d="M51 81q9-5 18 0"/>\n</svg>`,t}var T=Ta(),c={lang:T.language()||((navigator.language||"en").toLowerCase().startsWith("fr")?"fr":"en"),player:T.player(),online:navigator.onLine!==!1,screen:"home",game:null,reveal:null,justContinued:0,busy:!1,dashboard:null,dismissedSuggestion:null,pollTimer:null},s=ga(()=>c.lang),g=e=>document.getElementById(e),L=()=>window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,Me={},Gt=e=>Me[e]??(Me[e]=Qe(D(e).words));function i(e,a={},...t){let r=document.createElement(e);for(let[o,n]of Object.entries(a||{}))n==null||n===!1||(o==="class"?r.className=n:o.startsWith("on")?r.addEventListener(o.slice(2),n):o==="text"?r.textContent=n:r.setAttribute(o,n===!0?"":n));for(let o of t.flat(1/0))o==null||o===!1||r.append(o instanceof Node?o:document.createTextNode(String(o)));return r}function se(e){try{return new Intl.DateTimeFormat(c.lang==="fr"?"fr-CA":"en-CA",{dateStyle:"medium",timeStyle:"short"}).format(new Date(e))}catch{return""}}function S(e,{kind:a="info",timeout:t=4500,action:r,key:o}={}){let n=g("toasts");if(o)for(let d of n.querySelectorAll(`[data-key="${o}"]`))d.remove();let l=()=>{u.classList.add("leaving"),setTimeout(()=>u.remove(),200)},u=i("div",{class:`toast ${a}`,"data-key":o||null},i("span",{class:"toast-text"},e),r&&i("button",{class:"toast-action",type:"button",onclick:()=>{r.run(),l()}},r.label),i("button",{class:"toast-close",type:"button","aria-label":s("dismiss"),onclick:l},i("span",{"aria-hidden":"true"},"\\xD7")));for(ze(),n.append(u);n.children.length>3;)n.firstChild.remove();t&&setTimeout(l,t)}function ze(){let e=g("toasts");e&&!e.hasAttribute("aria-live")&&(e.setAttribute("aria-live","polite"),e.setAttribute("aria-relevant","additions")),g("srAnnounce")||document.body.append(i("div",{id:"srAnnounce",class:"sr-only","aria-live":"polite","aria-atomic":"true"}))}var _a=null;function Pt(e,a=e){if(a===_a)return;_a=a,ze();let t=g("srAnnounce");t.textContent="",setTimeout(()=>{t.textContent=e},150)}async function j(e,a){let t=new AbortController,r=setTimeout(()=>t.abort(),12e3),o;try{o=await fetch(e,{method:a?"POST":"GET",headers:a?{"content-type":"application/json"}:{},body:a?JSON.stringify(a):void 0,cache:"no-store",signal:t.signal})}catch{let l=new Error(s("errNETWORK"));throw l.code="NETWORK",l}finally{clearTimeout(r)}let n={};try{n=await o.json()}catch{}if(!o.ok){let l=new Error(n.error||s("errSERVER"));throw l.code=n.code||"SERVER",l.data=n,l}return n}function R(e,a){let t=`err${e}`;return s(t,{word:a?a.toUpperCase():""})===t?s("errSERVER"):s(t,{word:a?a.toUpperCase():""})}function za(e){return{kind:"solo",id:e.id,language:e.language,status:e.status,createdAt:e.createdAt,maxMoves:Q,youSide:"a",otherSide:"b",otherName:null,moves:e.moves.map(a=>({...pa(a),mine:null,otherLocked:a.status==="OPEN"}))}}function ee(e){return{kind:e.kind,id:e.id,joinCode:e.joinCode,language:e.language,status:e.status,waitingForPlayer:e.waitingForPlayer,createdAt:e.createdAt,maxMoves:e.maxMoves||Q,youSide:e.you.side,otherSide:e.opponent.side,otherName:e.opponent.name,rematchId:e.rematchId||null,moves:e.moves}}var A=e=>e.kind==="solo"||e.kind==="legacy-solo",J=e=>A(e)?s("garyName"):e.otherName||s("friend"),le=(e,a)=>a===e.youSide?s("you"):J(e);function Da(e){let a=String(e||"").trim().normalize("NFC");if(!a)return"?";let t=[...a][0];try{t=new Intl.Segmenter(c.lang,{granularity:"grapheme"}).segment(a)[Symbol.iterator]().next().value.segment}catch{}return t.toLocaleUpperCase(c.lang)}function O(e,{bot:a=!1,cls:t=""}={}){return a?i("span",{class:`badge gary ${t}`,"aria-hidden":"true"},Z("meh","badge-art")):i("span",{class:`badge ${t}`,"aria-hidden":"true"},Da(e))}var $t=(e,a)=>O(e.otherName,{bot:A(e),cls:a});function E(e,a=!1){location.pathname!==e&&history[a?"replaceState":"pushState"]({},"",e),Oe()}async function Oe(){De(),he();let e=location.pathname,a;if(a=e.match(/^\\/solo\\/([\\w-]+)$/)){let t=T.soloGame(a[1]);if(!t)return E("/",!0);K(za(t)),T.setLast({kind:"solo",id:t.id});return}if(a=e.match(/^\\/games\\/([\\w-]+)$/))return c.player?de(a[1]):(S(s("errUNKNOWN_PLAYER"),{kind:"error"}),E("/",!0));if(a=e.match(/^\\/join\\/([\\w-]+)$/))return history.replaceState({},"","/"),Re(),ue(()=>Za(decodeURIComponent(a[1])));Re()}function K(e){if(c.game?.id!==e.id&&(he(),c.justContinued=0),c.game=e,c.screen="game",!c.reveal){let a=Pe(e);a&&a.number>T.seen(e.id)&&Ha(e,a)}Ge(),Le()}async function de(e){c.screen="game",(!c.game||c.game.id!==e)&&Ut();try{let a=await j(`/api/game?id=${encodeURIComponent(e)}&player_id=${encodeURIComponent(c.player.id)}`);T.setLast({kind:"family",id:e}),K(ee(a.game))}catch(a){a.code==="NETWORK"?Yt(s("errNETWORK"),()=>de(e)):(S(R(a.code),{kind:"error"}),E("/",!0))}}function De(){clearTimeout(c.pollTimer),c.pollTimer=null}function Ht(e){return!(!e||A(e)||C(e))}function Le(){De(),Ht(c.game)&&(c.pollTimer=setTimeout(async()=>{if(document.hidden||!c.online||c.busy||c.screen!=="game")return Le();try{let e=await j(`/api/game?id=${encodeURIComponent(c.game.id)}&player_id=${encodeURIComponent(c.player.id)}`);if(c.screen==="game"&&c.game?.id===e.game.id&&JSON.stringify(ee(e.game))!==JSON.stringify(c.game)){let a=c.game.waitingForPlayer;K(ee(e.game)),H(),a&&!c.game.waitingForPlayer&&S(s("statusYourTurn"),{kind:"success"});return}}catch{}Le()},3500))}function $(){document.documentElement.lang=c.lang,document.title="Same Same but Different",ze(),g("brandLink").setAttribute("lang","en"),g("brandTop").textContent=s("brandTop"),g("brandBottom").textContent=s("brandBottom");let e=document.querySelector(".skip");e&&(e.textContent=s("skip")),g("langGroup").setAttribute("aria-label",s("langLabel"));for(let r of document.querySelectorAll("[data-lang]"))r.setAttribute("lang",r.dataset.lang),r.setAttribute("aria-pressed",String(r.dataset.lang===c.lang));let a=g("offlinePill");a.removeAttribute("role"),a.hidden=c.online,a.dataset.textLang!==c.lang&&(a.dataset.textLang=c.lang,a.title=s("offline"),a.replaceChildren(i("span",{class:"pill-long"},s("offline")),i("span",{class:"pill-short"},s("offlineShort"))));let t=g("profileBtn");t.textContent=c.player?.display_name?.trim()?Da(c.player.display_name):"?",t.setAttribute("aria-label",c.player?s("profileButtonNamed",{name:c.player.display_name}):s("profileButton")),t.setAttribute("aria-haspopup","dialog"),me()}function Wa(){$(),c.screen==="game"&&c.game?Ge():Re()}function pe(...e){g("app").replaceChildren(...e)}function Ut(){$(),pe(i("section",{class:"card center"},i("p",{class:"loading"},i("span",{class:"spinner","aria-hidden":"true"}),s("loading"))))}function Yt(e,a){$(),pe(i("section",{class:"card center"},i("p",{class:"notice error",role:"alert"},e),i("div",{class:"row center"},i("button",{class:"btn ghost",type:"button",onclick:()=>E("/")},s("back")),a&&i("button",{class:"btn",type:"button",onclick:a},s("retry")))))}function Re(){c.screen="home",c.game=null,De(),$();let e=!c.online;pe(i("section",{class:"hero"},i("p",{class:"kicker"},s("heroKicker")),i("h1",{},s("heroTitle")),i("p",{class:"lede"},s("heroCopy"))),i("div",{class:"start-grid"},i("section",{class:"card start solo-card","aria-labelledby":"soloTitle"},i("div",{class:"start-icon duo","aria-hidden":"true"},O(c.player?.display_name||s("you"),{cls:"you"}),O(null,{bot:!0})),i("h2",{id:"soloTitle"},s("soloTitle")),i("p",{},s("soloCopy")),i("button",{class:"btn big",type:"button",id:"startSolo",onclick:()=>We()},s("soloStart"))),i("section",{class:"card start family-card","aria-labelledby":"familyTitle"},i("div",{class:"start-icon duo","aria-hidden":"true"},O(c.player?.display_name||s("you"),{cls:"you"}),O(null,{cls:"other"})),i("h2",{id:"familyTitle"},s("familyTitle")),i("p",{},s(e?"familyOffline":"familyCopy")),i("div",{class:"row"},i("button",{class:"btn teal",type:"button",id:"createFamily",disabled:e,onclick:()=>ue($a)},s("familyCreate")),i("button",{class:"btn ghost",type:"button",id:"joinFamily",disabled:e,onclick:()=>ue(()=>Za(""))},s("familyJoin"))))),i("section",{class:"card games","aria-labelledby":"gamesTitle"},i("h2",{id:"gamesTitle"},s("gamesTitle")),i("ul",{class:"game-list",id:"gameList"},Ga()))),Pa()}function Ga(){let e=T.soloGames().map(a=>({key:`solo:${a.id}`,updatedAt:a.updatedAt,title:s("solo"),badge:O(null,{bot:!0}),createdAt:a.createdAt,status:a.status,move:W(a).number,language:a.language,yourTurn:a.status==="ACTIVE",open:()=>E(`/solo/${a.id}`)}));for(let a of c.dashboard?.games||[]){let t=a.status==="WAITING";e.push({key:`family:${a.id}`,updatedAt:a.updated_at,title:a.bot?s("solo"):t?s("waitingJoin"):s("vs",{name:a.opponent_name||s("friend")}),badge:a.bot?O(null,{bot:!0}):O(t?null:a.opponent_name||s("friend"),{cls:"other"}),createdAt:a.created_at,status:a.status,move:a.round_number,language:a.language,yourTurn:a.status==="ACTIVE"&&!a.locked,theirTurn:a.status==="ACTIVE"&&a.locked&&!a.bot?a.opponent_name||s("friend"):null,code:a.bot?null:a.join_code,open:()=>E(`/games/${a.id}`)})}return e.sort((a,t)=>String(t.updatedAt).localeCompare(String(a.updatedAt))),e.length?e.map(a=>{let t=a.status==="MATCHED"||a.status==="EXHAUSTED",r=a.status==="MATCHED"?s("statusMatched"):a.status==="EXHAUSTED"?s("gameOverTitle"):a.status==="WAITING"?s("waitingJoin"):a.theirTurn?s("statusTheirTurn",{name:a.theirTurn}):a.yourTurn?s("statusYourTurn"):s("statusActive");return i("li",{class:`game-item ${t?"finished":""} ${a.yourTurn?"your-turn":""}`,"data-key":a.key},i("span",{class:"game-icon","aria-hidden":"true"},a.badge),i("div",{class:"game-info"},i("strong",{},a.title),i("span",{class:"game-meta"},se(a.createdAt)),i("span",{class:"game-meta"},[r,t?null:s("moveOf",{n:a.move,max:Q}),a.language&&a.language!==c.lang?s("gameInLang",{lang:oe(s,a.language)}):null].filter(Boolean).join(" \\xB7 "))),i("button",{class:`btn small ${t?"ghost":""}`,type:"button",onclick:a.open,"aria-label":s("openGame",{action:s(t?"view":"resume"),title:a.title,date:se(a.createdAt)})},s(t?"view":"resume")))}):[i("li",{class:"empty"},s("gamesEmpty"))]}async function Pa(){if(!(!c.player||!c.online))try{let e=await j(`/api/dashboard?player_id=${encodeURIComponent(c.player.id)}`);c.dashboard=e,c.screen==="home"&&g("gameList")?.replaceChildren(...Ga()),H()}catch(e){e.code==="UNKNOWN_PLAYER"&&(c.dashboard=null)}}function Bt(){return crypto.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`}function Ft(){try{return crypto.getRandomValues(new Uint32Array(1))[0]}catch{return Math.floor(Math.random()*2**32)}}function We(e=c.lang){let a=ua({id:Bt(),language:e,seed:Ft()});T.saveSolo(a)||S(s("errSTORAGE"),{kind:"error",timeout:8e3}),E(`/solo/${a.id}`),g("word")?.focus(),Ca()||Ba({onDone:()=>g("word")?.focus()}),setTimeout(()=>{let t=document.activeElement;(!t||t===document.body)&&g("word")?.focus()},30)}async function $a(e=c.lang){try{let a=await j("/api/games",{player_id:c.player.id,solo:!1,language:e});E(`/games/${a.id}`)}catch(a){S(R(a.code),{kind:"error"})}}function Ge(){let e=Xt(c.game),a=dr();$();let t=e.moves[e.moves.length-1],r=e.status==="MATCHED"||e.status==="EXHAUSTED",o=Pe(e),n=!!(o&&!c.reveal&&o.number===c.justContinued);c.justContinued=0;let l=A(e);g("app").dataset.phase=c.reveal?c.reveal.phase:r?"gameOver":"playing";let u=i("section",{class:`card board ${r?"finished":""}`,"aria-labelledby":"boardTitle"},Vt(e,t,r,o,n),Kt(e),r?or(e,o,n):rr(e,t));pe(i("div",{class:"game-nav"},i("button",{class:"btn ghost small",type:"button",id:"backBtn",onclick:()=>E("/")},Jt()),i("span",{class:"mode-chip"},e.waitingForPlayer&&!l?null:$t(e,"small"),i("span",{},l?s("solo"):e.waitingForPlayer?s("familyTitle"):s("vs",{name:e.otherName||s("friend")})))),u,ur(e)),pr(a),n&&o.status==="MATCHED"&&fr()}function Vt(e,a,t,r,o){let n=e.maxMoves,l=t?r.number:a.number,u=Math.max(0,n-l),d=s("moveOf",{n:l,max:n}),p=t?e.status==="MATCHED"?s("progressMatched",{n:l}):s("progressFinale"):l<=1?s("progressStart"):s("progressToGo",{n:u}),h=o&&!t&&!L(),m=[];for(let f=1;f<=n;f++){let b,v;t?(b=f<l?"done lit":f===l?"final lit":"lit spare",v=f===l?e.status==="MATCHED"?"\\u{1F3C6}":"\\u2605":f<l?"\\u2713":"\\u2605"):f<l?(b="done",v="\\u2713"):f===l?(b=`now ${h?"pop":""}`,v=String(f)):(b="todo",v=""),m.push(i("span",{class:`stone ${b}`},v))}return i("div",{class:`progress ${t?"finale":""}`},i("p",{class:"progress-labels"},i("span",{class:"move-count",id:"moveLabel"},d),i("span",{class:"progress-sub",id:"progressSub"},p)),i("div",{class:"stones",role:"progressbar","aria-label":s("progressLabel2"),"aria-valuemin":"0","aria-valuemax":String(n),"aria-valuenow":String(t&&e.status==="EXHAUSTED"?n:l),"aria-valuetext":`${d}, ${p}`},m))}function Kt(e){if(e.language===c.lang)return null;let a=oe(s,e.language),t=oe(s,c.lang),r=A(e);return i("div",{class:"notice lang-note",role:"note",id:"langNote"},i("strong",{},s("langNoteTitle",{game:a}))," ",r?null:[s("langNoteFamily")," "],s("langNoteCopy",{game:a,ui:t})," ",i("button",{class:"btn small ghost",type:"button",lang:c.lang,disabled:!r&&!c.online,onclick:()=>r?We(c.lang):ue(()=>$a(c.lang))},s("langNewGame",{ui:t})))}function Jt(){let e=s("back"),a=e.match(/^\\s*[\u2190\u2B05]\\s*/);return a?[i("span",{"aria-hidden":"true"},a[0]),e.slice(a[0].length)]:e}function Ie(e,a,t=""){return i("span",{class:`chip ${t}`},a?i("small",{},a):null,i("span",{class:"chip-word",lang:c.game?.language},e))}function Pe(e){return[...e.moves].reverse().find(a=>a.words)||null}function Xt(e){let a=c.reveal;if(!a||a.gameId!==e.id)return e;let t=e.moves.findIndex(n=>n.number===a.number);if(t<0)return e;let r=e.moves[t],o={...r,words:null,status:"OPEN",revealedAt:null,mine:r.words[e.youSide],otherLocked:!0};return{...e,status:"ACTIVE",moves:[...e.moves.slice(0,t),o]}}var V=e=>new Promise(a=>setTimeout(a,e)),Qt=380,Zt=190;function Ha(e,a){he();let t=Symbol("reveal"),r=A(e),o=r?xa({status:a.status,move:a.number,recent:Ea(e.id),random:Ce}):null;o&&Aa(e.id,o.keys),c.reveal={gameId:e.id,number:a.number,phase:"countdown",token:t,reaction:o};let n=a.status==="MATCHED"||a.status==="EXHAUSTED",l=i("dialog",{id:"revealModal",class:`reveal-modal ${a.status==="MATCHED"?"match":""}`,"aria-labelledby":"revealHeading",oncancel:u=>{u.preventDefault(),c.reveal?.phase==="ready"&&Ya()}},i("div",{class:"rv-body"},i("p",{class:"rv-kicker",id:"revealHeading"},s("revealTitle")),i("div",{class:"rv-count",id:"revealCount","aria-hidden":"true"}),i("div",{class:"rv-result",id:"revealResult",hidden:!0},i("div",{class:"rv-words"},Oa(s("revealYourWord"),a.words[e.youSide],"you"),i("span",{class:"op rv-step","aria-hidden":"true"},a.status==="MATCHED"?"=":"+"),r?ar():Oa(s("revealTheirWord",{name:J(e)}),a.words[e.otherSide],"other")),o?i("p",{class:"gary-line",id:"garyLine",hidden:!0},i("span",{class:"gary-says"})):null,i("p",{class:"rv-outcome rv-step"},a.status==="MATCHED"?Ua(e,a):a.status==="EXHAUSTED"?s("gameOverAww"):s("revealNice")),a.botQuality==="loose"&&a.status!=="MATCHED"?i("p",{class:"rv-note rv-step"},s("revealLoose")):null,n?null:i("p",{class:"rv-next rv-step",id:"revealNext"},...er(a)))));document.body.append(l),l.showModal(),tr(e,a,n,t)}function Ua(e,a){let t=ve(a.words.a,a.words.b,e.language);return s(t==="plural"?"revealMatchPlural":t==="variant"?"revealMatchVariant":"revealMatch")}function er(e){let a=`${e.words.a.toUpperCase()} + ${e.words.b.toUpperCase()}`,[t,r=""]=s("revealNextStarts",{a:"@@A@@",b:"@@B@@"}).split(/@@A@@\\s*\\+\\s*@@B@@/);return[t,i("span",{class:"rv-pair"},a),r]}function ar(){return i("div",{class:"rv-word other gary rv-step","data-gary":"word"},i("small",{},Z("meh","tiny"),s("revealBotWord")),i("span",{class:"chip-word",id:"garyWord",lang:c.game?.language}))}async function Na(e,{reduced:a,alive:t}){let r=g("garyLine");if(!r)return"";let o=r.querySelector(".gary-says"),n=e.map(l=>s(l));if(r.hidden=!1,a)return await F(o,n.join(" "),{reduced:!0}),n.join(" ");for(let l=0;l<n.length&&!(l&&(await V(450),!t()));l++)await F(o,n[l],{alive:t,maxTotal:700});return n.join(" ")}function Oa(e,a,t){return i("div",{class:`rv-word ${t} rv-step`},i("small",{},e),i("span",{class:"chip-word",lang:c.game?.language},a))}function La(e){c.reveal&&(c.reveal.phase=e,g("app").dataset.phase=e)}async function tr(e,a,t,r){let o=()=>c.reveal?.token===r&&g("revealModal")?.open,n=g("revealCount"),l=g("revealResult"),u=!L();if(u){for(let m of["3","2","1",s("sameTime")])if(n.textContent=m,n.classList.toggle("words",m.length>1),n.classList.remove("bump"),n.offsetWidth,n.classList.add("bump"),await V(Qt),!o())return}n.hidden=!0,l.hidden=!1,La("revealing");let d=c.reveal?.reaction,p="";for(let m of l.querySelectorAll(".rv-step")){if(m.classList.add("show"),m.dataset.gary==="word"){if(d?.when==="before"&&(p=await Na(d.keys,{reduced:!u,alive:o}),u&&await V(350)),!o()||(await F(m.querySelector(".chip-word"),a.words[e.otherSide],{reduced:!u,alive:o}),!o()))return;d?.when==="after"&&(u&&await V(350),p=await Na(d.keys,{reduced:!u,alive:o}))}if(u&&(await V(Zt),!o()))return}Pt([s("revealTitle"),s("revealSaid",{name:le(e,e.youSide),word:a.words[e.youSide].toUpperCase()}),s("revealSaid",{name:le(e,e.otherSide),word:a.words[e.otherSide].toUpperCase()}),p?s("revealSaid",{name:s("garyName"),word:p}):"",a.status==="MATCHED"?Ua(e,a):a.status==="EXHAUSTED"?s("gameOverAww"):s("revealNice")].filter(Boolean).join(" "),`reveal:${e.id}:${a.number}`);let h=i("button",{class:"btn big rv-continue",type:"button",id:"revealContinue",onclick:Ya},s(t?"revealSeeEnd":"keepPlaying"));l.append(h),La("ready"),h.focus()}function Ya(){let e=c.reveal;if(!e||e.phase!=="ready"||(T.markSeen(e.gameId,e.number),he(),c.screen!=="game"||c.game?.id!==e.gameId))return;c.justContinued=e.number;let a=Pe(c.game);a&&a.number>T.seen(c.game.id)&&(c.justContinued=0,Ha(c.game,a)),Ge(),c.reveal||qe()}function he(){c.reveal=null;let e=g("revealModal");e&&(e.open&&e.close(),e.remove())}function rr(e,a){let t=!a.prompts,r=A(e),o=J(e),n=!!a.mine,l=e.waitingForPlayer,u=i("div",{class:"play"});if(u.append(i("h1",{id:"boardTitle",class:"board-title"},s(l&&!r?"waitingJoin":t?"firstTitle":"promptTitle")),...l&&!r||n?[]:t?[i("p",{class:"instruction"},r?s("firstSolo"):s("firstFamily",{name:o}))]:[i("p",{class:"instruction"},s("promptCopy"))]),t||u.append(i("div",{class:"prompt",id:"prompt",lang:e.language},i("span",{class:"tile"},a.prompts[0]),i("span",{class:"join"},i("span",{class:"op","aria-hidden":"true"},"+"),i("span",{class:"tile"},a.prompts[1])))),l){let p=`${location.origin}/join/${encodeURIComponent(e.joinCode)}`;return u.append(i("div",{class:"share"},i("h2",{},s("shareTitle")),i("p",{},s("shareCopy")),i("p",{class:"code",id:"joinCode"},e.joinCode),i("button",{class:"btn teal",type:"button",disabled:!c.online,onclick:async()=>{try{await navigator.clipboard.writeText(p),S(s("copied"),{kind:"success"})}catch{S(p,{timeout:1e4})}}},s("copyLink")))),u}if(n)return u.append(i("p",{class:"notice pending",role:"status"},r?s("lockedIn",{word:a.mine.toUpperCase()}):s("youLocked",{word:a.mine.toUpperCase(),name:o}))),u;let d=i("form",{class:"word-form",id:"wordForm",novalidate:!0,onsubmit:p=>{p.preventDefault();let h=_e||(p.submitter?"button":"form");_e=null,gr(h)}},i("label",{class:"sr-only",for:"word"},s("placeholder")),i("p",{id:"formHelp",class:"form-help","aria-live":"polite"},r?s("botReady"):a.otherLocked?s("otherLocked",{name:o}):s("otherThinking",{name:o})),i("div",{id:"suggestion",class:"suggestion","aria-live":"polite"}),i("input",{id:"word",name:"word",type:"text",class:"word-input",placeholder:s("placeholder"),autocomplete:"off",autocapitalize:"none",autocorrect:"off",spellcheck:"true",lang:e.language,maxlength:"40",enterkeyhint:"go","aria-describedby":t?"formHelp":"prompt formHelp","aria-invalid":"false",oninput:hr,onkeydown:p=>{_e=p.key==="Enter"&&!p.isComposing?"enter":null}}),i("button",{class:"btn big",type:"submit",id:"lockBtn"},s("lockIn")));return u.append(d),u}function or(e,a,t){let r=e.status==="MATCHED",o=A(e),n=performance.now();return i("div",{class:`end ${r?"win":"over"}`},r?i("div",{class:"end-icon","aria-hidden":"true"},"\\u{1F389}"):o?nr(t&&!L()):ir(t&&!L()),i("h1",{id:"boardTitle",class:"board-title"},s(r?"winTitle":"gameOverTitle")),i("p",{},r?ve(a.words.a,a.words.b,e.language)==="exact"?s("winCopy",{word:a.words.a.toUpperCase(),n:a.number}):s("winCopyVariant",{a:a.words.a.toUpperCase(),b:a.words.b.toUpperCase(),n:a.number}):s("gameOverCopy")),i("div",{class:"row center end-actions"},i("button",{class:"btn big",type:"button",id:"newGameBtn",disabled:!o&&!c.online&&!e.rematchId,onclick:l=>{l.detail===0&&performance.now()-n<800||sr(e,l.currentTarget)}},s(o?"playAgain":"rematch")),i("button",{class:"btn ghost",type:"button",id:"homeBtn",onclick:()=>E("/")},s("returnHome")),i("button",{class:"btn ghost",type:"button",id:"historyBtn",onclick:lr},s("viewHistory"))))}function nr(e){let[a,t]=x.special.gameOver.map(l=>s(l)),r=i("span",{class:"bye-line","aria-hidden":"true"}),o=i("span",{class:"bye-line later","aria-hidden":"true"}),n=i("div",{class:`gary-end ${e?"animate":""}`},Z("sleepy","end-art"),i("p",{class:"gary-bye",id:"garyBye"},r,o,i("span",{class:"sr-only"},`${s("garyName")}: ${a} ${t}`)));return e?F(r,a,{maxTotal:500}).then(()=>V(1100)).then(()=>{o.isConnected&&F(o,t,{maxTotal:900})}):(r.textContent=a,o.textContent=t),n}function Ba({onDone:e}={}){g("garyIntro")?.remove();let a=()=>{Ma();let r=g("garyIntro");r&&(r.open&&r.close(),r.remove()),e?.()},t=i("dialog",{id:"garyIntro",class:`gary-intro ${L()?"":"animate"}`,"aria-labelledby":"garyIntroTitle","aria-describedby":"garyIntroSays",oncancel:r=>{r.preventDefault(),a()}},i("div",{class:"gi-body"},i("p",{class:"rv-kicker"},s(x.intro.kicker)),Z("meh","intro-art"),i("h2",{class:"gi-title",id:"garyIntroTitle"},s(x.title)),i("div",{class:"gi-says",id:"garyIntroSays"},...x.intro.lines.map((r,o)=>i("p",{class:"gi-line",style:`--i:${o}`},s(r))),i("p",{class:"gi-aside",style:`--i:${x.intro.lines.length}`},s(x.intro.aside))),i("button",{class:"btn big",type:"button",id:"garyIntroGo",onclick:a},s(x.intro.cta))));document.body.append(t),t.showModal(),g("garyIntroGo").focus()}function ir(e){return i("div",{class:`sleepy ${e?"animate":""}`,"aria-hidden":"true"},i("span",{class:"sleepy-face"},i("i",{class:"eye left"}),i("i",{class:"eye right"}),i("i",{class:"mouth"})),i("span",{class:"zzz"},i("b",{},"z"),i("b",{},"z"),i("b",{},"Z")))}async function sr(e,a){if(A(e))return We(c.lang);if(e.rematchId)return E(`/games/${e.rematchId}`);if(!c.player||!c.online)return S(s("familyOffline"),{kind:"error"});a?.setAttribute("aria-busy","true"),a&&(a.disabled=!0);try{let t=await j("/api/games/rematch",{player_id:c.player.id,game_id:e.id});S(s("rematchSent"),{kind:"success"}),E(`/games/${t.id}`)}catch(t){a?.isConnected&&(a.disabled=!1,a.removeAttribute("aria-busy")),S(R(t.code),{kind:"error"})}}function lr(){let e=g("trailTitle");e&&(e.setAttribute("tabindex","-1"),e.scrollIntoView({block:"start",behavior:L()?"auto":"smooth"}),e.focus({preventScroll:!0}))}function Fa(e,a){return[i("span",{class:"chip plain",lang:e.language},a[0]),i("span",{class:"join"},i("span",{class:"op","aria-hidden":"true"},"+"),i("span",{class:"chip plain",lang:e.language},a[1]))]}function cr(e){let a=e.moves[e.moves.length-1];if(!a||a.words||e.waitingForPlayer||e.status==="MATCHED"||e.status==="EXHAUSTED")return null;let t=()=>i("span",{class:"chip mystery"},i("small",{},J(e)),i("span",{class:"chip-word"},i("span",{"aria-hidden":"true"},"?"),i("span",{class:"sr-only"},s("hiddenWord")))),r=a.mine?Ie(a.mine,s("you"),"you"):i("span",{class:"chip mystery you"},i("small",{},s("you")),i("span",{class:"chip-word"},i("span",{"aria-hidden":"true"},"?"),i("span",{class:"sr-only"},s("hiddenWord")))),o=e.youSide==="a"?[r,t()]:[t(),r];return i("div",{class:"trail-now",id:"trailNow"},i("p",{class:"now-label"},i("span",{class:"now-dot","aria-hidden":"true"}),s("nowPlaying")),i("div",{class:"trail-row-inner"},i("span",{class:"move-badge"},i("span",{"aria-hidden":"true"},a.number),i("span",{class:"sr-only"},s("moveOf",{n:a.number,max:e.maxMoves}))),i("div",{class:"trail-eq"},i("span",{class:"trail-in"},a.prompts?Fa(e,a.prompts):i("span",{class:"start-label"},s("start"))),i("span",{class:"trail-out"},i("span",{class:"join"},i("span",{class:"arrow","aria-hidden":"true"},"\\u2192"),o[0]),i("span",{class:"join"},i("span",{class:"op","aria-hidden":"true"},"+"),o[1])))))}function ur(e){let a=e.moves.filter(n=>n.words),t=A(e)?s("solo"):e.waitingForPlayer?s("familyTitle"):s("vs",{name:e.otherName||s("friend")}),r=cr(e),o=[...new Map(a.map(n=>[n.number,n])).values()].sort((n,l)=>l.number-n.number);return i("section",{class:"card trail","aria-labelledby":"trailTitle"},i("div",{class:"trail-head"},i("h2",{id:"trailTitle"},s("trailTitle")),i("p",{class:"trail-meta"},i("strong",{},t),i("span",{class:"trail-when"},i("span",{"aria-hidden":"true"},"\\xB7 "),se(e.createdAt)))),r,o.length?i("ol",{class:"trail-list",reversed:!0},o.map(n=>{let l=n.status==="MATCHED"||n.status==="EXHAUSTED";return i("li",{class:`trail-row ${n.status==="MATCHED"?"match":""}`,"data-move":n.number},i("span",{class:"move-badge"},i("span",{"aria-hidden":"true"},n.number),i("span",{class:"sr-only"},s("moveOf",{n:n.number,max:e.maxMoves}))),i("div",{class:"trail-eq"},i("span",{class:"trail-in"},n.prompts?Fa(e,n.prompts):i("span",{class:"start-label",title:s("startingPair")},s("start"))),i("span",{class:"trail-out"},i("span",{class:"join"},i("span",{class:"arrow","aria-hidden":"true"},"\\u2192"),Ie(n.words.a,le(e,"a"),e.youSide==="a"?"you":"other")),i("span",{class:"join"},i("span",{class:"op","aria-hidden":"true"},n.status==="MATCHED"?"=":"+"),Ie(n.words.b,le(e,"b"),e.youSide==="b"?"you":"other")),n.status==="MATCHED"?i("span",{class:"match-badge"},s("matchBadge")):null)),l?null:i("p",{class:"trail-next"},i("span",{"aria-hidden":"true"},"\\u2191 "),s("nextPrompt")))})):i("p",{class:"empty"},s("trailEmpty")))}function dr(){let e=g("word");return e?{value:e.value,focused:document.activeElement===e,start:e.selectionStart,end:e.selectionEnd}:null}function pr(e){let a=g("word");if(!(!a||!e)){if(a.value=e.value,e.focused){a.focus();try{a.setSelectionRange(e.start,e.end)}catch{}}Ka()}}var Ra=null,_e=null;function hr(){Va(null),clearTimeout(Ra),Ra=setTimeout(Ka,350)}function Ia(){let e=g("formHelp"),a=g("word");if(!e||!a)return;let t=Math.min(e.getBoundingClientRect().top,a.getBoundingClientRect().top),r=Math.max(e.getBoundingClientRect().bottom,a.getBoundingClientRect().bottom),o=window.visualViewport,n=o?o.offsetTop:0,l=n+(o?o.height:window.innerHeight),u=12,d=0;t<n+u?d=t-n-u:r>l-u&&(d=Math.min(r-l+u,t-n-u)),d&&window.scrollBy({top:d,behavior:L()?"auto":"smooth"})}function Va(e,a=!1){let t=g("formHelp");if(!t)return;let r=c.game,o=r.moves[r.moves.length-1],n=!!(e&&a),l=e||(A(r)?s("botReady"):o.otherLocked?s("otherLocked",{name:J(r)}):s("otherThinking",{name:J(r)}));t.classList.toggle("error",n);let u=g("word");n&&t.textContent===l?(t.textContent="",setTimeout(()=>{t.isConnected&&(t.textContent=l,Ia())},60)):t.textContent!==l&&(t.textContent=l),n&&u&&(u.setAttribute("aria-invalid","false"),u.offsetWidth,Ia()),u?.setAttribute("aria-invalid",String(n))}function Ka(){let e=g("word"),a=g("suggestion");if(!e||!a)return;let t=e.value.trim(),r=t&&t!==c.dismissedSuggestion?Gt(c.game.language).suggest(t):null;if(!((a.dataset.word||null)===(r||null)&&a.childElementCount===(r?3:0))){if(a.dataset.word=r||"",!r)return a.replaceChildren();a.replaceChildren(i("span",{},s("didYouMean",{word:r.toUpperCase()})),i("button",{class:"btn tiny teal",type:"button",onclick:()=>{e.value=r,a.replaceChildren(),e.focus()}},s("useSuggestion",{word:r.toUpperCase()})),i("button",{class:"btn tiny ghost",type:"button",onclick:()=>{c.dismissedSuggestion=t,a.replaceChildren(),e.focus()}},s("keepMine")))}}function mr(e){return{status:e.status==="WAITING"?"ACTIVE":e.status,moves:e.moves}}function Ne(e,a,t){_("rejected",{...t,code:e,reason:R(e,a)}),Va(R(e,a),!0),g("word")?.focus({preventScroll:!0})}async function gr(e="direct"){let a=c.game,t=g("word"),r=t?t.value:null,o={source:e,raw:r,trimmed:r==null?null:r.trim(),cleaned:r==null?null:B(r),key:r==null?null:k(r),kind:a?.kind,language:a?.language,buttonDisabled:g("lockBtn")?.disabled??null,inputDisabled:t?.disabled??null};if(_("submit",o),c.busy){_("ignored",{...o,reason:"in-flight"});return}if(!t){_("ignored",{...o,reason:"no-input"});return}let n=te(mr(a),a.youSide,r);if(Object.assign(o,{keyLength:o.key.length,minLengthOk:n.code!=="TOO_SHORT"&&o.key.length>0,validation:n.ok?"ok":n.code,duplicate:n.code==="SAME_AS_LAST"||n.code==="ALREADY_USED"?n.code:!1}),_("checked",o),!n.ok)return Ne(n.code,n.word,o);if(c.dismissedSuggestion=null,a.kind==="solo"){let u=T.soloGame(a.id),d=da(u,r);if(_("result",{...o,path:"local",ok:d.ok,code:d.ok?null:d.code}),!d.ok)return Ne(d.code,d.word,o);T.saveSolo(d.game)||S(s("errSTORAGE"),{kind:"error",timeout:8e3}),t.value="",K(za(d.game)),c.reveal||qe();return}c.busy=!0;let l=g("lockBtn");t.disabled=!0,l&&(l.disabled=!0,l.textContent=s("locking"));try{let u=await j("/api/submit",{game_id:a.id,player_id:c.player.id,word:n.word,move:a.moves[a.moves.length-1].number});_("result",{...o,path:"api",ok:!0}),t.value="",c.busy=!1,K(ee(u.game)),c.reveal||qe()}catch(u){_("result",{...o,path:"api",ok:!1,code:u.code||null}),c.busy=!1,u.data?.game?K(ee(u.data.game)):(t.disabled=!1,l&&(l.disabled=!1,l.textContent=s("lockIn"))),u.code==="NETWORK"?S(s("errNETWORK"),{kind:"error"}):g("formHelp")?Ne(u.code,u.data?.word,o):S(R(u.code,u.data?.word),{kind:"error"})}}function qe(){let e=g("word"),a=g("app").querySelector(".end .board-title");a&&a.setAttribute("tabindex","-1");let t=e||a||g("newGameBtn");t?.focus({preventScroll:!0});let r=t?.getBoundingClientRect(),o=L()?"auto":"smooth";(!r||r.top<0||r.bottom>window.innerHeight)&&g("app").querySelector(".board")?.scrollIntoView({block:"start",behavior:o})}function fr(){if(L())return;let e=i("div",{class:"confetti","aria-hidden":"true"}),a=["#ff6b57","#ffc93c","#1fb5a8","#7b4fc9","#ff7ab6"];for(let t=0;t<28;t++)e.append(i("i",{style:`left:${Math.random()*100}%;background:${a[t%a.length]};animation-delay:${Math.random()*.25}s;--drift:${(Math.random()-.5)*160}px`}));document.body.append(e),setTimeout(()=>e.remove(),1800)}var w={items:new Map,unread:0,status:"idle",loadedFor:null,inflight:null},br={YOUR_TURN:"notifYourTurn",READY_TO_REVEAL:"notifReveal",PLAYER_JOINED:"notifJoined",GAME_COMPLETE:"notifMatch",GAME_EXHAUSTED:"notifComplete",REMATCH:"notifRematch"},Ja=()=>!!(c.player?.id&&c.player.display_name?.trim()&&c.online);function me(){let e=g("notifBtn");if(!e||(e.dataset.wired||(e.dataset.wired="1",e.addEventListener("click",wr)),e.hidden=!Ja(),e.hidden))return;let a=w.unread,t=g("notifCount");t.hidden=!a,t.textContent=a>99?"99+":String(a),e.setAttribute("aria-label",a?s("notifButtonUnread",{n:a}):s("notifButton")),e.setAttribute("aria-haspopup","dialog"),e.title=s("notifTitle"),w.loadedFor!==c.player.id&&H()}function H(){if(!Ja())return Promise.resolve();if(w.inflight)return w.inflight;let e=c.player.id;return w.loadedFor!==e&&(w.items=new Map,w.unread=0,w.status="idle"),w.loadedFor=e,w.status!=="ok"&&(w.status="loading",ce()),w.inflight=(async()=>{try{let a=await j(`/api/notifications?player_id=${encodeURIComponent(e)}`);if(c.player?.id!==e)return;let t=new Map;for(let r of a.notifications||[])r&&r.id!=null&&!t.has(String(r.id))&&t.set(String(r.id),r);w.items=t,w.unread=Number.isFinite(a.unread)?a.unread:[...t.values()].filter(r=>!r.read_at).length,w.status="ok"}catch{w.status!=="ok"&&(w.status="error")}finally{w.inflight=null,me(),ce()}})(),w.inflight}function yr(e){return s(br[e.kind]||"notifYourTurn",{name:e.opponent_name||s("friend")})}function wr(){X(s("notifTitle"),null,i("div",{class:"notif-panel",id:"notifPanel"}),{cancelLabel:s("close")}),g("dialog").classList.add("notif-dialog"),g("dialog").addEventListener("close",()=>g("dialog").classList.remove("notif-dialog"),{once:!0}),ce(),H()}function ce(){let e=g("notifPanel");if(!e||!e.isConnected)return;let a=document.activeElement?.closest?.("#notifPanel [data-id]")?.dataset.id,t=document.activeElement?.id==="notifRetry",r=[...w.items.values()].sort((n,l)=>String(l.created_at).localeCompare(String(n.created_at))),o=[];w.unread>0&&r.length&&o.push(i("div",{class:"row end notif-tools"},i("button",{class:"btn tiny ghost",type:"button",id:"notifMarkAll",onclick:vr},s("notifMarkAll")))),!r.length&&w.status==="loading"?o.push(i("p",{class:"loading",role:"status"},i("span",{class:"spinner","aria-hidden":"true"}),s("notifLoading"))):!r.length&&w.status==="error"?o.push(i("p",{class:"notice error",role:"alert"},s("notifError")),i("div",{class:"row center"},i("button",{class:"btn small",type:"button",id:"notifRetry",onclick:()=>H()},s("retry")))):r.length?o.push(i("ul",{class:"notif-list",id:"notifList"},r.map(n=>{let l=!n.read_at;return i("li",{class:`notif-item ${l?"unread":""}`},i("button",{class:"notif-row",type:"button","data-id":String(n.id),onclick:()=>kr(n)},O(n.opponent_name||s("friend"),{cls:"other"}),i("span",{class:"notif-body"},i("span",{class:"notif-text"},yr(n)),i("span",{class:"notif-when"},se(n.created_at))),l?i("span",{class:"notif-new"},s("notifNew")):null))}))):o.push(i("p",{class:"empty notif-empty"},s("notifEmpty"))),e.replaceChildren(...o),a?e.querySelector(`[data-id="${CSS.escape(a)}"]`)?.focus():t&&(e.querySelector(".notif-row")||e.querySelector("#notifRetry"))?.focus()}function Xa(e){c.player&&j("/api/notifications/read",{player_id:c.player.id,...e}).catch(()=>{})}function kr(e){e.read_at||(e.read_at=new Date().toISOString(),w.unread=Math.max(0,w.unread-1),Xa({ids:[e.id]}),me()),g("dialog").open&&g("dialog").close(),e.game_id&&E(`/games/${e.game_id}`)}function vr(){let e=new Date().toISOString();for(let a of w.items.values())a.read_at||(a.read_at=e);w.unread=0,Xa({all:!0}),me(),ce(),g("notifPanel")?.querySelector(".notif-row")?.focus()}window.addEventListener("focus",()=>{H()});document.addEventListener("visibilitychange",()=>{document.hidden||H()});function X(e,a,t,r){let o=g("dialog"),n=()=>{o.open&&o.close()},l=o.open?null:document.activeElement;return l&&o.addEventListener("close",()=>{l.isConnected&&!o.open&&!o.contains(document.activeElement)&&l.focus?.({preventScroll:!0})},{once:!0}),o.replaceChildren(i("form",{method:"dialog",class:"dialog-body",onsubmit:u=>{u.preventDefault(),r.submit?.()}},i("h2",{id:"dialogTitle"},e),a?i("p",{id:"dialogCopy"},a):null,t,i("p",{class:"form-help error",id:"dialogError",role:"alert"}),i("div",{class:"row end"},i("button",{class:"btn ghost",type:"button",onclick:n},r.cancelLabel||s("cancel")),r.submit?i("button",{class:"btn",type:"submit"},r.label):null),r.extra||null)),o.setAttribute("aria-labelledby","dialogTitle"),a?o.setAttribute("aria-describedby","dialogCopy"):o.removeAttribute("aria-describedby"),o.open||o.showModal(),setTimeout(()=>o.querySelector("input")?.focus(),20),{close:n,error:u=>{let d=g("dialogError"),p=o.querySelector("input");d.textContent="",setTimeout(()=>{d.textContent=u},30),p?.setAttribute("aria-invalid",u?"true":"false"),u&&p?.focus()}}}function $e(e,a,t={}){return i("div",{class:"field"},i("label",{for:e},a),i("input",{id:e,type:"text",class:"text-input",autocomplete:"off","aria-describedby":"dialogError","aria-invalid":"false",...t}))}function ue(e){if(!c.online)return S(s("familyOffline"),{kind:"error"});if(c.player)return e();let a=X(s("nameTitle"),s("nameCopy"),$e("nameInput",s("nameLabel"),{placeholder:s("namePlaceholder"),maxlength:"24",autocomplete:"nickname"}),{label:s("continue"),submit:async()=>{let t=g("nameInput").value.trim();if(!t)return a.error(s("errUNKNOWN_PLAYER"));try{let r=await j("/api/player",{display_name:t});c.player=r,T.setPlayer(r),a.close(),$(),e()}catch(r){a.error(R(r.code))}},extra:i("button",{class:"link",type:"button",onclick:()=>Qa(e)},s("haveRecovery"))})}function Qa(e){let a=X(s("recoveryTitle"),s("recoveryCopy"),$e("recoveryInput",s("recoveryLabel"),{autocapitalize:"characters"}),{label:s("recover"),submit:async()=>{try{let t=await j("/api/player/recover",{recovery_code:g("recoveryInput").value});c.player=t,T.setPlayer(t),a.close(),$(),e?e():c.screen==="home"&&Pa()}catch(t){a.error(R(t.code))}}})}function Za(e){let a=X(s("joinTitle"),s("joinCopy"),$e("joinInput",s("joinLabel"),{value:e||"",autocapitalize:"characters",maxlength:"60"}),{label:s("join"),submit:async()=>{let t=g("joinInput").value.trim().split("/").pop();try{let r=await j("/api/games/join",{player_id:c.player.id,join_code:t});a.close(),E(`/games/${r.id}`)}catch(r){a.error(R(r.code))}}})}function Tr(){let e=i("button",{class:"link",type:"button",id:"meetGaryAgain",onclick:()=>{g("dialog")?.close(),Ba()}},s("garyMeetAgain"));if(!c.player){X(s("solo"),s("profileSolo"),null,{cancelLabel:s("close"),extra:[i("button",{class:"link",type:"button",onclick:()=>Qa(null)},s("haveRecovery")),e]});return}X(s("profileTitle",{name:c.player.display_name}),s("profileCopy"),i("div",{},i("p",{class:"code"},c.player.recovery_code||"\\u2014"),i("p",{class:"muted"},s("profileSolo"))),{cancelLabel:s("close"),extra:e})}function qa(e){if(e===c.online)return;c.online=e,S(s(e?"backOnline":"nowOffline"),{kind:e?"success":"info",key:"network"}),Wa();let a=g("dialog");!e&&a?.open&&a.querySelector("#joinInput, #nameInput, #recoveryInput")&&a.close(),e&&c.screen==="game"&&c.game&&!A(c.game)&&de(c.game.id)}function Sr(){for(let t of document.querySelectorAll("[data-lang]"))t.addEventListener("click",()=>{let r=t.dataset.lang==="fr"?"fr":"en";T.setLanguage(r),r!==c.lang&&(c.lang=r,Wa())});g("profileBtn").addEventListener("click",Tr),g("brandLink").addEventListener("click",t=>{t.preventDefault(),E("/")}),window.addEventListener("popstate",Oe),window.addEventListener("online",()=>qa(!0)),window.addEventListener("offline",()=>qa(!1)),document.addEventListener("visibilitychange",()=>{!document.hidden&&c.screen==="game"&&c.game&&!A(c.game)&&c.online&&de(c.game.id)}),T.healthy||S(s("errSTORAGE"),{kind:"error",timeout:8e3});let e=T.last(),a=!1;try{a=!!sessionStorage.getItem("ssbd.booted")}catch{}location.pathname==="/"&&e&&!a&&e.kind==="solo"&&T.soloGame(e.id)&&!C(T.soloGame(e.id))&&history.replaceState({},"",`/solo/${e.id}`);try{sessionStorage.setItem("ssbd.booted","1")}catch{}!c.online&&/^\\/join\\//.test(location.pathname)&&(history.replaceState({},"","/"),S(s("familyOffline"),{kind:"info",key:"network"})),Oe(),xr()}function xr(){if(!("serviceWorker"in navigator))return;let e=null,a=!1,t=!1;navigator.serviceWorker.addEventListener("controllerchange",()=>{!t||a||(a=!0,location.reload())});let r=o=>{!o||e===o||!navigator.serviceWorker.controller||(e=o,S(s("updateReady"),{timeout:0,action:{label:s("reload"),run:()=>{if(t=!0,o.state==="redundant"||o.state==="activated")return location.reload();o.postMessage({type:"SKIP_WAITING"})}}}))};navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"}).then(o=>{o.waiting&&r(o.waiting),o.addEventListener("updatefound",()=>{let n=o.installing;n?.addEventListener("statechange",()=>{n.state==="installed"&&r(o.waiting||n)})})}).catch(()=>{})}Sr();\n', "type": "text/javascript; charset=utf-8", "cache": "public, max-age=31536000, immutable", "etag": '"2b788f7188"' }, "/assets/styles.0b3586b782.css": { "body": `/* Same Same but Different: warm, bright, lightly 1980s. */
:root {
  --cream: #fff4df;
  --paper: #fffbf3;
  --ink: #2b1b3d;
  --muted: #6b4e63;
  --coral: #ff6b57;
  --coral-dark: #c4402f;
  --sun: #ffc93c;
  --sun-soft: #fff0c9;
  --teal: #1fb5a8;
  --teal-dark: #127a71;
  --grape: #7b4fc9;
  --pink: #ff7ab6;
  --mint: #d7f5e9;
  --peach: #ffe1c7;
  --you: #ffe5df;
  --other: #dbf3f0;
  --line: #e7cdb7;
  --error-bg: #ffe0dc;
  --error-ink: #8f1d12;
  --radius: 22px;
  --radius-sm: 14px;
  --shadow: 0 6px 0 var(--ink);
  --stripes: linear-gradient(90deg, var(--coral) 0 25%, var(--sun) 25% 50%, var(--teal) 50% 75%, var(--grape) 75% 100%);
  --font: ui-rounded, "SF Pro Rounded", "Nunito", "Varela Round", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif;
  color-scheme: light;
}

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
body {
  margin: 0;
  min-height: 100vh;
  background-color: var(--cream);
  background-image:
    radial-gradient(circle at 8% 4%, rgba(255, 107, 87, .18), transparent 30%),
    radial-gradient(circle at 96% 12%, rgba(31, 181, 168, .16), transparent 28%),
    repeating-linear-gradient(0deg, rgba(43, 27, 61, .035) 0 2px, transparent 2px 9px);
  color: var(--ink);
  font-family: var(--font);
  font-size: 18px;
  line-height: 1.55;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  font-kerning: normal;
}
/* Retro rainbow stripe across the top of every screen. */
body::before { content: ""; display: block; height: 8px; background: var(--stripes); border-bottom: 3px solid var(--ink); }
button, input { font: inherit; color: inherit; }
h1, h2, p { margin: 0; overflow-wrap: break-word; }
h1 { line-height: 1.12; letter-spacing: -.01em; }
h2 { font-size: clamp(1.25rem, 3vw, 1.6rem); line-height: 1.2; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.skip { position: absolute; left: 12px; top: -60px; z-index: 50; padding: 10px 14px; border-radius: 10px; background: var(--ink); color: var(--paper); font-weight: 800; }
.skip:focus { top: 12px; }
.muted { color: var(--muted); }
.boot { padding: 40px 16px; text-align: center; font-weight: 800; }

:focus-visible { outline: 4px solid var(--grape); outline-offset: 3px; border-radius: 10px; }

/* ---------- header ---------- */
.topbar {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  width: min(1040px, 100%); margin: 0 auto;
  padding: max(12px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 6px max(16px, env(safe-area-inset-left));
}
.brand { display: inline-flex; flex-direction: column; text-decoration: none; color: var(--coral-dark); line-height: .92; min-width: 0; border-radius: 10px; }
.brand-top { font-size: min(clamp(1.3rem, 5vw, 2.3rem), 7.6vw); font-weight: 900; letter-spacing: .01em; text-transform: uppercase; text-shadow: 3px 3px 0 var(--sun); white-space: nowrap; }
.brand-bottom { margin-top: 4px; font-size: min(clamp(.72rem, 2.2vw, 1rem), 3.9vw); font-weight: 800; color: var(--grape); letter-spacing: .14em; text-transform: uppercase; white-space: nowrap; }
.top-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.offline-pill {
  padding: 6px 12px; border-radius: 999px; border: 2px solid var(--ink);
  background: var(--sun); font-size: .82rem; font-weight: 800; line-height: 1.2;
}
.offline-pill::before { content: "\u25CF"; margin-right: 6px; color: var(--grape); }
.lang-switch { display: inline-flex; border: 3px solid var(--ink); border-radius: 999px; overflow: hidden; background: var(--paper); box-shadow: 0 3px 0 var(--ink); }
.lang-switch button { min-width: 46px; min-height: 44px; padding: 0 10px; border: 0; background: transparent; font-weight: 900; letter-spacing: .03em; cursor: pointer; }
.lang-switch button:hover { background: var(--sun-soft); }
.lang-switch button[aria-pressed="true"] { background: var(--grape); color: #fff; }
.lang-switch button:focus-visible { outline-offset: -4px; }
.avatar {
  width: 48px; height: 48px; flex: none; border-radius: 50%; border: 3px solid var(--ink);
  background: var(--sun); box-shadow: 0 3px 0 var(--ink); font-size: 1.3rem; font-weight: 900; cursor: pointer;
  transition: transform .08s ease, box-shadow .08s ease;
}
.avatar:hover, .bell:hover { filter: brightness(1.05); transform: translateY(-1px); box-shadow: 0 4px 0 var(--ink); }
.avatar:active, .bell:active { transform: translateY(3px); box-shadow: 0 0 0 var(--ink); }
.bell {
  position: relative; display: grid; place-items: center; width: 48px; height: 48px; flex: none; padding: 0;
  border-radius: 50%; border: 3px solid var(--ink); background: var(--paper); box-shadow: 0 3px 0 var(--ink); cursor: pointer;
  transition: transform .08s ease, box-shadow .08s ease;
}
.bell[hidden], .bell-count[hidden] { display: none; }
.bell-icon { width: 24px; height: 24px; fill: var(--sun); stroke: var(--ink); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.bell-count {
  position: absolute; top: -7px; right: -6px; min-width: 24px; height: 24px; padding: 0 5px;
  border: 2px solid var(--ink); border-radius: 999px; background: var(--coral); color: var(--ink);
  font-size: .78rem; font-weight: 900; line-height: 20px; text-align: center; font-variant-numeric: tabular-nums;
}

/* Player badges: the first letter of a name in a round token (never a picture). */
.badge {
  display: inline-grid; place-items: center; flex: none; width: 2.1em; height: 2.1em;
  border: 2px solid var(--ink); border-radius: 50%; background: var(--you); color: var(--ink);
  font-size: 1rem; font-weight: 900; line-height: 1; letter-spacing: 0; text-transform: none;
}
.badge.bot, .badge.other { background: var(--other); }
.badge.small { width: 1.75em; height: 1.75em; font-size: .85rem; }

main {
  width: min(1040px, 100%); margin: 0 auto;
  padding: 8px max(16px, env(safe-area-inset-right)) max(40px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
}
main:focus { outline: none; }

/* ---------- buttons ---------- */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 52px; max-width: 100%; padding: 12px 22px;
  border: 3px solid var(--ink); border-radius: var(--radius-sm);
  background: var(--coral); color: var(--ink);
  box-shadow: 0 5px 0 var(--ink);
  font-weight: 900; line-height: 1.2; letter-spacing: .01em; text-align: center; overflow-wrap: anywhere;
  cursor: pointer; touch-action: manipulation; user-select: none; -webkit-tap-highlight-color: transparent;
  transition: transform .08s ease, box-shadow .08s ease, filter .12s ease, background-color .12s ease;
}
.btn:hover { filter: brightness(1.06) saturate(1.05); transform: translateY(-1px); box-shadow: 0 6px 0 var(--ink); }
.btn:active { transform: translateY(4px); box-shadow: 0 1px 0 var(--ink); filter: brightness(.97); }
.btn:focus-visible { outline: 4px solid var(--grape); outline-offset: 4px; }
.btn:disabled, .btn[aria-disabled="true"] { cursor: not-allowed; background: #ece2d6; color: #6f6174; border-color: #9a8b9e; border-style: dashed; box-shadow: 0 3px 0 #9a8b9e; transform: none; filter: none; }
.btn[aria-busy="true"] { cursor: progress; }
.btn.success { background: var(--teal); }
.btn.success::before { content: "\u2713"; }
.btn.danger { background: var(--error-bg); color: var(--error-ink); border-color: var(--error-ink); }
.btn.big { min-height: 58px; padding: 14px 28px; font-size: 1.15rem; }
.btn.small { min-height: 44px; padding: 8px 16px; font-size: .95rem; box-shadow: 0 4px 0 var(--ink); }
.btn.small:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
.btn.tiny { min-height: 44px; padding: 6px 12px; font-size: .9rem; box-shadow: 0 3px 0 var(--ink); border-width: 2px; }
.btn.tiny:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--ink); }
.btn.teal { background: var(--teal); }
.btn.ghost { background: var(--paper); }
.link { margin-top: 14px; padding: 8px 0; border: 0; background: none; color: var(--grape); font-weight: 800; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; min-height: 44px; }
.row { display: flex; flex-wrap: wrap; gap: 12px; }
.row.center { justify-content: center; }
.row.end { justify-content: flex-end; }

/* ---------- cards ---------- */
.card {
  position: relative;
  margin: 0 0 24px;
  padding: clamp(18px, 3.5vw, 30px);
  background: var(--paper);
  border: 3px solid var(--ink);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.card.center { text-align: center; }
.notice { margin: 14px 0; padding: 12px 14px; border: 2px solid var(--ink); border-left-width: 8px; border-radius: var(--radius-sm); background: var(--peach); font-weight: 700; overflow-wrap: anywhere; }
.notice.pending { background: var(--mint); border-left-color: var(--teal); }
.notice.pending::before { content: "\u{1F512} "; }
.notice.error { background: var(--error-bg); color: var(--error-ink); border-left-color: var(--coral); }
.lang-note { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; font-size: .95rem; text-align: left; }
.loading { display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 800; }
.spinner { width: 22px; height: 22px; border: 4px solid var(--ink); border-right-color: transparent; border-radius: 50%; animation: spin .8s linear infinite; }

/* ---------- home ---------- */
.hero { padding: clamp(16px, 5vw, 44px) 0 clamp(18px, 4vw, 30px); }
.kicker { display: inline-block; color: var(--grape); font-weight: 900; font-size: .88rem; line-height: 1.35; letter-spacing: .08em; text-transform: uppercase; }
.hero h1 { margin: 8px 0 12px; font-size: clamp(2.1rem, 7vw, 4.2rem); font-weight: 900; text-shadow: 3px 3px 0 var(--sun); text-wrap: balance; }
.lede { max-width: 640px; color: var(--muted); font-size: clamp(1.02rem, 2.3vw, 1.2rem); line-height: 1.6; text-wrap: pretty; }
.start-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 24px; }
.start { display: flex; flex-direction: column; gap: 10px; }
.start p { color: var(--muted); flex: 1; }
.start .btn { align-self: flex-start; }
.start-icon { display: flex; align-items: center; width: max-content; padding: 6px 10px 6px 6px; border: 3px solid var(--ink); border-radius: 999px; background: var(--sun); box-shadow: 0 4px 0 var(--ink); transform: rotate(-3deg); }
.start-icon .badge { width: 46px; height: 46px; font-size: 1.35rem; border-width: 3px; }
.start-icon .badge + .badge { margin-left: -10px; }
.family-card .start-icon { background: var(--mint); transform: rotate(3deg); }
.solo-card { background: linear-gradient(160deg, #fff7e3, var(--paper) 60%); }
.solo-card::after, .family-card::after { content: ""; position: absolute; top: 20px; right: 20px; width: 60px; height: 12px; border: 2px solid var(--ink); border-radius: 99px; background: var(--stripes); }
.games h2::after { content: ""; display: block; width: 56px; height: 6px; margin-top: 8px; border-radius: 99px; background: var(--stripes); }
.game-list { list-style: none; margin: 14px 0 0; padding: 0; }
.game-item { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 14px 0; border-top: 2px dashed var(--line); }
.game-item:first-child { border-top: 0; }
.game-icon { display: grid; place-items: center; }
.game-icon .badge { width: 48px; height: 48px; border-width: 3px; font-size: 1.3rem; box-shadow: 0 3px 0 var(--ink); }
.game-item.your-turn .game-icon .badge { background: var(--sun); }
.game-item.finished .game-icon .badge { background: var(--mint); }
.game-info { display: flex; flex-direction: column; min-width: 0; }
.game-info strong { overflow-wrap: anywhere; line-height: 1.3; }
.game-meta { color: var(--muted); font-size: .9rem; line-height: 1.4; }
.empty { color: var(--muted); font-weight: 700; padding: 10px 0; list-style: none; }

/* ---------- game ---------- */
.game-nav { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin: 4px 0 16px; }
.board { text-align: center; overflow: hidden; }
.board::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 8px; background: var(--stripes); border-bottom: 2px solid var(--ink); }
.mode-chip { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 6px 14px; border: 2px solid var(--ink); border-radius: 999px; background: var(--peach); box-shadow: 0 3px 0 var(--ink); font-size: .92rem; font-weight: 900; line-height: 1.2; max-width: 100%; overflow-wrap: anywhere; }
.mode-chip .badge { margin-left: -6px; }

/* progress: 20 stepping stones along a path */
.progress { display: grid; gap: 10px; margin-top: 6px; }
.progress-labels { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 0 14px; text-align: left; line-height: 1.3; }
.move-count { font-size: 1.05rem; font-weight: 900; }
.progress-sub { color: var(--muted); font-size: .95rem; font-weight: 800; }
.stones {
  display: grid; grid-template-columns: repeat(20, minmax(0, 1fr)); align-items: center; gap: 6px;
  padding: 8px 10px; border: 3px solid var(--ink); border-radius: 999px;
  background: repeating-linear-gradient(90deg, #f5dcc4 0 10px, #f9e6d3 10px 20px);
}
.stone {
  display: grid; place-items: center; min-width: 0; aspect-ratio: 1; max-height: 34px;
  border: 2px solid var(--ink); border-radius: 50%; background: var(--paper); color: var(--ink);
  font-size: min(clamp(.62rem, 1.5vw, .85rem), 1.7vw); font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; overflow: hidden;
}
.stone.todo { border: 2px dashed #8a7180; background: rgba(255, 251, 243, .7); }
.stone.done { background: var(--teal); }
.stone.now { background: var(--coral); box-shadow: 0 3px 0 var(--ink); transform: scale(1.18); position: relative; z-index: 1; }
.stone.now.pop { animation: stonePop .6s cubic-bezier(.2, 1.6, .4, 1) 1 both; }
.finale .stones { background: repeating-linear-gradient(90deg, var(--sun-soft) 0 10px, #fff6dc 10px 20px); }
.stone.lit { background: var(--sun); }
.stone.spare { background: var(--sun-soft); color: var(--coral-dark); border-style: solid; }
.stone.final { background: var(--teal); box-shadow: 0 3px 0 var(--ink); transform: scale(1.25); position: relative; z-index: 1; }
.board-title { margin-top: 18px; font-size: clamp(1.6rem, 5vw, 2.6rem); font-weight: 900; text-wrap: balance; }
.instruction { max-width: 560px; margin: 8px auto 0; color: var(--muted); font-size: 1.05rem; text-wrap: pretty; }
.prompt { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 12px 14px; margin: 22px 0 8px; }
.join { display: inline-flex; align-items: center; gap: 12px 14px; min-width: 0; max-width: 100%; }
.tile {
  min-width: 0; max-width: 100%; padding: 12px 20px;
  border: 3px solid var(--ink); border-radius: 16px;
  background: var(--sun); box-shadow: 0 5px 0 var(--ink);
  font-size: clamp(1.4rem, 6vw, 2.4rem); font-weight: 900; line-height: 1.12;
  text-transform: uppercase; letter-spacing: .03em; overflow-wrap: anywhere;
  transform: rotate(-1deg);
}
.prompt .join .tile { background: var(--pink); transform: rotate(1.2deg); }
.op { flex: none; color: var(--coral-dark); font-size: 1.6rem; font-weight: 900; line-height: 1; }
.prompt .op, .rv-words .op { display: grid; place-items: center; width: 1.6em; height: 1.6em; border: 3px solid var(--ink); border-radius: 50%; background: var(--paper); color: var(--coral-dark); font-size: 1.35rem; }
.word-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; max-width: 560px; margin: 22px auto 0; text-align: left; }
.word-input, .text-input {
  width: 100%; min-height: 58px; padding: 12px 16px;
  border: 3px solid var(--ink); border-radius: var(--radius-sm);
  background: #fff; color: var(--ink);
  font-size: 1.3rem; font-weight: 800; letter-spacing: .01em;
  transition: border-color .12s ease, box-shadow .12s ease;
}
.word-input { text-align: center; box-shadow: inset 0 3px 0 rgba(43, 27, 61, .08); }
.word-input::placeholder, .text-input::placeholder { color: #7a6472; font-weight: 700; }
.word-input:focus, .text-input:focus { outline: none; border-color: var(--grape); box-shadow: 0 0 0 5px rgba(123, 79, 201, .3); }
.word-input[aria-invalid="true"] { border-color: var(--coral-dark); box-shadow: 0 0 0 5px rgba(255, 107, 87, .32); animation: nudge .3s ease-out; }
.word-input:disabled { background: #f1e8dd; color: var(--muted); }
.suggestion { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; padding: 8px 10px; border: 2px dashed var(--teal-dark); border-radius: 14px; background: var(--mint); font-weight: 800; }
.suggestion:empty { display: none; }
.form-help { grid-column: 1 / -1; min-height: 1.5em; color: var(--muted); font-weight: 700; font-size: .98rem; text-align: center; overflow-wrap: anywhere; }
.form-help.error { color: var(--error-ink); background: var(--error-bg); border: 2px solid var(--coral); border-radius: 12px; padding: 8px 12px; }
.form-help.error::before { content: "\u270B "; }
.share { max-width: 460px; margin: 22px auto 0; padding: 18px; border: 3px dashed var(--ink); border-radius: var(--radius); background: var(--mint); }
.share p { margin: 6px 0; }
.code { display: inline-block; margin: 10px 0; padding: 4px 16px; border: 3px solid var(--ink); border-radius: 14px; background: var(--paper); box-shadow: 0 4px 0 var(--ink); font-size: clamp(1.5rem, 7vw, 2.2rem); font-weight: 900; letter-spacing: .1em; overflow-wrap: anywhere; }

/* reveal: a sticker on top, then the two words side by side */

/* chips used by reveal + trail */
.chip { display: inline-flex; flex-direction: column; align-items: center; min-width: 0; max-width: 100%; overflow-wrap: anywhere; padding: 5px 11px; border: 2px solid var(--ink); border-radius: 12px; background: #fff; font-weight: 900; text-transform: uppercase; letter-spacing: .02em; line-height: 1.15; text-align: center; }
.chip small { font-size: .66rem; line-height: 1.3; letter-spacing: .1em; color: var(--muted); text-transform: uppercase; font-weight: 800; overflow-wrap: anywhere; }
.chip-word { overflow-wrap: anywhere; -webkit-hyphens: auto; hyphens: auto; }
.chip.you { background: var(--you); }
.chip.other { background: var(--other); }
.chip.plain { background: var(--peach); }
.chip.mystery { border-style: dashed; background: var(--paper); }
.chip.mystery .chip-word { min-width: 1.4em; }

/* end of game */
.end { padding: 10px 0 4px; }
.end-actions .btn:not(.big) { min-height: 52px; }
.end p { max-width: 520px; margin: 10px auto 18px; color: var(--muted); font-size: 1.08rem; text-wrap: balance; }
.end-icon { display: inline-grid; place-items: center; width: 84px; height: 84px; margin-top: 14px; border: 3px solid var(--ink); border-radius: 50%; background: var(--sun); box-shadow: 0 5px 0 var(--ink); font-size: 2.6rem; line-height: 1; animation: bounce .7s cubic-bezier(.2, 1.6, .4, 1) both; }
/* sleepy token: droops and yawns once, then rests (resting pose is the final frame) */
.sleepy { position: relative; display: inline-block; width: 92px; height: 92px; margin: 16px 0 4px; }
.sleepy-face { position: absolute; inset: 0; border: 3px solid var(--ink); border-radius: 50%; background: var(--other); box-shadow: 0 5px 0 var(--ink); transform: rotate(-12deg) translateY(5px); }
.sleepy .eye { position: absolute; top: 40%; width: 20px; height: 5px; border-radius: 0 0 10px 10px; background: var(--ink); }
.sleepy .eye.left { left: 20%; }
.sleepy .eye.right { right: 20%; }
.sleepy .mouth { position: absolute; left: 50%; top: 63%; width: 12px; height: 7px; margin-left: -6px; border-radius: 50%; background: var(--ink); }
.zzz { position: absolute; top: -12px; right: -26px; display: flex; align-items: flex-end; gap: 1px; color: var(--grape); font-weight: 900; line-height: 1; }
.zzz b { font-size: .8rem; }
.zzz b + b { font-size: 1rem; transform: translateY(-6px); }
.zzz b + b + b { font-size: 1.25rem; transform: translateY(-14px); }
.sleepy.animate .sleepy-face { animation: droop 1.5s ease-in-out .3s both; }
.sleepy.animate .eye { animation: blinkShut 1.5s ease-in-out .3s both; }
.sleepy.animate .mouth { animation: yawn 1.5s ease-in-out .3s both; }
.sleepy.animate .zzz { animation: zzzIn .6s ease-out 1.6s both; }
.end.over .board-title { color: var(--grape); text-shadow: 3px 3px 0 var(--sun-soft); }
.end.win .board-title { color: var(--teal-dark); text-shadow: 3px 3px 0 var(--sun); }

/* word trail */
.trail-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 6px 16px; }
.trail-meta { display: inline-flex; flex-wrap: wrap; gap: 0 6px; padding: 4px 12px; border: 2px solid var(--ink); border-radius: 14px; background: var(--peach); color: var(--muted); font-size: .9rem; line-height: 1.35; max-width: 100%; overflow-wrap: anywhere; }
.trail-meta strong { color: var(--ink); overflow-wrap: anywhere; }
.trail-when { white-space: normal; }
.trail-list { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 10px; }
.trail-row { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 12px; padding: 10px 12px; border: 2px solid var(--line); border-radius: 16px; background: #fffdf8; }
.trail-row:first-child { border-color: var(--ink); }
.trail-next { grid-column: 2; margin: -4px 0 0; color: var(--muted); font-size: .78rem; font-weight: 800; letter-spacing: .06em; line-height: 1.3; text-transform: uppercase; }
/* the open round, pinned above the finished rounds */
.trail-now { margin: 14px 0 0; padding: 10px 12px 12px; border: 3px dashed var(--ink); border-radius: 18px; background: var(--sun-soft); }
.now-label { display: inline-flex; align-items: center; gap: 8px; margin: 0 0 8px; padding: 2px 12px; border: 2px solid var(--ink); border-radius: 999px; background: var(--grape); color: #fff; font-size: .8rem; font-weight: 900; letter-spacing: .08em; line-height: 1.5; text-transform: uppercase; }
.now-dot { width: 10px; height: 10px; flex: none; border: 2px solid var(--ink); border-radius: 50%; background: var(--sun); animation: blink 1.6s ease-in-out infinite; }
.trail-row-inner { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 12px; }
.trail-now .move-badge { background: var(--coral); }
.trail-now + .trail-list, .trail-now + .empty { margin-top: 18px; padding-top: 16px; border-top: 3px dotted var(--line); }
.trail-row.match { border-color: var(--ink); background: var(--mint); }
.trail-row.match .move-badge { background: var(--teal); }
.move-badge { display: grid; place-items: center; width: 2.1em; height: 2.1em; border: 2px solid var(--ink); border-radius: 50%; background: var(--sun); font-weight: 900; font-variant-numeric: tabular-nums; }
.trail-eq { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; min-width: 0; }
.trail-in, .trail-out { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; min-width: 0; max-width: 100%; }
.trail-eq .join { gap: 6px 8px; }
.trail-eq .op { font-size: 1.1rem; color: var(--coral-dark); }
.trail-eq .chip { font-size: .95rem; }
.trail-in .chip { box-shadow: none; }
.trail-out .chip { box-shadow: 0 2px 0 var(--ink); }
.arrow { flex: none; display: grid; place-items: center; width: 1.8em; height: 1.8em; border-radius: 50%; background: var(--grape); color: #fff; font-size: 1.05rem; font-weight: 900; line-height: 1; }
.start-label { padding: 5px 10px; border: 2px dashed var(--muted); border-radius: 12px; color: var(--muted); font-weight: 800; font-size: .85rem; letter-spacing: .06em; text-transform: uppercase; }
.match-badge { padding: 3px 10px; border-radius: 999px; background: var(--teal); border: 2px solid var(--ink); font-size: .8rem; font-weight: 900; letter-spacing: .04em; text-transform: uppercase; }

/* ---------- toasts ---------- */
.toasts { position: fixed; z-index: 40; left: 50%; bottom: max(16px, env(safe-area-inset-bottom)); transform: translateX(-50%); display: grid; gap: 8px; width: min(520px, calc(100% - 32px)); pointer-events: none; }
.toast { display: flex; align-items: center; gap: 10px; padding: 8px 8px 8px 16px; border: 3px solid var(--ink); border-radius: 16px; background: var(--paper); box-shadow: 0 4px 0 var(--ink); font-weight: 800; line-height: 1.35; pointer-events: auto; animation: rise .25s ease-out both; }
.toast.success { background: var(--mint); }
.toast.error { background: var(--error-bg); color: var(--error-ink); }
.toast.leaving { opacity: 0; transition: opacity .2s; }
.toast-text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.toast-action { min-height: 44px; padding: 6px 12px; border: 2px solid var(--ink); border-radius: 10px; background: var(--sun); font-weight: 900; cursor: pointer; }
.toast-close { width: 44px; height: 44px; flex: none; border: 0; border-radius: 10px; background: transparent; font-size: 1.5rem; line-height: 1; cursor: pointer; }
.toast-close:hover { background: rgba(43, 27, 61, .08); }

/* ---------- dialog ---------- */
.dialog { width: min(480px, calc(100% - 32px)); max-height: calc(100% - 32px); padding: 0; border: 3px solid var(--ink); border-radius: var(--radius); background: var(--paper); color: var(--ink); box-shadow: 0 8px 0 var(--ink); }
.dialog::backdrop { background: rgba(43, 27, 61, .55); }
.dialog-body { display: grid; gap: 12px; padding: 22px; }
.dialog-body p { color: var(--muted); }
.dialog-body .code { justify-self: start; }
.field { display: grid; gap: 6px; }
.field label { font-weight: 900; }
.dialog-body .form-help:empty { min-height: 0; height: 0; margin: -12px 0 0; padding: 0; border: 0; overflow: hidden; }

/* ---------- notifications panel ---------- */
.notif-dialog { width: min(540px, calc(100% - 32px)); }
.notif-panel { display: grid; gap: 10px; min-width: 0; }
.notif-tools { margin: 0; }
.notif-list { list-style: none; margin: 0; padding: 2px 2px 6px; display: grid; gap: 10px; max-height: min(58vh, 460px); overflow-y: auto; }
.notif-row {
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 10px;
  width: 100%; min-height: 60px; padding: 10px 12px; border: 2px solid var(--line); border-radius: 16px;
  background: #fff; color: var(--ink); text-align: left; cursor: pointer;
  transition: transform .08s ease, box-shadow .08s ease, background-color .12s ease;
}
.notif-row:hover { background: var(--sun-soft); }
.notif-row:active { transform: translateY(2px); }
.notif-item.unread .notif-row { border: 3px solid var(--ink); background: var(--sun-soft); box-shadow: 0 3px 0 var(--ink); }
.notif-item.unread .notif-row:active { box-shadow: 0 1px 0 var(--ink); }
.notif-body { display: grid; min-width: 0; }
.notif-text { font-weight: 800; line-height: 1.3; overflow-wrap: anywhere; }
.dialog-body .notif-when { color: var(--muted); font-size: .85rem; }
.notif-new { padding: 2px 9px; border: 2px solid var(--ink); border-radius: 999px; background: var(--coral); font-size: .75rem; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
.dialog-body .notif-empty { color: var(--muted); }

/* ---------- celebration ---------- */
.confetti { position: fixed; inset: 0; z-index: 30; pointer-events: none; overflow: hidden; }
.confetti i { position: absolute; top: -20px; width: 12px; height: 18px; border: 2px solid var(--ink); border-radius: 3px; animation: fall 1.4s ease-in forwards; }
.confetti i:nth-child(3n) { border-radius: 50%; width: 14px; height: 14px; }
.confetti i:nth-child(4n) { width: 8px; height: 22px; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pop { from { transform: scale(.92); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes flip { from { transform: rotateX(90deg); } to { transform: none; } }
@keyframes rise { from { transform: translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes fall { to { transform: translate(var(--drift, 0), 105vh) rotate(540deg); } }
@keyframes bounce { 0% { transform: scale(.4) rotate(-12deg); opacity: 0; } 70% { transform: scale(1.08) rotate(4deg); opacity: 1; } 100% { transform: none; } }
@keyframes wiggle { 0% { transform: scale(.9); } 60% { transform: scale(1.05) rotate(2deg); } 100% { } }
@keyframes stonePop { 0% { transform: scale(.6); } 60% { transform: scale(1.45); } 100% { transform: scale(1.18); } }
@keyframes droop { 0% { transform: none; } 35% { transform: rotate(4deg) translateY(-2px); } 70% { transform: rotate(-16deg) translateY(7px); } 100% { transform: rotate(-12deg) translateY(5px); } }
@keyframes blinkShut { 0%, 30% { height: 14px; border-radius: 50%; } 100% { height: 5px; border-radius: 0 0 10px 10px; } }
@keyframes yawn { 0%, 25% { width: 12px; height: 7px; margin-left: -6px; } 50%, 62% { width: 20px; height: 22px; margin-left: -10px; } 100% { width: 12px; height: 7px; margin-left: -6px; } }
@keyframes zzzIn { from { opacity: 0; transform: translate(-8px, 8px); } to { opacity: 1; transform: none; } }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
@keyframes nudge { 0%, 100% { transform: none; } 30% { transform: translateX(-5px); } 65% { transform: translateX(4px); } }

/* ---------- responsive ---------- */
@media (max-width: 720px) {
  .start-grid { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  /* Trail: prompts on the first line, the reveal on the second. */
  .trail-row { align-items: center; gap: 8px 10px; padding: 10px; }
  .trail-eq { display: contents; }
  .trail-out { grid-column: 1 / -1; }
  .trail-next { grid-column: 1 / -1; }
  .trail-row-inner { align-items: center; gap: 8px 10px; }
  .move-badge { width: 1.95em; height: 1.95em; }
}
@media (max-width: 600px) {
  /* Two rows of ten stepping stones on phones. */
  .stones { grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 6px 5px; padding: 8px; border-radius: 22px; }
  .stone { max-height: 30px; font-size: min(clamp(.62rem, 2.6vw, .85rem), 3.2vw); }
}
@media (max-width: 480px) {
  body { font-size: 17px; }
  .topbar { gap: 8px; padding-top: max(10px, env(safe-area-inset-top)); }
  .top-actions { gap: 6px; }
  .lang-switch button { min-width: 44px; padding: 0 8px; }
  .avatar, .bell { width: 44px; height: 44px; font-size: 1.15rem; }
  .word-form { grid-template-columns: 1fr; }
  .word-form .btn { width: 100%; }
  .start .btn { align-self: stretch; }
  .game-item { grid-template-columns: auto minmax(0, 1fr); }
  .game-item .btn { grid-column: 1 / -1; width: 100%; }
  .solo-card::after, .family-card::after { width: 44px; height: 10px; top: 16px; right: 16px; }
  .tile { padding: 10px 16px; }
  .trail-eq .chip { font-size: .86rem; padding: 4px 9px; }
  .trail-eq .op { font-size: 1rem; }
}
@media (max-width: 360px) {
  .brand-top { font-size: min(1.22rem, 6.1vw); text-shadow: 2px 2px 0 var(--sun); }
  .brand-bottom { font-size: min(.66rem, 3.3vw); letter-spacing: .12em; }
  .card { padding: 16px 14px; }
  .trail-row { padding: 8px; gap: 8px; }
  .trail-eq .chip { letter-spacing: 0; font-size: .82rem; }
  .prompt, .prompt .join { gap: 8px; }
  .tile { padding: 8px 12px; font-size: 1.3rem; letter-spacing: .02em; }
  .prompt .op, .rv-words .op { width: 1.6em; height: 1.6em; font-size: 1.1rem; border-width: 2px; }
}
@media (orientation: landscape) and (max-height: 500px) {
  .topbar { padding-top: max(8px, env(safe-area-inset-top)); }
  .hero { padding: 10px 0 14px; }
  .hero h1 { font-size: 2.2rem; }
  .game-nav { margin-bottom: 12px; }
  .board { padding-top: 20px; padding-bottom: 18px; }
  .board-title { margin-top: 10px; font-size: 1.5rem; }
  .instruction { margin-top: 4px; font-size: .98rem; }
  .prompt { margin: 12px 0 6px; }
  .tile { padding: 6px 16px; font-size: 1.45rem; }
  .word-form { margin-top: 14px; }
  .end-icon { width: 64px; height: 64px; font-size: 2rem; margin-top: 6px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .001ms !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; scroll-behavior: auto !important; }
  .btn:hover { transform: none; }
}
@media (forced-colors: active) {
  .btn, .chip, .tile, .card { border-color: CanvasText; }
  body::before, .board::before { background: CanvasText; }
}

.tile { -webkit-hyphens: auto; hyphens: auto; }
.pill-short { display: none; }
@media (max-width: 480px) {
  .pill-long { display: none; }
  .pill-short { display: inline; }
}
/* Phones with the bell showing: keep the header on one line. */
@media (max-width: 400px) {
  .topbar:has(.bell:not([hidden])) .brand-top { font-size: min(1.22rem, 4.7vw); text-shadow: 2px 2px 0 var(--sun); }
  .topbar:has(.bell:not([hidden])) .brand-bottom { font-size: min(.66rem, 2.7vw); letter-spacing: .08em; }
  .topbar:has(.bell:not([hidden])) .top-actions { gap: 5px; flex-wrap: nowrap; }
  .topbar:has(.bell:not([hidden])) .lang-switch button { min-width: 44px; padding: 0 6px; }
}

/* ---------- reveal modal: countdown \u2192 reveal \u2192 Keep playing (one surface) ---------- */
.reveal-modal { width: min(560px, calc(100% - 24px)); max-height: calc(100% - 24px); overflow: auto; padding: 0; border: 3px solid var(--ink); border-radius: var(--radius); background: var(--sun-soft, #fff0c9); color: var(--ink); box-shadow: 0 8px 0 var(--ink); }
.reveal-modal.match { background: var(--mint); }
.reveal-modal::backdrop { background: rgba(43, 27, 61, .6); }
.rv-body { display: grid; justify-items: center; gap: 12px; padding: 22px 18px 24px; text-align: center; }
.rv-kicker { padding: 3px 16px; border: 3px solid var(--ink); border-radius: 999px; background: var(--grape); box-shadow: 0 3px 0 var(--ink); color: #fff; font-size: .9rem; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; transform: rotate(-3deg); }
.reveal-modal.match .rv-kicker { background: var(--teal-dark); }
.rv-count { display: grid; place-items: center; min-height: 2.4em; color: var(--coral-dark); font-size: clamp(3.5rem, 18vw, 6rem); font-weight: 900; line-height: 1; text-shadow: 4px 4px 0 var(--sun); }
.rv-count.words { font-size: clamp(2rem, 9vw, 3rem); text-transform: uppercase; }
.rv-count.bump { animation: countBump .38s cubic-bezier(.2, 1.6, .4, 1) both; }
.rv-result { display: grid; justify-items: center; gap: 10px; width: 100%; }
.rv-result[hidden], .rv-count[hidden] { display: none; }
.rv-pair { display: inline-block; max-width: 100%; }
.rv-words { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 12px 14px; max-width: 100%; }
.rv-word { display: inline-flex; flex-direction: column; align-items: center; gap: 4px; max-width: 100%; padding: 8px 18px; border: 3px solid var(--ink); border-radius: 16px; background: #fff; box-shadow: 0 4px 0 var(--ink); font-weight: 900; text-transform: uppercase; }
.rv-word.you { background: #ffe5df; }
.rv-word.other { background: #dff3f1; }
.rv-word small { font-size: .72rem; letter-spacing: .1em; color: var(--muted); font-weight: 800; }
.rv-word .chip-word { font-size: clamp(1.4rem, 6vw, 2.1rem); line-height: 1.1; overflow-wrap: anywhere; -webkit-hyphens: auto; hyphens: auto; }
.rv-outcome { font-weight: 800; font-size: 1.1rem; line-height: 1.35; text-wrap: balance; }
.rv-note { color: var(--muted); font-size: .95rem; }
.rv-next { padding: 8px 14px; border: 2px dashed var(--ink); border-radius: 14px; background: var(--paper); font-weight: 800; overflow-wrap: anywhere; }
.rv-continue { margin-top: 4px; }
.rv-step { opacity: 0; transform: translateY(10px) scale(.9); }
.rv-step.show { opacity: 1; transform: none; transition: opacity .22s ease-out, transform .28s cubic-bezier(.2, 1.5, .4, 1); }
.rv-continue { animation: pop .3s cubic-bezier(.2, 1.4, .4, 1) both; }
@keyframes countBump { 0% { transform: scale(.4); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: none; } }
@media (orientation: landscape) and (max-height: 500px) {
  .rv-body { gap: 8px; padding: 14px 14px 16px; }
  .rv-count { min-height: 1.6em; font-size: 3.5rem; }
  .rv-word .chip-word { font-size: 1.3rem; }
}
@media (prefers-reduced-motion: reduce) {
  .rv-step, .rv-step.show { opacity: 1; transform: none; transition: none; }
}

/* ---------- Gary from Accounting (Solo opponent) ---------- */
.gary-art-wrap { display: inline-grid; place-items: center; flex: none; line-height: 0; }
.gary-art { width: 100%; height: 100%; overflow: visible; }
.gary-art * { stroke: var(--ink); stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
.gary-art .g-head, .gary-art .g-ear { fill: var(--peach); }
.gary-art .g-nose { fill: var(--coral); }
.gary-art .g-shirt, .gary-art .g-collar { fill: var(--paper); }
.gary-art .g-tie { fill: var(--grape); }
.gary-art .g-glass { fill: rgba(255, 255, 255, .45); }
.gary-art .g-eye { fill: var(--ink); stroke: none; }
.gary-art .g-hair, .gary-art .g-brow, .gary-art .g-bridge, .gary-art .g-lid, .gary-art .g-mouth { fill: none; }
.gary-art .g-shut { display: none; }
.gary-sleepy .g-open { display: none; }
.gary-sleepy .g-shut { display: inline; }
.gary-sleepy .g-mouth { d: path("M53 81q7 3 14 0"); }

/* Small Gary in round badges (mode chip, game list). */
.badge.gary { overflow: hidden; padding: 0; background: var(--sun); }
.badge.gary .badge-art { width: 112%; height: 112%; transform: translateY(8%); }

/* In the reveal modal: a tiny Gary next to "GARY'S WORD", his word typed in, an occasional remark. */
.rv-word.gary small { display: inline-flex; align-items: center; gap: 6px; }
.rv-word.gary .tiny { width: 26px; height: 26px; border: 2px solid var(--ink); border-radius: 50%; overflow: hidden; background: var(--sun); }
.rv-word.gary .tiny .gary-art { transform: translateY(10%) scale(1.15); }
.rv-word .chip-word .ghost { visibility: hidden; }
.gary-line { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; margin: 0; padding: 6px 14px; border: 2px solid var(--ink); border-radius: 14px 14px 14px 4px; background: var(--paper); font-weight: 800; font-size: 1rem; line-height: 1.3; overflow-wrap: anywhere; }
.gary-line[hidden] { display: none; }
.gary-says .ghost { visibility: hidden; }

/* Solo game over: sleepy Gary says goodbye. */
.gary-end { display: grid; justify-items: center; gap: 8px; margin: 12px auto 0; }
.gary-end .end-art { width: 112px; height: 112px; border: 3px solid var(--ink); border-radius: 50%; overflow: hidden; background: var(--sun); box-shadow: 0 4px 0 var(--ink); }
.gary-end .end-art .gary-art { transform: translateY(9%) scale(1.08); }
.gary-end.animate .end-art .gary-art { animation: garyDroop 1.6s ease-in-out .2s both; }
.gary-bye { display: grid; gap: 2px; margin: 0; font-weight: 800; font-size: 1.05rem; color: var(--ink); }
.gary-bye .bye-line:empty { display: none; }
.gary-bye .later { color: var(--muted); }
@keyframes garyDroop { 0% { transform: translateY(9%) scale(1.08); } 45% { transform: translateY(13%) rotate(-5deg) scale(1.08); } 100% { transform: translateY(11%) rotate(-3deg) scale(1.08); } }

/* "Meet your rival" intro (first Solo game). */
.gary-intro { width: min(440px, calc(100% - 24px)); max-height: calc(100% - 24px); overflow: auto; padding: 0; border: 3px solid var(--ink); border-radius: var(--radius); background: var(--cream); color: var(--ink); box-shadow: 0 8px 0 var(--ink); }
.gary-intro::backdrop { background: rgba(43, 27, 61, .6); }
.gi-body { display: grid; justify-items: center; gap: 10px; padding: 22px 18px 24px; text-align: center; }
.gi-body .intro-art { width: clamp(110px, 32vw, 150px); height: clamp(110px, 32vw, 150px); border: 3px solid var(--ink); border-radius: 50%; overflow: hidden; background: var(--sun); box-shadow: 0 5px 0 var(--ink); }
.gi-body .intro-art .gary-art { transform: translateY(8%) scale(1.06); }
.gi-title { margin: 4px 0 0; font-size: clamp(1.4rem, 5vw, 1.8rem); }
.gi-says { display: grid; gap: 2px; font-size: 1.15rem; font-weight: 800; line-height: 1.35; }
.gi-says p { margin: 0; }
.gi-aside { color: var(--muted); font-size: 1rem; }
.gary-intro.animate .gi-line, .gary-intro.animate .gi-aside { animation: rise .3s ease-out both; animation-delay: calc(.25s + var(--i) * .45s); }
@media (orientation: landscape) and (max-height: 500px) {
  .gi-body { gap: 6px; padding: 14px; }
  .gi-body .intro-art { width: 84px; height: 84px; }
}
@media (prefers-reduced-motion: reduce) {
  .gary-end .end-art .gary-art { animation: none; }
}
`, "type": "text/css; charset=utf-8", "cache": "public, max-age=31536000, immutable", "etag": '"0b3586b782"' }, "/sw.js": { "body": '(()=>{const c="dec5a36658",i=`shell-${c}`,l=["/","/assets/app.2b788f7188.js","/assets/styles.0b3586b782.css","/icon.svg","/manifest.webmanifest"],r=/^\\/(?:$|index\\.html$|games\\/|join\\/|solo\\/?)/;self.addEventListener("install",e=>{e.waitUntil((async()=>{await(await caches.open(i)).addAll(l.map(a=>new Request(a,{cache:"reload"}))),self.registration.active||await self.skipWaiting()})())});self.addEventListener("message",e=>{e.data&&e.data.type==="SKIP_WAITING"&&self.skipWaiting()});self.addEventListener("activate",e=>{e.waitUntil((async()=>{const t=await caches.keys();await Promise.all(t.filter(a=>a.startsWith("shell-")&&a!==i).map(a=>caches.delete(a))),await self.clients.claim()})())});async function n(e){return(await caches.open(i)).match(e)}self.addEventListener("fetch",e=>{const t=e.request;if(t.method!=="GET")return;const a=new URL(t.url);if(!(a.origin!==location.origin||a.pathname.startsWith("/api/"))){if(t.mode==="navigate"){if(!r.test(a.pathname))return;e.respondWith(n("/").then(s=>s||fetch(t)));return}e.respondWith(n(t).then(s=>s||fetch(t)))}});})();\n', "type": "text/javascript; charset=utf-8", "cache": "no-store", "etag": '"ab32d9595a"' }, "/icon.svg": { "body": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#ffc93c"/><circle cx="48" cy="64" r="30" fill="#ff6b57" stroke="#2b1b3d" stroke-width="6"/><circle cx="80" cy="64" r="30" fill="#1fb5a8" fill-opacity=".9" stroke="#2b1b3d" stroke-width="6"/><path d="M64 40a30 30 0 0 1 0 48a30 30 0 0 1 0-48z" fill="#7b4fc9" stroke="#2b1b3d" stroke-width="6"/></svg>\n', "type": "image/svg+xml", "cache": "no-cache", "etag": '"95cef7f91a"' }, "/manifest.webmanifest": { "body": '{\n  "id": "/",\n  "name": "Same Same but Different",\n  "short_name": "Same Same",\n  "start_url": "/",\n  "scope": "/",\n  "display": "standalone",\n  "background_color": "#fff4df",\n  "theme_color": "#fff4df",\n  "icons": [\n    {\n      "src": "/icon.svg",\n      "sizes": "any",\n      "type": "image/svg+xml",\n      "purpose": "any"\n    }\n  ]\n}\n', "type": "application/manifest+json", "cache": "no-cache", "etag": '"fc1f27ed12"' } };

// src/server/worker.js
var SHELL_ROUTES = /^\/(?:$|index\.html$|games\/|join\/|solo\/?)/;
function serveAsset(path, request) {
  const asset = assets[path];
  if (!asset) return null;
  const headers = { "content-type": asset.type, "cache-control": asset.cache, etag: asset.etag };
  if (path === "/sw.js") headers["service-worker-allowed"] = "/";
  if (request.headers.get("if-none-match") === asset.etag) return new Response(null, { status: 304, headers });
  return new Response(request.method === "HEAD" ? null : asset.body, { headers });
}
var worker_default = {
  /**
   * @param {Request} request
   * @param {{DB?: import("../shared/types.js").D1Database}} env
   * @returns {Promise<Response>}
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env);
      } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: "Something went wrong. Please try again.", code: "SERVER_ERROR" }), { status: 500, headers: { "content-type": "application/json", "cache-control": "no-store" } });
      }
    }
    const direct = serveAsset(url.pathname, request);
    if (direct) return direct;
    const shell = SHELL_ROUTES.test(url.pathname) ? serveAsset("/index.html", request) : null;
    if (shell) return shell;
    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
  }
};
export {
  worker_default as default
};
