import {readFile,writeFile,unlink} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const here=dirname(fileURLToPath(import.meta.url));
const sourcePath=join(here,'experiment-pam-question-selection.mjs');
const tempPath=join(here,'.pam-selector-fine-tuning.tmp.mjs');
let source=await readFile(sourcePath,'utf8');
const start=source.indexOf('const CONFIGS=Object.freeze([');
const endMarker=']);\n\nfunction createGame';
const end=source.indexOf(endMarker,start);
if(start<0||end<0)throw new Error('Could not locate selector experiment config block');
const configs=`const CONFIGS=Object.freeze([
 {name:'baseline'},
 {name:'fine-floor995',familyFactors:{1:.75,2:.86,3:.94},baseFloor:.995},
 {name:'fine-floor99',familyFactors:{1:.78,2:.88,3:.95},baseFloor:.99},
 {name:'fine-floor99-gap12',familyFactors:{1:.72,2:.87},baseFloor:.99},
 {name:'fine-floor985-gap12',familyFactors:{1:.75,2:.88},baseFloor:.985},
 {name:'fine-floor99-gap1',familyFactors:{1:.65},baseFloor:.99},
 {name:'fine-floor99-pairs',familyFactors:{1:.8,2:.9,3:.96},pairFactors:{1:.5,2:.7,3:.85,4:.94},baseFloor:.99}
`;
source=source.slice(0,start)+configs+source.slice(end);
source=source.replace("selector-experiments.json","selector-fine-tuning.json");
source=source.replaceAll('PAM_SELECTOR_EXPERIMENTS_','PAM_SELECTOR_FINE_TUNING_');
await writeFile(tempPath,source);
try{
  const result=spawnSync(process.execPath,[tempPath],{stdio:'inherit',cwd:join(here,'..')});
  if(result.status!==0)process.exitCode=result.status??1;
}finally{
  await unlink(tempPath).catch(()=>{});
}
