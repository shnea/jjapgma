# Login-Service Integration

This document relocates the login integration guide from `/임시/연동 지침/log_연동지침.md` into the permanent design documentation.

## Purpose
`mudeora` must not implement login itself. It must integrate with external `login-service` as the identity provider.

The service is responsible for:
- starting login
- handling callback
- exchanging authorization code
- validating tokens
- mapping external users to internal users
- maintaining an internal session
- logging out
- refreshing tokens when needed

The service is not responsible for:
- username/password login
- signup
- email verification
- social login provider logic
- password verification
- token issuance as an identity provider

## Core Principles
- Authentication uses OAuth 2.0 Authorization Code Flow + OpenID Connect.
- Browser URLs must never carry tokens.
- The browser receives only `code`; token exchange happens on the server.
- `redirect_uri` must exactly match the registered value.
- `state` is mandatory.
- `nonce` is mandatory when using `openid`.
- Public Client flows must use PKCE S256.
- Server-based apps should prefer Confidential Client + server session.

## Login-Service Endpoints
Production:
- OIDC Issuer: `https://login.shnea.kr`
- Discovery Endpoint: `https://login.shnea.kr/.well-known/openid-configuration`
- JWKS Endpoint: `https://login.shnea.kr/jwks`
- Authorization Endpoint: `https://login.shnea.kr/authorize`
- Token Endpoint: `https://login.shnea.kr/token`
- UserInfo Endpoint: `https://login.shnea.kr/userinfo`
- Revoke Endpoint: `https://login.shnea.kr/revoke`
- Logout Endpoint: `https://login.shnea.kr/logout`

Local development:
- OIDC Issuer: `http://localhost:30100`
- Discovery Endpoint: `http://localhost:30100/.well-known/openid-configuration`
- JWKS Endpoint: `http://localhost:30100/jwks`
- Authorization Endpoint: `http://localhost:30100/authorize`
- Token Endpoint: `http://localhost:30100/token`
- UserInfo Endpoint: `http://localhost:30100/userinfo`
- Revoke Endpoint: `http://localhost:30100/revoke`
- Logout Endpoint: `http://localhost:30100/logout`

Rules:
- Production issuer validation must require `https://login.shnea.kr`.
- Do not allow arbitrary issuers.
- If hardcoding a default is unavoidable, prefer the production value.

## Client Registration
`mudeora` must be registered as an OAuth/OIDC client in `login-service`.

Required registration values:
- `client_id`
- `client_secret` for Confidential Client
- client type: `confidential` or `public`
- allowed `redirect_uri` list
- allowed scope list

Recommended production registration:
- `client_id`: `mudeora-web`
- `redirect_uri`: `https://mudeora.shnea.kr/auth/callback`

Local testing registration:
- use the same domain-based redirect URI unless a separate IDP client is explicitly registered
- `redirect_uri`: `https://mudeora.shnea.kr/auth/callback`

Recommended scopes:
- `openid`
- `profile`
- `basic`
- `offline_access` when long-lived sessions or server-side refresh are needed

Rules:
- `redirect_uri` must match exactly, not partially.
- Local testing uses domain-based redirect URIs because IDP matching is strict.
- Public Client must not use `client_secret`.
- Server-based structure should prefer Confidential Client.

## Recommended Auth Model
Default:
- Confidential Client + server session.
- Browser uses only a server session cookie.
- Server performs token exchange.
- `client_secret` lives only in server environment variables.
- `refresh_token` lives only in server storage or server session.
- Browser localStorage/sessionStorage must not store long-lived tokens.

Exception:
- Public Client + PKCE only when browser SPA architecture is unavoidable.
- PKCE method must be S256.
- `code_verifier` must be generated and kept safely in browser flow.
- `client_secret` must never be bundled into browser code.
- Prefer BFF pattern if possible.

## Login Start
When the user clicks login or enters an auth-required route, redirect to `login-service` `/authorize`.

Required parameters:
- `response_type=code`
- `client_id`
- `redirect_uri`
- `state`
- `scope`

OIDC required parameter:
- `nonce`

Public Client additional required parameters:
- `code_challenge`
- `code_challenge_method=S256`

Example:

```http
GET https://login.shnea.kr/authorize?response_type=code&client_id=mudeora-web&redirect_uri=https%3A%2F%2Fmudeora.shnea.kr%2Fauth%2Fcallback&scope=openid%20profile%20basic%20offline_access&state=STATE_123&nonce=NONCE_123
```

Server rules:
- `state` must be unpredictable.
- `nonce` must be unpredictable.
- Store `state` and `nonce` in server session or server-side storage.
- Login attempts may have expiration time.
- Preserve intended return path when needed.

## Callback Handling
On successful login, `login-service` redirects back to the registered `redirect_uri`.

Callback receives:
- `code`
- `state`

Failure may include:
- `error`
- `state`

Required validation:
- received `state` exactly matches stored `state`
- login attempt has not already been used
- login attempt is not expired
- callback endpoint is an expected service endpoint

Rules:
- If `state` differs, fail authentication immediately.
- If `code` is missing, fail authentication.
- If `error` exists, show safe login failure guidance.
- On success, immediately proceed to server-side token exchange.

## Authorization Code Exchange
The server exchanges callback `code` at `login-service` `/token`.

Example:

```http
POST https://login.shnea.kr/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTH_CODE",
  "redirect_uri": "https://mudeora.shnea.kr/auth/callback",
  "client_id": "mudeora-web",
  "client_secret": "SERVER_SIDE_SECRET"
}
```

PKCE adds:

```json
{
  "code_verifier": "ORIGINAL_CODE_VERIFIER"
}
```

Expected successful response:

```json
{
  "access_token": "ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 900,
  "id_token": "ID_TOKEN",
  "refresh_token": "REFRESH_TOKEN"
}
```

Rules:
- `/token` call happens only on the server.
- `client_secret` must never be exposed to the browser.
- Failed token exchange fails authentication safely.

## Token Validation
Do not trust tokens simply because they came from `login-service`; validate them.

Primary validation target:
- `id_token`

Secondary validation target:
- `access_token` when needed by a specific flow

Required checks:
- signature verification succeeds
- issuer matches allowed issuer
- audience matches current `client_id`
- `exp` is valid
- `iat` is reasonable
- `nonce` matches stored nonce
- `sub` exists

Rules:
- Signature keys must come from discovery/JWKS.
- `openid` login requires nonce validation.
- Do not treat plain decoded token data as authenticated.

Forbidden:
- skipping signature validation
- skipping issuer validation
- skipping audience validation
- skipping nonce validation
- login success based only on token decoding

## Internal User Mapping
External identity key:
- `sub`

Rules:
- Map `sub` to internal user.
- Email is auxiliary, not the primary identity key.
- Internal user table should include a field such as `oidc_sub` or `login_subject`.
- On login, find user by `sub`.
- If not found after successful token validation, create the internal user automatically.
- Nickname/display name is collected separately through onboarding or profile setup and is not unique.
- `profileId` remains the unique public identifier; do not use nickname for routing identity.
- Domain authorization remains owned by `mudeora`.

Recommended internal user fields:
- `id`
- `oidc_sub`
- `email`
- `display_name`
- `created_at`
- `last_login_at`

First-login rules:
- Use `sub` as lookup key.
- Create an internal user if no user exists for the verified `sub`.
- Store email as reference data only.
- Do not require nickname uniqueness.
- Require nickname/display name before flows that need a public display identity.
- Do not infer project/domain roles from email.

## Internal Session
After successful login, create an internal session.

Recommended:
- server session cookie
- internal user ID in session
- optional external `sub` in session
- optional access token expiration in session
- refresh token only on server side
- refresh token stored in Postgres in encrypted form, tied to the server session record

Browser restrictions:
- Do not store refresh token in localStorage.
- Do not keep access token long term in browser storage.
- Browser should normally hold only a service session cookie.

Session ends when:
- user logs out
- refresh fails repeatedly
- external auth state becomes invalid
- internal security policy forces expiration

## Refresh Token Handling
Refresh token may be used for long-lived login.

Rules:
- Store refresh token only server-side.
- Store refresh token in Postgres, encrypted at rest with `REFRESH_TOKEN_ENCRYPTION_KEY`.
- Tie refresh token records to internal user/session identity.
- Refresh before or shortly after access token expiration.
- Follow `login-service` rotation policy.
- If a new refresh token is issued, replace the old one immediately.
- Refresh requests happen only from the server.
- On refresh failure, terminate internal session and require re-login.

