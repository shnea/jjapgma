# 짭그마 진행 현황

마지막 갱신: 2026-09-19. 사용자 소유 UI Tree를 편집하고 저장·미리보기·내보내기·AI 제안으로 연결하는 빌더입니다. 전체 제품 완성으로 간주하지 않습니다.

환경·외부 연결의 현재 값은 [PROJECT_SETUP](PROJECT_SETUP.md), 실행은 [DEVELOPMENT](DEVELOPMENT.md), 기능 책임은 [ARCHITECTURE](ARCHITECTURE.md)를 확인합니다. 날짜별 상세 이력은 [PROGRESS_HISTORY](PROGRESS_HISTORY.md)에 보존했습니다. 과거의 “미구현·연결 대기” 문구를 현재 상태로 적용하지 않습니다.

## 후속 수정 — 화면 하단의 서식 편집기 메뉴

- 원본 데모와 비교해 `/` → 위 방향키로 마지막 Emoji가 선택되지만 목록 밖으로 숨는 현상을 다시 조사했습니다. 항목 누락이 아니라 위치 계산 중 상속된 메뉴 높이가 반복 변경되면서 스크롤 위치가 줄어드는 문제였습니다. 패키지 변경이 필요하다는 이전 판단을 정정합니다.
- 앱의 `RichTextSurface`에서 계산된 메뉴 높이를 프레임마다 직접 반영하고, 높이·선택 항목이 바뀔 때 해당 목록 안에서만 스크롤을 보정합니다. 기존 패키지의 항목·키보드 처리·위/아래 배치를 유지하며 마우스 휠 스크롤도 허용합니다. 패키지 소스·버전은 바꾸지 않았습니다.
- 화면 하단 `BottomEditor` Story와 회귀 검사를 추가했습니다. 500px에서 320px로 줄어드는 화면과 낮은 본문 편집 모달에서 마지막 항목 표시, 휠 스크롤, 메뉴 재열기, Emoji 선택·삽입을 검사합니다.
- 검증: `docker compose -f compose.test.yaml build test`, 테스트 컨테이너의 `npm run lint && npm run typecheck && npm run test:stories -- rich-text.spec.ts` 통과(관련 Story 검사 4개). 최신 테스트 파일을 읽기 전용 마운트한 재검사에서도 4개 통과했습니다. 메뉴 닫힘 애니메이션 종료를 기다리도록 테스트를 보완한 뒤 `--grep 'slash menu' --repeat-each=3`도 3회 통과했습니다. 캡처는 `test-results/stories/rich-text-slash-menu-*/slash-last-{bottom-editor,design}.png`에 있습니다. 개발/운영 배포·추가 커밋/푸시는 수행하지 않았습니다.

## 후속 수정 — n8n Agent 지침 동기화

- `infra/n8n/system-prompt.txt`에 richText 선택 기준, 문서 작성/공지 템플릿, 본문 JSON·파일 참조, tmp/default 책임 구분을 추가했습니다. 일반 문구는 heading/text를 유지하고 최신 MCP 명세를 기준으로 선택하도록 안내합니다.
- MCP `operationGuide`도 같은 규칙으로 갱신했습니다. 파일 ID 생성·기존 tmp 자동 승격·업무 API 자동 연결을 주장하지 않도록 명시했습니다. `N8N_SETUP.md`에 API 배포와 System Message 교체·게시 및 새 대화 확인 절차를 기록했습니다.
- 검증: 최신 `design-context.ts`를 기존 Docker 테스트 이미지에 읽기 전용 마운트하여 `npm run lint && npm run typecheck` 통과(오류·경고 0), `git diff --check` 통과. 안내 문구 변경으로 별도 테스트를 추가하지 않았습니다. 외부 n8n의 설정 변경·실모델 호출·앱 배포는 수행하지 않았습니다.

## 후속 수정 — 서식 편집기 메뉴와 실제 서비스 업로드

