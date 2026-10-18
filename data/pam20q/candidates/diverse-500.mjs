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
a sandstone slab|+flat +brown +heavy +manufactured
a limestone rock|+white +heavy
a slate slab|+flat +black +fragile +manufactured
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
a mica sheet|+flat +fragile
a chalk rock|+white +soft +smallBread
a piece of coal|+black +burn +combustible +smallBread
a fossil in stone|+stone +brown +fragile
a volcanic bomb rock|+brown +round +heavy
a lava rock|+black +hole +smallBread
a river pebble|+round +smallBread +brown
a piece of gravel|+smallGolf +round
a piece of marble stone|+white +heavy +smallBread
a salt crystal|+white +smallGolf +eat
a chunk of rock salt|+white +smallBread +eat
a copper ore rock|+brown +heavy
an iron ore rock|+brown +heavy
a gold nugget|+yellow +heavy +smallBread -stone
a silver nugget|+white +heavy +smallBread -stone
a chunk of pyrite|+yellow +smallBread
a piece of hematite|+brown +heavy +smallBread
a piece of magnetite|+black +heavy +smallBread
a sulfur crystal|+yellow +smallBread
a piece of feldspar|+white +smallBread
a piece of quartzite|+white +smallBread
a piece of gneiss|+striped +heavy
a piece of schist|+flat +heavy
a piece of petrified wood|+stone +brown +heavy
a piece of volcanic glass|+black +sharp +fragile
a piece of dry clay|+brown +breakDrop +smallBread
a lump of mud|+brown +wet +soft
a handful of sand|+brown +smallBread
a pile of gravel|+brown +heavy
a pinch of sea salt|+white +eat +smallGolf
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
a sheet of black ice|+flat +slippery +seeThrough
a patch of frost|+white +fragile +flat
a snowdrift|+white +soft +bigMicrowave
an iceberg|+white +veryLarge +float
a glacier|+white +veryLarge +heavy
a block of ice|+clear +seeThrough +heavy
a frozen puddle|+flat +slippery
an ice crystal|+clear +smallGolf +fragile
a layer of sleet|+white +flat
a pile of snow|+white +soft +heavy
a frozen waterfall|+white +veryLarge
a snowy mountain peak|+white +veryLarge +tall
an ice sheet|+white +veryLarge +flat
a chunk of sea ice|+white +float +wet
a chunk of lake ice|+clear +float +seeThrough
`},
{kind:'landform',flags:'-living -alive',entries:`
a volcano crater|+round +hole +stone +veryLarge
a limestone cave|+hole +stone
a canyon wall|+tall +stone +brown +veryLarge
a sea cliff|+tall +stone +wet +veryLarge
a sand dune|+brown +tall
a rocky mountain ridge|+stone +tall +heavy +veryLarge
a river delta|+wet +flat +veryLarge
a riverbank|+wet +brown
a waterfall|+wet +noise +heard
a geyser|+hot +wet +noise
a hot spring|+hot +wet +wet
a tidal pool|+wet +wet
a rocky coastline|+stone +wet +wet +veryLarge
a sandy beach|+brown +wet +veryLarge
a river rapids|+wet +noise +heard
a deep ocean trench|+wet +veryLarge
a snowy mountain pass|+white +cold +tall +veryLarge
a deep sinkhole|+round +hole +dangerous
a rocky island|+stone +wet
a natural rock arch|+stone +hole +tall
a natural stone bridge|+stone +hole +tall
a stalactite|+stone +tall +sharp
a stalagmite|+stone +tall +sharp
a volcanic lava flow|+hot +stone +dangerous
a river gorge|+stone +hole +veryLarge
a gravel riverbed|+brown +stone +wet
a salt flat|+white +flat +wet
a mountain glacier|+cold +white +heavy +veryLarge
a muddy trail|+brown +wet +flat
a desert oasis|+green +wet +wet
a frozen lake|+cold +wet +flat
`},
{kind:'weather',flags:'-manufactured -invented -buy -living -alive',entries:`
a rainbow|+colorful +seeThrough +round +bright
a double rainbow|+colorful +round +bright
a lightning bolt|+bright +produceLight +dangerous +hot
a thunderclap|+noise +heard +dangerous
a tornado funnel|+spin +move +dangerous +noise
a waterspout|+spin +move +dangerous +wet
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
an eyebrow|+soft +head +smallBread
an eyelash|+smallGolf +soft +head
an earlobe|+soft +head +smallBread
an eardrum|+fragile +head +smallGolf
a nostril|+hole +head +smallBread
a nasal bridge|+head +smallBread
a cheekbone|+head
a jawbone|+head
a chin|+head +smallBread
a forehead|+head +flat
a temple of the head|+head +smallBread
a tongue|+wet +soft +communicate
a taste bud|+smallGolf +eat
a uvula|+soft +wet
a vocal cord|+communicate +noise +heard
an elbow|+round +move
a kneecap|+round +legs
a shinbone|+tall
a collarbone|+flat
a wrist|+smallBread +move
an ankle|+feet +move
a heel|+feet +smallBread
a big toe|+feet +smallBread
a pinky finger|+smallBread +touch
a fingertip|+smallBread +touch
a fingernail|+sharp +smallBread
a toenail|+feet +smallBread
a thumbnail|+smallBread +touch
a palm of a hand|+flat +touch
a knuckle|+round +smallBread
a shoulder blade|+flat
a rib bone|+round
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
a nightmare|+spontaneous
a daydream|+spontaneous
a coincidence|+spontaneous
a surprise|~spontaneous +joy
a compliment|+communicate +joy
a warning|+communicate
a question|+communicate +storeInfo
an idea|+spontaneous +storeInfo
a plan|+storeInfo +useful
a recipe|+storeInfo +useful
a password|+storeInfo +useful
a computer virus|+computer +dangerous +storeInfo
an internet meme|+computer +communicate +joy
a video game high score|+game +storeInfo
a birthday wish|+joy +communicate
a magic trick|+joy
a plot twist|+spontaneous +storeInfo
a lucky break|+joy +spontaneous
a spelling mistake|+communicate +storeInfo
a music melody|+heard +songs +noise
a musical rhythm|~heard ~noise
a sound echo|+heard +noise
a drumbeat|+heard +noise
an apology|+communicate
an invitation|+communicate +storeInfo
a question mark|+storeInfo +communicate
a bedtime story|+communicate +storeInfo
a countdown|+storeInfo +communicate
`},

{kind:'office',flags:'+buy +manufactured +touch',entries:`
a paper shredder|+electronic +household +noise +sharp +box
a cork bulletin board|+flat +brown +storeInfo
a desk nameplate|+flat +storeInfo +smallBread
a desktop pencil cup|+refill +round +hold
a rubber stamp|+hold +storeInfo +smallBread
a desk calendar|+storeInfo +flat +household
a sticky note pad|+flat +storeInfo +hold
a magnetic whiteboard|+flat +storeInfo +recycle
a felt-tip marker|+hold +refill +colorful
a mechanical pencil|+mechanical +hold +refill
a pencil sharpener|+sharp +mechanical +smallBread
an eraser cap|+smallGolf +soft +hold
a retractable pen|+mechanical +hold +smallBread
a clipboard|+flat +carryThings +hold
an index card|+flat +storeInfo +smallBread
a plastic file folder|+plastic +flat +storeInfo
a hanging file organizer|+carryThings +storeInfo
a document envelope|+flat +open +storeInfo
a bubble mailer|+soft +open +box
a postage stamp|+smallBread +flat +delivered
a shipping label|+flat +storeInfo +delivered
a postage scale|+electronic +buttons +flat
a stapler remover|+sharp +hold +mechanical
a page magnifier|+seeThrough +flat +hold
a reading bookmark|+flat +hold +storeInfo
a laminated ID badge|+flat +wear +storeInfo
a keycard|+flat +storeInfo +smallBread
a lanyard|+wear +soft +carryThings
a badge reel|+roll +mechanical +wear
a rubber band ball|+round +stretch +roll
a binder ring|+round +hole +mechanical
a brass fastener|+smallBread +mechanical
a paper hole reinforcement|+round +hole +flat
a drafting triangle|+flat +sharp +seeThrough
a protractor|+flat +round +seeThrough
a retractable measuring tape|+roll +mechanical
a desk phone handset|+hold +communicate +noise
a conference speakerphone|+electronic +noise +heard +communicate
a computer mousepad|+flat +computer +soft
a wrist rest|+soft +computer +flat
a laptop privacy screen|+flat +computer +seeThrough
a monitor riser|+flat +computer +carryThings
a keyboard wrist pad|+soft +flat +computer
a desk cable clip|+smallBread +computer
a cable management tray|+carryThings +computer
`},
{kind:'bath',flags:'+household +buy +manufactured +touch',entries:`
a shower curtain ring|+hole +round +smallBread
a shower curtain liner|+soft +wet +flat
a shower squeegee|+hold +wet +flat +tool
a soap dish|+wet +round +smallBread
a refillable soap pump|+refill +mechanical +wet
a toothbrush cup|+round +refill +wet
a toothpaste dispenser|+mechanical +refill
a floss pick|+hold +sharp +smallBread
a tongue scraper|+hold +flat +tool
a shower brush|+hold +soft +wet
a loofah sponge|+wet +soft +hole
a shower sponge|+wet +soft
a bath pillow|+wet +soft +float
a bath bomb|+round +wet +goodSmell +smallBread
a rubber bath duck|+yellow +float +soft +round
a bath caddy|+carryThings +wet +flat
a toilet roll holder|+roll +mechanical
a toilet paper roll|+roll +round +hole +soft
a hair claw clip|+mechanical +smallBread +hold
a bobby pin|+smallBread +hold +mechanical
a hair tie|+stretch +round +hold
a scrunchie|+soft +round +stretch
a detangling comb|+hold +sharp +smallBread
a paddle hairbrush|+hold +soft +flat
a hair dryer diffuser|+round +hole +electronic
a refillable perfume atomizer|+smallBread +refill +goodSmell
a lip balm tube|+smallBread +refill +soft
a pumice foot scrubber|+hole +stone +smallBread
a nail buffer block|+flat +soft +smallBread
a nail file|+sharp +flat +hold
a cuticle pusher|+hold +smallBread +tool
a nail clipper|+mechanical +sharp +hold
a cotton swab|+hold +soft +smallBread
a cotton pad|+round +flat +soft
a tissue box|+box +open +soft
a soap bar|+wet +soft +goodSmell +smallBread
a shaving brush|+soft +hold +wet
a disposable razor|+sharp +hold +wet
a suction shower hook|+hole +mechanical +carryThings
a shower cap hanger|+carryThings +household
`},
{kind:'cleaning',flags:'+household +buy +manufactured +useful +touch',entries:`
a dustpan|+flat +hold +carryThings
a microfiber duster|+soft +hold
a feather duster|+soft +feathers +hold
a window squeegee|+hold +wet +flat
a lint roller|+roll +round +hold
a lint brush|+soft +hold
a floor mop head|+soft +wet +hold
a mop bucket|+refill +wet +carryThings
a spin mop|+spin +wet +mechanical
a broom handle|+tall +hold
a handheld vacuum|+electronic +noise +carryThings
a crevice vacuum attachment|+hold +tool
a dusting glove|+wear +soft
a scrub brush|+hold +wet +soft
a grout brush|+hold +wet
a toilet brush|+hold +wet
a bottle brush|+hold +wet
a pipe cleaner|+stretch +soft +hold
a drain snake tool|+mechanical +wet +stretch
a sink plunger|+wet +mechanical +hold
a dish sponge|+soft +wet +hold
a scouring pad|+flat +wet +soft
a steel wool pad|+soft +sharp +wet
a cleaning spray bottle|+refill +wet +hold
a disinfecting wipe|+wet +soft +flat
a clothespin|+mechanical +smallBread
a folding drying rack|+carryThings +flat
a mesh laundry bag|+soft +hole +carryThings
a garment steamer|+electronic +hot +wet +noise
a fabric shaver|+electronic +sharp +smallBread
a shoe cleaning brush|+hold +soft
a boot scraper|+flat +sharp
a shoe horn|+flat +hold
a sneaker cleaning kit|+box +wet
a laundry stain stick|+hold +soft +smallBread
`},
{kind:'craft',flags:'+buy +manufactured +hold',entries:`
a glue gun|+hot +electronic +tool
a glue stick|+soft +smallBread
a paint palette|+round +flat +colorful
a palette knife|+flat +hold +sharp
a watercolor brush|+soft +wet +hold
a paint roller|+roll +hold +colorful
a paint tray|+flat +carryThings +colorful
a canvas board|+flat +colorful
a sketching charcoal stick|+black +hold +smallBread
a pastel chalk stick|+colorful +soft +smallBread
a colored pencil|+colorful +sharp +smallBread
a pencil extender|+smallBread +hold
a kneaded eraser|+soft +stretch +smallBread
a drawing compass|+mechanical +sharp +round
a stencil sheet|+flat +hole +plastic
a screen-printing squeegee|+flat +hold
a sewing needle|+sharp +smallGolf +hole
a needle threader|+smallBread +hole +hold
a thimble|+hold +hole +smallBread
a spool of thread|+round +roll +soft
a skein of yarn|+soft +stretch +round
a crochet hook|+hold +smallBread +sharp
a knitting needle|+hold +sharp +tall
a stitch marker|+smallGolf +round
a seam ripper|+sharp +hold
a fabric measuring tape|+stretch +roll +hold
a quilting ruler|+flat +seeThrough
a rotary fabric cutter|+roll +sharp +mechanical
a sewing pin cushion|+soft +sharp
a sewing bobbin|+round +roll +smallBread
a button maker|+mechanical +round +heavy
a leather hole punch|+mechanical +sharp +hole
a leather awl|+sharp +hold
a beading wire|+stretch +smallBread
a jewelry clasp|+smallGolf +mechanical
a jump ring|+round +hole +smallGolf
a glass bead|+round +hole +fragile +colorful
a polymer clay bead|+round +hole +colorful
a craft foam sheet|+flat +soft +colorful
a pom-pom ball|+soft +round +fluffy
`},
{kind:'party',flags:'+buy +manufactured +joy',entries:`
a party balloon|+blowUp +round +colorful +float
a balloon pump|+hold +mechanical +blowUp
a confetti popper|+noise +colorful +hold
a confetti cannon|+noise +colorful +mechanical
a party streamer|+stretch +colorful +soft
a paper party hat|+wearHead +colorful +flat
a birthday candle|+burn +smallBread +produceLight
a sparkler stick|+burn +bright +produceLight
a cake topper|+colorful +smallBread +hold
a gift ribbon bow|+colorful +soft +stretch
a gift bag|+colorful +carryThings +open
a wrapping paper roll|+roll +colorful +flat
a gift tag|+flat +storeInfo +smallBread
a greeting card|+flat +open +communicate
a paper garland|+stretch +colorful +soft
a table centerpiece|+colorful +round
a party horn|+noise +heard +hold
a noisemaker whistle|+noise +heard +hold
a paper crown|+wearHead +colorful +soft
a paper tiara|+wearHead +colorful +soft
a party pinata|+colorful +heavy +game
a carnival ticket|+smallBread +flat +game
a raffle ticket|+smallBread +flat +storeInfo
a bingo card|+flat +game +storeInfo
a game spinner|+round +spin +game
a prize ribbon|+soft +colorful +wear
a gold star sticker|+yellow +flat +smallBread
a glow stick|+bright +produceLight +hold
a disco ball|+round +spin +bright +colorful
a party tablecloth|+flat +colorful +soft
a candy-filled favor bag|+carryThings +sweet +colorful
a cupcake liner|+round +smallBread +box
a cake sparkler|+burn +bright +produceLight
a photo booth prop|+hold +colorful
a Halloween candy bucket|+carryThings +refill +colorful
`},
{kind:'toy',flags:'+buy +manufactured +played +game',entries:`
a toy spinning top|+spin +round +smallBread
a toy sailboat|+float +wet +smallBread
a toy train engine|+roll +mechanical +smallBread
a toy dump truck|+roll +carryThings +smallBread
a remote-control helicopter|+motorized +wings +noise
a remote-control car|+motorized +roll +noise
a toy dinosaur|+smallBread
a toy robot|+mechanical +electronic +buttons
a finger puppet|+soft +wear +smallBread
a hand puppet|+soft +wear +communicate
a sock puppet|+soft +wear +communicate
a marionette puppet|+soft +stretch +move
a stuffed bunny|+soft +fluffy +smallBread
a plush octopus|+soft +fluffy +round
a plush dinosaur|+soft +fluffy
a toy bowling pin|+roll +tall
a toy bowling ball|+round +roll +hole
a toy parachute|+soft +stretch
a kite spool|+roll +hold +round
a paper glider|+flat +soft +hold
a foam airplane|+soft +wings +hold
a magnetic building tile|+flat +colorful
a wooden building block|+brown +round +smallBread
a miniature dollhouse|+box +open
a dollhouse kitchen|+smallBread +household
a toy tea set|+refill +smallBread +fragile
a wooden train track|+roll +brown
a wooden jigsaw piece|+flat +smallBread +brown
a rubber bouncy ball|+round +roll +soft +jump
a water balloon|+round +blowUp +wet
a foam dart|+soft +hold +smallBread
a bubble wand|+hold +wet +smallBread
a bubble machine|+motorized +wet +noise
a soap bubble|+round +blowUp +seeThrough +float
a toy microscope|+seeThrough +smallBread +tool
a toy telescope|+seeThrough +tall +tool
`},
{kind:'gardenobject',flags:'+buy +manufactured +useful +touch',entries:`
a watering can|+garden +refill +wet +carryThings
a plant mister|+garden +refill +wet +hold
a seed packet|+garden +box +storeInfo +smallBread
a seedling tray|+garden +hole +flat
a biodegradable plant pot|+garden +round +refill
a hanging flower basket|+garden +carryThings +round
a terracotta pot|+garden +round +fragile
a ceramic plant saucer|+garden +round +flat +fragile
a garden trellis|+garden +tall +hole
a bird bath|+garden +refill +wet +round
a bird nesting box|+garden +box +open
a bird feeder tray|+garden +carryThings +refill
a birdhouse|+garden +box +open
a garden hose reel|+garden +roll +round
a rain barrel|+garden +refill +wet +heavy
a garden sprinkler|+garden +spin +wet
a soil pH meter|+garden +electronic +tool
a soil moisture probe|+garden +tool +hold
a plant label stake|+garden +storeInfo +smallBread
a greenhouse vent|+garden +open +mechanical
a cold frame lid|+garden +open +seeThrough
a greenhouse misting nozzle|+garden +wet +smallBread
a garden row cover|+garden +flat +soft
a raised garden bed|+garden +bigMicrowave +box
a compost bin lid|+garden +open +flat
a seed starting mat|+garden +flat +warm
a gardening kneeling pad|+garden +soft +flat
a garden wheelbarrow|+garden +roll +carryThings +heavy
a garden cart|+garden +roll +carryThings
a plant support ring|+garden +round +hole
a garden border stone|+garden +stone +heavy
a watering globe|+garden +round +wet +fragile
a flower press|+garden +mechanical +flat
a garden cloche|+garden +seeThrough +fragile
a landscape fabric roll|+garden +roll +flat
`},
{kind:'medicine',flags:'+buy +manufactured +useful',entries:`
a digital thermometer|+electronic +hold +buttons +smallBread
a digital blood pressure cuff|+electronic +stretch +wear
a finger pulse oximeter|+electronic +smallBread +wear +lights
a reflex hammer|+hold +tool +smallBread
a tuning fork medical instrument|+ring +heard +hold
a stethoscope|+heard +hold +wear
a surgical face mask|+soft +wear +flat
a respirator mask|+soft +wear +mechanical
a disposable glove|+soft +wear +stretch
a first aid bandage roll|+soft +roll +wet
an adhesive bandage|+soft +flat +wear +smallBread
a gauze pad|+soft +flat +smallBread
a cold gel pack|+cold +soft +hold
a hot water bottle|+warm +wet +refill
a heating pad|+warm +soft +flat
a reusable ice pack|+cold +wet +refill
a walking cane|+tall +hold +carryPeople
a pair of crutches|+tall +carryPeople
an elastic ankle brace|+wear +stretch +soft
a wrist splint|+wear +soft +flat
a knee sleeve|+wear +stretch +soft
a finger splint|+wear +smallBread
an eye patch|+wearHead +soft
a hearing aid case|+box +smallBread +carryThings
a pill organizer|+box +open +smallBread
a medicine dropper|+hold +refill +wet +smallBread
a nasal spray bottle|+refill +wet +smallBread
a saline wash bottle|+refill +wet +smallBread
an inhaler spacer|+mechanical +hold
a pair of reading glasses|+wearHead +seeThrough +fragile
a contact lens case|+box +refill +smallBread
a finger lancet|+sharp +smallBread +hold
a syringe without a needle|+refill +wet +mechanical
a sterile dressing pad|+soft +flat +smallBread
a gauze wrap|+soft +stretch +roll
`},
];
