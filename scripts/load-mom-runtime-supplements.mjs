import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const DEFAULT_FILES = [
  ['knowledge.js','MOM_KNOWLEDGE'],
  ['knowledge.general.js','MOM_GENERAL_KNOWLEDGE'],
  ['knowledge.generated.js','MOM_GENERATED_KNOWLEDGE']
];

export function loadMomRuntimeSupplements(root=process.cwd(), files=DEFAULT_FILES) {
  const sandbox={globalThis:null};
  sandbox.globalThis=sandbox;
  vm.createContext(sandbox);
  const out=[];
  for(const [filename,globalName] of files){
    const full=path.join(root,'src','client','mom-mode',filename);
    if(!fs.existsSync(full))continue;
    vm.runInContext(fs.readFileSync(full,'utf8'),sandbox,{filename:full});
    const data=sandbox[globalName];
    if(!data)continue;
    out.push({
      source:filename,
      features:Array.from(data.FEATURES||[],feature=>({...feature})),
      objects:Array.from(data.OBJECTS||[],object=>({...object}))
    });
  }
  return out;
}

export {DEFAULT_FILES};
