# 개발과 검증

앱 의존성 설치·빌드·테스트는 Docker에서 실행합니다. 호스트 Node 설치는 필요하지 않습니다. 분석용 스킬은 호스트에서 실행할 수 있지만 앱의 고정 의존성과 검증 환경은 Docker를 기준으로 합니다.

## 실행

| 목적 | 저장소 루트에서 실행 |
| --- | --- |
| 개발 앱 | `docker compose -f compose.dev.yaml up -d --build --wait` |
| 상태 / 로그 | `docker compose -f compose.dev.yaml ps` / `logs --tail=100` |
| 개발 중지, 데이터 보존 | `docker compose -f compose.dev.yaml down` |
| 전체 검증 Windows | `./scripts/verify.ps1` |
| 전체 검증 macOS/Linux | `sh scripts/verify.sh` |
| 테스트 이미지 빌드 | `docker compose -f compose.test.yaml build` |
| 전체 검사 직접 실행 | `docker compose -f compose.test.yaml up --abort-on-container-exit --exit-code-from test test` |
| 테스트 환경 정리 | `docker compose -f compose.test.yaml down --remove-orphans` |

검증 스크립트는 종료 시 테스트 환경을 정리합니다. PowerShell 실행 정책으로 스크립트가 차단되면 위의 빌드·전체 검사·정리 명령을 순서대로 실행하고 각 종료 코드를 확인합니다.

테스트 DB는 tmpfs이며 정리 시 폐기됩니다. 개발/운영 볼륨·OIDC 비밀값을 연결하지 않습니다. file-service와 n8n·notify는 `tests/fixtures/file-service.mjs`의 계약 fixture로 대체하며 실제 업로드·메일·모델 호출 검증과 구분합니다.

## 필요한 검사 선택

변경된 동작의 기존 검사를 먼저 실행합니다. 공통 렌더러·저장·권한 등 영향이 넓은 변경과 발행 전에는 전체 검증을 실행합니다.

| 명령 / 경로 | 확인 범위 |
| --- | --- |
| `npm run lint`, `npm run typecheck` | 웹/API/UI Spec 정적 검사 |
| `npm test` / `packages/ui-spec/src/*.test.ts` | 트리·스키마·반응형·표·그리드 등 공통 명세 |
| `npm run test:api` / `tests/api/` | PostgreSQL·HTTP·세션·권한·충돌·외부 계약 |
| `npm run test:e2e` / `tests/e2e/` | 실제 앱의 편집·저장·재접속·다운로드 |
| `npm run test:stories` / `tests/stories/` | 실제 Story 컴포넌트·키보드·반응형·axe |
| `npm run build`, `npm run build-storybook` | 앱·공통 내보내기 렌더러·Storybook 빌드 |

위 npm 명령은 **테스트 컨테이너 안에서** 실행합니다. 특정 E2E 파일을 검사하는 예:

```sh
docker compose -f compose.test.yaml build
docker compose -f compose.test.yaml up -d --wait nginx
docker compose -f compose.test.yaml run --rm test npm run test:e2e -- builder.spec.ts
docker compose -f compose.test.yaml down --remove-orphans
```

- API 검사는 공유 Nginx 요청 한도를 지키도록 `--test-concurrency=1`로 실행합니다. 테스트 편의를 위해 운영 요청 제한을 완화하지 않습니다.
- 화면 검사는 `tests/e2e/helpers.ts`의 `openSpec`으로 독립 계정·세션을 준비합니다. 로그인 버튼부터 시작하는 검사는 별도로 유지합니다.
- HTML/Storybook 내보내기는 실제 ZIP을 풀어 같은 렌더러·자산·반응형 동작을 확인합니다. Storybook ZIP 빌드에 테스트 이미지의 의존성을 사용했다면 새 환경의 `npm install` 검증과 구분합니다.
- `test-results/`의 캡처·실패 trace와 빌드 산출물은 Git에서 제외합니다. 실패 원인을 고친 뒤 관련 검사를 다시 실행하고 결과는 [진행 현황](PROGRESS.md)에 기록합니다. 세부 과거 결과는 [작업 이력](PROGRESS_HISTORY.md)에 있습니다.

## 환경과 소스 관리

개발 Compose는 `.env`에서 APP_URL·DEV_AUTH_BYPASS·OIDC와 암호화 키를 읽습니다. 기본값은 localhost:30137 / 개발 우회입니다. HTTPS 실 로그인과 프록시 설정은 [프로젝트 설정](PROJECT_SETUP.md), [로그인 연결](LOGIN_INTEGRATION.md)을 따릅니다.

`npm run build`는 HTML·Storybook 내보내기 렌더러를 생성한 뒤 웹을 빌드합니다. `apps/web/public/export` 등 생성물은 Git/Docker 입력에서 제외하며, 운영 이미지에는 빌드 단계에서 생성한 파일이 포함됩니다.

개발·검사는 호스트 Docker의 Linux 아키텍처를 사용합니다. `scripts/publish.sh` / `publish.ps1`은 기본 `linux/amd64`로 발행합니다. 다른 CPU의 교차 빌드·멀티플랫폼 발행은 [운영 가이드](OPERATIONS.md)를 따르고 실제 기기 검증과 구분합니다.

- `main`과 짧은 작업 브랜치를 사용하고 사용자 변경·공유 이력을 보존합니다.
- 기존 feature·hook·공통 UI Spec 경계를 재사용합니다. 같은 명세나 렌더러를 복사하지 않습니다.
- 의존성은 정확한 버전과 lockfile로 고정합니다. Prettier는 변경한 파일에만 적용합니다.
- 기능별 계약은 해당 기능 문서에, 실행 절차는 이 문서에, 날짜별 검증·제약은 PROGRESS에 기록합니다. 세 곳에 같은 작업 일지를 반복하지 않습니다.
