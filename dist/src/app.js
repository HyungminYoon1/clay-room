import {
  KEY,
  adjacency,
  sculpt,
  subdivide,
} from "./mesh-model.js";
import {project,active,validate,encode,parse,totals,bounds,volume,closed,addObject,duplicate,removeObject,resizeVolume,mergeObjects,acceptSplit,History} from './scene-model.js';
import {normalVector} from './cut-model.js';
import { Viewport } from "./viewport.js";
const $ = (id) => document.getElementById(id),
  status = (s) => ($("status").textContent = s),
  history = new History();
let scene = project("pebble", innerWidth > 680),p=active(scene),
  blocked = false,
  dirty = false,
  view,
  neighbors,
  mode = "add",
  brush = { radius: 0.25, strength: 0.04, mirror: false },
  stroke = null,
  alt = false,
  exporting = false,job=null;
const marked=new Set();
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {scene = parse(raw);p=active(scene);}
} catch {
  blocked = true;
  status("기존 저장 내용을 보존합니다. 파일을 열거나 새 조각을 만들어 주세요.");
}
marked.add(p.id);
function save() {
  dirty = true;
  if (blocked) {
    $("storage-status").textContent = "기존 저장 보존";
    return;
  }
  try {
    const raw = encode(scene);
    if (new TextEncoder().encode(raw).byteLength > 3500000) throw Error();
    localStorage.setItem(KEY, raw);
    if (localStorage.getItem(KEY) !== raw) throw Error();
    dirty = false;
    $("storage-status").textContent = "자동 저장됨";
  } catch {
    $("storage-status").textContent = "파일 저장 필요";
    status("이 모델은 프로젝트 파일로 저장해 주세요.");
  }
}
function rebuild() {
  p=active(scene);
  neighbors = adjacency(p.mesh);
  if (view) {
    view.setProject(scene);
    for(const mesh of view.objectMeshes.values())mesh.material.wireframe = $("wire").checked;
    view.render();
  }
  render();
  if(view)previewPlane();
}
function render() {
  $("title").value = p.title;
  $("color").value = p.material.color;
  $("roughness").value = p.material.roughness;
  $("metalness").value = p.material.metalness;
  $("mesh-count").textContent =
    (p.mesh.positions.length / 3).toLocaleString() +
    " 정점 · " +
    (p.mesh.indices.length / 3).toLocaleString() +
    " 삼각형 · 선택 객체";
  renderObjects();
  $("undo").disabled = !history.back.length;
  $("redo").disabled = !history.forward.length;
  const total=totals(scene),edges=neighbors?.reduce((sum,a)=>sum+a.length,0)/2;
  $("refine").disabled = total.triangles+p.mesh.indices.length>262144||total.vertices+(edges??Infinity)>131072;
  $("refine-hint").textContent = $("refine").disabled
    ? "최대 해상도에 도달했습니다."
    : "기존 형태와 조각을 그대로 보존합니다.";
  for (const group of ["position", "rotation", "scale"])
    for (let i = 0; i < 3; i++) $(group + i).value = p.transform[group][i];
  renderCamera();
}
function change(fn) {
  if(job||exporting){status('진행 중인 작업을 마친 뒤 편집하세요.');return false;}
  if (stroke) endStroke();
  const before = structuredClone(scene);
  try {
    fn();
    validate(scene);
    history.push(before);
    rebuild();
    save();
    render();
    return true;
  } catch (e) {
    scene = before;
    rebuild();
    status(e.message);
    return false;
  }
}
for (const [group, label] of [
  ["position", "위치"],
  ["rotation", "각도"],
  ["scale", "크기"],
]) {
  const row = document.createElement("div");
  row.className = "transform-row";
  const name = document.createElement("span");
  name.className = "row-label";
  name.textContent = label;
  row.append(name);
  for (let i = 0; i < 3; i++) {
    const l = document.createElement("label");
    l.textContent = "XYZ"[i];
    const input = document.createElement("input");
    input.type = "number";
    input.id = group + i;
    input.step = group === "rotation" ? ".1" : ".0001";
    input.min = group === "scale" ? ".001" : group==='rotation'?'-3600':"-100";
    input.max = group==='rotation'?'3600':"100";
    input.setAttribute("aria-label", label + " " + "XYZ"[i]);
    input.onchange = () =>
      change(() => (p.transform[group][i] = Number(input.value)));
    l.append(input);
    row.append(l);
  }
  $("transforms").append(row);
}
try {
  view = new Viewport($("viewport"), scene);
  view.controls.addEventListener('change',renderCamera);
  neighbors = adjacency(p.mesh);
} catch {
  $("webgl-error").hidden = false;
  status("WebGL 2를 사용할 수 없습니다.");
  document
    .querySelectorAll(".tools button,.export button,#refine")
    .forEach((b) => (b.disabled = true));
}
function controls() {
  if (!view) return;
  view.controls.enableRotate = true;
  view.controls.mouseButtons.LEFT = mode==='pan'?2:mode === "view" || alt ? 0 : null;
  view.controls.mouseButtons.RIGHT = 0;
  view.controls.touches.ONE = mode==='pan'?1:mode === "view" ? 0 : null;
  view.canvas.style.cursor = mode === "view"||mode==='pan' || alt ? "grab" : mode==='select'?'pointer':"crosshair";
}
function tool(value) {
  mode = value;
  const names = {
    view: "보기",
    pan:'중심 이동',select:'객체 선택',
    add: "밀기 브러시",
    subtract: "깎기 브러시",
    smooth: "다듬기 브러시",
    flatten: "평탄화 브러시",
    crease: "주름 브러시",
  };
  $("tool-name").textContent = names[value];
  document
    .querySelectorAll("[data-tool]")
    .forEach((b) => b.setAttribute("aria-pressed", b.dataset.tool === mode));
  controls();
}
document
  .querySelectorAll("[data-tool]")
  .forEach((b) => (b.onclick = () => tool(b.dataset.tool)));
