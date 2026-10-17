// Candidate diversity pool: concrete, generally familiar things with audited
// affirmative physical facts. '+' = yes, '-' = no, '~' = probably.
// Source reference for rock categories: USGS https://www.usgs.gov/educational-resources/whats-new-weeks-9-12
// Source reference for weather: NWS https://forecast.weather.gov/glossary.php
// Other unreferenced common-object attributes are conservative observable facts.
// These are NOT approved profiles. All candidates must pass factual review.
export const pam500DiverseCatalogue=[
{kind:'rock',flags:'-living -alive -manufactured -electronic +stone',entries:`
a granite boulder|+heavy +bigMicrowave +brown
a basalt rock|+black +heavy +smallBread
a sandstone slab|+flat +brown +heavy
a limestone rock|+white +heavy
a slate slab|+flat +black +fragile
a shale rock|+flat +brown +fragile
an obsidian shard|+black +sharp +fragile +seeThrough
a pumice stone|+stone +smallBread +float +hole
a flint stone|+stone +brown +sharp
a quartz crystal|+clear +seeThrough +smallBread
a rose quartz crystal|+colorful +smallBread
an amethyst crystal|+colorful +smallBread
a citrine crystal|+yellow +seeThrough +smallBread
a smoky quartz crystal|+brown +seeThrough +smallBread
a calcite crystal|+white +fragile +smallBread
a gypsum crystal|+white +fragile +smallBread
a mica sheet|+flat +shiny +fragile
a chalk rock|+white +soft +smallBread
a piece of coal|+black +burn +combustible +smallBread
a fossil in stone|+stone +brown +fragile
a volcanic bomb rock|+brown +round +heavy
a lava rock|+black +hole +smallBread
a river pebble|+round +smallBread +brown
a piece of gravel|+smallGolf +heavy
a piece of marble stone|+white +heavy +smallBread
a salt crystal|+white +smallGolf +eat
a chunk of rock salt|+white +smallBread +eat
a copper ore rock|+brown +heavy
an iron ore rock|+brown +heavy
a gold nugget|+yellow +heavy +smallBread
a silver nugget|+white +heavy +smallBread
a chunk of pyrite|+yellow +smallBread
a piece of hematite|+brown +heavy +smallBread
a piece of magnetite|+black +heavy +smallBread
a sulfur crystal|+yellow +smallBread
a piece of feldspar|+white +smallBread
a piece of quartzite|+white +hard +smallBread
a piece of gneiss|+striped +heavy
a piece of schist|+flat +heavy
a piece of petrified wood|+stone +brown +heavy
a piece of volcanic glass|+black +sharp +fragile
a piece of dry clay|+brown +breakDrop +smallBread
a lump of mud|+brown +wet +soft
a handful of sand|+brown +smallBread
a pile of gravel|+brown +heavy
a pinch of sea salt|+white +eat +smallGolf
a piece of chalk|+white +soft +hold +smallBread
a clump of dirt|+brown +smallBread
a mound of soil|+brown +organic
a lump of peat|+brown +organic +burn
a piece of amber|+yellow +seeThrough +smallBread
`},
{kind:'gem',flags:'+stone +smallBread +buy +colorful',entries:`
an emerald gemstone|+green +seeThrough
a ruby gemstone|+red +seeThrough
a sapphire gemstone|+seeThrough
an opal gemstone|+colorful
a turquoise gemstone|+colorful
a jade stone|+green +heavy
a lapis lazuli stone|+colorful
a moonstone gem|+white +seeThrough
a garnet gemstone|+red +seeThrough
a peridot gemstone|+green +seeThrough
an aquamarine gem|+seeThrough
a topaz gemstone|+seeThrough
a tiger's eye stone|+brown +striped
a malachite stone|+green +striped
an agate slice|+flat +striped +seeThrough
a piece of tiger iron|+brown +striped
a carnelian stone|+red +seeThrough
an onyx stone|+black
a piece of jasper|+brown
a piece of fluorite|+seeThrough +fragile
a piece of labradorite|+colorful
a piece of sodalite|+colorful
a piece of aventurine|+green
a piece of rhodonite|+colorful
a piece of serpentine|+green
a piece of howlite|+white
a piece of tourmaline|+black
a piece of amazonite|+green
a piece of chrysoprase|+green
a piece of beryl|+green
`},
{kind:'ice',flags:'+cold +wet -hot -living -alive',entries:`
an icicle|+clear +seeThrough +sharp +fragile +smallBread
a snowball|+white +round +soft +hold +smallBread
a snowflake|+white +fragile +smallGolf
a hailstone|+white +round +smallGolf
an ice cube|+clear +seeThrough +smallBread +hold
a sheet of black ice|+flat +slippery +seeThrough
a patch of frost|+white +fragile +flat
a snowdrift|+white +soft +bigMicrowave
an iceberg|+white +veryLarge +float
a glacier|+white +veryLarge +heavy
a block of ice|+clear +seeThrough +heavy
a frozen puddle|+flat +slippery
an ice crystal|+clear +smallGolf +fragile
a layer of sleet|+white +smallBread
a pile of snow|+white +soft +heavy
a frozen waterfall|+white +veryLarge
a snowy mountain peak|+white +veryLarge +tall
an ice sheet|+white +veryLarge +flat
a chunk of sea ice|+white +float +saltWater
a chunk of lake ice|+clear +float +seeThrough
`},
{kind:'landform',flags:'-living -alive +veryLarge +seenReal',entries:`
a volcano crater|+round +hole +stone
a limestone cave|+hole +stone +dark
a canyon wall|+tall +stone +brown
a sea cliff|+tall +stone +saltWater
a sand dune|+brown +tall
a rocky mountain ridge|+stone +tall +heavy
a river delta|+water +flat
a riverbank|+water +brown
a waterfall|+wet +noise +heard
a geyser|+hot +wet +noise
a hot spring|+hot +wet +water
a tidal pool|+saltWater +wet
a coral reef|+saltWater +water +colorful
a rocky coastline|+stone +saltWater +wet
a sandy beach|+brown +saltWater
a river rapids|+wet +noise +heard
a deep ocean trench|+saltWater +veryLarge
a snowy mountain pass|+white +cold +tall
a deep sinkhole|+round +hole +dangerous
a rocky island|+stone +water
a natural rock arch|+stone +hole +tall
a natural stone bridge|+stone +hole +tall
a stalactite|+stone +tall +sharp
a stalagmite|+stone +tall +sharp
a volcanic lava flow|+hot +stone +dangerous
a river gorge|+stone +hole
a gravel riverbed|+brown +stone +water
a marsh|+wet +green +water
a swamp|+wet +green +water
a salt flat|+white +flat +saltWater
a mountain glacier|+cold +white +heavy
a grassy hillside|+green +tall +organic
a forest clearing|+forest +flat +green
a muddy trail|+brown +wet +flat
a desert oasis|+green +water +wet
a frozen lake|+cold +wet +flat
`},
{kind:'weather',flags:'-manufactured -invented -buy -living -alive',entries:`
a rainbow|+colorful +seeThrough +round +bright
a double rainbow|+colorful +round +bright
a lightning bolt|+bright +produceLight +dangerous
a thunderclap|+noise +heard +dangerous
a tornado funnel|+spin +move +dangerous +noise
a waterspout|+spin +move +dangerous +water
a dust devil|+spin +move +brown
a snowstorm|+white +cold +move +wet
a hailstorm|+cold +noise +wet +dangerous
a blizzard|+cold +white +move +dangerous
a rain shower|+wet +move +noise
a freezing rainstorm|+wet +cold +dangerous
a thick fog bank|+white +seeThrough +wet
a cloud of mist|+white +wet +move
a morning dew drop|+clear +round +wet +smallGolf
a patch of hoarfrost|+white +cold +fragile
a rainbow halo|+round +colorful +bright
a sunbeam|+bright +produceLight +warm
a beam of moonlight|+bright +produceLight +cold
a fluffy cumulus cloud|+white +fluffy +move
a dark thundercloud|+black +veryLarge +move
a lenticular cloud|+round +white +move
a cirrus cloud|+white +soft +move
a cloud of smoke|+smell +move +dangerous
a plume of steam|+hot +wet +move
a gust of wind|+move +noise
a heat wave|+hot +warm +dangerous
a cold snap|+cold +dangerous
a meteor streak|+bright +produceLight +move
a shooting star|+bright +produceLight +move
a solar eclipse shadow|+black +round +move
a lunar eclipse|+round +colorful
a solar flare|+hot +bright +dangerous
an aurora borealis|+green +colorful +bright +move
a mirage|+seeThrough +hot
a patch of ground fog|+white +wet +seeThrough
`},
{kind:'body',flags:'+bodyPart +organic +touch -manufactured -invented',entries:`
an eyebrow|+furry +head +smallBread
an eyelash|+smallGolf +soft +head
an earlobe|+soft +head +smallBread
an eardrum|+fragile +head +smallGolf
a nostril|+hole +head +smallBread
a nasal bridge|+head +smallBread
a cheekbone|+stone +head
a jawbone|+hard +head
a chin|+head +smallBread
a forehead|+head +flat
a temple of the head|+head +smallBread
a tongue|+wet +soft +communicate
a taste bud|+smallGolf +eat
a uvula|+soft +wet
a vocal cord|+communicate +noise +heard
an elbow|+round +legs
a kneecap|+round +legs +hard
a shinbone|+hard +tall
a collarbone|+hard +flat
a wrist|+smallBread +move
an ankle|+feet +move
a heel|+feet +smallBread
a big toe|+feet +smallBread
a pinky finger|+hold +smallBread
a fingertip|+hold +smallBread
a fingernail|+sharp +smallBread
a toenail|+feet +smallBread
a thumbnail|+hold +smallBread
a palm of a hand|+flat +hold
a knuckle|+round +smallBread
a shoulder blade|+flat +hard
a rib bone|+hard +round
a belly button|+hole +round
a freckle|+spotted +smallGolf
a birthmark|+colorful +flat
a strand of hair|+soft +stretch
a curl of hair|+soft +round
a whisker hair|+soft +smallBread
a fingerprint|+storeInfo +flat +smallBread
`},
{kind:'abstract',flags:'+abstract -manufactured -buy -living -alive',entries:`
a secret|+storeInfo +communicate
a promise|+communicate
a joke|+communicate +joy
a riddle|+communicate +game
a nickname|+communicate +storeInfo
a memory|+storeInfo
a dream|+spontaneous
a nightmare|+dangerous
a daydream|+spontaneous
a coincidence|+spontaneous
a surprise|+spontaneous +joy
a compliment|+communicate +joy
a warning|+communicate +dangerous
a question|+communicate +storeInfo
an idea|+spontaneous +storeInfo
a plan|+storeInfo +useful
a recipe|+storeInfo +useful +eat
a password|+storeInfo +useful
a computer virus|+computer +dangerous +storeInfo
an internet meme|+computer +communicate +joy
a video game high score|+game +storeInfo
a birthday wish|+joy +communicate
a magic trick|+game +joy
a plot twist|+spontaneous +storeInfo
a lucky break|+joy +spontaneous
a spelling mistake|+communicate +storeInfo
a music melody|+heard +songs +noise
a musical rhythm|+heard +noise
a sound echo|+heard +noise
a drumbeat|+heard +noise
an apology|+communicate
an invitation|+communicate +storeInfo
a question mark|+storeInfo +communicate
a bedtime story|+songs +communicate
a countdown|+storeInfo +communicate
`},
];
