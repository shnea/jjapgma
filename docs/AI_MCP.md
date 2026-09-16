# AI 채팅과 프로젝트 MCP

## 구현 범위

디자인 오른쪽 AI 탭에서 사용자별 프로젝트 대화를 저장한다. 현재 페이지·선택 요소·반응형 화면·저장 revision을 전달한다. 저장되지 않은 편집이 있으면 먼저 저장한다. 질문과 조회는 VIEWER도 가능하며 변경 제안과 적용은 OWNER/EDITOR만 가능하다.

답변은 CommonMark/GFM Markdown(제목·목록·표·코드·인용·링크·체크 목록·취소선)으로 표시한다. raw HTML/실행 스크립트는 허용하지 않는다. 내 메시지는 오른쪽, 답변은 왼쪽이며 브라우저 시간대로 전송/응답 시각을 표시한다. 상단 문맥과 하단 입력창 사이의 대화·제안 영역만 스크롤하고, 과거 메시지를 읽는 동안 자동 스크롤을 강제하지 않는다. Enter 전송, Shift+Enter/Ctrl+Enter 줄바꿈, 한글 IME 조합 중 전송 방지를 공통 Composer로 처리한다.

참고 이미지 1장(PNG/JPEG/WebP/GIF)은 브라우저에서 긴 변 최대 1,024px·200 KB 이하로 줄인 뒤 기존 file-service multipart proxy로 업로드한다. JPEG 품질 70%에서 필요시 품질/해상도를 단계적으로 낮추고 비율을 유지하며 확대하지 않는다. 이미 기준 이내인 정지 이미지는 그대로 보낸다. 변환 시 투명 배경은 흰색, GIF는 첫 프레임을 사용한다. 원본은 최대 20 MB·4천만 픽셀·한 변 16,384px까지 받으며 업로드 전에 실제 디코딩을 검사한다. 실패 시 원본을 대신 업로드하지 않고 오류를 표시한다. 첨부 영역에 변환 전후 용량·최종 해상도를 표시한다.