document
  .querySelectorAll("[data-view]")
  .forEach((b) => (b.onclick = () => view?.view(b.dataset.view)));
for (const id of ["radius", "strength"]) {
  const assign = (value) => {
    const n = Number(value),
      min = id === "radius" ? 0.01 : 0.0001,
      max = id === "radius" ? 2 : 0.2;
    if (!Number.isFinite(n) || n < min || n > max) {
      $(id).value = brush[id];
      status("브러시 범위를 확인하세요.");
      return;
    }
    brush[id] = n;
    $(id).value = n;
    $(id + "-slider").value = n;
  };
  $(id).onchange = () => assign($(id).value);
  $(id + "-slider").oninput = () => assign($(id + "-slider").value);
}
$("mirror").onchange = () => (brush.mirror = $("mirror").checked);
$("wire").onchange = () => {
  if (view) {
    for(const mesh of view.objectMeshes.values())mesh.material.wireframe = $("wire").checked;
    view.render();
  }
};
$("ground").onchange = () => {
  if (view) {
    view.grid.visible = $("ground").checked;
    view.render();
  }
};
$("title").onchange = () => change(() => (p.title = $("title").value));
for (const id of ["color", "roughness", "metalness"])
  $(id).onchange = () =>
    change(
      () =>
        (p.material[id] = id === "color" ? $(id).value : Number($(id).value)),
    );
