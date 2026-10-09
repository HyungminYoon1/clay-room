# Decisions

## D01 — actual mesh, bounded resources (2026-10-09)

Context: sculpting must retain small edits in an exportable object. Options: shader deformation, voxel engine, indexed mesh brushes. Decision: welded float32 triangle mesh, local adjacency and true vertex displacement; 131072 vertices/262144 triangles and 48 MB history. Rationale: precise edits and standard exports on free static hosting. Files: mesh-model, viewport, app. Review: exported vertices, undo, normals, degeneracies and frame cost. Self-intersection repair/remeshing deferred, not claimed.

## D02 — project storage and file boundary

Options: shared WEB LAB schema, cloud files, independent browser/project files. Decision: own key only, 3.5 MB autosave / 24 MB imported JSON cap, verify readback, preserve malformed data, require explicit replace. Rationale: no migration, costs or exposure of creative files. Files: app, model, README. Review: quota failures, oversized/high-resolution files and re-import.

## D03 — geometry formats and units

Decision: pinned Three.js 0.186.1 with GLTFExporter and STLExporter; same-origin vendor with MIT license. GLB meters, STL numeric millimeters stated in UI, editable JSON separate. 4K PNG renders the actual scene at the requested pixel count with resource limits and cleanup. Options rejected: cosmetic downloadable placeholders or silent lower resolutions. Files: viewport, vendor tools, export UI. Review: headers, triangle counts, bounding boxes, actual PNG dimensions. No printability warranty.

## D04 — UI font and local-only assets

Unmodified Pretendard Variable 1.3.9, SIL OFL 1.1, full license supplied. No remote media or content-generated portraits. The first object is an original procedural folded pebble, editable with every tool. Files: assets/fonts, model demo, CSS. Review: same-origin assets and actual browser preview.
