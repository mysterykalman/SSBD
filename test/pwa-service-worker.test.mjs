// Test the actual generated worker in a deterministic service-worker environment.
// Browser HTTP caches sometimes fulfil Range fetches before they reach a worker;
// these tests verify the worker itself constructs RFC-compliant byte responses.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const code = await readFile(new URL("../dist/sw.js",import.meta.url),"utf8");
const origin = "https://ssbd.test";
const size = 2048;
const mp3 = new Uint8Array(size);
for(let i=0;i<size;i++) mp3[i]=i%256;

function simulatedWorker(){
  const events = new Map();
  const cache = {
    match: async path => path==="/audio/intro.mp3"
      ? new Response(mp3.slice(),{status:200,headers:{"Content-Type":"audio/mpeg"}})
      : undefined
  };
  const scope = {
    self:{addEventListener:(kind,handler)=>events.set(kind,handler)},
    caches:{open:async()=>cache},
    location:{origin},
    Request,Response,Headers,URL,
    fetch:async()=>{throw new Error("Unexpected network request");},
    setTimeout,clearTimeout,Promise
  };
  runInNewContext(code,scope,{timeout:5000});
  return async(range)=>{
    const init=range?{headers:{Range:range}}:{};
    const request=new Request(origin+"/audio/intro.mp3",init);
    let answer;
    events.get("fetch")({request,respondWith:p=>{answer=p;}});
    assert.ok(answer,"worker must intercept known audio");
    return answer;
  };
}

test("audio response without Range returns the complete cached track",async()=>{
  const worker=simulatedWorker();
  const response=await worker();
  assert.equal(response.status,200);
  assert.equal((await response.arrayBuffer()).byteLength,size);
});

test("explicit byte Range returns a correct HTTP 206 partial response",async()=>{
  const worker=simulatedWorker();
  const response=await worker("bytes=64-191");
  assert.equal(response.status,206);
  assert.equal(response.headers.get("Content-Range"),"bytes 64-191/2048");
  assert.equal(response.headers.get("Accept-Ranges"),"bytes");
  assert.equal(response.headers.get("Content-Length"),"128");
  const bytes=new Uint8Array(await response.arrayBuffer());
  assert.equal(bytes.length,128);
  assert.equal(bytes[0],64);
  assert.equal(bytes[127],191);
});

test("suffix byte Range returns requested tail bytes",async()=>{
  const response=await simulatedWorker()("bytes=-32");
  assert.equal(response.status,206);
  assert.equal(response.headers.get("Content-Range"),"bytes 2016-2047/2048");
  assert.equal((await response.arrayBuffer()).byteLength,32);
});

test("unsatisfiable byte Range returns 416 with resource size",async()=>{
  const response=await simulatedWorker()("bytes=99999-");
  assert.equal(response.status,416);
  assert.equal(response.headers.get("Content-Range"),"bytes */2048");
});
