import {readFile,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPamExpandedModel} from './pam-quality-model.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const momDir=join(root,'src','client','mom-mode');
const generatedPath=join(momDir,'knowledge.generated.js');
const stylesPath=join(momDir,'styles.css');
const classicStylesPath=join(momDir,'classic.css');

const [{questions,targets,weights,knownMask,baseTargetCount,extensionCount,qualityCount,newQualityCount=0,totalExtensionCount},previous,baseStyles,classicStyles]=await Promise.all([
  loadPamExpandedModel(loadPamClassicModel),
  readFile(generatedPath,'utf8'),
  readFile(stylesPath,'utf8'),
  readFile(classicStylesPath,'utf8')
]);

if(questions.length!==156)throw new Error(`Expected 156 Pam questions, found ${questions.length}`);
if(targets.length!==1775+newQualityCount)throw new Error(`Expected ${1775+newQualityCount} Pam targets, found ${targets.length}`);
if(baseTargetCount!==1200)throw new Error(`Expected 1200 base Pam targets, found ${baseTargetCount}`);
if(extensionCount!==200)throw new Error(`Expected 200 first-wave Pam extension targets, found ${extensionCount}`);
if(qualityCount!==375)throw new Error(`Expected 375 quality Pam targets, found ${qualityCount}`);
if(weights.length!==questions.length*targets.length)throw new Error(`Pam weight matrix has ${weights.length} cells; expected ${questions.length*targets.length}`);
if(knownMask.length!==weights.length)throw new Error(`Pam known mask has ${knownMask.length} cells; expected ${weights.length}`);

const payload=`window.PAM_CLASSIC_MODEL=Object.freeze({questions:${JSON.stringify(questions)},targets:${JSON.stringify(targets)},weightsB64:${JSON.stringify(weights.toString('base64'))},knownMaskB64:${JSON.stringify(knownMask.toString('base64'))},layout:'question-major',states:4,baseTargets:${baseTargetCount},extensionTargets:${totalExtensionCount}});\n`;
try{
  await Promise.all([
    writeFile(generatedPath,payload,'utf8'),
    writeFile(stylesPath,`${baseStyles}\n/* Pam frozen 20Q UI */\n${classicStyles}\n`,'utf8')
  ]);
  await import(pathToFileURL(join(root,'scripts','build.mjs')).href+`?pamClassic=${Date.now()}`);
}finally{
  await Promise.all([writeFile(generatedPath,previous,'utf8'),writeFile(stylesPath,baseStyles,'utf8')]);
}
