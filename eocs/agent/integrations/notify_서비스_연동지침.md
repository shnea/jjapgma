# Notify 서비스 연동 지침

## 1. 문서 목적

이 문서는 외부 서비스 또는 AI 에이전트가 `notify-service`에 한 번에 연결할 수 있도록
연동 방식, 요청 규격, 채널별 규칙, 운영 체크리스트를 정의한다.

이 문서 하나만 읽어도 다음을 바로 수행할 수 있어야 한다.
- API 호출 방식 이해
- 인증 방식 이해
- EMAIL, SMS, KAKAO 채널별 요청 작성
- 재시도와 중복 방지 처리
- 운영 시 주의사항 확인

본 문서는 외부 연동 기준의 단일 공식 지침서다.

## 2. 연동 대상 서비스 개요

`notify-service`는 알림 발송을 직접 동기 처리하지 않는다.

외부 서비스는 알림 요청만 등록하고,
실제 발송은 내부 워커가 비동기로 처리한다.

즉, API 응답은 "발송 완료"가 아니라 "접수 완료" 의미다.

## 3. 지원 채널

현재 기준 채널:
- `EMAIL`
- `SMS`
- `KAKAO`

채널별 목적:
- `EMAIL`: 상세한 내용 전달, HTML 기반 본문 가능
- `SMS`: 짧고 긴급한 알림 전달
- `KAKAO`: 비즈메시지 기반 알림 전달

권장 사용 방식:
- 상세 안내는 `EMAIL`
- 긴급 리마인드는 `SMS`
- 템플릿 기반 운영 메시지는 `KAKAO`

## 4. 공통 연동 규칙

### 4.1 Endpoint

- Method: `POST`
- Path: `/v1/notifications`
- Content-Type: `application/json`

### 4.2 인증

모든 요청은 Bearer Token 인증을 사용한다.

```http
Authorization: Bearer <issued-token>
```

규칙:
- 토큰은 활성 상태여야 한다
- 토큰은 `notify:send` scope를 포함해야 한다
- 폐기된 토큰은 사용할 수 없다

### 4.3 Idempotency-Key

모든 요청은 `Idempotency-Key` 헤더가 필수다.

```http
Idempotency-Key: <caller-generated-unique-key>
```

규칙:
- 하나의 비즈니스 이벤트당 하나의 키를 사용한다
- 동일 이벤트 재시도 시 같은 키를 재사용한다
- 다른 이벤트에 같은 키를 재사용하면 안 된다

권장 포맷:
- `notify:<channel>:<resource-type>:<resource-id>:<event>:<version-or-date>`

예시:
- `notify:email:task:431:assigned:v1`
- `notify:sms:task:431:due-today:2026-03-24`
- `notify:kakao:task:431:status-change:v1`

### 4.4 응답 해석

정상 접수 응답 예시:

```json
{
  "id": "uuid",
  "status": "PENDING",
  "created_at": "2026-03-24T08:00:00.000Z"
}
```

응답 규칙:
- `202 Accepted`: 신규 알림이 접수됨
- `200 OK`: 같은 토큰 + 같은 idempotency key로 이미 접수된 요청
- `PENDING`: 큐 적재 상태
- `PENDING`는 발송 성공이 아니다

### 4.5 공통 에러 코드

대표 에러:
- `UNAUTHORIZED`: 토큰 누락 또는 무효
- `FORBIDDEN`: scope 부족
- `IDEMPOTENCY_REQUIRED`: idempotency key 누락
- `RATE_LIMITED`: 토큰 단위 요청 제한 초과
- `CHANNEL_UNSUPPORTED`: 지원하지 않는 채널
- `REQUEST_FAILED`: 요청 검증 또는 처리 실패

호출자 규칙:
- 네트워크 단절 등으로 API 도달 여부가 불확실할 때만 재시도한다
- 재시도 시 같은 `Idempotency-Key`를 사용한다
- 4xx 에러는 데이터 또는 연동 문제로 보고 무한 재시도하지 않는다

### 4.6 비동기 처리 모델

처리 순서:
1. 외부 서비스가 알림 요청 전송
2. notify-service가 DB에 저장
3. 내부 워커가 대기 건을 가져감
4. 채널별 provider로 발송
5. 최종 상태가 `SENT` 또는 `FAILED`로 정리됨

외부 연동 시 의미:
- API 성공 응답은 발송 완료 신호가 아니다
- 외부 서비스는 "요청 접수됨"으로만 처리해야 한다
- 최종 배송 추적이 필요하면 별도 상태 조회/콜백 정책이 추가되어야 한다

## 5. EMAIL 연동

### 5.1 사용 목적

이메일은 긴 본문, HTML 본문, 상세 안내가 필요한 알림에 사용한다.

예:
- 업무 배정 안내
- 마감 예정 알림
- 일간/주간 요약
- 댓글 멘션 상세 안내

### 5.2 EMAIL 요청 형식

Raw content 방식:

```json
{
  "channel": "EMAIL",
  "to": { "email": "user@example.com" },
  "subject": "Task reminder",
  "content": "<p>Your task is due tomorrow.</p>"
}
```

Template 방식:

```json
{
  "channel": "EMAIL",
  "to": { "email": "user@example.com" },
  "template_id": 1,
  "variables": {
    "name": "Lee",
    "task_title": "Client report",
    "due_date": "2026-03-25"
  }
}
```

필수 규칙:
- `channel`은 반드시 `EMAIL`
- 수신자는 `to.email`
- raw content 사용 시 `subject`, `content` 필수
- template 사용 시 `template_id` 필수
- template 변수 누락 시 요청 실패
- 이메일 주소 형식이 올바르지 않으면 실패

### 5.3 EMAIL 관련 에러

