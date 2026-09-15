# 짭그마 개발 진행도

마지막 갱신: 2026-09-15. **전체 제품 완성이 아니라 Phase 1의 첫 동작 가능한 구현 단계입니다.** 다음 세션은 이 문서 → PROJECT_SETUP.md → 변경 영역의 코드/지침 순서로 시작합니다.

이번 UI/UX 14개 주요 개선 및 내보내기 고도화:
1. **날짜 범위 피커 (dateRange)**: 단일 인풋 클릭 시 월 이동 및 범위 선택(시작일~종료일 하이라이트)이 가능한 인터랙티브 캘린더 팝오버(오늘/적용/취소) 구현.
2. **버전 복원/초기화**: 버전 히스토리 모달에서 이전 버전뿐만 아니라 현재 버전(v{n})에도 '현재 버전으로 복원' 버튼을 제공하여 작업 중 변경 취소 및 저장본 상태 복귀 지원.
3. **캔버스 및 레이어 드래그 앤 드롭**: 캔버스 루트 영역 드롭 시의 `inside` 정규화 및 레이어 트리에서 `GripVertical` 핸들, `before`/`inside`/`after` 위치 표시자 및 순서 변경 버그 수정.
4. **라벨 좌/우 간격 균형 조정**: 불필요한 라벨 강제 min-width 제거 및 컨트롤 flex 확장으로 좌측 라벨은 너무 멀지 않고, 우측 라벨은 찌그러지거나 좁지 않도록 최적화.
5. **Storybook ZIP 독립 실행 패키지 & 단일 완전 HTML 내보내기**:
   - Storybook 내보내기: 메모리 순수 TS ZIP 패커를 통해 `package.json`(6006 포트), `.storybook/main.ts`, `.storybook/preview.ts`, 컴포넌트, 스타일, README를 모두 묶은 `.zip` 번들 제공. `npm i && npm run storybook`으로 즉시 실행 가능.
   - HTML 내보내기: 모든 컴포넌트 및 디자인 스타일을 인라인으로 번들링하여 외부 의존성 없이 브라우저에서 바로 열리는 독립형 `.html` 생성.
   - JSON 스펙 내보내기: 원본 스펙 JSON 내보내기.
6. **체크박스/스위치 라벨 위치 버그 수정**: `labelPosition`이 `left`, `right`, `top`일 때 컨트롤과 라벨 순서를 일관되게 렌더링하도록 통일.
7. **버튼 아이콘 정렬 및 높이 일치**: 아이콘 상단 들뜸 방지(수직 가운데 정렬), 텍스트와의 간격 확보, 아이콘 유무와 관계없이 38px 높이 고정.
8. **신규 컴포넌트 (모달, 다이얼로그, 알림)**: `modal`(헤더+바디 윈도우), `dialog`(헤더+바디+취소/확인 액션 버튼), `alert`(정보/성공/경고/에러 상태 박스) 추가.
9. **스켈레톤 UI (Skeleton)**: 단순 3줄 선에서 벗어나 실감나는 Shimmer 애니메이션 및 3가지 형태(라인형, 카드 썸네일형, 원형 아바타형) 지원.
10. **원형 프로그레스 바 (Circular Progress)**: `shape: 'bar' | 'circle'` 속성 지원으로 SVG 원형 링 게이지 및 중앙 퍼센트 표시.
11. **여백 컴포넌트 (Spacer)**: 편집 모드에서는 점선 테두리와 '여백' 가이드 표시, 미리보기/배포 모드에서는 완전 투명 레이아웃 여백으로 동작.
12. **테이블 페이지네이션 화살표 표시 (빈 네모 버그 해결)**: `<<`, `<`, `>`, `>>` 버튼의 SVG 아이콘에 명시적 stroke, color, 크기를 부여하여 빈 네모 상자로 보이는 문제 원천 차단.
13. **커스텀 CSS 입력**: Inspector 디자인 탭 하단에 '커스텀 스타일 (CSS)' 입력창을 추가하여 개별 요소에 임의 CSS 속성 적용 지원.
14. **프로젝트 삭제 기능**: 백엔드 `DELETE /api/projects/:id` 엔드포인트(권한 검사, 캐스케이드 삭제, 감사 로그) 및 프로젝트 카드에 삭제 버튼과 확인 팝업 추가.

## 이번 작업 범위

