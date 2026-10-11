import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const INVENTORY=path.join(ROOT,'.dev-data','mom-playable-50k','playable_50k.csv');
const OUT=path.join(ROOT,'.dev-data','trait-sources','wikidata-labelled-evidence.json');

const PROPS={
 P31:'instance of',P279:'subclass of',P106:'occupation',P27:'country of citizenship',P17:'country',
 P495:'country of origin',P136:'genre',P170:'creator',P50:'author',P57:'director',P175:'performer',
 P361:'part of',P527:'has part',P186:'material',P366:'use',P276:'location',P131:'located in',
 P452:'industry',P176:'manufacturer',P400:'platform',P641:'sport',P21:'gender',P144:'based on',
 P138:'named after',P1412:'languages spoken',P101:'field of work',P69:'educated at',P108:'employer',
 P1303:'instrument',P264:'record label',P463:'member of',P54:'member of sports team',P413:'position played',
 P577:'publication date',P921:'main subject',P180:'depicts',
 P462:'color',P2048:'height',P2067:'mass',P2054:'density',P2670:'has parts of class',P1552:'has quality',
 P105:'taxon rank',P171:'parent taxon',P183:'endemic to',P141:'conservation status',P703:'found in taxon'
};

function parseCsv(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quoted){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(ch==='"')quoted=false;else cell+=ch;}
  else if(ch==='"')quoted=true;else if(ch===','){row.push(cell);cell='';}else if(ch==='\n'){row.push(cell.replace(/\r$/,'')¶»§q«^