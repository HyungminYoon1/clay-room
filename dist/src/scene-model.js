import {project as singleProject,validate as validateObject,MAX_VERTICES,MAX_TRIANGLES} from './mesh-model.js';
export const MAX_OBJECTS=8,MAX_HISTORY_BYTES=48000000;
const finite=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b;
const identity=()=>({position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]});
export function project(shape='pebble',fine=true,size=2){
  if(!finite(size,.002,50))throw Error('크기는 0.002–50m입니다.');
  const object=singleProject(shape,fine);object.id='o1';const width=Math.max(...bounds(object).size);object.transform.scale=Array(3).fill(size/width);
  return {version:2,title:object.title,unit:'m',activeId:object.id,nextId:2,objects:[object]};
}
export function active(scene){return scene.objects.find(o=>o.id===scene.activeId);}
export function totals(scene){return scene.objects.reduce((sum,o)=>({vertices:sum.vertices+o.mesh.positions.length/3,triangles:sum.triangles+o.mesh.indices.length/3,bytes:sum.bytes+o.mesh.positions.byteLength+o.mesh.indices.byteLength}),{vertices:0,triangles:0,bytes:0});}
export function validate(scene){
  if(!scene||scene.version!==2||scene.unit!=='m'||typeof scene.title!=='string'||scene.title.length>160||!Array.isArray(scene.objects)||!scene.objects.length||scene.objects.length>MAX_OBJECTS||!Number.isSafeInteger(scene.nextId)||scene.nextId<2||scene.nextId>1000000)throw Error('프로젝트 형식을 확인하세요.');
  const ids=new Set();for(const object of scene.objects){if(!/^o[1-9]\d{0,5}$/.test(object.id)||ids.has(object.id)||Number(object.id.slice(1))>=scene.nextId)throw Error('객체 ID를 확인하세요.');ids.add(object.id);validateObject({...object,version:1,unit:'m'});}
  if(!ids.has(scene.activeId))throw Error('선택 객체가 없습니다.');
  const t=totals(scene);if(t.vertices>MAX_VERTICES||t.triangles>MAX_TRIANGLES)throw Error('프로젝트 전체 한도: 131072 정점·262144 삼각형입니다.');return scene;
}
export function encode(scene){validate(scene);return JSON.stringify({...scene,objects:scene.objects.map(o=>({...o,mesh:{positions:Array.from(o.mesh.positions),indices:Array.from(o.mesh.indices)}}))});}
export function parse(raw){
  if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>24000000)throw Error('24MB 이하 JSON을 선택하세요.');const data=JSON.parse(raw);
  const legacy=data?.version===1;
  const records=legacy?[data]:data?.objects;
  if(!Array.isArray(records)||!records.length||records.length>MAX_OBJECTS)throw Error('객체는 1–8개입니다.');
  let vertices=0,triangles=0;for(const o of records){const m=o?.mesh;if(!Array.isArray(m?.positions)||!Array.isArray(m?.indices)||m.positions.length%3||m.indices.length%3)throw Error('메시 배열을 확인하세요.');vertices+=m.positions.length/3;triangles+=m.indices.length/3;if(vertices>MAX_VERTICES||triangles>MAX_TRIANGLES)throw Error('메시 전체 한도를 넘었습니다.');if(!m.positions.every(x=>finite(x,-100,100))||!m.indices.every(x=>Number.isSafeInteger(x)&&x>=0&&x<MAX_VERTICES))throw Error('잘못된 메시 좌표/인덱스입니다.');}
  const objects=records.map((o,i)=>({version:1,unit:'m',id:legacy?'o1':o.id,title:o.title,transform:o.transform,material:o.material,mesh:{positions:new Float32Array(o.mesh.positions),indices:new Uint32Array(o.mesh.indices)}}));
  return validate(legacy?{version:2,unit:'m',title:data.title,activeId:'o1',nextId:2,objects}:{version:2,unit:data.unit,title:data.title,activeId:data.activeId,nextId:data.nextId,objects});
}
export function transformPoint(point,transform){
  let [x,y,z]=point.map((v,i)=>v*transform.scale[i]);const [rx,ry,rz]=transform.rotation.map(v=>v*Math.PI/180);
  [x,y]=[x*Math.cos(rz)-y*Math.sin(rz),x*Math.sin(rz)+y*Math.cos(rz)];[x,z]=[x*Math.cos(ry)+z*Math.sin(ry),-x*Math.sin(ry)+z*Math.cos(ry)];[y,z]=[y*Math.cos(rx)-z*Math.sin(rx),y*Math.sin(rx)+z*Math.cos(rx)];return [x+transform.position[0],y+transform.position[1],z+transform.position[2]];
}
export function bake(object){const a=object.mesh.positions,positions=new Float32Array(a.length);for(let i=0;i<a.length;i+=3){const point=transformPoint(Array.from(a.subarray(i,i+3)),object.transform);if(!point.every(v=>finite(v,-100,100)))throw Error('이 작업의 실제 좌표는 ±100m 안이어야 합니다.');positions.set(point,i);}return {positions,indices:object.mesh.indices.slice()};}
export function bounds(object){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<object.mesh.positions.length;i+=3){const p=transformPoint(Array.from(object.mesh.positions.subarray(i,i+3)),object.transform);for(let k=0;k<3;k++){min[k]=Math.min(min[k],p[k]);max[k]=Math.max(max[k],p[k]);}}return {min,max,size:max.map((v,i)=>v-min[i]),center:max.map((v,i)=>(v+min[i])/2)};}
export function signedVolume(mesh){const p=mesh.positions,b=mesh.indices;let sum=0;for(let i=0;i<b.length;i+=3){const a=b[i]*3,c=b[i+1]*3,d=b[i+2]*3;sum+=p[a]*(p[c+1]*p[d+2]-p[c+2]*p[d+1])+p[a+1]*(p[c+2]*p[d]-p[c]*p[d+2])+p[a+2]*(p[c]*p[d+1]-p[c+1]*p[d]);}return sum/6;}
export function closed(mesh){const edges=new Map();const b=mesh.indices;for(let i=0;i<b.length;i+=3)for(const [a,c]of [[b[i],b[i+1]],[b[i+1],b[i+2]],[b[i+2],b[i]]]){const key=Math.min(a,c)+':'+Math.max(a,c),record=edges.get(key)??{count:0,direction:0};record.count++;record.direction+=a<c?1:-1;edges.set(key,record);}return [...edges.values()].every(e=>e.count===2&&e.direction===0);}
export function volume(object){return Math.abs(signedVolume(object.mesh))*object.transform.scale.reduce((v,x)=>v*x,1);}
export function addObject(scene,shape='sphere',fine=false,size=1){
  if(scene.objects.length>=MAX_OBJECTS)throw Error('최대 8개 객체까지 만들 수 있습니다.');const q=project(shape,fine,size).objects[0],t=totals(scene);if(t.vertices+q.mesh.positions.length/3>MAX_VERTICES||t.triangles+q.mesh.indices.length/3>MAX_TRIANGLES)throw Error('전체 메시 한도입니다. 낮은 해상도로 추가하세요.');q.id='o'+scene.nextId++;q.title=`새 ${shape==='sphere'?'구':'돌'} ${q.id.slice(1)}`;const box=bounds(active(scene));q.transform.position=[Math.min(99,box.max[0]+size*.65),box.center[1],box.center[2]];scene.objects.push(q);scene.activeId=q.id;return validate(scene);
}
export function duplicate(scene){const original=active(scene),t=totals(scene);if(scene.objects.length>=MAX_OBJECTS||t.vertices+original.mesh.positions.length/3>MAX_VERTICES||t.triangles+original.mesh.indices.length/3>MAX_TRIANGLES)throw Error('복사하면 전체 객체/메시 한도를 넘습니다.');const q=structuredClone(original);q.id='o'+scene.nextId++;q.title=(q.title+' 복사').slice(0,160);q.transform.position[0]=Math.min(100,q.transform.position[0]+bounds(q).size[0]+.15);scene.objects.push(q);scene.activeId=q.id;return validate(scene);}
export function removeObject(scene,id=scene.activeId){if(scene.objects.length===1)throw Error('마지막 객체는 삭제할 수 없습니다. 새 프로젝트를 사용하세요.');const i=scene.objects.findIndex(o=>o.id===id);if(i<0)throw Error('객체가 없습니다.');scene.objects.splice(i,1);if(scene.activeId===id)scene.activeId=scene.objects[0].id;return validate(scene);}
export function resizeVolume(scene,factor){if(!finite(factor,.000001,1000000))throw Error('부피 배율은 0.000001–1000000입니다.');const object=active(scene),scale=Math.cbrt(factor);object.transform.scale=object.transform.scale.map(v=>v*scale);return validate(scene);}
export function mergeObjects(scene,ids){
  const selected=scene.objects.filter(o=>ids.includes(o.id));if(selected.length<2)throw Error('합칠 객체를 두 개 이상 체크하세요.');let positions=[],indices=[],offset=0;
  for(const object of selected){const mesh=bake(object);for(const x of mesh.positions)positions.push(x);for(const x of mesh.indices)indices.push(x+offset);offset+=mesh.positions.length/3;}
  const first=selected[0],merged={...first,id:'o'+scene.nextId++,title:'합친 조각',transform:identity(),mesh:{positions:new Float32Array(positions),indices:new Uint32Array(indices)}};scene.objects=scene.objects.filter(o=>!ids.includes(o.id));scene.objects.push(merged);scene.activeId=merged.id;return validate(scene);
}
export function acceptSplit(scene,meshes){if(scene.objects.length>=MAX_OBJECTS)throw Error('분할할 객체 자리가 없습니다.');if(!Array.isArray(meshes)||meshes.length!==2)throw Error('분할 결과를 확인하세요.');const original=active(scene),pieces=meshes.map((mesh,i)=>({...original,material:{...original.material},id:'o'+scene.nextId++,title:(original.title+` · ${i?'B':'A'}`).slice(0,160),transform:identity(),mesh}));scene.objects=scene.objects.filter(o=>o.id!==original.id).concat(pieces);scene.activeId=pieces[0].id;return validate(scene);}
export class History {
  constructor(){this.back=[];this.forward=[];}
  trim(){while(this.back.length+this.forward.length>20||[...this.back,...this.forward].reduce((s,p)=>s+totals(p).bytes+2048,0)>MAX_HISTORY_BYTES){if(this.back.length)this.back.shift();else this.forward.shift();}}
  push(p){this.back.push(structuredClone(p));this.forward=[];this.trim();}
  undo(p){if(!this.back.length)return p;this.forward.push(structuredClone(p));const q=this.back.pop();this.trim();return q;}
  redo(p){if(!this.forward.length)return p;this.back.push(structuredClone(p));const q=this.forward.pop();this.trim();return q;}
}
