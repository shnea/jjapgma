# Jjapgma AI Agent API 연동 지침

- 상태: 활성
- 적용 프로젝트: Jjapgma
- 적용 기능: UI 설계 보조 AI / 자연어 기반 화면 설계 제안
- 외부 연동 서비스: n8n Webhook + OpenRouter
- 운영 Endpoint: `https://n8n.shnea.kr/webhook/jjapgma`
- 테스트 Endpoint: `https://n8n.shnea.kr/webhook-test/jjapgma`

---

## 1. 적용 원칙

Jjapgma에서 AI 기능이 필요한 경우 프로젝트 내부에서 OpenRouter, OpenAI, Gemini, Claude 등의 AI Provider를 직접 호출하지 않고 아래 n8n Production Webhook을 사용한다.

```http
POST https://n8n.shnea.kr/webhook/jjapgma
Content-Type: application/json
```

n8n은 Jjapgma와 실제 AI Provider 사이의 AI Gateway / Orchestration 진입점으로 사용한다.

현재 n8n Workflow 내부에서는 OpenRouter를 호출하며 모델은 다음과 같이 설정되어 있다.

```text
openrouter/free
```

따라서 실제 응답 모델은 요청마다 달라질 수 있다.

Jjapgma 애플리케이션은 특정 OpenRouter 무료 모델 이름에 의존하지 않는다.

AI Provider 또는 모델을 변경해야 하는 경우 Jjapgma 애플리케이션 코드를 직접 수정하기보다 n8n Workflow의 모델 정책을 우선 수정한다.

---

## 2. 현재 실제 구현 상태

현재 n8n Workflow는 다음 최소 구조로 구현되어 있다.

```text
Webhook
  ↓
HTTP Request
  ↓
OpenRouter Chat Completions API
```

현재 구현되어 있는 기능:

- Jjapgma 전용 Webhook 수신
- 요청의 `messages` 배열 전달
- n8n에서 Jjapgma 전용 System Prompt 적용
- OpenRouter `openrouter/free` 호출
- OpenRouter 응답 반환
- 호출자가 이전 `messages`를 함께 전달하는 방식의 멀티턴 대화
- 일반적인 UI 구조 / 레이아웃 / 반응형 설계 제안

현재 구현되어 있지 않은 기능:

```text
- Jjapgma MCP 연결
- MCP Tool Calling
- Component Registry 실제 조회
- Template Registry 실제 조회
- Theme / Design Token 실제 조회
- 현재 Project / Page / Selection 자동 조회
- Canvas 실제 생성 / 수정
- UI Tree 실제 변경
- apply_ui_patch
- AI 변경 Preview / Apply
- AI Revision 자동 생성
- AI 변경 Undo
- AI 전용 Memory
- 대화 이력 자동 저장
- 응답 형식 정규화
- 요청 Schema 검증
- 별도 Webhook 인증
- Retry / Fallback 정책
```

위 기능은 Jjapgma 본체와 MCP가 구현되는 시점에 순차적으로 추가한다.

현재 지원하지 않는 기능을 이미 지원한다고 가정해서 구현하지 않는다.

---

## 3. 현재 System Prompt의 역할

현재 n8n의 Jjapgma System Prompt는 AI에게 다음 역할을 부여한다.

- Jjapgma AI Design Assistant 역할
- 사용자의 자연어 UI 요구사항 이해
- 화면 구조 및 Layout 제안
- 필요한 Component 구성 제안
- Desktop / Tablet / Mobile 반응형 고려
- 일반적인 UI/UX 관례와 좋은 기본값 적용
- Template 우선 사용 원칙
- Template으로 해결되지 않을 경우 Component 조합 우선
- 요소별 편의 속성 고려
- 중요한 요구사항이 불명확한 경우 필요한 내용만 질문
- 실제 Tool / MCP 실행 없이 화면을 수정했다고 주장하지 않음
- 기본 한국어 응답

현재 MCP가 연결되지 않았으므로 AI는 실제 Jjapgma Canvas를 변경하지 않는다.

현재 단계에서는 다음과 같이 동작한다.

```text
사용자:
"회원 관리 화면 만들어줘."

AI:
- 사용할 Layout
- Search Filter
- Data Grid
- Pagination
- Desktop / Tablet / Mobile 동작

등을 자연어로 제안
```

