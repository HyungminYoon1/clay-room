import test from 'node:test';
import assert from 'node:assert/strict';
import {direction,motionCommand,objectDelta,translate,boxEdges,SELECTION_DEFAULTS,validateSelection,selectionVisible,SmoothKeys} from '../dist/src/interaction-model.js';
import {project,active,encode,parse,History} from '../dist/src/scene-model.js';

test('arrows and WASD route to camera by default and objects only in explicit move mode',()=>{
  for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d','W','A','S','D']){
    assert.equal(motionCommand({key}).kind,'camera');assert.equal(motionCommand({key},{mode:'move'}).kind,'object');
  }
  assert.deepEqual(direction('ArrowRight'),[1,0]);assert.deepEqual(direction('w'),[0,1]);assert.equal(direction('constructor'),null);assert.equal(motionCommand({key:'ㅎ'}),null);
  assert.equal(motionCommand({key:'W',shiftKey:true}).fine,true);
});
test('input focus, dialogs, composition and browser modifiers do not leak to motion',()=>{
  for(const context of [{editable:true},{dialog:true},{focused:false}])assert.equal(motionCommand({key:'ArrowUp'},context),null);
  for(const flag of ['ctrlKey','metaKey','altKey','isComposing'])assert.equal(motionCommand({key:'s',[flag]:true}),null);
});
test('screen-plane and locked-axis keyboard movement retain sub-millimeter steps',()=>{
  const right=[.8,0,-.6],up=[.3,Math.sqrt(.75),.4];
  assert.deepEqual(objectDelta(1,0,'screen',.0001,right,up),right.map(x=>x*.0001));
  for(const [axis,i]of [['x',0],['y',1],['z',2]]){const expected=[0,0,0];expected[i]=-.01;assert.deepEqual(objectDelta(0,-1,axis,.01,right,up),expected);}
  assert.throws(()=>objectDelta(1,0,'bad',.01,right,up));assert.throws(()=>objectDelta(1,0,'x',0,right,up));assert.throws(()=>objectDelta(1,0,'x',Infinity,right,up));
});
test('bound clipping preserves motion direction and does not mutate existing vectors',()=>{
  const before=[99,0,0],delta=[2,4,0];assert.deepEqual(translate(before,delta),[100,2,0]);assert.deepEqual(before,[99,0,0]);assert.deepEqual(delta,[2,4,0]);
  assert.deepEqual(translate([-99,1,0],[-4,-8,0]),[-100,-1,0]);assert.deepEqual(translate([100,0,0],[1,2,3]),[100,0,0]);
  assert.deepEqual(translate([100,0,0],[0,.00001,0]),[100,.00001,0]);
  for(const bad of [[NaN,0,0],[0,Infinity,0],[101,0,0],[0,0]])assert.throws(()=>translate(bad,[1,0,0]));
});
test('one position transaction retains exact mesh coordinates and roundtrips/undoes as a scene',()=>{
  const scene=project('sphere',false),before=structuredClone(scene),history=new History(),object=active(scene);
  for(let i=0;i<20;i++)object.transform.position=translate(object.transform.position,[.00001,0,0]);
  assert.deepEqual(object.mesh.positions,active(before).mesh.positions);assert.deepEqual(object.mesh.indices,active(before).mesh.indices);
  const restored=parse(encode(scene));assert.equal(active(restored).transform.position[0],object.transform.position[0]);assert(Math.abs(object.transform.position[0]-.0002)<1e-15);
  history.push(before);assert.equal(history.back.length,1);assert.deepEqual(active(history.undo(scene)).transform.position,[0,0,0]);assert.deepEqual(active(history.redo(before)).transform.position,object.transform.position);
});
test('selection supports genuinely configurable widths with bounded settings and transient lifetime',()=>{
  assert.deepEqual(SELECTION_DEFAULTS,{mode:'gesture',width:.75,opacity:.35});
  assert(selectionVisible(SELECTION_DEFAULTS,false,900,899));assert(!selectionVisible(SELECTION_DEFAULTS,false,900,900));assert(selectionVisible(SELECTION_DEFAULTS,true,0,5000));
  assert(!selectionVisible({...SELECTION_DEFAULTS,mode:'hidden'},true,900,0));assert(selectionVisible({...SELECTION_DEFAULTS,mode:'always'},false,0,5000));assert(!selectionVisible({...SELECTION_DEFAULTS,mode:'always'},true,900,0,true));
  for(const width of [.25,.5,.75,1,3])assert.equal(validateSelection({...SELECTION_DEFAULTS,width}).width,width);
  for(const change of [{mode:'invalid'},{width:0},{width:NaN},{width:4},{opacity:0},{opacity:1.01}])assert.throws(()=>validateSelection({...SELECTION_DEFAULTS,...change}));
});
test('reusable box buffer contains exactly twelve distinct edges and finite bound corners',()=>{
  const min=[-1,-2,-3],max=[1,2,3],edges=boxEdges(min,max),unique=new Set();assert.equal(edges.length,72);
  for(let i=0;i<72;i+=6){const a=edges.slice(i,i+3),b=edges.slice(i+3,i+6);assert.equal(a.filter((v,k)=>v!==b[k]).length,1);for(const v of [a,b])v.forEach((n,k)=>assert(n===min[k]||n===max[k]));unique.add([a.join(','),b.join(',')].sort().join('|'));}
  assert.equal(unique.size,12);assert.throws(()=>boxEdges([1,0,0],[0,0,0]));assert.throws(()=>boxEdges([Infinity,0,0],max));
});
const command=(key='ArrowRight',fine=false)=>motionCommand({key,shiftKey:fine},{mode:'move'});
const settle=(motion,start=0)=>{const sum=[0,0];for(let now=start+10;motion.active&&now<=start+1000;now+=10){const d=motion.tick(now);d.forEach((v,i)=>sum[i]+=v);}assert(!motion.active);return sum;};
test('short taps animate fractionally and settle to the exact normal or Shift step',()=>{
  for(const fine of [false,true]){const keys=new SmoothKeys();keys.press(command('d',fine),0);keys.release('d');const first=keys.tick(16);assert(first[0]>0&&first[0]<(fine?.1:1));const rest=settle(keys,16);assert(Math.abs(first[0]+rest[0]-(fine?.1:1))<1e-14);assert.equal(first[1]+rest[1],0);assert.deepEqual(keys.tick(1000),[0,0]);}
});
test('held movement is elapsed-time based across 30/60/144 FPS rather than OS repeats',()=>{
  const distances=[];for(const fps of [30,60,144]){const keys=new SmoothKeys(),sum=[0,0];keys.press(command(),0);for(let frame=1;frame<=fps;frame++){const delta=keys.tick(frame*1000/fps);delta.forEach((v,i)=>sum[i]+=v);}keys.release('ArrowRight');const tail=settle(keys,1000);distances.push(sum[0]+tail[0]);assert.equal(sum[1]+tail[1],0);}
  assert(distances.every(v=>Math.abs(v-distances[0])<1e-12));assert(Math.abs(distances[0]-17.5)<1e-12);
  const keys=new SmoothKeys();keys.press(command(),0);for(let repeat=0;repeat<20;repeat++)assert.equal(keys.press(command(),0),false);keys.release('ArrowRight');assert(Math.abs(settle(keys)[0]-1)<1e-14);
});
test('continuous diagonal speed is normalized and opposite directions cancel',()=>{
  const straight=new SmoothKeys(),diagonal=new SmoothKeys(),opposite=new SmoothKeys();straight.press(command('d'),0);diagonal.press(command('d'),0);diagonal.press(command('w'),0);opposite.press(command('d'),0);opposite.press(command('a'),0);
  for(let now=10;now<=1000;now+=10){straight.tick(now);diagonal.tick(now);assert.deepEqual(opposite.tick(now),[0,0]);}
  assert(Math.abs(diagonal.target[0]-1-(straight.target[0]-1)/Math.SQRT2)<1e-12);assert(Math.abs(diagonal.target[1]-diagonal.target[0])<1e-12);
});
test('Shift changes future held speed without a positional jump; suspension delta is capped',()=>{
  const keys=new SmoothKeys();keys.press(command(),0);for(let now=10;now<=500;now+=10)keys.tick(now);const before=[...keys.applied];keys.setFine(true);assert.deepEqual(keys.applied,before);const target=[...keys.target];keys.tick(550);assert(Math.abs(keys.target[0]-target[0]-.1)<1e-12);
  const old=[...keys.target];keys.tick(100000);assert(Math.abs(keys.target[0]-old[0]-.1)<1e-12);assert.throws(()=>keys.tick(Infinity));
});
test('finish flushes only the pending tap and clear cancels every future frame',()=>{
  const keys=new SmoothKeys();keys.press(command(),0);const frame=keys.tick(16),rest=keys.finish();assert(Math.abs(frame[0]+rest[0]-1)<1e-14);assert(!keys.active);assert.deepEqual(keys.tick(1000),[0,0]);
  keys.press(command('w'),1000);keys.tick(1016);keys.clear();assert(!keys.active);assert.deepEqual(keys.finish(),[0,0]);assert.deepEqual(keys.tick(2000),[0,0]);assert.throws(()=>keys.press({key:'invalid'},2000));
});
