# 파일 서비스 적용

근거: 사용자가 추가한 [file-service.md](../eocs/agent/integrations/file-service.md). 이전 소비 앱 이름 `mudeora`는 짭그마 프로젝트/페이지에 매핑합니다.

## 책임과 호출

- 외부 `https://file.shnea.kr`: 파일 본문 보관, 미리보기, 다운로드, 보존 정책.
- 짭그마: 세션/CSRF, OWNER·EDITOR 권한, 형식·크기 검사, 업로드 서버 프록시, 프로젝트 fileId 연결, 페이지 Spec 참조 검증.
- 브라우저 → `POST /api/files/upload?projectId=<UUID>` (`file` multipart 단일 파일) → 외부 `POST /files/upload`.
- API multipart는 메모리 버퍼를 사용합니다. Nginx도 업로드 요청을 디스크에 보관하지 않도록 구성합니다. 파일 본문을 DB/볼륨에 저장하지 않습니다.
- `project_files`에는 fileId, 이름, MIME, 크기, 업로더를 저장합니다. 페이지 `props.attachment`에는 fileId/name/mimeType만 남깁니다. 페이지 저장 시 프로젝트에 등록된 참조인지 검사합니다.
- 외부 업로드 성공 후 DB 실패·요소 삭제·응답 유실이면 미참조 파일이 남을 수 있습니다. 자동 재업로드하지 않으며 외부 보존 정책에 맡깁니다. 삭제 API 계약이 없어 임의 API를 만들지 않습니다.

## 설정

| 변수 | 범위 / 동작 |
| --- | --- |
| FILE_SERVICE_BASE_URL | 서버 런타임, 기본 https://file.shnea.kr. 운영은 이 origin만 허용 |
| FILE_SERVICE_BEARER_TOKEN | 서버 전용 JWT. 빈 값이면 설정 안내/503, 로컬 저장 우회 없음 |
| UPLOAD_MAX_BYTES | 서버 런타임, 기본 10485760, 1–10485760. Nginx multipart 제한 11 MiB |

토큰은 `https://bearer.shnea.kr/`에서 별도로 준비해 `.env`에 설정합니다. 브라우저 환경변수·번들·로그에 넣지 않습니다. 개발 Compose도 같은 변수명을 받습니다. 앞단 HTTPS 프록시의 허용 크기도 11 MiB 이상이어야 합니다.

형식: PNG/JPEG/GIF/WebP/PDF/TXT/CSV/JSON. 확장자/MIME과 바이너리 헤더 또는 UTF-8/JSON 내용을 검사합니다. SVG/HTML과 임의 실행 파일은 허용하지 않습니다. 악성코드 검사 엔진이나 완전한 파일 구조 분석은 아닙니다.

## 미리보기·오류

- 프로젝트 권한/참조 확인 후 외부 preview를 확인합니다. `202`는 준비 중으로 표시하고 최대 5회, 2초 간격 확인 후 수동 재확인을 제공합니다.
- 이미지는 외부 preview URL을 사용합니다. CSP는 `https://file.shnea.kr` 이미지를 허용합니다. 다운로드는 권한 확인 후 외부 URL로 303 이동합니다.
- 외부 URL 자체는 지침상 **공개**입니다. 앱 권한을 외부 파일 비공개 보장으로 설명하지 않습니다. 업로드 UI에도 표시합니다.
- 외부 401 → 앱 503 설정 오류, 413 → 크기 초과, 507 → 저장 공간 부족, 기타/연결 실패 → 안전한 502. 로그에는 연동명/상태만 남깁니다. timeout 20초, 업로드 자동 재시도 없음.
- 외부 보존 정책으로 삭제된 이미지는 만료 가능성과 재확인을 안내합니다.

## 실제 연동 전에 확인할 사항

1. **Multipart 성공 응답 JSON 예시**: 지침에 envelope가 없습니다. 현재 `{fileId}` 또는 `{files:[{fileId}]}` 단일 파일 응답만 인식하며 나머지는 502입니다. 확인 대기인 호환 가정입니다.
2. **보존 분류 전송 계약**: 권장 분류 `editor`의 필드/헤더가 없습니다. 임의 필드를 보내지 않으며 현재 외부 기본 보존 정책을 따릅니다. `EDITOR_RETENTION_CATEGORY` 변수는 실제 동작에 연결하지 않았습니다.
3. 실제 JWT와 201/202/다운로드/만료·외부 크기 제한 확인. 현재 테스트는 격리된 모의 서비스이며 실제 외부 업로드 검증이 아닙니다.

기존 로컬 저장 구현이 없어 파일 본문 이전은 필요하지 않습니다. `002_project_files.sql`은 테이블 추가입니다. 새 요소/첨부를 저장한 뒤 이전 앱으로 되돌리면 이전 Spec 검증기는 이를 알지 못하므로 페이지 편집 호환성을 확인해야 합니다.