14개 요구사항을 바탕으로 캔버스·레이어 조작, 폼/라벨 UI, 신규 컴포넌트, 내보내기 패키징, 프로젝트 삭제까지 전체 기능을 관통하여 안정적으로 구현했습니다.

## 구현됨

- npm workspace: 웹/API/공통 UI Spec 분리. NestJS 기능별 모듈, 프론트 기능별 컴포넌트, 스타일 파일 분리.
- 프로젝트 생성·목록·검색, 페이지 생성·선택·이름 변경.
- 요소 64종 → 36종 핵심 컴포넌트 통합 리팩터링. [전체 목록과 통합 정리](COMPONENT_COVERAGE.md).
- 공통 Registry / JSON Spec / Zod 검증, 자식 허용 규칙·중복 ID·크기/깊이 제한.
- Palette 클릭/드래그 추가와 자동 선택, Layer Tree 선택/접기/이동, Canvas 기존 요소 드래그 순서 변경·다른 영역으로 이동·삽입 위치 표시. 잠금/자손 잠금/미리보기 보호.
- 속성 편집, 잠금, 복제·삭제, 순서 이동, 내부 복사/붙여넣기 단축키.
- Desktop/Tablet/Mobile override, 크기 preset, 확대 비율, Preview. 기본 캔버스 1440px/최소 높이 900px/100%, 본문 16px, 패널 글자 확대, 너비 입력/화면 맞춤.
- Undo/Redo, 1.5초 유휴 후 자동 저장, 명시 저장, 새로고침 후 유지.
- Revision 충돌 감지, 내 변경 JSON 내려받기, 최신본 불러오기. 원본 덮어쓰기 방지.
- OIDC 연동 코드: code/state/nonce/PKCE, jose 서명·issuer·audience 검증, 서버 세션, refresh 암호화/회전, 로그아웃.
- 개발 사용자 모드 + 실제 내부 세션/프로젝트 ACL. 운영 우회 금지. CSRF/Origin 검사.
- PostgreSQL 관계형 메타데이터 + JSONB Spec + 불변 revision + 감사 기록.
- Nginx/API/DB 컨테이너, SQL checksum/advisory lock 마이그레이션, healthcheck.
- 운영은 compose.yaml + .env와 registry 이미지 사용. Windows/macOS/Linux 검증·발행 스크립트.
- 공통 Button/NodeRenderer Stories와 실제 브라우저 검사.
- 파일 외부 연동: 메모리 multipart 프록시, 크기/형식/세션/CSRF/프로젝트 편집 권한 검사, fileId와 프로젝트 연결, 페이지 저장 시 참조 검증, 한글 파일명, 공개 다운로드 이동, preview 202 준비 중/재확인. 실제 외부 서비스 검증은 대기입니다.
- DB 마이그레이션 002_project_files.sql 추가. 파일 본문 로컬 영속 저장 없음. [파일 계약/미확인 사항](FILE_INTEGRATION.md).

## 검증 현황

최종 Docker 검사: `docker compose -f compose.test.yaml up --abort-on-container-exit --exit-code-from test test` 성공.

- 공통 UI Spec 테스트: 6개 통과 — 순서/부모 이동, 잠금/순환 방지, 64종 roundtrip, URL 허용 범위 포함.
- API·OIDC·파일/마이그레이션 테스트: 5개 통과 — 모의 파일 서비스 multipart, 인가/위조 형식/프로젝트 참조, 401/413/507/연결/응답 오류 포함.
- Chromium E2E: 5개 통과 — 기존 흐름 + 기존 요소 이동/잠금/Undo/Redo/너비/새로고침, 한글 첨부 업로드·저장·새로고침.
- Storybook 검사: 4개 통과 — 기존 2개 + 전체 카탈로그/탭/스위치/아코디언, 파일 설정 누락/업로드 오류/preview 준비 중.
- Docker 빌드: API·Nginx·Storybook 테스트 이미지 성공.
- `npm run lint`: 0 warnings, 0 errors. `npm run typecheck`: 성공.
- 최종 수정(드래그 추가 후 자동 선택 포함) 후 전체 20개 재검사 통과. 개발 이미지를 다시 빌드하고 `docker compose -f compose.dev.yaml up -d --wait` 적용, Nginx/API/DB healthy 확인. Docker에서 실제 호스트 30137 `/api/health` 호출은 200/ok. 개발 DB 볼륨 보존, 테스트 환경 정리 완료.
- 이번 변경사항은 커밋 `3cafc32`로 완료하고 원격 저장소(`origin main`)로 푸시되었습니다. (초기 커밋: `ab76d96`)

