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
const holdDistance=age=>{
  const seconds=Math.max(0,(age-100)/1000),ramp=.15;
  if(seconds>=ramp)return 20*(seconds-ramp/2);
  const u=seconds/ramp;return 20*ramp*(u**3-u**4/2);
};
export class SmoothKeys{
  constructor(){this.clear();}
  get active(){return this.keys.size>0||this.target.some((v,i)=>v!==this.applied[i]);}
  has(key){return this.keys.has(key);}
  setFine(value){this.fine=!!value;}
  press(command,now){
    if(!finite(now)||now<0||!direction(command.key))throw Error('이동 입력을 확인하세요.');
    this.setFine(command.fine);if(this.has(command.key))return false;
    if(!this.active)this.last=now;
    if(!this.keys.size)this.holdAge=0;
    const delta=direction(command.key),factor=command.fine ? .1 : 1;
    this.keys.set(command.key,delta);this.target=this.target.map((v,i)=>v+delta[i]*factor);this.releasedAge=0;return true;
  }
  release(key){this.keys.delete(key);if(!this.keys.size)this.releasedAge=0;}
  tick(now){
    if(!this.active)return [0,0];
    if(!finite(now)||now<0)throw Error('이동 시간을 확인하세요.');
    const dt=Math.min(50,Math.max(0,now-this.last));this.last=Math.max(now,this.last);
    if(this.keys.size){
      const direction=[0,0];for(const delta of this.keys.values())for(let i=0;i<2;i++)direction[i]+=delta[i];
      const length=Math.hypot(...direction),amount=(holdDistance(this.holdAge+dt)-holdDistance(this.holdAge))*(this.fine ? .1 : 1);this.holdAge+=dt;
      if(length)this.target=this.target.map((v,i)=>v+direction[i]/length*amount);
    }else this.releasedAge+=dt;
    const blend=-Math.expm1(-dt/40),delta=this.target.map((v,i)=>(v-this.applied[i])*blend);this.applied=this.applied.map((v,i)=>v+delta[i]);
    if(!this.keys.size&&(this.releasedAge>=250||Math.hypot(...this.target.map((v,i)=>v-this.applied[i]))<1e-5)){
      for(let i=0;i<2;i++)delta[i]+=this.target[i]-this.applied[i];this.clear();
    }
    return delta;
  }
  finish(){const delta=this.target.map((v,i)=>v-this.applied[i]);this.clear();return delta;}
  clear(){this.keys=new Map();this.target=[0,0];this.applied=[0,0];this.last=0;this.holdAge=0;this.releasedAge=0;this.fine=false;}
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
