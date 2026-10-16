import {readFile,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {loadPamClassicModel} from './pam-classic-model.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const momDir=join(root,'src','client','mom-mode');
const generatedPath=join(momDir,'knowledge.generated.js');
const stylesPath=join(momDir,'styles.css');
const classicStylesPath=join(momDir,'classic.css');

const [{questions,targets,weights,baseTargetCount,extensionCount},previous,baseStyles,classicStyles]=await Promise.all([
  loadPamClassicModel(),readFile(generatedPath,'utf8'),readFile(stylesPath,'utf8'),readFile(classicStylesPath,'utf8')
]);
if(questions.length!==156)throw new Error(`Expected 156 Pam questions, found ${questions.length}`);
if(targets.length!==baseTargetCount+extensionCount)throw new Error('Pam target count mismatch after extension compile');
if(weights.length!==questions.length*targets.length)throw new Error(`Pam weight matrix has ${weights.length} cells; expected ${questions.length*targets.length}`);
for(const value of weights)if(value>3)throw new Error(`Pam weight matrix contains invalid state ${value}`);

const payload=`window.PAM_CLASSIC_MODEL=Object.freeze({questions:${JSON.stringify(questions)},targets:${JSON.stringify(targets)},weightsB64:${JSON.stringify(weights.toString('base64'))},layout:'question-major',states:4,baseTargets:${baseTargetCount},extensionTargets:${extensionCount}});\n`;
try{
  await Promise.all([
    writeFile(generatedPath,payload,'utf8'),
    writeFile(stylesPath,`${baseStyles}\n/* Pam frozen 20Q UI */\n${classicStyles}\n`,'utf8')
  ]);
  await import(pathToFileURL(join(root,'scripts','build.mjs')).href+`?pamClassic=${Date.now()}`);
}finally{
  await Promise.all([writeFile(generatedPath,previous,'utf8'),writeFile(stylesPath,baseStyles,'utf8')]);
}
