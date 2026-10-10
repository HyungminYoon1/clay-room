import test from 'node:test';
import assert from 'node:assert/strict';
import {direction,motionCommand,objectDelta,translate,boxEdges,SELECTION_DEFAULTS,validateSelection,selectionVisible} from '../dist/src/interaction-model.js';
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
