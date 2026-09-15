# UI Builder Platform Master Specification
## 모든 프로젝트의 공통 UI 설계·스토리북·MCP 기반 개발 플랫폼

- 문서 상태: Draft Final
- 목적: 향후 신규 프로젝트의 UI 설계와 개발 기준을 하나의 플랫폼으로 통합
- 핵심 산출물: UI Tree / JSON Spec, Component Registry, Template Registry, Storybook Export, MCP Server
- 기본 원칙: **사람은 직관적으로 설계하고, AI는 구조화된 동일한 설계를 읽어 일관되게 구현한다.**

---

# 1. 제품 비전

이 제품은 단순한 화면 그리기 도구나 스토리북 생성기가 아니다.

목표는 다음과 같다.

```text
사람
  ↓
UI Builder에서 화면 설계
  ↓
공통 UI Spec 저장
  ↓
Storybook / Preview / 문서화
  ↓
MCP로 AI Agent에 제공
  ↓
실제 프로젝트 구현
```

향후 대부분의 신규 프로젝트는 이 플랫폼을 기준으로 설계하고,  
AI Agent 또는 개발자가 동일한 Component / Theme / Layout / Interaction 규칙을 사용해 구현할 수 있어야 한다.

즉 이 제품은 다음을 동시에 제공한다.

- UI 설계 도구
- 화면 구조 저장소
- Component Registry
- Template Registry
- Design System 관리
- 반응형 UI 설계 도구
- Storybook 내보내기
- MCP 기반 AI 개발 연동
- 프로젝트별 UI 자산 저장소
- 버전 관리 및 협업 기반

---

# 2. 최상위 설계 원칙

## 2.1 단일 UI Spec

Canvas, Layer Tree, Storybook, MCP, Preview가 서로 다른 데이터를 사용하지 않는다.

모든 기능은 하나의 공통 UI Tree / JSON Spec을 소비한다.

```text
Palette
   ↓
UI Tree / JSON Spec
   ├─ Canvas
   ├─ Layer Tree
   ├─ Inspector
   ├─ Preview
   ├─ Storybook
   └─ MCP
```

같은 화면을 기능별로 별도 저장하지 않는다.

---

## 2.2 직관성 우선

내부 구현은 복잡해도 사용자 UI는 최대한 단순해야 한다.

예:

```text
내부
display: flex
flex-direction: row
justify-content: center
align-items: center

사용자 UI
가로 배치
정렬: 가운데
```

CSS나 브라우저 내부 용어를 그대로 노출하지 않는다.

고급 사용자가 필요할 때만 "고급 설정"에서 세부 설정을 볼 수 있게 한다.

---

## 2.3 좋은 기본값

사용자가 모든 옵션을 직접 설정해야 하는 Builder는 사용성이 낮다.

각 요소는 실무에서 가장 자주 사용하는 상태를 기본값으로 제공한다.

예:

```text
Input
- Label 사용: ON
- Placeholder 사용: ON
- Error 영역: ON
- Desktop: 표시
- Tablet: 표시
- Mobile: 표시
```

---

## 2.4 Component보다 Registry가 중요

기본 컴포넌트를 많이 제공하되, 제품이 특정 컴포넌트 수에 종속되지 않도록 한다.

```text
Built-in Components
+
Custom Components
+
Project Components
```

새로운 컴포넌트를 Builder 코어 수정 없이 등록할 수 있어야 한다.

---

## 2.5 반응형은 기본 기능

모든 UI는 기본적으로 Responsive Web을 전제로 한다.

모든 요소는 다음 환경을 고려한다.

```text
Desktop
Tablet
Mobile
```

요소 전체뿐 아니라 Label, Icon, Action, Helper Text 등 하위 영역도 Breakpoint별 표시 여부를 제어할 수 있어야 한다.

---

# 3. 사용자 / 인증

## 3.1 운영 인증

기존 OIDC를 사용한다.

- 운영 환경은 OIDC 인증 필수
- 별도 로그인 시스템 중복 구현 금지
- 사용자 ID는 OIDC Subject 기준
- 프로젝트 권한은 내부 DB에서 관리

---

## 3.2 개발자 접근 모드

개발 환경에서는 빠른 접근을 위한 Developer Auth Bypass를 지원한다.

예:

```text
DEV_AUTH_BYPASS=true
```

단순히 인증을 제거하지 않는다.

개발자 우회 사용 시에도 내부적으로 Developer User를 생성하여 다음 로직은 동일하게 적용한다.

- User
- Project Permission
- Owner / Editor / Viewer
- Audit
- Version

운영 환경에서는 반드시 비활성화한다.

---

# 4. 프로젝트 관리

프로젝트가 최상위 작업 단위다.

```text
User
 └─ Project
     ├─ Pages
     ├─ Components
     ├─ Templates
     ├─ Theme
     ├─ Assets
     ├─ Versions
     ├─ Members
     └─ Settings
```

---

## 4.1 프로젝트 기본 정보

- Project ID
- Project Name
- Description
- Owner
- Status
- Thumbnail
- Default Theme
- Default Breakpoints
- Created At
- Updated At

---

## 4.2 프로젝트 권한

최소 다음 권한을 제공한다.

```text
OWNER
EDITOR
VIEWER
```

### OWNER

- 프로젝트 설정 변경
- 사용자 초대 / 제거
- 권한 변경
- 프로젝트 삭제
- 모든 편집 가능

### EDITOR

- 화면 편집
- Template 추가
- Component 사용
- Version 생성
- Storybook Export

### VIEWER

- 화면 조회
- Preview
- Version 조회
- MCP 조회 권한은 정책에 따라 제한 가능

---

## 4.3 프로젝트 공유

공유는 기본적으로 프로젝트 단위로 한다.

초기 버전에서는 Page 단위 ACL은 구현하지 않는다.

사용자는 프로젝트에 초대하여 공유한다.

---

# 5. 협업 / 버전 관리

## 5.1 1차 버전

실시간 공동 편집은 초기 필수 기능으로 두지 않는다.

초기에는 Revision 기반 Optimistic Concurrency를 사용한다.

```text
A가 revision 10 편집
B가 revision 10 편집

B가 먼저 저장
→ revision 11 생성

A가 저장
→ 충돌 감지
```

A에게 다음 선택지를 제공한다.

```text
최신 버전 다시 불러오기
내 변경을 새 버전으로 저장
변경점 비교
취소
```

---

## 5.2 Version

화면 저장은 History를 남길 수 있어야 한다.

