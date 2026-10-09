import {
  KEY,
  project,
  validate,
  encode,
  parse,
  adjacency,
  sculpt,
  subdivide,
  History,
} from "./mesh-model.js";
import { Viewport } from "./viewport.js";
const $ = (id) => document.getElementById(id),
  status = (s) => ($("status").textContent = s),
  history = new History();
let p = project("pebble", innerWidth > 680),
  blocked = false,
  dirty = false,
  view,
  neighbors,
  mode = "add",
  brush = { radius: 0.25, strength: 0.04, mirror: false },
  stroke = null,
  alt = false,
  exporting = false;
try {
  const raw = localStorage.getItem(KEY);
  if (raw) p = parse(raw);
} catch {
  blocked = true;
  status("기존 저장 내용을 보존합니다. 파일을 열거나 새 조각을 만들어 주세요.");
}
function save() {
  dirty = true;
  if (blocked) {
    $("storage-status").textContent = "기존 저장 보존";
    return;
  }
  try {
    const raw = encode(p);
    if (raw.length > 3500000) throw Error();
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
  neighbors = adjacency(p.mesh);
  if (view) {
    view.setProject(p);
    view.mesh.material.wireframe = $("wire").checked;
    view.render();
  }
  render();
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
    " 삼각형";
  $("undo").disabled = !history.back.length;
  $("redo").disabled = !history.forward.length;
  $("refine").disabled = (p.mesh.indices.length / 3) * 4 > 262144;
  $("refine-hint").textContent = $("refine").disabled
    ? "최대 해상도에 도달했습니다."
    : "기존 형태와 조각을 그대로 보존합니다.";
  for (const group of ["position", "rotation", "scale"])
    for (let i = 0; i < 3; i++) $(group + i).value = p.transform[group][i];
}
function change(fn) {
  if (stroke) endStroke();
  const before = structuredClone(p);
  try {
    fn();
    validate(p);
    history.push(before);
    view.project = p;
    view.updateTransform();
    save();
    render();
  } catch (e) {
    p = before;
    rebuild();
    status(e.message);
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
    input.min = group === "scale" ? ".001" : "-100";
    input.max = "100";
    input.setAttribute("aria-label", label + " " + "XYZ"[i]);
    input.onchange = () =>
      change(() => (p.transform[group][i] = Number(input.value)));
    l.append(input);
    row.append(l);
  }
  $("transforms").append(row);
}
try {
  view = new Viewport($("viewport"), p);
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
  view.controls.mouseButtons.LEFT = mode === "view" || alt ? 0 : null;
  view.controls.mouseButtons.RIGHT = 0;
  view.controls.touches.ONE = mode === "view" ? 0 : null;
  view.canvas.style.cursor = mode === "view" || alt ? "grab" : "crosshair";
}
function tool(value) {
  mode = value;
  const names = {
    view: "보기",
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
    view.mesh.material.wireframe = $("wire").checked;
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
  if (!hit) return;
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
      validate(p);
      history.push(s.before);
      save();
      render();
      status("조각이 반영되었습니다.");
    } catch (e) {
      p = s.before;
      rebuild();
      status(e.message);
    }
  }
  controls();
}
if (view) {
  view.canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || mode === "view" || alt || exporting) return;
    const hit = view.pick(e.clientX, e.clientY);
    if (!hit) return;
    e.preventDefault();
    view.controls.enabled = false;
    stroke = {
      before: structuredClone(p),
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
    } else if (mode !== "view" && !alt)
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
  endStroke();
  p = history.undo(p);
  rebuild();
  save();
};
$("redo").onclick = () => {
  endStroke();
  p = history.redo(p);
  rebuild();
  save();
};
$("refine").onclick = () => {
  const before = structuredClone(p);
  try {
    endStroke();
    p.mesh = subdivide(p.mesh);
    validate(p);
    history.push(before);
    rebuild();
    save();
    status("기존 형태를 보존하고 해상도를 높였습니다.");
  } catch (e) {
    p = before;
    rebuild();
    status(e.message);
  }
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
      new Blob([encode(p)], { type: "application/json" }),
      "clay-project.json",
    );
    status("프로젝트 파일 저장을 요청했습니다.");
  } catch (e) {
    status(e.message);
  }
};
function replace(q) {
  endStroke();
  p = validate(q);
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
    replace(project($("shape").value, $("quality").value === "medium"));
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
    if (exporting || !view) return;
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
render();
controls();
if (!blocked) save();
