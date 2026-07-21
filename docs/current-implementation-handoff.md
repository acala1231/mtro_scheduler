# 현재 소스 기준 개발 문서

## 문서 목적

이 문서는 `mtro_scheduler` 레포를 처음 보는 AI 또는 개발자가 현재 소스 구조, 구현 내용, 코드 규칙을 빠르게 이해하고 이어서 작업할 수 있도록 정리한 문서다.

이 문서가 현재 개발 기준이다. 과거 초기 설계 문서는 제거되었으며, 새 작업은 이 문서와 실제 소스 코드를 기준으로 판단한다.

작성 기준일: 2026-07-21

## 실행 방법

```bash
npm install
npm run dev
npm test
npm run build
```

주요 기술:

- React 19
- React Router (`HashRouter`)
- Vite
- vite-plugin-pwa
- TypeScript
- MUI Core
- MUI X Date Pickers
- Tesseract.js
- html-to-image
- dayjs
- Vitest

## 주요 파일

```text
src/app/App.tsx
  앱 모델, 공통 셸, 라우트 화면의 최상위 조립

src/app/hooks/useAppModel.ts
  앱 생명주기를 유지하는 상태와 화면 액션 조립

src/app/components/AppShell.tsx
  상단 앱바, 화면 메뉴, 하단 단계 내비게이션, PWA 프롬프트

src/app/AppRoutes.tsx
  경로별 화면과 화면 props 연결

src/app/appRouting.ts
  화면-경로 매핑과 초기 legacy/잘못된 hash canonical 정규화

src/app/appConstants.tsx
  MUI 테마, 단계 메뉴, 단계 아이콘, 출력 역할 라벨

src/app/appUtils.ts
  기준월/날짜/시간 유틸, 일정 정렬, 브라우저 OCR 이미지 준비, OCR 텍스트 정제

src/app/assignmentDisplay.ts
  배정결과 없음 표시, 입력값 변환 유틸

src/app/screens/
  홈, 일정편집, 투표결과, 일정표, 명단 화면 본문

src/app/components/
  화면에서 재사용되는 독립 UI 컴포넌트

src/app/components/ActionMenu.tsx
  우측 `...` 액션 메뉴 공통 컴포넌트

src/app/components/PwaUpdatePrompt.tsx
  service worker 업데이트 감지 시 사용자에게 새 버전 안내 표시

src/app/components/PwaInstallPrompt.tsx
  PWA 설치 가능 시 설치 확인창 또는 iOS Safari 설치 안내 표시

src/styles/app.css
  일정표 이미지 미리보기용 CSS

src/domain/scheduleTypes.ts
  도메인 타입 정의

src/domain/assignmentEngine.ts
  일정표 배정 로직

src/domain/voteParser.ts
  OCR 텍스트를 투표결과로 변환하는 파서

src/domain/voteOcrMerge.ts
  여러 OCR 시도 결과를 투표 인원수 기준으로 병합하는 순수 로직

src/domain/ocrImageProcessing.ts
  OCR 행 감지, 픽셀 기반 이진화와 확대 등 순수 이미지 처리

src/domain/scheduleSettings.ts
  기본 일정 설정 생성, OCR에서 인식한 미등록 일정 병합

src/domain/memberMatcher.ts
  OCR 결과에서 명단 이름을 유사 매칭하는 로직

src/domain/validators.ts
  생성 전 검증

src/data/localScheduleStore.ts
  브라우저 localStorage 저장/로드

src/data/memberRepository.ts
  브라우저 localStorage 명단 저장/로드 및 명단 정규화

src/data/memberCsv.ts
  명단 CSV 샘플, 파싱, 다운로드용 문자열 생성

src/app/hooks/useMembers.ts
  명단 업로드/추가/삭제/수정, 브라우저 저장, 생성결과 무효화 연결

src/app/hooks/useScheduleSnapshot.ts
  기준월별 설정/투표/생성결과 localStorage 스냅샷 로드와 저장

src/app/hooks/useScheduleResult.ts
  일정 추가/초기화/수정, 투표결과 수동 편집, 일정표 생성/PNG 저장 액션

src/app/hooks/useVoteOcr.ts
  투표결과 이미지 선택, OCR 실행·취소, 인식 일정 병합, 진행률/오류/미리보기 상태 관리

src/app/hooks/useBackButtonClose.ts
  Dialog/Menu/Popover/Snackbar 등 앱 제어 팝업이 열려 있을 때 물리 뒤로가기 입력으로 페이지 이동 대신 팝업을 닫는 공통 훅

src/app/components/MemberCard.tsx
  명단 카드 읽기/수정모드 UI

src/export/exportScheduleImage.ts
  미리보기 DOM을 이미지로 저장

src/export/downloadTextFile.ts
  텍스트/CSV 파일 브라우저 다운로드 헬퍼

public/app-icon.svg
public/icon-192.png
public/icon-512.png
public/maskable-icon-192.png
public/maskable-icon-512.png
public/apple-touch-icon.png
public/favicon-16x16.png
public/favicon-32x32.png
public/favicon.svg
  PWA/브라우저 아이콘

vite.config.ts
  Vite, Vitest, GitHub Pages base, PWA manifest/service worker 설정

.github/workflows/deploy.yml
  main 브랜치 push 시 테스트/빌드 후 GitHub Pages 자동 배포
```

## 코드 규칙

### 기본 원칙

