export const SELECTION_DEFAULTS=Object.freeze({mode:'gesture',width:.75,opacity:.35});
export const BRUSH_TOOLS=Object.freeze(['add','subtract','smooth','flatten','crease']);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const vector=a=>Array.isArray(a)&&a.length===3&&a.every(finite);
export function direction(key){
  const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1],a:[-1,0],d:[1,0],w:[0,1],s:[0,-1]};
  return Object.hasOwn(directions,key)?directions[key]:null;
}
export function motionCommand(event,{mode='select',editable=false,dialog=false,focused=true}={}){
  if(editable||dialog||!focused||event.isComposing||event.ctrlKey||event.metaKey||event.altKey)return null;
  const key=event.key.length===1?event.key.toLowerCase():event.key,delta=direction(key);
  if(!delta)return null;
  return {kind:mode==='move'?'object':'camera',key,dx:delta[0],dy:delta[1],fine:!!event.shiftKey};
}
export function objectDelta(dx,dy,axis,step,right,up){
  if(!finite(dx)||!finite(dy)||!finite(step)||step<.0001||step>10||!['screen','x','y','z'].includes(axis))throw Error('이동 간격은 0.0001–10m입니다.');
  if(axis!=='screen'){const delta=[0,0,0];delta['xyz'.indexOf(axis)]=(dx||dy)*step;return delta;}
  if(!vector(right)||!vector(up))throw Error('화면 방향을 확인하세요.');
  return right.map((value,i)=>(value*dx+up[i]*dy)*step);
}
export function translate(position,delta){
  if(!vector(position)||!position.every(v=>Math.abs(v)<=100)||!vector(delta))throw Error('이동 좌표를 확인하세요.');
  let fraction=1;
  for(let i=0;i<3;i++)if(delta[i]!==0){const limit=delta[i]>0?100:-100;fraction=Math.min(fraction,Math.max(0,(limit-position[i])/delta[i]));}
  return position.map((v,i)=>Math.max(-100,Math.min(100,v+delta[i]*fraction)));
}
export function validateSelection(value){
  if(!value||!['gesture','always','hidden'].includes(value.mode)||!finite(value.width)||value.width<.25||value.width>3||!finite(value.opacity)||value.opacity<.05||value.opacity>1)throw Error('선택 표시 범위를 확인하세요.');
  return {...value};
}
export function selectionVisible(prefs,active,until,now,exporting=false){
  return !exporting&&prefs.mode!=='hidden'&&(prefs.mode==='always'||active||now<until);
}
export function boxEdges(min,max){
  if(!vector(min)||!vector(max)||min.some((v,i)=>v>max[i]))throw Error('선택 경계를 확인하세요.');
  const corner=i=>min.map((v,k)=>i&(1<<k)?max[k]:v),edges=[];
  for(let i=0;i<8;i++)for(let axis=0;axis<3;axis++)if(!(i&(1<<axis)))edges.push(...corner(i),...corner(i|(1<<axis)));
  return edges;
}
