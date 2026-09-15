# Storybook UI 개발 지침

**실제 앱의 공통 UI를 Storybook에서 구현·검증하고 페이지에서 재사용한다.** UI가 있는 프로젝트에 적용하며 API 전용 프로젝트에는 Storybook을 설치하지 않는다.

## 1. 적용 범위와 구현 순서

1. [연동 적용 규칙](INTEGRATIONS.md)에 따라 에디터 등 관련 UI/패키지 지침을 확인한 뒤 기존 화면·컴포넌트·Story·디자인 토큰을 검색한다.
2. 기존 컴포넌트 재사용 또는 자연스러운 variant 추가로 해결한다.
3. 공통 UI가 필요하면 실제 컴포넌트와 Story를 먼저 또는 같은 변경에서 구현한다.
4. 해당 상태·반응형·상호작용을 확인하고 Feature/Page에 연결한다.
5. 실제 앱에서 라우팅·데이터·권한·서버 동작까지 확인한다.

Storybook은 **컴포넌트의 실행 가능한 사용 예와 상태 기준**이다. 제품 요구사항·API·보안·실제 앱 검증의 대체가 아니다. Story와 앱이 다르면 같은 컴포넌트를 쓰는지부터 확인한다.

| UI 종류 | 처리 기준 |
| --- | --- |
| Button·Input·Dialog 등 공통 UI | 실제로 쓰이는 것부터 구현하고 의미 있는 Story 작성 |
| 특정 업무의 복잡한 Feature UI | 해당 기능 안에 유지; 독립 검증 가치가 있으면 Story 작성 |
| 일회성 문구·wrapper·단순 페이지 배치 | 페이지/기능 내부에 작성 가능; 공통화·Story 강제 안 함 |
| 외부 UI 라이브러리 컴포넌트 | 그대로 쓸 수 있으면 재사용; 프로젝트 스타일·동작을 추가할 때 wrapper 검토 |
| 전체 페이지 | 필요할 때 대표 사례만 등록; 라우팅·서버 통합은 앱에서 검증 |

“나중에 쓸 것 같다”는 이유로 모든 Primitive를 미리 만들거나 기존 라이브러리를 전부 감싼 자체 라이브러리를 만들지 않는다. 적용 지침이 에디터·업로드 패키지를 지정하면 그 계약을 사용하고 실제 앱에 연결한 컴포넌트를 Story에서 검증한다. Storybook을 위해 별도 자체 에디터나 파일 저장 구현을 만들지 않는다.

## 2. 최소 초기 설정

Vite/React 웹에는 `@storybook/react-vite`를 사용한다. NestJS API 프로세스에는 Storybook을 설치하지 않는다. 웹 앱과 같은 alias·style·provider 설정을 맞추고 API 의존성은 모의 응답으로 격리한다.

초기에는 선택한 프레임워크의 안정적인 CSF 형식·TypeScript 설정을 사용한다. 실험 기능이나 오래된 addon 조합을 관성적으로 복사하지 않는다. 실제 설치 버전의 공식 예제로 설정·import 경로·테스트 호환성을 확인하고 lockfile을 고정한다.

