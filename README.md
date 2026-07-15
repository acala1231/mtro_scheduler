# mtro_scheduler

로컬 브라우저에서 카카오톡 투표결과 이미지를 기반으로 복사단 월간 일정표를 생성하고 PNG 이미지로 저장하는 웹앱입니다.

서버나 로그인 없이 브라우저에서 동작하며, 명단은 사용자가 CSV 파일로 직접 불러와 브라우저 저장소에만 저장합니다.

## 주요 기능

- 기준월별 복사일정/차량봉사일정 관리
- 명단 CSV 파일 선택 또는 수동 추가, 화면 편집, 브라우저 저장
- 명단이 없을 때 샘플 CSV 다운로드, 명단이 있을 때 현재 명단 CSV 다운로드
- 카카오톡 투표결과 이미지 선택 후 자동 입력
- Tesseract.js 기반 OCR 입력
- 명단 이름/세례명/선택적 별칭 기반 투표결과 매칭
- 복사일정/차량봉사 투표결과 수동 보정 및 명단 기반 저장 검증
- 투표결과 기반 일정표 자동 배정
- 배정결과 수동 수정 및 메모 입력
- 일정표 미리보기
- PNG 이미지 저장
- PWA 설치 및 새 버전 업데이트 안내

## 기술 스택

- React 19
- Vite
- vite-plugin-pwa
- TypeScript
- MUI Core
- MUI X Date Pickers
- Tesseract.js
- html-to-image
- dayjs
- Vitest

## 실행 방법

```bash
npm install
npm run dev
```

개발 서버 실행 후 터미널에 표시되는 Vite URL로 접속합니다.

## 검증

```bash
npm test
npm run build
```

빌드 시 번들 크기 경고가 표시될 수 있습니다. 현재 기준으로 이 경고는 빌드 실패가 아닙니다.

## 주요 구조

```text
src/app/App.tsx
  앱 최상위 화면 조립, 네비게이션, 주요 훅 연결

src/app/appConstants.tsx
  MUI 테마, 단계 메뉴, 단계 아이콘, 출력 역할 라벨

src/app/appUtils.ts
  기준월/날짜/시간 유틸, 일정 정렬, OCR 이미지 전처리, OCR 텍스트 정제

src/app/screens/
  홈, 일정편집, 투표결과, 일정표, 명단 화면 본문

src/app/components/
  화면에서 재사용되는 독립 UI 컴포넌트

src/app/components/ActionMenu.tsx
  우측 ... 액션 메뉴 공통 컴포넌트

src/app/components/PwaUpdatePrompt.tsx
  새 버전 감지 시 업데이트 안내 Snackbar 표시

src/app/components/PwaInstallPrompt.tsx
  PWA 설치 가능 시 설치 확인창 또는 iOS Safari 설치 안내 표시

src/styles/app.css
  일정표 이미지 미리보기용 CSS

src/domain/
  일정 타입, 기본 설정, 날짜/시간 유틸, 투표 파서/병합, 명단 매칭, 배정 로직, 검증

src/data/
  localStorage 저장소, 브라우저 명단 CSV 로더

src/export/
  일정표 이미지 저장, 텍스트 파일 다운로드 헬퍼

src/app/hooks/
  브라우저 명단, 월별 스냅샷, OCR, 일정표 생성 등 화면 상태 훅

public/icon-*.png, public/maskable-icon-*.png
  PWA 설치 아이콘

vite.config.ts
  Vite, Vitest, PWA manifest/service worker 설정

.github/workflows/deploy.yml
  main 브랜치 push 시 GitHub Pages 자동 배포

docs/current-implementation-handoff.md
  현재 소스 기준 개발 문서
```

## 데이터 저장 방식

- 명단: `localStorage`의 `schedule.membersFile`
- 기준월: `localStorage`의 `schedule.lastMonth`
- 월별 작업 데이터: `localStorage`의 `schedule.snapshot.{yyyy-MM}`

월별 작업 데이터에는 설정, 투표결과, 생성된 일정표가 포함됩니다.

명단 CSV 파일은 Git이나 배포 파일에 포함하지 않습니다. 명단 화면에서 샘플 CSV를 내려받아 형식을 확인한 뒤, 사용자가 직접 선택한 파일 또는 `추가` 버튼으로 입력한 명단만 해당 브라우저에 저장됩니다. 저장된 명단은 명단 카드의 `...` 메뉴에서 `수정` 또는 `삭제`할 수 있으며, `저장`한 내용은 브라우저 저장소에 반영됩니다.

