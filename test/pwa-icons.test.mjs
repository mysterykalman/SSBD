import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {inflateSync} from "node:zlib";

// Decode PNG alpha directly, without introducing a new project dependency.
// A PNG can advertise RGBA while still storing an opaque white square; this
// test checks actual transparent pixels around the original felt patch.
async function pngAlphaAt(filePath,positions) {
  const bytes=await readFile(new URL(filePath,import.meta.url));
  assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
  let width=0,height=0,bitDepth=0,colorType=0,offset=8;
  const data=[];
  while(offset<bytes.length) {
    const length=bytes.readUInt32BE(offset);
    const type=bytes.toString("ascii",offset+4,offset+8);
    const start=offset+8;
    if(type==="IHDR") {
      width=bytes.readUInt32BE(start);
      height=bytes.readUInt32BE(start+4);
      bitDepth=bytes[start+8];
      colorType=bytes[start+9];
    } else if(type==="IDAT") data.push(bytes.subarray(start,start+length));
    offset=start+length+4;
    if(type==="IEND")break;
  }
  assert.equal(bitDepth,8,"8-bit PNG required");
  assert.equal(colorType,6,"RGBA PNG required (old opaque RGB icon detected)");
  const raw=inflateSync(Buffer.concat(data));
  const stride=width*4;
  let previous=Buffer.alloc(stride);
  let at=0;
  const answers=new Map();
  const requested=new Set(positions.map(([x,y])=>x+","+y));
  for(let y=0;y<height;y++){
    const filter=raw[at++];
    const current=Buffer.alloc(stride);
    for(let i=0;i<stride;i++){
      const left=i>=4?current[i-4]:0;
      const above=previous[i];
      const aboveLeft=i>=4?previous[i-4]:0;
      let predictor=0;
      if(filter===1)predictor=left;
      else if(filter===2)predictor=above;
      else if(filter===3)predictor=Math.floor((left+above)/2);
      else if(filter===4){
        const p=left+above-aboveLeft;
        const a=Math.abs(p-left),b=Math.abs(p-above),c=Math.abs(p-aboveLeft);
        predictor=a<=b&&a<=c?left:b<=c?above:aboveLeft;
      } else assert.equal(filter,0,"Unsupported PNG filter");
      current[i]=(raw[at+i]+predictor)&255;
    }
    for(const [x,yy] of positions)if(yy===y&&requested.has(x+","+yy))
      answers.set(x+","+y,current[4*x+3]);
    at+=stride;
    previous=current;
  }
  return {width,height,answers};
}

for(const [file,size] of [
  ["icon-512.png",512],
  ["icon-192.png",192],
  ["apple-touch-icon.png",180],
  ["favicon-32.png",32]
]){
  test(file+" preserves the original felt icon with genuinely transparent corners",async()=>{
    const at=[[0,0],[size-1,0],[0,size-1],[size-1,size-1],[size>>1,size>>1]];
    const png=await pngAlphaAt("../src/client/icons/"+file,at);
    assert.equal(png.width,size);
    assert.equal(png.height,size);
    for(const [x,y] of at.slice(0,4))
      assert.equal(png.answers.get(x+","+y),0,file+" has an opaque or white corner at "+x+","+y);
    assert.ok(png.answers.get((size>>1)+","+(size>>1))>=245,"the embroidered felt logo must remain solid");
  });
}
