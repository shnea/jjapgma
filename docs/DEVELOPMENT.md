# 개발과 검증

모든 설치·검사·빌드·테스트는 Docker에서 실행합니다. 호스트 Node 설치는 요구하지 않습니다. 다음 세션은 [PROGRESS.md](PROGRESS.md), 변경 영역의 구현과 지침을 먼저 읽습니다.

## 실행

| 목적 | 루트에서 실행 |
| --- | --- |
| 개발 앱 | docker compose -f compose.dev.yaml up -d --build --wait |
| 상태 / 로그 | docker compose -f compose.dev.yaml ps / logs --tail=100 |
| 개발 중지 (데이터 보존) | docker compose -f compose.dev.yaml down |
| 전체 검증 Windows | ./scripts/verify.ps1 |
| 전체 검증 macOS/Linux | sh scripts/verify.sh |
| 검사 이미지 빌드만 | docker compose -f compose.test.yaml build |
| 실행 환경을 둔 검사 | docker compose -f compose.test.yaml up --abort-on-container-exit --exit-code-from test test |
| 검사 환경 정리 | docker compose -f compose.test.yaml down --remove-orphans |

스크립트는 종료 시 테스트 환경을 정리합니다. 테스트 DB는 tmpfs이며 정리 시 폐기됩니다. 개발/운영 DB를 재사용하지 않습니다. 테스트 환경에는 외부 OIDC 비밀값을 넣지 않습니다.

개발 Compose는 `.env`의 `APP_URL`, `DEV_AUTH_BYPASS`, OIDC Client 설정과 refresh token 암호화 키를 읽습니다. 값이 없으면 localhost:30137 / 개발 우회가 기본값입니다. HTTPS 도메인을 통한 실 로그인은 [로그인 연결](LOGIN_INTEGRATION.md)을 따릅니다. 테스트 Compose의 격리 설정에는 영향을 주지 않습니다.

LAN의 프록시가 개발 앱에 접속해야 하면 `.env`에 `NGINX_BIND_ADDRESS=0.0.0.0`, `NGINX_HTTP_PORT=30137`을 설정하고 Nginx를 재생성합니다. 바인딩 변수가 없으면 `127.0.0.1`에서만 받습니다. 현재 NPM upstream은 `http://192.168.0.55:30137`이며, DB 바인딩은 변경하지 않습니다.

## 검증 내용

- 속성 패널 회귀는 컨테이너의 그리드 설정 미노출, 실제 아이콘 선택, 방향별 여백과 모바일 요소 정렬의 저장/재접속, 표 열 순서·숨김·셀 붙여넣기·체크박스·번호·검색·카드 표시와 보기 전용을 검사합니다. 새 표 구조의 서버 저장 거부와 오프라인 HTML ZIP의 이미지·배지·선택·모바일 열 제외도 확인합니다. Inspector 실제 Story에서 대비·라벨·키보드 입력을 검증합니다.

- Dockerfile build: 공통 명세·API 컴파일, Vite 운영 빌드.
- npm run build는 export.vite.config.ts로 공통 렌더러의 runtime.js/styles.css를 만든 뒤 웹을 빌드합니다. apps/web/public/export는 생성물이며 Git/Docker 입력에서 제외합니다. 운영 이미지에는 빌드 단계에서 생성된 파일이 포함됩니다.
- test 이미지: Storybook 정적 빌드, Chromium과 OS 의존성 설치.
- npm run lint: oxlint.
- npm run typecheck: 공통 명세/API/웹 타입 검사.
- npm test: 잘못된 트리, 순환 이동, 중복 ID, 부모 잠금, 반응형, 입력 제한.
- npm run test:api: 실제 PostgreSQL과 HTTP로 미인증/권한/CSRF/격리/충돌/마이그레이션 검사.
- npm run test:e2e: Chromium에서 프로젝트 생성 → 페이지 편집 → 반응형 → 저장 → 새로고침.
- 추가 회귀: 캔버스 기존 요소의 순서/부모 이동·잠금·복원, 64종 카탈로그, 첨부 업로드/한글 파일명/프로젝트 참조. 테스트 Compose의 file-service는 격리된 계약 fixture이며 개발/운영에는 포함하지 않습니다. 외부 실 연동은 별도 확인합니다.
- npm run test:stories: 실제 Storybook 산출물의 입력·disabled·키보드·반응형과 axe 접근성 검사.
- 산출물: test-results/의 screenshot, 실패 trace. Git에서 제외합니다.
- 컨트롤 회귀: 달력 시·분 표시와 숨겨진 값, 오늘/취소, 표 행·열 설정 저장, 모바일 스타일 상속, 라디오 라벨 위치, 스켈레톤, 고정 화살표, 확대된 캔버스 드롭을 검사합니다.
- HTML 내보내기는 ZIP을 풀고 offline Chromium에서 file://index.html을 열어 CSS·이미지·스크립트·반응형 동작을 검증합니다.

검증 결과와 미검증 항목은 PROGRESS.md에 기록합니다. mock/개발 우회와 실제 외부 로그인 성공을 혼동하지 않습니다.

