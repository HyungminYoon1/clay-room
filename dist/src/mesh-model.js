export const KEY = "clay-room-project-v1",
  MAX_VERTICES = 131072,
  MAX_TRIANGLES = 262144;
const bounds = (v, min, max) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
export function sphere(lon = 128, lat = 64, shape = "sphere") {
  if (
    !Number.isInteger(lon) ||
    !Number.isInteger(lat) ||
    lon < 8 ||
    lat < 4 ||
    2 + lon * (lat - 1) > MAX_VERTICES
  )
    throw Error("메시 해상도 범위");
  const positions = [0, 1, 0],
    indices = [];
  for (let j = 1; j < lat; j++) {
    const phi = (Math.PI * j) / lat;
    for (let i = 0; i < lon; i++) {
      const theta = (2 * Math.PI * i) / lon,
        r =
          shape === "pebble"
            ? 1 + 0.14 * Math.sin(3 * theta + phi * 4) * Math.sin(phi) ** 2
            : 1;
      positions.push(
        Math.sin(phi) * Math.cos(theta) * r,
        Math.cos(phi) * (shape === "pebble" ? 1.18 : 1),
        Math.sin(phi) * Math.sin(theta) * r * (shape === "pebble" ? 0.78 : 1),
      );
    }
  }
  positions.push(0, shape === "pebble" ? -1.18 : -1, 0);
  if (shape === "pebble") positions[1] = 1.18;
  const ring = (j, i) => 1 + j * lon + ((i + lon) % lon),
    bottom = positions.length / 3 - 1;
  for (let i = 0; i < lon; i++) {
    indices.push(0, ring(0, i + 1), ring(0, i));
    for (let j = 0; j < lat - 2; j++) {
      const a = ring(j, i),
        b = ring(j, i + 1),
        c = ring(j + 1, i),
        d = ring(j + 1, i + 1);
      indices.push(a, b, c, b, d, c);
    }
    indices.push(ring(lat - 2, i), ring(lat - 2, i + 1), bottom);
  }
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  };
}
export function project(shape = "pebble", fine = true) {
  let mesh = sphere(128, 64, shape);
  if (fine) mesh = subdivide(mesh);
  return {
    version: 1,
    title: shape === "pebble" ? "바람이 깎은 돌" : "새 조각",
    unit: "m",
    mesh,
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    material: { color: "#b99072", roughness: 0.65, metalness: 0 },
  };
}
export function validate(p) {
  if (
    !p ||
    p.version !== 1 ||
    p.unit !== "m" ||
    typeof p.title !== "string" ||
    p.title.length > 160
  )
    throw Error("프로젝트 형식을 확인하세요.");
  const { positions: a, indices: b } = p.mesh ?? {};
  if (
    !(a instanceof Float32Array) ||
    !(b instanceof Uint32Array) ||
    a.length < 12 ||
    a.length % 3 ||
    a.length / 3 > MAX_VERTICES ||
    b.length < 12 ||
    b.length % 3 ||
    b.length / 3 > MAX_TRIANGLES
  )
    throw Error("메시 크기를 확인하세요.");
  for (const x of a)
    if (!bounds(x, -100, 100)) throw Error("유한한 좌표 범위를 벗어났습니다.");
  const used = new Uint8Array(a.length / 3);
  for (const i of b) {
    if (i >= used.length) throw Error("정점 인덱스가 잘못되었습니다.");
    used[i] = 1;
  }
  for (let i = 0; i < b.length; i += 3) {
    const v = b.slice(i, i + 3);
    if (new Set(v).size !== 3) throw Error("퇴화 삼각형");
    const ax = a[v[1] * 3] - a[v[0] * 3],
      ay = a[v[1] * 3 + 1] - a[v[0] * 3 + 1],
      az = a[v[1] * 3 + 2] - a[v[0] * 3 + 2],
      bx = a[v[2] * 3] - a[v[0] * 3],
      by = a[v[2] * 3 + 1] - a[v[0] * 3 + 1],
      bz = a[v[2] * 3 + 2] - a[v[0] * 3 + 2];
    if (
      Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) <
      1e-12
    )
      throw Error("면적이 없는 삼각형");
  }
  if (used.some((x) => !x)) throw Error("사용하지 않는 정점");
  for (const k of ["position", "rotation", "scale"]) {
    const x = p.transform?.[k];
    if (
      !Array.isArray(x) ||
      x.length !== 3 ||
      !x.every((v) =>
        bounds(v, k === "scale" ? 0.001 : -100, k === "scale" ? 100 : 100),
      )
    )
      throw Error("변환 범위");
  }
  if (
    !/^#[0-9a-f]{6}$/i.test(p.material?.color) ||
    !bounds(p.material.roughness, 0, 1) ||
    !bounds(p.material.metalness, 0, 1)
  )
    throw Error("재질 범위");
  return p;
}
export function encode(p) {
  validate(p);
  return JSON.stringify({
    ...p,
    mesh: {
      positions: Array.from(p.mesh.positions),
      indices: Array.from(p.mesh.indices),
    },
  });
}
export function parse(raw) {
  if (typeof raw !== "string" || raw.length > 24000000)
    throw Error("24MB 이하 JSON을 선택하세요.");
  const p = JSON.parse(raw),
    m = p?.mesh;
  if (
    !Array.isArray(m?.positions) ||
    !Array.isArray(m?.indices) ||
    m.positions.length > MAX_VERTICES * 3 ||
    m.indices.length > MAX_TRIANGLES * 3 ||
    !m.positions.every((x) => bounds(x, -100, 100)) ||
    !m.indices.every((x) => Number.isInteger(x) && x >= 0 && x < MAX_VERTICES)
  )
    throw Error("메시 데이터를 확인하세요.");
  p.mesh = {
    positions: new Float32Array(m.positions),
    indices: new Uint32Array(m.indices),
  };
  return validate(p);
}
export function normals(mesh) {
  const a = mesh.positions,
    b = mesh.indices,
    n = new Float32Array(a.length);
  for (let i = 0; i < b.length; i += 3) {
    const u = b[i] * 3,
      v = b[i + 1] * 3,
      w = b[i + 2] * 3,
      ax = a[v] - a[u],
      ay = a[v + 1] - a[u + 1],
      az = a[v + 2] - a[u + 2],
      bx = a[w] - a[u],
      by = a[w + 1] - a[u + 1],
      bz = a[w + 2] - a[u + 2],
      x = ay * bz - az * by,
      y = az * bx - ax * bz,
      z = ax * by - ay * bx;
    for (const k of [u, v, w]) {
      n[k] += x;
      n[k + 1] += y;
      n[k + 2] += z;
    }
  }
  for (let i = 0; i < n.length; i += 3) {
    const length = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= length;
    n[i + 1] /= length;
    n[i + 2] /= length;
  }
  return n;
}
export function adjacency(mesh) {
  const sets = Array.from(
    { length: mesh.positions.length / 3 },
    () => new Set(),
  );
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const [a, b, c] = mesh.indices.subarray(i, i + 3);
    sets[a].add(b).add(c);
    sets[b].add(a).add(c);
    sets[c].add(a).add(b);
  }
  return sets.map((s) => new Uint32Array(s));
}
export function sculpt(
  mesh,
  neighbors,
  point,
  normal,
  {
    mode = "add",
    radius = 0.25,
    strength = 0.04,
    pressure = 1,
    mirror = false,
  } = {},
) {
  if (
    !["add", "subtract", "smooth", "flatten", "crease"].includes(mode) ||
    !bounds(radius, 0.01, 2) ||
    !bounds(strength, 0.0001, 0.2) ||
    !bounds(pressure, 0, 1) ||
    point.length !== 3 ||
    normal.length !== 3 ||
    !point.every((x) => bounds(x, -100, 100)) ||
    !normal.every((x) => bounds(x, -1, 1))
  )
    throw Error("브러시 범위");
  const a = mesh.positions,
    old = a.slice(),
    ns = normals(mesh),
    centers = [[point, normal]];
  if (mirror && Math.abs(point[0]) > 0.001)
    centers.push([
      [-point[0], point[1], point[2]],
      [-normal[0], normal[1], normal[2]],
    ]);
  let changed = 0;
  for (let i = 0; i < a.length; i += 3) {
    let sum = [0, 0, 0],
      affected = false;
    for (const [pt, no] of centers) {
      const delta = [old[i] - pt[0], old[i + 1] - pt[1], old[i + 2] - pt[2]],
        d = Math.hypot(...delta);
      if (
        d >= radius ||
        ns[i] * no[0] + ns[i + 1] * no[1] + ns[i + 2] * no[2] < -0.15
      )
        continue;
      const fall = (1 - (d * d) / radius ** 2) ** 2,
        amount = fall * strength * pressure;
      let target = [0, 0, 0];
      if (mode === "add" || mode === "subtract")
        target = no.map((x) => x * radius * amount * (mode === "add" ? 1 : -1));
      if (mode === "flatten") {
        const dot = delta.reduce((s, x, k) => s + x * no[k], 0);
        target = no.map((x) => -x * dot * amount * 2);
      }
      if (mode === "crease") {
        const dot = delta.reduce((s, x, k) => s + x * no[k], 0);
        target = delta.map(
          (x, k) =>
            (-x + dot * no[k]) * amount * 0.5 - no[k] * radius * amount * 0.5,
        );
      }
      if (mode === "smooth") {
        const list = neighbors[i / 3];
        for (let k = 0; k < 3; k++) {
          let s = 0;
          for (const j of list) s += old[j * 3 + k];
          target[k] = (s / list.length - old[i + k]) * amount * 3;
        }
      }
      sum = sum.map((x, k) => x + target[k]);
      affected = true;
    }
    if (affected) {
      for (let k = 0; k < 3; k++)
        a[i + k] = Math.max(-100, Math.min(100, old[i + k] + sum[k]));
      changed++;
    }
  }
  return changed;
}
export function subdivide(mesh) {
  const a = Array.from(mesh.positions),
    b = [],
    mid = new Map(),
    at = (i, j) => {
      const k = Math.min(i, j) + ":" + Math.max(i, j);
      if (mid.has(k)) return mid.get(k);
      const idx = a.length / 3;
      if (idx >= MAX_VERTICES)
        throw Error("더 세분화하면 정점 한도를 넘습니다.");
      a.push(
        (a[i * 3] + a[j * 3]) / 2,
        (a[i * 3 + 1] + a[j * 3 + 1]) / 2,
        (a[i * 3 + 2] + a[j * 3 + 2]) / 2,
      );
      mid.set(k, idx);
      return idx;
    };
  if ((mesh.indices.length / 3) * 4 > MAX_TRIANGLES)
    throw Error("삼각형 한도를 넘습니다.");
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const [x, y, z] = mesh.indices.subarray(i, i + 3),
      xy = at(x, y),
      yz = at(y, z),
      zx = at(z, x);
    b.push(x, xy, zx, xy, y, yz, zx, yz, z, xy, yz, zx);
  }
  return { positions: new Float32Array(a), indices: new Uint32Array(b) };
}
const bytes = (p) =>
  p.mesh.positions.byteLength + p.mesh.indices.byteLength + 1024;
export class History {
  constructor() {
    this.back = [];
    this.forward = [];
  }
  trim() {
    while (
      this.back.length + this.forward.length > 20 ||
      [...this.back, ...this.forward].reduce((s, p) => s + bytes(p), 0) >
        48000000
    ) {
      if (this.back.length) this.back.shift();
      else this.forward.shift();
    }
  }
  push(p) {
    this.back.push(structuredClone(p));
    this.forward = [];
    this.trim();
  }
  undo(p) {
    if (!this.back.length) return p;
    this.forward.push(structuredClone(p));
    const q = this.back.pop();
    this.trim();
    return q;
  }
  redo(p) {
    if (!this.forward.length) return p;
    this.back.push(structuredClone(p));
    const q = this.forward.pop();
    this.trim();
    return q;
  }
}
