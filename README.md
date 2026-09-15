# jjapgma · 짭그마

사람과 AI가 같은 UI 명세를 사용하는 웹 UI 설계·개발 플랫폼.

현재 Phase 1 개발 중입니다. 전체 제품 범위는 [base.md](base.md), 다음 작업과 검증 상태는 **[개발 진행도](docs/PROGRESS.md)** 를 먼저 확인하세요.

## Docker 개발 실행

```sh
docker compose -f compose.dev.yaml up -d --build --wait
```

- 웹: http://localhost:30137 — 개발용 로그인 버튼으로 시작합니다.
- DB: 127.0.0.1:30138. 개발 계정은 compose.dev.yaml 참고.
- 개발 데이터: jjapgma-dev_db-data 볼륨. 컨테이너 교체 후에도 유지됩니다.

## Docker 검사

Windows: `./scripts/verify.ps1`  
macOS / Linux: `sh scripts/verify.sh`

별도 Docker 테스트 DB와 Chromium을 사용합니다. 자세한 명령은 [개발 가이드](docs/DEVELOPMENT.md)를 참고하세요.

## 문서

- [현재 설정과 연동](docs/PROJECT_SETUP.md)
- [코드 구조](docs/ARCHITECTURE.md)
- [운영 배포·백업·복구](docs/OPERATIONS.md)
- [주요 결정](docs/DECISIONS.md)
- [API 계약](docs/API.md)

운영 서버에는 compose.yaml과 .env를 둡니다. 소스 빌드 없이 registry.shnea.kr의 버전 지정 이미지를 사용합니다. 이미지 발행과 운영 배포는 별도 단계입니다.