공유 검사는 auto/email 모드, 첫 로그인 연결, 기존 세션의 권한 회수, 소유자 전용 관리/삭제, 초대 만료/취소/재사용, notify 실패/중복 접수, 메일 링크의 로그인 왕복과 명시적 수락을 포함합니다. 테스트의 file-service fixture가 notify 접수 API도 격리해서 제공하며 실제 메일은 발송하지 않습니다. 환경변수와 사용법은 [공유 계약](SHARING.md)을 따릅니다.

## 개발 원칙

템플릿 패널 검사는 공식/개인 목록 검색·미리보기·빈 상태·오류 재시도·보기 전용, 기존 내용/테마 보존 삽입·Undo/Redo·개인 저장/삭제·재사용을 포함합니다. API에서 계정 격리·CSRF·원본/대상 편집 권한·위조 파일·원본 프로젝트 삭제 이후 개인 파일 참조 보존을 검사합니다. 우측 패널은 포인터/키보드 조절·새로고침 유지·좁은 화면 제한을 확인합니다.

페이지 라이브러리 검사는 삭제된 페이지 접근 제한·버전 보존·선택 버전 복원·stale 저장 차단, 모든 템플릿의 생성/독립 노드 ID/모바일 그리드, 테마 토큰 검증·Undo·저장/새로고침·명시적 스타일 우선순위를 포함합니다. HTML ZIP을 offline Chromium에서 열어 같은 테마가 표시되는지도 확인합니다. 생성/복원 대화상자는 실제 Storybook 컴포넌트로 키보드 포커스·접근성을 검사합니다.

프로젝트 탐색 회귀는 상단 선택 상자 전환, 공유 도착 후 목록 갱신, 사용자별 알림·읽음 유지·취소 시 숨김, 페이지 이름과 편집 중 내용 동시 저장, 마지막 페이지 삭제 후 빈 화면을 검사합니다. 페이지 삭제의 VIEWER/비멤버 차단, revision 충돌, 버전 기록 삭제도 격리 DB에서 확인합니다. 새 공통 UI는 Storybook에서 키보드 포커스와 접근성을 검사합니다. API 검사들은 같은 Nginx 주소를 사용하므로 요청 간격을 두며 실제 요청 제한을 해제하지 않습니다.

- 프로젝트와 API는 기능별 모듈로, 웹은 기능별 컴포넌트·hook으로 나눕니다.
- 계약과 tree 검증은 packages/ui-spec을 재사용합니다. 다른 기능을 위해 Spec 복사본을 만들지 않습니다.
- 공통 UI를 바꾸면 실제 컴포넌트 Story와 관련 검사를 함께 갱신합니다.
- 코드 포맷은 Prettier. 새 파일도 읽기 쉬운 형태로 유지합니다.
- 의존성은 정확한 버전과 lockfile로 고정하며 Docker에서 갱신합니다.
- 실패를 숨기는 검사 옵션이나 모의 성공 응답을 만들지 않습니다.
- 외부 연동 지침의 실제 파일과 적용 범위를 확인합니다.
- Git은 main과 짧은 작업 브랜치. 사용자 변경은 보존하고 강제 push하지 않습니다.
- 하루가 끝나면 완료/진행/남은 작업, 검증, 다음 시작점과 관련 커밋을 기록합니다.

## 다른 CPU에서 빌드

개발·검사는 호스트 Docker의 Linux 아키텍처를 사용합니다. 운영 이미지 발행은 scripts/publish.sh 또는 publish.ps1에서 기본 linux/amd64를 명시합니다. macOS Apple Silicon에서 이 빌드는 Docker의 에뮬레이션 지원이 필요합니다. 멀티플랫폼 발행은 PLATFORMS=linux/amd64,linux/arm64로 선택할 수 있습니다. 실제 ARM64 검증 여부는 진행 기록에 별도로 남깁니다.


AI/MCP 검사는 공식 SDK 클라이언트와 격리 n8n fixture를 사용해 조회/쓰기 범위, 연결 폐기, 요청 페이지 제한, 채팅 기록 격리, 제안 미리보기/단일 버전 적용/중복 적용 방지/충돌을 검증합니다. 모달·다이얼로그·Non-modal은 긴 스크롤 중앙 배치, 배경 입력 허용 차이, 드래그/위치 복귀, 투명 닫기 버튼과 HTML ZIP 동작을 검사합니다. 실제 n8n 설정 절차는 [N8N_SETUP.md](N8N_SETUP.md).

채팅 회귀는 템플릿 없는 create_page의 실제 요소·빈 제안 거부, Markdown/XSS·말풍선·시간·내부 스크롤·Enter/Shift+Enter·한글 IME, 이미지 파일 참조/권한/MIME·n8n 처리 확인과 미확인 제안 적용 차단을 포함합니다. 공식 chat 템플릿 삽입·메시지 속성 저장/재접속·오프라인 ZIP도 같은 렌더러로 검증합니다. 모의 n8n의 이미지 다운로드 성공과 실제 모델의 이미지 이해 품질 검증은 구분합니다.
계정 검사는 `tests/api/account.test.mjs`, 수집기 fixture 검사는 `tests/api/usage-collector.test.mjs`, 실제 저장/재접속은 `tests/e2e/account.spec.ts`, 화면/접근성은 `tests/stories/account.spec.ts`에 있습니다. 실모델 토큰 확인은 사용자 관리 n8n에서 별도로 진행합니다.
