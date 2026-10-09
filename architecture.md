# CLAY ROOM architecture

Independent static WebGL 2 sculpting workspace on GitHub Pages. No API, account, upload, remote font or telemetry. Three.js 0.186.1 and its exporters are pinned, bundled and served locally.

`mesh-model.js`: finite float32 positions, welded indexed triangles, adjacency, deformation, refinement, validation and history. `viewport.js`: WebGL geometry/material, picking, camera and file rendering. `app.js`: DOM/pointer interaction and local project persistence. No shader-only pretend sculpting: brushes change mesh coordinates, normals are recomputed, and exports use those positions.

User-approved 2026-10-10 revision supersedes the one-object limitation: one project has 1–8 independently selectable objects, with a combined 131072 vertices / 262144 triangles. `scene-model.js` owns the version-2 envelope, IDs, total budgets, transforms, duplication, concatenating merge, sizing and whole-scene history. Existing version-1 files/key values are read losslessly into memory; opening alone does not overwrite them. `mesh-model.js` retains per-object mesh operations. Position coordinates remain within ±100, positive scales 0.001–100, rotations ±3600 degrees. Transform controls and brush strength retain fractional values.

`cut-model.js` owns bounded world-space plane clipping, actual cap triangulation (locally bundled Earcut 3.0.2, ISC) and volume-ratio bisection. `geometry-worker.js` runs it off the UI thread, at most 4096 cut edges / 20 search steps / 20 seconds. The UI can terminate it and keeps originals on failure. Split requires a consistently oriented closed surface and validates final connectivity/volume. This is not self-intersection repair. Concatenating merge deliberately preserves internal/overlapping surfaces; it is not a boolean union. Real material density is not assumed; size/volume ratios are geometric.

A single own key `clay-room-project-v1` has a 3.5 MB UTF-8 autosave cap; larger scenes remain editable and require JSON file storage. JSON import cap 24 MB UTF-8, checked before typed-array allocation with aggregate budgets. No access to other WEB LAB records. Corrupt data is preserved until explicit replacement. Same-origin module workers only; runtime API access stays prohibited. Camera target/pan does not deform or persist the mesh. GLB exports separate objects/materials; STL contains all transformed triangles.

History has at most 20 snapshots and a 48 MB combined byte budget. Resource-bounded subdivision preserves existing surface edits. PNG up to 4096×4096 re-renders at output resolution, not a screenshot upscale. GLB uses meters (one workspace unit = one meter); STL contains no unit metadata, so exported numeric coordinates are explicitly millimeters. Export does not certify watertightness, absence of self intersections or suitability for printing.

See docs/decisions.md.
