# 운영 배포·복구

## 구조

기존 HTTPS 프록시 → 서버 HTTP 30137 → 짭그마 Nginx:8080 → API:3000. DB는 내부 db:5432, 관리용 외부 포트 30138. API와 추가 관리 포트를 직접 공개하지 않습니다. 운영 DB 기본 바인딩은 loopback이며 허용 네트워크가 정해지면 .env와 호스트 방화벽에 반영합니다.

서버에는 compose.yaml과 .env만 배포합니다. 설정·웹 산출물·마이그레이션은 이미지 안에 있고 DB 데이터는 named volume에 있습니다. 업로드 본문은 외부 file-service가 보관합니다. [파일 설정/실연동 대기](FILE_INTEGRATION.md)를 확인하고 앞단 프록시 업로드 제한도 11 MiB 이상으로 맞춥니다.

## 이미지 발행 — 개발 컴퓨터

1. Docker registry 자격을 구성합니다: docker login registry.shnea.kr.
2. 릴리스할 코드를 커밋합니다. 스크립트는 dirty working tree를 거부합니다.
3. Windows는 ./scripts/publish.ps1, macOS/Linux는 sh scripts/publish.sh.
4. 전체 Docker 검증 후 api와 nginx 이미지를 동일 12자리 commit 태그로 push합니다.
5. 두 이미지가 모두 발행되어야 그 태그를 배포합니다. 운영 .env의 IMAGE_TAG에 기록합니다.

기본 target은 linux/amd64. Apple Silicon에서도 운영 target을 명시합니다. PLATFORMS 또는 PowerShell -Platforms로 추가 아키텍처를 지정할 수 있습니다. 태그 덮어쓰기는 하지 않고 새 commit 태그를 사용합니다. 실제 push와 운영 배포는 검증 기록을 확인한 뒤 수행합니다.

## 최초 배포 준비

- .env.example을 바탕으로 서버 .env를 작성하고 접근 권한을 제한합니다.
- DB_PASSWORD와 DATABASE_URL의 password를 일치시킵니다. URL 안의 특수문자는 percent encoding합니다.
- OIDC 등록과 비밀값을 넣습니다. 암호화 키는 안전하게 생성한 32 bytes를 64자리 hex로 저장합니다.
- 운영 모드는 HTTPS와 실제 OIDC를 강제하며 개발 우회 활성화를 거부합니다.
- 외부 프록시가 Host를 보존하고 30137로 전달하도록 구성합니다. 쿠키 보안은 APP_URL의 HTTPS 기준으로 결정되며 임의 전달 헤더를 신뢰하지 않습니다.
- 운영용 compose에는 build 지시어와 로컬 소스 bind mount가 없습니다.
- 최초 로그인 전에 DB 백업·복구 책임, 저장소와 보관 기간을 정합니다.

## 배포 — 서버에서

```sh
docker compose config --quiet
docker compose pull
docker compose up -d --wait db
docker compose run --rm migrate
docker compose up -d --no-deps --force-recreate --wait api nginx
docker compose ps
```

마이그레이션은 advisory lock으로 직렬화되고 파일 checksum을 검사합니다. 수정된 기존 마이그레이션은 거부하고 새 SQL 파일로 변경합니다. 마이그레이션 실패 시 이후 명령을 실행하지 않습니다. 앱과 Nginx를 함께 재생성하여 변경된 API 컨테이너 주소를 반영합니다. 이 초기 배포는 짧은 중단이 있을 수 있으며 무중단 배포를 보장하지 않습니다.

정상 확인: 외부 https://jjapgma.shnea.kr/api/health, OIDC 로그인 → 프로젝트/페이지 저장 → 새로고침. API 내부 liveness는 /api/health/live이며 readiness와 구분합니다. 컨테이너 unhealthy만으로 자동 복구가 보장되지는 않습니다.

## 롤백

- 이전 IMAGE_TAG와 두 이미지 digest를 배포 기록에 보관합니다.
- DB와 이전 앱의 호환성을 먼저 확인하고 .env를 이전 태그로 바꿉니다.
- docker compose pull 후 api/nginx를 위와 같이 재생성하고 health·핵심 흐름을 확인합니다.
- 자동 down migration이나 데이터 삭제는 하지 않습니다. DB 복원은 별도 승인된 복구 작업입니다.

## 백업과 운영 전 남은 일

Docker named volume은 백업이 아닙니다. 운영 데이터가 생기기 전 별도 저장소·주기·보관 기간·접근 권한·RPO/RTO를 정하고 별도 DB로 복원 연습을 수행합니다.

PostgreSQL custom-format 백업은 실행 예로 docker compose exec -T db pg_dump -U jjapgma -d jjapgma -Fc를 사용할 수 있습니다. 호스트에서 출력 파일을 저장할 때 바이너리 보존이 되는 shell/방식을 사용합니다. 백업과 함께 세션 암호화 키 복구 정책도 필요합니다.

현재 실제 운영 배포, registry push/pull, 외부 TLS/OIDC, 운영 백업·복원은 미검증입니다. AI 단계에는 인증된 n8n Webhook과 프로젝트 범위 MCP 연동을 추가 검증합니다.
