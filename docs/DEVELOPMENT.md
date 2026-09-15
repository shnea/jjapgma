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

## 검증 내용

- Dockerfile build: 공통 명세·API 컴파일, Vite 운영 빌드.
- test 이미지: Storybook 정적 빌드, Chromium과 OS 의존성 설치.
- npm run lint: oxlint.
- npm run typecheck: 공통 명세/API/웹 타입 검사.
- npm test: 잘못된 트리, 순환 이동, 중복 ID, 부모 잠금, 반응형, 입력 제한.
- npm run test:api: 실제 PostgreSQL과 HTTP로 미인증/권한/CSRF/격리/충돌/마이그레이션 검사.
- npm run test:e2e: Chromium에서 프로젝트 생성 → 페이지 편집 → 반응형 → 저장 → 새로고침.
- 추가 회귀: 캔버스 기존 요소의 순서/부모 이동·잠금·복원, 64종 카탈로그, 첨부 업로드/한글 파일명/프로젝트 참조. 테스트 Compose의 file-service는 격리된 계약 fixture이며 개발/운영에는 포함하지 않습니다. 외부 실 연동은 별도 확인합니다.
- npm run test:stories: 실제 Storybook 산출물의 입력·disabled·키보드·반응형과 axe 접근성 검사.
- 산출물: test-results/의 screenshot, 실패 trace. Git에서 제외합니다.

검증 결과와 미검증 항목은 PROGRESS.md에 기록합니다. mock/개발 우회와 실제 외부 로그인 성공을 혼동하지 않습니다.

## 개발 원칙

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
