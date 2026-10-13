import test from "node:test";
import assert from "node:assert/strict";
import {sphere,adjacency,sculpt,subdivide} from "../dist/src/mesh-model.js";
import {project,active,validate,parse,encode,duplicate,removeObject,History,totals,MAX_HISTORY_BYTES} from "../dist/src/scene-model.js";
import {normalVector,splitObject} from "../dist/src/cut-model.js";
import {SmoothKeys,translate,validateSelection,SELECTION_DEFAULTS,objectDelta} from "../dist/src/interaction-model.js";
// Low-resolution synthetic sphere keeps exhaustive boundary cases cheap.
const fixture=()=>{const p=project("sphere",false);active(p).mesh=sphere(8,4);return p;};
for(const [field,min,max] of [["position",-100,100],["rotation",-3600,3600],["scale",.001,100]])
  for(const axis of [0,1,2])test("transform "+field+axis+" finite/type/endpoints",()=>{
    for(const v of [min,max]){const p=fixture();active(p).transform[field][axis]=v;validate(p);}
    for(const v of [min-.00001,max+.00001,NaN,Infinity,-Infinity,String(min),null,true]){
      const p=fixture();active(p).transform[field][axis]=v;const before=structuredClone(p);assert.throws(()=>validate(p));assert.deepEqual(p,before);
    }
  });
for(const field of ["roughness","metalness"])test("material "+field+" endpoints/type",()=>{
  for(const v of [0,1]){const p=fixture();active(p).material[field]=v;validate(p);}
  for(const v of [-.001,1.001,NaN,Infinity,"0",null]){const p=fixture();active(p).material[field]=v;assert.throws(()=>validate(p));}
});
test("raw typed-array conversion rejects coercible/invalid coordinates and indices",()=>{
  const raw=JSON.parse(encode(fixture())),before=JSON.stringify(raw);
  for(const v of ["0",null,true,100.01,-100.01]){const p=structuredClone(raw);p.objects[0].mesh.positions[0]=v;assert.throws(()=>parse(JSON.stringify(p)));}
  for(const v of [-1,.5,"0",null,131072]){const p=structuredClone(raw);p.objects[0].mesh.indices[0]=v;assert.throws(()=>parse(JSON.stringify(p)));}
  assert.equal(JSON.stringify(raw),before);
});
test("scene IDs, object cap and deletion preserve unrelated object geometry",()=>{
  const s=fixture();for(let i=0;i<7;i++)duplicate(s);const before=encode(s);
  assert.throws(()=>duplicate(s));assert.equal(encode(s),before);
  const first=structuredClone(s.objects[0]);removeObject(s);assert.deepEqual(s.objects[0],first);
  for(const change of [s=>s.nextId=1,s=>s.nextId=1.5,s=>s.activeId="missing",s=>s.objects[1].id=s.objects[0].id]){
    const q=parse(before);change(q);assert.throws(()=>validate(q));
  }
});
test("UTF-8 24MB limit and corrupt inputs preserve fixture",()=>{
  const s=fixture(),before=encode(s),raw=JSON.parse(before);
  for(const v of ["{","null","[]",true])assert.throws(()=>parse(v));
  raw.fixturePadding="가".repeat(8000000);const large=JSON.stringify(raw);assert(large.length<24000000);assert.throws(()=>parse(large));
  assert.equal(encode(s),before);
});
for(const [field,min,max] of [["radius",.01,2],["strength",.0001,.2],["pressure",0,1]])
  test("brush "+field+" bounds and rejection atomicity",()=>{
    const mesh=sphere(8,4),neighbors=adjacency(mesh);
    for(const v of [min,max])assert.doesNotThrow(()=>sculpt(structuredClone(mesh),neighbors,[1,0,0],[1,0,0],{[field]:v}));
    for(const v of [min-.00001,max+.00001,NaN,Infinity,"1",null]){
      const before=mesh.positions.slice();assert.throws(()=>sculpt(mesh,neighbors,[1,0,0],[1,0,0],{[field]:v}));assert.deepEqual(mesh.positions,before);
    }
  });
test("zero-pressure all-mode strokes and subdivision leave inputs unchanged",()=>{
  const mesh=sphere(8,4),before=structuredClone(mesh),neighbors=adjacency(mesh);
  for(const mode of ["add","subtract","smooth","flatten","crease"])sculpt(mesh,neighbors,[1,0,0],[1,0,0],{mode,pressure:0});
  assert.deepEqual(mesh,before);const fine=subdivide(mesh);assert.deepEqual(mesh,before);assert.deepEqual(fine.positions.slice(0,mesh.positions.length),mesh.positions);
});
test("cut rejection is atomic and huge finite normals stay unit length",()=>{
  const p=active(fixture()),before=structuredClone(p);
  for(const ratio of [0,.009,.991,1,NaN,Infinity,".5"])assert.throws(()=>splitObject(p,[1,0,0],0,ratio));
  for(const normal of [[0,0,0],[NaN,0,1],["1",0,0],[1,0]])assert.throws(()=>normalVector(normal));
  assert.deepEqual(p,before);
  const n=normalVector([Number.MAX_VALUE,Number.MAX_VALUE,0]);assert(Math.abs(Math.hypot(...n)-1)<1e-12,"finite extreme normal must remain unit length");
});
test("selection/step endpoints reject wrong types; direction clipping remains proportional",()=>{
  for(const [field,good,bad] of [["width",[.25,3],[.249,3.001,"1",null,NaN]],["opacity",[.05,1],[.049,1.001,"1",null,Infinity]]]){
    for(const value of good)validateSelection({...SELECTION_DEFAULTS,[field]:value});
    for(const value of bad)assert.throws(()=>validateSelection({...SELECTION_DEFAULTS,[field]:value}));
  }
  for(const step of [.0001,10])assert.equal(objectDelta(1,0,"x",step)[0],step);
  for(const step of [0,10.001,"1",null,NaN])assert.throws(()=>objectDelta(1,0,"x",step));
  assert.deepEqual(translate([99,-99,0],[4,-8,2]),[99.5,-100,.25]);
});
test("keyboard repeated/backward timestamps, finish and new transaction",()=>{
  const k=new SmoothKeys();k.press({key:"d",fine:false},100);assert.deepEqual(k.tick(100),[0,0]);assert.deepEqual(k.tick(90),[0,0]);
  const moved=k.tick(116),tail=k.finish();assert(Math.abs(moved[0]+tail[0]-1)<1e-12);assert.deepEqual(k.tick(1000),[0,0]);
  k.press({key:"a",fine:true},1000);k.release("a");assert.deepEqual(k.finish(),[-.1,0]);assert(!k.active);
});
test("scene history branch and byte budget preserve detached data",()=>{
  const s=fixture(),h=new History();h.push(s);active(s).material.color="#123456";const old=h.undo(s);
  active(old).material.color="#abcdef";assert.equal(active(h.redo(old)).material.color,"#123456");
  h.undo(s);h.push(s);assert.equal(h.forward.length,0);
  const big=project("sphere",true);for(let i=0;i<25;i++)h.push(big);
  assert(h.back.length+h.forward.length<=20);assert([...h.back,...h.forward].reduce((n,p)=>n+totals(p).bytes+2048,0)<=MAX_HISTORY_BYTES);
});
