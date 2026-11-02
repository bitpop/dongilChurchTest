# dongilchurch.com 사이트 검수 프로젝트

https://dongilchurch.com/ 의 기능·화면 디자인에 버그나 문제, 디자인적으로 어색한 부분이 없는지 검증하는 프로젝트입니다.

## 구성

| 경로 | 설명 |
|---|---|
| `scripts/audit.mjs` | 전체 페이지 자동 크롤링 검수 (HTTP 오류, JS 오류, 깨진 링크/이미지, 모바일 가로 스크롤, 접근성(axe), 데스크톱/모바일 전체 스크린샷). 관리자 계정을 주면 로그인 후 관리자 화면도 크롤링 |
| `scripts/inspect.mjs` | 특정 페이지 구조(메뉴, 링크, 폼, 버튼, 텍스트) 덤프 + 스크린샷. 수동 검수 보조 |
| `docs/checklist.md` | 수동 검수 체크리스트 |
| `docs/findings.md` | 검수 결과(이슈 목록) |
| `reports/` | 자동 검수 리포트 출력 (git 제외) |

## 실행

```bash
npm install
```

```bash
cp .env.example .env   # ADMIN_ID / ADMIN_PW 입력 (커밋 금지)
```

```bash
set -a; . ./.env; set +a; npm run audit
```

```bash
npm run inspect -- https://dongilchurch.com/ --shot home.png
```

리포트는 `reports/audit-<시각>/report.md`, 스크린샷은 같은 폴더의 `shots/` 에 생성됩니다.

## 주의

- 계정 정보는 `.env` 에만 두고 저장소에 커밋하지 않습니다.
- 크롤러는 `logout`, `delete`, `remove` 가 포함된 URL은 방문하지 않습니다(데이터 파괴 방지). 관리자 화면에서 등록/수정/삭제는 수동으로만 검증합니다.
