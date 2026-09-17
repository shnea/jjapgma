# 짭그마 프로젝트 설정

현재 설정 기준. 비밀값은 기록하지 않습니다. 진행 현황은 [PROGRESS.md](PROGRESS.md).

## 제품과 위임

- 이름: jjapgma / 짭그마
- 목적: 공통 UI Tree를 사람이 편집하고 Storybook·MCP로 개발에 연결하는 플랫폼.
- 전체 요구: [base.md](../base.md). Phase 1부터 기능별로 완결하며 다음 세션에 이어갑니다.
- 저장소: http://git.shnea.kr/shnea/jjapgma.git (서버에서 HTTPS로 리다이렉트).
- 담당: shnea. 로컬 구현·Docker 검증·진행 공유·배포 준비를 진행합니다. n8n 수정은 필요한 작업을 사용자에게 전달합니다.
- 기존 운영 프록시가 HTTPS를 종료하고 앱 Nginx의 HTTP 30137로 전달합니다.

## 기술 선택 — 2026-09-15

| 도구 | 고정 버전/위치 |
| --- | --- |
| Node / npm | 24.21.0 / 11.19.0; .node-version, package.json, Dockerfile digest |
| NestJS | 12.0.3, ESM / 기능별 모듈 |
| React / Vite | 19.3.0 / 8.3.0 |
| TypeScript | 7.0.2 |
| Storybook | 10.6.0, React Vite adapter |
| 브라우저 테스트 | Playwright 1.63.0 + axe-core |
| DB 접근 / 명세 | PostgreSQL 17, pg 8.23.0 / Zod 4.6.5 |
| DB / Nginx 이미지 | Compose / Dockerfile의 manifest digest로 고정 |
| 기타 정확한 버전 | package.json과 package-lock.json |