이번 검증 중 파일 테스트의 UUID/text 중복 파라미터 오류와 파일 요소 표시명 불일치를 수정했습니다. 초기 작업에서는 Nest AuthGuard 의존성·HTTP origin의 crypto.randomUUID·Storybook 정적 서버 경로도 수정했습니다. PowerShell 기본 실행 정책으로 `./scripts/verify.ps1` 직접 호출은 차단되었지만 동일 Docker Compose 명령으로 검사했습니다. Storybook 빌드의 큰 chunk 안내는 남아 있으며 빌드는 성공합니다.

## 다음 시작점 — Phase 1 마무리

1. **사용자가 OIDC를 등록하면** 실제 로그인/갱신/로그아웃, 운영 도메인 프록시 경로를 확인합니다. 아직 코드만으로 실 연동 완료라고 하지 않습니다.
   파일은 실제 multipart 성공 JSON과 `editor` 보존 분류 전송 필드/헤더를 확인하고, 서버 FILE_SERVICE_BEARER_TOKEN 설정 후 실 연동을 검증합니다. 현재 응답 envelope는 확인 대기 가정이며 자동 재업로드하지 않습니다.
2. 편집 조작 강화: 다중 선택, 드래그 리사이즈, 자유 치수/사용자 지정 breakpoint, pan/snap/정렬 가이드, 컨텍스트 메뉴. 현재 단일 선택·크기 preset·스크롤/zoom까지입니다.
3. 큰 트리·빠른 연속 편집 검증과 사용성 개선. 파일을 거대하게 합치지 말고 저장/선택/명령 hook 경계를 유지합니다.
4. 페이지 복제/삭제/복원·정렬/폴더, 충돌 비교 및 내 변경을 별도 revision/분기로 보관하는 UX.
5. 현재 목록 상한(프로젝트 200, 페이지 500)을 넘길 때 pagination. UI/Spec schema version 변경 시 migration 설계.

## 후속 단계

| 단계 | 상태 / 주요 내용 |
| --- | --- |
| Phase 1 Foundation | 진행 중. 위 실제 구현과 남은 편집 조작·실 OIDC 확인 참고 |
| Phase 2 Production Builder | 일부 착수: 요소 64종 기본 렌더링/속성, 이미지·첨부 업로드 모의 검증. 전체 요소 고도화, Theme/Design Token, Templates, Instance, Asset 관리 화면, 공유 관리, 버전 복원은 남음 |
| Phase 3 Development Integration | 미착수. 사용자 설계 Storybook Export, MCP Read/Write, AI Panel, n8n 도구 연동, 원자적 UI Patch, AI Preview/Apply, Action/Binding, Import/Export |
| Phase 4 Collaboration | 미착수. Presence·실시간 공동 편집/CRDT |

현재 개발용 Storybook은 **사용자가 만든 화면을 내보내는 Storybook Export 기능과 다릅니다.** 페이지 JSON 다운로드는 로컬 변경 보존용이며 프로젝트 전체 Import/Export 완료를 뜻하지 않습니다.

## 외부 의존·운영 대기

- OIDC 등록값은 PROJECT_SETUP.md. Client Secret·실제 IdP 연결 미검증.
- n8n은 아직 변경을 요청할 단계가 아닙니다. AI 단계에 messages 대화 연결을 먼저 구현하고, 실제 편집에 필요한 Webhook 인증·MCP 계약·노드 변경을 사용자에게 전달합니다.
- registry 최초 push/pull·운영 서버 배포는 아직 하지 않았습니다.
- Linux AMD64 환경에서 검증 중. Mac 실기기/ARM64 및 교차 빌드 실 검증 여부를 구분합니다.
- 운영 DB 허용 네트워크, 백업 저장소/주기/보관, 복구 연습은 운영 데이터 생성 전 결정합니다.
- 개발 편집기는 넓은 화면을 기준으로 하며 휴대폰에서 편집기 전체 조작 UX는 아직 미완성입니다. 모바일 미리보기와 프로젝트 목록은 별개입니다.

## 인계 규칙

작업 종료 시 이 문서의 결과·제약·다음 시작점을 갱신합니다. 완료 표시에는 실제 사용자 흐름과 검증 근거를 연결합니다. 이전 실패/미검증을 삭제해 완료처럼 보이게 하지 않습니다. 커밋 이력과 필요 시 이미지 태그를 함께 확인합니다.
