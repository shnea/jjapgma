# 짭그마 아키텍처

React 웹 + NestJS 모듈형 단일 API + PostgreSQL. 기능을 파일·모듈로 분리하고 UI 명세의 원본은 서버에 저장합니다.

## 코드 경계

| 경로 | 책임 |
| --- | --- |
| apps/web/src/features/auth | 로그인 진입 |
| apps/web/src/features/projects | 워크스페이스 |
| apps/web/src/features/editor | 페이지 연결, Palette, Layers, Inspector, NodeRenderer, history |
| apps/web/src/components/ui | 실제 공통 UI와 Stories |
| apps/web/src/lib, styles | HTTP/오류/타입, 앱 토큰과 스타일 |
| apps/api/src/auth | OIDC, 암호화, 세션, Guard |
| apps/api/src/projects | 프로젝트/멤버십 인가 |
| apps/api/src/pages | 페이지/Revision 트랜잭션 |
| apps/api/src/database | 연결, 잠금 기반 마이그레이션, SQL |
| apps/api/src/common | HTTP 입력 검증과 안전한 오류 |
| packages/ui-spec/src/registry.ts | 등록 가능한 기본 요소와 속성 정의 |
| packages/ui-spec/src/schema.ts | 버전 1 UI Spec, 제한과 검증 |
| packages/ui-spec/src/tree.ts | 불변 트리 편집, 잠금, 복제, 이동 |
| infra/nginx | 웹과 API 진입점 |
| tests | API/권한, 실제 브라우저, Stories |

## 책임과 데이터

- Registry는 렌더링 함수와 분리된 컴포넌트 정의입니다. Inspector의 내용 속성은 스키마에서 생성합니다. 모양/배치 공통 편집기는 현재 직접 구성하며 향후 스키마화를 확장합니다.
- Canvas와 Preview는 동일 NodeRenderer와 Spec을 사용합니다. Layer Tree·Inspector도 같은 상태를 편집합니다.
- 현재 UI Spec은 schemaVersion 1, root container. 최대 2,000 nodes, 깊이 40, ID 유일성, 자식 허용 규칙과 style allowlist를 검증합니다.
- 반응형은 기본 style + 선택한 breakpoint의 override입니다. Desktop UI는 기본 style을 편집하고 Tablet/Mobile은 override를 편집합니다. 사용자 지정 breakpoint는 후속 작업입니다.
- 사용자 식별은 issuer + sub. 내부 권한은 매 요청마다 DB 멤버십을 검사합니다. 외부 이메일로 권한을 추론하지 않습니다.
- 관계형 프로젝트/페이지/멤버 메타데이터 + 페이지 UI Spec JSONB. page_revisions는 저장마다 불변 기록을 추가합니다.
- 저장은 행 잠금 → ACL → baseRevision 비교 → 명세/Revision/Audit 업데이트를 한 트랜잭션으로 처리합니다.
- 수정 중 자동 저장 응답은 이후 편집을 덮어쓰지 않습니다. Undo/Redo는 최대 100개 편집 상태를 보유하며 저장 Revision과 분리됩니다.

## 외부 연동

- 로그인: 외부 login-service. 토큰을 브라우저 저장소에 넣지 않고 서버에서 검증합니다. 세션 키는 해시로, refresh token은 AES-GCM으로 암호화하여 DB에 저장합니다.
- 갱신은 세션 행 잠금으로 직렬화하고 실패 시 세션을 폐기합니다. 실제 제공자의 rotation 계약은 등록 후 검증해야 합니다.
- AI: n8n 전용 endpoint를 사용할 예정. 앱 내 Provider 직접 호출은 구현하지 않습니다. MCP·AI 화면 수정은 후속 단계입니다.
- 기본 미리보기는 입력·체크박스 같은 로컬 동작만 지원합니다. API Action·Binding 실행을 의미하지 않습니다.

## 배포와 확장

Nginx 정적 웹 / API / DB의 3개 상시 컨테이너와 일회성 마이그레이션 작업. 브라우저 테스트·Storybook은 테스트 이미지에만 포함합니다. API와 Nginx는 non-root입니다. 운영 서버는 설정 파일 두 개로 이미지를 가져오며 데이터는 Docker 볼륨에 존재합니다.

공유 UI·명세를 중복 저장하는 구조, 거대한 전역 서비스, 모듈 간 직접 DB 수정 확산을 피합니다. 향후 MCP는 API의 동일 서비스/권한/트랜잭션을 재사용합니다. Export가 무거워지면 그 실행만 worker로 분리합니다.