### Page Revision

- 자동 저장
- 편집 이력
- 충돌 감지

### Snapshot / Release

사용자가 명시적으로 저장하는 주요 버전.

예:

```text
v1.0
로그인 화면 완료

v1.1
모바일 대응 추가
```

---

## 5.3 복원

이전 버전을 조회하고 복원할 수 있어야 한다.

복원 시 기존 Version을 삭제하지 않는다.

```text
revision 20
↓
revision 12 복원
↓
revision 21 생성
```

---

## 5.4 향후 실시간 협업

필요할 경우 다음 단계에서 검토한다.

- Yjs
- CRDT
- Presence
- Cursor 표시
- Selection 표시

단 초기 개발에서는 필수가 아니다.

---

# 6. Editor 전체 구조

기본 Editor Layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Toolbar                                                      │
├──────────────┬──────────────────────────────┬────────────────┤
│ Palette      │                              │ Inspector      │
│              │            Canvas            │                │
│ Components   │                              │ Properties     │
│ Templates    │                              │ Responsive     │
│              │                              │ Events         │
├──────────────┴──────────────────────────────┴────────────────┤
│ Optional Bottom Panel / Status / History                     │
└──────────────────────────────────────────────────────────────┘
```

Layer Tree는 좌측 Palette와 Tab 형태 또는 별도 Panel 형태로 제공할 수 있다.

---

# 7. Component Palette

Palette는 UI 요소를 Canvas에 추가하는 영역이다.

기본 동작:

```text
Palette Item
→ Drag
→ Canvas 또는 Layer Tree
→ 새로운 Element 생성
```

Palette 내부에서 Item 순서를 Drag로 바꾸는 기능은 필수가 아니다.

---

## 7.1 Palette 카테고리

### 기본

- Text
- Heading
- Label
- Link
- Icon
- Image
- Divider
- Spacer

### 입력

- Input
- Textarea
- Password
- Number
- Search
- Select
- Multi Select
- Checkbox
- Radio
- Switch
- Slider
- Date Picker
- Time Picker
- Date Range
- File Upload
- OTP
- Color Picker

### Action

- Button
- Icon Button
- Button Group
- Dropdown Button
- Toggle Button
- Floating Action Button

### Layout

- Area / Container
- Row
- Column
- Stack
- Grid
- Section
- Card
- Scroll Area
- Split Pane
- Resizable Panel

### Navigation

- Header
- Sidebar
- Navbar
- Menu
- Context Menu
- Tabs
- Breadcrumb
- Pagination
- Stepper
- Bottom Navigation

### Data Display

- Table
- Data Grid
- List
- Tree
- Key Value
- Badge
- Chip
- Avatar
- Tooltip
- Timeline
- Accordion
- Description List

### Feedback

- Alert
- Toast
- Dialog
- Modal
- Drawer
- Popover
- Progress
- Spinner
- Skeleton
- Empty State
- Error State

### Media

- Image
- Gallery
- Carousel
- Video
- Audio
- File Preview
- Avatar Group

### Visualization

- Line Chart
- Bar Chart
- Pie Chart
- Donut Chart
- Area Chart
- Gauge
- KPI Card
- Statistic Card
- Sparkline

### Advanced

- Calendar
- Scheduler
- Kanban
- Rich Text Editor
- Code Editor
- JSON Viewer
- Diff Viewer
- Map
- Document Viewer

---

# 8. Component Registry

모든 컴포넌트는 Registry로 관리한다.

예:

```ts
registerComponent({
  type: "input",
  name: "입력창",
  category: "input",
  version: 1,
  component: InputComponent,
  propsSchema: {},
  eventSchema: {},
  slotSchema: {},
  dropRules: {},
  defaultProps: {},
  mcpDescription: ""
})
```

Registry가 담당하는 정보:

- Component Type
- Display Name
- Category
- Icon
- Default Props
- Property Schema
- Event Schema
- Slot Schema
- Child Rule
- Parent Rule
- Responsive Capability
- Storybook Mapping
- MCP Metadata

---

# 9. Custom Component

프로젝트 특화 요소를 등록할 수 있어야 한다.

예:

- 병원 예약 달력
- 상담 패널
- 광고 편집기
- 특수 통계 컴포넌트
- AI Chat Panel
- 상품 비교기

Custom Component도 Built-in Component와 동일하게:

- Palette 표시
- Inspector 표시
- Layer Tree
- Preview
- Storybook
- MCP

에서 사용할 수 있어야 한다.

---

# 10. Layer Tree

Layer Tree는 UI 구조를 Tree로 보여준다.

예:

```text
Page
 └─ Main Layout
     ├─ Header
     ├─ Sidebar
     └─ Content
         ├─ Search Area
         └─ Table
```

필수 기능:

- Drag & Drop 이동
- Parent 변경
- 순서 변경
- 다중 선택
- Rename
- Hide
- Lock
- Copy
- Duplicate
- Delete
- Expand / Collapse

---

# 11. Canvas

Canvas는 실제 화면 배치를 수행한다.

필수 기능:

- Drag & Drop
- Element 이동
- Multi Select
- Resize
- Copy / Paste
- Duplicate
- Delete
- Context Menu
- Zoom
- Pan
- Snap
- Alignment Guide
- Grid
- Selection Outline

---

## 11.1 Canvas와 Layer Tree 동기화

Canvas Selection과 Layer Selection은 항상 동기화한다.

```text
Canvas 선택
→ Layer Tree 선택

Layer Tree 선택
→ Canvas 선택
```

---

# 12. Drop Rule

잘못된 UI 구조 생성을 방지한다.

각 Component는 다음 규칙을 가질 수 있다.

```text
canHaveChildren
allowedChildren
allowedParents
slots
maxChildren
```

예:

```text
Image
→ children 불가

Tabs
→ TabItem만 허용

Table
→ Row / Column Schema 기반
```

---

# 13. Inspector / Property Panel

Inspector는 직관성을 가장 우선한다.

기본 화면에서는 일반적인 편의 옵션을 제공하고  
CSS 수준의 설정은 고급 영역으로 분리한다.

---

## 13.1 공통 속성

대부분의 요소가 공유한다.

```text
이름
표시 여부
Desktop 표시
Tablet 표시
Mobile 표시

크기
너비
높이
최소/최대 크기

배치
정렬
간격

Margin
Padding

배경
Border
Radius
Shadow

Lock
Hide

Accessibility
```

---

## 13.2 반응형 표시

요소 전체 표시:

```text
표시할 화면