- 본문 편집의 `/image`·`/file` 메뉴와 업로드 패널이 native dialog 뒤로 숨는 문제를 수정했습니다. 패키지의 해당 에디터 `portalElement`를 모달 안에 연결합니다. 별도 파일 첨부 버튼은 제거하고 패키지의 업로드 흐름을 사용합니다. Escape로 메뉴를 닫아도 본문 편집 창은 유지됩니다.
- 페이지 공통 버튼·입력 스타일에서 서식 편집기 내부를 제외했습니다. 33%·50%·100%·원본 버튼의 여백/높이를 정리하고 모바일 화면 경계와 캔버스 축소 배율을 반영해 메뉴 위치를 보정합니다. 실제 ImageControls Story를 추가했습니다.
- 컴포넌트·템플릿 작성 업로드는 `tmp`입니다. 실제 소비 서비스의 새 업로드는 `Screen.richText` / `window.jjapgmaRichText`로 연결하며 multipart에 file만 넣어 default 정책을 사용합니다. 소비 백엔드도 category를 생략해야 합니다. 본문 변경 콜백·업로드 오류 안내를 제공하고 인증·업무 저장·파일 소유권은 소비 서비스가 맡습니다. 기존 tmp 파일은 자동 승격하지 않습니다.
- [소비 서비스 연결 설명서](RICH_TEXT_RUNTIME.md)를 HTML·Storybook ZIP의 `RICH_TEXT.md`로 함께 내보냅니다. Docker 입력에서 이 문서 하나만 포함하도록 예외를 두었습니다. 패키지·DB·환경변수 변경은 없습니다.
- 검증: 앱/HTML/Storybook 빌드, lint 오류·경고 0, typecheck, 전체 Story 50개, 파일 API 5개, 관련 E2E 3개 통과. E2E는 모달 안의 실제 `/image` 업로드와 tmp 전달, 저장·undo·재조회·오프라인 자산, 두 내보내기 형식의 소비 서비스 업로드(category 생략)·본문 변경·실패 안내를 확인합니다. 배율 버튼 네 가지를 데스크톱/390px에서 조작하고 잘림을 검사했습니다.
- 실행: `docker compose -f compose.test.yaml build`, `up -d --wait nginx`; 테스트 컨테이너에서 `npm run lint && npm run typecheck && npm run test:stories`, `node --test --test-concurrency=1 tests/api/files.test.mjs && npm run test:e2e -- rich-text.spec.ts storybook-export.spec.ts`. 파일 서비스와 소비 서비스 요청은 fixture/브라우저 mock이며 실제 default 보관 기간을 검사한 것은 아닙니다.
- 캡처: `test-results/e2e/rich-text-*/{slash-menu-in-dialog,upload-panel-in-dialog}.png`, `test-results/stories/rich-text-image-size-*/image-controls-*.png`, `test-results/refactor/{slash-final,image-zoom-final}.png`. 최종 메뉴·모바일 캡처와 65% 축소 캔버스를 확인했습니다. 개발/운영 서비스 배포·추가 커밋/푸시는 하지 않았습니다.

## 추가 작업 — 서식 편집기·문서 템플릿

