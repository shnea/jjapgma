# 결정 기록

## D-001 — 단일 명세와 모듈형 구조

- 날짜: 2026-09-15. 상태: 채택.
- 근거: base.md와 사용자 유지보수 요구.
- 선택: React/Vite 웹, NestJS 기능별 단일 API, PostgreSQL. 공통 UI Spec/Registry/검증을 workspace 패키지로 공유.
- 이유: Canvas·Preview·향후 Storybook/MCP의 데이터 불일치를 막고 일관된 권한·트랜잭션을 유지.
- 대안: 기능별 초기 MSA는 운영/분산 트랜잭션 복잡성 때문에 도입하지 않음.
- 영향: 모듈 경계를 유지하고 실제 부하/독립 배포 필요가 생길 때만 worker/서비스 분리.

## D-002 — Docker 검증과 이미지 배포

- 날짜: 2026-09-15. 상태: 채택.
- 근거: 사용자 Docker-only 테스트, registry.shnea.kr, Linux AMD64, 운영 설정 파일 두 개 요구.
- 선택: 개발/test/운영 Compose를 분리. 운영은 고정 commit 태그 이미지, 개발은 호스트 Linux 아키텍처, 발행 전 AMD64 테스트.
- 운영 프록시 HTTPS → Nginx 30137, DB 30138. 추가 포트는 필요 시 30139부터.
- 영향: 운영 소스 checkout/빌드 불필요. DB는 named volume. 짧은 중단을 허용하는 수동 pull/migrate/recreate 절차부터 시작.
- 재검토: CI runner 및 무중단 요구가 구체화되면 자동화.

## D-003 — 외부 인증/AI와 앱의 책임

- 날짜: 2026-09-15. 상태: 채택.
- 근거: 사용자가 제공한 login-service 및 Jjapgma n8n 지침.
- 인증: 외부 login-service; 앱은 서버 세션·callback 검증·내부 사용자/프로젝트 ACL.
- AI: n8n의 /webhook/jjapgma만 Provider 진입점으로 사용. 현재 자연어 응답과 향후 MCP 편집 계약을 분리.
- 영향: mudeora 예시 client 값은 짭그마 등록값으로 매핑. 실제 OIDC 비밀값 없이는 실 연동 완료로 기록하지 않음.
- n8n 외부 수정은 필요한 시점에 사용자에게 작업 내용을 전달. 모델 직접 호출이나 장애 시 자체 구현 우회는 하지 않음.

## D-004 — 단계별 릴레이 개발

- 날짜: 2026-09-15. 상태: 채택.
- 근거: 사용자가 여러 날에 걸쳐 이어갈 개발과 진행 공유를 요청.
- 선택: PROGRESS.md에 완료·진행·미착수, 실제 검증, 제약, 다음 시작점을 유지. 설정과 구조는 각 기준 문서에 기록.
- 영향: 일부 동작 구현과 Phase/전체 제품 완료를 구분하며, 미래 기능의 빈 UI를 완성 기능처럼 노출하지 않음.
