# Verification

2026-10-09 LOCAL: 5/5 model tests; static syntax/assets/CSP check passed. Welded sphere edges each have two faces; outward normals and no degenerate pole faces verified. All brush modes alter finite coordinates, small strength .0001 survives float32, history/restoration and two refinements to 129026 vertices tested. npm audit reported zero vulnerabilities.

ACTUAL BROWSER: Playwright CLI Chromium, desktop 1440 and mobile 390/320 widths, no page errors or page-level overflow. A real 16-step pointer stroke changed 1562 coordinate components; undo restored exact original positions, redo reapplied them. UI transform X=.0001 retained. Refinement reached 129026 vertices / 258048 triangles; undo preserved the prior edited object. Existing shared summary unchanged.

DOWNLOADED FILES: JSON, GLB 1,549,636 bytes / version 2 / 32258 vertices; GLB accessor float32 positions all exactly matched editable JSON (zero mismatches). STL 3,225,684 bytes / 64512 triangles, finite normals and vertices, millimeter numeric convention stated. Actual 4096×4096 PNG 2,437,790 bytes viewed and confirmed nonempty/sculpted, not upscaled screenshot.

FINAL LOCAL: wireframe view is retained when undo or refinement rebuilds the actual mesh. This is a view preference, not an exported project material property.

NOT_RUN: physical pen/touch devices, external Blender/slicer interoperability, exhaustive GPU/browser coverage, arbitrary mesh self-intersection repairs or 3D printing. Chromium software GPU warning is not physical GPU evidence. Remote CI and LIVE pending.