실제 Page / UI Tree 변경은 아직 수행하지 않는다.

---

## 4. 외부 연동이 맡는 책임

현재 n8n AI 연동의 책임은 아래 범위로 제한한다.

- AI Provider 호출
- AI Provider API Key 관리
- Jjapgma System Prompt 관리
- 사용자 `messages` 전달
- AI 모델 라우팅
- AI 응답 반환

현재는 n8n이 Jjapgma의 Project, Page, UI Tree 또는 DB를 직접 수정하지 않는다.

---

## 5. Jjapgma가 계속 맡는 책임

Jjapgma 애플리케이션은 다음을 직접 관리한다.

- OIDC 로그인
- 사용자 / 프로젝트 권한
- Project
- Page
- UI Tree / JSON Spec
- Component Registry
- Template Registry
- Theme / Design Token
- Canvas
- Layer Tree
- Inspector
- Responsive 설정
- Assets
- Version / Revision
- Storybook Export
- MCP Server
- Audit

AI가 생성한 자연어 응답을 실제 UI Tree 변경 성공 결과로 취급하지 않는다.

향후 MCP Write Tool이 연결된 이후에도 실제 상태의 Source of Truth는 Jjapgma Backend / UI Spec이다.

---

## 6. 중복 구현하지 않을 기능

이 지침이 활성 상태인 동안 Jjapgma의 기본 AI 기능을 위해 다음 AI Provider 연동을 별도로 추가하지 않는다.

```text
- OpenRouter 직접 호출
- OpenAI API 직접 호출
- Gemini API 직접 호출
- Claude API 직접 호출
- AI Provider API Key를 Jjapgma Frontend에 포함
- 동일 목적의 별도 LLM Gateway 구현
```

새로운 AI 기능이 필요하면 먼저 기존 n8n Jjapgma Workflow 확장으로 해결 가능한지 검토한다.

단, Jjapgma MCP Server 자체는 AI Provider가 아니라 Builder의 공식 Tool / Resource 인터페이스이므로 Jjapgma Backend에서 구현한다.

---

## 7. 요청 형식

현재 기본 요청 형식:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "회원 관리 화면 만들어줘. 위에는 검색 조건, 아래에는 테이블과 페이징이 있었으면 좋겠어."
    }
  ]
}
```

멀티턴 대화가 필요한 경우 호출 측에서 이전 대화를 함께 전달한다.

```json
{
  "messages": [
    {
      "role": "user",
      "content": "회원 관리 화면 만들어줘."
    },
    {
      "role": "assistant",
      "content": "검색 영역과 목록 영역 중심으로 구성할 수 있습니다."
    },
    {
      "role": "user",
      "content": "모바일에서는 테이블 대신 카드 형태로 보여줘."
    }
  ]
}
```

현재 기본 role:

```text
user
assistant
```

System Prompt는 n8n Workflow에서 삽입하므로 Jjapgma 애플리케이션이 동일한 System Prompt를 중복 삽입하지 않는다.

---

## 8. 향후 Context 확장

현재는 `messages`만 전달한다.

향후 Builder AI가 실제 편집을 수행하게 되면 다음 Context를 요청에 포함할 수 있다.

예:

```json
{
  "context": {
    "projectId": "project-123",
    "pageId": "page-users",
    "selectedNodeIds": ["node-10"],
    "currentRevision": 25,
    "currentBreakpoint": "desktop"
  },
  "messages": [
    {
      "role": "user",
      "content": "이 버튼을 위험 버튼으로 바꿔줘."
    }
  ]
}
```

위 `context` 계약은 현재 확정된 API가 아니며 실제 MCP / Builder AI 구현 시 정의한다.

현재 구현에서 해당 필드가 이미 지원된다고 가정하지 않는다.

---

## 9. 현재 응답 형식

현재 n8n은 OpenRouter Chat Completion 응답을 거의 그대로 반환한다.

AI 답변 본문을 사용할 때 기본 경로:

```text
choices[0].message.content
```

예:

```json
{
  "model": "some-free-model:free",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "회원 관리 화면은 검색 영역, 데이터 그리드, 페이징 구조로 구성할 수 있습니다."
      }
    }
  ],
  "usage": {
    "prompt_tokens": 300,
    "completion_tokens": 500,
    "total_tokens": 800
  }
}
```

다음 필드는 OpenRouter 또는 실제 선택 모델에 따라 달라질 수 있다.

```text
model
provider
reasoning
reasoning_details
usage
```

Jjapgma 핵심 로직이 위 Provider 종속 필드에 의존하지 않도록 한다.

특히 `openrouter/free`는 요청마다 실제 모델이 달라질 수 있으며 UI 설계에 적합하지 않은 무료 모델이 선택될 수도 있다.

현재는 기본 연동 단계이므로 그대로 사용하고, 실제 Jjapgma AI 기능 개발 단계에서 모델 고정 / Allowlist / Fallback 정책을 검토한다.

---

## 10. Production / Test 사용 구분

### Production

Jjapgma 애플리케이션에서 사용할 공식 Endpoint:

```text
https://n8n.shnea.kr/webhook/jjapgma
```

n8n Workflow가 Publish 상태여야 한다.

### Test

n8n Workflow 수동 테스트용:

```text
https://n8n.shnea.kr/webhook-test/jjapgma
```

Test Webhook은 n8n에서 `Execute Workflow` 또는 Test Listening 상태일 때만 사용한다.

실제 Jjapgma 애플리케이션 코드에는 Test URL을 사용하지 않는다.

---

## 11. 현재 AI 처리 흐름

현재:

```text
사용자
  ↓
