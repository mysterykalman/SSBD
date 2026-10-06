import {html} from "./app.html.js";

const MAX_MOVES = 20;
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {"content-type": "application/json", "cache-control": "no-store"}
});
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const code = () => Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.floor(10 + Math.random() * 90);
const completeStatuses = new Set(["MATCHED", "EXHAUSTED", "COMPLETE"]);

async function q(db, sql, args = []) {
  return db.prepare(sql).bind(...args).all();
}

async function init(db) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, recovery_code TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, join_code TEXT UNIQUE NOT NULL, status TEXT NOT NULL, round_number INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS game_players (game_id TEXT NOT NULL, player_id TEXT NOT NULL, slot INTEGER NOT NULL, joined_at TEXT NOT NULL, PRIMARY KEY(game_id, player_id), UNIQUE(game_id, slot))"),
    db.prepare("CREATE TABLE IF NOT EXISTS rounds (id TEXT PRIMARY KEY, game_id TEXT NOT NULL, round_number INTEGER NOT NULL, previous_a TEXT, previous_b TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL, revealed_at TEXT, UNIQUE(game_id, round_number))"),
    db.prepare("CREATE TABLE IF NOT EXISTS submissions (round_id TEXT NOT NULL, player_id TEXT NOT NULL, word TEXT NOT NULL, submitted_at TEXT NOT NULL, PRIMARY KEY(round_id, player_id))"),
    db.prepare("CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, player_id TEXT NOT NULL, game_id TEXT, kind TEXT NOT NULL, message TEXT NOT NULL, read_at TEXT, created_at TEXT NOT NULL)")
  ]).catch(() => {});
  try { await db.prepare("ALTER TABLE games ADD COLUMN language TEXT DEFAULT 'en'").run(); } catch {}
  try { await db.prepare("ALTER TABLE rounds ADD COLUMN bot_quality TEXT DEFAULT NULL").run(); } catch {}
  try { await db.prepare("ALTER TABLE rounds ADD COLUMN bot_reason TEXT DEFAULT NULL").run(); } catch {}
}

