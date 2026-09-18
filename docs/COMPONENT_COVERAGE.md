# 요소 구현 및 통합 정리

`richText`(서식 편집기)를 추가했습니다. 승인된 BlockNote 편집기/뷰어, 디자인 속성, 문서·공지 템플릿, `tmp` 파일 업로드와 내보내기를 사용합니다. [별도 설명서](RICH_TEXT_EDITOR.md).

버튼·아이콘·메뉴·표의 아이콘 선택기는 공통 `iconCatalog`를 사용합니다. 공유·내보내기·업로드·첨부·문서·사용자 초대·잠금·새로고침·실행 취소·필터·정렬·도움말·결제 등 범용 아이콘 41개를 추가했습니다. 한글 이름이나 영문 ID로 검색하고 실제 모양을 보고 선택할 수 있으며 저장·미리보기·HTML/Storybook 내보내기도 같은 렌더러를 사용합니다. 기존 아이콘 ID는 유지합니다.

팔레트의 과도한 껍데기 요소(비밀번호, 숫자, 검색, 행/열, 스크롤영역, 키와값 등)를 본질적인 UI 컴포넌트로 통합하고, 세부 변형과 유형을 **우측 속성 패널(Inspector)**에서 직관적으로 제어하도록 리팩터링했습니다.

현재 Registry의 요소는 `packages/ui-spec/src/catalog/`에서 관리하며, 기존 스펙과의 하위 호환성을 위해 `legacyTypeAliases`를 제공합니다. 모달·다이얼로그·Non-modal은 별도 요소로 제공합니다. `chat`(채팅)은 공통 ChatMessage/ChatComposer를 사용하며, 예시 메시지·좌우 위치·시간·응답 대기와 내부 스크롤을 지원합니다. 실제 n8n 채팅은 편집기의 AI 탭에서 연결합니다.

| 분류 | 정리된 요소 목록 | 주요 통합 및 속성 제어 내용 |
| --- | --- | --- |
| **배치 (Layout)** | `container`(컨테이너), `grid`(그리드), `card`(카드) | `row`, `column`, `stack`, `section`, `scrollArea`, `splitPane`을 통합. `direction`(가로/세로), `overflow`(스크롤/숨김), `gap`, `padding`을 속성창에서 제어 |
| **창 (Layout)** | `modal`(모달), `dialog`(다이얼로그), `nonModal`(Non-modal) | 모달은 배경 입력 차단·위치 고정. 다이얼로그/Non-modal은 배경 입력·드래그 허용, 재열기 시 위치 초기화. 자식 요소와 버튼/아이콘 액션으로 열기·닫기·전환. [동작](UI_CONTROLS.md) |
| **패널·전환 (Layout)** | `sidePanel`(사이드 패널), `drawer`(서랍), `carousel`(캐러셀) | 모두 자유로운 자식 요소 구성. 패널 좌우/접기/모바일 서랍, 독립 서랍, 슬라이드 전환·자동 재생. [사용법](MAIN_LAYOUT.md) |
| **단계별 입력 (Layout)** | `wizard` | 자식 컨테이너/카드가 각 단계. 이전/다음/완료, 단계 이동 중 입력 유지, 기본 입력 검증, 편집 선택 단계 표시 |
| **기본 (Basic)** | `heading`(제목), `text`(본문 텍스트), `button`(버튼), `link`(링크), `icon`(아이콘), `image`(이미지), `divider`(구분선), `spacer`(여백) | `iconButton`, `toggleButton`, `fab`을 `button`의 `variant`(기본/아웃라인/고스트/아이콘/FAB) 및 아이콘 설정으로 통합. `label`을 `text`로 통합 |
| **입력 (Form)** | `input`(입력창), `textarea`(여러 줄 입력), `select`(선택 목록), `checkbox`(체크박스), `radio`(라디오 그룹), `switch`(스위치), `dateRange`(날짜 범위), `fileUpload`(파일 업로드) | `password`, `number`, `search`, `date`, `time`, `color`, `range`, `otp`를 `input`의 `controlType` 속성으로 통합. `multiSelect`를 `select`의 `multiple` 체크박스로 통합 |
| **탐색 (Navigation)** | `navbar`(내비게이션 바), `searchBox`(메뉴 검색), `tabs`(탭), `breadcrumb`(경로 표시), `pagination`(페이지 번호), `stepper`(단계 표시) | navbar는 기존 items 및 아이콘·하위 메뉴 구조를 지원. searchBox는 대상 메뉴 ID에 연결. 예전 header/sidebar 별칭은 유지하며 새 접이식 패널은 sidePanel을 사용 |
| **데이터 (Data)** | `table`(테이블), `list`(목록), `descriptionList`(설명 목록), `badge`(배지), `avatar`(아바타), `accordion`(아코디언) | `keyValue`를 `descriptionList`로 통합. `chip`을 `badge`의 `shape`(기본 라운드 / 알약형 Pill) 속성으로 통합 |
| **피드백 (Feedback)** | `alert`(알림), `progress`(진행률), `spinner`(로딩 표시), `skeleton`(스켈레톤), `emptyState`(상태 화면) | `errorState`를 `emptyState`의 `stateType`(빈 상태 / 오류 / 완료) 속성으로 통합 |
| **차트·그래프 (Data)** | `chart` | 세로 막대·가로 막대·꺾은선·영역·도넛을 한 요소의 변형으로 통합. 항목/값/단위 편집, 최대 24개 비음수 데이터, 테마/빈 데이터/텍스트 값 목록 지원 |
| **고급 (Advanced)** | `jsonViewer`(JSON 보기) | 읽기 전용 JSON 뷰어 |

---

### 하위 호환성 (Legacy Type Aliases)
기존 저장된 데이터나 레거시 스펙(`row`, `column`, `password`, `keyValue`, `chip` 등)이 전달될 경우, `createNode` 및 `legacyTypeAliases` 매핑을 통해 자동으로 상응하는 최신 컴포넌트 타입과 기본 속성/스타일로 보정되어 렌더링 및 저장이 중단 없이 유지됩니다.