- 현재 기능의 실제 기준은 소스 코드다. 문서와 코드가 다르면 코드를 먼저 확인하고 문서를 갱신한다.
- `src/app/App.tsx`는 앱 모델, 공통 셸, 라우트 화면만 최상위에서 조립한다.
- 앱 전역 생명주기를 유지해야 하는 화면 상태와 액션 연결은 `src/app/hooks/useAppModel.ts`에 둔다.
- 공통 앱바와 내비게이션은 `src/app/components/AppShell.tsx`, 경로별 화면 props 연결은 `src/app/AppRoutes.tsx`에 둔다.
- 화면 본문 UI 변경은 `src/app/screens/*`에 반영한다.
- 독립 UI 변경은 `src/app/components/*`에 반영한다.
- 공통 메뉴/역할 라벨/테마 변경은 `src/app/appConstants.tsx`에 반영한다.
- 날짜/시간/정렬/OCR 텍스트 정제와 브라우저 이미지 준비 유틸은 `src/app/appUtils.ts`에 반영한다.
- 픽셀 기반 OCR 이미지 처리 규칙은 `src/domain/ocrImageProcessing.ts`, OCR 실행·취소 흐름은 `src/app/hooks/useVoteOcr.ts`에 반영한다.
- 출력 이미지 CSS 변경은 `src/styles/app.css`에 반영한다.
- 도메인 규칙 변경은 `src/domain/*`에 둔다. UI 컴포넌트 안에 배정/파싱 규칙을 새로 넣지 않는다.
- 명단은 Git 또는 배포 파일에 포함하지 않는다. 사용자가 명단 화면에서 CSV 파일을 직접 선택해 브라우저에 저장한다.
- 월별 작업 데이터는 `src/data/localScheduleStore.ts`를 통해 다룬다. 임의의 `localStorage` 키를 컴포넌트 안에서 직접 늘리지 않는다.
- 브라우저 명단 데이터는 `src/data/memberRepository.ts`를 통해 다룬다.
- 날짜/시간 문자열 생성은 `src/domain/dateTime.ts`의 유틸을 우선 사용한다.
- 역할 타입은 `src/domain/scheduleTypes.ts`의 `BaseRole`, `SubRole`, `Role`, `CountRole`을 사용한다. 문자열 리터럴을 새로 흩뿌리지 않는다.
- 사용자 화면 문구는 현재 한국어 기준을 유지한다.

### React/MUI 작성 규칙

- 현재 앱은 MUI 컴포넌트를 중심으로 구성한다.
- 날짜/시간 입력은 가능하면 MUI X Date Pickers 또는 MUI 입력 컴포넌트를 사용한다.
- 반복되는 목록은 Accordion 패턴을 유지한다.
- 화면 설명 Tooltip은 모바일에서 길게 누르지 않아도 되도록 아이콘 탭으로 열고 바깥 탭으로 닫히게 유지한다.
- 화면 설명 Tooltip 문구는 현재 화면에서 사용자가 다음에 해야 할 행동, 저장 위치, 되돌리기 어려운 작업의 확인창 여부를 쉬운 말로 안내한다.
- 수정/취소/저장 흐름이 있는 하위 Accordion은 `EditableAccordionItem`을 우선 사용한다.
- 수정 화면은 기본 보기와 수정모드를 분리한다.
- 삭제/수정 같은 보조 작업은 가능하면 우측 `...` 메뉴에서 노출한다.
- 우측 `...` 메뉴는 `ActionMenu`를 우선 사용한다.
- 삭제/초기화처럼 되돌리기 어려운 동작은 `useConfirmDialog` 확인창을 거친 뒤 실행한다.
- 저장/취소/삭제 버튼 순서는 기존 화면과 맞춘다. 현재 일정 편집은 `취소`, `삭제`, `저장` 순서다.
- 모바일 화면을 우선 고려한다. 텍스트가 버튼/카드 밖으로 넘치지 않게 한다.
- 새 컴포넌트는 `src/app/components`에 두고 named export를 사용한다.
- 새 화면 본문 컴포넌트는 `src/app/screens`에 두고 named export를 사용한다.
- 컴포넌트 props는 현재처럼 파일 안에서 인라인 타입으로 시작해도 된다. 여러 파일에서 재사용되기 시작하면 별도 타입으로 분리한다.

### 상태 관리 규칙

- 기준월 변경 시 해당 월 스냅샷을 로드한다.
- 설정 또는 투표결과가 바뀌면 기존 생성 결과는 무효화한다.
- 생성 결과를 직접 수정할 때는 `updateResult`를 통해 상태와 저장소를 함께 갱신한다.
- 투표결과 이미지를 선택하면 기존 투표결과와 이전 이미지가 자동 추가한 OCR 일정만 초기화하고 OCR 입력을 즉시 시작한다. 별도 입력/변환 실행 버튼은 없다.
- 사용자 화면에서 숨긴 OCR 디버그 정보는 앱 상태로 유지하지 않는다. 디버그 UI를 다시 추가할 경우 필요한 상태와 표시 정책을 새로 설계한다.

### 도메인/테스트 규칙

- 파서 변경 시 `src/domain/voteParser.test.ts`를 갱신하거나 추가한다.
- 배정 로직 변경 시 후보 선택 순서, 카운트 증가, 차량봉사 우선 배정, 랜덤 동점 처리를 함께 확인한다.
- 명단 매칭 변경 시 `memberMatcher.ts`의 alias/정규화 영향으로 잘못된 이름이 추가되지 않는지 확인한다.
- 작업 후 최소한 `npm test`, `npm run build`를 실행한다. 문서만 수정한 경우에는 생략 가능하다.

### 스타일 규칙

- 일반 앱 UI는 MUI `sx`를 우선 사용한다.
- 출력 이미지로 저장되는 일정표 스타일은 `src/styles/app.css`에 둔다.
- `.schedule-preview` 내부 CSS는 이미지 저장 결과에 직접 반영되므로 화면 보기뿐 아니라 저장 이미지 기준으로 판단한다.
- 차량봉사 표처럼 출력물 모양을 맞추기 위한 빈 열은 DOM에 명시적으로 두고 CSS로 투명 처리한다.

## 현재 화면 구성

현재 앱은 단일 페이지 앱이며 하단 스텝 네비게이션 중심으로 이동한다.

현재 단계 타입:

```ts
type AppStep = "home" | "members" | "settings" | "votes" | "generate";
```

주요 화면:

- 홈
- 일정편집
- 투표결과
- 일정표

