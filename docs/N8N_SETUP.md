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

`Model output doesn't fit required format`은 n8n 출력 파서가 기대한 형식과 모델 출력이 맞지 않는 경우를 먼저 확인한다. AI Agent의 Parameters에서 Require Specific Output Format을 끄고, 연결된 Output Parser 선이 있으면 해제한다. Respond to Webhook의 JSON 표현식은 유지하고 저장·게시 후 앱에서 새 요청으로 검사한다. On Error를 Continue로 바꾸어 실패를 성공 응답으로 보내지 않는다. 해당 옵션이 이미 꺼져 있다면 실패 노드 이름과 Error details를 확인하여 파서 오류인지 도구 인자/모델 출력 오류인지 구분한다. [n8n 출력 파서 주의사항](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.outputparserstructured/common-issues).

Webhook의 Respond는 `Using 'Respond to Webhook' Node`, 마지막 Respond to Webhook은 JSON을 선택하고 Response Body 전체를 Expression 모드에서 `{{ JSON.stringify({ reply: $json.output }) }}`로 설정한다. 바깥에 따옴표나 중괄호를 추가하지 않는다. `Immediately`의 접수 메시지나 Agent의 `{output: ...}`만 반환하면 앱의 답변 계약에 맞지 않는다.

앱은 HTTP 상태 오류, 빈 응답, JSON 형식 오류, reply 누락, 응답 크기 초과, 5분 시간 초과를 구분해 표시한다. HTTP 401/403은 Webhook Header Auth의 Name `Authorization`과 Value `Bearer 토큰값`을 확인한다. HTTP 5xx는 n8n Executions에서 실패 노드와 오류를 확인한다. 응답 내용·토큰은 로그에 남기지 않고 `ai_run_failed`에 실행 ID·단계·오류 코드·HTTP 상태·경과 시간만 기록한다.

MCP initialize와 tools/list의 200/202만으로 모델 실행이나 도구 호출 성공을 판단하지 않는다. 실행이 끝나거나 실패한 뒤에는 해당 실행의 MCP 주소가 만료되므로 짭그마에서 새 요청으로 재검사한다.

create_page 입력이 `op:"create"`, `componentType`, 부모가 없는 요소 배열이라면 작업 형식이 잘못된 것이다. 올바른 추가 예시는 `{"op":"add","parentId":"page-root","id":"header","type":"container","style":{"padding":24}}`다. 루트 page-root는 이미 있으므로 update하며 문자열 padding이나 flex는 쓰지 않는다. get_design_context와 쓰기 스키마 오류 응답의 operationGuide를 따른다. 최신 System Message에는 수정 후 한 번만 재시도하고 같은 인자/연결 종료에 재시도하지 않는 지침이 있다. 서버의 안내는 즉시 제공되지만 n8n System Message는 사용자가 [파일](../infra/n8n/system-prompt.txt) 전체로 교체하고 저장·게시해야 한다.

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