☑ Desktop
☑ Tablet
☐ Mobile
```

하위 구성도 개별 설정 가능하다.

예:

```text
Input Label

☑ Desktop
☑ Tablet
☐ Mobile
```

즉 Desktop에서는 Label을 표시하고 Mobile에서는 Placeholder만 사용하는 UI가 가능해야 한다.

---

# 14. 요소별 편의 속성

## 14.1 Input

```text
☑ Label 사용
Label Text

☑ Placeholder 사용
Placeholder Text

☑ 필수값
☐ Readonly
☐ Disabled
☑ Clear Button
☐ 글자 수 표시

Input Type
- Text
- Email
- Password
- Number
- Tel

☑ Helper Text
☑ Error Area

Prefix
Suffix
Left Icon
Right Icon
```

---

## 14.2 Button

```text
Button Text

Variant
- Primary
- Secondary
- Outline
- Ghost
- Danger
- Link

Size
- Small
- Medium
- Large

☐ Left Icon
☐ Right Icon
☐ Icon Only

Width
- Content
- Full

☐ Disabled
☐ Loading
```

---

## 14.3 Select

```text
☑ Label
☑ Placeholder
☐ Multiple
☑ Searchable
☑ Clearable
☐ Allow Custom Value
☑ Required
☐ Disabled
```

---

## 14.4 Table / Data Grid

```text
☑ Header
☑ Hover
☑ Stripe
☑ Row Selection
☐ Multi Selection
☑ Sort
☑ Pagination
☑ Empty State
☐ Sticky Header

Page Size
10 / 20 / 50 / Custom

Mobile Behavior
- Card
- Horizontal Scroll
- Hide Selected Columns
```

---

## 14.5 Image

```text
Source
Alt

Fit
- Cover
- Contain
- Fill

☑ Keep Ratio
☑ Fallback Image
☐ Click Zoom
☐ Download
```

---

## 14.6 Card

```text
☑ Header
☑ Title
☑ Subtitle
☑ Media
☑ Content
☑ Footer
☑ Action

☐ Clickable
☐ Hover Effect
```

---

## 14.7 Modal

```text
☑ Title
☑ Close Button
☑ Footer
☑ Backdrop Close
☑ ESC Close

Size
- Small
- Medium
- Large
- Full
```

---

## 14.8 Tabs

```text
☑ Icon
☑ Scrollable
☐ Closable
☐ Draggable
☐ Vertical
```

---

# 15. Property Schema

각 컴포넌트 Inspector를 하드코딩하지 않는다.

Schema 기반으로 동적으로 생성한다.

예:

```json
{
  "type": "input",
  "properties": [
    {
      "key": "label.enabled",
      "label": "라벨 사용",
      "editor": "checkbox"
    },
    {
      "key": "required",
      "label": "필수값",
      "editor": "checkbox"
    },
    {
      "key": "placeholder",
      "label": "Placeholder",
      "editor": "text"
    }
  ]
}
```

이 Schema는 다음 기능에서 재사용한다.

```text
Inspector
Storybook Controls
MCP Metadata
Documentation
Validation
```

---

# 16. Responsive System

기본 Breakpoint:

```text
Mobile
Tablet
Desktop
```

프로젝트 설정에서 사용자 지정 가능하게 한다.

---

## 16.1 Responsive Override

각 Property는 기본값 + Breakpoint Override 구조를 사용할 수 있다.

예:

```text
Desktop
width: 50%
direction: row

Tablet
width: 70%

Mobile
width: 100%
direction: column
```

---

## 16.2 Preview

Toolbar에서 즉시 변경 가능해야 한다.

```text
[ Mobile ] [ Tablet ] [ Desktop ] [ Custom Width ]
```

Custom Width:

```text
375
768
1024
1440
```

직접 입력 가능.

---

# 17. Design Token / Theme

Design Token은 필수 기능이다.

프로젝트 전체 UI 일관성을 관리한다.

```text
Theme
├─ Colors
├─ Typography
├─ Spacing
├─ Radius
├─ Shadow
├─ Breakpoints
└─ Z Index
```

---

## 17.1 Color

예:

```text
primary
secondary
success
warning
error
info

background
surface
textPrimary
textSecondary
border
```

---

## 17.2 Typography

```text
fontFamily
heading1
heading2
heading3
body
caption
button
```

---

## 17.3 Spacing

예:

```text
xs = 4
sm = 8
md = 16
lg = 24
xl = 32
```

---

## 17.4 Token 사용 원칙

컴포넌트에 임의 Color 값을 직접 넣는 것보다 Token 사용을 우선한다.

```text
Button Background
→ theme.color.primary
```

Token 변경 시 프로젝트 전체가 즉시 반영되어야 한다.

---

# 18. Reusable Component / Instance

공통 UI를 여러 페이지에서 재사용할 수 있어야 한다.

예:

```text
Header Definition
    ↓
Page A → Instance
Page B → Instance
Page C → Instance
```

원본을 수정하면 Instance에 반영한다.

Instance는 필요한 속성만 Override 가능하게 한다.

예:

```text
Header
- logo
- title
- actions
```

---

# 19. Template System

Template은 단순 복사 화면이 아니라 재사용 가능한 UI Tree 조합이다.

4단계로 나눈다.

```text
Component
Pattern
Page Template
App Template
```

---

# 20. Pattern Template

화면 일부에 삽입하는 조합.

예:

- Search Filter
- Table + Pagination
- Page Header
- Breadcrumb + Title + Action
- CRUD Toolbar
- Form Section
- File Upload
- Empty State
- Error State
- Comment Section
- Statistics Cards
- Chart Section
- Tabs + Content
- Modal Form
- Confirmation Dialog

---

# 21. Page Template

완성된 한 화면.

## 인증

- Login
- Signup
- Find ID
- Find Password
- Reset Password
- Email Verification
- OTP
- Access Denied

## 사용자

- My Page
- Profile Edit
- Password Change
- Notification Settings
- Privacy Settings

## 게시판

- Board List
- Board Detail
- Board Create
- Board Edit
- FAQ
- Notice
- Comment Board

## CRUD / Admin

- CRUD List
- CRUD List + Search
- CRUD Detail
- CRUD Create
- CRUD Edit
- Master Detail
- Tree Detail
- List + Detail
- Table + Side Panel
- User Management
- Permission Management
- Code Management
- Log Viewer
- Settings

## Dashboard

- Basic Dashboard
- KPI Dashboard
- Chart Dashboard
- Monitoring Dashboard
- Realtime Dashboard

## Forms

- Basic Form
- Two Column Form
- Section Form
- Wizard Form
- Step Form
- Survey Form
- Search Form
- Modal Form
- Drawer Form

## System

- 403
- 404
- 500
- Maintenance
- Loading
- Empty
- Offline

## Landing

- Landing
- Hero + Features
- Pricing
- Contact
- FAQ
- About

## File / Content

- File Manager
- File Upload
- Gallery
- Document Viewer

## Schedule

- Calendar
- Scheduler
- Reservation
- Timeline

## Communication

- Chat
- Messenger
- Notification Center
- Inbox
- Activity Feed

---

# 22. AI Template Pack

AI UI는 기본 Template Pack으로 제공한다.

## AI Chat

```text
Conversation List
        |
        | Messages
        |
        | Input
