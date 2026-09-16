# n8n AI 사용량 수집 연결

기존 대화 워크플로와 별개로 사용량을 수집한다. 앱에서 내 계정 화면을 열어도 이 설정 전에는 요청이 **미집계**로 표시된다. 실제 n8n 버전/실행 출력은 사용자 환경에서 확인해야 하며 이 파일의 수집기는 저장된 실행을 이용하는 별도 워크플로다.

## 가져오기

1. n8n에서 새 워크플로 → Import from File → [`infra/n8n/usage-collector.workflow.json`](../infra/n8n/usage-collector.workflow.json)을 선택한다.
2. **완료된 실행 조회** 노드의 URL에서 `YOUR_N8N_DOMAIN`을 실제 n8n 주소로 바꾼다. Query Parameters의 `workflowId`에 기존 AI 대화 워크플로 ID를 넣는다. 브라우저 주소의 `/workflow/` 뒤 값이다.
3. 해당 노드의 Header Auth 자격 증명을 만든다. Name은 `X-N8N-API-KEY`, Value는 n8n Settings에서 생성한 API 키다. 실행 조회 권한이 필요하다. 이 키는 짭그마 `.env`에 넣지 않는다.
4. 기존 **AI 대화 워크플로** 설정에서 성공/실패 실행 데이터 저장을 켠다. Chat Model 서브노드의 출력도 저장되어야 한다. API에서 `includeData=true` 응답의 `data.resultData.runData`가 비어 있지 않은지 확인한다.
5. 짭그마에서 AI 요청을 한 번 완료한 뒤 수집 워크플로를 수동 실행한다. **모델 사용량 추출** 출력의 `usage.calls`에 실제 입력/출력 토큰이 있고 마지막 HTTP 요청이 성공하는지 확인한다. 앱 아바타 → 내 계정 → 새로고침으로 비교한다.
6. 확인 후 수집 워크플로를 활성화/게시한다. 매분 실행하며 앱에는 약 1분 뒤 반영된다.

기존 AI Agent의 Prompt, MCP, Respond to Webhook 연결은 수정하지 않는다. 수집기에서 쓰는 요청별 보고 토큰은 앱이 원본 Webhook 입력의 `body.usageReport`에 자동으로 넣는다. **짭그마에 사용량 기록** 노드의 Bearer 표현식은 이미 작성되어 있다.

## 집계와 누락 확인

- 조회 범위는 최근 하루이며 cursor로 최대 20페이지(2,000개 실행)까지 조회한다. 더 많으면 최대 페이지 수를 늘리거나 수집 범위를 줄인다. 지원 버전의 API는 `startedAfter`로 기간을 제한한다. 구버전에서 해당 파라미터를 거절하면 제거하고 날짜 필터/조회 범위를 확인한다. 하루 이상 수집이 중단됐다면 기간을 늘려 다시 수집하되 보고 토큰 유효 기간은 7일이다. 수집 스크립트는 여유를 두고 최근 6일만 처리한다.
- 수집기는 `.lmChat` 유형의 실제 실행을 순회하고 각 반복 호출을 다른 ID로 보고한다. 동일 실행 재조회는 이중 합산되지 않는다. 입력/출력 전문은 앱에 전송하지 않는다.
- n8n 기본 기록의 `json.tokenUsage`(response와 같은 레벨), `response.tokenUsage`, `response.llmOutput.tokenUsage`, `json.usage_metadata`/`response.usage_metadata`의 실제 토큰을 읽는다. 한 호출에 여러 위치가 있어도 한 번만 합산한다. `tokenUsageEstimate`는 추정값이므로 제외한다. 마지막 호출만 보고 전체 사용량이라고 표시하지 않는다.
- 모델 출력이 다른 구조이거나 실제 사용량을 제공하지 않으면 미집계/부분 집계로 남는다. 종료된 최근 실행을 모두 제외했다면 실행 상세/워크플로 노드/원본 요청/보고 정보/모델 기록/실제 토큰 중 누락된 범주와 건수를 오류로 표시한다. 오류에는 원본 메시지·인증값을 넣지 않는다. 사용자 Prompt에 사용량을 써 달라고 요청하지 않는다.
- 사용량이 있는 성공/실패 실행을 모두 처리한다. 실패한 모델 호출에 정보가 없으면 전체 완료로 표시하지 않는다. 모델명이 실제 메타데이터에 없으면 ‘정보 없음’으로 둔다.
- API가 큰 실행 데이터를 생략했다면 지원 버전에서 `ignoreDataSizeLimit=true`를 추가한다. 저장 데이터 삭제/가림 정책으로 원본 Webhook이나 모델 출력이 없으면 수집할 수 없다.
- 마지막 HTTP 노드는 한 요청 오류 후 다음 항목도 처리하도록 구성했다. 빨간 오류 항목(401 만료, 409 같은 호출의 다른 값 등)은 n8n에서 확인한다. 오류를 해결하지 않고 집계 완료로 간주하지 않는다.
- 수집 워크플로 자체는 성공 실행을 저장하지 않도록 설정했다. 실행 조회 키와 요청별 보고 토큰을 Prompt/공개 내보내기에 넣지 않는다.

단독 Code 노드 스크립트는 [`collect-usage.js`](../infra/n8n/collect-usage.js)다. 앱 도메인을 바꿀 때 스크립트의 `APP_ORIGIN`도 바꾼다. 원본 Webhook의 URL을 임의로 신뢰하지 않고 이 도메인의 해당 요청 경로와 일치할 때만 전송한다.

## 기존 수집기 코드만 갱신하기 — 2026-09-16

입력은 있지만 출력이 없던 초기 코드가 `response` 옆의 실제 `tokenUsage`를 놓치는 문제를 수정했다. [n8n 공식 tracing 구현](https://github.com/n8n-io/n8n/blob/master/packages/%40n8n/ai-utilities/src/utils/n8n-llm-tracing.ts)의 저장 구조를 기준으로 회귀 검증했다. 사용자 실행 원문은 아직 확인하지 않았으므로 모든 미집계가 이 원인이라고 확정하지 않는다.

1. 로컬 `infra/n8n/collect-usage.js`의 전체 내용을 복사한다.
2. n8n 수집 워크플로의 **모델 사용량 추출** 노드를 열고 JavaScript 코드를 전부 교체한다. Mode는 **Run Once for All Items**다.
3. 워크플로 전체를 수동 실행한다. 성공 시 추출 결과의 `usage.calls`와 마지막 노드의 `{"ok":true}`를 확인한다. 오류 시 새 진단 문구를 확인한다.
4. 저장·게시하고 앱 내 계정을 새로고침한다. 기존 URL/workflowId/Credential은 유지하며 재가져오기는 필요 없다. 앱 재시작이나 AI 답변 형식 변경도 필요 없다.

공식 참고: [n8n API 페이지 조회](https://github.com/n8n-io/n8n-docs/blob/main/docs/connect/n8n-api/pagination.md), [실행 조회 API 명세](https://github.com/n8n-io/n8n/blob/master/packages/cli/src/public-api/v1/handlers/executions/spec/paths/getExecutions.generated.yml). 앱 계약은 [내 계정과 사용량](ACCOUNT_USAGE.md)에 정리했다.