보조 화면:

- 명단

`생성`, `내보내기`는 별도 화면으로 두지 않는다. 현재는 `일정표` 화면 안에서 생성, 결과 수정, 미리보기, PNG 저장을 처리한다.

네비게이션:

- 상단바 타이틀은 홈에서는 `복사단 일정표`, 그 외 화면에서는 현재 메뉴명을 표시한다.
- 초기 진입 시 포커스를 빼앗지 않으며, 이후 push 또는 뒤로가기로 경로가 바뀌면 키보드·스크린리더 사용자가 새 화면을 인지하도록 상단 `h1` 제목으로 포커스를 이동한다.
- 상단 좌측 뒤로가기 버튼은 홈이 아닌 화면에서 브라우저 history의 이전 화면으로 이동한다.
- 상단 우측 메뉴는 전체 화면 이동과 명단 접근에 사용한다.
- 하단 네비게이션은 `1 홈 > 2 일정편집 > 3 투표결과 > 4 일정표` 스텝표 형태다.
- 하단 스텝은 숫자, 아이콘, 메뉴명을 함께 표시하고 단계 사이를 화살표로 표현한다.
- `HashRouter`의 canonical 경로는 홈 `#/`, 명단 `#/members`, 일정편집 `#/settings`, 투표결과 `#/votes`, 일정표 `#/generate`다.
- 기존 `#home`, `#members`, `#settings`, `#votes`, `#generate` 북마크는 첫 렌더 전에 대응하는 canonical 경로로 교체하며, 알 수 없는 hash도 `#/`로 정리한다.
- 브라우저 물리 뒤로가기/모바일 제스처를 위해 화면 이동은 React Router history와 동기화한다.
- Dialog/Menu/Popover/Snackbar 등 앱에서 제어하는 팝업이 열려 있으면 물리 뒤로가기는 페이지 이동 대신 가장 위에 열린 팝업만 닫는다. 팝업 history 정보는 기존 router state를 보존한 채 `mtroScheduler: { kind: "popup", popupId }` namespace에 기록한다.
- `useBackButtonClose`는 모듈 단위 팝업 스택과 단일 `popstate` 핸들러로 동작한다. 중첩 팝업에서는 마지막에 열린 팝업만 닫고, 그 아래 팝업은 유지한다.
- 새 앱 제어 팝업을 추가할 때는 `src/app/hooks/useBackButtonClose.ts`를 연결한다.
- 일정편집 화면 하단의 `다음` 버튼은 투표결과로 이동한다.
- 투표결과 화면 하단의 `다음` 버튼은 일정표로 이동한다.

## 홈 화면

홈 화면은 기준월 선택과 주요 작업 진입 버튼을 제공한다.

- 기준월 영역은 카드 전체가 클릭/터치 대상이다.
- 기준월 영역을 선택하면 MUI `MonthCalendar` 팝오버가 열린다.
- 기준월 영역은 키보드 `Enter`, `Space`로도 캘린더를 열 수 있다.
- 기준월은 `yyyy년 m월` 텍스트와 캘린더 아이콘으로 표시한다.
- 홈의 큰 작업 버튼은 `일정편집`, `투표결과 입력` 두 개다.

## 저장 구조

현재는 `localStorage`를 사용한다.

저장 파일:

```text
src/data/localScheduleStore.ts
```

키:

```text
schedule.membersFile
schedule.lastMonth
schedule.snapshot.{yyyy-MM}
```

스냅샷 구조:

```ts
type MonthSnapshot = {
  version: number;
  month: string;
  updatedAt: string;
  settings?: ScheduleSettings;
  votes?: VoteData;
  result?: GenerateScheduleResult;
};
```

동작:

- 기준월은 `schedule.lastMonth`에 저장된다.
- 명단은 `schedule.membersFile`에 저장된다.
- 앱 재진입 시 마지막 기준월을 자동 로드한다.
- 월별 설정, 투표결과, 배정결과는 `schedule.snapshot.{month}`에 저장된다.
- 브라우저 데이터가 없으면 해당 기준월의 모든 일요일 기준으로 기본 복사일정과 차량봉사일정을 생성한다.

## PWA/업데이트 안내

기본 PWA는 `vite-plugin-pwa`로 적용되어 있다.

관련 파일:

```text
vite.config.ts
index.html
src/vite-env.d.ts
src/app/components/PwaUpdatePrompt.tsx
src/app/components/PwaInstallPrompt.tsx
public/app-icon.svg
public/icon-192.png
public/icon-512.png
public/maskable-icon-192.png
public/maskable-icon-512.png
public/apple-touch-icon.png
public/favicon-16x16.png
public/favicon-32x32.png
public/favicon.svg
```

현재 설정:

- `vite.config.ts`에서 `VitePWA`를 사용한다.
- `registerType`은 `prompt`다.
- service worker는 빌드 시 `generateSW` 방식으로 생성된다.
- GitHub Pages 배포 경로 때문에 `base`, manifest `id`, `start_url`, `scope`는 `/mtro_scheduler/` 기준이다.
- manifest 이름은 `복사단 일정표`다.
- display는 `standalone`, orientation은 `portrait`다.
- PWA 아이콘은 192/512 PNG와 maskable 192/512 PNG를 사용한다.
- `index.html`에는 favicon, apple touch icon, theme-color, iOS 홈 화면 관련 meta가 있다.
- macOS Safari 호환성을 위해 PNG favicon은 SVG favicon보다 먼저 선언하고, 16x16/32x32 PNG와 `shortcut icon` 링크를 함께 둔다.

업데이트 안내 동작:

- `PwaUpdatePrompt`는 `virtual:pwa-register/react`의 `useRegisterSW`를 사용한다.
- 새 service worker가 대기 상태가 되면 하단 Snackbar로 `새 버전이 있습니다.`를 표시한다.
- `새로고침` 버튼을 누르면 `updateServiceWorker(true)`를 호출해 새 버전을 적용한다.
- `나중에` 버튼은 현재 안내만 닫는다.