```

Desktop:

```text
┌───────────────┬──────────────────────┐
│ Conversations │ Messages             │
│               │                      │
│               ├──────────────────────┤
│               │ Input                │
└───────────────┴──────────────────────┘
```

Mobile:

```text
Header
☰
Messages
Input
```

Conversation List는 Drawer로 표시 가능.

---

## AI Assistant

Side Panel 형태.

```text
Main App | AI Assistant
```

---

## AI Search

```text
Question Input
↓
AI Answer
↓
Sources
↓
Related Questions
```

---

## AI Generate

```text
Prompt
↓
Generating
↓
Preview
↓
Accept / Retry / Edit
```

---

# 23. Layout Template

대표적인 Layout Template:

```text
Header + Main
Header + Sidebar + Main
Header + Main + Right Sidebar
Sidebar + Main
Two Column
Three Column
Centered Content
Full Screen
```

---

## 23.1 Admin Layout

옵션:

```text
Sidebar Position
- Left
- Right

Header
- Enabled
- Sticky

Sidebar
- Enabled
- Collapsible
- Icon Only

Mobile
- Hide Sidebar
- Drawer
- Bottom Navigation

Footer
- Enabled
```

모바일에서는 Sidebar를 자동으로 숨기고 Drawer 버튼을 제공할 수 있어야 한다.

---

# 24. Template Variant

동일한 템플릿을 여러 개 복제하지 않는다.

예:

```text
Admin Layout
+
sidebarPosition
+
mobileNavigation
+
collapsible
```

Variant로 관리한다.

---

# 25. 사용자 Template

사용자가 현재 UI 일부를 Template으로 저장할 수 있어야 한다.

```text
선택
→ Template으로 저장
```

범위:

```text
Personal
Project
Organization (향후)
```

---

# 26. Template Registry

Template도 Registry로 관리한다.

```json
{
  "id": "admin-layout",
  "name": "관리자 기본 레이아웃",
  "category": "layout",
  "type": "page-template",
  "variants": {
    "sidebarPosition": "left",
    "mobileNavigation": "drawer"
  },
  "tree": {}
}
```

Template 내부 구조도 동일한 UI Tree를 사용한다.

---

# 27. Template UX

Palette는 최소 다음 Tab을 제공한다.

```text
[ 요소 ] [ 템플릿 ]
```

Template Panel:

```text
검색

자주 사용
레이아웃
인증
관리자
게시판
폼
대시보드
AI
시스템
```

각 Template은 Thumbnail Preview를 제공한다.

---

# 28. Data Binding

UI 설계는 단순 그림으로 끝나지 않는다.

요소와 데이터 관계를 정의할 수 있어야 한다.

예:

```text
Input
binding → form.email

Table
dataSource → users

Text
binding → user.name
```

실제 API 구현 여부와 무관하게 Binding Metadata는 저장한다.

---

# 29. Action / Event

요소가 어떤 행동을 하는지 정의한다.

예:

```text
Button
onClick → LOGIN

Button
onClick → OPEN_MODAL

Table Row
onClick → OPEN_DETAIL
```

Action 종류:

- Navigate
- Open Modal
- Open Drawer
- Submit
- Reset
- Custom Action
- API Action Metadata
- MCP Action Metadata

---

# 30. Asset Manager

프로젝트 Asset 관리 기능을 제공한다.

- Image
- Icon
- SVG
- File
- Logo
- Illustration

기능:

- Upload
- Search
- Tag
- Folder
- Replace
- Usage 조회
- Delete Validation

---

# 31. Icon System

공통 Icon Library를 제공한다.

예:

- Material Icons
- Lucide
- Custom Project Icon

사용자는 이름 검색으로 쉽게 선택할 수 있어야 한다.

---

# 32. Undo / Redo

필수 기능.

```text
Ctrl + Z
Ctrl + Y
```

지원:

- Add
- Delete
- Move
- Resize
- Property Change
- Reorder
- Template Insert

History Depth는 충분히 크게 제공한다.

---

# 33. Keyboard Shortcut

예:

```text
Ctrl+C Copy
Ctrl+V Paste
Ctrl+D Duplicate
Delete Delete
Ctrl+Z Undo
Ctrl+Y Redo
Ctrl+S Save
Arrow Move
Shift+Arrow Fast Move
```

---

# 34. Context Menu

Canvas / Layer 공통 제공.

- Copy
- Paste
- Duplicate
- Rename
- Move Front
- Move Back
- Group
- Ungroup
- Lock
- Hide
- Save as Template
- Delete

---

# 35. Storybook Export

Storyboard가 아니라 **Storybook Export**를 제공한다.

목적:

- UI Component 문서화
- Component Preview
- Variant Preview
- Props 확인
- 개발 프로젝트에 재사용

Export 대상:

```text
Component Definition
Props Schema
Variants
Default Props
Examples
Theme Tokens
Responsive Example
```

---

## 35.1 Story 생성

가능하면 다음 형태로 생성한다.

```text
Button.stories.tsx
Input.stories.tsx
Table.stories.tsx
```

Property Schema는 Storybook Controls 생성에 활용한다.

---

# 36. MCP Server

MCP는 AI Agent와 Builder 내장 AI가 UI 설계를 읽고, 권한이 허용된 경우 구조화된 방식으로 수정하기 위한 공식 인터페이스다.

AI가 Canvas Screenshot을 보고 화면 구조를 추측하지 않는다.

MCP는 반드시 다음 원칙을 따른다.

```text
사람이 보는 화면
Canvas / Inspector / Layer Tree

AI가 읽는 화면
UI Tree / JSON Spec / Registry / Theme / Template

