# Phase 1 HTTP 계약

API는 같은 origin의 `/api`. JSON 입력·응답, 최대 body 2 MiB. 변경 요청은 세션 쿠키 + 정확한 `Origin` + `X-CSRF-Token`이 필요합니다. CSRF 토큰은 로그인 후 `/api/auth/me`에서 받습니다.

파일 업로드만 multipart 단일 `file`로 받으며 기본 파일 한도는 10 MiB입니다. 외부 401/413/507 및 preview 202 처리는 [파일 연동 계약](FILE_INTEGRATION.md)을 참고합니다.

| Method / 경로 | 입력 | 결과 / 권한 |
| --- | --- | --- |
| GET `/api/auth/config` | 없음 | 개발 로그인 사용 가능 여부 |
| POST `/api/auth/dev` | 없음, Origin 필수 | 개발 환경에서만 세션 생성 |
| GET `/auth/login` | 없음 | 외부 OIDC로 이동 |
| GET `/auth/callback` | code, state, login cookie | 검증 후 내부 세션 생성 |
| GET `/api/auth/me` | 세션 | id, displayName(이메일 앞부분), email(없으면 null), csrfToken |
| POST `/api/auth/logout` | 세션/CSRF | 세션 삭제 후 이동할 redirect |
| GET `/api/projects` | 세션 | 접근 가능한 프로젝트, role, pageCount; 최신순 최대 200 |
| POST `/api/projects` | name(1–100), description(0–1000, 선택) | 프로젝트와 OWNER 멤버십 생성 |
| GET `/api/projects/:id` | UUID | 접근 가능한 프로젝트와 role |
| DELETE `/api/projects/:id` | UUID | OWNER만 삭제 |
| GET `/api/projects/:id/sharing` | UUID | OWNER만 mode, members, invitations 조회 |
| POST `/api/projects/:id/sharing` | email, role(EDITOR/VIEWER) | OWNER만 auto 공유 또는 email 초대. 갱신된 공유 목록 |
| PATCH `/api/projects/:id/members/:userId` | role(EDITOR/VIEWER) | OWNER만 비소유자 권한 변경 |
| DELETE `/api/projects/:id/members/:userId` | UUID | OWNER만 비소유자 공유 취소 |
| PATCH `/api/projects/:id/invitations/:invitationId` | role(EDITOR/VIEWER) | OWNER만 대기 초대 권한 변경 |
| DELETE `/api/projects/:id/invitations/:invitationId` | UUID | OWNER만 대기 초대 취소 |
| POST `/api/projects/:id/invitations/:invitationId/retry` | 없음 | OWNER만 유효한 메일 초대 접수 재시도, 동일 멱등 키 |
| POST `/api/invitations/preview` | token | 대상 이메일의 로그인 계정만 초대 정보 조회; 권한 부여 없음 |
| POST `/api/invitations/accept` | token | 대상 이메일의 로그인 계정만 만료 전 수락; projectId 반환 |
| GET `/api/notifications` | 세션 | 본인의 공유 알림 items(최신 100개), unreadCount; 취소된 공유 제외 |
| PATCH `/api/notifications/read-all` | 세션/CSRF | 본인의 현재 공유 알림 모두 읽음 |
| PATCH `/api/notifications/:id/read` | UUID, 세션/CSRF | 본인 알림 읽음; 타인/취소된 알림 404 |
| GET `/api/projects/:id/pages` | UUID | id/name/revision/updated_at 목록; 생성순 최대 500 |
| POST `/api/projects/:id/pages` | name(1–100), templateId(선택) | 빈 페이지 또는 등록 템플릿으로 revision 1 생성; OWNER/EDITOR |
| GET `/api/pages/:id` | UUID | 페이지 전체, spec, revision, role |
| PUT `/api/pages/:id` | name, baseRevision(양의 정수), spec | 검증 후 새 revision; OWNER/EDITOR |
| DELETE `/api/pages/:id` | baseRevision(양의 정수) | 삭제 상태로 숨김, 버전 보존; OWNER/EDITOR, 최신 revision 불일치 시 409 |
| GET `/api/projects/:id/deleted-pages` | UUID | 삭제된 페이지 id/name/revision/deleted_at, 최신 500개; OWNER/EDITOR |
| GET `/api/pages/:id/revisions` | before(선택, 양의 정수) | before보다 작은 버전 내림차순 최대 50개; 삭제된 페이지는 OWNER/EDITOR |
| GET `/api/pages/:id/revisions/:revision` | 양의 정수 | 버전의 name/spec; 삭제된 페이지는 OWNER/EDITOR |
| POST `/api/pages/:id/restore` | baseRevision, revision(복원 원본, 양의 정수) | 삭제된 페이지 복원, 새 revision과 role 반환; OWNER/EDITOR, 상태 충돌 409 |
| GET `/api/health/live` | 없음 | 프로세스 liveness |
| GET `/api/templates` | 세션 | 본인 템플릿 id/name/created_at, 최신순 최대 100개 |
| POST `/api/templates` | name(1–100), sourcePageId, spec | 원본 OWNER/EDITOR, 명세·파일 검증 후 개인 스냅샷; 계정 최대 100개 |
| GET `/api/templates/:id` | 세션, UUID | 소유자만 id/name/spec/created_at; 타인/없는 템플릿 404 |
| POST `/api/templates/:id/use` | projectId | 소유자 및 대상 OWNER/EDITOR; 파일 참조를 대상에 연결하고 명세 반환. 페이지 저장은 별도 |
| DELETE `/api/templates/:id` | 세션/CSRF, UUID | 소유자만 삭제. 기존 페이지·프로젝트 파일은 유지 |
| GET `/api/templates/:id/files/:fileId/preview` | 세션 | 소유자와 템플릿 파일 연결 확인 후 외부 preview 호출 |
| GET `/api/health` | 없음 | DB 접근 확인 readiness |
| GET `/api/files/config` | 세션 | enabled, maxBytes; 토큰 값 반환 없음 |
| POST `/api/files/upload?projectId=<UUID>` | 세션/CSRF, multipart `file` | 외부 업로드 후 fileId/name/mimeType; OWNER/EDITOR |
| GET `/api/projects/:id/files/:fileId/preview` | 세션/프로젝트 파일 참조 | ready/previewUrl, 외부 202는 ready=false |
| GET `/api/projects/:id/files/:fileId/download` | 세션/프로젝트 파일 참조 | 외부 공개 다운로드 URL로 303 |