document.querySelectorAll("[data-color]").forEach((b) => {
  b.style.background = b.dataset.color;
  b.onclick = () => change(() => (p.material.color = b.dataset.color));
});
function stamp(e) {
  if (!stroke || !view) return;
  const hit = view.pick(e.clientX, e.clientY);
  if (!hit||hit.objectId!==p.id) return;
  const pressure = e.pointerType === "pen" ? Math.max(0.05, e.pressure) : 1,
    normal = stroke.normal;
  const current = e.shiftKey ? "smooth" : mode;
  stroke.changed += sculpt(
    p.mesh,
    neighbors,
    hit.point,
    current === "flatten" ? normal : hit.normal,
    { ...brush, mode: current, pressure },
  );
  view.refresh();
  view.cursor(hit, brush.radius);
}
function endStroke() {
  if (!stroke) return;
  const s = stroke;
  stroke = null;
  if (s.changed) {
    try {
      validate(scene);
      history.push(s.before);
      save();
      render();
      status("조각이 반영되었습니다.");
    } catch (e) {
      scene = s.before;
      rebuild();
      status(e.message);
    }
  }
  controls();
}
if (view) {
  view.canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || mode === "view"||mode==='pan' || alt || exporting||job) return;
    const hit = view.pick(e.clientX, e.clientY);
    if (!hit) return;
    if(hit.objectId!==p.id)selectObject(hit.objectId);
    if(mode==='select')return;
    e.preventDefault();
    view.controls.enabled = false;
    stroke = {
      before: structuredClone(scene),
      normal: hit.normal,
      changed: 0,
      lastX: e.clientX,
      lastY: e.clientY,
    };
    view.canvas.setPointerCapture(e.pointerId);
    stamp(e);
  });
  view.canvas.addEventListener("pointermove", (e) => {
    if (stroke) {
      if (Math.hypot(e.clientX - stroke.lastX, e.clientY - stroke.lastY) < 2)
        return;
      stroke.lastX = e.clientX;
      stroke.lastY = e.clientY;
      stamp(e);
    } else if (mode !== "view"&&mode!=='pan'&&mode!=='select' && !alt&&!job)
      view.cursor(view.pick(e.clientX, e.clientY), brush.radius);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    view.canvas.addEventListener(type, () => {
      endStroke();
      view.controls.enabled = true;
    });
  view.canvas.addEventListener("pointerleave", () => {
    if (!stroke) view.cursor(null, brush.radius);
  });
  view.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  view.canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    endStroke();
    status(
      "그래픽 연결이 끊겼습니다. 모델을 JSON으로 저장하고 다시 열어 주세요.",
    );
  });
}
$("undo").onclick = () => {
  if(job||exporting)return;
  endStroke();
  scene = history.undo(scene);
  rebuild();
  save();
};
$("redo").onclick = () => {
  if(job||exporting)return;
  endStroke();
  scene = history.redo(scene);
  rebuild();
  save();
};
$("refine").onclick = () => {
  if(change(()=>{p.mesh=subdivide(p.mesh);}))status('기존 형태를 보존하고 해상도를 높였습니다.');
};
function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
$("save").onclick = () => {
  try {
    download(
      new Blob([encode(scene)], { type: "application/json" }),
      "clay-project.json",
    );
    status("프로젝트 파일 저장을 요청했습니다.");
  } catch (e) {
    status(e.message);
  }
};
function replace(q) {
  if(job||exporting)return;
  endStroke();
  scene = validate(q);p=active(scene);marked.clear();marked.add(p.id);
  blocked = false;
  history.back = [];
  history.forward = [];
  rebuild();
  view?.view("isometric");
  save();
}
$("new").onclick = () => $("new-dialog").showModal();
$("new-dialog").addEventListener("close", () => {
  if ($("new-dialog").returnValue === "create")
    try{replace(project($("shape").value, $("quality").value === "medium",Number($('initial-size').value)));}catch(e){status(e.message);}
});
$("open").onchange = async () => {
  const file = $("open").files[0];
  if (!file) return;
  try {
    if (file.size > 24000000) throw Error("24MB 이하 프로젝트를 선택하세요.");
    const q = parse(await file.text());
    if (confirm("현재 조각을 불러온 파일로 바꿀까요?")) replace(q);
  } catch (e) {
    status(e.message);
  } finally {
    $("open").value = "";
  }
};
for (const kind of ["glb", "stl", "png"])
  $(kind).onclick = async () => {
    if (exporting || !view||job) return;
    endStroke();
    exporting = true;
    document
      .querySelectorAll(".export button")
      .forEach((b) => (b.disabled = true));
    status("파일을 만드는 중…");
    try {
      if (kind === "glb")
        download(
          new Blob([await view.glb()], { type: "model/gltf-binary" }),
          "clay.glb",
        );
      if (kind === "stl")
        download(new Blob([view.stl()], { type: "model/stl" }), "clay-mm.stl");
      if (kind === "png")
        download(
          await view.png(Number($("png-size").value)),
          "clay-" + $("png-size").value + ".png",
        );
      status("파일 저장을 요청했습니다.");
    } catch (e) {
      status(e.message);
    } finally {
      exporting = false;
      document
        .querySelectorAll(".export button")
        .forEach((b) => (b.disabled = false));
    }
  };