둘은 같은 원본 데이터를 사용한다.
```

---

## 36.1 MCP Read Resource / Tool

조회 기능 예:

```text
get_projects
get_project

get_pages
get_page
get_page_spec

get_current_selection

get_component_registry
search_components
get_component
get_component_schema
get_component_props

get_templates
search_templates
get_template

get_theme
get_design_tokens

get_assets
get_actions
get_bindings

get_versions
get_revision
```

---

## 36.2 MCP Write Tool

AI가 Builder 안에서 실제 UI를 생성·수정할 수 있도록 Write Tool을 제공할 수 있다.

예:

```text
create_page
rename_page
duplicate_page

add_component
update_component
move_component
remove_component

apply_template

create_group
ungroup

update_responsive
update_binding
update_action

update_theme
```

Write Tool은 반드시 Project Permission과 사용자 권한을 확인한다.

VIEWER에게는 Write Tool을 허용하지 않는다.

---

## 36.3 Batch UI Patch

AI가 화면을 만들 때 작은 Tool을 수십 번 순차 호출하다 중간에 실패하면 화면이 불완전한 상태로 남을 수 있다.

따라서 여러 UI 변경을 하나의 논리 작업으로 적용하는 `apply_ui_patch` 계열 기능을 제공하는 것을 권장한다.

예:

```json
{
  "pageId": "page-users",
  "baseRevision": 25,
  "operations": [
    {
      "op": "add",
      "parentId": "content",
      "component": "search-filter"
    },
    {
      "op": "add",
      "parentId": "content",
      "component": "data-grid"
    },
    {
      "op": "update",
      "nodeId": "data-grid-1",
      "props": {
        "responsive.mobile.displayMode": "card"
      }
    }
  ]
}
```

핵심 규칙:

- `baseRevision`을 확인한다.
- 중간 실패 시 전체 적용을 취소할 수 있어야 한다.
- 성공 시 하나의 Revision으로 기록한다.
- 적용 전 Schema / Drop Rule / Permission / Binding을 검증한다.
- 부분 성공 상태를 기본 동작으로 만들지 않는다.

---

## 36.4 MCP 목적

AI Agent가 다음을 정확히 알 수 있어야 한다.

- 어떤 프로젝트와 화면이 존재하는가
- 현재 어떤 Page와 Node가 선택되어 있는가
- 어떤 Component를 사용할 수 있는가
- Component Props와 편의 속성은 무엇인가
- Responsive 규칙은 무엇인가
- Theme / Design Token은 무엇인가
- Layout 구조는 무엇인가
- Action은 무엇인가
- Data Binding은 무엇인가
- 어떤 Template / Pattern을 사용할 수 있는가
- 현재 Revision은 무엇인가
- 어떤 변경을 수행할 권한이 있는가

---

## 36.5 MCP 보안

MCP는 내부 구현 우회 통로가 되어서는 안 된다.

필수 원칙:

- OIDC 사용자 또는 명시된 Service Identity와 연결
- Project ACL 적용
- Read / Write 권한 분리
- Project Scope 제한
- Write Tool에 Schema Validation 적용
- Write Tool에 Revision 충돌 검사 적용
- Audit Log 기록
- 위험한 Project / Member / Security 변경은 일반 UI Tool과 분리
- AI에게 DB 직접 접근 권한을 주지 않음

---

# 37. AI Design Assistant / AI UI Orchestrator

Builder 내부에 자연어로 화면을 생성하고 수정할 수 있는 AI Assistant를 제공한다.

이 기능은 단순 채팅창이 아니라 **UI Tree를 이해하고 Component / Template / Theme 규칙에 따라 실제 Canvas를 조작하는 자연어 UI Editor**다.

대표 사용 예:

```text
"로그인 화면 만들어줘"

"회원 관리 화면 만들어줘.
위에는 검색 조건, 아래에는 테이블과 페이징을 넣어줘."

"이 버튼을 위험 버튼으로 바꿔줘."

"모바일에서는 이 라벨 숨겨줘."

"이 영역을 2열로 바꿔줘."

"모바일에서는 사이드바 대신 Drawer를 사용해줘."

"방금 AI가 수정한 것 되돌려줘."
```

---

## 37.1 Builder AI UI

Editor 안에 AI Assistant Panel을 제공한다.

예:

```text
Palette | Canvas | Inspector
                     ├─ 속성
                     └─ AI
```

또는 독립 Side Panel로 제공할 수 있다.

AI Panel은 최소 다음 Context를 알고 있어야 한다.

```text
projectId
pageId
selectedNodeIds
currentRevision
currentBreakpoint
```

사용자가 Canvas에서 특정 Button을 선택한 상태에서:

```text
"이거 빨간색 위험 버튼으로 바꿔줘."
```

라고 요청하면 AI는 현재 Selection을 기준으로 수정할 수 있어야 한다.

---

## 37.2 AI 처리 구조

권장 구조:

```text
UI Builder
   ↓
AI Assistant Panel
   ↓
AI Gateway / Orchestrator
   ↓
LLM
   ↓
MCP Client
   ↓
UI Builder MCP Server
   ↓
UI Tree / Registry / Template / Theme
   ↓
Canvas 반영
```

현재 사용 중인 n8n을 AI Gateway / Orchestrator로 활용할 수 있다.

다만 기존 Chatpping 쇼핑용 AI Endpoint와 Builder AI를 혼용하지 않는다.

예상 별도 Endpoint:

```text
POST https://n8n.shnea.kr/webhook/ui-builder
```

주의:

```text
위 Endpoint는 설계 목표이며 현재 구현 완료 상태를 의미하지 않는다.
```

Builder AI 전용 System Prompt와 Tool Policy를 사용한다.

---

## 37.3 Template First 생성 정책

AI는 화면 생성 시 임의 HTML / CSS 생성을 우선하지 않는다.

우선순위:

```text
1. 기존 Page / App Template으로 해결 가능한가?
   ↓

2. 기존 Pattern 조합으로 해결 가능한가?
   ↓

3. Component Registry 조합으로 해결 가능한가?
   ↓

4. 필요한 Component가 Registry에 없는가?
   ↓
   사용자에게 알림 또는 Custom Component 생성 절차로 전환
