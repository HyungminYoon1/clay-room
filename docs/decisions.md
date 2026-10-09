# Decisions

## D05 — User-approved bounded multi-object scene (2026-10-10)

Context: the user requests multiple lumps, size/copy/merge/split and camera movement; the architecture explicitly limited the project to one object. Work on that boundary paused and the user explicitly approved changing it. Options: retain one object, add unlimited objects and history, or use a bounded scene with per-object geometry. Decision: version2, max8 objects and combined131072 vertices/262144 triangles, existing20-snapshot/48MB history budget for the entire scene. Keep the same own key, actual UTF-8 3.5MB autosave and24MB import bounds. Read v1 into memory without overwriting it on opening; the next deliberate edit/file replacement may save v2. Unknown/corrupt data is preserved. Rotations permit±3600°, positions remain±100 and positive scales0.001–100. No shared state or DB.

For splitting choose actual clipping/capped surfaces, not hidden/duplicated whole geometry. Earcut3.0.2 from the pinned local Three package triangulates holes, with its exact ISC notice. Plane normals may be arbitrary. Ratio splitting bisects geometric volume, not assumed real mass. Validate closed consistent input and both outputs, preserve total volume, bound cut edges4096/search20 steps and run a cancellable20s worker. Failed/cancelled jobs leave the scene intact; changes/exports are blocked during a job. Options rejected: unbounded dense CSG/voxel remeshing or falsely labeling mesh concatenation as a watertight union. Merge concatenates transformed geometry using the first material and explicitly retains internal overlap. GLB keeps separate objects/materials; STL exports every transformed triangle, both exclude editor helpers.

Rationale: object count alone does not bound CPU, GPU buffers, topology, export size or undo memory. The browser performs WebGL rendering and geometry work, but explicit app budgets are still needed. Preserve layer separation: scene/cut pure models, rendering/picking/camera in viewport, DOM and own-key state in app, local-only worker. Affected: scene/cut/worker, mesh validation, viewport/app, object UI/CSS, vendor build, license, README/architecture/requirements and tests. Review: v1 roundtrip, eight/global limits, independent copies and all-scene undo, oblique/ratio/hole cuts, volume and connectivity, real multi-object exports, cancellation, storage denial/other keys, camera and320/390/1440 input. Independent CAD/printing and all GPU hardware NOT_RUN.

## D01 — actual mesh, bounded resources (2026-10-09)

Context: sculpting must retain small edits in an exportable object. Options: shader deformation, voxel engine, indexed mesh brushes. Decision: welded float32 triangle mesh, local adjacency and true vertex displacement; 131072 vertices/262144 triangles and 48 MB history. Rationale: precise edits and standard exports on free static hosting. Files: mesh-model, viewport, app. Review: exported vertices, undo, normals, degeneracies and frame cost. Self-intersection repair/remeshing deferred, not claimed.

## D02 — project storage and file boundary

Options: shared WEB LAB schema, cloud files, independent browser/project files. Decision: own key only, 3.5 MB autosave / 24 MB imported JSON cap, verify readback, preserve malformed data, require explicit replace. Rationale: no migration, costs or exposure of creative files. Files: app, model, README. Review: quota failures, oversized/high-resolution files and re-import.

## D03 — geometry formats and units

Decision: pinned Three.js 0.186.1 with GLTFExporter and STLExporter; same-origin vendor with MIT license. GLB meters, STL numeric millimeters stated in UI, editable JSON separate. 4K PNG renders the actual scene at the requested pixel count with resource limits and cleanup. Options rejected: cosmetic downloadable placeholders or silent lower resolutions. Files: viewport, vendor tools, export UI. Review: headers, triangle counts, bounding boxes, actual PNG dimensions. No printability warranty.

## D04 — UI font and local-only assets

Unmodified Pretendard Variable 1.3.9, SIL OFL 1.1, full license supplied. No remote media or content-generated portraits. The first object is an original procedural folded pebble, editable with every tool. Files: assets/fonts, model demo, CSS. Review: same-origin assets and actual browser preview.