OWNER/EDITOR만 업로드/첨부할 수 있고, 서버는 project_files에 연결된 실제 MIME·크기를 확인한다. 기존 참조 호환을 위해 서버의 이미지 상한은 5 MB를 유지한다. ai_runs.context에는 파일 참조만 저장하고 n8n에는 파일 서비스에 저장된 축소본의 다운로드 URL을 전달한다. 임의 URL 입력·로컬 파일 저장·원본 bytes DB 보관·provider 직접 호출은 하지 않는다. 현재 요청에 첨부한 이미지만 모델 입력으로 보내며 이전 이미지 재참조는 다시 첨부한다. n8n이 동일한 imageFileId를 응답하지 않으면 실패 처리하고, 처리가 끝나지 않은 이미지 실행의 제안은 목록에서 제외하고 적용도 차단한다. [필수 n8n 이미지 설정](N8N_SETUP.md#8-참고-이미지-연결).

두 연결은 같은 API 모듈과 UI Spec을 사용한다. 별도 MCP 컨테이너나 모델 공급자 직접 호출은 추가하지 않는다.

| 연결 | 주소 | 인증과 범위 |
| --- | --- | --- |
| n8n 내장 AI | `/api/mcp/n8n/{runId}` | n8n의 `AI_MCP_TOKEN` + 서버가 만든 실행 ID. 진행 중인 요청의 사용자·프로젝트·페이지, 최대 5분 30초만 유효 |
| 로컬 에이전트 | `/api/mcp/projects/{projectId}` | 사용자 발급 Bearer 토큰. 지정 프로젝트와 읽기/변경 제안 범위 |

연결은 Streamable HTTP의 POST/JSON 응답 방식이다. GET의 SSE 스트림은 제공하지 않는다. 공식 SDK 1.30.0을 고정했다. OAuth 자동 등록은 제공하지 않으며 URL과 Authorization 헤더를 설정할 수 있는 클라이언트에서 사용한다. [SDK 서버 문서](https://ts.sdk.modelcontextprotocol.io/server), [n8n MCP Client Tool](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp).

## 로컬 에이전트 연결

프로젝트 상단 **MCP 연결**에서 이름·권한·만료일을 선택해 발급한다. 토큰과 설정 예시는 발급 직후 한 번만 표시한다. DB에는 토큰 해시만 저장한다. 인증 정보는 에이전트의 비공개 설정에 넣고 공유 저장소에 커밋하지 않는다.

사용자는 자신의 연결을, 소유자는 프로젝트 내 연결을 폐기할 수 있다. 갱신은 새 연결 발급 후 기존 연결 폐기로 진행한다. 공유 취소 시 연결을 폐기하므로 재공유해도 이전 토큰은 되살아나지 않는다. 사용자당 활성 연결은 최대 50개다.

## 도구와 적용

공식 템플릿은 기존 7개를 보존한 21개이며 [화면 목록](PAGE_LIBRARY.md)을 따릅니다. MCP는 같은 Registry에서 최신 목록과 생성기를 읽습니다. `chart`는 `chartVariant`(bar/line/donut), `chartData`(label/value, 최대 24개), `chartUnit`을 사용합니다. `wizard`의 자식 컨테이너/카드가 단계이며 자식 이름이 단계 제목입니다. 검색 유형 `input`의 `searchTargetId`로 테이블/메뉴에 연결할 수 있습니다. 이 요소를 쓸 때 필요한 types에 포함해 스키마를 조회하세요. 앱/API 갱신 외에 새 환경변수나 n8n 워크플로 변경은 필요하지 않습니다.

조회: `get_design_context`, `get_project`, `get_current_selection`, `get_pages`, `get_page_spec`, `get_component_registry`, `get_component_schema`, `get_templates`, `get_template`, `get_theme`, `get_actions`, `get_revision`, `get_proposals`.

새 화면은 `get_design_context({types:[...]})`로 필요한 요소의 해당 속성과 기본 노드, 공통 스타일 한 벌, 간결한 요소/템플릿 목록을 받습니다. 12종 조회 제한을 제거하여 등록된 모든 종류를 한 번에 조회할 수 있으며 중복은 한 번만 반환합니다. 응답량은 필요한 종류 선택과 공통 스타일 중복 제거로 줄입니다. types 생략 시 container/navbar/heading/text/button/card를 제공합니다. 알 수 없는 종류와 빈 배열은 오류이며 전체 HTTP 요청 크기 제한은 유지합니다. 기존 화면 수정만 pageId를 지정해 같은 권한 검사 후 명세·revision을 함께 받습니다. 새 화면에는 현재 페이지 전체 조회가 필요하지 않습니다. 조회 후 전체 operations를 한 번의 create_page로 묶습니다. 컴포넌트 단건 조회도 해당 요소 속성만 반환하고 Registry는 이름·분류·자식 허용 여부만 반환합니다. 기존 Registry의 properties 편집 메타데이터 대신 design context/단건 schema를 사용합니다.

쓰기 도구의 공개 입력 명세는 작업 구조와 props/style 객체로 간결하게 표시하며, 실제 실행은 기존 patchSchema 전체 검증을 유지합니다. 허용 값은 조회한 요소/스타일 명세를 따릅니다. get_design_context의 operationGuide에는 add/update/move/remove/template와 모바일 수정 예시를 함께 제공합니다. 추가는 op=add와 type/id/parentId가 필수이며 기존 루트 page-root는 update합니다. create/componentType, CSS 문자열 padding, flex는 허용하지 않습니다.

잘못된 입력에는 최대 10개 오류 경로·코드, 기대 타입/허용 enum, 최소·최대 범위와 경계 포함 여부를 반환합니다. 지원하지 않는 필드는 unexpectedKeys에 최대 10개·각 80자까지 이름을 반환하고 필드 값 원문은 넣지 않습니다. 잘못된 op에는 허용 작업 이름을 반환합니다. create_page/apply_ui_patch의 스키마 실패에는 같은 operationGuide를 반환하므로 이미 받은 명세를 반복 조회할 필요가 없습니다. 실패는 isError=true이며 변경을 저장하지 않습니다. mcp_tool_finished 로그에는 도구명·실행/연결 ID·성공 여부·소요 시간과 스키마 실패 시 validationCodes만 남깁니다. 인자·오류 경로·사용자 문구는 로그에 기록하지 않습니다. 서버가 잘못된 부모 관계나 지원하지 않는 CSS를 추측해 자동 변환하지 않습니다.

변경 제안: `apply_ui_patch`, `create_page`, `rename_page`. 읽기 연결에는 노출하지 않으며 직접 호출도 거절한다. `apply_ui_patch`는 추가·속성/스타일 수정·기기별 스타일·이동·삭제·공식 템플릿 삽입을 최대 100개 작업으로 받는다. **도구 이름과 관계없이 즉시 저장하는 기능이 아니라 미리보기 제안 생성이다.** n8n과 외부 에이전트 모두 AI 탭에서 사용자 적용을 거친다.

`create_page`는 `templateId` 또는 `operations`로 실제 구성 요소를 받는다. 새 페이지 루트 ID는 `page-root`이며 부모 요소를 먼저 추가한 뒤 해당 ID 아래 자식을 추가한다. 템플릿을 바탕으로 operations를 추가할 수도 있다. 작업 전체를 검증한 뒤 한 제안으로 저장하므로 중간 실패 시 빈 제안이 남지 않는다. 내용 없는 생성을 허용하려면 사용자의 명시적인 빈 페이지 요청에 한해 `blank=true`를 전달한다. 도구 결과는 실제 `elementCount`와 `componentCounts`를 포함한다. 화면 구성은 기존 Registry 범위이며 채팅 메시지 전송 같은 업무 기능을 자동 구현하는 것은 아니다.

템플릿은 요구한 화면을 만드는 선택적 재료다. 예를 들어 dashboard 템플릿에는 헤더·사이드바가 없으므로 해당 구성을 요청받으면 그대로 반환하지 않고 직접 조합하거나 templateId와 operations로 빠진 영역을 추가해야 한다. 목록에는 실제 최상위 영역 종류와 자식 종류를 제공한다. get_template은 루트 page-root와 안정적인 템플릿 요소 ID를 반환하고 create_page도 같은 ID로 초기화하므로 조회한 기존 요소를 update/move/remove할 수 있다. 템플릿 본문을 새 중앙 컨테이너로 이동하고 헤더·사이드바·모바일 배치를 추가한 뒤 한 번에 제안/적용할 수 있다. ID는 페이지 안에서만 유일하며 공식 템플릿 원본·다른 페이지는 변경하지 않는다. 저장된 기존 페이지/제안의 ID를 재작성하지 않는다. 자연어 요구 충족 판단은 n8n 모델/프롬프트 책임이며 서버 스키마 검증이 의미상의 누락까지 자동 판정하지는 않는다.

현재 명세와 revision을 읽고 패치를 제안한다. 서버가 요소 스키마·잠금·트리·파일 참조·권한을 검사한다. 적용은 기존 PagesService의 같은 트랜잭션에서 수행하며 한 버전을 만든다. 같은 제안을 다시 적용해도 중복 버전은 생기지 않는다.

제안 생성 후 화면이 저장되면 미리보기에서 AI 기준 버전·현재 화면·AI 제안을 비교한다. 서로 다른 속성의 변경은 병합하며 같은 속성, 삭제와 수정, 양쪽의 서로 다른 요소 순서/구조 변경은 자동 병합하지 않는다. 사용자는 병합 결과를 미리보거나 **AI 제안으로 덮어쓰기**를 명시적으로 선택할 수 있다. 덮어쓰기는 페이지 전체를 제안으로 교체하고 기존 화면은 버전 기록에 보존한다. 미저장 편집은 먼저 저장하고 미리보기를 갱신한다. 검토 이후 다시 저장된 경우에는 409와 함께 최신 검토 결과를 받아 재확인하며 쓰기를 자동 재시도하지 않는다. 제안 생성 시의 오래된 revision 거절 규칙은 유지한다.

AI 대화의 선택된 텍스트는 Ctrl+C/Command+C로 복사한다. 편집기의 요소 복사 단축키는 대화 영역이나 선택한 텍스트를 가로채지 않는다. 메시지별 복사 버튼은 Markdown 원문을 클립보드에 복사하며 실패 여부를 표시한다.

AI 적용 버전은 `page_revisions.source=ai`, `proposal_id`로 대화·제안·실행에 연결된다. 기존 실행 취소와 버전 기록을 사용한다. 프로젝트 소유권, 공유 권한, 보안 설정 변경은 AI 도구로 제공하지 않는다. 공식 템플릿만 MCP로 조회하며 개인 템플릿은 기존 사용자 패널을 사용한다. 업무 API/데이터 바인딩은 아직 구현하지 않았으므로 지원한다고 응답하지 않는다.

## API

- `GET/POST /api/projects/:id/mcp-connections`, `DELETE /api/projects/:id/mcp-connections/:connectionId`
- `GET/POST /api/projects/:id/chat`: POST는 실행을 접수하고 `runId/threadId`를 반환한다. 화면은 실행 결과를 조회한다.
- `GET /api/projects/:id/proposals`, `GET /api/proposals/:id`
- `POST /api/proposals/:id/apply`, `DELETE /api/proposals/:id`

관리·채팅·적용 API는 기존 세션/CSRF를 사용한다. MCP는 세션 쿠키로 인증하지 않는다. 모든 호출에서 프로젝트 권한과 만료·폐기를 검사한다. 대화와 제안은 작성자에게만 제공된다.

이미 적용된 007 마이그레이션은 변경하지 않는다. `ai_runs.token_hash`는 기존 nullable 컬럼을 보존한 것으로 현재 인증에는 사용하지 않는다. 개인 연결 토큰 해시는 `mcp_connections`에만 저장하며 n8n은 서버 환경변수 credential과 실행 ID를 검증한다.

008 마이그레이션은 `completed_at`만 추가한다. 기존 실행의 완료 시각은 알 수 없어 null로 유지하고 새 성공·실패·시간 초과 실행부터 기록한다. 조회 응답에는 created_at/completed_at/image가 포함된다. 환경변수 추가는 없다.

AI는 사용자당 한 작업, 분당 최대 6회, 상류 timeout 5분(300초), 실행/MCP 유효시간 5분 30초(준비·저장 여유 포함), 응답 최대 256KB/본문 30,000자로 제한한다. 자동 재시도나 공급자 우회는 없다. SIGTERM/SIGINT 정상 종료 시 새 채팅 접수를 막고 이 프로세스의 진행 중 요청을 중단·실패로 기록한 뒤 DB를 닫는다. 다른 API 프로세스의 실행은 변경하지 않는다. 강제 종료·정전처럼 종료 처리를 실행하지 못한 작업은 만료 후 조회 시 실패로 정리한다. n8n 외부 워크플로 자체 취소를 뜻하지 않으며 종료된 실행의 MCP 권한은 차단된다. 편집 화면은 15초 간격으로 외부 저장 버전을 확인하고 충돌 안내를 표시한다.

## 외부 설정과 검증

적용 지침: [AI Agent API](../eocs/agent/integrations/외부서비스_ai-agent-api_사용지침.md). 외부 모델 호출·자격 정보·시스템 프롬프트는 n8n 책임이며 앱은 명세·권한·대화 저장·MCP·변경 검증과 버전을 맡는다.

실제 n8n 설정 절차는 [n8n 설정](N8N_SETUP.md). 외부 변경은 사용자가 진행한다. `.env`와 `.env.example`에 `AI_ENABLED`, `AI_WEBHOOK_URL`, `AI_WEBHOOK_TOKEN`, `AI_MCP_TOKEN`을 동기화했다. 기본은 비활성이다. 파일·로그인·알림 설정은 재사용한다.

테스트 fixture는 인증된 Webhook 요청을 받고 공식 MCP 클라이언트로 짭그마 서버를 호출한다. 2026-09-16 사용자 실제 n8n 답변과 로그인 템플릿 페이지 생성/적용을 확인했다. 후속 템플릿 없는 화면 생성 보완 검사는 격리 fixture로 진행하며 실모델의 생성 품질 확인과 구분한다. 사용자 로컬 에이전트 제품별 등록은 미검증이다.
