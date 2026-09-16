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
| apps/api/src/sharing | 이메일 공유, 초대 수락/취소, notify 발송 접수 |
| apps/api/src/notifications | 사용자별 공유 알림과 읽음 상태, 현재 멤버십 기준 조회 |
| apps/web/src/features/notifications | 상단 알림 목록, 읽음 처리, 프로젝트 이동 |
| apps/api/src/pages | 페이지/Revision 트랜잭션 |
| apps/api/src/templates | 계정별 템플릿 스냅샷·소유권·파일 참조 재사용 |
| apps/api/src/files | 파일 서비스 client, 업로드 검사/권한, 프로젝트 참조 검증 |
| apps/web/src/features/editor/elements, files | 분류별 요소 렌더러, 첨부 업로드/미리보기 |
| packages/ui-spec/src/catalog, drop.ts | 요소 분류별 정의, Canvas 드래그 삽입/이동 규칙 |
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
- HTML ZIP도 같은 NodeRenderer를 사용합니다. export/runtime.tsx를 별도 IIFE 스크립트와 CSS로 빌드하여 파일로 바로 실행합니다. 수작업 HTML 렌더러와의 스타일/동작 불일치를 없앴습니다. 빌드 설정은 [Vite Library Mode](https://vite.dev/guide/build.html#library-mode)를 따릅니다.
- Storybook ZIP은 StorybookScreen에서 같은 NodeRenderer를 React 외부 의존 ESM/CSS로 빌드해 제공합니다. 현재 프로젝트 모든 페이지·전체 Registry·공식/개인 템플릿을 CSF Story로 생성하고 권한 확인 후 복사한 파일을 staticDirs에 포함합니다. [범위와 실행](STORYBOOK_EXPORT.md).
- 날짜 표시와 폼 값, 표 크기, 반응형 및 ZIP 계약은 [컨트롤 동작](UI_CONTROLS.md)을 따릅니다. 새 속성은 선택 사항으로 추가하여 기존 schemaVersion 1 문서를 유지합니다.
- 현재 UI Spec은 schemaVersion 1, root container. 최대 2,000 nodes, 깊이 40, ID 유일성, 자식 허용 규칙과 style allowlist를 검증합니다.
- 표의 선택적 `props.table`은 열 ID 기반 셀 데이터, 기기별 숨김, 셀 종류와 표시 설정을 함께 보관합니다. `packages/ui-spec/src/table.ts`가 기존 줄/파이프 데이터 변환과 검증을 담당하며 중복 ID·없는 열 참조·허용 범위 밖 설정을 거부합니다. DB 마이그레이션 없이 페이지/버전/개인 템플릿 JSON에 포함합니다.
- 속성 패널은 ContentFields·StyleControls·TableEditor로 나눕니다. 모바일 스타일 보정은 공통 `effectiveStyle`, 표 표시와 상호작용은 TableElement를 사용하여 캔버스·미리보기·HTML ZIP이 같은 구현을 실행합니다. 표 이미지도 기존 같은 사이트 이미지 내보내기 방식으로 ZIP에 포함합니다.
- 반응형은 기본 style + 선택한 breakpoint의 override입니다. Desktop UI는 기본 style을 편집하고 Tablet/Mobile은 override를 편집합니다. 사용자 지정 breakpoint는 후속 작업입니다.
- 폼의 `field-control`은 일반 입력·달력·범위의 동일한 입력 상자 기준입니다. 가로 영역의 선택적 `style.controlAlignment`는 `input`(생략 시 기본) / `layout`이며, 공통 렌더러가 라벨/설명을 제외한 중심을 맞춥니다. 계산한 위치는 전용 CSS 변수로만 반영하여 React의 명시적 스타일과 저장된 Spec을 덮어쓰지 않습니다. 기존 schemaVersion 1을 유지하고 DB 마이그레이션은 필요하지 않습니다.
- 사용자 식별은 issuer + sub. 소유자가 입력한 이메일을 login-service가 소유 확인한 이메일과 매칭해 명시적인 멤버십을 부여하며, 이후 권한은 내부 사용자 ID로 유지합니다. 매 요청마다 DB 멤버십을 검사하며 공유 관리는 OWNER만 허용합니다. [공유 계약](SHARING.md).
- 관계형 프로젝트/페이지/멤버 메타데이터 + 페이지 UI Spec JSONB. page_revisions는 저장마다 불변 기록을 추가합니다.
- 공유 연결 트랜잭션에서 user_notifications를 함께 생성합니다. 사용자/초대별 중복을 막고, 조회 시 현재 멤버십과 초대 수락 상태를 검사합니다. notify 지침은 외부 발송 계약이므로 앱 내부 알림함과 읽음 상태는 앱 DB에서 관리합니다.
- 페이지 삭제는 OWNER/EDITOR와 baseRevision을 확인한 후 deleted_at으로 숨기고 버전 기록을 보관합니다. 복원은 행 잠금 후 선택 버전을 새 revision으로 복사합니다. 프로젝트 자체 삭제는 OWNER만 가능합니다. [복원·템플릿·테마](PAGE_LIBRARY.md).
- 템플릿 목록/생성기와 선택적 theme 스키마는 공통 ui-spec 패키지에 있습니다. 서버가 등록된 템플릿 ID를 검증하여 새 명세를 생성하고, NodeRenderer가 명시적 요소 스타일보다 낮은 우선순위로 테마를 적용합니다. HTML ZIP도 같은 테마 CSS와 렌더러를 사용합니다.
- 공식 템플릿은 5개 그룹·22개이며 기존 ID를 보존합니다. 공통 조립 함수는 template-parts, 추가 화면 생성기는 template-builders로 분리합니다. chart/wizard는 독립 Registry 요소로 등록해 Inspector·MCP·저장·HTML ZIP에 같은 명세를 사용합니다. wizard의 입력과 단계 상태는 브라우저 미리보기 상태이며 업무 데이터 저장을 대신하지 않습니다.
- 팔레트 그리드 생성/캔버스 행·열 변경은 공통 grid.ts의 createGrid/resizeGrid를 사용합니다. 셀은 기존 container이며 별도 저장 타입이 없습니다. 슬롯을 행/열 좌표로 보존하고 비어 있지 않거나 잠긴 셀의 제거를 거절합니다. 전체 변경은 editSpec 검증과 편집기 history를 통과합니다. MCP는 기존 grid+container 추가 명세로 같은 구조를 구성합니다.
- 편집 패널의 공식 템플릿도 공통 Registry를 사용합니다. 개인 템플릿은 사용자 소유 명세 스냅샷과 template_files 메타데이터로 저장하고 원본 프로젝트 수명과 분리합니다. 서버는 생성 시 원본 편집 권한·파일 연결을, 재사용 시 소유권·대상 편집 권한을 검사합니다. 파일 본문/미리보기는 기존 file-service 계약을 유지합니다.
- 저장은 행 잠금 → ACL → baseRevision 비교 → 명세/Revision/Audit 업데이트를 한 트랜잭션으로 처리합니다.
- 수정 중 자동 저장 응답은 이후 편집을 덮어쓰지 않습니다. Undo/Redo는 최대 100개 편집 상태를 보유하며 저장 Revision과 분리됩니다.

## 외부 연동

- 로그인: 외부 login-service. 토큰을 브라우저 저장소에 넣지 않고 서버에서 검증합니다. 세션 키는 해시로, refresh token은 AES-GCM으로 암호화하여 DB에 저장합니다.
- 갱신은 세션 행 잠금으로 직렬화하고 실패 시 세션을 폐기합니다. 실제 제공자의 rotation 계약은 등록 후 검증해야 합니다.
- AI: n8n 전용 endpoint를 사용하며 Provider 직접 호출은 하지 않습니다. 채팅·프로젝트 MCP·변경 제안과 버전 적용을 구현했고 사용자 실제 n8n 답변·템플릿 페이지 생성/적용을 확인했습니다. [AI/MCP](AI_MCP.md).
- 기본 미리보기는 입력·체크박스 같은 로컬 동작만 지원합니다. API Action·Binding 실행을 의미하지 않습니다.
- 파일 본문은 외부 file-service에 저장합니다. 이미지·첨부 입력은 서버 업로드 프록시와 project_files에 연결됩니다. [파일 계약](FILE_INTEGRATION.md)과 [64종 요소 구현 수준](COMPONENT_COVERAGE.md)을 구분합니다.

## 배포와 확장

Nginx 정적 웹 / API / DB의 3개 상시 컨테이너와 일회성 마이그레이션 작업. 브라우저 테스트·Storybook은 테스트 이미지에만 포함합니다. API와 Nginx는 non-root입니다. 운영 서버는 설정 파일 두 개로 이미지를 가져오며 데이터는 Docker 볼륨에 존재합니다.

공유 UI·명세를 중복 저장하는 구조, 거대한 전역 서비스, 모듈 간 직접 DB 수정 확산을 피합니다. 향후 MCP는 API의 동일 서비스/권한/트랜잭션을 재사용합니다. Export가 무거워지면 그 실행만 worker로 분리합니다.


## AI 채팅과 MCP

NestJS AiModule은 공식 MCP SDK의 stateless Streamable HTTP를 제공하며 n8n 실행 범위와 개인 프로젝트 연결을 같은 도구로 처리합니다. 대화·작업·제안은 007 마이그레이션에 저장하고 PagesService의 동일 트랜잭션으로 적용합니다. 세션/CSRF 관리 API와 Bearer MCP 인증을 분리합니다. 상세 범위와 외부 설정은 [AI/MCP](AI_MCP.md).

AI 설계 문맥은 여러 컴포넌트의 필요한 속성과 공통 스타일을 묶어 조회하며, 공개 도구 스키마 축소와 실제 입력 검증을 분리합니다. API 정상 종료는 ChatService의 접수 차단·진행 요청 중단·실패 기록을 먼저 완료한 뒤 Nest/DB를 닫습니다. 실행 추적은 프로세스별이며 다른 인스턴스의 실행을 일괄 실패 처리하지 않습니다.

ChatMessage/ChatComposer는 AI 패널과 UI Spec의 chat 요소·공식 chat 템플릿·HTML 내보내기가 공유합니다. GFM 렌더링은 react-markdown/remark-gfm을 사용합니다. 실제 대화 저장/n8n 전송은 AiChatPanel에 연결하고, 빌더의 chat 요소는 편집 가능한 예시 데이터와 로컬 미리보기를 제공합니다. 참고 이미지는 기존 project_files의 참조를 ai_runs.context에 보관하며 008에서 실행 완료 시각을 추가합니다.

main 공식 템플릿은 일반 container/sidePanel/navbar/searchBox 요소로 구성합니다. sidePanel은 같은 자식을 모바일 drawer로 표시하고 기존 ScopedOverlay의 범위·포커스·액션을 재사용합니다. 페이지별 NavigationProvider가 검색어를 대상 메뉴 ID별로 분리하고 cloneNode/MCP 템플릿 변환이 내부 검색 참조를 재매핑합니다. carousel은 일반 자식 트리를 슬라이드로 렌더링하며 설계 값과 현재 페이지·재생 상태를 분리합니다. 같은 렌더러를 HTML 내보내기에서도 사용합니다. [속성과 동작](MAIN_LAYOUT.md).

## 개인 프로필과 사용량 원장

닉네임은 OIDC 기본 이름과 분리한 users.nickname에 저장한다. ai_usage_runs/calls는 대화·프로젝트 수명과 분리하며 본인 세션만 조회한다. 요청 수락 시 보고 토큰의 해시를 생성하고 n8n이 실제 모델 호출별 토큰을 보고한다. 합산은 호출 ID로 중복 방지하며 미제공 값은 추정하지 않는다. [ACCOUNT_USAGE.md](ACCOUNT_USAGE.md) 참고.
