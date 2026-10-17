// Curated physical targets. Only explicit facts become known answer cells.
// A prefix + means confidently yes, ~ means probably, - means confidently no.
export const pam500Catalogue=[
{kind:'mammal',flags:'+furry +paws +carnivore',entries:`
a fishing cat|+water +swim +spotted
a rusty-spotted cat|+spotted +forest
a sand cat|+brown +nocturnal
a black-footed cat|+spotted +nocturnal
a margay|+spotted +forest +climb +longTail
an ocelot|+spotted +forest +climb
a jaguarundi|+forest +longTail
a kodkod|+spotted +forest +climb
a flat-headed cat|+water +swim
a leopard cat|+spotted +forest +climb
a Pallas's cat|+fluffy +cold
a Chinese mountain cat|+fluffy +cold
a jungle cat|+brown +longTail
a Geoffroy's cat|+spotted +nocturnal
a pampas cat|+brown +forest
a marbled cat|+spotted +forest +climb
a bay cat|+brown +forest
a golden cat|+brown +forest
a striped hyena|+striped +nocturnal +scavenger
an aardwolf|+striped +nocturnal +insect
a bat-eared fox|+nocturnal +brown +insect
a fennec fox|+nocturnal +brown +smallBread
a corsac fox|+brown +cold
a kit fox|+nocturnal +brown
an island fox|+brown +forest
a gray fox|+climb +forest +longTail
a crab-eating fox|+forest +nocturnal
a bush dog|+forest +swim
a maned wolf|+tall +brown +longTail
a dhole|+forest +groups +carnivore
a striped polecat|+striped +nocturnal
a spotted skunk|+spotted +nocturnal +black
a hog-nosed skunk|+black +white +nocturnal
a tayra|+forest +climb +longTail
a fisher|+forest +climb +nocturnal
a pine marten|+forest +climb +longTail
a stone marten|+climb +nocturnal +longTail
`},
{kind:'hoof',flags:'+feet +hooves +herbivore',entries:`
a saiga antelope|+brown +groups
a sable antelope|+brown +groups
a roan antelope|+brown +groups
a waterbuck|+water +swim +brown
a sitatunga|+water +swim +brown
a nyala|+striped +brown +forest
a greater kudu|+striped +tall +brown
a lesser kudu|+striped +brown
a springbok|+jump +groups +brown
a bontebok|+brown +white +groups
a blesbok|+brown +white +groups
a topi|+brown +groups
a hartebeest|+brown +groups
a wildebeest|+brown +groups +heavy
a klipspringer|+climb +jump +brown
a steenbok|+brown +smallBread
an oribi|+brown +groups
a bushbuck|+forest +striped +brown
a sambar deer|+forest +brown +tall
a muntjac|+forest +brown +smallBread
a pudu|+forest +brown
a water deer|+water +swim +brown
a marsh deer|+water +swim +brown
a barasingha|+water +brown
a hog deer|+forest +brown
a chital|+spotted +forest
a nilgai|+tall +groups +brown
a blackbuck|+brown +groups
a pronghorn|+tall +groups +brown
a musk deer|+forest +brown
a peccary|+groups +forest +brown
a babirusa|+forest +brown
a red river hog|+red +forest +groups
a warthog|+brown +groups
a collared peccary|+forest +groups
a pygmy hog|+forest +brown
`},
{kind:'mammal',flags:'+herbivore +furry +paws',entries:`
a rock hyrax|+climb +brown +groups
a tree hyrax|+climb +forest +nocturnal
a capybara|+rodent +water +swim +groups
a mara|+rodent +jump +brown
an agouti|+rodent +forest +brown
a paca|+rodent +spotted +forest
a viscacha|+rodent +fluffy +jump
a chinchilla|+rodent +fluffy +jump
a prairie dog|+rodent +groups +brown
a marmot|+rodent +groups +brown +cold
a jerboa|+rodent +jump +longTail
a kangaroo rat|+rodent +jump +longTail
a dormouse|+rodent +nocturnal +climb
a harvest mouse|+rodent +climb +brown
a flying squirrel|+rodent +forest +climb
a sugar glider|+forest +nocturnal +climb
a quokka|+brown +jump
a tree kangaroo|+forest +climb +jump
a wallaroo|+jump +brown
a bettong|+jump +nocturnal
a bilby|+nocturnal +brown
a numbat|+striped +forest
a bandicoot|+nocturnal +brown
an echidna|+eggs +spine +brown
a pangolin|+shell +brown
a three-toed sloth|+forest +climb
a two-toed sloth|+forest +climb
a tamandua|+forest +climb +longTail
a silky anteater|+forest +climb +longTail
a giant anteater|+longTail +brown
a naked mole-rat|+rodent +groups -furry
a porcupine|+rodent +forest +brown
a crested porcupine|+rodent +brown
a tree porcupine|+rodent +climb +forest
a beaver|+rodent +water +swim +longTail
`},
{kind:'bird',flags:'+feathers +eggs +wings',entries:`
a potoo|+nocturnal +forest +brown
a frogmouth|+nocturnal +forest +brown
a nightjar|+nocturnal +brown
a hoopoe|+colorful +brown
a bee-eater|+colorful +forest +insect
a kingfisher|+colorful +water +fish
a roller bird|+colorful +forest
a hornbill|+forest +colorful +tall
a toucanet|+forest +colorful
a motmot|+forest +colorful +longTail
a jacamar|+forest +colorful
a quetzal|+forest +green +longTail
a trogon|+forest +colorful +longTail
a lyrebird|+forest +longTail
a bowerbird|+forest +colorful
a satin bowerbird|+black +forest
a bird-of-paradise|+colorful +forest +longTail
a manakin|+colorful +forest
a sunbird|+colorful +smallBread
a honeyeater|+colorful +forest
a flowerpecker|+colorful +smallBread
a waxwing|+brown +groups
a shrike|+carnivore +brown
a drongo|+black +longTail
a magpie-lark|+black +white +water
a treecreeper|+forest +climb
a nuthatch|+forest +climb
a dipper bird|+water +swim
a wagtail|+longTail +water
a pipit|+brown +groups
a bullfinch|+red +smallBread
a crossbill|+forest +red
a goldcrest|+forest +green +smallBread
a firecrest|+forest +colorful +smallBread
a linnet|+brown +smallBread
a redpoll|+red +cold +smallBread
`},
{kind:'bird',flags:'+eggs +wings',entries:`
a razorbill|+black +white +saltWater +swim
a guillemot|+black +white +saltWater +swim
a murrelet|+black +white +saltWater +swim
a kittiwake|+white +saltWater +swim
a gannet|+white +saltWater +swim +fish
a booby bird|+saltWater +swim +fish
a frigatebird|+black +saltWater +veryLarge
a skua|+brown +saltWater +scavenger
a jaeger bird|+saltWater +scavenger
a shearwater|+saltWater +swim
a petrel|+saltWater +swim
a storm petrel|+saltWater +black +swim
a fulmar|+saltWater +swim +white
a cormorant|+black +water +swim +fish
a shag bird|+black +saltWater +swim
an anhinga|+water +swim +fish
a grebe|+water +swim +fish
a coot|+water +swim +black
a moorhen|+water +swim +black
a gallinule|+water +swim +colorful
an avocet|+water +swim +white
a stilt bird|+water +tall +black
a sandpiper|+water +brown +groups
a snipe|+water +brown
a woodcock|+forest +brown
a lapwing|+water +groups
a plover|+water +groups
an oystercatcher|+saltWater +black +white
a turnstone|+saltWater +brown
a godwit|+water +brown
a curlew|+water +brown
a whimbrel|+water +brown
a dowitcher|+water +brown
a phalarope|+water +swim
a ruff bird|+water +brown
a jacana|+water +green
`},
{kind:'fish',flags:'+water +swim +fish +coldBlood',entries:`
a bowfin|+brown +freshwater
a gar fish|+sharp +longTail
a sturgeon|+heavy +water
a paddlefish|+water +heavy
an arapaima|+veryLarge +heavy
an arowana|+jump +water
a knifefish|+water +nocturnal
an electric eel|+water +electronic -fish
a lungfish|+water +brown
a mudskipper|+hop +water
a flying fish|+wings +saltWater
a needlefish|+sharp +saltWater
a pipefish|+saltWater +smallBread
a seahorse|+saltWater +smallBread
a sea moth fish|+saltWater +smallBread
a lionfish|+spotted +dangerous +saltWater
a stonefish|+dangerous +saltWater +brown
a scorpionfish|+dangerous +saltWater +brown
a frogfish|+saltWater +spotted
an anglerfish|+saltWater +produceLight
a lanternfish|+saltWater +produceLight
a hatchetfish|+saltWater +smallBread
a dragonfish|+saltWater +produceLight
a viperfish|+saltWater +sharp
a goby|+saltWater +smallBread
a blenny|+saltWater +smallBread
a wrasse|+saltWater +colorful
a parrotfish|+saltWater +colorful
a butterflyfish|+saltWater +colorful
an angelfish|+saltWater +colorful
a surgeonfish|+saltWater +colorful
a damselfish|+saltWater +colorful
a cardinalfish|+saltWater +red
a squirrelfish|+saltWater +red
a triggerfish|+saltWater +colorful
a filefish|+saltWater +colorful
`},
{kind:'fish',flags:'+water +swim',entries:`
a barracuda|+saltWater +carnivore +sharp +dangerous
a tarpon|+saltWater +veryLarge +jump
a bonefish|+saltWater +groups
a pompano|+saltWater +groups
a permit fish|+saltWater +groups
a cobia|+saltWater +carnivore
a wahoo|+saltWater +carnivore
a mahi-mahi|+saltWater +colorful
a marlin|+saltWater +veryLarge +sharp
a sailfish|+saltWater +veryLarge
a swordfish|+saltWater +veryLarge +sharp
a sunfish|+saltWater +veryLarge +round
a mola mola|+saltWater +veryLarge +round
a remora|+saltWater +smallBread
a pilot fish|+saltWater +groups
a cleaner wrasse|+saltWater +colorful
a sand lance|+saltWater +smallBread
a sea robin|+saltWater +spotted
a flying gurnard|+saltWater +colorful
a hogfish|+saltWater +colorful
a goatfish|+saltWater +red
a tilefish|+saltWater +colorful
a monkfish|+saltWater +carnivore
a hake|+saltWater +carnivore
a pollock|+saltWater +groups
a haddock|+saltWater +groups
a whiting|+saltWater +groups
a lingcod|+saltWater +carnivore
a rockfish|+saltWater +spotted
a red snapper|+saltWater +red
a grouper|+saltWater +veryLarge
a sea bass|+saltWater +carnivore
a black drum|+saltWater +black
a red drum|+saltWater +red
a sheepshead fish|+saltWater +striped
a flounder|+saltWater +flat
`},
{kind:'reptile',flags:'+coldBlood +spine',entries:`
a frilled lizard|+brown +forest +feet
a horned lizard|+brown +feet
a glass lizard|+brown -feet
a basilisk lizard|+green +water +swim +feet
a chuckwalla|+brown +feet
a thorny devil|+brown +feet
a blue-tongued skink|+brown +feet
a crocodile skink|+brown +feet +water
a fire skink|+red +feet
a sandfish skink|+brown +feet
a bearded dragon|+brown +feet
a uromastyx|+brown +feet
a leopard gecko|+spotted +feet
a crested gecko|+climb +feet
a tokay gecko|+spotted +climb +feet
a leaf-tailed gecko|+forest +brown +climb +feet
a day gecko|+green +climb +feet
a mourning gecko|+climb +feet
a leopard tortoise|+shell +spotted +feet
a pancake tortoise|+shell +flat +feet
a star tortoise|+shell +spotted +feet
a softshell turtle|+shell +water +swim +feet
a snapping turtle|+shell +water +swim +dangerous
a musk turtle|+shell +water +swim
a painted turtle|+shell +water +swim +colorful
a map turtle|+shell +water +swim
a box turtle|+shell +feet
a mata mata turtle|+shell +water +swim
a green anaconda|+water +swim +green -feet
a hognose snake|+striped -feet
a vine snake|+green +climb -feet
a corn snake|+red +spotted -feet
a milk snake|+striped +red -feet
a king snake|+striped -feet
a rat snake|+climb -feet
a ribbon snake|+striped +water -feet
`},
{kind:'insect',flags:'+eggs +insect',entries:`
an atlas moth|+wings +colorful +veryLarge
a luna moth|+wings +green +colorful
a death's-head hawkmoth|+wings +brown
a hummingbird hawkmoth|+wings +brown
a silk moth|+wings +soft +brown
an emperor moth|+wings +colorful
a tiger moth|+wings +striped
a rosy maple moth|+wings +colorful
a blue morpho butterfly|+wings +colorful
a glasswing butterfly|+wings +seeThrough
a monarch butterfly|+wings +colorful
a zebra longwing|+wings +striped
a swallowtail butterfly|+wings +colorful +longTail
a peacock butterfly|+wings +colorful
a painted lady butterfly|+wings +colorful
a cabbage white butterfly|+wings +white
a leaf insect|+green +forest
a walking stick insect|+brown +forest
a praying mantis|+green +carnivore
an orchid mantis|+white +colorful +carnivore
a giant water bug|+water +swim +carnivore
a water strider|+water +legs
a diving beetle|+water +swim
a rhinoceros beetle|+brown +heavy
a stag beetle|+brown
a jewel beetle|+colorful +green
a firefly|+produceLight +wings
a click beetle|+noise +wings
a ladybird beetle|+spotted +red +wings
a weevil|+brown
a leafhopper|+green +hop +wings
a planthopper|+green +hop +wings
a treehopper|+brown +jump
a cicada|+noise +heard +wings
a lacewing|+green +wings
a dobsonfly|+wings +brown
`},
{kind:'invert',flags:'+coldBlood',entries:`
a velvet worm|+forest +soft
a tardigrade|+water +smallGolf
a horseshoe crab|+shell +water +saltWater
a sea spider|+water +saltWater +legs
a whip scorpion|+nocturnal +legs
a tailless whip scorpion|+nocturnal +legs
a camel spider|+brown +legs
a jumping spider|+jump +legs +carnivore
a trapdoor spider|+nocturnal +legs +carnivore
a wolf spider|+legs +carnivore
a fishing spider|+water +swim +legs
a garden orb-weaver|+garden +legs
a golden silk orb-weaver|+colorful +legs
a crab spider|+legs +colorful
a peacock spider|+colorful +jump +legs
a tarantula hawk wasp|+wings +dangerous
a paper wasp|+wings +dangerous
a potter wasp|+wings
a mud dauber|+wings
a velvet ant|+dangerous
a leafcutter ant|+groups +garden
an army ant|+groups +carnivore
a trap-jaw ant|+groups +carnivore
a honeypot ant|+groups +sweet
a bullet ant|+groups +dangerous
a giant centipede|+legs +dangerous
a house centipede|+legs +household
a pill millipede|+legs +round
a giant millipede|+legs +brown
a garden snail|+shell +garden
a banana slug|+soft +yellow +slippery
a leopard slug|+spotted +soft
a sea cucumber|+saltWater +water +soft
a sea anemone|+saltWater +water +colorful
a sea urchin|+saltWater +water +round
a feather star|+saltWater +water +colorful
`},
{kind:'fruit',flags:'+eat +seeds',entries:`
a persimmon|+sweet +orange
a quince|+yellow +sweet
a loquat|+yellow +sweet +smallBread
a medlar|+brown +sweet
a pawpaw fruit|+green +sweet
a feijoa|+green +sweet
a cherimoya|+green +sweet
a soursop|+green +sweet
a sugar apple|+green +sweet
a custard apple|+green +sweet
a breadfruit|+green +round
a jackfruit|+green +veryLarge +heavy
a durian|+green +heavy +goodSmell
a rambutan|+red +sweet
a longan|+brown +sweet
a langsat|+yellow +sweet
a salak fruit|+brown +sweet
a mangosteen|+round +sweet
a star apple|+round +sweet
a sapodilla|+brown +sweet
a mamey sapote|+brown +sweet
a black sapote|+green +sweet
a white sapote|+green +sweet
a canistel|+yellow +sweet
a tamarillo|+red +sweet
a pepino melon|+yellow +sweet
a horned melon|+yellow +green +seeds
a bitter melon|+green -sweet
a winter melon|+green +veryLarge
a casaba melon|+yellow +round +sweet
a galia melon|+round +sweet
a Santa Claus melon|+green +sweet
a pluot|+round +sweet
an aprium|+round +sweet
a tangelo|+round +sweet
a ugli fruit|+green +round +sweet
`},
{kind:'berry',flags:'+sweet +smallBread',entries:`
a cloudberry|+yellow +sweet
a salmonberry|+red +sweet
a marionberry|+black +sweet
a boysenberry|+black +sweet
a loganberry|+red +sweet
a tayberry|+red +sweet
a dewberry|+black +sweet
a huckleberry|+blue +sweet
a lingonberry|+red +sweet
a bilberry|+black +sweet
a crowberry|+black +sweet
a bearberry|+red
a serviceberry|+red +sweet
a juneberry|+red +sweet
a chokeberry|+black -sweet
a chokecherry|+red
a sea buckthorn berry|+yellow +sweet
a goji berry|+red +sweet
an elderberry|+black
a mulberry|+black +sweet
a white mulberry|+white +sweet
a blackcurrant|+black +sweet
a redcurrant|+red +sweet
a whitecurrant|+white +sweet
a gooseberry|+green +sweet
a cape gooseberry|+yellow +sweet
a goldenberry|+yellow +sweet
a ground cherry|+yellow +sweet
a miracle berry|+red +sweet
an acai berry|+black
a maqui berry|+black +sweet
a jabuticaba|+black +sweet
a coffee cherry|+red +seeds
an allspice berry|+brown +goodSmell
a pink peppercorn|+red +smallGolf
a juniper berry|+green +goodSmell
`},
{kind:'vegetable',flags:'+eat +organic',entries:`
Romanesco broccoli|+green +colorful
broccolini|+green
Chinese broccoli|+green +leaves
broccoli rabe|+green +leaves
tatsoi|+green +leaves
mizuna|+green +leaves
komatsuna|+green +leaves
water spinach|+green +leaves
Malabar spinach|+green +leaves
Swiss chard|+green +leaves +red
rainbow chard|+green +leaves +colorful
collard greens|+green +leaves
mustard greens|+green +leaves
turnip greens|+green +leaves
beet greens|+green +leaves +red
dandelion greens|+green +leaves
purslane|+green +leaves
sorrel|+green +leaves
endive|+green +leaves
escarole|+green +leaves
radicchio|+red +leaves
frisée lettuce|+green +leaves
butter lettuce|+green +leaves
little gem lettuce|+green +leaves
oak leaf lettuce|+green +leaves
ice plant leaves|+green +leaves
nopales|+green +flat
hearts of palm|+white
bamboo shoots|+white +crunchy
lotus stem|+crunchy +hole
fiddlehead ferns|+green
garlic scapes|+green +goodSmell
pea shoots|+green +leaves
sunflower sprouts|+green +leaves
radish sprouts|+green +leaves
mung bean sprouts|+white +crunchy
`},
{kind:'root',flags:'+roots +rootVeg',entries:`
a celeriac|+brown +round
a rutabaga|+round +brown
a purple yam|+colorful +brown
a Chinese yam|+brown +longTail
a Jerusalem artichoke|+brown +round
a yacon|+brown +sweet
a jicama|+brown +round +crunchy
a daikon radish|+white +longTail +crunchy
a watermelon radish|+green +red +crunchy
a black radish|+black +crunchy
a white turnip|+white +round
a golden beet|+yellow +round
a candy cane beet|+striped +round
a purple carrot|+colorful +crunchy
a parsnip|+white +longTail
a salsify|+brown +longTail
a scorzonera|+black +longTail
a burdock root|+brown +longTail
a lotus root|+hole +round +crunchy
an arrowroot|+white
a cassava root|+brown
a taro root|+brown
an eddoe|+brown +round
a malanga|+brown
a water chestnut|+brown +round +crunchy
a tiger nut|+brown +round +smallBread
a maca root|+brown
a konjac root|+brown
a galangal root|+brown +goodSmell
a turmeric root|+yellow +goodSmell
a ginger root|+brown +goodSmell
a horseradish root|+white +goodSmell
a wasabi rhizome|+green +goodSmell
a fingerroot|+brown +goodSmell
a purple sweet potato|+colorful +sweet
a white sweet potato|+white +sweet
`},
