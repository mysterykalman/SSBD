import {readFile,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';
import {loadThematicRoster} from './pam-thematic-lab.mjs';
import {appendReviewedPamExpansion} from './pam-merge-reviewed-expansion.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const momDir=join(root,'src','client','mom-mode');
const generatedPath=join(momDir,'knowledge.generated.js');
const stylesPath=join(momDir,'styles.css');
const classicStylesPath=join(momDir,'classic.css');

const [frozen,previous,baseStyles,classicStyles]=await Promise.all([
  loadPam1775Model(loadPamClassicModel),
  readFile(generatedPath,'utf8'),
  readFile(stylesPath,'utf8'),
  readFile(classicStylesPath,'utf8')
]);

const {baseTargetCount,extensionCount,qualityCount,totalExtensionCount}=frozen;
if(frozen.questions.length!==156)throw new Error(`Expected 156 Pam questions, found ${frozen.questions.length}`);
if(frozen.targets.length!==1775)throw new Error(`Expected 1775 Pam targets, found ${frozen.targets.length}`);
if(baseTargetCount!==1200)throw new Error(`Expected 1200 base Pam targets, found ${baseTargetCount}`);
if(extensionCount!==200)throw new Error(`Expected 200 first-wave Pam extension targets, found ${extensionCount}`);
if(qualityCount!==375)throw new Error(`Expected 375 quality Pam targets, found ${qualityCount}`);
if(frozen.weights.length!==frozen.questions.length*frozen.targets.length)throw new Error(`Pam weight matrix has ${frozen.weights.length} cells; expected ${frozen.questions.length*frozen.targets.length}`);
if(frozen.knownMask.length!==frozen.weights.length)throw new Error(`Pam known mask has ${frozen.knownMask.length} cells; expected ${frozen.weights.length}`);

// Never auto-promote research artifacts into a playable game.
// Only a deliberately enabled, signed-off release package is accepted.
let model=frozen;
if(process.env.PAM_ENABLE_EXPANSION==='1'){
 const packageDir=join(root,'data','pam20q','expansion','release');
 const [approvedJson,questionsJson,roster]=await Promise.all([
  readFile(join(packageDir,'approved-1352.json'),'utf8'),
  readFile(join(packageDir,'questions.json'),'utf8'),
  loadThematicRoster()
 ]);
 model=appendReviewedPamExpansion(frozen,roster,JSON.parse(approvedJson),JSON.parse(questionsJson));
}
const {questions,targets,weights,knownMask}=model;

const payload=`window.PAM_CLASSIC_MODEL=Object.freeze({questions:${JSON.stringify(questions)},targets:${JSON.stringify(targets)},weightsB64:${JSON.stringify(weights.toString('base64'))},knownMaskB64:${JSON.stringify(knownMask.toString('base64'))},layout:'question-major',states:4,baseTargets:${baseTargetCount},extensionTargets:${totalExtensionCount+(model.reviewedExpansionCount||0)},openingCategories:${JSON.stringify(model.openingCategories||null)},expansionReviewed:${model.expansionReviewed===true}});\n`;
try{
  await Promise.all([
    writeFile(generatedPath,payload,'utf8'),
    writeFile(stylesPath,`${baseStyles}\n/* Pam frozen 20Q UI */\n${classicStyles}\n`,'utf8')
  ]);
  await import(pathToFileURL(join(root,'scripts','build.mjs')).href+`?pamClassic=${Date.now()}`);
}finally{
  await Promise.all([writeFile(generatedPath,previous,'utf8'),writeFile(stylesPath,baseStyles,'utf8')]);
}