document.addEventListener("keydown", (e) => {
  if (e.target.closest("input,select,textarea")) return;
  if (e.key === "Alt") {
    alt = true;
    controls();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    $(e.shiftKey ? "redo" : "undo").click();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    $("save").click();
  }
});
document.addEventListener("keyup", (e) => {
  if (e.key === "Alt") {
    alt = false;
    controls();
  }
});
window.addEventListener("blur", () => {
  alt = false;
  endStroke();
  if (view) view.controls.enabled = true;
  controls();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) endStroke();
});
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
window.addEventListener("storage", (e) => {
  if (e.key === KEY) {
    blocked = true;
    status(
      "다른 탭에서 파일이 변경되었습니다. 현재 조각은 프로젝트 파일로 보관하세요.",
    );
  }
});
function selectObject(id){if(job||stroke||exporting)return;if(!scene.objects.some(o=>o.id===id))return;scene.activeId=id;p=active(scene);neighbors=adjacency(p.mesh);view?.setActiveObject(id);render();if(view)previewPlane();}
function renderObjects(){
  const t=totals(scene);$('object-count').textContent=`${scene.objects.length} / 8개 · 전체 ${t.vertices.toLocaleString()} 정점 / 131072`;
  for(const id of marked)if(!scene.objects.some(o=>o.id===id))marked.delete(id);if(!marked.size)marked.add(p.id);
  const list=$('object-list');list.replaceChildren();for(const object of scene.objects){const row=document.createElement('div');row.className='object-row';const check=document.createElement('input');check.type='checkbox';check.checked=marked.has(object.id);check.setAttribute('aria-label',object.title+' 병합 선택');check.onchange=()=>{if(check.checked)marked.add(object.id);else marked.delete(object.id);};const b=document.createElement('button');b.type='button';b.textContent=object.title;b.setAttribute('aria-pressed',object.id===p.id);b.onclick=()=>selectObject(object.id);row.append(check,b);list.append(row);}
  const box=bounds(p);$('object-size').textContent=`선택 크기 ${box.size.map(x=>x.toPrecision(5)).join(' × ')} m`;
  $('object-volume').textContent=closed(p.mesh)?`닫힌 표면 부피 ${volume(p).toPrecision(6)} m³`:'열린 표면 · 부피 비율 분할 불가';
  $('copy-object').disabled=scene.objects.length>=8;$('delete-object').disabled=scene.objects.length===1;
}
function renderCamera(){if(!view)return;view.controls.target.toArray().forEach((value,i)=>{const input=$('camera'+i);if(input&&document.activeElement!==input)input.value=Number(value.toFixed(5));});}
function planeParameters(){const normal=normalVector([0,1,2].map(i=>Number($('plane'+i).value))),offset=Number($('plane-offset').value);if(!Number.isFinite(offset)||Math.abs(offset)>100)throw Error('평면 위치는 ±100m입니다.');return {normal,offset};}
function previewPlane(){try{const plane=planeParameters();view?.cutPlane(plane.normal,plane.offset,$('show-plane').checked);}catch(e){status(e.message);}}
for(const id of ['plane0','plane1','plane2','plane-offset','show-plane'])$(id).onchange=previewPlane;
$('plane-preset').onchange=()=>{const axis=Number($('plane-preset').value);[0,1,2].forEach(i=>$('plane'+i).value=i===axis?1:0);$('plane-offset').value=bounds(p).center[axis];previewPlane();};
$('plane-center').onclick=()=>{try{const {normal}=planeParameters();$('plane-offset').value=bounds(p).center.reduce((s,x,i)=>s+x*normal[i],0);previewPlane();}catch(e){status(e.message);}};
$('add-object').onclick=()=>$('add-dialog').showModal();
$('add-dialog').addEventListener('close',()=>{if($('add-dialog').returnValue!=='add')return;if(change(()=>{addObject(scene,$('add-shape').value,$('add-quality').value==='medium',Number($('add-size').value));p=active(scene);marked.add(p.id);})){view?.view('isometric');status('새 객체를 추가했습니다.');}});
$('copy-object').onclick=()=>{if(change(()=>{duplicate(scene);p=active(scene);marked.add(p.id);})){view?.view('isometric');status('복사본을 추가했습니다.');}};
$('delete-object').onclick=()=>{if(confirm('선택한 객체를 삭제할까요? 실행 취소로 복구할 수 있습니다.'))change(()=>removeObject(scene));};
$('merge-objects').onclick=()=>{if(change(()=>{mergeObjects(scene,[...marked]);marked.clear();marked.add(scene.activeId);})){status('한 객체로 묶었습니다. 겹친 내부 면은 그대로 남습니다.');}};
$('volume-apply').onclick=()=>{if(change(()=>resizeVolume(scene,Number($('volume-factor').value))))status('세 축의 길이를 같은 비율로 바꾸었습니다.');};
for(let i=0;i<3;i++)$('camera'+i).onchange=()=>{try{view?.target([0,1,2].map(k=>Number($('camera'+k).value)));}catch(e){status(e.message);renderCamera();}};
document.querySelectorAll('[data-pan]').forEach(b=>b.onclick=()=>view?.pan(...b.dataset.pan.split(',').map(Number)));
$('focus-object').onclick=()=>view?.view('isometric',false);$('fit-scene').onclick=()=>view?.view('isometric',true);
function finishJob(message){if(!job)return;clearTimeout(job.timer);job.worker.terminate();job=null;$('cancel-cut').hidden=true;status(message);}
function runCut(byRatio){
  if(job||exporting||!view)return;endStroke();if(scene.objects.length>=8){status('분할하려면 객체 자리가 한 개 필요합니다.');return;}
  try{const {normal,offset}=planeParameters(),ratio=byRatio?Number($('split-ratio').value)/100:null;if(ratio!==null&&(!Number.isFinite(ratio)||ratio<.01||ratio>.99))throw Error('A 부피 비율은 1–99%입니다.');
    const worker=new Worker(new URL('./geometry-worker.js',import.meta.url),{type:'module'});job={worker,timer:setTimeout(()=>finishJob('분할 시간이 길어 취소했습니다. 더 단순한 메시를 사용하세요.'),20000)};$('cancel-cut').hidden=false;status('단면과 부피를 계산하는 중… 취소할 수 있습니다.');
    worker.onmessage=event=>{const result=event.data;if(!result.ok){finishJob(result.error);return;}try{const before=structuredClone(scene),next=structuredClone(scene);acceptSplit(next,result.pieces);scene=next;p=active(scene);history.push(before);finishJob(`분할 완료 · A ${(result.ratio*100).toFixed(3)}% / B ${((1-result.ratio)*100).toFixed(3)}%`);$('plane-offset').value=result.offset;marked.clear();for(const o of scene.objects.slice(-2))marked.add(o.id);rebuild();save();previewPlane();}catch(e){finishJob(e.message);}};
    worker.onerror=()=>finishJob('분할 계산을 실행하지 못했습니다. 원본은 유지됩니다.');worker.postMessage({object:p,normal,offset,ratio});
  }catch(e){status(e.message);}
}
$('cut-plane').onclick=()=>runCut(false);$('cut-ratio').onclick=()=>runCut(true);$('cancel-cut').onclick=()=>finishJob('분할을 취소했습니다. 원본은 유지됩니다.');
render();
controls();