Jjapgma
  ↓
POST /webhook/jjapgma
  ↓
n8n
  ↓
Jjapgma System Prompt
  +
사용자 messages
  ↓
OpenRouter / openrouter/free
  ↓
AI 자연어 응답
  ↓
Jjapgma
```

현재 AI는 화면 구조를 제안할 수 있지만 실제 UI Tree를 변경하지 않는다.

---

## 12. 향후 MCP 연동 목표

Jjapgma MCP가 구현되면 n8n AI Workflow를 다음 방향으로 확장한다.

```text
Jjapgma AI Panel
      ↓
n8n /webhook/jjapgma
      ↓
LLM
      ↓
MCP Client
      ↓
Jjapgma MCP Server
      ↓
Component Registry
Template Registry
Theme / Design Token
Page / UI Tree
Version
      ↓
검증된 UI Patch
      ↓
Canvas 반영
```

AI는 임의 HTML / CSS 생성보다 Jjapgma의 공식 Component / Template을 우선 사용한다.

---

## 13. 향후 MCP Read 기능

예상 기능:

```text
get_project
get_pages
get_page_spec

get_current_selection

get_component_registry
search_components
get_component_schema

get_templates
search_templates
get_template

get_theme
get_design_tokens

get_actions
get_bindings

get_revision
```

위 기능은 현재 n8n Workflow에서 구현되어 있지 않다.

---

## 14. 향후 MCP Write 기능

예상 기능:

```text
create_page
rename_page
duplicate_page

add_component
update_component
move_component
remove_component

apply_template

update_responsive
update_binding
update_action

apply_ui_patch
```

AI의 Write 작업은 반드시 Jjapgma Backend의 다음 검증을 통과해야 한다.

- 사용자 권한
- Project Scope
- Property Schema
- Drop Rule
- Component Schema
- Revision 충돌
- Action / Binding Validation

AI가 Jjapgma DB를 직접 수정하는 구조로 만들지 않는다.

---

## 15. Template First 정책

향후 AI가 실제 화면을 생성할 때 다음 우선순위를 따른다.

```text
1. 기존 Template 사용
2. 기존 Pattern 조합
3. Component Registry 조합
4. 없는 Component는 임의 생성하지 않고 사용자에게 알림
```

예:

```text
사용자:
"회원 관리 화면 만들어줘."

AI 생성 방향:

Admin Layout Template
+
Page Header
+
Search Filter Pattern
+
Data Grid
+
Pagination
```

AI가 임의 HTML / CSS를 생성하여 Jjapgma Design System을 우회하지 않는다.

---

## 16. Responsive 원칙

AI는 모든 UI 제안에서 다음 환경을 고려한다.

```text
Desktop
Tablet
Mobile
```

예:

```text
Desktop
Sidebar: 표시
Data Grid: Table