채팅 Markdown은 2026-09-16 Docker npm registry 조회로 확인한 react-markdown 10.1.0 + remark-gfm 4.0.1을 정확한 버전으로 고정합니다. [ReactMarkdown 공식 문서](https://github.com/remarkjs/react-markdown)의 안전한 기본 파서와 GFM 표·목록 지원을 사용하며 raw HTML 플러그인은 넣지 않습니다.

Docker의 npm registry 조회로 제공 버전을 확인했습니다. 참고: [Node 릴리스](https://nodejs.org/en/about/previous-releases), [Nest ESM/런타임](https://docs.nestjs.com/migration-guide), [Vite](https://vite.dev/guide/), [Storybook](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon).

## 환경

| 항목 | 개발 | 운영 |
| --- | --- | --- |
| 웹 | http://localhost:30137 | https://jjapgma.shnea.kr |
| Nginx | 기본 127.0.0.1:30137 → 8080; 현재 .env에서 0.0.0.0:30137로 LAN 프록시 허용 | 기본 0.0.0.0:30137 → 8080; 기존 프록시에서 전달 |
| API | api:3000; 외부 포트 없음 | 동일; /api, /auth 경유 |
| DB 내부 | db:5432/jjapgma_dev | db:5432/jjapgma |
| DB 외부 | 127.0.0.1:30138 | 기본 127.0.0.1:30138; 허용 관리 IP/대역은 운영 전 결정 |
| CPU | 호스트의 Linux 아키텍처 | linux/amd64 명시 |
| Compose | compose.dev.yaml | compose.yaml + .env |
| 영속 데이터 | Docker named volume | Docker named volume |
| 추가 포트 | 필요할 때만 30139부터 | 동일 |

테스트는 compose.test.yaml의 별도 DB를 tmpfs로 사용하며 호스트 포트를 열지 않습니다. 운영·개발 볼륨을 테스트에 연결하지 않습니다. Redis·큐·별도 MCP 서버·n8n 컨테이너는 현재 추가하지 않습니다.

## 인증 등록

| 항목 | 값 |
| --- | --- |
| Issuer | https://login.shnea.kr |
| Client ID / 유형 | jjapgma / confidential; 2026-09-16 사용자 로그인 정상 확인 |
| Callback | https://jjapgma.shnea.kr/auth/callback |
| 로그아웃 복귀 | https://jjapgma.shnea.kr/logout-callback |
| Scope | openid profile basic offline_access |
| Grant | authorization_code, refresh_token |
| 시작 / 종료 | /auth/login, POST /api/auth/logout |
| 서버 비밀 | OIDC_CLIENT_SECRET, REFRESH_TOKEN_ENCRYPTION_KEY (32 bytes hex) |

현재 HTTPS 프록시는 http://192.168.0.55:30137의 개발 앱으로 전달합니다. 개발 Compose도 .env의 APP_URL·DEV_AUTH_BYPASS·OIDC 설정을 받으며, 현재 APP_URL=https://jjapgma.shnea.kr, DEV_AUTH_BYPASS=false로 적용했습니다. 콜백은 APP_URL에서 생성합니다. 등록값·적용 명령·검증은 [로그인 연결](LOGIN_INTEGRATION.md)을 따릅니다. 개발용 우회는 development/test + 명시적 플래그에서만 가능합니다.

## 외부 연동 적용

| 기능 | 지침 | 외부 책임 / 앱 책임 | 상태 |
| --- | --- | --- | --- |
| 인증 | eocs/agent/integrations/login-service.md | 외부 가입·인증·IdP 토큰; 앱 callback·서명/state/nonce/PKCE 검증·세션·권한 | 사용자 실로그인 및 이메일 소유 확인 보장 확인. [상세](LOGIN_INTEGRATION.md) |
| 공유 메일 | eocs/agent/integrations/notify_서비스_연동지침.md | 외부 메일 발송; 앱 공유 대상·권한·초대 수락/취소·내부 알림함 | 2026-09-16 사용자 실제 공유 이메일 정상 확인. SHARE_APPROVAL_MODE=auto/email, NOTIFY_API_URL/TOKEN 사용. [계약](SHARING.md) |
| AI | eocs/agent/integrations/외부서비스_ai-agent-api_사용지침.md | n8n의 모델 호출·프롬프트; 앱 명세·권한·MCP·검증 | 2026-09-16 사용자 실제 답변 수신·MCP를 통한 로그인 페이지 생성/적용 확인. 템플릿 없는 새 화면 구성은 후속 보완. [계약](AI_MCP.md) |
| 파일 | eocs/agent/integrations/file-service.md | 외부 파일 본문/preview/download/보존; 앱 권한·프록시·프로젝트 참조 | 2026-09-16 사용자 실연동 정상 확인. 기존 설정 유지. [상세](FILE_INTEGRATION.md) |

AI 공식 endpoint는 https://n8n.shnea.kr/webhook/jjapgma. 제공 지침의 초기 messages → 자연어 응답 계약을 유지하면서 사용자가 AI Agent·OpenRouter Chat Model·MCP Client Tool·Respond to Webhook을 연결했습니다. 실제 답변과 템플릿 기반 페이지 생성/적용을 확인했습니다. Provider 직접 호출이나 자체 우회는 하지 않습니다. 필요한 n8n 변경은 사용자에게 전달합니다.

## 운영 전 남은 설정

2026-09-17 사용자 요청: AI 채팅 참고 이미지는 `category=month`를 외부 파일 서비스에 전달해 한 달 보관 정책을 선택합니다. 일반 편집기 업로드와 기존 파일에는 적용하지 않습니다. 대화 닫기는 앱 DB의 `010_ai_thread_close.sql`로 보존 상태를 관리합니다. 상세 계약은 [파일](FILE_INTEGRATION.md), [AI 채팅](AI_MCP.md)을 따릅니다.

페이지 복원·공식/개인 템플릿·화면 테마는 해당 외부 구현 지침이 없어 앱의 공통 UI Spec과 PostgreSQL에서 제공합니다. AI 지침의 향후 MCP 템플릿/테마 조회와 현재 구현을 구분합니다. 새 환경변수 없이 005·006 마이그레이션으로 적용합니다. 개인 템플릿의 파일 본문/미리보기는 기존 file-service 계약을 유지하고 앱은 개인 소유권과 파일 참조를 관리합니다. [사용법·데이터 보존](PAGE_LIBRARY.md).

- 실제 refresh/logout 왕복 검증. 로그인 성공은 사용자 확인 완료.
- 레지스트리 push/pull 자격과 최초 이미지 발행.
- 운영 DB 접속 허용 대역·DB 비밀번호·세션 암호화 키.
- 백업 대상 저장소·일정·보관 기간과 허용 손실/복구 시간, 실제 복원 연습.
- n8n 실모델의 VIEWER 권한·공유 취소 경계와 복잡한 화면 생성 품질 추가 검증.


AI 설정: AI_ENABLED=false가 기본이며 AI_WEBHOOK_TOKEN과 AI_MCP_TOKEN은 서로 다른 서버 전용 비밀값입니다. 활성화 전 [n8n 설정](N8N_SETUP.md)을 적용합니다. 개인 프로젝트 MCP는 AI_ENABLED와 독립적으로 사용할 수 있습니다.