- 사용자 추가 `eocs/agent/integrations/editor.md`에 따라 `@shnea/blocknote@0.1.5`의 Editor/Viewer를 사용합니다. 기본 팔레트 `richText`, 본문 편집/적용, 표시 모드·기본 글꼴·이미지 확대와 공통 디자인 속성을 연결했습니다. 문서 작성·공지 안내 공식 템플릿 2종을 추가해 총 24종입니다. [별도 설명서](RICH_TEXT_EDITOR.md).
- 기존 UI Spec의 documentJson(빈 문자열/UTF-8 128 KiB), richTextFiles에 저장합니다. 본문 적용은 편집 이력에 반영되고 상단 저장/Ctrl+S로 서버에 저장합니다. 미리보기 입력은 체험용입니다. 새 DB 마이그레이션·환경변수는 없습니다.
- 업로드는 기존 권한·CSRF·파일 검사 프록시에 category=tmp를 전달합니다. 문서는 파일 ID를 저장하며 표시 때 승인된 content endpoint와 임시 Blob URL을 사용합니다. 파일 참조 검증·개인 템플릿/다른 프로젝트 재사용·HTML/Storybook 자산 복사를 연결했습니다. tmp의 실제 수명은 제공 계약에 명시되어 있지 않으며 템플릿 등록이 보존 기간을 연장하지 않습니다.
- 브라우저 검사에서 글꼴 상속, 제목의 중복 배율, 좁은 표의 스크롤·키보드 접근, 입력 이름, 인용문 대비를 수정했습니다. Storybook 내보내기의 CommonJS→React import는 Rolldown 내장 플러그인으로 해결하고 기존 설치 버전 1.2.8을 개발 의존성에 명시했습니다.
- 검증: 앱·Storybook 빌드, lint 오류/경고 0, typecheck 통과. 단위 24개·API 50개·E2E 39개·Story 49개, 총 162개의 서로 다른 검사 통과를 확인했습니다. 전체 실행에서 E2E 38/39·Story 48/49였고, 내보내기/접근성 실패를 고친 최종 빌드에서 정적 검사·단위 24개·관련 E2E 3개·Story 2개를 재실행해 모두 통과했습니다.
- 명령: `docker compose -f compose.test.yaml build`, 전체 검사 `up --abort-on-container-exit --exit-code-from test test`, Story 전체 `run --rm --no-deps test npm run test:stories`; 마지막 재검사는 `npm run lint && npm run typecheck && npm test && npm run test:e2e -- rich-text.spec.ts storybook-export.spec.ts`와 `npm run test:stories -- rich-text.spec.ts`를 테스트 컨테이너에서 실행했습니다.
- 캡처: `test-results/refactor/rich-text-{desktop,mobile,authoring}.png`. 실제 첨부·저장·오프라인 HTML 검사는 `test-results/e2e/rich-text-*/`에 있습니다. 브라우저 오류가 없음을 확인했습니다. 외부 파일 서비스는 계약 fixture로 검증했으며 실제 tmp 삭제/만료를 확인한 것은 아닙니다.
- BlockNote 의존성으로 내보내기 JS는 약 2.16 MB(gzip 약 613 KB), CSS는 약 753 KB입니다. 앱에서는 에디터를 지연 로드합니다. 기존 Vite 큰 chunk 경고는 남아 있습니다. 운영 배포·추가 커밋/푸시는 수행하지 않았습니다.

## 이전 작업 — 컴포넌트·공식 템플릿 시각 개선

- 사용자 요청을 오류 수정이 아닌 디자인 개선으로 반영했습니다. 공식 템플릿 22종을 데스크톱 1200px / 모바일 캔버스 375px로 캡처하고, 공통 요소 10종을 함께 비교했습니다.
- 템플릿: 밝은 배경과 흰 콘텐츠 영역, 제목 크기·굵기·행간·여백을 정리했습니다. 랜딩의 큰 제목/작업 예시 구성, 로그인·가입·재설정의 공통 폼, 추천 요금제와 FAQ, 중복 상자를 제거한 결과 화면을 적용했습니다. 새 템플릿 생성에 반영하며 기존 저장 명세는 변경하지 않습니다.
- 컴포넌트: 밑줄형 가로 탭, 펼침 아이콘이 있는 아코디언, 표의 모서리·헤더·행/선택 색·필터 입력, 작은 배지, 버튼·입력의 hover/focus, 상태 화면 아이콘을 정돈했습니다. 테마 색상과 사용자 지정 색을 구분하고 키보드·reduced-motion 동작을 유지합니다.
- Storybook: 요소 카탈로그의 과도한 빈 높이를 제거하고, 테마 적용 카탈로그와 정보/완료/경고/오류 상태 Story를 추가했습니다.
- 전후 캡처: `test-results/refactor/templates-before/`, `templates-final/`. 템플릿별 `*-desktop.png`, `*-mobile.png`와 `components.png`를 비교할 수 있습니다.
- 검증: 앱·Storybook 빌드, lint(오류/경고 0), typecheck, 단위 22개·API 49개·E2E 38개·Storybook 47개 통과했습니다. 템플릿 전용 테마(`custom`)와 입력창과 같은 44px 버튼 높이에 맞춰 이전 디자인의 고정 기대값을 갱신했습니다. Storybook의 폼 정렬 1개 실패는 38px 기대값 때문이었으며, 수정 후 해당 파일 2개 검사도 통과했습니다.
- 실행: `docker compose -f compose.test.yaml build`와 전체 검사 후, 동일 빌드에 현재 `tests/`를 읽기 전용 마운트해 E2E·Storybook 및 마지막 `npm run test:stories -- form-row.spec.ts`를 재검사했습니다. 첫 실행은 캡처 컨테이너 종료를 Compose가 함께 감지해 중단되어 성공으로 계산하지 않았습니다. 캡처 종료 후 새 tmpfs DB에서 검증했고 테스트 환경을 정리했습니다. 외부 서비스는 기존 계약 fixture로 검사했습니다.
- 신규 의존성·DB 변경·실서비스 호출·배포는 없습니다. 기존 Vite chunk 크기 경고는 남아 있습니다.