샘플 양식과 명단 다운로드 CSV는 아래 기본 열을 사용합니다.

```csv
이름,세례명,정,부,향,향합
홍길동,요셉,true,true,false,false
```

파일 등록 시에는 `세례명` 오른쪽에 선택 열 `별칭`을 추가한 `이름,세례명,별칭,정,부,향,향합` 형식도 지원합니다. 별칭은 OCR 표시명을 실제 명단 이름으로 연결하기 위한 브라우저 내부 보조 정보이며, 명단 카드에서 추가하거나 수정할 수 있습니다.

별칭은 샘플 양식과 현재 명단 CSV 다운로드에는 포함하지 않습니다. 따라서 내려받은 명단을 다시 등록하면 기존 별칭은 유지되지 않으며, 필요한 별칭은 등록 파일에 `별칭` 열을 직접 추가하거나 명단 카드에서 다시 입력해야 합니다.

업로드한 명단의 누적 횟수는 앱에서 0으로 초기화합니다.

브라우저의 안정적인 처리를 위해 명단 CSV는 최대 2MB, 헤더를 포함해 최대 2,000행, 셀당 최대 500자까지 등록할 수 있습니다.

명단이 없을 때는 샘플 양식 다운로드와 파일 등록 버튼을 크게 보여주고, 명단이 있으면 `...` 파일 메뉴에서 현재 명단을 내려받거나 다시 등록할 수 있습니다.

## PWA

기본 PWA가 적용되어 HTTPS 환경 또는 localhost에서 브라우저 설치가 가능합니다.

- GitHub Pages 배포 경로 기준으로 `base`, manifest `start_url`, `scope`는 `/mtro_scheduler/`를 사용합니다.
- 설치 가능한 브라우저에서는 접속 시 설치 확인창을 표시하고 `설치하기`로 브라우저 설치창을 호출합니다.
- iOS Safari에서는 직접 설치창을 호출할 수 없어 `공유 > 홈 화면에 추가` 안내를 표시합니다.
- 설치 안내에서 `오늘 하루 보지 않기`를 누르면 당일에는 다시 표시하지 않습니다.
- 새 버전이 감지되면 화면 하단에 `새 버전이 있습니다.` 안내가 표시됩니다.
- 사용자가 `새로고침`을 누르면 새 service worker를 적용하고 페이지를 새로고침합니다.
- 현재 PWA 캐시는 앱 정적 파일 중심입니다. OCR 엔진/언어 데이터까지 완전한 오프라인 동작을 보장하는 단계는 아닙니다.

## GitHub Pages 배포

`.github/workflows/deploy.yml`로 GitHub Pages 자동 배포를 구성합니다.

- `main` 브랜치에 push되면 `npm ci`, `npm test`, `npm run build`를 실행합니다.
- 빌드 결과물인 `dist`를 GitHub Pages artifact로 업로드하고 배포합니다.
- GitHub 저장소의 `Settings > Pages`에서 Source를 `GitHub Actions`로 선택해야 합니다.
- 배포 주소는 저장소명 기준으로 `https://acala1231.github.io/mtro_scheduler/` 형태입니다.

## 개발 문서

현재 구현 기준의 상세 문서는 아래 파일을 확인합니다.

[docs/current-implementation-handoff.md](docs/current-implementation-handoff.md)

이 문서에는 코드 규칙, 화면 구성, OCR 파싱 방식, 배정 로직, 미리보기 스타일 규칙이 정리되어 있습니다.

## 주의사항

- 명단 CSV 파일에는 개인정보가 포함될 수 있으므로 Git에 커밋하지 않습니다.
- OCR 입력 결과는 이미지 품질에 영향을 받으므로 투표결과 화면에서 수동 보정할 수 있게 유지합니다.
- 투표결과 수동 저장 시 명단에 없는 이름은 저장되지 않습니다. 차량봉사 특수값 `관리장님`은 예외로 허용합니다.
- 일정표 미리보기 CSS는 저장되는 PNG 결과에 직접 반영됩니다.
- 미리보기에서 배정할 사람이 없는 선택 역할은 `없음`, 일정에서 선택하지 않은 역할은 빈칸으로 표시합니다.
- 이미지 저장 기능은 PNG만 지원합니다.