Tablet
Sidebar: 축소

Mobile
Sidebar: 숨김
Navigation: Drawer
Data Grid: Card
```

또한 요소 전체뿐 아니라 다음 하위 영역도 Breakpoint별로 다르게 설정할 수 있음을 고려한다.

```text
Label
Icon
Helper Text
Action
Column
```

---

## 17. AI 변경 / Revision 원칙

향후 MCP Write가 연결되면 AI 변경도 일반 사용자 변경과 동일하게 Revision으로 기록한다.

예:

```text
revision: 26
authorType: AI
authorUserId: user-123

prompt:
"회원 관리 화면 만들어줘."

changes:
- Admin Layout
- Search Filter
- Data Grid
- Pagination
```

대규모 AI 변경은 가능하면 다음 흐름을 사용한다.

```text
AI 제안
  ↓
Preview
  ↓
Apply
  ↓
Revision 생성
```

여러 Node 변경은 하나의 `apply_ui_patch`와 하나의 논리 Revision으로 처리하는 것을 권장한다.

---

## 18. 보안

실제 Secret은 이 문서에 기록하지 않는다.

다음 값은 n8n Credential 또는 환경변수에서 관리한다.

```text
- OpenRouter API Key
- 향후 Webhook 인증 Token
- MCP Service Credential
- 기타 Secret
```

OpenRouter API Key를 Jjapgma Frontend 또는 브라우저에 노출하지 않는다.

현재 Production Webhook에 별도 인증이 없다면 외부 공개 서비스 적용 전에 인증을 추가한다.

향후 MCP Write Tool은 사용자의 OIDC / Project Permission을 우회해서는 안 된다.

---

## 19. 오류 / 실패 원칙

현재 단계에서는 다음 실패를 고려한다.

```text
- n8n 연결 실패
- OpenRouter 오류
- Rate Limit
- HTTP 4xx / 5xx
- 응답에 choices가 없음
- choices[0].message.content가 없음
```

향후 MCP 연결 이후에는 추가로 다음을 고려한다.

```text
- Tool 실행 실패
- Permission Denied
- Schema Validation 실패
- Revision Conflict
- Partial Patch 실패
- Timeout
- Rollback
```

AI의 자연어 응답과 실제 Tool 실행 성공 여부를 분리한다.

실제 Tool이 실패했는데 AI가 성공했다고 응답하는 구조를 허용하지 않는다.

---

## 20. 구현 에이전트 지침

Jjapgma에서 AI 기능을 구현할 때 먼저 이 문서를 적용한다.

현재 기본 호출 흐름:

```text
사용자
  ↓
Jjapgma
  ↓
POST https://n8n.shnea.kr/webhook/jjapgma
  ↓
n8n
  ↓
OpenRouter
  ↓
AI 응답
  ↓
Jjapgma
```

다음 기능은 현재 구현되어 있지 않으므로 이미 존재한다고 가정하지 않는다.

```text
MCP 연결
Tool Calling
Component Registry 실제 조회
Template Registry 실제 조회
Canvas 자동 수정
UI Tree 자동 변경
AI Revision
AI Memory
```

Jjapgma MCP가 구현되면 기존 n8n Workflow를 확장하여 연동한다.

새로운 AI Provider를 Jjapgma에 직접 붙이기 전에 기존 n8n Workflow로 해결 가능한지 먼저 검토한다.

AI 관련 변경 사항과 현재 지원 범위는 프로젝트 설정표 또는 관련 기술 문서에 함께 기록한다.

---

## 21. 최종 원칙

```text
현재
Jjapgma
   ↓
n8n
   ↓
OpenRouter
   ↓
UI 설계 자연어 응답

향후
Jjapgma
   ↓
n8n AI Orchestrator
   ↓
LLM
   ↓
Jjapgma MCP
   ↓
Component / Template / Theme / UI Tree
   ↓
검증된 UI 변경
```

Jjapgma의 AI 기능은 n8n을 AI Provider 진입점으로 사용하고, 실제 UI 상태와 권한은 Jjapgma Backend가 관리한다.

AI는 Jjapgma의 공식 Component Registry, Template Registry, Design Token, Responsive 규칙을 우회하지 않는다.
