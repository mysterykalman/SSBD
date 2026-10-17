// Curated physical targets. Only explicit facts become known answer cells.
// A prefix + means confidently yes, ~ means probably, - means confidently no.
export const pam500Catalogue=[
{kind:'mammal',flags:'+furry +paws +carnivore',entries:`
a fishing cat|-water +swim +spotted
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
a waterbuck|+swim +brown
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
a water deer|-water +swim +brown
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
a kingfisher|+colorful +carnivore
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
a flying fish|+jump +saltWater
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
a rhinoceros beetle|+brown
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
a garden orb-weaver| +legs
a golden silk orb-weaver|+colorful +legs
a crab spider|+legs +colorful
a peacock spider|+colorful +jump +legs
a tarantula hawk wasp|+wings +dangerous
a paper wasp|+wings +dangerous
a potter wasp|+wings
a mud dauber|+wings
a velvet ant|+dangerous
a leafcutter ant|+groups
an army ant|+groups +carnivore
a trap-jaw ant|+groups +carnivore
a honeypot ant|+groups +sweet
a bullet ant|+groups +dangerous
a giant centipede|+legs +dangerous
a house centipede|+legs +household
a pill millipede|+legs +round
a giant millipede|+legs +brown
a garden snail|+shell
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
a durian|+green +heavy +smell
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
{kind:'tree',flags:'+tall +leaves +roots',entries:`
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
a menudo soup|+hot +wet
a caldo de res|+hot +wet
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
tteokbokki|+hot +red +hot
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
a ramen bowl|+hot +wet
a udon bowl|+hot +wet
a soba bowl|+hot +wet
a wonton soup|+hot +wet
a hot pot|+hot +wet
congee|+hot +soft +white
char siu pork|+hot +red
Peking duck|+hot +brown
Hainanese chicken rice|+hot +white
nasi goreng|+hot +brown
nasi lemak|+hot +white
laksa|+hot +wet
mee goreng|+hot +brown
satay chicken|+hot +hold +brown
gado-gado|+colorful +green
bánh mì|+hold +crunchy
bún bò Huế|+hot +wet +red
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
a bouillabaisse|+hot +wet
a cassoulet|+hot +brown
a coq au vin|+hot +brown
a beef bourguignon|+hot +brown
a tarte flambée|+hot +flat +brown
a gratin dauphinois|+hot +brown
a salade niçoise|+cold +colorful
a lobster bisque|+hot +wet +red
clam chowder|+hot +wet +white
a crab cake|+round +hot +brown
a lobster roll|+hold +brown
a po' boy sandwich|+hold +crunchy
a muffuletta|+hold +round
a gumbo bowl|+hot +wet +brown
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
{kind:'beverage',flags:'+tasty',entries:`
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

{kind:'kitchen',flags:'+household +useful',entries:`
a citrus zester|+hold +sharp +smallBread
a microplane grater|+hold +sharp +smallBread
a mandoline slicer|+sharp +flat +dangerous
a potato ricer|+hold +mechanical
a salad spinner|+round +spin +mechanical
an egg separator|+hold +smallBread
an egg slicer|+hold +mechanical +sharp
an egg coddler|+round +hot
an apple corer|+hold +sharp
a cherry pitter|+hold +mechanical
an avocado slicer|+hold +sharp
a melon baller|+hold +round
a pastry brush|+hold +soft
a pastry cutter|+hold +sharp
a bench scraper|+hold +flat +sharp
a dough docker|+roll +sharp
a rolling pin|+roll +round +hold
a tortilla press|+flat +mechanical +heavy
a garlic rocker|+hold +mechanical
a mortar and pestle|+heavy +stone +round
a nutcracker tool|+hold +mechanical
a can punch|+hold +sharp
a jar opener|+hold +mechanical
a vacuum sealer|+electronic +buttons
a sous vide wand|+electronic +hot +wet
a milk frother|+electronic +spin +noise +hold
an immersion blender|+electronic +spin +hold +sharp
a spice mill|+spin +goodSmell
a pepper grinder|+spin +goodSmell +hold
a tea infuser|+smallBread +hole +wet
a coffee dripper|+wet +round +hold
a French press|+wet +fragile +seeThrough +refill
a moka pot|+hot +wet
a stovetop steamer|+hot +wet +hole
a pasta drying rack|+tall +hold
a bread lame|+hold +sharp +smallBread
`},
{kind:'kitchen',flags:'+household +useful',entries:`
a cake turntable|+round +spin
a piping bag|+soft +hold +stretch
a cookie press|+mechanical +hold
a cookie cutter|+sharp +hold +smallBread
a pizza peel|+flat +hold +bigMicrowave
a pizza stone|+stone +hot +round +heavy
a baking steel|+flat +hot +heavy
a cast-iron griddle|+flat +hot +heavy
a Dutch oven pot|+hot +heavy +round
a double boiler|+hot +wet +heavy
a bain-marie pan|+hot +wet
a soufflé dish|+round +fragile
a ramekin|+round +fragile +smallBread
a springform pan|+round +mechanical +open
a bundt pan|+round +hole
a loaf tin|+box
a muffin tray|+hole +round +flat
a cooling rack|+flat +hole
a splatter screen|+round +flat +hole
a mesh strainer|+round +hole +hold
a chinois strainer|+round +hole +hold
a colander|+round +hole +wet
a bamboo steamer|+round +hole +hot
a sushi rolling mat|+roll +flat +hold
a rice paddle|+flat +hold
a wooden spoon rest|+flat +household
a spoonula|+soft +hold
a silicone spatula|+soft +hold +stretch
a ladle|+round +hold +wet
a gravy separator|+wet +seeThrough
a butter bell|+round +refill
a butter crock|+round +refill
an oil mister|+refill +hold +wet
a salad dressing shaker|+refill +round +hold
a herb stripper|+sharp +hold
a vegetable spiralizer|+mechanical +spin +sharp
`},
{kind:'gadget',flags:'+electronic +buttons +lights',entries:`
a smart doorbell|+ring +household +smallBread
a video doorbell|+ring +household +storeInfo
a baby monitor|+household +storeInfo +noise
a pet camera|+household +storeInfo
a digital picture frame|+household +flat +storeInfo
a Bluetooth tracker tag|+smallBread +pocket +ring
a wireless presentation clicker|+hold +buttons +smallBread
a digital voice recorder|+hold +storeInfo +smallBread
a laser distance meter|+hold +tool +bright
a laser level|+hold +tool +produceLight
a thermal imaging camera|+hold +storeInfo
an infrared thermometer|+hold +buttons
a smart smoke detector|+household +ring +noise
a smart leak detector|+household +ring
a smart air-quality sensor|+household +storeInfo
an electronic stud sensor|+hold +household +tool
an electronic luggage scale|+hold +tool +smallBread
a rechargeable hand warmer|+hold +hot +pocket
an electric bug zapper|+dangerous +bright +noise
a UV sterilizer wand|+hold +produceLight
a handheld label maker|+hold +buttons +storeInfo
a pocket translator|+hold +pocket +communicate
a digital notepad|+flat +storeInfo +computer
a smart pen|+hold +storeInfo
a document scanner|+flat +computer +storeInfo
a barcode reader|+hold +storeInfo +produceLight
an RFID reader|+hold +storeInfo
a receipt printer|+computer +storeInfo +noise
a portable photo printer|+hold +storeInfo +colorful
a mini thermal printer|+hold +storeInfo +noise
a digital photo keychain|+pocket +smallBread
a wireless microphone transmitter|+hold +noise +communicate
a USB audio interface|+computer +box +buttons
a MIDI controller|+computer +buttons +played
a stream deck controller|+computer +buttons +lights
a haptic feedback vest|+wear +game +noise
`},
{kind:'gadget',flags:'+electronic +buy',entries:`
a robotic lawn mower|+motorized +move +sharp
a robot window cleaner|+motorized +move +household +wet
a robot pool cleaner|+motorized +move +swim
a robotic pet feeder|+household +refill +mechanical
an automatic litter box|+household +motorized +mechanical
a smart bird feeder|+household +storeInfo +refill
a solar garden light| +produceLight +bright
a motion sensor light|+household +produceLight +bright
an LED strip light|+household +produceLight +bright +stretch
a smart light bulb|+household +produceLight +bright +round
a sunrise alarm clock|+household +produceLight +ring
a white-noise machine|+household +noise +heard
an aroma diffuser|+household +refill +goodSmell
an electric blanket|+household +soft +warm +wear
a heated mattress pad|+household +soft +warm
an electric foot warmer|+household +warm +soft
a heated lunch box|+household +hot +box
a portable induction burner|+household +hot +flat
an electric griddle|+household +hot +flat
a sandwich press|+household +hot +flat
a waffle cone maker|+household +hot +round
an electric crepe maker|+household +hot +round
a popcorn popper|+household +hot +noise
a cotton candy machine|+household +spin +hot
a snow cone maker|+household +spin +cold
a slushie machine|+household +spin +cold
a yogurt maker|+household +warm +refill
a bread proofer|+household +warm +box
an electric dehydrator|+household +hot +refill
a vacuum food marinator|+household +mechanical +refill
a soda carbonator|+household +refill +noise
an automatic soap dispenser|+household +refill +wet
an electric toothbrush sanitizer|+household +produceLight
a UV nail lamp|+household +produceLight +bright
a heated eyelash curler|+household +hot +hold
a beard trimmer|+hold +sharp +noise
`},
{kind:'tool',flags:'+tool +useful +manufactured',entries:`
a torque wrench|+hold +mechanical +heavy
a ratcheting screwdriver|+hold +mechanical +spin
a hex key set|+hold +smallBread
a Torx driver|+hold +smallBread +spin
a countersink bit|+sharp +spin +smallBread
a hole saw|+sharp +hole +spin
a spade drill bit|+sharp +spin
a Forstner drill bit|+sharp +spin +round
a router bit|+sharp +spin +smallBread
a wood rasp|+sharp +hold
a cabinet scraper|+sharp +flat +hold
a block plane|+sharp +hold +heavy
a spokeshave|+sharp +hold
a drawknife|+sharp +hold +dangerous
a coping saw|+sharp +hold
a Japanese pull saw|+sharp +hold
a dovetail saw|+sharp +hold
a flush-cut saw|+sharp +hold
a jeweler's saw|+sharp +hold
a fret saw|+sharp +hold
a rivet gun|+mechanical +hold +noise
a caulking gun|+mechanical +hold +refill
a grease gun|+mechanical +hold +refill
a soldering iron|+hot +hold +dangerous
a desoldering pump|+hold +mechanical
a wire stripper|+sharp +hold
a crimping tool|+mechanical +hold
a multimeter|+electronic +buttons +storeInfo
a clamp meter|+electronic +buttons +hold
a non-contact voltage tester|+electronic +produceLight +hold
a fish tape reel|+roll +stretch +hold
a chalk line reel|+roll +refill +hold
a plumb bob|+heavy +hold
a feeler gauge|+smallBread +flat
a thread gauge|+smallBread
a dial caliper|+mechanical +hold +smallBread
`},
{kind:'tool',flags:'+tool +useful +hold',entries:`
a garden dibber|+sharp +hold
a soil auger|+spin +sharp
a bulb planter| +sharp +hold
a hand cultivator| +sharp +hold
a soil scoop| +hold
a hori hori knife| +sharp +dangerous
a weeding fork| +sharp +hold
a dandelion weeder| +sharp +hold
a seed spreader| +refill +mechanical
a hose nozzle| +wet +refill +hold
a watering wand| +wet +hold
a rain gauge| +wet +clear
a compost thermometer| +hold +tool
a grafting knife| +sharp +hold
a grafting tape roll| +roll +stretch
a bonsai shear| +sharp +hold
a bonsai wire cutter| +sharp +hold
a branch lopper| +sharp +mechanical
a pole pruner| +sharp +tall
a bow saw| +sharp +hold
a fruit picker basket| +tall +carryThings
a berry rake| +hold
a mushroom knife|+sharp +hold +smallBread
a foraging basket| +carryThings
a pruning saw| +sharp +hold
a pruning snip| +sharp +hold
a grafting tool| +sharp +hold
a spading fork| +sharp +tall
a digging bar| +heavy +tall
a rock pick|+sharp +hold
a geologist's hammer|+heavy +hold
a hand lens|+seeThrough +smallBread
a magnifying loupe|+seeThrough +smallBread
a specimen jar|+clear +refill +open
a petri dish|+clear +round +fragile
a pipette|+wet +hold +smallBread
`},
{kind:'object',flags:'+touch +buy',entries:`
a paper lantern|+soft +produceLight +shade
a snow globe|+round +fragile +seeThrough
a music box|+box +open +songs +noise
a wind chime|+heard +ring +noise
a dreamcatcher|+round +hole
a decorative terrarium|+clear +seeThrough
a glass cloche|+clear +seeThrough +fragile
a ceramic figurine|+fragile +smallBread
a porcelain vase|+fragile +refill +hold
a decorative urn|+fragile +refill +round
a candle snuffer|+hold
a candlestick holder|+hold +household
a tealight holder|+smallBread +round
a wax seal stamp|+hold +smallBread
a sealing wax stick|+burn +hold
a fountain pen|+hold +refill +smallBread
a dip pen|+hold +refill +smallBread
a calligraphy brush|+hold +soft
an ink blotter|+flat +hold
a leather journal|+open +storeInfo +brown
a travel sketchbook|+open +storeInfo +flat
a bookmark tassel|+soft +smallBread
a bookplate sticker|+flat +smallBread
a page holder|+hold +smallBread
a reading stand|+flat +hold
a letter opener|+hold +sharp
a paperweight|+heavy +smallBread
a desk organizer|+carryThings +household
a document tray|+flat +carryThings
a corkboard|+flat +household +brown
a bulletin pin|+sharp +smallGolf
a binder clip|+mechanical +smallBread
a bulldog clip|+mechanical +smallBread
a hole punch|+mechanical +hold +hole
an embossing stamp|+mechanical +hold
a wax crayon set|+colorful +hold
`},
{kind:'object',flags:'+touch +manufactured',entries:`
a foldable picnic table|+flat +legs +carryThings
a camping cot|+flat +legs +soft +soft
a collapsible bucket|+refill +carryThings +wet
a dry bag|+wet +carryThings +open
a waterproof phone pouch|+wet +carryThings +seeThrough
a carabiner clip|+smallBread +mechanical
a paracord bracelet|+wear +stretch +smallBread
a campfire tripod|+legs +hot +tall
a fire steel striker|+hold +burn +smallBread
a ferro rod|+hold +burn +smallBread
a camping spork|+hold +smallBread
a collapsible cup|+refill +wet +hold
a travel cutlery kit|+hold +box
a picnic blanket|+flat +soft +bigMicrowave
a beach umbrella|+shade +tall +open
a sun shelter|+shade +open +veryLarge
a portable hammock|+soft +stretch +hold
a hammock strap|+stretch +heavy
a camping pillow|+soft +smallBread
an inflatable sleeping pad|+soft +blowUp +flat
a foam sleeping pad|+soft +flat
a camp stool|+legs +hold
a portable camp shower|+wet +refill
a solar shower bag|+wet +hot +refill
a water purification straw|+wet +hold +smallBread
a water purification tablet|+wet +smallGolf
a camping water filter|+wet +refill +hold
a hydration bladder|+wet +carryThings +refill
a folding water jug|+wet +refill +carryThings
a collapsible cooler|+cold +carryThings
a dry box|+wet +box +open
a bug net|+hole +stretch +soft
a mosquito head net|+wearHead +hole +soft
a tent peg|+sharp +hold
a guyline tensioner|+mechanical +stretch +smallBread
a lantern hanger|+hold +mechanical
`},
{kind:'wear',flags:'+wear +sizes +manufactured',entries:`
a rain poncho| +soft +open
a packable windbreaker|+soft +pocket
a neck gaiter|+soft +wearHead +stretch
a balaclava|+soft +wearHead +cold
a sun visor|+shade +wearHead
a bucket hat|+shade +wearHead +soft
a boonie hat|+shade +wearHead +soft
a beanie hat|+soft +wearHead +cold
a beret|+soft +wearHead
a newsboy cap|+soft +wearHead
a flat cap|+soft +wearHead
a trilby hat|+wearHead +shade
a fascinator hat|+wearHead +colorful
a mortarboard cap|+wearHead +flat
a chef's toque|+wearHead +white
a shower cap|+wearHead +soft
a swim cap|+wearHead +soft
a cycling cap|+wearHead +soft
a welding mask|+wearHead +dangerous
a face shield|+wearHead +seeThrough
a sleep mask|+wearHead +soft
a neck pillow|+soft +wear +stretch
a wrist sweatband|+wear +soft +stretch
a compression sleeve|+wear +soft +stretch
an arm warmer|+wear +soft +warm
a leg warmer|+wear +soft +warm
a knee brace|+wear +mechanical
a wrist brace|+wear +mechanical
a posture corrector|+wear +stretch
a reflective safety vest|+wear +bright +colorful
a fishing vest|+wear +pocket
a utility belt|+wear +carryThings
a climbing harness|+wear +carryPeople
a life vest|+wear +float
a flotation belt|+wear +float
a weighted vest|+wear +heavy
`},
{kind:'soft',flags:'+soft +touch',entries:`
a weighted blanket|+heavy +soft +household
a cooling blanket|+cold +soft +household
a heated throw blanket|+warm +soft +household
a fleece throw|+warm +soft +household
a quilted bedspread|+flat +soft +household
a duvet insert|+fluffy +soft +household
a bolster pillow|+round +soft
a body pillow|+soft +bigMicrowave
a lumbar pillow|+soft +smallBread
a pregnancy pillow|+soft +round
a travel neck pillow|+soft +round
a memory foam topper|+soft +flat +bigMicrowave
a mattress protector|+flat +soft
a fitted sheet|+flat +soft +stretch
a pillow sham|+soft +flat
a silk pillowcase|+soft +flat
a linen napkin|+flat +soft +household
a table runner|+flat +soft +household
a woven placemat|+flat +soft +household
a bath mat|+flat +wet +soft
a microfiber towel|+soft +wet +household
a waffle-weave towel|+soft +wet +household
a hand towel|+soft +wet +household
a Turkish bath towel|+soft +wet
a beach towel|+soft +wet +bigMicrowave
a face cloth|+soft +wet +smallBread
a dishcloth|+soft +wet +household
a linen tea towel|+soft +wet +household
a reusable makeup pad|+soft +wet +smallBread
a wash mitt|+soft +wet +wear
an oven mitt|+soft +hot +wear
a silicone potholder|+soft +hot +hold
a pot handle sleeve|+soft +hot +wear
a heated eye mask|+soft +warm +wearHead
a reusable ice sleeve|+soft +cold +wear
a fabric storage cube|+soft +box +carryThings
`},
{kind:'sport',flags:'+game +buy',entries:`
a pickleball paddle|+hold +flat +game
a padel racket|+hold +flat +game
a squash racket|+hold +flat +game
a badminton shuttlecock|+smallBread +feathers +game
a table tennis paddle|+hold +flat +game
a table tennis ball|+round +roll +smallBread
a lacrosse stick|+hold +tall +game
a field hockey stick|+hold +tall +game
a floorball stick|+hold +tall +game
a cricket bat|+hold +flat +game
a cricket wicket|+tall +game
a cricket ball|+round +roll +game
a bocce ball|+round +roll +heavy
a pétanque ball|+round +roll +heavy
a curling stone|+round +heavy +stone
a curling broom|+tall +hold +game
a lawn bowling ball|+round +roll +heavy
a disc golf disc|+round +flat +game
an ultimate frisbee|+round +flat +game
a flying ring toy|+round +hole +game
a diabolo toy|+spin +game +round
a kendama|+round +hold +game
a yo-yo|+round +spin +roll +game
a juggling club|+hold +game +spin
a juggling ring|+round +hole +game
a juggling beanbag|+soft +hold +game
a hacky sack|+soft +smallBread +game
a slackline|+stretch +game -game
a balance board|+flat +game -game
a wobble board|+round +game +flat -game
a foam roller|+roll +round +game -game
a Pilates ring|+round +hole +stretch -game
a grip strengthener|+hold +mechanical -game
a jump rope|+hold +stretch +game -game
a battle rope|+heavy +stretch +game -game
a speed ladder|+flat +game -game
`},
{kind:'vehicle',flags:'+transport +carryPeople +move',entries:`
a recumbent bicycle|+roll +mechanical -motorized
a tandem bicycle|+roll +mechanical -motorized
a cargo bicycle|+roll +carryThings -motorized
a folding bicycle|+roll +mechanical -motorized
a fat-tire bicycle|+roll +mechanical -motorized
a balance tricycle|+roll +mechanical -motorized
a handcycle|+roll +mechanical -motorized
an electric unicycle|+roll +motorized
a kick scooter|+roll -motorized
an electric kick scooter|+roll +motorized
a sit-down scooter|+roll +motorized
a golf cart|+roll +motorized +game
a go-kart|+roll +motorized +game
a pedal go-kart|+roll -motorized +game
a dune buggy|+roll +motorized
a side-by-side ATV|+roll +motorized
a snowmobile|+motorized
a snowcat vehicle|+motorized +heavy
an airboat|+motorized +wet +float
a hovercraft|+motorized +wet +float
a jet ski|+motorized +wet +float
a stand-up paddleboard|+wet +float -motorized
an outrigger canoe|+wet +float -motorized
an inflatable kayak|+wet +float -motorized
a pedal boat|+wet +float -motorized
a rowboat|+wet +float -motorized
a coracle|+wet +float -motorized
a catamaran|+wet +float +veryLarge
a trimaran|+wet +float +veryLarge
a gondola boat|+wet +float -motorized
a water taxi|+wet +float +motorized
a river ferry|+wet +float +veryLarge
a funicular carriage|+roll +motorized
a cable car gondola|+motorized +tall
a chairlift|+motorized +carryPeople
a monorail train|+motorized +veryLarge
`},
{kind:'instrument',flags:'+played +noise +heard',entries:`
a kalimba|+hold +smallBread
a mbira|+hold
a hang drum|+round +heavy +hold
a steel tongue drum|+round +heavy +hold
a djembe drum|+round +hold
a cajón|+box +hold
a conga drum|+round +heavy
a bongo drum|+round +smallBread
a talking drum|+round +hold
a frame drum|+round +flat +hold
a bodhrán|+round +flat +hold
a tambourine|+round +hole +hold
a rainstick|+tall +hold
an ocean drum|+round +hold
a thunder tube|+hold +noise
a guiro|+hold +brown
a cabasa|+round +hold
a shekere|+round +hold
a maraca|+round +hold
a castanet|+smallBread +hold
a wood block instrument|+brown +hold
a temple block|+brown +hold
a cowbell|+ring +hold
a handbell|+ring +hold
a triangle instrument|+ring +hold
a finger cymbal|+ring +smallBread
a singing bowl|+round +heavy +ring
a tuning fork|+hold +ring
a harmonica|+hold +smallBread +pocket
an ocarina|+hold +smallBread +hole
a tin whistle|+hold +smallBread
a pan flute|+hold +hole
a melodica|+hold +buttons +blowUp
a concertina|+hold +buttons +stretch
an autoharp|+hold +buttons
a hammered dulcimer|+heavy +box
`},
];