설치 안내 동작:

- `PwaInstallPrompt`는 `beforeinstallprompt` 이벤트를 감지해 브라우저 설치창 호출 가능 여부를 판단한다.
- 설치 가능한 브라우저에서는 접속 시 MUI Dialog로 `앱으로 설치할까요?`를 표시한다.
- 사용자가 `설치하기`를 누르면 저장해 둔 `BeforeInstallPromptEvent.prompt()`를 호출한다.
- iOS Safari는 `beforeinstallprompt`를 지원하지 않으므로 `공유 > 홈 화면에 추가` 수동 안내를 표시한다.
- 이미 standalone 모드로 실행 중이면 설치 안내를 표시하지 않는다.
- 사용자가 `나중에`를 누르면 현재 설치 안내만 닫고 다음 접속 시 다시 표시될 수 있다.
- 사용자가 `오늘 하루 보지 않기`를 누르면 `localStorage`의 `pwa.installPrompt.dismissedUntil` 키로 당일 자정까지 다시 표시하지 않는다.

주의:

- 현재 PWA는 앱 shell과 빌드 산출물 중심의 기본 캐시다.
- `workbox.globPatterns`는 `js`, `css`, `html`, `png`, `svg`, `json`을 포함한다.
- OCR 엔진, Tesseract worker, 언어 데이터까지 완전 오프라인 보장하는 캐시 전략은 아직 별도 구현하지 않았다.
- PWA 설치와 service worker는 HTTPS 또는 localhost에서 정상 동작한다. GitHub Pages는 HTTPS라 설치 가능하다.
- iOS Safari에서는 보안 정책상 코드로 설치창을 직접 띄울 수 없다. 반드시 수동 설치 안내 UI를 유지해야 한다.
- 아이콘을 교체할 때는 `public/app-icon.svg` 원본과 생성된 PNG 아이콘을 함께 갱신한다.

## GitHub Pages 배포

GitHub Pages 배포는 `.github/workflows/deploy.yml`에서 처리한다.

동작:

- `main` 브랜치 push 시 자동 실행한다.
- `workflow_dispatch`로 GitHub Actions 화면에서 수동 실행할 수 있다.
- Node 22를 사용한다.
- `npm ci`로 의존성을 설치한다.
- `npm test`를 통과해야 한다.
- `npm run build`로 `dist`를 생성한다.
- `actions/upload-pages-artifact`로 `dist`를 업로드한다.
- `actions/deploy-pages`로 GitHub Pages에 배포한다.

필요한 GitHub 설정:

- 저장소 `Settings > Pages`에서 Source를 `GitHub Actions`로 선택한다.
- 저장소 Actions 권한이 비활성화되어 있으면 활성화한다.
- workflow는 Pages 사이트를 자동으로 활성화하지 않는다. `Get Pages site failed`, `Creating Pages deployment failed`, `404 Not Found`가 발생하면 먼저 저장소 Pages 설정이 `GitHub Actions`로 켜져 있는지 확인한다.

주의:

- 기존 Jekyll 기반 Pages workflow는 사용하지 않는다.
- Vite `base`가 `/mtro_scheduler/`로 설정되어 있으므로 저장소명이 바뀌면 `vite.config.ts`의 base와 manifest 경로도 같이 수정해야 한다.

## 명단 데이터

명단은 사용자가 CSV 파일로 직접 불러오거나 화면에서 수동 추가하며, 브라우저 `localStorage`에만 저장한다.

```text
src/data/memberRepository.ts
src/data/memberCsv.ts
src/app/hooks/useMembers.ts
localStorage key: schedule.membersFile
```

현재 규칙:

- 실제 명단 CSV는 Git이나 GitHub Pages 배포 파일에 포함하지 않는다.
- `public/data/members.json`은 사용하지 않는다.
- 명단이 0명일 때는 `샘플 양식 다운로드`, `파일로 명단 등록` 버튼을 크게 노출한다.
- 명단이 있으면 `...` 파일 메뉴 안에서 `명단 다운로드`, `파일로 명단 등록`, `전체 삭제`를 제공한다.
- `샘플 양식 다운로드`는 `이름,세례명,축일,정,부,향,향합` 기본 열로 구성된 가짜 명단 CSV 파일을 내려받는다.
- `명단 다운로드`는 현재 브라우저에 저장된 명단을 기본 열 CSV로 내려받으며, 브라우저 내부 OCR 보조 정보인 `별칭`은 포함하지 않는다.
- 명단 화면의 `파일로 명단 등록`으로 CSV 파일을 불러온다. 0명일 때는 큰 버튼, 명단이 있을 때는 `...` 파일 메뉴 안에서 제공한다.
- 명단 화면의 `인원 추가` 버튼으로 파일 없이 명단을 한 명씩 수동 추가할 수 있다.
- 명단이 있는 상태에서 `파일로 명단 등록`을 누르면 현재 저장된 명단이 교체된다는 확인창을 먼저 띄운다.
- 업로드 명단 CSV의 기본 헤더는 `이름,세례명,축일,정,부,향,향합`이다. 파일 등록 시에는 `축일` 오른쪽에 선택 열 `별칭`을 추가한 `이름,세례명,축일,별칭,정,부,향,향합` 형식도 지원하며 기존의 축일 열 없는 형식도 계속 읽는다.
- 별칭은 샘플 양식과 명단 다운로드 CSV에 포함하지 않는다. 내려받은 명단을 다시 등록하면 기존 별칭은 유지되지 않으므로, 필요한 별칭은 등록 파일에 선택 열을 직접 추가하거나 명단 카드에서 다시 입력한다.
- 업로드 데이터에는 `counts`를 넣지 않는다. 앱은 업로드 시 누적 횟수를 0으로 초기화한다.
- 불러온 명단은 `schedule.membersFile` 키에 저장한다.
- 명단 화면의 `...` 파일 메뉴 안의 `전체 삭제`로 브라우저에 저장된 명단을 삭제할 수 있다.
- 명단 화면에서 카드별 우측 `...` 메뉴를 누르면 `수정`, `삭제` 작업을 선택할 수 있다.
- 명단 편집 중 `취소`는 변경 전 값으로 되돌리고, `저장`은 `schedule.membersFile`에 반영한다.
- 명단 추가/저장/검증 시 중복 기준은 `이름 + 세례명` 조합이다.
- 명단 카드 삭제와 전체 삭제는 확인창을 거친 뒤 실행한다.
- 명단 카드 삭제는 `schedule.membersFile`에 반영하며, 마지막 명단을 삭제하면 `전체 삭제`와 같은 상태로 전환한다.
- 명단 편집은 생성된 일정표 결과를 무효화한다.
- 명단 CSV 파싱/생성 규칙은 `src/data/memberCsv.ts`에 모아둔다. 화면 컴포넌트에서 CSV 문자열을 직접 조작하지 않는다.
- 명단 카드 수정 UI는 `src/app/components/MemberCard.tsx`에 둔다.
- 명단 카드는 `전체` 횟수를 항상 표시하고, 역할별/차량 횟수는 1회 이상일 때만 칩으로 표시한다.
- 명단 상태와 localStorage 저장 연동은 `src/app/hooks/useMembers.ts`에서 처리한다.
- 명단이 없으면 홈/명단 화면에 업로드 안내를 표시하고, 일정표 생성은 검증 오류로 막힌다.
- 앱은 업로드한 명단 CSV 파일 자체를 수정하지 않는다.
- `관리장님`은 명단 화면에는 노출하지 않는다.
- 차량봉사 결과에는 특수 이름 `관리장님`이 들어갈 수 있다.
- OCR 파싱 시 명단에 없는 이름은 투표결과에 추가하지 않는다.
- 세례명은 `baptismalName`, 선택적 별칭은 `alias` 필드로 분리되어 있으며 명단 화면에서 별도 입력 필드로 편집한다.
- 명단 화면의 역할 배지는 클릭해서 활성/비활성을 전환한다.

