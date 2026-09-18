# 실제 서비스에 서식 편집기 연결하기

짭그마에서 컴포넌트·템플릿 본문을 작성할 때는 `tmp`를 사용합니다. 가져간 화면을 실제 서비스에 연결하면 새 파일 업로드는 **default 보존 정책**을 사용합니다. 파일 서비스 요청에서 `category`를 생략하는 방식이며, 문자열 `default`를 보내는 방식이 아닙니다. 기본 정책의 보존 기간은 파일 서비스 설정에 따릅니다.

## 연결 계약

React 내보내기의 `Screen`에 `richText`를 전달합니다. HTML 내보내기는 `runtime.js` 실행 전에 같은 객체를 `window.jjapgmaRichText`에 지정합니다. 연결하지 않은 화면은 입력 체험만 가능하고 업로드·업무 저장을 수행하지 않습니다. 읽기 전용 모드와 비활성 상태도 그대로 유지합니다.

```jsx
const richText = {
  onChange(nodeId, documentJson) {
    // 폼 상태에 보관하고, 서비스의 저장 버튼에서 업무 API로 저장합니다.
    setDocuments(previous => ({ ...previous, [nodeId]: documentJson }));
  },
  async uploadFile(nodeId, body) {
    // body는 file만 포함하는 FormData입니다. category를 추가하지 않습니다.
    // URL, CSRF 헤더 이름과 응답 형식은 소비 서비스가 구현할 예시 계약입니다.
    const response = await fetch('/api/editor-files', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'X-CSRF-Token': csrfToken },
      body,
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error('파일 업로드 실패');
    const file = await response.json();
    // 서버가 fileId와 업무 객체의 권한 연결을 저장합니다.
    // preview 202는 준비될 때까지 제한적으로 재확인한 뒤 완료합니다.
    return file.previewUrl; // 표시 가능한 절대 HTTP(S) URL
  },
};

// Storybook/React ZIP: renderer/renderer.js에서 Screen을 import합니다.
<Screen spec={spec} assets={assets} richText={richText} />;

// HTML ZIP: 위 객체를 앱의 JS 파일에서 runtime.js보다 먼저 설정합니다.
window.jjapgmaRichText = richText;
```

`setDocuments`, `csrfToken`, `/api/editor-files`는 연결 예시이며 ZIP에 업무 서버가 포함된다는 뜻이 아닙니다. `onChange`는 입력 변경 알림입니다. 저장 성공으로 간주하지 말고 서버 저장 결과·오류를 앱에서 처리합니다. 컴포넌트 ID별로 문서를 관리하고, 저장된 문서는 다음 조회 시 해당 노드의 `props.documentJson`으로 전달합니다.

소비 서비스 백엔드는 세션·업무 객체 권한·CSRF·파일 형식과 크기를 검사한 뒤 외부 `POST /files/upload`에 서버 전용 Bearer와 `file`을 전송합니다. **업스트림에도 category를 넣지 않습니다.** 브라우저에 Bearer를 전달하거나 Base64·로컬 영속 저장으로 우회하지 않습니다. 반환된 `fileId`와 파일명·MIME 및 업무 객체 연결은 서버가 보관하며, 본문 저장 때 구조·UTF-8 크기·URL·첨부 소유권을 검증합니다. 프런트의 콜백만으로 이 책임이 자동 구현되지는 않습니다.

## 기존 첨부파일

이미 업로드한 `tmp` 파일은 컴포넌트·템플릿 재사용만으로 default로 승격되지 않습니다. HTML·Storybook ZIP의 `assets`에 복사된 첨부는 화면과 함께 배포하고, 상대 경로가 가리키는 자산도 유지해야 합니다. 본문을 다른 경로에서 다시 사용하는 서비스는 자산 URL을 해당 서비스의 배포 경로로 정규화해야 합니다. JSON 명세만 사용한다면 참조 파일을 별도로 가져와야 합니다.

기존 파일도 외부 파일 서비스에서 기본 정책으로 새로 보관해야 한다면 소비 서비스의 권한 있는 업로드 흐름으로 다시 올리고 새 파일 ID·URL로 연결합니다. 만료된 파일은 재다운로드할 수 없습니다. 이 연결 설정은 기존 파일을 자동 재업로드하거나 기존 보존 정책을 변경하지 않습니다.