```

즉:

```text
"회원 관리 화면 만들어줘"
```

요청은 가능하면:

```text
Admin Layout Template
+
Page Header Pattern
+
Search Filter Pattern
+
Data Grid
+
Pagination
```

조합으로 생성한다.

AI가 Registry에 없는 UI를 임의의 HTML로 삽입해 일관성을 깨뜨리는 것을 기본적으로 금지한다.

---

## 37.4 AI의 Design System 준수

AI가 생성하는 UI도 사람이 생성하는 UI와 동일하게 다음을 사용한다.

- Component Registry
- Property Schema
- Template Registry
- Theme
- Design Token
- Responsive Rules
- Drop Rules
- Action Schema
- Binding Schema

AI 전용 예외 UI 구조를 만들지 않는다.

---

## 37.5 자연어 Responsive 편집

AI는 Responsive Property를 자연어로 수정할 수 있어야 한다.

예:

```text
"모바일에서는 라벨 숨겨줘."

Desktop
label.visible = true

Tablet
label.visible = true

Mobile
label.visible = false
```

또는:

```text
"PC에서는 2열인데 모바일에서는 세로로 보여줘."

Desktop
direction = row
columns = 2

Mobile
direction = column
columns = 1
```

---

## 37.6 AI 변경 Preview

큰 변경은 바로 확정하지 않고 Preview / Apply 흐름을 지원하는 것을 권장한다.

예:

```text
AI가 다음 변경을 제안합니다.

+ Header
+ Sidebar
+ Search Filter
+ Data Grid
+ Pagination
+ Mobile Sidebar → Drawer

[미리보기] [적용] [취소]
```

작은 Property 변경은 사용자 설정에 따라 즉시 적용할 수 있다.

예:

```text
"버튼 글자를 저장으로 바꿔줘."
```

---

## 37.7 AI Revision

AI가 적용한 변경은 일반 사용자 변경과 동일하게 Version / Revision에 기록한다.

예:

```text
revision: 26
authorType: AI
authorUserId: user-123
prompt: "회원 관리 화면 만들어줘"

changes:
- Admin Layout 추가
- Search Filter 추가
- Data Grid 추가
- Pagination 추가
```

사용자가:

```text
"방금 AI 수정 되돌려줘."
```

라고 요청하면 해당 Revision 이전으로 안전하게 되돌릴 수 있어야 한다.

---

## 37.8 AI 작업 권한

AI는 사용자의 권한을 상속한다.

```text
OWNER
→ 허용된 모든 Builder AI 편집

EDITOR
→ Page / Component / Template 편집

VIEWER
→ 조회 / 설명만 가능
```

AI라고 해서 사용자가 할 수 없는 작업을 수행할 수 없다.

---

## 37.9 AI Tool Policy

AI가 사용할 수 있는 Tool을 Allowlist로 관리한다.

예:

```text
허용
- get_page_spec
- search_components
- search_templates
- add_component
- update_component
- move_component
- apply_template
- update_responsive
- apply_ui_patch

별도 확인 또는 제한
- delete_page
- replace_entire_page
- update_project_theme
- publish_template
- restore_version

일반 AI Tool에서 금지
- 프로젝트 소유권 변경
- Member 권한 상승
- OIDC 설정 변경
- 보안 설정 변경
- Audit 삭제
```

---

## 37.10 AI 실패 처리

AI 처리 도중 실패해도 Page가 깨진 상태로 저장되지 않아야 한다.

- Batch Patch Transaction
- Schema Validation
- Revision Conflict Detection
- Rollback
- Retry Budget
- Timeout
- Error Result

AI 응답 텍스트와 실제 적용 성공 여부를 분리한다.

AI가 "완료했습니다"라고 답했다고 해서 실제 UI 변경 성공으로 간주하지 않는다.

적용 결과는 Builder API / MCP 실행 결과가 Source of Truth다.

---

## 37.11 AI 질문 / 요구사항 보완

사용자 요구가 모호하면 바로 화면을 임의 생성하지 않고 필요한 내용을 질문할 수 있다.

예:

```text
사용자:
"CRM 화면 만들어줘."

AI:
"기본 화면은 고객 목록 중심으로 만들까요,
대시보드 중심으로 만들까요?"
```

단 사소한 옵션까지 과도하게 질문하지 않고 Template 기본값과 좋은 기본값을 활용한다.

---

## 37.12 외부 AI Agent 개발 흐름

외부 Coding Agent도 MCP를 통해 동일한 UI 정의를 사용할 수 있다.

```text
사용자:
"로그인 화면 실제 React 코드로 구현해줘."

AI Coding Agent
↓
MCP get_page_spec
↓
MCP get_component_registry
↓
MCP get_theme
↓
MCP get_actions / get_bindings
↓
프로젝트 코드 생성
```

즉 Builder 내부 AI와 외부 개발 AI는 **동일한 Spec을 사용한다.**

---

## 37.13 최종 AI 목표

```text
사람
→ Drag & Drop으로 설계 가능

사람
→ 자연어로 AI에게 설계 요청 가능

AI
→ MCP로 공식 Component / Template / Theme 조회

AI
→ 구조화된 UI Patch 생성

Builder
→ 검증 후 Canvas에 적용

외부 개발 AI
→ 동일 MCP를 읽어 실제 코드 구현
```

이를 통해 사람과 AI가 서로 다른 UI를 만드는 문제를 최소화한다.

---

# 38. UI Tree / JSON Spec

UI Tree는 플랫폼의 핵심 자산이다.

예:

```json
{
  "id": "page-login",
  "type": "page",
  "name": "로그인",
  "children": [
    {
      "id": "node-1",
      "type": "container",
      "props": {},
      "responsive": {},
      "children": [
        {
          "id": "node-2",
          "type": "input",
          "props": {
            "label": {
              "enabled": true,
              "text": "이메일"
            },
            "required": true
          }
        }
      ]
    }
  ]
}
```

---

# 39. Node 공통 구조

```text
id
type
name
props
style
responsive
events
bindings
children
metadata
version
```

---

# 40. Accessibility

기본 Inspector에서 접근성 옵션을 제공한다.

예:

```text
aria-label
alt
role
tabIndex
required
disabled
```

가능한 경우 자동으로 기본값을 생성한다.

Accessibility 오류 검사도 향후 제공할 수 있다.

---

# 41. Validation

저장 전에 최소 검증을 수행한다.

예:

- Required Property 누락
- 잘못된 Parent
- 잘못된 Child
- Duplicate ID
- Invalid Binding
- Invalid Action
- Broken Asset
- Invalid Responsive Value

---

# 42. Preview

Preview Mode에서는 Editor UI를 제거하고 실제 화면처럼 보여준다.

지원:

- Desktop
- Tablet
- Mobile
- Fullscreen
- Custom Width

---

# 43. 화면 관리

프로젝트별 Page 관리:

- Create
- Duplicate
- Rename
- Move
- Folder
- Delete
- Restore
- Search
- Favorite

Page Thumbnail 자동 생성 가능.

---

# 44. 페이지 구조

예:

```text
Project
├─ Auth
│  ├─ Login
│  └─ Signup
├─ Admin
│  ├─ Dashboard
│  ├─ Users
│  └─ Settings
└─ Public
   └─ Landing