주요 타입:

```ts
type Member = {
  name: string;
  baptismalName?: string;
  alias?: string;
  roles: Record<BaseRole, boolean>;
  counts: Record<CountRole, number>;
};
```

## 일정편집 화면

일정편집 화면은 MUI Accordion 기반이다.

현재 주요 영역:

- 일정표 색상 지정
- 복사일정
- 차량봉사일정

일정표 색상:

- 제목 색상 `titleColor`
- 헤더 색상 `headerColor`
- 초기화 버튼은 현재 색상 기본값으로 되돌린다.

복사일정/차량봉사일정:

- 일정 목록은 날짜/시간순으로 정렬한다.
- `일정추가` 버튼으로 추가한 항목은 바로 수정모드로 열린다.
- 각 항목은 기본 보기 상태에서는 텍스트와 역할 배지만 간단히 노출한다.
- 복사일정 기본 보기에서는 날짜를 첫 줄에, 역할 배지는 날짜 아래 줄에 표시하며 `...` 메뉴는 카드 우측 세로 중앙에 둔다.
- 수정/삭제는 우측 `...` 메뉴에서 노출한다.
- 수정모드에서는 `취소`, `삭제`, `저장` 버튼이 우측 정렬로 표시된다.
- 수정모드에서 날짜/시간/역할을 바꿔도 즉시 저장하지 않고 카드 내부 임시값만 바꾼다. `저장`을 눌러야 설정에 반영된다.
- OCR로 자동 추가된 일정은 출처가 표시된 상태로 저장되며, 일정편집에서 수정 후 `저장`하면 출처를 제거해 일반 일정으로 전환한다.
- 시간 입력은 MUI `TimePicker`를 사용하며 시간을 선택하면 picker가 닫히도록 `closeOnSelect`를 사용한다.
- 저장 시 같은 날짜/시간의 일정이 이미 있으면 저장하지 않고 카드 안에 경고 메시지를 표시한다.
- 삭제와 초기화는 확인창을 거친 뒤 실행한다.
- 복사일정 초기화는 기준월의 모든 일요일 `11:00` 복사일정을 생성한다.
- 차량봉사 초기화는 기준월의 모든 일요일 `09:40` 차량봉사일정을 생성한다.

기본 문구:

- 일반 복사 일정 문구는 `복사 일정`이 아니라 일정 자체로 취급한다.
- 차량봉사 기본 시간은 `09:40`.
- 표시문구는 사용자가 직접 편집하지 않고 날짜/시간 기준으로 표시한다.

## 투표결과 화면

투표결과 화면은 세 영역으로 구성된다.

- 카카오톡 투표결과 가져오기
- 복사일정 투표결과
- 차량봉사 투표결과

카카오톡 투표결과 가져오기:

- `투표결과 이미지 선택` 버튼으로 카카오톡 투표결과 이미지를 선택한다.
- 이미지를 선택하면 기존 투표결과 전체와 이전 이미지에서 자동 추가된 OCR 일정만 초기화한 뒤 자동으로 OCR 입력을 시작한다. 기본 일정, 사용자가 추가한 일정, 출처 없는 기존 저장 일정은 유지한다.
- 선택된 이미지는 미리보기로 표시한다.
- 파일명 배지의 `X`로 이미지만 제거할 때는 투표결과와 OCR 자동 추가 일정을 유지한다.
- 이미지 클릭 시 전체 화면 팝업으로 확대 표시한다.
- 팝업에서는 확대/축소가 가능하다.
- 파일명 배지 위의 `X` 버튼으로 업로드를 취소한다.
- 입력 중에는 이미지 선택 버튼, 파일명 배지 삭제, 복사·차량봉사 섹션 초기화 버튼을 비활성화한다.
- 입력 중에는 `입력중` 문구와 통합 퍼센트 프로그레스바를 표시한다.
- 전처리 이미지, OCR 모델명, 변환 JSON, 일반 파싱오류 메시지는 사용자 화면과 앱 상태에서 유지하지 않는다.

