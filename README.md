# CLAY ROOM · 3D 조각 공방

메시를 직접 밀고 깎고 다듬는 WebGL 2 조각 편집기입니다. 브러시 반경과 세기를 숫자로 입력하고, 대칭 조각·평탄화·주름·표면 다듬기와 실행 취소를 사용할 수 있습니다. 세분화는 기존 조각 형태를 보존하면서 정점을 추가합니다.

최대 131072 정점 / 262144 삼각형. 기본형은 중복 경계·극점 없는 구형 메시입니다. 편집은 float32 좌표에 반영되며, 작은 수치 입력이 가능합니다. 물체 하나를 편집합니다. 자동 리토폴로지, 불리언, 전문 CAD 치수 공차 또는 3D 프린팅 검증은 제공하지 않습니다.

GLB는 재질·변환을 포함하며 1단위=1m입니다. STL 파일은 원래 단위 정보가 없으므로 내보낼 때 좌표를 mm로 변환합니다. PNG는 최대 4096×4096 실제 렌더링입니다. 프로젝트 JSON을 다시 열어 조각을 계속할 수 있습니다.

자동저장은 이 브라우저의 자체 키만 사용합니다. 3.5MB를 넘으면 파일로 저장하세요. 기존/다른 앱 기록은 읽지 않습니다. 입력 파일은 최대 24MB입니다. 백엔드와 계정이 없습니다.

`npm ci`, `npm run build`, `npm test`, `npm run check`; `npm run serve -- 4194`.

[Three.js](https://threejs.org/), MIT / [Pretendard 1.3.9](https://github.com/orioncactus/pretendard), SIL OFL 1.1. Full licenses distributed with local assets. Evidence: docs/verification.md.