## 이전 작업 — 지침·워크스페이스·공통 모달 정리

- 요청 전 기준점: `3ffac75`가 origin/main에 푸시된 상태에서 시작했습니다.
- AGENTS·개발·UI 지침을 현재 스택과 실제 작업 절차 중심으로 줄였습니다. 호스트 분석 스킬과 Docker 앱 검증의 범위를 구분했습니다.
- 프로젝트 목록: 작은 화면 제목/계정 배치, 긴 이름·카드 높이·대비·조작 영역, 이름 링크와 검색 초기화, 이름 공백 검증을 보완했습니다.
- 목록의 늦은 응답이 최신 결과를 덮지 않게 하고, 목록 오류와 생성/삭제 오류를 분리했습니다. 삭제 처리 중 중복 실행을 막습니다.
- 공유·페이지 수정의 모달 수명주기를 공통 Dialog로 통합했습니다. 처리 중 닫기, 작은 화면 스크롤, focus 진입/복귀를 공유하고 중복 저장 단축키 listener를 제거했습니다.
- AI 입력창이 모든 keydown 전파를 막던 부분을 조정해 Ctrl/⌘+S를 편집기의 저장 처리로 연결했습니다. 입력창의 복사·줄바꿈·전송 동작과 모달 입력은 별도로 유지합니다. 사용하지 않는 `.create-page`·이전 프로젝트 선택 표시 CSS도 제거했습니다.
- 스킬 활용: Graphify의 AST로 웹 소스 관계를 조사하고, Ponytail·Code Review 기준으로 중복과 오류 경계를 점검했습니다. Impeccable·UI UX Pro Max로 화면·키보드·실패 복구를 검토하고 Playwright로 실제 앱과 Story를 검증했습니다. Graphify의 전체 의미 그래프 생성이나 외부 서비스 실호출 검증은 수행하지 않았습니다.
- 검증: 앱·Storybook Docker 빌드, lint(오류/경고 0), typecheck, 단위 22개·API 49개·앱 E2E 38개·Storybook 47개 모두 통과했습니다. 공통 Dialog의 focus 진입/복귀·배경 inert·busy Escape 차단·320×480 스크롤·axe 검사를 포함합니다.
- API 초기 실패는 기존 빈 AI 답변 테스트의 기대값 불일치였습니다. 기존 구현과 별도 계약 검사에 맞게 `missing_reply`를 `empty_reply`로 수정했습니다. 새 모달 검사는 Chromium의 브라우저 UI 포커스 경유를 확인한 뒤 배경 inert·포커스 복귀 기준으로 보완했습니다.
- 화면 캡처: `test-results/refactor/after-workspace-{320,390,768,1440}.png`. 각 너비에서 긴 이름·제목 배치·가로 넘침을 검사하고 캡처를 확인했습니다. workspace axe 검사, 공유 실패/처리 중 닫기, 늦은 목록 응답, 생성 오류 유지, AI 입력창 저장 단축키를 E2E에 추가했습니다.
- 실행 명령: `docker compose -f compose.test.yaml build`, `docker compose -f compose.test.yaml up --abort-on-container-exit --exit-code-from test test`. Storybook 재검사는 동일 이미지에 현재 `tests/`를 읽기 전용 마운트해 `npm run test:stories`를 실행했습니다. 변경 소스 Prettier 검사와 `git diff --check`, 진입 문서 상대 링크 검사도 통과했습니다.
- 남은 검증 범위: 외부 로그인·n8n·실제 메일/파일 서비스는 이번에 호출하지 않았습니다. Windows Docker의 Chromium으로 검사했으며 실제 모바일 기기·다른 브라우저는 미검증입니다. 기존 Vite 대용량 chunk 경고는 남아 있습니다.
- 신규 의존성·API·DB 마이그레이션·외부 계약 변경은 없습니다. 개발/운영 배포는 수행하지 않았습니다.

