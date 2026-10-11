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
feature¶»§q«^