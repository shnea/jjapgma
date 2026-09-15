# Phase 1 HTTP 계약

API는 같은 origin의 `/api`. JSON 입력·응답, 최대 body 2 MiB. 변경 요청은 세션 쿠키 + 정확한 `Origin` + `X-CSRF-Token`이 필요합니다. CSRF 토큰은 로그인 후 `/api/auth/me`에서 받습니다.

| Method / 경로 | 입력 | 결과 / 권한 |
| --- | --- | --- |
| GET `/api/auth/config` | 없음 | 개발 로그인 사용 가능 여부 |
| POST `/api/auth/dev` | 없음, Origin 필수 | 개발 환경에서만 세션 생성 |
| GET `/auth/login` | 없음 | 외부 OIDC로 이동 |
| GET `/auth/callback` | code, state, login cookie | 검증 후 내부 세션 생성 |
| GET `/api/auth/me` | 세션 | id, displayName, csrfToken |
| POST `/api/auth/logout` | 세션/CSRF | 세션 삭제 후 이동할 redirect |
| GET `/api/projects` | 세션 | 접근 가능한 프로젝트, role, pageCount; 최신순 최대 200 |
| POST `/api/projects` | name(1–100), description(0–1000, 선택) | 프로젝트와 OWNER 멤버십 생성 |
| GET `/api/projects/:id` | UUID | 접근 가능한 프로젝트와 role |
| GET `/api/projects/:id/pages` | UUID | id/name/revision/updated_at 목록; 생성순 최대 500 |
| POST `/api/projects/:id/pages` | name(1–100) | 초기 Spec과 revision 1; OWNER/EDITOR |
| GET `/api/pages/:id` | UUID | 페이지 전체, spec, revision, role |
| PUT `/api/pages/:id` | name, baseRevision(양의 정수), spec | 검증 후 새 revision; OWNER/EDITOR |
| GET `/api/health/live` | 없음 | 프로세스 liveness |
| GET `/api/health` | 없음 | DB 접근 확인 readiness |

오류: `{statusCode, message}`. 잘못된 입력/Spec 400, 세션 없음·만료 401, CSRF/쓰기 권한 403, 없는/접근 불가 프로젝트·페이지 404, 오래된 revision 409. 예기치 않은 서버 오류는 내부 정보 없는 500.

Spec 실행 계약은 `packages/ui-spec/src/schema.ts`, 컴포넌트 정의는 `registry.ts`입니다. 공유 관리·복원·MCP·AI는 아직 미구현입니다. 현재 목록 상한을 넘는 프로젝트/페이지를 지원하려면 pagination을 먼저 구현합니다.