입력 동작:

- OCR 전처리는 원본이 1080px 폭처럼 작은 글자를 포함하면 최대 1800px 폭을 목표로 확대하되, 실사용 처리량은 약 6MP로 제한하고 12MP는 절대 상한으로 둔다. 따라서 긴 세로 캡처는 6MP 예산에 먼저 맞춘다.
- OCR 대상 텍스트 행을 감지해 행 단위로 자르고, 각 행을 3~4배 확대해 `binary-soft`, `binary`, `binary-strong` 세 가지 이진화 강도로 처리한다.
- 하나의 Tesseract worker를 재사용해 각 행을 `PSM.SINGLE_LINE(7)`로 인식하고, 날짜/시간 후보 행은 숫자와 날짜·시간 구분 문자만 허용해 한 번 더 인식한다. worker는 성공·실패·취소 경로에서 종료한다.
- OCR 결과 병합 시 단순 합집합이 아니라 일정별 표시 인원수와 실제 추출 인원수가 가까운 OCR 결과를 우선 선택한다.
- OCR 시도 점수는 명단 필터 후의 결과를 기준으로 표시 인원수와 정확히 일치하면 보상하고, 인원 차이·초과·파싱 실패 줄은 감점한다.
- 표시 인원수 정보가 없는 일정은 여러 OCR 결과를 합쳐 사용한다.
- 이미지의 아이콘/특수문자 영향을 줄이기 위해 OCR 원문 정제 후 파싱한다.
- 이름은 명단의 이름/세례명을 기준으로 유사 매칭한다.
- `scheduleKey:name` 기준으로 중복 제거한다.
- `차량봉사`가 포함된 일정은 차량봉사 투표결과로 들어가야 한다.
- OCR 성공 시 이미지에서 인식한 미등록 복사일정과 차량봉사일정을 일정편집 설정에 자동 추가한다.
- 자동 추가 일정에는 `source: "ocr"`를 기록하며, 다음 이미지를 선택할 때 이 출처가 남은 일정만 제거한다.
- 투표자가 0명인 일정도 이미지의 표시 인원수 정보에서 확인되면 추가하며, 이미 등록된 날짜/시간 일정은 중복 추가하지 않는다.
- OCR 처리 중 사용자가 편집한 최신 일정 설정을 기준으로 병합해 진행 중 편집을 덮어쓰지 않는다.
- OCR에서 감지한 월이 현재 기준월과 다르면 오류 메시지를 표시한다.
- 기준월 불일치 시 투표결과는 저장하지 않고 비우며, 이미지에서 인식한 일정도 일정편집 설정에 추가하지 않는다.

투표결과 편집:

- 복사일정 투표결과, 차량봉사 투표결과 각각 Accordion으로 표시한다.
- 각 Accordion 내부는 설정에 등록된 일정별 하위 Accordion으로 나뉜다.
- 모든 투표결과 Accordion은 기본 펼침 상태다.
- 각 일정 안에서 명단을 추가/수정/삭제할 수 있다.
- 투표결과도 일정처럼 수정모드가 있으며, 수정 중에는 임시 목록만 바꾸고 저장 시 실제 투표결과에 반영한다.
- 저장 시 빈 이름, 같은 일정 안의 중복 이름, 명단에 없는 이름을 검사한다.
- 차량봉사 투표결과에서는 특수값 `관리장님`을 명단에 없어도 허용한다.
- 저장 버튼 왼쪽에 취소 버튼이 있다.
- 일정별 수정모드 안에는 `추가` 버튼이 있고, 복사/차량 Accordion 상단에는 `초기화` 버튼이 있다.
- `초기화`는 확인창을 거쳐 해당 Accordion의 투표 명단과 같은 종류의 `source: "ocr"` 일정만 제거한다. 반대 종류의 투표·OCR 일정과 출처 없는 기본/사용자/레거시 일정, 사용자가 편집해 영구 전환한 일정은 유지한다.
- 섹션 초기화는 최신 설정과 투표 상태를 기준으로 한 번에 저장하며 기존 생성 결과를 무효화한다.

## OCR 파싱 참고

관련 파일:

```text
src/domain/voteParser.ts
src/domain/memberMatcher.ts
src/domain/ocrImageProcessing.ts
src/domain/scheduleSettings.ts
src/app/hooks/useVoteOcr.ts
```

보완된 내용:

- 이름에는 한글 또는 영어만 남도록 정제한다.
- JSON 생성 전 특수문자를 제거한다.
- `확민수`, `무석완`처럼 OCR이 잘못 읽는 경우를 보정하기 위해 문자 치환을 둔다.
- `권헌우`는 `권현우`, `고동운대칠베드로`는 `고동운 대철베드로`처럼 이름/세례명 조합으로 유사 매칭한다.
- `조대현`처럼 앞에 성당명 또는 불필요한 텍스트가 붙는 경우를 고려한다.
- `MARK`, `marco` 같은 영어 세례명 OCR도 일부 alias로 처리한다.
- 카카오톡 투표 결과에서 `3/1 (일) 차량봉사 9:40 : 1명` 같은 형식을 차량봉사로 인식한다.
- `11:\n00`처럼 OCR이 시간을 줄바꿈해도 `11:00`으로 병합해 파싱한다.
- `6/72`처럼 날짜 뒤에 불필요한 숫자가 붙는 OCR 결과는 해당 월의 가능한 날짜로 보정한다.
- `관리장님` 문구가 포함된 차량봉사 줄은 표시 인원수를 기록하되, 0명이면 특수 차량봉사 결과를 추가하지 않고 1명 이상일 때만 `관리장님` 투표를 추가한다.
- `관리장님` 줄에 `차량봉사` 단어가 없어도 날짜가 차량봉사 일정과 매칭되면 차량봉사 결과로 처리한다.
- OCR에서 감지한 일정 월은 `detectedMonths`에 저장되며 기준월 불일치 검증에 사용한다.