- 앱과 같은 Theme, 전역 스타일, 폰트, 필요한 Provider를 preview에 연결한다.
- 색상·타이포그래피·간격·radius·breakpoint 정도부터 필요한 토큰을 정한다. shadow·animation 등은 실제 요구가 생기면 추가한다.
- 이미 사용하는 MUI theme·CSS 변수·Tailwind 토큰을 기준으로 삼고 두 번째 토큰 체계를 중복 생성하지 않는다.
- Tailwind를 선택하면 설치한 버전의 설정 방식을 따른다. 현행 CSS theme 변수 방식도 있으므로 항상 `tailwind.config.js`가 필요하다고 가정하지 않는다. [Tailwind theme 문서](https://tailwindcss.com/docs/theme)
- 한 번 쓰는 배치값까지 모두 토큰으로 승격하지 않는다. 반복되는 시각 규칙과 의미 있는 디자인 값을 토큰으로 유지한다.

## 3. 컴포넌트 API와 Story

- `variant`, `size`, `loading`, `disabled`처럼 사용 의도가 드러나는 API를 사용한다.
- 페이지가 내부 DOM·스타일에 의존하거나 비슷한 역할의 boolean prop을 늘리면 API를 재검토한다.
- Story 파일은 가능하면 컴포넌트 가까이에 두고 실제 컴포넌트를 import한다. Storybook용 가짜 UI를 별도로 구현하지 않는다.
- 사용하지 않는 상태 조합을 전부 만들지 않는다. 필요한 기본·오류·로딩·빈 데이터·긴 텍스트·disabled·권한 상태를 선택한다.
- 날짜·랜덤·locale·timezone·네트워크 결과는 재현 가능한 값으로 제어한다. 운영 계정·실제 고객 데이터는 사용하지 않는다.
- 네트워크가 있으면 MSW 또는 해당 프레임워크의 모의 경계를 사용해 성공·실패·지연을 표현한다. 사용자 상호작용 자체를 무효화하지 않는다.
- 시각 자료는 참고 근거로 쓰고 이미지 설명을 필요할 때만 남긴다. Figma 레이어를 컴포넌트와 일대일 대응시키지 않는다.

폴더 예시는 의무 구조가 아니다:

```text
src/components/ui/Button.tsx
src/components/ui/Button.stories.tsx
src/features/account/AccountForm.tsx
src/features/account/AccountForm.stories.tsx
```

## 4. 반응형·접근성

작은 화면과 큰 화면, 긴 내용, 확대, 키보드 사용을 확인한다. 지원 breakpoint와 브라우저는 프로젝트에서 정한다.

- 가능한 한 하나의 외부 API를 유지하고 CSS로 반응형을 처리한다. UX가 실제로 다르면 내부 구현을 나눌 수 있다.
- 모바일·데스크톱 DOM을 둘 다 렌더링하면 중복 ID, 숨겨진 focus 대상, 중복 데이터 요청과 부수 효과를 확인한다.
- semantic HTML, 연결된 label, 키보드 조작, 보이는 focus, 색상 대비, 오류 안내를 기본으로 확인한다.
- Dialog는 focus 진입·복귀·trap·닫기 동작을 확인한다. 상태 안내는 필요한 경우 보조기술에도 전달한다.
- 움직임이 있으면 reduced motion을 고려한다. viewport toolbar 확인만으로 터치·실제 기기 검증을 했다고 보고하지 않는다.

## 5. 테스트와 CI

| 검증 | 목적 |
| --- | --- |
| `build-storybook` | Story와 설정을 정적 산출물로 빌드할 수 있는지 확인 |
| Story `play` / 상호작용 검사 | 입력·클릭·submit·오류·키보드 동작 확인 |
| 접근성 addon + 테스트 실행 | 자동 탐지 가능한 문제 확인 |
| 실제 앱 E2E | 라우팅·서버 연동·권한·브라우저 흐름 확인 |
| 시각 회귀 — 선택 | 디자인 변경 위험이 크거나 검토 기준선이 필요할 때 |

Vite 기반 Storybook은 Vitest addon과 브라우저 실행을 우선 검토한다. CI에는 호환되는 브라우저와 OS 의존성을 설치하고, 실제 검사 script를 연결한다. 지원되지 않는 조합은 공식 지원 테스트 방식 하나를 선택하며 중복 runner를 기본 설치하지 않는다. [Storybook Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon)

접근성 addon을 설치하는 것만으로 CI가 실패하는 것은 아니다. 채택한 버전에서 `parameters.a11y.test: 'error'` 등 검사 실패 정책을 설정하고 실제 테스트 실행과 연결한다. 자동 검사로 접근성 전체를 보장하지 않으므로 키보드·focus·사용 흐름 확인을 함께 한다. [Storybook 접근성 테스트](https://storybook.js.org/docs/writing-tests/accessibility-testing)

웹 UI 스캐폴딩은 `storybook`, `build-storybook`, `test:stories`의 실제 명령을 [개발 가이드](DEVELOPMENT.md)에 등록한다. 공통 UI·Story·theme·Storybook 설정 변경에는 관련 Story 검사와 빌드를 CI에 포함한다. 유료 시각 회귀 서비스나 공개 Storybook 배포는 기본 요구사항이 아니다.

## 6. UI 작업 완료

- [ ] 기존 UI 재사용을 확인했고 새 공통 UI에는 필요한 Story가 있다.
- [ ] Story와 앱이 같은 컴포넌트·theme을 사용한다.
- [ ] 의미 있는 정상·실패 상태와 주요 상호작용을 확인했다.
- [ ] 작은/큰 화면과 기본 접근성을 확인했다.
- [ ] 실제 앱에서 데이터·권한·페이지 연결을 확인했다.
- [ ] 해당 검사 결과와 미실행 항목을 정확히 보고했다.

일회성 단순 페이지 배치처럼 해당하지 않는 항목은 이유와 함께 제외한다. Storybook을 통과시키기 위해 앱의 실제 동작을 단순화하지 않는다.