```

---

# 45. Search

전체 프로젝트 검색을 지원한다.

대상:

- Page
- Component
- Template
- Asset
- Layer
- Action

---

# 46. 프로젝트 Import / Export

프로젝트 전체 Spec을 JSON으로 Import / Export 가능하게 한다.

사용 목적:

- Backup
- Migration
- Debugging
- Version Control
- External Tool 연동

---

# 47. 저장 정책

자동 저장과 명시 저장을 분리할 수 있다.

예:

```text
Auto Save
→ Draft Revision

Save Version
→ Named Snapshot
```

---

# 48. 성능

큰 화면에서도 Editor가 느려지지 않아야 한다.

고려사항:

- Virtualized Layer Tree
- Lazy Render
- Memoization
- Incremental State Update
- Large Page 분리
- History Snapshot 최적화

---

# 49. 보안

- OIDC 기반 인증
- Project ACL
- Server-side Authorization
- Client 권한만 신뢰하지 않음
- MCP 권한 검사
- Asset 접근 제어
- Audit Log
- DEV_AUTH_BYPASS 운영 비활성

---

# 50. Audit

주요 작업은 Audit Log를 남길 수 있다.

예:

```text
Project Create
Member Add
Role Change
Page Delete
Version Restore
Template Publish
MCP Access
```

---

# 51. 권장 기술 방향 및 배포 구조

이 프로젝트는 초기부터 MSA로 쪼개기보다 **NestJS Modular Monolith**를 기본 구조로 권장한다.

이유:

- Project / Page / Component / Template / Version은 서로 강하게 연결되어 있다.
- 분산 트랜잭션이 필요한 구조를 초기에 만들 필요가 없다.
- 배포 단위가 적어 운영과 장애 대응이 쉽다.
- 공통 Schema와 UI Spec을 한 코드베이스에서 유지하기 쉽다.
- 기능 경계는 Nest Module로 충분히 분리할 수 있다.
- 향후 특정 기능만 필요할 때 독립 서비스로 분리할 수 있다.

권장 초기 구조:

```text
React / Vite Web
        ↓
NestJS API - Modular Monolith
        ├─ AuthModule
        ├─ ProjectModule
        ├─ MemberModule
        ├─ PageModule
        ├─ UiSpecModule
        ├─ ComponentRegistryModule
        ├─ TemplateRegistryModule
        ├─ ThemeModule
        ├─ AssetModule
        ├─ VersionModule
        ├─ StorybookExportModule
        ├─ McpModule
        ├─ AiIntegrationModule
        └─ AuditModule
        ↓
PostgreSQL

외부 AI Orchestration
n8n
  ↓
OpenRouter / 기타 LLM
  ↓
MCP
  ↓
NestJS
```

---

## 51.1 Frontend

```text
React
Vite
TypeScript
```

UI 구현은 다음 중 프로젝트 방향에 맞춰 선택한다.

```text
MUI
Tailwind
자체 Design System
```

Builder의 Component Definition과 실제 Rendering Component의 계약을 분리하여 UI Framework 교체 가능성을 확보한다.

Drag & Drop은 `dnd-kit` 계열을 우선 검토한다.

---

## 51.2 Backend

```text
NestJS Modular Monolith
```

하나의 NestJS App 안에서 Domain Module을 명확하게 분리한다.

금지에 가까운 안티패턴:

```text
모든 기능을 하나의 거대한 Service에 작성
Controller에서 직접 DB 처리
Module 간 Repository 무분별 공유
UI Spec Schema 중복 정의
```

권장:

```text
Module 경계
Application Service
Domain Service
Repository
DTO / Schema
Event
```

을 명확하게 나눈다.

---

## 51.3 Database

기본:

```text
PostgreSQL
```

주요 데이터:

- User Reference
- Project
- Member
- Page
- UI Spec
- Component Metadata
- Template
- Theme
- Version
- Audit

UI Tree 전체 JSON을 무조건 한 컬럼에만 넣는 구조보다 검색과 버전 관리 요구를 고려하여 JSONB + 관계형 Metadata 조합을 검토한다.

---

## 51.4 Redis

초기 필수는 아니다.

다음 기능이 실제로 필요해질 때 추가한다.

- Cache
- Job Queue
- Export Worker
- Presence
- Rate Limit
- Distributed Lock
- Real-time Collaboration

---

## 51.5 MCP

초기에는 별도 MSA 서비스로 분리하지 않고 NestJS의 `McpModule`로 제공하는 것을 우선한다.

```text
NestJS
├─ 일반 REST API
└─ MCP Endpoint
```

장점:

- 동일 Project ACL 재사용
- 동일 Component Registry 사용
- 동일 UI Spec Service 사용
- 인증 / Audit 중복 구현 감소
- 배포 단순화

향후 MCP 사용량이나 보안 경계가 크게 달라질 경우 독립 서비스로 분리한다.

---

## 51.6 AI Orchestration

AI Provider 연동과 Prompt / Tool 흐름은 기존 n8n을 별도 서비스로 유지할 수 있다.

```text
Builder
↓
n8n AI Workflow
↓
LLM
↓
Builder MCP
```

n8n은 이미 독립된 실행 환경이므로 NestJS 안으로 억지로 합치지 않는다.

Builder 전용 AI Workflow는 Chatpping 쇼핑 AI Workflow와 분리한다.

---

## 51.7 Storybook Export / Heavy Job

처음에는 NestJS Module로 구현한다.

Export 시간이 길어지면:

```text
NestJS API
↓
Queue
↓
Export Worker
```

구조로 분리한다.

Worker는 동일 Repository / Package를 공유할 수 있는 Monorepo 구조를 권장한다.

---

## 51.8 Monorepo 권장 구조

예:

```text
apps/
├─ web
└─ api