주의:

- OCR 품질은 이미지 해상도와 카카오톡 캡처 상태에 크게 영향을 받는다.
- 파서가 완벽히 자동화되어 있다고 가정하면 안 된다.
- 사용자 화면에서는 일반 파싱 오류 메시지를 숨기지만, 기준월 불일치 오류는 사용자에게 표시한다.
- 파서의 `unparsedLines`는 OCR 시도 점수 계산과 내부 파싱 결과에만 사용하며 사용자 화면 상태로 보관하지 않는다.

## 배정 로직

관련 파일:

```text
src/domain/assignmentEngine.ts
```

현재 규칙:

- 투표결과에 있는 사람만 후보가 된다.
- 명단에 없는 이름은 무시한다. 단, 차량봉사 특수 이름 `관리장님`은 허용한다.
- 같은 `scheduleKey:name` 중복 투표는 한 번만 사용한다.
- 차량봉사는 해당 날짜의 복사일정 배정에서 우선 고려한다.
- 복사일정 기본 역할의 실제 배정 순서는 설정 화면 표시 순서와 별개로 `향`, `향합`, `정`, `부` 순서다.
- 역할 배정 우선순위는 누적 카운트가 낮은 사람을 우선한다.
- 동점이면 이름순이 아니라 랜덤 tie-breaker를 사용한다.
- `일정표 다시 생성`을 누르면 랜덤 tie-breaker 때문에 동점 상황의 결과가 바뀔 수 있다.
- 후보가 없으면 내부 결과값은 `X`로 둘 수 있지만 사용자 화면과 미리보기에서는 `없음`으로 표시한다.
- 설정에서 선택하지 않은 역할은 내부 결과값을 빈 문자열로 두며, 미리보기에서는 빈칸으로 표시한다.

결과 타입:

```ts
type ScheduleResultRow = {
  displayDate: string;
  note?: string;
  roles: Partial<Record<Role, string>>;
};

type CarResultRow = {
  displayDate: string;
  name: string;
  note?: string;
};
```

## 일정표 화면

일정표 화면은 생성, 결과 수정, 미리보기를 모두 담당한다.

동작:

- 오류 상태일 때만 오류 문구를 노출한다.
- 오류가 있으면 `일정표 생성` 버튼은 비활성화한다.
- 생성 후 결과는 투표결과 화면과 비슷한 Accordion 형태로 노출한다.
- 배정결과는 사용자가 수정할 수 있다.
- 배정결과 수정 중에는 카드 내부 임시값만 바꾸고, `저장`을 눌러야 생성 결과에 반영한다.
- 배정결과를 수동 저장하면 최종 배정결과 기준으로 `updatedMembers`의 누적 횟수를 다시 계산한다. 명단에 없는 이름과 빈값, `X`는 횟수에 반영하지 않는다.
- 배정결과 입력창에서는 내부 결측값 `X`를 빈값으로 보여준다. 보기 모드와 미리보기에서는 선택된 역할의 결측값을 `없음`으로 표시한다.
- 배정결과 수정 화면에서는 설정에 지정된 역할만 배지로 노출한다.
- 차량봉사 배정결과 영역도 역할/정보 배지가 날짜 아래에 위치한다.
- 각 일정별 메모를 입력할 수 있다.
- 메모는 미리보기에서 날짜 아래에 표시된다.
- `마지막 생성 HH:mm:ss` 문구는 생성 버튼 줄의 오른쪽에 정렬한다.

미리보기/저장:

- `미리보기` 버튼을 누르면 전체 화면 Dialog가 열린다.
- 미리보기 Dialog가 열린 상태에서 브라우저 물리 뒤로가기/모바일 뒤로가기 제스처를 입력하면 화면 이동 없이 Dialog만 닫힌다.
- `PNG 저장` 버튼은 일정표 화면 본문의 `미리보기` 버튼 옆에 있다.
- 미리보기 Dialog 상단에도 `PNG 저장` 버튼을 표시한다.
- PNG 저장 시 배정되지 않은 역할 또는 차량봉사가 있으면 확인창으로 경고하고, 사용자가 저장을 선택한 경우에만 진행한다.
- 팝업을 열지 않아도 PNG 저장이 가능하도록 숨겨진 export용 미리보기 DOM을 유지한다.
- JPG 저장은 지원하지 않는다.
- 미리보기 DOM은 `src/app/components/SchedulePreview.tsx`의 `SchedulePreview` 컴포넌트다.
- 실제 이미지 스타일은 `src/styles/app.css`에 있다.

## 미리보기 표 스타일

관련 파일:

```text
src/styles/app.css
```

현재 주요 스타일:

- `.schedule-preview`: 출력 이미지 전체 영역, 폭 `940px`.
- `.service-table`: 복사일정 표.
- `.service-table tbody tr`: 메모 공간을 감안해 높이 `64px`.
- `.schedule-note`: 미리보기 날짜 아래 메모. 현재 색상은 짙은 하늘색 `#0284c7`.
- `.car-table`: 차량봉사 표.

차량봉사 표 현재 구조:

```text
날짜 | 차량봉사 | 빈 열 | 빈 열 | 빈 열
```

구현 방식:

- 실제 DOM에 `car-table-spacer` 열을 3개 둔다.
- 빈 열은 폭만 차지하고 배경/선/글자를 보이지 않게 한다.
- 차량봉사 헤더는 설정의 `headerColor`를 그대로 따른다.
- 차량봉사 오른쪽 빈 열들의 헤더색은 흰색/투명처럼 보이도록 처리한다.

현재 폭:

- 날짜 열: `145px`
- 차량봉사 열: `120px`
- 빈 열: 각 `120px`
- 차량봉사 표 전체: `625px`

## 이미지 저장

관련 파일:

