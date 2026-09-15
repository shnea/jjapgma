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

Docker의 npm registry 조회로 제공 버전을 확인했습니다. 참고: [Node 릴리스](https://nodejs.org/en/about/previous-releases), [Nest ESM/런타임](https://docs.nestjs.com/migration-guide), [Vite](https://vite.dev/guide/), [Storybook](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon).

## 환경

| 항목 | 개발 | 운영 |
| --- | --- | --- |
| 웹 | http://localhost:30137 | https://jjapgma.shnea.kr |
| Nginx | 127.0.0.1:30137 → 8080 | 기본 0.0.0.0:30137 → 8080; 기존 프록시에서 전달 |
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
| Client ID / 유형 | jjapgma-web / confidential |
| Callback | https://jjapgma.shnea.kr/auth/callback |
| 로그아웃 복귀 | https://jjapgma.shnea.kr/logout-callback |
| Scope | openid profile basic offline_access |
| Grant | authorization_code, refresh_token |
| 시작 / 종료 | /auth/login, POST /api/auth/logout |
| 서버 비밀 | OIDC_CLIENT_SECRET, REFRESH_TOKEN_ENCRYPTION_KEY (32 bytes hex) |

사용자가 등록 후 Secret을 운영 .env에 설정합니다. 로컬 실 OIDC를 검사하려면 개발 origin에 맞는 별도 Callback 등록이 필요합니다. 개발용 우회는 development/test + 명시적 플래그에서만 가능하며 내부 사용자/세션/프로젝트 ACL은 동일합니다.

## 외부 연동 적용

| 기능 | 지침 | 외부 책임 / 앱 책임 | 상태 |
| --- | --- | --- | --- |
| 인증 | eocs/agent/integrations/login-service.md | 외부 가입·인증·IdP 토큰; 앱 callback·서명/state/nonce/PKCE 검증·세션·권한 | 코드 구현, 실제 IdP 검증 대기 |
| AI | eocs/agent/integrations/외부서비스_ai-agent-api_사용지침.md | n8n의 모델 호출·프롬프트; 앱 명세·권한·MCP·검증 | 연동 구현 전 |
| 파일 | eocs/agent/integrations/file-service.md | 외부 파일 본문/preview/download/보존; 앱 권한·프록시·프로젝트 참조 | 코드/모의 검증 완료, 실제 응답/JWT/보존 분류 계약 확인 대기. [상세](FILE_INTEGRATION.md) |

AI 공식 endpoint는 https://n8n.shnea.kr/webhook/jjapgma. 현재 제공 계약은 messages → 자연어 응답이며 MCP와 Canvas 편집은 아직 외부에서 지원하지 않습니다. Provider 직접 호출이나 자체 우회는 하지 않습니다. 필요한 n8n 작업은 사용자에게 구체적으로 전달합니다.

## 운영 전 남은 설정

- OIDC 등록·Secret·실제 로그인/refresh/logout 검증.
- 레지스트리 push/pull 자격과 최초 이미지 발행.
- 운영 DB 접속 허용 대역·DB 비밀번호·세션 암호화 키.
- 백업 대상 저장소·일정·보관 기간과 허용 손실/복구 시간, 실제 복원 연습.
- AI 단계에서 Webhook 인증과 사용자 범위 MCP 계약.