오류: `{statusCode, message}`. 잘못된 입력/Spec 400, 세션 없음·만료 401, CSRF/쓰기 권한 403, 없는/접근 불가 프로젝트·페이지 404, 오래된 revision 409. 예기치 않은 서버 오류는 내부 정보 없는 500.

Spec 실행 계약은 `packages/ui-spec/src/schema.ts`, 컴포넌트 정의는 `registry.ts`입니다. 공유의 환경변수·수락/취소·메일 접수 의미는 [공유 계약](SHARING.md)을 따릅니다. 현재 목록 상한을 넘는 프로젝트/페이지를 지원하려면 pagination을 먼저 구현합니다.


채팅·MCP 연결·변경 제안 API는 [AI/MCP 계약](AI_MCP.md)에 정리합니다. MCP 개인 인증과 n8n 서비스 인증은 세션 쿠키와 분리하며 저장 전 제안 검토를 거칩니다.

| AI 제안 적용 | 입력 | 결과 |
| --- | --- | --- |
| GET `/api/proposals/:id/review` | 세션, 본인 제안 UUID | 제안과 `review: {revision, merged, conflicts}`. merged는 name/spec 또는 충돌 시 null |
| POST `/api/proposals/:id/apply` | 세션/CSRF, 선택 `mode: merge\|overwrite`, `expectedRevision` | 기존 페이지에 mode 지정 시 검토한 최신 revision 필수. merge는 독립 변경 병합, overwrite는 제안 전체로 교체. 새 버전 생성·기존 버전 보존. 검토 후 변경/병합 충돌 409. mode 생략은 기존 base_revision 검사 유지 |

AI 채팅 POST는 선택적인 `imageFileId`를 받습니다. OWNER/EDITOR의 프로젝트 파일 참조, 이미지 MIME과 5 MB 제한을 검사합니다. 조회 결과의 run에는 `created_at`, `completed_at`(기존 실행은 null), `image` 파일 참조가 포함됩니다. 원본 이미지나 외부 인증 토큰을 DB에 저장하지 않습니다.
## 계정 API

`PATCH /api/account/profile`은 본인 닉네임(중복 허용, 최대 40자, null 초기화)을 저장한다. `GET /api/account/usage?offset=0`은 본인의 오늘/이번 달/전체 실제 토큰과 요청별 내역을 조회한다. `POST /api/ai/usage/:runId`는 요청별 Bearer 토큰으로 사용량을 중복 없이 기록한다. 세부 인증·검증·응답은 [ACCOUNT_USAGE.md](ACCOUNT_USAGE.md), 외부 수집 설정은 [N8N_USAGE_SETUP.md](N8N_USAGE_SETUP.md).
