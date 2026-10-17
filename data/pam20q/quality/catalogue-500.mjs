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
an aardwolf|+striped +nocturnal +carnivore
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
a kingfisher|+colorful +water +carnivore
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
a bowfin|+brown -saltWater
a gar fish|+sharp +longTail
a sturgeon|+heavy +water
a paddlefish|+water +heavy
an arapaima|+veryLarge +heavy
an arowana|+jump +water
a knifefish|+water +nocturnal
an electric eel|+water +dangerous
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
a persimmon|+sweet +colorful
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
a huckleberry|+colorful +sweet
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

{kind:'herb',flags:'+green +leaves +goodSmell',entries:`
lemon balm|+goodSmell
lemon verbena|+goodSmell
Thai basil|+goodSmell
holy basil|+goodSmell
purple basil|+colorful
pineapple sage|+goodSmell
clary sage|+goodSmell
winter savory|+goodSmell
summer savory|+goodSmell
marjoram|+goodSmell
lovage|+goodSmell
chervil|+goodSmell
salad burnet|+goodSmell
borage leaves|+goodSmell
shiso leaves|+colorful
epazote|+goodSmell
culantro|+goodSmell
Vietnamese coriander|+goodSmell
lemon thyme|+goodSmell
creeping thyme|+goodSmell
anise hyssop|+goodSmell +sweet
hyssop|+goodSmell
woodruff|+goodSmell
sweet cicely|+sweet +goodSmell
wintergreen leaves|+goodSmell
curry leaves|+goodSmell
makrut lime leaves|+goodSmell
pandan leaves|+goodSmell
bay laurel leaves|+goodSmell
fenugreek leaves|+goodSmell
moringa leaves|+green
nasturtium leaves|+green
garlic chives|+green +goodSmell
lemon grass|+green +goodSmell
tarragon|+green +goodSmell
dill weed|+green +goodSmell
`},
{kind:'nut',flags:'+eat +smallBread',entries:`
a pili nut|+brown +crunchy
a candlenut|+brown
a ginkgo nut|+yellow
a breadnut|+brown
a tiger nut|+brown +sweet
a pine nut|+white +smallGolf
a kukui nut|+brown
a baru nut|+brown +crunchy
a mongongo nut|+brown
a paradise nut|+brown
a heartnut|+brown
a hickory nut|+brown
a bitternut|+brown
a butternut|+brown
a chinquapin|+brown
a beechnut|+brown
a kola nut|+brown
a water caltrop|+brown
a lotus seed|+white +round
a pumpkin seed|+green +flat
a sunflower kernel|+white +smallGolf
a watermelon seed|+black +flat
a hemp seed|+brown +smallGolf
a chia seed|+black +smallGolf
a flaxseed|+brown +smallGolf
a sesame seed|+white +smallGolf
a poppy seed|+black +smallGolf
a nigella seed|+black +smallGolf
a caraway seed|+brown +goodSmell
a fennel seed|+brown +goodSmell
anise seed|+brown +goodSmell
a coriander seed|+brown +goodSmell
a mustard seed|+yellow +smallGolf
a cumin seed|+brown +goodSmell
a cardamom pod|+green +goodSmell
a star anise pod|+brown +goodSmell
`},
{kind:'tree',flags:'+tall +forest +leaves +roots',entries:`
a baobab tree|+heavy +veryLarge
a kapok tree|+veryLarge +tall
a banyan tree|+veryLarge +tall
a cork oak tree|+brown +tall
a paper birch tree|+white +tall
a river birch tree|+brown +water
a quaking aspen|+white +tall
a cottonwood tree|+tall +water
a black locust tree|+tall
a honey locust tree|+tall
a tulip tree|+tall +colorful
a jacaranda tree|+colorful +tall
a flame tree|+red +colorful
a silk tree|+colorful
a dragon blood tree|+red +tall
a monkey puzzle tree|+tall +green
a dawn redwood|+tall +veryLarge
a bald cypress|+tall +water
a ginkgo tree|+yellow +tall
a bottle tree|+tall
a sausage tree|+tall
a rain tree|+tall
a Joshua tree|+tall +green
a frankincense tree|+goodSmell
a myrrh tree|+goodSmell
a rubber tree|+tall
a breadfruit tree|+tall +seeds
a jackfruit tree|+tall +seeds
a tamarind tree|+tall +seeds
a mangrove tree|+water +saltWater
a sea grape tree|+saltWater +green
a cacao tree|+seeds
a coffee tree|+seeds
a clove tree|+goodSmell
a nutmeg tree|+goodSmell
a cinnamon tree|+goodSmell
`},
{kind:'plant',flags:'+garden +green +leaves',entries:`
a pitcher plant|+carnivore +wet
a sundew plant|+carnivore +wet
a butterwort|+carnivore +wet
a bladderwort|+carnivore +water
a cobra lily|+carnivore +wet
a tropical pitcher plant|+carnivore +wet
a sensitive plant|+touch
an air plant|+green
a staghorn fern|+green +forest
a bird's nest fern|+green +forest
a maidenhair fern|+green +forest
a Boston fern|+green +forest
a sword fern|+green +forest
a tree fern|+green +forest +tall
a rabbit's foot fern|+green
a maidenhair spleenwort|+green
a zebra plant|+striped +green
a snake plant|+striped +green
a prayer plant|+green +colorful
a peacock plant|+green +colorful
a polka dot plant|+spotted +colorful
a string of pearls plant|+round +green
a string of hearts plant|+green
a jade plant|+green +round
a zebra haworthia|+striped +green
a ponytail palm|+green +tall
a fan palm|+green +tall
a date palm|+green +tall +seeds
a sago palm|+green +tall
a spider plant|+green
a Swiss cheese plant|+green +hole
a fiddle-leaf fig|+green +leaves
a rubber plant|+green +leaves
a Chinese money plant|+round +green
a peace lily|+white +green
a calla lily|+white +green
`},
{kind:'meal',flags:'+hot +goodSmell',entries:`
shakshuka|+red +hot +round
a breakfast burrito|+hold +hot
a breakfast quesadilla|+flat +hot +hold
a chilaquiles plate|+crunchy +hot +red
huevos rancheros|+hot +red
a tamale|+hot +hold
an arepa|+round +hot +hold
a pupusa|+round +flat +hot +hold
an empanada|+hold +hot +brown
a pastelito|+hold +hot +crunchy
a gordita|+round +hot +hold
a tostada|+flat +crunchy +hold
a sope|+round +hot
a tlacoyo|+flat +hot
a torta sandwich|+hold +hot
a cemita sandwich|+hold +brown
a pambazo|+hold +red
a birria taco|+hold +hot +brown
a fish taco|+hold +hot
a carnitas taco|+hold +hot
a breakfast taco|+hold +hot
an enchilada|+red +hot +roll
a chile relleno|+green +hot
a mole poblano|+brown +hot
a pozole bowl|+hot +red
a menudo soup|+hot +water
a caldo de res|+hot +water
a tortilla soup|+hot +red
a black bean soup|+hot +black
a lentil stew|+hot +brown
a chickpea curry|+hot +yellow
a spinach curry|+hot +green
a coconut curry|+hot +white
a seafood paella|+hot +yellow
a chicken paella|+hot +yellow
a mushroom risotto|+hot +brown
`},
{kind:'meal',flags:'+hot +goodSmell',entries:`
bibimbap|+hot +colorful +round
japchae|+hot +brown
tteokbokki|+hot +red +spicy
kimchi fried rice|+hot +red
bulgogi|+hot +brown
galbi|+hot +brown
kimbap|+roll +hold +cold
onigiri|+hold +white +cold
okonomiyaki|+round +flat +hot
takoyaki|+round +hot +hold
yakisoba|+hot +brown
yakitori|+hot +hold +brown
katsu curry|+hot +brown
a katsu sandwich|+hold +hot +crunchy
a tonkatsu cutlet|+hot +crunchy
a ramen bowl|+hot +water
a udon bowl|+hot +water
a soba bowl|+hot +water
a wonton soup|+hot +water
a hot pot|+hot +water
congee|+hot +soft +white
char siu pork|+hot +red
Peking duck|+hot +brown
Hainanese chicken rice|+hot +white
nasi goreng|+hot +brown
nasi lemak|+hot +white
laksa|+hot +water
mee goreng|+hot +brown
satay chicken|+hot +hold +brown
gado-gado|+colorful +green
bánh mì|+hold +crunchy
bún bò Huế|+hot +water +red
bún chả|+hot +brown
cao lầu|+hot +brown
som tam|+green +crunchy +cold
larb salad|+green +cold
`},
{kind:'meal',flags:'+hot +goodSmell',entries:`
a shepherd's pie|+hot +brown
a cottage pie|+hot +brown
a steak and kidney pie|+hot +brown
a chicken pot pie|+hot +brown
a Cornish pasty|+hot +hold +brown
a Scotch egg|+round +hold +brown
bangers and mash|+hot +brown
bubble and squeak|+hot +brown
a ploughman's lunch|+cold +hold
Welsh rarebit|+hot +brown +hold
a croque monsieur|+hot +hold +brown
a croque madame|+hot +hold +brown
a quiche Lorraine|+round +hot
a ratatouille|+hot +colorful
a bouillabaisse|+hot +water
a cassoulet|+hot +brown
a coq au vin|+hot +brown
a beef bourguignon|+hot +brown
a tarte flambée|+hot +flat +brown
a gratin dauphinois|+hot +brown
a salade niçoise|+cold +colorful
a lobster bisque|+hot +water +red
clam chowder|+hot +water +white
a crab cake|+round +hot +brown
a lobster roll|+hold +brown
a po' boy sandwich|+hold +crunchy
a muffuletta|+hold +round
a gumbo bowl|+hot +water +brown
a jambalaya bowl|+hot +brown +red
shrimp and grits|+hot +white
a chicken-fried steak|+hot +crunchy +brown
a sloppy joe|+hold +hot +brown
a Reuben sandwich|+hold +hot +brown
a Monte Cristo sandwich|+hold +hot +brown
a patty melt|+hold +hot +brown
a meatball sub|+hold +hot +red
`},
{kind:'dessert',flags:'+sweet +goodSmell',entries:`
a crème brûlée|+brown +cold +crunchy
a panna cotta|+white +cold +soft
a pavlova|+white +crunchy +soft
an Eton mess|+white +soft
a baked Alaska|+white +cold
a lemon posset|+yellow +cold
a sticky toffee pudding|+brown +hot
a bread pudding|+brown +hot
a rice pudding|+white +cold
a tapioca pudding|+white +cold
a chocolate mousse|+brown +soft +cold
a lemon mousse|+yellow +soft +cold
a fruit trifle|+colorful +cold
a tiramisu|+brown +cold
a tres leches cake|+white +cold
a flan dessert|+brown +round +cold
a caramel custard|+brown +cold
an egg tart|+round +yellow
a Portuguese custard tart|+round +yellow
a mille-feuille|+brown +crunchy
a Paris-Brest pastry|+round +brown
a profiterole|+round +brown
an éclair pastry|+brown +sweet
a madeleine cookie|+brown +hold
a financier cake|+brown +hold
a canelé|+brown +round +hold
a kouign-amann|+brown +crunchy
a dacquoise|+brown +crunchy
a banoffee pie|+brown +cold
a key lime pie|+green +cold
a chess pie|+yellow +round
a shoofly pie|+brown +round
a pecan tart|+brown +round
a frangipane tart|+round +brown
a fruit galette|+colorful +round
a clafoutis|+red +round
`},
{kind:'dessert',flags:'+sweet +goodSmell',entries:`
a gulab jamun|+round +brown +hot
a jalebi|+brown +crunchy +round
a rasgulla|+white +round +cold
a ras malai|+white +cold +soft
a kulfi|+cold +sweet
a falooda|+cold +colorful
a kheer|+white +cold
a halwa|+brown +hot
a baklava|+brown +crunchy
a kunafa|+brown +crunchy +hot
a basbousa|+brown +round
a maamoul|+round +brown +hold
a lokum|+soft +colorful +hold
a mochi dessert|+soft +round +hold
a daifuku|+soft +round +hold
a dorayaki|+round +brown +hold
a taiyaki|+brown +hold
a melon pan|+round +brown +hold
a castella cake|+yellow +soft
a matcha roll cake|+green +soft
a mango sticky rice|+yellow +sweet
a black sesame soup|+black +hot
a tangyuan|+round +hot
a mooncake|+round +brown +hold
a pineapple bun|+round +brown +hold
a snow skin mooncake|+round +white +hold
a sesame ball|+round +brown +hold
a red bean bun|+round +brown +hold
a coconut macaroon|+white +hold
a French macaron|+round +colorful +hold
a Turkish rice pudding|+white +cold
an affogato|+cold +brown
a granita|+cold +colorful
a sorbet cup|+cold +colorful
a gelato cone|+cold +hold
a frozen yogurt parfait|+cold +colorful
`},
{kind:'snack',flags:'+hold +buy',entries:`
roasted chickpeas|+crunchy +brown
wasabi peas|+green +crunchy
plantain chips|+yellow +crunchy
taro chips|+brown +crunchy
cassava chips|+brown +crunchy
kale chips|+green +crunchy
apple chips|+sweet +crunchy
banana chips|+sweet +crunchy
coconut chips|+white +crunchy
pita chips|+brown +crunchy
bagel chips|+brown +crunchy
rice crackers|+white +crunchy
seaweed snacks|+green +crunchy
cheese crisps|+yellow +crunchy
parmesan crisps|+white +crunchy
corn nuts|+yellow +crunchy
honey-roasted peanuts|+brown +crunchy +sweet
sesame snaps|+brown +crunchy +sweet
a granola bar|+brown +sweet
an oat bar|+brown +sweet
a fruit leather strip|+red +sweet +stretch
a date bar|+brown +sweet
a fig bar|+brown +sweet
a protein cookie|+brown +sweet
a trail mix packet|+box +sweet +crunchy
popcorn chicken|+hot +brown +crunchy
fried pickles|+hot +green +crunchy
a soft pretzel|+brown +hot
a cheese twist|+brown +crunchy
a puff pastry straw|+brown +crunchy
a churro|+brown +sweet +crunchy
a beignet|+white +sweet +hot
a zeppole|+round +sweet +hot
a funnel cake|+brown +sweet +hot
a doughnut hole|+round +sweet +smallBread
a mini cinnamon roll|+round +sweet
`},
{kind:'beverage',flags:'+water +tasty',entries:`
hibiscus tea|+red +hot +goodSmell
rooibos tea|+red +hot +goodSmell
chamomile tea|+yellow +hot +goodSmell
peppermint tea|+green +hot +goodSmell
jasmine tea|+hot +goodSmell
oolong tea|+brown +hot +goodSmell
pu-erh tea|+brown +hot
genmaicha|+green +hot
matcha latte|+green +hot
chai latte|+brown +hot +goodSmell
a London fog latte|+hot +goodSmell
a turmeric latte|+yellow +hot
a beet latte|+red +hot
a cortado|+brown +hot
a flat white coffee|+brown +hot
a macchiato|+brown +hot
a café au lait|+brown +hot
a Vietnamese iced coffee|+brown +cold +sweet
a cold brew coffee|+brown +cold
a nitro cold brew|+brown +cold
a mango lassi|+yellow +cold +sweet
a salted lassi|+white +cold
an ayran|+white +cold
a kefir drink|+white +cold
a horchata|+white +cold +sweet
an agua fresca|+cold +colorful +sweet
a tamarind drink|+brown +cold +sweet
a sugarcane juice|+yellow +cold +sweet
a coconut water drink|+clear +cold
a ginger beer|+brown +cold +sweet
a root beer float|+brown +cold +sweet
a cream soda float|+white +cold +sweet
an Italian soda|+cold +colorful
a Shirley Temple|+red +cold +sweet
a lime rickey|+green +cold
a sparkling lemonade|+yellow +cold +sweet
`},
