# 지침 유지보수와 공식 자료

검토일: **2026-09-13**. 아래 버전 사실은 이 날짜의 확인 결과이며 앞으로 사용할 버전을 영구 고정하는 규칙이 아니다.

## 버전 선택·업데이트

- 신규 프로젝트는 선택한 프레임워크와 호환되는 지원 중인 안정 버전을 사용한다. 런타임은 운영 지원 기간을 확인한다.
- 최초 선택 시 정확한 버전·확인일·근거를 [프로젝트 설정](PROJECT_SETUP.md)에 기록하고 lockfile·runtime 파일·빌드 wrapper·이미지 식별자로 재현한다.
- 설치·생성 도구의 최소 버전과 앱 실행 최소 버전이 다를 수 있다. 로컬·CI·이미지 모두 함께 확인한다.
- 기존 프로젝트의 major 버전은 작업과 무관하게 올리지 않는다. 업그레이드는 공식 migration guide와 변경 범위를 확인하고 별도 검증한다.
- 의존성 갱신은 월 1회 정도 점검을 기본으로 하고, 노출된 보안 취약점과 지원 종료는 영향에 맞춰 우선 처리한다. 모든 경고를 무시하거나 무조건 강제 업그레이드하지 않는다.
- 외부 문서를 확인할 수 없으면 확인 실패와 사용한 기존 근거를 기록한다. 확인하지 않은 최신 버전·명령·SHA를 만들어 쓰지 않는다.

## 검토 시 확인한 변화

| 영역 | 확인 결과와 반영 |
| --- | --- |
| Node.js | 20은 EOL이며 24가 LTS로 표시됨. 기존 Node 20 이미지·무제한 engines 기본값 제거. 새 프로젝트는 도입 시 지원 상태와 호환되는 patch를 다시 확인. [공식 릴리스](https://nodejs.org/en/about/previous-releases) |
| NestJS | 현재 migration guide는 12의 ESM 패키지와 CLI/앱의 서로 다른 Node 최소 조건을 설명. 기존 Nest 10 고정 예제를 제거하고 생성 시 CLI·runtime·모듈 형식 호환을 확인. [공식 migration guide](https://docs.nestjs.com/migration-guide) |
| Vite | 공개 환경변수는 클라이언트에 노출되므로 서버 secret과 분리. [공식 환경변수 안내](https://vite.dev/guide/env-and-mode) |
| Storybook | 앱 프레임워크에 맞는 adapter와 Vite 기반 Vitest addon의 호환 조건을 확인하고 실제 테스트 연결을 요구. [공식 테스트 문서](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon) |
| Compose | 최상위 version은 obsolete. 프로젝트 이름과 실제 런타임별 구성으로 작성. [공식 명세](https://docs.docker.com/reference/compose-file/version-and-name/) |
| 에이전트 지침 | Codex는 경로에 따른 AGENTS.md를 조합하며 문서 크기 한도가 있음. 진입 문서는 짧게 두고 필요한 상세 문서만 읽도록 구성. 다른 에이전트의 자동 로딩은 해당 도구에서 확인. [공식 AGENTS.md 안내](https://learn.chatgpt.com/docs/agent-configuration/agents-md) |

## 필요할 때 참고할 자료

이 목록을 매 작업마다 전부 열지 않는다.

- CI 권한·action 고정·외부 PR 처리: [GitHub Actions 보안](https://docs.github.com/en/actions/reference/security/secure-use)
- 객체·테넌트 접근 경계: [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- 로그인 연동: [OWASP OAuth2](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)
- 접근성 검사 연결: [Storybook 접근성 테스트](https://storybook.js.org/docs/writing-tests/accessibility-testing)
- Tailwind 사용 시 토큰 설정: [Tailwind theme](https://tailwindcss.com/docs/theme)

공식 문서는 기술 동작의 근거다. 이 템플릿의 브랜치 방식·문서 구성·도입 조건은 간결한 개발을 위한 기본 정책이며 프레임워크의 의무 사항이 아니다.

## 지침이 다시 비대해지지 않게 하기

- 같은 규칙은 한 문서에 두고 나머지는 링크한다. 현재 선택은 설정표, 구조는 아키텍처, 선택 이유는 결정 기록, 절차는 개발/운영 가이드에 둔다.
- 구현하지 않는 기능의 빈 문서·예제 폴더를 늘리지 않는다. 사용자가 넣는 `eocs/agent/integrations/`의 기능별 지침은 [적용 규칙](INTEGRATIONS.md)에 따라 구현 기준으로 사용한다. 공통 보안과 기능별 API 계약을 중복 작성하지 않는다.
- 기본 규칙의 예외가 계속 반복되면 규칙 자체를 고친다. “항상 질문”, “항상 ADR”, “항상 전면 테스트”를 기본값으로 만들지 않는다.
- 실제 코드·scripts·CI와 문서를 함께 갱신한다. 연결된 Markdown 경로와 복사 후 독립 사용 가능 여부를 점검한다.
- 버전·API·보안·배포 기본값을 갱신할 때 관련 공식 자료를 다시 확인하고 이 문서의 검토일·변경 근거도 갱신한다.
