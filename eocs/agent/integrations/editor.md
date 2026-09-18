# @shnea/blocknote Integration

`@shnea/blocknote` is the approved reusable rich text editor package for mudeora authoring.

## Package Surface

Approved imports:

```tsx
import { BlockNoteEditor, BlockNoteViewer } from '@shnea/blocknote';
import '@shnea/blocknote/style.css';
```

Important props:
- `value`: BlockNote document JSON string.
- `onChange`: receives the next BlockNote document JSON string.
- `editable`: disables editing when `false`.
- `uploadFile`: app-owned async upload function. It receives a `File` and returns the URL inserted into the document.
- `fontFamilies` / `fontSizes`: optional toolbar font configuration.
- `enableImageModal`: viewer option for image preview behavior.

## Storage Contract

Canonical rich text storage is BlockNote document JSON string.

Use rich text fields only when a feature needs formatted content. Initial candidate API fields:
- `terms[].descriptionJson`
- `namingEntries[].descriptionJson`
- `workspaceNotice.contentJson`

Initial candidate database columns:
- `terms.description_json`
- `naming_entries.description_json`
- `workspace_notices.content_json`

Legacy `*_html` columns may remain during transition, but new writes must use `*_json`.

## Editor Usage

```tsx
<BlockNoteEditor
  value={descriptionJson}
  onChange={setDescriptionJson}
  uploadFile={uploadFile}
/>
```

Empty rich text should be stored as an empty string. The package treats an empty value as an empty BlockNote document.

## Viewer Usage

```tsx
<BlockNoteViewer value={descriptionJson} />
```

Public pages should render stored JSON through `BlockNoteViewer`. Do not inject BlockNote JSON into the DOM as HTML.

## Upload Integration

The editor package does not own upload tokens and does not call file-service directly.

Mudeora uses the backend proxy:
- browser sends `POST /api/files/upload`
- backend validates session and policy
- backend forwards to Shnea file-service
- backend returns file metadata
- `uploadFile` returns the inserted URL, usually `previewUrl`

Example:

```tsx
async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const data = await response.json();
  const uploaded = data.file || data.files?.[0] || data;
  return uploaded.previewUrl || uploaded.downloadUrl;
}
```

## Rich Text Limits

Initial conservative JSON string limits:
- term description: 64 KB
- naming entry description: 64 KB
- workspace notice content: 128 KB

Enforce limits by UTF-8 byte length.

## RAG / Search

Search indexing must derive plain text from BlockNote JSON by parsing blocks and extracting text content. Legacy HTML stripping is not valid for new rich text fields.

## Maintenance Rule

If implementation changes any of these, update this document in the same task:
- package imports
- `BlockNoteEditor` / `BlockNoteViewer` prop usage
- JSON field names
- database column names
- upload behavior
- rich text limits

## jjapgma mapping (2026-09-18)

This project uses @shnea/blocknote 0.1.5 for the richText UI Spec component. The mudeora fields above are examples for another consumer.

- Storage: node.props.documentJson in existing page/revision/template JSON, empty string for empty content, maximum 128 KiB UTF-8 per component. No new DB columns.
- Props: richTextMode (editor/viewer), richTextFont (sans/serif/mono), richTextImageModal, richTextFiles ({fileId,name,mimeType}[]).
- Both components receive theme and fontFamilies; editor also uses fontSizes, editable, onChange, uploadFile, and its ref for the app attachment button. Viewer uses enableImageModal.
- Design-panel document edits join existing page save/undo when applied. Preview edits are transient.
- Upload: POST /api/files/upload?projectId=<uuid>, multipart file and category=tmp, per explicit user request. This overrides the other consumer's editor retention default. AI uploads retain month; ordinary attachments retain their default.
- Upload returns metadata; the app resolves the authorized preview endpoint, including 202 retries. Stored uploaded URLs use jjapgma-file:<fileId> and resolve at display time. No credentials or Base64 storage fallback in the package.
- Template save/use checks file ownership. HTML/Storybook exports copy uploaded rich-text files through authorized content endpoints. Direct external URLs remain external.
- The supplied contract does not specify tmp lifetime. Template reuse does not extend retention.

User guide: [RICH_TEXT_EDITOR.md](../../../docs/RICH_TEXT_EDITOR.md).
For CSP compatibility, uploaded images first check preview readiness, then all uploaded files are read through the authorized same-origin content endpoint and rendered with temporary Blob URLs. These URLs are revoked on cleanup and are never persisted in documentJson.

## jjapgma consumer uploads and modal UI (2026-09-19)

The latest user request distinguishes builder authoring (components/templates: category=tmp) from actual consuming services (new uploads: omit category to use file-service default). React exports expose Screen.richText and HTML exports read window.jjapgmaRichText before runtime.js starts. Both accept onChange(nodeId, documentJson) and uploadFile(nodeId, FormData); that FormData contains file only. The consumer backend must also omit category, enforce authentication/ownership/CSRF/file policy, and retain file metadata. Existing tmp files are not automatically promoted. RICH_TEXT.md in each ZIP explains this contract; source guide: docs/RICH_TEXT_RUNTIME.md.

Use the package /image and /file upload tools instead of an extra attachment button. The editor ref now attaches its own portalElement inside the native document dialog so slash menus, file panels and formatting tools stay interactive above the modal backdrop. Page-level button/input styles exclude the rich-text surface, preserving the package image-size menu layout. Package imports, document storage and limits are unchanged.
