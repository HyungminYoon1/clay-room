# Verification

## 2026-10-10 선택·카메라·객체 이동 — LOCAL

- SOURCE VERIFIED: 이번 변경의 architecture/requirements/README/decisions, app/viewport/scene 및 새 interaction model, UI/CSS, pinned vendor entry/build/check·workflow와 관련 테스트를 읽었습니다. 기존 geometry/cut/worker의 모든 함수를 이번에 다시 검토한 것은 아닙니다(PARTIAL); 기존 테스트는 함께 실행했습니다. D06에 입력·표시·저장 경계를 기록했습니다.
- LOCAL: 22/22 tests, 17 public files 정적 검사, git diff --check PASS. 기본 카메라/객체 모드 분리, 글 입력·대화상자·조합 입력/수정키 보호, 정밀 간격, 방향을 보존하는 ±100m 경계, transform-only 이동과 한 번의 undo, 유한한 선택 설정·12개 선분 버퍼를 검사했습니다.
- ACTUAL BROWSER: 2객체 실제 클릭 선택, 다른 객체에 브러시 첫 클릭 시 변형 없음, 기본 방향키/WASD 카메라 이동, X축 0.4535152434m 드래그·화면 평면 드래그·앞 보기에서 깊이 축 이동, 0.0001m 간격의 키 반복·Shift 0.00001m, 한 번의 undo/redo, 키/마우스 Escape 취소·blur 확정, 입력창/열린 대화상자 보호를 확인했습니다. 이동 전후 메시 좌표 hash는 같습니다. 기존 선택 객체의 실제 브러시 변형과 undo도 확인했습니다.
- SELECTION / EXPORT: 기본 900ms 후 숨김·조작 중 유지, 항상/숨김 및 숨겨도 남는 이름·목록을 확인했습니다. 0.25px/3px 굵기와 농도는 실제 canvas 캡처가 달라집니다. 항상/숨김 상태에서 내려받은 1024 PNG bytes가 같아 테두리가 출력되지 않습니다. 실제 4096×4096 PNG 2,003,101bytes를 확인·시각 검토했습니다. 내려받은 2mesh GLB의 16132정점과 world 변환이 프로젝트와 일치하며 STL 32256삼각형의 mm bounds가 1e-6m 이내로 일치합니다.
- STORAGE / LAYOUT: 별도 기존 v1 저장 fixture는 자동 열기·카메라 이동으로 원본 bytes를 바꾸지 않습니다. 명시적 객체 이동만 v2로 저장하며 undo로 옛 좌표를 복구했습니다. 다른 앱 QA key를 유지합니다. 실제 1440/390/320px에서 root overflow와 관찰한 page errors0, 이동 메뉴·선택 설정이 화면 안에 있습니다. WEB LAB용 실제 1440×1000 JPEG를 갱신합니다.
- QA / NOT_RUN: CLI의 range fill은 0.1 형식으로 수정했고 파일 열기 confirm은 별도 UI 명령으로 처리했습니다. 비동기 dialog close 뒤에는 실제 객체 상태를 기다려 테스트 입력 경합을 제거했습니다. 자동 v1 열기와 사용자가 승인하는 파일 교체는 구분합니다. 캡처/다운로드/검사기는 ignored output/playwright/2026-10-10-controls에 있습니다. 물리 펜·터치, 모든 GPU/브라우저와 외부 CAD/프린터 검증은 NOT_RUN; REMOTE_CI/LIVE는 별도 확인합니다.

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
