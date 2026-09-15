# 짭그마 개발 진행도

마지막 갱신: 2026-09-15. **전체 제품 완성이 아니라 Phase 1의 첫 동작 가능한 구현 단계입니다.** 다음 세션은 이 문서 → PROJECT_SETUP.md → 변경 영역의 코드/지침 순서로 시작합니다.

## 이번 작업 범위

프로젝트 생성 → 페이지 생성 → 기본 요소 편집 → 반응형 미리보기 → DB 저장/불러오기를 연결하고 Docker 개발·테스트·이미지 배포 구조를 준비합니다.

## 구현됨

- npm workspace: 웹/API/공통 UI Spec 분리. NestJS 기능별 모듈, 프론트 기능별 컴포넌트, 스타일 파일 분리.
- 프로젝트 생성·목록·검색, 페이지 생성·선택·이름 변경.
- 기본 요소 10종: 영역, 가로 배치, 카드, 제목, 텍스트, 버튼, 입력창, 여러 줄 입력, 체크박스, 구분선.
- 공통 Registry / JSON Spec / Zod 검증, 자식 허용 규칙·중복 ID·크기/깊이 제한.
- Palette 클릭/드래그 추가, Layer Tree 선택/접기/이동, Canvas 선택·빈 영역 drop.
- 속성 편집, 잠금, 복제·삭제, 순서 이동, 내부 복사/붙여넣기 단축키.
- Desktop/Tablet/Mobile override, 크기 preset, 확대 비율, Preview.
- Undo/Redo, 1.5초 유휴 후 자동 저장, 명시 저장, 새로고침 후 유지.
- Revision 충돌 감지, 내 변경 JSON 내려받기, 최신본 불러오기. 원본 덮어쓰기 방지.
- OIDC 연동 코드: code/state/nonce/PKCE, jose 서명·issuer·audience 검증, 서버 세션, refresh 암호화/회전, 로그아웃.
- 개발 사용자 모드 + 실제 내부 세션/프로젝트 ACL. 운영 우회 금지. CSRF/Origin 검사.
- PostgreSQL 관계형 메타데이터 + JSONB Spec + 불변 revision + 감사 기록.
- Nginx/API/DB 컨테이너, SQL checksum/advisory lock 마이그레이션, healthcheck.
- 운영은 compose.yaml + .env와 registry 이미지 사용. Windows/macOS/Linux 검증·발행 스크립트.
- 공통 Button/NodeRenderer Stories와 실제 브라우저 검사.

## 검증 현황

최종 Docker 검사: `docker compose -f compose.test.yaml up --abort-on-container-exit --exit-code-from test test` 성공.

- 공통 UI Spec 테스트: 3개 통과.
- API·OIDC 보안/마이그레이션 테스트: 3개 통과.
- Chromium E2E: 3개 통과 — 프로젝트·페이지·편집·반응형·새로고침, 모바일 목록, 드래그 삽입·저장 충돌.
- Storybook 검사: 2개 통과 — 키보드/disabled Button, 입력·label·mobile 상태·axe 검사.
- Docker 빌드: API·Nginx·Storybook 테스트 이미지 성공.
- `npm run lint`: 0 warnings, 0 errors. `npm run typecheck`: 성공.

발견하여 수정한 문제: Nest AuthGuard 모듈 의존성, HTTP origin의 crypto.randomUUID 미지원, 스타일 파일 분리 경계, Storybook 정적 서버 작업 디렉터리. PowerShell 기본 실행 정책으로 `./scripts/verify.ps1` 직접 호출은 차단되었지만, 동일한 Docker Compose 명령은 실행해 전체 검증을 완료했습니다.

## 다음 시작점 — Phase 1 마무리

1. **사용자가 OIDC를 등록하면** 실제 로그인/갱신/로그아웃, 운영 도메인 프록시 경로를 확인합니다. 아직 코드만으로 실 연동 완료라고 하지 않습니다.
2. 편집 조작 강화: 다중 선택, 드래그 리사이즈, 자유 치수/사용자 지정 breakpoint, pan/snap/정렬 가이드, 컨텍스트 메뉴. 현재 단일 선택·크기 preset·스크롤/zoom까지입니다.
3. 큰 트리·빠른 연속 편집 검증과 사용성 개선. 파일을 거대하게 합치지 말고 저장/선택/명령 hook 경계를 유지합니다.
4. 페이지 복제/삭제/복원·정렬/폴더, 충돌 비교 및 내 변경을 별도 revision/분기로 보관하는 UX.
5. 현재 목록 상한(프로젝트 200, 페이지 500)을 넘길 때 pagination. UI/Spec schema version 변경 시 migration 설계.

## 후속 단계

| 단계 | 상태 / 주요 내용 |
| --- | --- |
| Phase 1 Foundation | 진행 중. 위 실제 구현과 남은 편집 조작·실 OIDC 확인 참고 |
| Phase 2 Production Builder | 미착수. 전체 컴포넌트, Theme/Design Token 편집, Templates, 재사용 Instance, Assets, 공유 관리, 버전 조회/복원 |
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