function normalizeWord(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

const associationBanks = {
  en: [
    {terms:["SUN","MOON","STAR","SKY","CLOUD","RAIN","SNOW","LIGHT","DAY","NIGHT","SPACE","WEATHER"], words:["SKY","SPACE","DREAM","WEATHER","STORM","RAINBOW","NIGHT","LIGHT","STAR","CLOUD"]},
    {terms:["DOG","CAT","PUPPY","KITTEN","BIRD","FISH","HORSE","PET","PAW","BONE"], words:["PAW","TAIL","FUR","PET","FRIEND","HOME","PLAY","WALK","BONE"]},
    {terms:["FAMILY","MOM","DAD","MOTHER","FATHER","SISTER","BROTHER","BABY","HOME","FRIEND","LOVE"], words:["LOVE","HOME","CARE","HUG","TOGETHER","LAUGH","MEMORY","PARTY","FUN"]},
    {terms:["MAGIC","WONDER","FAIRY","DRAGON","CASTLE","PRINCESS","HERO","ADVENTURE","STORY","BOOK"], words:["STORY","QUEST","WONDER","DREAM","HERO","ADVENTURE","CASTLE","SECRET","TREASURE"]},
    {terms:["SCHOOL","TEACHER","CLASS","HOMEWORK","PENCIL","PAPER","BOOK","READ","LEARN"], words:["LEARN","READ","STORY","IDEA","TEST","CLASS","NOTE","KNOWLEDGE"]},
    {terms:["FOOD","PIZZA","APPLE","BANANA","CAKE","COOKIE","ICE CREAM","DINNER","LUNCH","SWEET","EAT"], words:["TASTE","SWEET","HUNGRY","KITCHEN","PARTY","TREAT","SHARE","YUMMY","SNACK"]},
    {terms:["MUSIC","SONG","SING","DANCE","DRUM","GUITAR","PIANO","RADIO","BEAT"], words:["BEAT","DANCE","SOUND","RHYTHM","PARTY","SHOW","SING","CONCERT"]},
    {terms:["BEACH","OCEAN","SEA","WATER","SAND","SWIM","BOAT","FISH","LAKE","RIVER"], words:["WAVE","SUMMER","SUN","SAND","SWIM","BLUE","VACATION","BOAT","SPLASH"]},
    {terms:["GAME","PLAY","TOY","FUN","WIN","TEAM","SPORT","BALL","RACE","PUZZLE"], words:["PLAY","FUN","TEAM","WIN","TURN","SCORE","CHALLENGE","LAUGH","PRIZE"]},
    {terms:["RED","BLUE","GREEN","YELLOW","PINK","PURPLE","ORANGE","COLOUR","COLOR","RAINBOW"], words:["BRIGHT","RAINBOW","PAINT","ART","SHINE","COLOUR","COLOR","CRAYON"]},
    {terms:["TIME","CLOCK","TODAY","TOMORROW","YESTERDAY","YEAR","WEEK","MORNING","AFTERNOON","EVENING"], words:["MOMENT","FUTURE","PAST","DAY","WAIT","CHANGE","MEMORY","DREAM"]}
  ],
  fr: [
    {terms:["SOLEIL","LUNE","ETOILE","CIEL","NUAGE","PLUIE","NEIGE","LUMIERE","JOUR","NUIT","ESPACE","METEO"], words:["CIEL","ESPACE","REVE","METEO","ORAGE","ARCENCIEL","NUIT","LUMIERE","ETOILE","NUAGE"]},
    {terms:["CHIEN","CHAT","CHIOT","CHATON","OISEAU","POISSON","CHEVAL","ANIMAL","PATTE","OS"], words:["PATTE","QUEUE","FOURRURE","AMI","MAISON","JEU","PROMENADE","OS"]},
    {terms:["FAMILLE","MAMAN","PAPA","MERE","PERE","SOEUR","FRERE","BEBE","MAISON","AMI","AMOUR"], words:["AMOUR","MAISON","SOIN","CALIN","ENSEMBLE","RIRE","SOUVENIR","FETE","JOIE"]},
    {terms:["MAGIE","MERVEILLE","FEe","DRAGON","CHATEAU","PRINCESSE","HERO","AVENTURE","HISTOIRE","LIVRE"], words:["HISTOIRE","QUETE","MERVEILLE","REVE","HERO","AVENTURE","CHATEAU","SECRET","TRESOR"]},
    {terms:["ECOLE","PROFESSEUR","CLASSE","DEVOIR","CRAYON","PAPIER","LIVRE","LIRE","APPRENDRE"], words:["APPRENDRE","LIRE","HISTOIRE","IDEE","TEST","CLASSE","NOTE","SAVOIR"]},
    {terms:["NOURRITURE","PIZZA","POMME","BANANE","GATEAU","BISCUIT","GLACE","DINER","REPAS","SUCRE","MANGER"], words:["GOUT","SUCRE","FAIM","CUISINE","FETE","GOURMANDISE","PARTAGER","DELICIEUX","COLLATION"]},
    {terms:["MUSIQUE","CHANSON","CHANTER","DANSER","TAMBOUR","GUITARE","PIANO","RADIO","RYTHME"], words:["RYTHME","DANSE","SON","MUSIQUE","FETE","SPECTACLE","CHANTER","CONCERT"]},
    {terms:["PLAGE","OCEAN","MER","EAU","SABLE","NAGER","BATEAU","POISSON","LAC","RIVIERE"], words:["VAGUE","ETE","SOLEIL","SABLE","NAGER","BLEU","VACANCES","BATEAU","ECLABOUSSURE"]},
    {terms:["JEU","JOUER","JOUET","AMUSANT","GAGNER","EQUIPE","SPORT","BALLON","COURSE","PUZZLE"], words:["JOUER","AMUSANT","EQUIPE","GAGNER","TOUR","SCORE","DEFI","RIRE","PRIX"]},
    {terms:["ROUGE","BLEU","VERT","JAUNE","ROSE","VIOLET","ORANGE","COULEUR","ARCENCIEL"], words:["BRILLANT","ARCENCIEL","PEINTURE","ART","ECLAT","COULEUR","CRAYON"]},
    {terms:["TEMPS","HORLOGE","AUJOURDHUI","DEMAIN","HIER","ANNEE","SEMAINE","MATIN","APRESMIDI","SOIR"], words:["MOMENT","AVENIR","PASSE","JOUR","ATTENTE","CHANGEMENT","SOUVENIR","REVE"]}
  ]
};

const bridgePatterns = {
  en: [
    {terms:["SUN","MOON"], words:["SKY","SPACE","LIGHT","NIGHT","DREAM"]},
    {terms:["DAY","NIGHT"], words:["TIME","SKY","DREAM","LIGHT","SLEEP"]},
    {terms:["MAGIC","FAMILY"], words:["STORY","DREAM","LOVE","ADVENTURE","FUN"]},
    {terms:["DOG","CAT"], words:["PET","ANIMAL","PAW","HOME","FRIEND"]},
    {terms:["BOOK","SCHOOL"], words:["READ","STORY","LEARN","CLASS","KNOWLEDGE"]},
    {terms:["BEACH","SUN"], words:["SUMMER","VACATION","WATER","SAND","FUN"]},
    {terms:["MUSIC","DANCE"], words:["RHYTHM","PARTY","BEAT","SONG","FUN"]},
    {terms:["RAIN","CLOUD"], words:["WEATHER","STORM","WATER","SKY","RAINBOW"]},
    {terms:["FOOD","FAMILY"], words:["DINNER","KITCHEN","SHARE","PARTY","LOVE"]},
    {terms:["GAME","FAMILY"], words:["FUN","PLAY","TURN","TEAM","LAUGH"]}
  ],
  fr: [
    {terms:["SOLEIL","LUNE"], words:["CIEL","ESPACE","LUMIERE","NUIT","REVE"]},
    {terms:["JOUR","NUIT"], words:["TEMPS","CIEL","REVE","LUMIERE","SOMMEIL"]},
    {terms:["MAGIE","FAMILLE"], words:["HISTOIRE","REVE","AMOUR","AVENTURE","JOIE"]},
    {terms:["CHIEN","CHAT"], words:["ANIMAL","PATTE","MAISON","AMI","JEU"]},
    {terms:["LIVRE","ECOLE"], words:["LIRE","HISTOIRE","APPRENDRE","CLASSE","SAVOIR"]},
    {terms:["PLAGE","SOLEIL"], words:["ETE","VACANCES","EAU","SABLE","AMUSANT"]},
    {terms:["MUSIQUE","DANSE"], words:["RYTHME","FETE","SON","CHANSON","JOIE"]},
    {terms:["PLUIE","NUAGE"], words:["METEO","ORAGE","EAU","CIEL","ARCENCIEL"]},
    {terms:["NOURRITURE","FAMILLE"], words:["DINER","CUISINE","PARTAGER","FETE","AMOUR"]},
    {terms:["JEU","FAMILLE"], words:["JOIE","JOUER","TOUR","EQUIPE","RIRE"]}
  ]
};

const directAssociations = {
  en: {
    SUN:["DAY","LIGHT","SKY","SUMMER","STAR","HEAT"], MOON:["NIGHT","SKY","SPACE","STAR","DREAM"],
    SKY:["CLOUD","BLUE","SPACE","STAR","WEATHER","NIGHT"], NIGHT:["DARK","SLEEP","DREAM","MOON","SKY","STAR"],
    SPACE:["STAR","SKY","GALAXY","ROCKET","PLANET","DREAM"], STAR:["SKY","NIGHT","SPACE","LIGHT","DREAM","GALAXY"],
    CLOUD:["RAIN","SKY","WHITE","WEATHER","STORM"], RAIN:["CLOUD","WATER","STORM","WEATHER","RAINBOW"],
    STORM:["RAIN","CLOUD","WIND","WEATHER","LIGHTNING","NIGHT"], LIGHT:["SUN","BRIGHT","LAMP","DAY","STAR","SHINE"],
    DOG:["PET","PAW","BONE","FRIEND","WALK","HOME"], CAT:["PET","PAW","FUR","HOME","FRIEND","ANIMAL"],
    FAMILY:["LOVE","HOME","CARE","TOGETHER","MEMORY","FUN"], MAGIC:["STORY","DREAM","WONDER","ADVENTURE","SECRET","TRICK"],
    BOOK:["READ","STORY","SCHOOL","PAPER","KNOWLEDGE","ADVENTURE"], SCHOOL:["LEARN","BOOK","CLASS","TEACHER","PENCIL"],
    BEACH:["SUMMER","SAND","WAVE","SUN","WATER","VACATION"], WATER:["WAVE","RAIN","OCEAN","SWIM","BLUE","SPLASH"],
    MUSIC:["SONG","BEAT","DANCE","SOUND","RADIO","PARTY"], DANCE:["MUSIC","BEAT","RHYTHM","PARTY","MOVE","FUN"],
    GAME:["PLAY","FUN","TURN","WIN","TEAM","CHALLENGE"], PLAY:["FUN","GAME","TOY","TEAM","LAUGH","TURN"],
    RAINBOW:["COLOUR","SKY","RAIN","BRIGHT","PRISM","ART"], ART:["PAINT","COLOUR","CREATIVITY","MUSIC","STORY","DRAW"],
    DREAM:["NIGHT","SLEEP","MAGIC","STORY","WISH","IMAGINE"], STORY:["BOOK","ADVENTURE","FAMILY","MAGIC","MEMORY","DREAM"]
  },
  fr: {
    SOLEIL:["JOUR","LUMIERE","CIEL","ETE","ETOILE","CHALEUR"], LUNE:["NUIT","CIEL","ESPACE","ETOILE","REVE"],
    CIEL:["NUAGE","BLEU","ESPACE","ETOILE","METEO","NUIT"], NUIT:["NOIR","SOMMEIL","REVE","LUNE","CIEL","ETOILE"],
    ESPACE:["ETOILE","CIEL","GALAXIE","FUSEE","PLANETE","REVE"], ETOILE:["CIEL","NUIT","ESPACE","LUMIERE","REVE","GALAXIE"],
    NUAGE:["PLUIE","CIEL","BLANC","METEO","ORAGE"], PLUIE:["NUAGE","EAU","ORAGE","METEO","ARCENCIEL"],
    ORAGE:["PLUIE","NUAGE","VENT","METEO","ECLAIR","NUIT"], LUMIERE:["SOLEIL","BRILLANT","LAMPE","JOUR","ETOILE","ECLAT"],
    CHIEN:["ANIMAL","PATTE","OS","AMI","PROMENADE","MAISON"], CHAT:["ANIMAL","PATTE","FOURRURE","MAISON","AMI","JEU"],
    FAMILLE:["AMOUR","MAISON","SOIN","ENSEMBLE","SOUVENIR","JOIE"], MAGIE:["HISTOIRE","REVE","MERVEILLE","AVENTURE","SECRET","TOUR"],
    LIVRE:["LIRE","HISTOIRE","ECOLE","PAPIER","SAVOIR","AVENTURE"], ECOLE:["APPRENDRE","LIVRE","CLASSE","PROFESSEUR","CRAYON"],
    PLAGE:["ETE","SABLE","VAGUE","SOLEIL","EAU","VACANCES"], EAU:["VAGUE","PLUIE","OCEAN","NAGER","BLEU","ECLABOUSSURE"],
    MUSIQUE:["CHANSON","RYTHME","DANSE","SON","RADIO","FETE"], DANSE:["MUSIQUE","RYTHME","FETE","MOUVEMENT","JOIE"],
    JEU:["JOUER","AMUSANT","TOUR","GAGNER","EQUIPE","DEFI"], JOUER:["AMUSANT","JEU","JOUET","EQUIPE","RIRE","TOUR"],
    ARCENCIEL:["COULEUR","CIEL","PLUIE","BRILLANT","PRISME","ART"], ART:["PEINTURE","COULEUR","CREATIVITE","MUSIQUE","HISTOIRE","DESSIN"],
    REVE:["NUIT","SOMMEIL","MAGIE","HISTOIRE","SOUHAIT","IMAGINATION"], HISTOIRE:["LIVRE","AVENTURE","FAMILLE","MAGIE","SOUVENIR","REVE"]
  }
};

const botHash = value => [...normalizeWord(value)].reduce((total, char, index) => (total + char.charCodeAt(0) * (index + 17)) % 2147483647, 17);

// These are deliberately small, family-friendly concept tags. A bot candidate
// must score against both prompt words. One-sided associations are never
// treated as a strong bridge.
const wordTags = {
  en: {
    SUN:["sky","light","day"], MOON:["sky","space","night"], STAR:["sky","space","night","light"], SKY:["sun","moon","space","weather"],
    NIGHT:["night","sleep","dark","dream"], NIGHTMARE:["night","sleep","dream","fear"], DREAM:["dream","sleep","wish","story"], DREAMS:["dream","wish","goal","future"],
    WAVE:["water","ocean","motion","sound","light"], BRAINWAVE:["brain","idea","wave"], SPACE:["space","sky","star"], DARK:["night","sleep","light"],
    BED:["sleep","rest","home"], SLEEP:["sleep","night","rest","dream"], SNORE:["sleep","night","sound"], LOVE:["family","heart","care"],
    CHANGE:["change","time","growth","future"], FUTURE:["future","dream","time","goal"], GROW:["growth","change","dream"], TIME:["time","change","day"],
    LIGHT:["light","sky","night","wave"], STORY:["story","book","dream","family"], MEMORY:["memory","story","family","time"],
    FAMILY:["family","love","home","care"], HOME:["home","family","sleep"], SUMMER:["summer","sun","water","beach"], WATER:["water","wave","ocean"],
    BEACH:["beach","water","summer","sun"], RAIN:["rain","water","weather"], CLOUD:["cloud","sky","weather"], STORM:["storm","rain","weather"],
    MUSIC:["music","sound","dance"], SONG:["music","sound","story"], DANCE:["music","motion","fun"], FUN:["fun","play","family"], PLAY:["fun","game","family"],
    BRAIN:["brain","idea","dream"], MIND:["brain","idea","dream","space"], IDEA:["idea","brain","change"], JOURNEY:["story","future","adventure"]
  },
  fr: {
    SOLEIL:["ciel","lumiere","jour"], LUNE:["ciel","espace","nuit"], ETOILE:["ciel","espace","nuit","lumiere"], CIEL:["soleil","lune","espace","meteo"],
    NUIT:["nuit","sommeil","noir","reve"], CAUCHEMAR:["nuit","sommeil","reve","peur"], REVE:["reve","sommeil","souhait","histoire"], REVES:["reve","souhait","but","avenir"],
    VAGUE:["eau","ocean","mouvement","son","lumiere"], ESPACE:["espace","ciel","etoile"], NOIR:["nuit","sommeil","lumiere"],
    LIT:["sommeil","repos","maison"], SOMMEIL:["sommeil","nuit","repos","reve"], RONFLEMENT:["sommeil","nuit","son"], AMOUR:["famille","coeur","soin"],
    CHANGEMENT:["changement","temps","croissance","avenir"], AVENIR:["avenir","reve","temps","but"], GRANDIR:["croissance","changement","reve"], TEMPS:["temps","changement","jour"],
    LUMIERE:["lumiere","ciel","nuit","vague"], HISTOIRE:["histoire","livre","reve","famille"], SOUVENIR:["souvenir","histoire","famille","temps"],
    FAMILLE:["famille","amour","maison","soin"], MAISON:["maison","famille","sommeil"], ETE:["ete","soleil","eau","plage"], EAU:["eau","vague","ocean"],
    PLAGE:["plage","eau","ete","soleil"], PLUIE:["pluie","eau","meteo"], NUAGE:["nuage","ciel","meteo"], ORAGE:["orage","pluie","meteo"],
    MUSIQUE:["musique","son","danse"], CHANSON:["musique","son","histoire"], DANSE:["musique","mouvement","joie"], JOIE:["joie","jeu","famille"], JEU:["joie","jeu","famille"],
    CERVEAU:["cerveau","idee","reve"], ESPRIT:["cerveau","idee","reve","espace"], IDEE:["idee","cerveau","changement"], VOYAGE:["histoire","avenir","aventure"]
  }
};

const botCatalog = {
  en: ["SKY","SPACE","LIGHT","NIGHT","SLEEP","BEDTIME","DREAM","WISH","FUTURE","GROW","TIME","STORY","MEMORY","HOME","FAMILY","LOVE","SUMMER","WATER","WAVE","RAIN","CLOUD","STORM","MUSIC","SONG","DANCE","BRAIN","MIND","IDEA","JOURNEY","ADVENTURE","SHOCK","BRIGHT"],
  fr: ["CIEL","ESPACE","LUMIERE","NUIT","SOMMEIL","HEURE","REVE","SOUHAIT","AVENIR","GRANDIR","TEMPS","HISTOIRE","SOUVENIR","MAISON","FAMILLE","AMOUR","ETE","EAU","VAGUE","PLUIE","NUAGE","ORAGE","MUSIQUE","CHANSON","DANSE","CERVEAU","ESPRIT","IDEE","VOYAGE","AVENTURE","CHOC","BRILLANT"]
};

const pairBridgeHints = {
  en: {
    "NIGHTMARE|WAVE":[{word:"LIGHT",bonus:18,reason:"a night-light helps with nightmares, and light travels in waves"},{word:"SHOCK",bonus:11,reason:"a nightmare can shock you, and a shockwave is a clear phrase"}],
    "CHANGE|DREAMS":[{word:"FUTURE",bonus:18,reason:"dreams point toward the future, and the future changes"},{word:"GROW",bonus:12,reason:"dreams grow and growth means change"}],
    "DREAM|STAR":[{word:"WISH",bonus:18,reason:"dreams are wishes, and people wish on stars"}],
    "DREAM|NIGHT":[{word:"SLEEP",bonus:18,reason:"dreams happen during sleep and night is when we sleep"}],
    "BED|SLEEP":[{word:"BEDTIME",bonus:18,reason:"bedtime is when sleep begins"}],
    "BRAINWAVE|SPACE":[{word:"MIND",bonus:15,reason:"a brainwave is an idea in the mind, and mind-space is a clear concept"}],
    "MOON|SUN":[{word:"SKY",bonus:18,reason:"the sun and moon share the sky"}],
    "DARK|SLEEP":[{word:"NIGHT",bonus:16,reason:"night is dark and is associated with sleep"}]
  },
  fr: {
    "CAUCHEMAR|VAGUE":[{word:"LUMIERE",bonus:18,reason:"une veilleuse aide contre les cauchemars et la lumière voyage en vagues"}],
    "CHANGEMENT|REVES":[{word:"AVENIR",bonus:18,reason:"les rêves parlent de l’avenir et l’avenir change"}],
    "ETOILE|REVE":[{word:"SOUHAIT",bonus:18,reason:"un rêve peut être un souhait et on fait un souhait sur une étoile"}],
    "NUIT|REVE":[{word:"SOMMEIL",bonus:18,reason:"les rêves arrivent pendant le sommeil et la nuit"}],
    "LIT|SOMMEIL":[{word:"HEURE",bonus:12,reason:"l’heure du coucher relie le lit et le sommeil"}],
    "LUNE|SOLEIL":[{word:"CIEL",bonus:18,reason:"le soleil et la lune partagent le ciel"}]
  }
};

function pairKey(a,b){return [normalizeWord(a),normalizeWord(b)].sort().join("|");}
function tagsFor(word, language){return (wordTags[language]?.[normalizeWord(word)] || []).map(normalizeWord);}
function directScore(prompt, candidate, language){
  const list=(directAssociations[language]?.[normalizeWord(prompt)] || []).map(normalizeWord);
  const index=list.indexOf(normalizeWord(candidate));
  return index < 0 ? 0 : Math.max(3, 9-index);
}
function tagScore(prompt, candidate, language){
  const overlap=tagsFor(prompt,language).filter(tag=>tagsFor(candidate,language).includes(tag));
  return overlap.length*3;
}

function botAssociation(round, usedWords, language = "en") {
  const a=normalizeWord(round.previous_a), b=normalizeWord(round.previous_b), key=pairKey(a,b), catalog=botCatalog[language]||botCatalog.en;
  const hints=(pairBridgeHints[language]?.[key]||[]).map(item=>({...item,word:normalizeWord(item.word)}));
  const hintByWord=new Map(hints.map(item=>[item.word,item]));
  const candidates=[...new Set([...catalog,...hints.map(item=>item.word)])].map(normalizeWord).filter(word=>word&&!usedWords.has(word));
  const scored=candidates.map(word=>{
    const hint=hintByWord.get(word);
    const aScore=directScore(a,word,language)+tagScore(a,word,language);
    const bScore=directScore(b,word,language)+tagScore(b,word,language);
    const total=aScore+bScore+(hint?.bonus||0);
    const bothSides=aScore>0&&bScore>0;
    const strong=Boolean(hint?.bonus>=15 || (bothSides&&aScore>=5&&bScore>=5&&total>=14));
    return {word,score:total,aScore,bScore,strong,reason:hint?.reason||null};
  }).sort((left,right)=>right.score-left.score || Number(Boolean(right.reason))-Number(Boolean(left.reason)) || botHash(`${key}:${round.round_number}:${left.word}`)-botHash(`${key}:${round.round_number}:${right.word}`));
  const strong=scored.filter(item=>item.strong);
  const chosen=strong[0]||scored.find(item=>item.aScore>0&&item.bScore>0)||scored[0];
  if (!chosen) throw new Error("No unused curated bot association is available for this game.");
  return {word:chosen.word,quality:chosen.strong?"strong":"loose",reason:chosen.reason|| (language==='fr'?"Lien possible, mais un peu libre.":"A possible bridge, but a loose connection.")};
}

function botOpeningWord(gameId, usedWords, language = "en") {
  const catalog=botCatalog[language]||botCatalog.en;
  const start=botHash(`${gameId}:opening:${language}`)%catalog.length;
  for(let offset=0;offset<catalog.length;offset++){
    const word=normalizeWord(catalog[(start+offset)%catalog.length]);
    if(!usedWords.has(word)) return word;
  }
  throw new Error("No unused opening word is available for this game.");
}

async function app(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const db = env.DB;
  if (!db) return json({error: "Database is not configured"}, 503);
  await init(db);
  let body = {};
  if (request.method !== "GET") {
    try { body = await request.json(); } catch {}
  }

  if (path === "/api/player" && request.method === "POST") {
    const created = now(), playerId = id();
    const displayName = (body.display_name || "Player").trim().slice(0, 24) || "Player";
    const recoveryCode = displayName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) + "-" + Math.floor(1000 + Math.random() * 9000);
    await db.prepare("INSERT INTO players VALUES(?,?,?,?,?)").bind(playerId, displayName, recoveryCode, created, created).run();
    return json({id: playerId, display_name: displayName, recovery_code: recoveryCode});
  }

  if (path === "/api/player/recover" && request.method === "POST") {
    const found = await q(db, "SELECT id, display_name FROM players WHERE recovery_code = ?", [(body.recovery_code || "").toUpperCase().trim()]);
    return found.results?.[0] ? json(found.results[0]) : json({error: "Recovery code not found"}, 404);
  }

  if (path === "/api/games" && request.method === "POST") {
    const created = now(), gameId = id(), roundId = id(), joinCode = code();
    const playerId = body.player_id, solo = !!body.solo;
    const language = body.language === "fr" ? "fr" : "en";
    await db.batch([
      db.prepare("INSERT INTO games (id,join_code,status,round_number,created_at,updated_at,language) VALUES(?,?,?,?,?,?,?)").bind(gameId, joinCode, solo ? "ACTIVE" : "WAITING", 1, created, created, language),
      db.prepare("INSERT INTO game_players VALUES(?,?,?,?)").bind(gameId, playerId, 1, created),
      ...(solo ? [db.prepare("INSERT INTO game_players VALUES(?,?,?,?)").bind(gameId, "BOT", 2, created)] : []),
      db.prepare("INSERT INTO rounds (id,game_id,round_number,previous_a,previous_b,status,created_at,revealed_at) VALUES(?,?,?,?,?,?,?,?)").bind(roundId, gameId, 1, null, null, "OPEN", created, null)
    ]);
    return json({id: gameId, join_code: joinCode, link: "/games/" + gameId, solo, language});
  }

  if (path === "/api/games/join" && request.method === "POST") {
    const found = await q(db, "SELECT * FROM games WHERE join_code = ?", [(body.join_code || "").toUpperCase().trim()]);
    if (!found.results?.[0]) return json({error: "Game not found"}, 404);
    const game = found.results[0], count = await q(db, "SELECT COUNT(*) AS n FROM game_players WHERE game_id = ?", [found.results[0].id]);
    if (count.results[0].n >= 2) return json({error: "Game is full"}, 409);
    const joined = now();
    await db.batch([
      db.prepare("INSERT INTO game_players VALUES(?,?,?,?)").bind(game.id, body.player_id, 2, joined),
      db.prepare("UPDATE games SET status = 'ACTIVE', updated_at = ? WHERE id = ?").bind(joined, game.id)
    ]);
    return json({id: game.id, join_code: game.join_code});
  }

  if (path === "/api/dashboard" && request.method === "GET") {
    const playerId = url.searchParams.get("player_id");
    const games = await q(db, `SELECT g.*, gp.slot,
      (SELECT COUNT(*) FROM game_players x WHERE x.game_id = g.id) AS players,
      (SELECT COUNT(*) FROM rounds rr WHERE rr.game_id = g.id) AS rounds_played,
      CASE WHEN EXISTS(SELECT 1 FROM game_players bot WHERE bot.game_id = g.id AND bot.player_id = 'BOT') THEN 'Solo'
        ELSE COALESCE((SELECT p2.display_name FROM game_players other JOIN players p2 ON p2.id = other.player_id WHERE other.game_id = g.id AND other.player_id != ? LIMIT 1), 'Family game') END AS opponent_name
      FROM games g JOIN game_players gp ON gp.game_id = g.id WHERE gp.player_id = ? ORDER BY g.updated_at DESC`, [playerId, playerId]);
    const notes = await q(db, "SELECT * FROM notifications WHERE player_id = ? ORDER BY created_at DESC LIMIT 20", [playerId]);
    return json({games: games.results || [], notifications: notes.results || [], max_moves: MAX_MOVES});
  }

  if (path === "/api/game" && request.method === "GET") {
    const gameId = url.searchParams.get("id"), playerId = url.searchParams.get("player_id");
    const game = (await q(db, "SELECT * FROM games WHERE id = ?", [gameId])).results?.[0];
    if (!game) return json({error: "Game not found"}, 404);
    const members = (await q(db, "SELECT * FROM game_players WHERE game_id = ? ORDER BY slot", [gameId])).results || [];
    if (!members.some(member => member.player_id === playerId)) return json({error: "You are not part of this game"}, 403);
    const rounds = (await q(db, "SELECT * FROM rounds WHERE game_id = ? ORDER BY round_number", [gameId])).results || [];
    const submissions = (await q(db, "SELECT round_id, player_id, word, submitted_at FROM submissions WHERE round_id IN (SELECT id FROM rounds WHERE game_id = ?) ORDER BY submitted_at", [gameId])).results || [];
    const other = members.find(member => member.player_id !== playerId);
    const otherName = other?.player_id === "BOT" ? "Solo opponent" : (other ? ((await q(db, "SELECT display_name FROM players WHERE id = ?", [other.player_id])).results?.[0]?.display_name || "Family game") : "Family game");
    const playerName = (await q(db, "SELECT display_name FROM players WHERE id = ?", [playerId])).results?.[0]?.display_name || "You";
    const otherLabel = other?.player_id === "BOT" ? "Bot word" : (other ? ((await q(db, "SELECT display_name FROM players WHERE id = ?", [other.player_id])).results?.[0]?.display_name || "Other player's word") : "Other player's word");
    const yourLabel = playerId === "BOT" ? "Bot word" : "Your word";
    const history = rounds.map(round => {
      const played = submissions.filter(item => item.round_id === round.id);
      const mine = played.find(item => item.player_id === playerId), theirs = played.find(item => item.player_id !== playerId);
      return {...round, my_word: mine?.word || null, other_word: theirs?.word || null, your_label: yourLabel, other_label: otherLabel, my_submitted_at: mine?.submitted_at || null, other_submitted_at: theirs?.submitted_at || null};
    });
    const current = rounds.find(round => round.round_number === game.round_number) || rounds[rounds.length - 1];
    const mine = submissions.find(item => item.round_id === current?.id && item.player_id === playerId);
    const remaining = completeStatuses.has(game.status) ? 0 : Math.max(0, MAX_MOVES - (game.round_number || 1) + 1);
    return json({game, current, history, submitted: !!mine, submissions: current ? submissions.filter(item => item.round_id === current.id && current.status !== "OPEN") : [], opponent_name: otherName, your_label: yourLabel, other_label: otherLabel, player_name: playerName, language: game.language || "en", max_moves: MAX_MOVES, move_number: game.round_number, remaining_moves: remaining, current_state: current?.status || "OPEN", current_prompt: current ? [current.previous_a, current.previous_b] : []});
  }

  if (path === "/api/submit" && request.method === "POST") {
    const gameId = body.game_id, playerId = body.player_id;
    const word = normalizeWord(body.word).slice(0, 40);
    if (!word) return json({error: "Word required"}, 400);
    const game = (await q(db, "SELECT * FROM games WHERE id = ?", [gameId])).results?.[0];
    if (!game) return json({error: "Game not found"}, 404);
    if (game.status !== "ACTIVE") return json({error: completeStatuses.has(game.status) ? "This game is over. Start a new game to play again." : "Waiting for the other player to join."}, 409);
    const members = (await q(db, "SELECT * FROM game_players WHERE game_id = ? ORDER BY slot", [gameId])).results || [];
    if (!members.some(member => member.player_id === playerId)) return json({error: "You are not part of this game"}, 403);
    const round = (await q(db, "SELECT * FROM rounds WHERE game_id = ? AND round_number = ?", [gameId, game.round_number])).results?.[0];
    if (!round || round.status !== "OPEN") return json({error: "This move is already complete. Refresh the game."}, 409);
    const previousWord = (await q(db, "SELECT s.word FROM submissions s JOIN rounds old_round ON old_round.id = s.round_id WHERE old_round.game_id = ? AND s.player_id = ? ORDER BY old_round.round_number DESC LIMIT 1", [gameId, playerId])).results?.[0]?.word;
    if (previousWord && normalizeWord(previousWord) === word) return json({error: "That word was just used. Try a different word for the next move!", code: "DUPLICATE_WORD"}, 409);
    const submittedAt = now();
    let botChoiceResult = null;
    const initialRound = !round.previous_a && !round.previous_b;
    const humanSubmission = db.prepare("INSERT INTO submissions VALUES(?,?,?,?)").bind(round.id, playerId, word.toUpperCase(), submittedAt);
    if (members.some(member => member.player_id === "BOT")) {
      const allGameWords = (await q(db, "SELECT word FROM submissions WHERE round_id IN (SELECT id FROM rounds WHERE game_id = ?)", [gameId])).results || [];
      const usedWords = new Set(allGameWords.map(item => normalizeWord(item.word)));
      botChoiceResult = initialRound
        ? {word:botOpeningWord(gameId, usedWords, game.language || "en"), quality:"opening", reason:null}
        : botAssociation(round, new Set([...usedWords, word]), game.language || "en");
      const botSubmission = db.prepare("INSERT INTO submissions VALUES(?,?,?,?)").bind(round.id, "BOT", botChoiceResult.word, submittedAt);
      try { await db.batch([humanSubmission, botSubmission, db.prepare("UPDATE rounds SET bot_quality = ?, bot_reason = ? WHERE id = ?").bind(botChoiceResult.quality, botChoiceResult.reason, round.id)]); }
      catch { return json({error: "You already submitted this move. Refresh to continue."}, 409); }
    } else {
      try { await humanSubmission.run(); }
      catch { return json({error: "You already submitted this move. Refresh to continue."}, 409); }
    }
    const roundSubmissions = (await q(db, "SELECT player_id, word FROM submissions WHERE round_id = ?", [round.id])).results || [];
    if (roundSubmissions.length < members.length) {
      const other = members.find(member => member.player_id !== playerId);
      if (other && other.player_id !== "BOT") await db.prepare("INSERT INTO notifications VALUES(?,?,?,?,?,?,?)").bind(id(), other.player_id, gameId, "YOUR_TURN", "Your friend played. Your turn!", null, submittedAt).run();
      return json({status: "WAITING", move_number: game.round_number, remaining_moves: Math.max(0, MAX_MOVES - game.round_number + 1)});
    }
    const bySlot = members.map(member => roundSubmissions.find(item => item.player_id === member.player_id)?.word || "");
    const first = bySlot[0], second = bySlot[1], matched = first === second, exhausted = !matched && game.round_number >= MAX_MOVES;
    const status = matched ? "MATCHED" : exhausted ? "EXHAUSTED" : "REVEALED";
    if (matched || exhausted) {
      const gameStatus = matched ? "MATCHED" : "EXHAUSTED";
      const humans = members.filter(member => member.player_id !== "BOT");
      await db.batch([
        db.prepare("UPDATE rounds SET status = ?, revealed_at = ? WHERE id = ?").bind(status, submittedAt, round.id),
        db.prepare("UPDATE games SET status = ?, updated_at = ? WHERE id = ?").bind(gameStatus, submittedAt, gameId),
        ...(humans.length ? humans.map(member => db.prepare("INSERT INTO notifications VALUES(?,?,?,?,?,?,?)").bind(id(), member.player_id, gameId, matched ? "GAME_COMPLETE" : "GAME_EXHAUSTED", matched ? "You matched! Same thing!" : "20 moves used. Try a rematch!", null, submittedAt)) : [])
      ]);
      return json({status, words: [first, second], your_word: bySlot[members.findIndex(member => member.player_id === playerId)] || "", other_word: bySlot[members.findIndex(member => member.player_id !== playerId)] || "", your_label: playerId === "BOT" ? "Bot word" : "Your word", other_label: members.find(member => member.player_id !== playerId)?.player_id === "BOT" ? "Bot word" : "Other player's word", matched, exhausted, move_number: game.round_number, remaining_moves: 0, connection_quality: botChoiceResult?.quality || round.bot_quality || null, connection_reason: botChoiceResult?.reason || round.bot_reason || null});
    }
    const nextRoundNumber = game.round_number + 1;
    await db.batch([
      db.prepare("UPDATE rounds SET status = ?, revealed_at = ? WHERE id = ?").bind(status, submittedAt, round.id),
      db.prepare("UPDATE games SET round_number = ?, status = 'ACTIVE', updated_at = ? WHERE id = ?").bind(nextRoundNumber, submittedAt, gameId),
      db.prepare("INSERT INTO rounds (id,game_id,round_number,previous_a,previous_b,status,created_at,revealed_at) VALUES(?,?,?,?,?,?,?,?)").bind(id(), gameId, nextRoundNumber, first, second, "OPEN", submittedAt, null)
    ]);
    const humans = members.filter(member => member.player_id !== "BOT");
    if (humans.length) await db.batch(humans.map(member => db.prepare("INSERT INTO notifications VALUES(?,?,?,?,?,?,?)").bind(id(), member.player_id, gameId, "READY_TO_REVEAL", "New move ready! Find the next connection!", null, submittedAt)));
    return json({status, words: [first, second], your_word: bySlot[members.findIndex(member => member.player_id === playerId)] || "", other_word: bySlot[members.findIndex(member => member.player_id !== playerId)] || "", your_label: playerId === "BOT" ? "Bot word" : "Your word", other_label: members.find(member => member.player_id !== playerId)?.player_id === "BOT" ? "Bot word" : "Other player's word", matched: false, exhausted: false, move_number: game.round_number, next_move: nextRoundNumber, next_prompt: [first, second], remaining_moves: MAX_MOVES - nextRoundNumber + 1, connection_quality: botChoiceResult?.quality || round.bot_quality || null, connection_reason: botChoiceResult?.reason || round.bot_reason || null});
  }

  if (path.startsWith("/api/")) return json({error: "Not found"}, 404);
  return new Response(html, {headers: {"content-type": "text/html; charset=utf-8", "cache-control": "no-store"}});
}

export default {fetch: app};