```text
src/export/exportScheduleImage.ts
```

현재는 PNG 저장만 지원한다. `exportScheduleImage.ts`도 PNG 전용이며 JPG 분기와 `toJpeg` 의존은 제거되었다.

Safari 호환성을 위해 `html-to-image`의 `toPng` data URL 다운로드 방식이 아니라 `toBlob`으로 PNG Blob을 만든 뒤 Object URL을 생성해 다운로드한다. 다운로드 링크는 `document.body`에 붙여 클릭한 뒤 제거한다.

## 현재 구현 기준 결정사항

- IndexedDB는 아직 사용하지 않는다. 현재는 `localStorage` 중심이다.
- 내보내기 화면은 별도로 없다. 일정표 화면 본문에서 PNG 저장한다.
- OCR 정제 원문은 투표 데이터의 `rawText`에 저장하지만 사용자 화면에는 노출하지 않는다. 변환 JSON, 일반 파싱오류 목록, 전처리 이미지는 사용자 화면과 앱 상태에 보관하지 않는다.
- JPG 저장은 UI와 export 코드 모두에서 제거되었다.
- 명단은 CSV 파일 업로드 후 브라우저 저장소에만 보관하며, Git에 실제 명단을 포함하지 않는다.
- `관리장님`은 명단에는 보이지 않지만 차량봉사 결과에는 특수값으로 허용한다.
- 화면은 MUI 기반으로 변경되었다.
- 기본 PWA가 적용되었고 새 버전 감지 시 업데이트 안내를 표시한다.
- PWA 설치 안내는 브라우저 설치 prompt와 iOS Safari 수동 안내를 분기한다.
- 초기 설계 문서는 제거되었다. 현재 개발 문서는 이 파일 하나를 기준으로 한다.

## 개발 시 주의사항

- 사용자 요청은 성격에 따라 `src/app/hooks/useAppModel.ts`, `src/app/AppRoutes.tsx`, `src/app/screens/*`, `src/app/components/*`, `src/app/appUtils.ts`, `src/styles/app.css` 중 적절한 파일에 반영한다.
- `App.tsx`는 앱 모델, 공통 셸, 라우트 화면의 얇은 조립 지점으로 유지한다.
- OCR/파서 변경 시 `src/domain/voteParser.test.ts`를 반드시 확인한다.
- 배정 로직 변경 시 `src/domain/assignmentEngine.ts`의 누적 카운트, 차량 우선 배정, 랜덤 동점 처리 영향을 확인한다.
- 미리보기 이미지는 CSS가 곧 출력물 품질이므로 일반 화면 CSS와 분리해서 생각한다.
- 개인정보 보호를 위해 실제 명단 CSV를 Git에 커밋하지 않는다.
- 공개 GitHub Pages 배포 파일에 실제 명단이 포함되지 않는지 확인한다.

## 검증 명령

작업 후 최소 검증:

```bash
npm test
npm run build
```

현재 빌드 시 큰 번들 경고가 표시될 수 있다. 이는 기존 상태이며 실패가 아니다.

```text
Some chunks are larger than 500 kB after minification
```

## 다음 작업 후보

이어받는 개발자가 고려할 만한 작업:

- OCR 파싱 결과 개발자 디버그 모드 추가
  - 현재 일반 사용자 화면에는 OCR 원문, 변환 JSON, 일반 파싱오류, 전처리 이미지를 노출하지 않는다.
  - 파서 보정 작업을 계속하려면 개발자 전용 토글로 OCR 시도별 원문, 점수, 병합 결과, `unparsedLines`를 확인할 수 있게 만드는 것이 좋다.
- 미리보기 표 스타일 회귀 검증 추가
  - 현재 출력 품질은 `src/styles/app.css`와 `SchedulePreview` DOM 구조에 크게 의존한다.
  - 표 폭, 차량봉사 빈 열, 메모 행 높이, `없음`/빈칸 표시가 깨지지 않도록 Playwright 스크린샷 또는 DOM 기반 테스트를 검토한다.
- `localStorage` 저장 구조 버전 마이그레이션 로직 확장
  - 현재 월별 스냅샷 저장 버전은 v3이다. `loadSnapshot`은 v1/v2 데이터를 런타임 검증한 뒤 일정의 `source`를 명시적으로 제거해 모든 기존 일정을 영구 일정으로 보존하고 v3로 승격한다. v3의 `source: "ocr"` 표식은 유지하며, 알 수 없는 출처 값은 해당 필드만 제거해 영구 일정으로 처리하고 스냅샷의 나머지 데이터는 보존한다.
  - 향후 저장 구조가 바뀌면 기존 사용자의 브라우저 데이터가 깨지지 않도록 `loadSnapshot`에서 버전별 migration을 수행하는 구조가 필요하다.
- OCR 정확도 개선을 위한 이미지 전처리 추가 검토
  - 현재는 픽셀 예산 기반 원본 준비 뒤 텍스트 행을 감지하고, 행별 확대와 세 가지 이진화 강도를 적용한다.
  - 이후 단어별 confidence·bounding box 활용을 비교하면 긴 캡처의 파서 보정이 쉬워진다.
- `SettingsEditor` 내부 일정 카드 편집 패턴 공통화 검토
  - 투표결과/배정결과는 `EditableAccordionItem`을 사용하지만, 일정편집의 복사일정/차량봉사 카드는 별도 카드 구조다.
  - 날짜/시간/역할 수정, 취소, 삭제, 저장, 중복 경고 흐름을 공통 편집 컴포넌트로 더 줄일 수 있는지 검토한다.
- OCR/Tesseract 관련 리소스까지 포함하는 오프라인 캐시 전략 검토
  - 현재 PWA 캐시는 앱 shell과 빌드 산출물 중심이다.
  - OCR worker, wasm, 언어 데이터 로딩 경로를 확인하고 Workbox 런타임 캐시 또는 정적 포함 방식으로 완전 오프라인 입력이 가능한지 검토한다.
