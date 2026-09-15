# File-Service Integration

This document relocates the file-service guide from `/임시/연동 지침/file_service_연동지침.md` into the permanent design documentation.

## Purpose
Shnea file-service owns file upload, preview, and download. `mudeora` stores file references only.

## Base URL
- Service base URL: `https://file.shnea.kr`
- All API endpoints start with `/files`.

## Authentication
Upload APIs require JWT Bearer authentication.

Header:

```http
Authorization: Bearer <YOUR_JWT_TOKEN>
```

Rules:
- The token is issued outside file-service usage flow, currently documented as `https://bearer.shnea.kr/`.
- Upload requests without a valid token return `401 Unauthorized`.
- Do not log token values.
- Do not hardcode tokens.

## Authenticated Endpoints

### Base64 Upload
Uploads a Base64-encoded file.

```http
POST /files/upload-base64
Content-Type: application/json
Authorization: Bearer <token>
```

Request body:

```json
{
  "file": "base64-encoded-content",
  "originalname": "example.png",
  "mimetype": "image/png"
}
```

Success:
- `201 Created`
- response includes message and `fileId`

Use in `mudeora`:
- Not the default path.
- Only use when a feature explicitly needs Base64 upload and the current design contract says so.

### Upload From URL
Uploads by letting file-service fetch a provided URL.

```http
POST /files/upload-from-url
Content-Type: application/json
Authorization: Bearer <token>
```

Request body:

```json
{
  "url": "https://example.com/path/to/file.jpg",
  "originalname": "optional-name.jpg",
  "mimetype": "image/jpeg"
}
```

Rules:
- `originalname` is optional.
- `mimetype` is optional.
- If omitted, file-service attempts to infer them.

Success:
- `201 Created`
- response includes message and `fileId`

Use in `mudeora`:
- Not the default path.
- Use only when importing external media is explicitly designed.

### Multipart Upload
Default upload path for editor and mudeora assets.

```http
POST /files/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

Fields:
- single file: `file`
- multiple files: `files`
- multiple upload limit: up to 10 files

Example:

```bash
curl -X POST https://file.shnea.kr/files/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

PowerShell example:

```powershell
curl.exe -X POST https://file.shnea.kr/files/upload `
  -H "Authorization: Bearer YOUR_JWT_TOKEN" `
  -F "files=@image.png" `
  -F "files=@another.pdf"
```

Success:
- `201 Created`
- response includes uploaded file list or metadata

Use in `mudeora`:
- Default path for profile images, project images, and editor uploads.
- Rich text uploads should pass an app-owned `uploadFile` function into `@shnea/blocknote`.

## Public Endpoints

### Preview
Fetches file content for browser preview.

```http
GET /files/preview/:id
```

Path parameter:
- `:id` is `fileId`

Example:

```http
GET https://file.shnea.kr/files/preview/14
```

Success:
- file content such as image or PDF

Consumer rule:
- Preview URL is public according to imported guide.
- Handle preview `202` when preview is not ready.

### Download
Downloads file using original file name where supported.

```http
GET /files/download/:id
```

Path parameter:
- `:id` is `fileId`

Example:

```http
GET https://file.shnea.kr/files/download/14
```

Success:
- file download response

Consumer rule:
- Download URL is public according to imported guide.

## Backend Proxy Rule
`mudeora` uses a backend upload proxy.

Flow:
1. Browser sends file to `POST /api/files/upload`.
2. Backend verifies the server session and owner context.
3. Backend validates file size/type.
4. Backend sends the file to Shnea file-service.
5. Backend returns or stores file-service metadata.

Rules:
- This proxy is allowed because it protects file-service Bearer tokens and enforces mudeora policy.
- The proxy must not become durable local file storage.
- The proxy must not write file blobs to local disk except unavoidable temporary streaming/buffering.
- Browser JavaScript must not receive file-service Bearer tokens.

## Mudeora Storage Rules
Minimum stored value:
- `fileId`

Recommended stored values:
- `fileId`
- `previewUrl`
- `downloadUrl`
- original file name when the UI needs it

Rules:
- `fileId` is the stable reference.
- URLs are convenience/public access values.
- Do not store local file paths as mudeora asset references.
- Do not store raw file bytes in the mudeora service.

## Retention
Rules inherited from editor integration:
- default retention category for editor-driven uploads is `editor`
- unknown retention categories are handled by file-service default
- files not accessed for a long time can be deleted by file-service retention policy

`mudeora` rule:
- Use `EDITOR_RETENTION_CATEGORY=editor` unless a future design decision defines a different category.

## Required Error Handling
Consumers must handle:
- `401 Unauthorized`: upload token missing, expired, or invalid
- `413 Payload Too Large`: file exceeds accepted size
- `507 Insufficient Storage`: file-service cannot store the file
- preview `202`: preview not ready yet

Rules:
- User-facing upload errors should be safe and simple.
- Internal logs should include status and integration context.
- Internal logs must not include Bearer token values.

## Forbidden Behavior
- Do not implement local upload storage in `mudeora`.
- Do not create a replacement upload API without an approved design decision.
- Do not treat preview/download URLs as private secrets.
- Do not store only URLs when `fileId` is available.
- Do not bypass file-service retention by copying files locally.

## Environment Variables
Recommended:

```env
FILE_SERVICE_BASE_URL=https://file.shnea.kr
EDITOR_RETENTION_CATEGORY=editor
UPLOAD_MAX_BYTES=10485760
```

Frontend builds may need a frontend-safe equivalent such as:

```env
VITE_FILE_SERVICE_BASE_URL=https://file.shnea.kr
```

Do not place upload Bearer tokens in static frontend environment values.
