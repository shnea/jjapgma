# 로그인 연결

2026-09-16 기준. 적용 지침은 [login-service.md](../eocs/agent/integrations/login-service.md)입니다. 외부 서비스가 계정 인증과 토큰 발급을 담당하고, 앱은 콜백 검증·내부 사용자·세션·프로젝트 권한을 담당합니다.

## 로그인 서비스 등록값

| 항목 | 값 |
| --- | --- |
| 앱 주소 / 허용 Origin | https://jjapgma.shnea.kr |
| 로그인 Redirect URI | https://jjapgma.shnea.kr/auth/callback |
| 로그아웃 복귀 허용 URL | https://jjapgma.shnea.kr/logout-callback |
| Client 유형 | confidential |
| Client ID | `jjapgma`; 사용자 로그인 성공 확인 |
| Scope | openid profile basic offline_access |
| Grant | authorization_code, refresh_token |
| Response type / PKCE | code / S256 |

콜백 경로 끝에는 `/`를 추가하지 않습니다. 로그인 시작 주소 `https://jjapgma.shnea.kr/auth/login`은 Redirect URI가 아닙니다. 로그아웃은 `POST /api/auth/logout`으로 내부 세션을 종료한 뒤 외부 `/logout?redirect=...`를 거쳐 복귀합니다.

## 실행 설정

사용자 확인: Nginx Proxy Manager에서 HTTPS 인증서를 적용하고 도메인을 `http://192.168.0.55:30137`에 연결했습니다. 개발 Compose와 기존 `jjapgma_dev` DB를 사용합니다. 개발 Nginx는 `.env`의 `NGINX_BIND_ADDRESS=0.0.0.0`, `NGINX_HTTP_PORT=30137`로 LAN 요청을 수신합니다. 환경변수가 없으면 localhost 전용이 기본값입니다. DB는 계속 127.0.0.1:30138에만 바인딩합니다.

개발 Compose는 `.env`의 `APP_URL=https://jjapgma.shnea.kr`, `DEV_AUTH_BYPASS=false`, `OIDC_CLIENT_ID=jjapgma`, `OIDC_SCOPE=openid profile basic offline_access`와 서버 전용 비밀값을 API에 전달합니다. `OIDC_CLIENT_SECRET`은 등록된 confidential client의 Secret, `REFRESH_TOKEN_ENCRYPTION_KEY`는 32바이트 난수의 64자리 hex입니다. 비밀값은 브라우저 번들에 넣지 않습니다.

콜백은 정규화된 `APP_URL`에서 자동 생성합니다. 별도의 `OIDC_REDIRECT_URI`나 `OIDC_POST_LOGOUT_REDIRECT_URI` 변수는 읽지 않습니다.

설정 변경 후 검증·적용 명령:

```sh
docker compose -f compose.dev.yaml config --quiet
docker compose -f compose.dev.yaml run --rm --no-deps api node apps/api/dist/config.js
docker compose -f compose.dev.yaml up -d --no-deps --force-recreate --wait api nginx
```

HTTPS 도메인에서 로그인해야 Secure 쿠키와 Origin 검사가 일치합니다. 개발 우회 계정과 실제 OIDC 계정은 다른 사용자입니다. 기존 개발 프로젝트는 보존되지만 실제 계정에 자동으로 이전하지 않습니다.

로컬 개발 우회로 복귀하려면 `APP_URL=http://localhost:30137`, `DEV_AUTH_BYPASS=true`로 변경 후 위 명령으로 적용합니다. 운영 Compose는 HTTPS 도메인과 우회 비활성화를 고정합니다.

## 검증 결과

- 기존 암호화 키의 형식 오류를 확인했습니다. 암호화 refresh token을 가진 세션이 0개임을 확인하고 새 키를 생성했습니다. 비밀값은 출력하거나 커밋하지 않았습니다.
- Compose/API 설정 검사 통과, API/Nginx 재생성 후 healthy. DB 컨테이너·볼륨과 파일 서비스 설정 보존.
- Nginx 경유 health 200, `devAuthEnabled=false`, 개발 로그인 403, 로그인 시작 302 확인. Client ID·HTTPS 콜백·state/nonce/PKCE S256·Secure/HttpOnly/SameSite=Lax 쿠키 확인.
- 잘못된 로그인 콜백 401, 로그아웃 복귀 경로의 `/` 이동 302 확인.
- 실제 IdP discovery 200. issuer·endpoint·scope·S256이 적용 지침과 일치합니다.
- 초기 IdP authorize에서 `invalid_client`가 있었으나, 이후 사용자가 실제 로그인 정상 동작을 확인했습니다. 이메일 소유 확인도 login-service가 보장한다고 확인했습니다.
- 최초 공개 HTTPS timeout 원인은 개발 Nginx의 `127.0.0.1:30137` 고정 바인딩이었습니다. LAN 수신을 적용한 뒤 이 PC에서 localhost·192.168.0.55·공개 HTTPS의 `/api/health` 모두 200, 공개 HTTPS의 `/api/auth/config`는 200 및 `devAuthEnabled=false`를 확인했습니다. 방화벽 변경은 하지 않았습니다.
- 실제 로그인은 사용자 확인 완료이며 refresh·로그아웃 왕복은 별도 미검증입니다. 공유를 위한 이메일 저장·표시명·userinfo 계약은 [프로젝트 공유](SHARING.md)를 따릅니다.
