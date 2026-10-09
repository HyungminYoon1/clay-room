# Verification

## 2026-10-10 승인된 다중 객체 구조 — LOCAL

- SOURCE VERIFIED: architecture/requirements/README/decisions와 조각·파일·viewport·모델·작업자·분할·테스트를 검토했습니다. 사용자가 기존 한 객체 제한을 다중 객체로 바꾸는 것을 명시적으로 승인했습니다. D05에 대안/범위/이유를 기록했습니다. Three 0.186.1의 로컬 메시/OrbitControls를 유지하고 Earcut 3.0.2 단면 triangulation을 로컬 번들·ISC 라이선스와 함께 추가했습니다.
- LOCAL: 15/15 tests PASS, 16 public files 정적 검사 PASS, git diff --check PASS. v1→v2 보존, 전체 객체/정점/삼각형/이력 상한, 독립 복제, cubic 부피 배율, 실제 Three와 XYZ 변환 일치, world-coordinate 병합, 축/비스듬한 분할·구멍 단면·닫힘·부피 보존·잘못된 입력 거절을 검사했습니다.
- ACTUAL BROWSER: 1.25m 생성·.5m 추가·복사·미세 좌표 .00125·부피 배율8, 실제 Worker의 30:70 분할(측정 A=0.2999993684378662, 두 조각 모두 닫힘), 장면 undo/redo·4객체 병합/복구·v2 실제 JSON 불러오기, 카메라 중심 .12345/화면 이동을 확인했습니다. 여덟 객체에서 추가/분할을 거절하고 원본을 유지합니다. 실제 분할 시작 직후 취소 시 원본을 유지합니다. 저장 거절을 가정한 별도 페이지는 파일 저장 필요를 표시하면서 편집과 기존 저장을 유지했습니다. v1 파일은 열기만으로 덮어쓰지 않습니다.
- ACTUAL DOWNLOAD / PARSE: 4객체 JSON 2,200,012 bytes, GLB 4meshes 1,201,680 bytes, binary STL 49,892 triangles 2,494,684 bytes의 mm bounds가 프로젝트 world geometry와 1e-6m 안에서 일치합니다. 실제 PNG header 4096×4096 / 1,893,641 bytes. 모델/다운로드는 가상 출력물이 아닙니다. 다른 앱 QA 키도 유지됩니다. desktop1440/mobile390/320 root overflow와 관측된 page errors 0.
- BOUNDS / NOT_RUN: 최대 8객체, 장면 전체 131072정점/262144삼각형, JSON 입력24MB, history20/48MB, 분할 Worker20초. 병합은 메시를 한 객체로 묶으며 겹친 내부 면을 제거하는 CSG union이 아닙니다. 부피 배율은 실제 질량 계산이 아닙니다. 임의 자기교차 복구, 물리 펜/모바일 GPU, 모든 기기, 외부 slicer/Blender·3D 프린터 검증은 NOT_RUN. REMOTE_CI/LIVE는 별도 확인합니다. 실제 캡처/내보내기/검사기는 ignored output/playwright/2026-10-10-improvements에 있습니다.

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
