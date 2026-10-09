# Requirements

- Approved on 2026-10-10: maximum eight independently selectable objects with a project-wide mesh/history budget, initial size, add/copy/delete, individual material/transforms, uniform volume ratio resize, world-plane split with actual caps and closed-volume ratio split. Concatenating merge is explicitly not a boolean union. Preserve version-1 geometry/files; all-object GLB/STL and real 4K PNG. Off-thread split with cancel/time bound. Camera pan, numeric target, selected/whole scene fitting. No server or new visitor-storage keys.
- Real editable high-density indexed mesh; add, subtract, smooth, flatten and crease brushes, pressure response and X symmetry.
- Orbit/pan/zoom and front/side/top views; wireframe, material roughness/metalness/color, lights and ground toggles.
- Numeric brush radius/strength and object transforms, undo/redo, non-destructive refinement, own autosave and editable JSON.
- Binary GLB, millimeter STL and 4K PNG downloads with actual file/header/geometry verification.
- Responsive UI and clear WebGL failure state. No unbounded memory allocations or silent export downgrade.
- No claim of Blender parity or guaranteed printable meshes.
