# 요소 구현 및 통합 정리

팔레트의 과도한 껍데기 요소(비밀번호, 숫자, 검색, 행/열, 스크롤영역, 키와값 등)를 본질적인 UI 컴포넌트로 통합하고, 세부 변형과 유형을 **우측 속성 패널(Inspector)**에서 직관적으로 제어하도록 리팩터링했습니다.

현재 Registry에는 **정리된 36종의 핵심 요소**가 등록되어 있으며, 기존 64종 스펙과의 하위 호환성을 위해 `legacyTypeAliases`를 제공합니다.

| 분류 | 정리된 요소 목록 (36종) | 주요 통합 및 속성 제어 내용 |
| --- | --- | --- |
| **배치 (Layout)** | `container`(컨테이너), `grid`(그리드), `card`(카드) | `row`, `column`, `stack`, `section`, `scrollArea`, `splitPane`을 통합. `direction`(가로/세로), `overflow`(스크롤/숨김), `gap`, `padding`을 속성창에서 제어 |
| **기본 (Basic)** | `heading`(제목), `text`(본문 텍스트), `button`(버튼), `link`(링크), `icon`(아이콘), `image`(이미지), `divider`(구분선), `spacer`(여백) | `iconButton`, `toggleButton`, `fab`을 `button`의 `variant`(기본/아웃라인/고스트/아이콘/FAB) 및 아이콘 설정으로 통합. `label`을 `text`로 통합 |
| **입력 (Form)** | `input`(입력창), `textarea`(여러 줄 입력), `select`(선택 목록), `checkbox`(체크박스), `radio`(라디오 그룹), `switch`(스위치), `dateRange`(날짜 범위), `fileUpload`(파일 업로드) | `password`, `number`, `search`, `date`, `time`, `color`, `range`, `otp`를 `input`의 `controlType` 속성으로 통합. `multiSelect`를 `select`의 `multiple` 체크박스로 통합 |
| **탐색 (Navigation)** | `navbar`(내비게이션 바), `tabs`(탭), `breadcrumb`(경로 표시), `pagination`(페이지 번호), `stepper`(단계 표시) | `header`, `sidebar`, `menu`, `bottomNavigation`을 `navbar`의 방향 및 아이템 구성으로 통합 |
| **데이터 (Data)** | `table`(테이블), `list`(목록), `descriptionList`(설명 목록), `badge`(배지), `avatar`(아바타), `accordion`(아코디언) | `keyValue`를 `descriptionList`로 통합. `chip`을 `badge`의 `shape`(기본 라운드 / 알약형 Pill) 속성으로 통합 |
| **피드백 (Feedback)** | `alert`(알림), `progress`(진행률), `spinner`(로딩 표시), `skeleton`(스켈레톤), `emptyState`(상태 화면) | `errorState`를 `emptyState`의 `stateType`(빈 상태 / 오류 / 완료) 속성으로 통합 |
| **고급 (Advanced)** | `jsonViewer`(JSON 보기) | 읽기 전용 JSON 뷰어 |

---

### 하위 호환성 (Legacy Type Aliases)
기존 저장된 데이터나 레거시 스펙(`row`, `column`, `password`, `keyValue`, `chip` 등)이 전달될 경우, `createNode` 및 `legacyTypeAliases` 매핑을 통해 자동으로 상응하는 최신 컴포넌트 타입과 기본 속성/스타일로 보정되어 렌더링 및 저장이 중단 없이 유지됩니다.