- `INVALID_EMAIL`
- `CONTENT_REQUIRED`
- `TEMPLATE_NOT_FOUND`
- `TEMPLATE_VARIABLES_MISSING`
- `TEMPLATE_CHANNEL_MISMATCH`

### 5.4 EMAIL 환경변수

#### SMTP 방식

필수:
- `MAIL_TYPE=smtp`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SECURE`
- `SMTP_FROM`

#### API 방식

필수:
- `MAIL_TYPE=api`
- `MAIL_API_ENDPOINT`
- `MAIL_API_PATH`
- `MAIL_API_ACCESS_KEY`
- `MAIL_API_SECRET_KEY`
- `MAIL_API_SENDER_ADDRESS`

선택:
- `MAIL_API_SENDER_NAME`

## 6. SMS 연동

### 6.1 사용 목적

문자는 짧고 즉시 인지해야 하는 알림에 사용한다.

예:
- 당일 마감 리마인드
- 긴급 업무 배정
- 연체/지연 경고

### 6.2 SMS 요청 형식

```json
{
  "channel": "SMS",
  "to": { "phone": "+821012345678" },
  "content": "[Task] Client report is due tomorrow."
}
```

필수 규칙:
- `channel`은 반드시 `SMS`
- 수신자는 `to.phone`
- `content` 필수
- 전화번호 형식이 올바르지 않으면 실패
- 내부 provider 전송 시 숫자 정규화가 수행될 수 있음

### 6.3 SMS 관련 에러

- `INVALID_PHONE`
- `CONTENT_REQUIRED`

### 6.4 SMS 환경변수

필수:
- `SENS_ACCESS_KEY`
- `SENS_SECRET_KEY`
- `SENS_SERVICE_ID`
- `SENS_SENDER`

현재 구현은 Naver SENS SMS를 사용한다.

## 7. KAKAO 연동

### 7.1 사용 목적

카카오 알림은 템플릿 기반 운영성 메시지에 사용한다.

예:
- 업무 상태 변경
- 업무 배정
- 승인/반려 알림

### 7.2 KAKAO 요청 형식

```json
{
  "channel": "KAKAO",
  "to": { "phone": "+821012345678" },
  "subject": "TEMPLATE_CODE",
  "content": "업무가 배정되었습니다."
}
```

필수 규칙:
- `channel`은 반드시 `KAKAO`
- 수신자는 `to.phone`
- `subject`는 카카오 Biz Message 템플릿 코드로 사용된다
- `content`는 발송 본문으로 사용된다
- 전화번호 형식이 올바르지 않으면 실패

### 7.3 KAKAO 관련 에러

- `INVALID_PHONE`
- `CONTENT_REQUIRED`
- `KAKAO_TEMPLATE_CODE_MISSING`

### 7.4 KAKAO 환경변수

필수:
- `SENS_ACCESS_KEY`
- `SENS_SECRET_KEY`
- `SENS_BIZ_SERVICE_ID`

아래 둘 중 하나 필요:
- `SENS_BIZ_SENDER_KEY`
- `SENS_BIZ_PLUS_FRIEND_ID`

현재 구현은 Naver SENS Biz Message 기반이다.

### 7.5 추후 추가 정책

카카오 채널은 현재 notify-service에서 처리 가능하지만,
업무/캘린더 본서비스에서 어떤 이벤트를 카카오로 보낼지는 별도 제품 정책이 필요하다.

TODO:
- 어떤 이벤트를 카카오 기본 채널로 쓸지 정의
- 카카오 템플릿 코드 관리 주체 정의
- 사용자 수신 동의/거부 정책 정의

## 8. 외부 에이전트 구현 절차

외부 에이전트는 아래 순서대로 구현하면 된다.

1. notify-service base URL을 확인한다.
2. `notify:send` scope를 가진 Bearer Token을 확보한다.
3. 비즈니스 이벤트별로 deterministic한 `Idempotency-Key`를 만든다.
4. 채널에 따라 `EMAIL`, `SMS`, `KAKAO` 중 하나를 선택한다.
5. 채널 규칙에 맞는 JSON body를 생성한다.
6. `POST /v1/notifications`로 전송한다.
7. `200` 또는 `202`를 수신하면 접수 성공으로 처리한다.
8. 재시도는 같은 `Idempotency-Key`로 수행한다.
9. 반환된 `notification id`를 비즈니스 이벤트와 매핑해 저장한다.
10. 최종 발송 확인이 필요하면 별도 상태 추적 정책을 추가 검토한다.

## 9. 캘린더/업무 서비스 권장 매핑

추천 매핑:
- 업무 배정: `EMAIL` 또는 `KAKAO`
- 마감 임박: `SMS`
- 댓글 멘션: `EMAIL`
- 상태 변경: `KAKAO`
- 일간 요약: `EMAIL`

추천 idempotency key 예시:
- `notify:email:task:431:assigned:v1`
- `notify:sms:task:431:due-today:2026-03-24`
- `notify:kakao:task:431:status-approved:v1`

## 10. 보안 및 운영 주의사항

- Bearer Token은 프론트엔드에 직접 노출하면 안 된다
- 토큰은 서버 측 비밀 저장소에서 관리해야 한다
- 이메일, 전화번호, 본문 전체를 호출자 로그에 그대로 남기지 않는 것이 원칙이다
- 관리자용 토큰 발급/폐기 기능은 외부 공개 금지다
- 대량 발송 시 토큰별 rate limit을 고려해야 한다

## 11. 미정 항목

- TODO: 발송 완료 여부 조회 API가 필요한지 확정
- TODO: 콜백(webhook) 방식이 필요한지 확정
- TODO: 채널별 사용자 수신 동의 모델 확정
- TODO: 템플릿 관리 주체와 배포 절차 확정
- TODO: 야간 발송 제한 정책 확정
