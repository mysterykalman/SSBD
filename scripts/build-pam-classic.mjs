import {readFile,readdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const refRoot=join(root,'data','pam20q','reference');
const momDir=join(root,'src','client','mom-mode');
const generatedPath=join(momDir,'knowledge.generated.js');
const stylesPath=join(momDir,'styles.css');
const classicStylesPath=join(momDir,'classic.css');

async function findPinnedModel(){
  const dirs=await readdir(refRoot,{withFileTypes:true});
  for(const entry of dirs){
    if(!entry.isDirectory())continue;
    const dir=join(refRoot,entry.name);
    const q=join(dir,'questions.json'),t=join(dir,'targets.json'),w=join(dir,'weights.u2states.bin');
    if(existsSync(q)&&existsSync(t)&&existsSync(w))return{q,t,w};
  }
  throw new Error('Pinned Pam classic 20Q model files were not found under data/pam20q/reference');
}

const source=await findPinnedModel();
const [questionsRaw,targetsRaw,weights,previous,baseStyles,classicStyles]=await Promise.all([
  readFile(source.q,'utf8'),readFile(source.t,'utf8'),readFile(source.w),readFile(generatedPath,'utf8'),readFile(stylesPath,'utf8'),readFile(classicStylesPath,'utf8')
]);
const questions=JSON.parse(questionsRaw),targets=JSON.parse(targetsRaw);
if(questions.length!==156)throw new Error(`Expected 156 Pam questions, found ${questions.length}`);
if(targets.length!==1200)throw new Error(`Expected 1200 Pam targets, found ${targets.length}`);
if(weights.length!==questions.length*targets.length)throw new Error(`Pam weight matrix has ${weights.length} cells; expected ${questions.length*targets.length}`);
for(const value of weights)if(value>3)throw new Error(`Pam weight matrix contains invalid state ${value}`);

const payload=`window.PAM_CLASSIC_MODEL=Object.freeze({questions:${JSON.stringify(questions)},targets:${JSON.stringify(targets)},weightsB64:${JSON.stringify(weights.toString('base64'))},layout:'question-major',states:4});\n`;
try{
  await Promise.all([
    writeFile(generatedPath,payload,'utf8'),
    writeFile(stylesPath,`${baseStyles}\n/* Pam frozen 20Q UI */\n${classicStyles}\n`,'utf8')
  ]);
  await import(pathToFileURL(join(root,'scripts','build.mjs')).href+`?pamClassic=${Date.now()}`);
}finally{
  await Promise.all([writeFile(generatedPath,previous,'utf8'),writeFile(stylesPath,baseStyles,'utf8')]);
}