Example:

```http
POST https://login.shnea.kr/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "REFRESH_TOKEN",
  "client_id": "mudeora-web",
  "client_secret": "SERVER_SIDE_SECRET"
}
```

Recommended error handling:
- `invalid_grant`: end session and require re-login
- `invalid_client`: treat as configuration incident
- network error: limited retry, then safe failure

## UserInfo Usage
Use `/userinfo` only when additional profile information is needed.

Rules:
- Call `/userinfo` with access token.
- Treat response as auxiliary data.
- Identity key remains `sub`.
- Decide per service whether `/userinfo` failure cancels login.

Recommended default:
- If ID token validation succeeds, login succeeds.
- `/userinfo` is only for optional enrichment.

## Logout
Logout should consider both local session and external login-service session.

Recommended sequence:
1. Destroy internal session.
2. Revoke refresh token when needed.
3. Redirect to login-service logout endpoint when needed.
4. Return to allowed post-logout service route.

Example:

```http
GET https://login.shnea.kr/logout?redirect=https%3A%2F%2Fmudeora.shnea.kr%2Flogout-callback
```

Rules:
- End internal session first.
- Post-logout redirect URI must be allowlisted.
- Logout callback should be a simple completion or login route.

## Security Rules
Always:
- validate `state`
- validate `nonce`
- keep `client_secret` in server env only
- keep tokens out of URLs
- keep raw tokens out of logs
- keep refresh token out of browser storage
- validate issuer and audience
- validate redirect URI strictly
- avoid half-authenticated session state after auth failure

Recommended:
- login attempt expiration
- CSRF protection for auth-start flows
- HTTPS in production
- secure cookies
- HttpOnly session cookies

## Error Handling
User-facing messages should be simple and safe:
- `로그인에 실패했습니다. 다시 시도해 주세요.`
- `세션이 만료되었습니다. 다시 로그인해 주세요.`
- `인증 정보를 확인할 수 없습니다.`

Internal logs may include:
- state mismatch existence
- token exchange failure type
- issuer/audience/nonce validation failure reason
- userinfo failure existence
- refresh failure reason

Internal logs must not include:
- full access token
- full ID token
- full refresh token
- client secret

## Environment Variables
Recommended minimum:

```env
OIDC_ISSUER=https://login.shnea.kr
OIDC_DISCOVERY_URL=https://login.shnea.kr/.well-known/openid-configuration
OIDC_JWKS_URL=https://login.shnea.kr/jwks
OIDC_AUTHORIZATION_ENDPOINT=https://login.shnea.kr/authorize
OIDC_TOKEN_ENDPOINT=https://login.shnea.kr/token
OIDC_USERINFO_ENDPOINT=https://login.shnea.kr/userinfo
OIDC_REVOKE_ENDPOINT=https://login.shnea.kr/revoke
OIDC_LOGOUT_ENDPOINT=https://login.shnea.kr/logout

OIDC_CLIENT_ID=mudeora-web
OIDC_CLIENT_SECRET=change_me
OIDC_REDIRECT_URI=https://mudeora.shnea.kr/auth/callback
OIDC_POST_LOGOUT_REDIRECT_URI=https://mudeora.shnea.kr/logout-callback

OIDC_SCOPE=openid profile email basic offline_access
SESSION_SECRET=change_me
REFRESH_TOKEN_ENCRYPTION_KEY=change_me_32_bytes_minimum
```

Public Client structures do not use `OIDC_CLIENT_SECRET`.

## Implementation Priority For AI
When login work is requested, implement only integration-client behavior:
- login start endpoint
- callback endpoint
- state and nonce storage/validation
- authorization code exchange
- ID token validation
- internal user mapping
- internal session creation
- logout integration
- refresh token renewal

Never implement:
- local login screen as an authentication system
- password verification
- JWT issuance as IdP behavior
- duplicated auth DB schema
- email as unique identity key
- auth validation shortcuts

## Ambiguity Rule
If a detail is unclear, do not lower security. Mark it as `TODO:` in code or docs and ask for a decision when needed.

Examples:
- `TODO: Decide post-logout UX route.`
