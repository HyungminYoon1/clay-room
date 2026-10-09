# CLAY ROOM architecture

Independent static WebGL 2 sculpting workspace on GitHub Pages. No API, account, upload, remote font or telemetry. Three.js 0.186.1 and its exporters are pinned, bundled and served locally.

`mesh-model.js`: finite float32 positions, welded indexed triangles, adjacency, deformation, refinement, validation and history. `viewport.js`: WebGL geometry/material, picking, camera and file rendering. `app.js`: DOM/pointer interaction and local project persistence. No shader-only pretend sculpting: brushes change mesh coordinates, normals are recomputed, and exports use those positions.

One object per project, up to 131072 vertices and 262144 triangles, position coordinates within ±100. Positive scales only; transform controls and brush strength retain fractional values. A single own key `clay-room-project-v1` has a 3.5 MB autosave cap; larger meshes remain editable and require JSON file storage. JSON import cap 24 MB. No access to other WEB LAB records. Corrupt data is preserved until explicit replacement.

History has at most 20 snapshots and a 48 MB combined byte budget. Resource-bounded subdivision preserves existing surface edits. PNG up to 4096×4096 re-renders at output resolution, not a screenshot upscale. GLB uses meters (one workspace unit = one meter); STL contains no unit metadata, so exported numeric coordinates are explicitly millimeters. Export does not certify watertightness, absence of self intersections or suitability for printing.

See docs/decisions.md.
