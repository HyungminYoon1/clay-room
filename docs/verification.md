# Verification

## 2026-10-10 REMOTE_CI / LIVE

Implementation commit `0363afb030730fb7918003a2810053599cff7485`: [verify/deploy PASS](https://github.com/HyungminYoon1/clay-room/actions/runs/37947881837). Public Pages uses the verified GitHub origin; normal pushes only.

LIVE HTTP: all 10 public dist files returned HTTP200 and matched the local verified SHA256 bytes. Across six affected services, 151/151 files matched after the gallery deployment completed.

LIVE BROWSER / EXPORT: actual pointer stroke changed 1562 coordinate components; undo restored original positions and redo reapplied. Refinement reached 129026 vertices/258048 triangles. Downloaded JSON, GLB2 with 32258 vertices (zero position mismatches against JSON), binary STL with 64512 finite triangles and actual 4096x4096 PNG, visually inspected. Desktop 1440/mobile390/320 without overflow or observed page errors. STL units remain a numeric millimeter convention, not metadata guaranteed by the format.

The existing shared completion string was unchanged. Creative files stay browser-local; individual own keys are a code contract, not origin isolation between GitHub Pages paths. Physical hardware, all browsers and independent expert interoperability/scientific review remain NOT_RUN. This evidence update changes docs only.



2026-10-09 LOCAL: 5/5 model tests; static syntax/assets/CSP check passed. Welded sphere edges each have two faces; outward normals and no degenerate pole faces verified. All brush modes alter finite coordinates, small strength .0001 survives float32, history/restoration and two refinements to 129026 vertices tested. npm audit reported zero vulnerabilities.

ACTUAL BROWSER: Playwright CLI Chromium, desktop 1440 and mobile 390/320 widths, no page errors or page-level overflow. A real 16-step pointer stroke changed 1562 coordinate components; undo restored exact original positions, redo reapplied them. UI transform X=.0001 retained. Refinement reached 129026 vertices / 258048 triangles; undo preserved the prior edited object. Existing shared summary unchanged.

DOWNLOADED FILES: JSON, GLB 1,549,636 bytes / version 2 / 32258 vertices; GLB accessor float32 positions all exactly matched editable JSON (zero mismatches). STL 3,225,684 bytes / 64512 triangles, finite normals and vertices, millimeter numeric convention stated. Actual 4096×4096 PNG 2,437,790 bytes viewed and confirmed nonempty/sculpted, not upscaled screenshot.

FINAL LOCAL: wireframe view is retained when undo or refinement rebuilds the actual mesh. This is a view preference, not an exported project material property.

NOT_RUN: physical pen/touch devices, external Blender/slicer interoperability, exhaustive GPU/browser coverage, arbitrary mesh self-intersection repairs or 3D printing. Chromium software GPU warning is not physical GPU evidence. Remote CI and LIVE pending.
