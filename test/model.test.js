import test from "node:test";
import assert from "node:assert/strict";
import {
  sphere,
  project,
  validate,
  normals,
  adjacency,
  sculpt,
  subdivide,
  encode,
  parse,
  History,
} from "../dist/src/mesh-model.js";
test("welded sphere is closed, outward and has no degenerate pole triangles", () => {
  const mesh = sphere(),
    p = project("sphere", false);
  validate(p);
  const edges = new Map();
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const [a, b, c] = mesh.indices.subarray(i, i + 3);
    for (const [x, y] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      const k = Math.min(x, y) + ":" + Math.max(x, y);
      edges.set(k, (edges.get(k) || 0) + 1);
    }
  }
  assert([...edges.values()].every((n) => n === 2));
  const n = normals(mesh);
  for (let i = 0; i < n.length; i += 3)
    assert(
      n[i] * mesh.positions[i] +
        n[i + 1] * mesh.positions[i + 1] +
        n[i + 2] * mesh.positions[i + 2] >
        0.98,
    );
  assert.equal(mesh.positions.length / 3, 8066);
});
test("fine positions survive JSON, transform and malformed mesh rejection", () => {
  const p = project();
  p.transform.position[0] = 0.0001;
  assert.deepEqual(parse(encode(p)), p);
  for (const bad of [
    (x) => (x.mesh.positions[0] = NaN),
    (x) => (x.mesh.indices[0] = 900000),
    (x) => (x.mesh.indices[1] = x.mesh.indices[0]),
    (x) => (x.transform.scale[0] = 0),
  ]) {
    const q = structuredClone(p);
    bad(q);
    assert.throws(() => validate(q));
  }
});
test("all brush modes change actual coordinates, remain finite and undo restores", () => {
  for (const mode of ["add", "subtract", "smooth", "flatten", "crease"]) {
    const p = project("pebble", false),
      h = new History(),
      original = p.mesh.positions.slice();
    h.push(p);
    const changed = sculpt(p.mesh, adjacency(p.mesh), [1, 0, 0], [1, 0, 0], {
      mode,
      radius: 0.4,
      strength: 0.04,
      mirror: true,
    });
    assert(changed > 0);
    assert.notDeepEqual(p.mesh.positions, original);
    validate(p);
    assert.deepEqual(h.undo(p).mesh.positions, original);
  }
});
test("two refinements preserve old sculpt vertices and reach 129026 vertices", () => {
  let m = sphere();
  m.positions[3] += 0.001;
  const original = m.positions.slice();
  m = subdivide(m);
  m = subdivide(m);
  assert.equal(m.positions.length / 3, 129026);
  assert.deepEqual(m.positions.subarray(0, original.length), original);
  assert.throws(() => subdivide(m));
  validate({ ...project("sphere", false), mesh: m });
});
test("float32 small brush input and resource history cap", () => {
  const p = project("sphere", false),
    a = p.mesh.positions.slice();
  sculpt(p.mesh, adjacency(p.mesh), [1, 0, 0], [1, 0, 0], {
    radius: 0.3,
    strength: 0.0001,
  });
  assert(p.mesh.positions.some((x, i) => x !== a[i]));
  const h = new History();
  for (let i = 0; i < 30; i++) h.push(p);
  assert.equal(h.back.length, 20);
});