packages/
├─ ui-spec
├─ component-schema
├─ design-tokens
├─ shared-types
└─ mcp-contract
```

향후 Worker가 필요하면:

```text
apps/
├─ web
├─ api
└─ export-worker
```

처럼 추가한다.

---

## 51.9 MSA로 분리하는 시점

다음과 같은 실제 이유가 생겼을 때만 서비스 분리를 검토한다.

```text
실시간 협업 트래픽이 API와 독립적으로 커짐
Export / Render 작업이 CPU를 과도하게 사용
MCP가 외부 공개 서비스로 독립 보안 경계를 요구
Asset 처리량이 매우 커짐
특정 모듈만 별도 Scale-out 필요
서로 다른 배포 주기가 실제로 필요
```

"나중에 커질 것 같아서"만으로 MSA를 선택하지 않는다.

---

## 51.10 초기 권장 배포 단위

```text
1. Web
   React / Vite

2. API
   NestJS Modular Monolith
   + REST
   + MCP

3. PostgreSQL

4. n8n
   AI Orchestration

5. Redis
   필요 시 추가
```

이 구성이 초기 개발 속도, 유지보수, 장애 파악, 배포 편의성의 균형이 가장 좋다.

---

# 52. 개발 우선순위

## Phase 1 - Foundation

- OIDC
- Project
- Page
- Component Registry
- Basic Palette
- Canvas
- Layer Tree
- Inspector
- Responsive
- Save / Load
- Undo / Redo

---

## Phase 2 - Production Builder

- Full Component Set
- Property Schema
- Theme
- Design Token
- Templates
- Reusable Component
- Asset Manager
- Version
- Sharing
- Conflict Handling

---

## Phase 3 - Development Integration

- Storybook Export
- MCP Server Read
- MCP Server Write
- AI Design Assistant
- n8n Builder AI Workflow
- Batch UI Patch
- AI Change Preview
- AI Revision / Undo
- Action
- Data Binding
- Custom Component Registry
- Project Export

---

## Phase 4 - Advanced Collaboration

- Real-time Presence
- CRDT / Yjs
- Multi-user Cursor
- Live Collaboration

---

# 53. 초기 비목표

첫 버전에서 반드시 구현할 필요 없는 기능:

```text
Pen Tool
자유 Vector Editing
Boolean Vector Operation
Photoshop 수준 이미지 편집
Figma 파일 완전 호환
자체 Font Rendering Engine
복잡한 Prototype Animation
Plugin Marketplace
실시간 CRDT 동시편집
```

이 제품의 목적은 그래픽 디자인 툴이 아니라 **웹 UI 설계 및 개발 기준 플랫폼**이다.

---

# 54. 품질 기준

이 Builder는 다음 질문에 모두 YES가 되어야 한다.

### UI 설계

- 일반 웹 화면을 Builder만으로 설계할 수 있는가?
- Mobile / Tablet / Desktop을 모두 정의할 수 있는가?
- 복잡한 CSS를 몰라도 일반적인 화면을 만들 수 있는가?
- 필요한 경우 고급 사용자는 세부 설정을 할 수 있는가?

### 재사용

- Component를 재사용할 수 있는가?
- Template을 재사용할 수 있는가?
- 프로젝트 공통 UI를 Instance로 재사용할 수 있는가?
- Theme 변경이 전체 UI에 반영되는가?

### 개발 연동

- Storybook으로 Component 정의를 내보낼 수 있는가?
- MCP로 AI가 UI Spec을 정확히 읽을 수 있는가?
- AI가 임의로 UI를 추측하지 않아도 되는가?
- 사람이 만든 화면과 AI가 구현한 화면의 구조가 일관되는가?

### 운영

- Project 공유가 가능한가?
- 버전 복원이 가능한가?
- 동시 수정 충돌을 감지하는가?
- 이전 상태로 돌아갈 수 있는가?

---

# 55. 핵심 데이터 관계

```text
User
 ↓
Project
 ├─ Member
 ├─ Theme
 ├─ Asset
 ├─ Component Registry
 ├─ Template Registry
 ├─ Page
 │   └─ UI Tree
 │       └─ Node
 ├─ Version
 └─ Audit
```

---

# 56. 제품의 최종 목표

최종적으로 이 플랫폼은 다음 흐름을 제공해야 한다.

```text
프로젝트 생성
↓
Theme 선택
↓
Layout Template 선택
↓
Component / Template 배치
↓
Inspector에서 속성 조정
↓
Mobile / Tablet / Desktop 확인
↓
화면 저장
↓
Version 생성
↓
Storybook Export
↓
MCP 제공
↓
AI 또는 개발자가 동일 Spec으로 구현
```

---

# 57. 최종 구현 원칙

1. Canvas와 MCP는 동일한 UI Spec을 사용한다.
2. 모든 Component는 Registry 기반으로 관리한다.
3. Inspector는 Schema 기반으로 생성한다.
4. Responsive는 옵션이 아니라 기본 기능이다.
5. Theme / Design Token을 모든 프로젝트의 기본으로 사용한다.
6. Palette는 직관적인 이름을 사용한다.
7. 고급 CSS 설정은 기본 UI에서 숨긴다.
8. Template은 UI Tree의 재사용 단위다.
9. Storybook과 MCP는 별도 수작업 데이터가 아니라 Registry / Spec에서 생성한다.
10. 프로젝트는 Version과 충돌 감지 기능을 기본 제공한다.
11. 초기 협업은 안정적인 Version 기반으로 시작하고 실시간 CRDT는 후순위로 둔다.
12. 향후 모든 프로젝트가 이 플랫폼을 사용할 수 있도록 특정 도메인에 종속되지 않는다.
13. 특수 UI는 Custom Component로 확장한다.
14. AI가 설계를 추측하지 않고 MCP를 통해 구조화된 설계를 읽게 한다.
15. Builder 내장 AI도 사람과 동일한 Component / Template / Theme 규칙만 사용한다.
16. AI의 UI 변경은 Schema 검증, 권한 검사, Revision 충돌 검사를 통과해야 한다.
17. 큰 AI 변경은 Preview / Apply 흐름과 Batch Patch를 우선한다.
18. 사람에게는 쉬워야 하고, 내부 구조는 개발자와 AI가 해석하기 충분히 엄격해야 한다.

---

# 58. 한 줄 정의

> **이 플랫폼은 모든 프로젝트의 UI를 사람이 직접 설계하거나 AI와 대화해 생성·수정하고, 이를 하나의 구조화된 UI Spec으로 저장하며, Storybook과 MCP를 통해 사람과 AI가 동일한 디자인 시스템으로 개발하게 하는 공통 UI 개발 플랫폼이다.**
