# 짭그마 n8n 설정

대상은 기존 Production Webhook `https://n8n.shnea.kr/webhook/jjapgma`다. `webhook-test` 주소는 앱에 사용하지 않는다. 기존 HTTP Request 모델 호출만으로 MCP 도구를 실행할 수 없으므로 다음 흐름으로 확장한다.

`Webhook → AI Agent → Respond to Webhook`

AI Agent에는 기존 OpenRouter 자격 정보를 사용하는 Chat Model과 MCP Client Tool을 연결한다. 설치된 n8n 버전에서 HTTP Streamable을 지원하는 MCP Client Tool을 사용한다. [공식 노드 문서](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp), [공식 구현의 전송 방식 설정](https://github.com/n8n-io/n8n/blob/master/packages/%40n8n/nodes-langchain/nodes/mcp/McpClientTool/McpClientTool.node.ts).

## 1. 인증

서로 다른 32자 이상의 임의 토큰 두 개를 생성해 서버 `.env`에 저장한다.

- `AI_WEBHOOK_TOKEN`: n8n Webhook의 Header Auth credential. 이름 `Authorization`, 값 `Bearer ` 뒤에 이 토큰.
- `AI_MCP_TOKEN`: n8n MCP Client Tool의 Bearer Auth credential. 토큰 값만 입력한다.

토큰은 모델 프롬프트·응답·워크플로 내 일반 텍스트에 넣지 않는다. n8n Credential에 보관한다. MCP 서비스 토큰만으로 전체 프로젝트를 조회할 수 없다. 짭그마가 접수한 진행 중 요청의 URL이 함께 필요하며, URL의 실행 ID를 도구 입력이나 모델 응답으로 바꾸지 않는다.

## 2. Webhook

- Method: POST, Path: `jjapgma`
- Authentication: 위 Header Auth
- Response: Respond to Webhook 노드 사용

받는 JSON의 형태:

```json
{
  "requestId": "실행 UUID",
  "messages": [{"role":"user","content":"회원 목록 화면 그려줘"}],
  "context": {
    "projectId":"프로젝트 UUID", "pageId":"페이지 UUID",
    "selectedNodeIds":["선택 요소 ID"], "currentRevision":1,
    "currentBreakpoint":"desktop"
  },
  "mcp": {"url":"https://jjapgma.shnea.kr/api/mcp/n8n/실행-UUID"}
}
```

## 3. AI Agent와 모델

Agent의 사용자 입력은 Define below로 지정한다. Webhook 노드 이름이 `Webhook`인 경우 표현식:

```text
{{ $('Webhook').first().json.body.messages.map(m => `${m.role}: ${m.content}`).join('\n\n') }}
```

이전 대화는 짭그마가 전달하므로 초기 버전에 별도 Memory 노드가 필요하지 않다. AI Agent → Options → Max Iterations는 복잡한 화면 구성을 위해 우선 30회로 설정하고 전체 응답이 5분 안에 끝나도록 한다. 모델은 **tool calling을 지원하는 모델**로 지정한다. 사용자는 현재 OpenRouter 연결에서 텍스트 응답과 MCP 페이지 생성을 확인했다. 이미지 요청은 vision과 tool calling을 함께 지원하는 모델로 별도 확인한다. 공급자 자격 정보는 기존 n8n 설정을 사용한다.

System Message는 [시스템 프롬프트](../infra/n8n/system-prompt.txt) 내용을 사용한다. 모델에 credential이나 MCP 서비스 토큰을 전달하지 않는다.

2026-09-19 서식 편집기 반영: `richText` 선택 기준, `document-editor` / `notice-document` 템플릿, BlockNote JSON·파일 참조 규칙, 작성용 tmp와 소비 서비스 default의 책임 구분을 프롬프트에 추가했다. 먼저 이 컴포넌트가 포함된 앱/API를 배포하고 **AI Agent → Options → System Message 전체를 위 파일로 교체한 뒤 저장·게시**한다. 소스 파일 수정만으로 n8n의 기존 설정이 갱신되지는 않는다. 이번 변경으로 Webhook·Chat Model·MCP 연결 노드와 User Message 표현식을 바꿀 필요는 없다. 컴포넌트 속성·템플릿·디자인 기본값은 새 요청의 MCP 조회에서 받는다.

적용 후 새 대화에서 “서식 편집기가 있는 문서 작성 화면”과 “읽기 전용 공지 화면”을 각각 요청한다. 실행 기록에서 `get_design_context`가 richText 명세를 조회하는지, 생성된 제안의 모드·본문 JSON이 요청에 맞는지 확인하고 검토 후 적용한다. 첨부가 없는 요청에서 가짜 파일 ID나 업로드 완료 주장이 나오지 않아야 한다. 저장소의 정적 검사와 외부 n8n에 프롬프트를 적용한 실모델 검증은 별개다.

화면 생성 조회 최적화를 반영하려면 **AI Agent → Options → System Message** 전체를 위 파일의 최신 내용으로 교체하고 저장·게시한다. Prompt (User Message)의 Webhook 표현식은 그대로 둔다. 새 페이지는 `get_design_context` 한 번에 필요한 요소·템플릿을 받고 `create_page` 한 번으로 전체 화면을 제안한다. 기존 화면 수정만 현재 페이지 조회를 추가한다. MCP Client Tool의 Tools to Include는 All을 유지하고, 수동으로 도구를 선택한 경우 get_design_context를 포함한다. 앱의 도구 명세 축소는 서버 반영 즉시 적용되지만 n8n의 기존 System Message는 자동 갱신되지 않는다.

get_design_context의 과거 12종 제한은 제거했다. 등록된 모든 종류를 한 요청으로 조회할 수 있으며, 모델이 같은 종류를 여러 번 넣어도 중복 제거 후 반환한다. 이 변경은 서버 도구 명세와 검증에 반영되므로 기존 System Message를 다시 바꾸지 않아도 적용된다. 별도로 추가했던 “최대 12개” 지침은 더 이상 필요 없다. 입력 오류 응답은 잘못된 필드 이름·허용 값·최소/최대 범위를 제공하므로 실제 오류를 수정하고 성공을 꾸며내지 않는다.

템플릿은 필수가 아니며 사용자 요청이 우선이다. 템플릿을 수정해 재사용할 때만 get_template으로 실제 요소와 ID를 추가 조회한 뒤 create_page에 templateId와 operations를 함께 전달한다. 헤더·사이드바·중앙 본문 요청에 dashboard 템플릿만 반환하는 것은 요구 누락이다. 원본 템플릿을 그대로 요청했거나 이미 모든 요구를 충족하는 경우에만 templateId 단독 생성을 사용한다. 최신 System Message에는 이 판단과 빠진 영역 추가·기존 요소 재배치 규칙이 포함되어 있다.

`Max iterations (10) reached`는 시간 초과가 아니라 모델의 작업 반복 횟수를 소진했다는 뜻이다. **Options → Max Iterations → 30**으로 변경 후 워크플로를 저장·게시한다. 30은 화면 생성용 초기 권장값이며 성공을 보장하지 않는다. 같은 조회나 실패한 도구 호출이 반복되면 Executions의 중간 단계를 보고 원인을 고친다. [n8n 공식 Max Iterations 설명](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent#max-iterations).

## 4. MCP Client Tool

- Server Transport: **HTTP Streamable**
- Endpoint 표현식: `{{ $('Webhook').first().json.body.mcp.url }}`
- Authentication: Bearer Auth, `AI_MCP_TOKEN` credential
- Tools to Include: All. 서버가 VIEWER에게는 조회 도구만 제공한다.
- Tool timeout: 30,000ms

앱의 전체 AI 응답 대기는 5분(300초)이며, 실행 중 MCP는 준비·저장 여유를 포함해 최대 5분 30초 동안 유효하다. 완료·실패하면 즉시 사용할 수 없다. 위 30초는 개별 MCP 도구 호출 제한으로 전체 대기 시간과 별개다. n8n 워크플로·모델 노드나 `n8n.shnea.kr` 앞단 프록시에 더 짧은 제한이 있으면 그 제한도 별도로 조정해야 한다. Nginx 프록시의 경우 응답을 기다리는 `proxy_read_timeout`을 330초 이상으로 맞춘다. [Nginx 공식 설정](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_read_timeout). 외부 n8n/NPM 설정은 이 저장소에서 자동 변경하지 않는다.

연결 주소는 요청마다 달라진다. MCP 노드에 프로젝트 공용 관리자 권한을 등록하거나 별도 DB 연결을 추가하지 않는다. Agent에 하나의 Webhook 항목만 전달한다.

## 5. 응답

AI Agent의 **Require Specific Output Format은 OFF**로 둔다. 별도 Structured Output Parser를 연결해 최종 답변 형식을 강제할 필요가 없다. MCP 호출 인자는 각 도구 스키마로 검사하고, 최종 한국어/Markdown 답변은 문자열 output으로 받은 뒤 Respond to Webhook에서 reply JSON으로 감싼다. 이 두 형식을 혼동해 모델에게 최종 답변 전체를 도구 operations나 reply 객체로 출력하도록 강제하지 않는다.

Respond to Webhook: JSON, status 200. Response Body 표현식:

```text
{{ JSON.stringify({ reply: $json.output }) }}
```

`reply`는 비어 있지 않은 문자열이어야 한다. 기존 `choices[0].message.content` 응답도 호환한다. 도구가 제안을 생성한 경우 “제안을 만들었습니다. 미리보기에서 적용해 주세요”라고 안내한다. 자연어의 “완료”를 실제 저장 성공으로 해석하지 않는다.

AI Agent의 실제 output이 `""`이면 Respond to Webhook에서 이를 reply로 전달해도 모델 설명은 비어 있다. 앱은 같은 실행·프로젝트·사용자 소유의 pending 제안이 DB에 저장됐고 이미지 처리 확인도 통과한 경우에만 “변경 제안은 생성됐지만 AI 설명이 비어 있습니다”라는 상태 안내로 미리보기·적용을 이어간다. 제안이 없으면 `empty_reply`, 필드가 없거나 타입이 잘못됐으면 `missing_reply`로 구분한다. HTTP/JSON 오류 및 응답의 error 또는 choices의 error/finish_reason=error는 복구하지 않는다. 이 처리는 재생성이나 모델 우회가 아니며 외부 n8n 설정 변경을 요구하지 않는다. `{output:""}`를 reply로 매핑하지 않고 Webhook 본문에 그대로 반환하는 계약 오류는 계속 실패한다.

워크플로 오류는 성공 문자열로 숨기지 말고 실패 HTTP 상태를 반환한다. 변경 작업을 자동 재시도하지 않는다.

## 6. 활성화와 확인

1. Webhook 인증·Agent·모델·MCP 노드를 연결하고 워크플로를 게시한다.
2. `.env`에 두 credential과 `AI_ENABLED=true`를 설정한다. `AI_WEBHOOK_URL`은 기존 Production 주소를 유지한다.
3. `docker compose -f compose.dev.yaml up -d --build --wait`로 앱 설정을 반영한다.
4. 소유자로 AI 탭에서 “현재 페이지 구조를 설명해줘”를 요청한다.
5. “버튼 하나 추가해줘” → 제안 미리보기 → 적용 → 버전 기록을 확인한다.
6. VIEWER의 조회·쓰기 거절, 공유 취소 후 접근 거절을 확인한다.

중단하려면 `AI_ENABLED=false`로 앱을 재생성한다. 기존 페이지·버전·개인 MCP 연결은 보존된다. 이 문서는 실제 변경 절차이며 현재 외부 n8n에 적용하거나 실모델 검증을 완료했다는 뜻은 아니다.

## 7. 요청은 도착하지만 답변을 받지 못할 때

2026-09-18 사용자는 현재 Model이 `openrouter/free`라고 확인했습니다. 이는 단일 모델 ID가 아니라 요청에 필요한 이미지·도구 호출 기능을 지원하는 무료 모델 중 무작위로 선택하는 라우터입니다. 호출별 실제 모델이 같다고 가정하지 않으며, 이 설정 자체가 이번 오류의 원인이라고 단정하지 않습니다. 재현 시 이미지 입력과 tool calling을 함께 지원하는 명시적 모델 ID로 고정하면 모델 선택 변수를 줄일 수 있습니다. 현재 무료 비교 후보는 `inclusionai/ling-3.0-flash-vl:free`이며 실제 적용·성공 검증은 하지 않았습니다. 실패 원인 확정에는 해당 요청의 실제 모델/제공자와 오류 상세가 필요합니다. [무료 라우터 계약](https://openrouter.ai/openrouter/free), [비교 후보의 지원 기능](https://openrouter.ai/inclusionai/ling-3.0-flash-vl:free).

`Model output doesn't fit required format`만으로 별도 Structured Output Parser의 연결 문제라고 단정하지 않는다. n8n의 공개 `wrapLangChainParserError` 구현은 여러 OutputParserException을 같은 메시지로 감싼다. 도구 호출 인자의 JSON 해석 실패도 이 예외를 낼 수 있으므로 Require Specific Output Format이 OFF여도 발생할 수 있다. 옵션이 ON이고 별도 출력 파서가 연결된 경우에는 이 앱의 일반 문자열 답변 계약에 맞춰 해제하지만, 이미 OFF로 확인한 설정을 반복 변경하지 않는다. Agent 내부에서 실패했다면 Respond to Webhook 표현식 변경이나 On Error=Continue로 원인을 해결할 수 없다. 마지막 Chat Model 실행의 Output에서 tool_calls/invalid_tool_calls, arguments와 finish_reason을 확인해 잘못된 JSON·출력 잘림·최종 답변 파싱을 구분한다. 원문에 자격 증명이나 비공개 데이터가 있으면 공유하지 않는다. [n8n 공개 오류 처리 코드](https://github.com/n8n-io/n8n/blob/master/packages/@n8n/nodes-langchain/utils/output_parsers/langchainParserError.ts), [LangChain 도구 호출 파서](https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/agents/tool_calling/output_parser.ts).

2026-09-18 사용자 제공 스택은 n8n 2.38.7 / AI Agent 3.1의 `wrapLangChainParserError → ToolsAgent/V3/helpers/executeBatch` 경로입니다. 별도 출력 파서 연결 여부나 JSON 잘림 원인을 확정하는 스택은 아닙니다. 최근 개발 요청은 get_design_context 성공(53ms) 뒤 생성 도구 호출 기록 없이 219156ms에 n8n HTTP 500으로 종료됐습니다. 조사한 공개 master 코드와 설치 버전의 정확한 일치는 확인하지 못했으며, 마지막 모델 응답 원문/종료 사유 확인이 남아 있습니다.

후속으로 사용자가 두 Chat Model 기록을 제공했습니다. 첫 호출은 finish_reason=tool_calls, 입력 7157/출력 421토큰이며 두 번째는 finish_reason=error, 입력 16312/출력 3002토큰, 빈 text입니다. 도구 호출에서 빈 text 자체는 실패 증거가 아니며 두 번째 error 종료가 핵심입니다. OpenRouter는 생성 중 오류도 이 종료 사유로 전달합니다. 이 요약에는 구체적인 error.message/metadata·모델/제공자와 도구 인자가 없으므로 공급자 장애·요청 변환·출력 잘림 중 원인을 확정할 수 없습니다. 출력 3002라는 숫자만 보고 3000토큰 한도 초과로 결론내리지 않습니다. 현재 모델명/출력 한도와 해당 OpenRouter 요청의 오류 상세를 다음으로 확인합니다. [OpenRouter 오류 계약](https://openrouter.ai/docs/api_reference/errors-and-debugging).

Webhook의 Respond는 `Using 'Respond to Webhook' Node`, 마지막 Respond to Webhook은 JSON을 선택하고 Response Body 전체를 Expression 모드에서 `{{ JSON.stringify({ reply: $json.output }) }}`로 설정한다. 바깥에 따옴표나 중괄호를 추가하지 않는다. `Immediately`의 접수 메시지나 Agent의 `{output: ...}`만 반환하면 앱의 답변 계약에 맞지 않는다.

앱은 HTTP 상태 오류, 빈 응답, JSON 형식 오류, reply 누락, 응답 크기 초과, 5분 시간 초과를 구분해 표시한다. HTTP 401/403은 Webhook Header Auth의 Name `Authorization`과 Value `Bearer 토큰값`을 확인한다. HTTP 5xx는 n8n Executions에서 실패 노드와 오류를 확인한다. 응답 내용·토큰은 로그에 남기지 않고 `ai_run_failed`에 실행 ID·단계·오류 코드·HTTP 상태·경과 시간만 기록한다.

MCP initialize와 tools/list의 200/202만으로 모델 실행이나 도구 호출 성공을 판단하지 않는다. 실행이 끝나거나 실패한 뒤에는 해당 실행의 MCP 주소가 만료되므로 짭그마에서 새 요청으로 재검사한다.

create_page 입력이 `op:"create"`, `componentType`, 부모가 없는 요소 배열이라면 작업 형식이 잘못된 것이다. 올바른 추가 예시는 `{"op":"add","parentId":"page-root","id":"header","type":"container","style":{"padding":24}}`다. 루트 page-root는 이미 있으므로 update하며 CSS 문자열 padding이나 flex는 style.css에 넣는다. get_design_context와 쓰기 스키마 오류 응답의 operationGuide를 따른다. 최신 System Message에는 수정 후 한 번만 재시도하고 같은 인자/연결 종료에 재시도하지 않는 지침이 있다. 서버의 안내는 즉시 제공되지만 n8n System Message는 사용자가 [파일](../infra/n8n/system-prompt.txt) 전체로 교체하고 저장·게시해야 한다.

### 약 90초 뒤 HTTP 504 / MCP Connection closed

2026-09-16 실제 실행 3건이 약 90초 뒤 HTTP 504로 끝났으며, 실행 컨테이너의 앱 timeout은 300초로 확인했다. 이는 앱 자체의 5분 timeout이 아니라 n8n 응답 경로에서 반환한 오류다. 어느 프록시가 504를 만들었는지는 외부 NPM/n8n 로그로 확인해야 한다. 요청 실패 후 해당 실행의 MCP 권한도 종료되므로 후속 도구 호출이 실패할 수 있다. `Connection closed`만으로 같은 원인이라고 확정하지 말고 실패 노드와 발생 시각을 비교한다.

사용자가 NPM의 proxy_read_timeout 330s 적용을 확인했으므로 미적용을 원인으로 단정하지 않는다. 이후 제공한 create_page 입력에서 작업 형식 오류가 확인됐으나 해당 출력은 Connection closed였으므로 입력 오류와 연결 종료/504 사이의 인과관계는 아직 확인되지 않았다. 사용자 스크린샷에서도 Require Specific Output Format은 OFF로 확인됐다. 이 옵션을 반복 변경하기보다 실제 실패 노드와 도구 입력/응답을 확인한다.

후속 확인에서 사용자는 330초를 처음에는 짭그마 도메인에만 설정했고 n8n 쪽에는 적용하지 않았던 것으로 확인하여 양쪽 모두 330초로 변경했다고 알렸다. 이후 실제 요청이 129.644초에 completed로 종료되고 변경 제안 1개가 저장된 것을 확인했다. API가 기다리는 대상은 n8n.shnea.kr의 Webhook이므로 해당 호스트 프록시의 응답 대기 설정이 필요하다. 이 확인은 90초를 넘긴 실제 응답/제안 성공이며 모든 요청의 성공이나 화면의 시각 품질을 보장하는 것은 아니다.

Nginx Proxy Manager에서 **Hosts → Proxy Hosts → n8n.shnea.kr → Edit → Advanced**의 기존 설정을 보존하며 아래 응답 대기 설정을 적용한다. 같은 지시어가 이미 있으면 값을 수정한다. Custom Locations에 별도 timeout이 있으면 Webhook을 처리하는 location의 값도 확인한다.

```nginx
proxy_read_timeout 330s;
```

설정 대상은 앱에서 호출하는 n8n 주소의 프록시다. 저장 후 짭그마에서 새 메시지를 보내 새 실행 URL로 확인한다. 과거 실패한 실행 URL이나 고정한 runId로 MCP 노드만 다시 실행하지 않는다. 외부 설정은 사용자가 관리하며 이 저장소에서 변경하지 않았다.

템플릿이 없는 새 화면은 `create_page.operations`로 실제 요소를 조합한다. 새 루트 ID는 `page-root`다. Agent가 빈 페이지만 반복 제안하면 최신 도구 목록을 사용하는 새 대화로 요청하고 System Message를 최신 [프롬프트](../infra/n8n/system-prompt.txt)로 갱신한다. `blank=true`는 사용자가 명시적으로 빈 페이지를 요청할 때만 사용한다. 이전에 저장된 빈 제안은 자동으로 채워지지 않으며 사용자가 거절할 수 있다.

### 이미지 설명은 되지만 화면 생성이 5분에 끝나는 경우

2026-09-17 개발 재현에서 create_page 입력 검증이 두 번 실패한 뒤 300초에 앱이 요청을 실패 처리했습니다. 도구 처리 자체는 각각 4ms였고, 두 생성 호출 사이에 약 108초가 걸렸습니다. 사용자가 제공한 n8n 오류에는 숫자 width/height/minWidth, style 안의 src/placeholder/searchWidth/mobileSearch/searchTargetId/responsive, 미지원 borderBottomWidth/borderBottomColor가 있었습니다. 이 개발 재현을 운영 이력으로 간주하지 않습니다.

최신 API는 숫자 크기와 충돌 없는 props·반응형 표기를 정리하고, 편집기 전용 설정이 없는 일반 CSS는 style.css로 보존합니다. 방향별 테두리, calc 크기, flex 등도 사용할 수 있으며 props.customCss 선언 문자열도 허용합니다. 앱 전용 설정·권한·트리 검증은 유지합니다. 반복 오류를 묶어 다른 오류와 전체 작업 한도가 가려지지 않도록 반환합니다. 새 입력 설명은 MCP 도구 조회로 제공됩니다. AI Agent의 System Message도 [최신 프롬프트](../infra/n8n/system-prompt.txt) 전체로 교체하고 저장·게시하면 같은 작성 규칙을 사용합니다. 외부 워크플로 수정은 사용자가 수행합니다.

캡처 기반 UI 재구성은 카드의 썸네일 영역·비율과 화면 배치를 보존하고, 내부 사진·일러스트·작은 글자/도형은 원본 자산이 없으면 기본 image 또는 플레이스홀더로 대체하도록 안내합니다. 텍스트도 버튼·메뉴·탭·입력 라벨 등 UI 문구와 게시물 제목·본문·작성자·날짜·상품 설명·수치 등 콘텐츠를 구분합니다. 콘텐츠는 비슷한 길이·줄 수의 예시로 대체하며 흐린 글자 복원이나 원문 검색에 시간을 쓰지 않습니다. 영역·계층·타이포그래피는 유지하고 대체 사실을 알립니다. 원문·브랜드·자산 사용을 사용자가 명시하면 그 요청을 따릅니다. 이 기준은 모델 지침이며 자동 콘텐츠 분류기의 보장은 아닙니다. 사용자가 지정한 `화면 캡처 2026-09-17 230152.png`는 3열 게시물 카드의 썸네일 안에 로봇·보안 다이어그램이 포함된 예입니다. 이것이 실제 지연 원인이었다는 실행 증거는 아직 없습니다.

앱의 5분 timeout이 n8n 실행 자체를 취소하는 것은 아닙니다. 실패한 요청의 MCP 권한은 즉시 종료되므로, n8n에서 계속 실행 중이어도 뒤늦은 호출은 401로 거절될 수 있습니다. 해당 실행은 중지하고 수정된 설정으로 새 요청을 보내야 합니다. 대기 한도를 늘리기 전에 생성 도구의 실제 issues를 확인합니다. 이번 변경에서 앱 timeout·n8n 반복 횟수·프록시 제한을 변경하지 않습니다.

## 8. 참고 이미지 연결

텍스트 채팅 연결은 그대로 사용한다. 이미지를 모델이 읽도록 하려면 **Webhook과 AI Agent 사이**에 다음 노드를 추가한다. 기존 OpenRouter 호출을 대체하지 않는다.

1. **If** 노드: Boolean 조건 `{{ !!$json.body.image }}`가 true인지 확인한다.
2. true 출력 → 새 **HTTP Request** 노드. 이름 `참고 이미지 다운로드`, Method `GET`, URL `{{ $('Webhook').first().json.body.image.url }}`, Authentication `None`. Options → Response → Response Format `File`, Put Output in Field `referenceImage`. 오류 무시와 자동 재시도는 끈다.
3. 다운로드 출력 → 기존 **AI Agent**. If의 false 출력도 같은 Agent에 연결한다.
4. AI Agent → Options → **Automatically Passthrough Binary Images**를 켠다. **Prompt (User Message)**가 이미 아래 표현식이면 그대로 둔다. 다르다면 해당 칸을 Expression으로 바꾸고 아래 한 줄을 통째로 넣는다. System Message에 넣는 내용이 아니다. 노드 이름이 `Webhook`일 때 기준이다.

   ```text
   {{ $('Webhook').first().json.body.messages.map(m => `${m.role}: ${m.content}`).join('\n\n') }}
   ```

   중간에 이미지 다운로드 노드를 넣어도 원래 Webhook의 질문을 읽는 표현식이다. `$json.body.messages`로 시작하는 기존 표현식은 위 코드로 바꾼다.
5. **Respond to Webhook**의 Response Body 전체를 아래 Expression으로 바꾼다. 이 변경은 이미지 다운로드와 Agent 전달을 연결한 뒤 적용한다.

```text
{{ JSON.stringify({ reply: $json.output, imageFileId: $('Webhook').first().json.body.image?.fileId ?? null }) }}
```

6. 게시한 뒤 AI 탭에서 이미지 1장을 첨부하고 “이 이미지의 배치를 설명하고 이대로 화면을 그려줘”를 요청한다. Executions에서 다운로드 노드의 Binary `referenceImage`와 이미지 MIME, Agent의 실제 이미지 설명, MCP 제안 미리보기를 확인한다.

앱은 해당 프로젝트에 등록된 PNG/JPEG/WebP/GIF(최대 5 MB) 1장의 원본 다운로드 주소를 `image: {fileId,name,mimeType,url}`로 전달한다. URL은 서버의 고정 파일 서비스 주소에서 생성하며 임의 URL을 받지 않는다. 파일 서비스 원본은 기존 계약의 공개 다운로드를 사용하므로 이 노드에 업로드 Bearer를 넣지 않는다. 원본 삭제/다운로드 실패는 실행 실패로 처리한다.

AI 채팅의 새 첨부는 업로드 전에 최대 1,024px·200 KB 이하로 축소/압축된다. 위 다운로드 노드는 해당 축소본을 그대로 가져오므로 압축을 위한 n8n 설정 변경은 없다. 이미 등록된 파일은 자동 변환하지 않으며 다시 첨부해야 새 기준이 적용된다.

텍스트 요청의 기존 응답은 계속 호환한다. 이미지 요청에서 같은 `imageFileId`가 돌아오지 않으면 앱은 이미지 전달 설정 오류를 표시한다. 이는 워크플로의 처리 확인이며 모델의 이미지 이해 품질을 증명하지 않는다. 이미지 내용 자체는 현재 첨부한 요청에만 전달한다. 후속 질문에서 같은 이미지를 다시 참고하려면 다시 첨부한다. 대화 기록에는 파일 참조와 이름만 보관한다.

근거: [n8n HTTP Request의 File 응답](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/#response), [AI Agent의 Binary Images 옵션](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent/#automatically-passthrough-binary-images). 외부 n8n 변경과 실모델 이미지 검증은 사용자 환경에서 수행한다.

## 개인별 AI 사용량

개인 계정 화면에서 실제 모델 사용량을 조회할 수 있다. 기존 AI Agent 출력에 토큰 정보가 없으면 별도 수집 워크플로를 가져온다. 기존 대화 연결은 유지한다. [사용량 수집 설정](N8N_USAGE_SETUP.md)과 [앱 수신 계약](ACCOUNT_USAGE.md)을 따른다. 수집이 연결되지 않은 요청은 0이 아닌 ‘미집계’로 표시한다.