## 구현과 확인된 범위

| 영역 | 현재 상태 / 상세 |
| --- | --- |
| 워크스페이스 | 프로젝트 생성·검색·삭제·전환, 사용자별 공유 알림 |
| 편집기 | Palette·Layer·Inspector, 단일 선택·이동·복제·잠금, Undo/Redo, 반응형 override, 자동 저장·revision 충돌 처리 |
| 페이지·템플릿 | 이름 변경·삭제/버전 복원, 공식/개인 템플릿과 테마. [PAGE_LIBRARY](PAGE_LIBRARY.md) |
| 공통 UI | Registry·JSON Spec 검증, 일반 CSS, 표·폼·메뉴·그리드·모바일 기본 배치. [UI_CONTROLS](UI_CONTROLS.md), [COMPONENT_COVERAGE](COMPONENT_COVERAGE.md) |
| 내보내기 | 같은 렌더러로 HTML ZIP·독립 Storybook ZIP 생성, 자산 포함. [STORYBOOK_EXPORT](STORYBOOK_EXPORT.md) |
| 인증·공유·파일 | 외부 서비스 연동과 앱 권한·세션·파일 참조 구현. 2026-09-16 사용자 실제 로그인·공유 이메일·업로드 성공 확인. 세부 범위는 PROJECT_SETUP 및 기능 문서 참고 |
| AI·MCP | n8n Webhook·MCP 도구, 제안 검토/적용, 이미지 참조·대화·사용량 구현. 사용자 실제 응답·페이지 생성/적용 확인. [AI_MCP](AI_MCP.md) |
| 공동 편집 | Presence·실시간 공동 편집/CRDT는 미구현 |

## 다음 작업과 남은 제약

- 실제 AI 모델의 반복 호출 실패·출력 파싱·시간 초과는 완전히 해결된 상태가 아닙니다. 기존 빈 답변 복구는 같은 실행의 저장된 pending 제안에 한정합니다. n8n 설정과 실제 호출 품질은 [N8N_SETUP](N8N_SETUP.md)을 따릅니다.
- 편집기의 다중 선택·pan/snap·정렬 가이드·사용자 지정 breakpoint, 페이지 복제/정렬, 충돌 비교 UX, 대용량 목록 pagination은 후속 범위입니다.
- 에디터 전체는 넓은 화면 중심입니다. 휴대폰에서 편집기 전체를 조작하는 UX와 사용자가 만든 페이지의 모바일 미리보기를 구분합니다.
- 실제 refresh/logout 왕복, 새 환경의 Storybook ZIP 의존성 설치, 실제 모바일 기기·macOS/ARM64 검증 여부를 개별 기록해야 합니다.
- 운영 발행·DB 허용 네트워크·백업/복구 연습·외부 n8n 변경은 PROJECT_SETUP과 OPERATIONS의 위임·미정 항목을 따릅니다.

## 이력 기록 방법

현재 완료 상태·남은 제약은 이 문서에 유지합니다. 장문의 조사 과정과 이전 검증 로그는 PROGRESS_HISTORY로 옮기되 출처·날짜·모의/실제 구분을 보존합니다. 특정 실행의 성공을 모든 기능이나 전체 제품의 검증으로 확대하지 않습니다.
