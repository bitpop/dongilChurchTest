# dongilchurch.com 사이트 검수 프로젝트

https://dongilchurch.com/ 의 기능·화면 디자인에 버그나 문제, 디자인적으로 어색한 부분이 없는지 검증하는 프로젝트입니다.
사이트는 **Flutter Web(CanvasKit) SPA** 이므로 일반 링크 크롤러 대신 라우트 목록 기반 캡처 + Flutter 시맨틱 트리 읽기 방식으로 검수합니다.

## 결과

- **검수 결과(이슈 목록): [`docs/findings.md`](docs/findings.md)**
- 증빙 스크린샷: `docs/evidence/`
- 수동 검수 체크리스트: `docs/checklist.md`

## 구성

| 경로 | 설명 |
|---|---|
| `scripts/flutter-audit.mjs` | 라우트 목록을 데스크톱(1440)/모바일(390)으로 열어 스크린샷·시맨틱 텍스트·콘솔/HTTP 오류·API 호출 수집. `ADMIN_ID/ADMIN_PW` 가 있으면 UI 로그인 후 순회 |
| `scripts/interact.mjs` | 인터랙션 시나리오(GNB, 검색, 배너, 설교 필터, 모바일 햄버거/탭) 단계별 캡처 |
| `scripts/qa-lib.mjs` | 쓰기 검증용 공용 헬퍼(시맨틱 트리 기반 클릭/입력/로그인) |
| `scripts/w*-*.mjs` | 2차 동작 검증 시나리오(게시판 CRUD, 관리자 등록/삭제, 내 정보 등). `[QA테스트]` 데이터만 생성·삭제 |
| `scripts/login-ui.mjs` | 로그인 화면 검증(오류 메시지, 정상 로그인) |
| `scripts/perf.mjs` | 초기 로딩 성능 측정 |
| `scripts/sheet.py` | 스크린샷 묶음(contact sheet) 생성 |
| `scripts/flutter-snap.mjs`, `scripts/inspect.mjs`, `scripts/audit.mjs` | 단일 페이지 스냅샷 / 일반 HTML 사이트용 크롤러(참고용) |
| `docs/routes*.txt` | 번들(main.dart.js)에서 추출한 라우트 목록 |
| `reports/` | 캡처 결과(git 제외) |

## 실행

```bash
npm install
```

```bash
cp .env.example .env   # ADMIN_ID / ADMIN_PW 입력 (커밋 금지)
```

```bash
set -a; . ./.env; set +a; OUT=reports/routes-admin node scripts/flutter-audit.mjs "$(grep -v '^#' docs/routes-admin.txt | tr '\n' ',' | sed 's/,$//')"
```

```bash
node scripts/flutter-audit.mjs            # 비로그인, docs/routes.txt 전체
```

```bash
node scripts/interact.mjs && node scripts/perf.mjs
```

```bash
set -a; . ./.env; set +a; node scripts/w1-stories.mjs   # 쓰기 검증은 반드시 하나씩 순차 실행
```

```bash
python3 scripts/sheet.py reports/routes-guest reports/sheets/guest
```

Playwright 는 환경에 설치된 것을 사용합니다. 프로젝트에 없으면 `npm i -D playwright` 후 `npx playwright install chromium`.

## 주의

- 계정 정보는 `.env` 에만 두고 저장소에 커밋하지 않습니다.
- **같은 refresh 토큰을 두 곳에서 쓰면 서버가 "모든 기기 로그아웃" 처리**합니다. 로그인 상태 캡처는 반드시 한 컨텍스트에서 순차 실행하고 `storageState` 재사용은 피하세요.
- 스크립트는 읽기 전용 동작만 수행합니다. 관리자 화면의 등록/수정/삭제는 수동으로만 검증합니다.
