# 세줄여행 — 최종 인수인계 & 새 PC 이사 가이드

> PC 교체·협업·AI 도움 요청 시 이 문서를 먼저 참고하세요.  
> 프로젝트 루트: `세줄여행` (패키지명: `sejul-yeoheng`)

---

## 1. 프로젝트 핵심 요약

### 기술 스택

| 구분 | 사용 기술 |
|------|-----------|
| 프레임워크 | **Next.js 15** (App Router) |
| 언어 | **TypeScript 5** |
| UI | **React 19**, **Tailwind CSS 4** |
| 백엔드/DB | **Supabase** (PostgreSQL, Auth, Storage) |
| 클라이언트 SDK | `@supabase/supabase-js` |
| 기타 UI/UX | **lucide-react** (아이콘), **Swiper** (상세 슬라이드), **@dnd-kit** (관리자 미디어 순서 드래그) |

### 주요 기능

- **공개 사이트**
  - 메인: 여행지 목록, 검색·지역·별점·태그 필터, 정렬
  - 상세: 이미지/동영상 슬라이드, 세 줄 요약, 태그 표시·공유 등
- **관리자**
  - 로그인(Supabase Auth) — 허용 이메일은 `lib/auth.ts`의 `ADMIN_EMAIL`로 하드코딩
  - `/admin/write`: 글 등록·수정, 태그(이름+색), 다중 미디어 업로드·순서·출처(credit)
  - `/admin`: 목록·필터
- **데이터**
  - 여행지는 Supabase `destinations` 테이블 + Storage 버킷 `destinations`에 미디어 저장

---

## 2. 최근 주요 변경 사항 (기술 명세)

### 2.1 태그(`tags`): `text[]` → `jsonb` (`{ name, color }[]`)

- **과거**: PostgreSQL `text[]` — 태그가 문자열 배열.
- **현재**: `jsonb` 배열 — 각 요소가 `{ "name": string, "color": string }` 형태.  
  `color`는 관리자가 고른 배경 hex(예: `#FBECDD`). 빈 문자열이면 프론트에서 해시 기반 자동 색(`TagChip` / `getColors`).
- **DB 마이그레이션**: 저장소에 SQL 마이그레이션 파일이 있다면 그 경로를 함께 보관할 것(없으면 Supabase 대시보드에서 컬럼 타입·데이터 이전 이력 확인).

#### `lib/tag-utils.ts` 역할

| 함수 | 역할 |
|------|------|
| `tagStringLabel(t)` | `string` / `{name,color}` / 깨진 값까지 **표시·검색용 이름 한 줄**로 통일 |
| `tagColorFromUnknown(t)` | 객체일 때 `color`만 안전하게 문자열로 추출 |
| `normalizeTagArray(raw)` | API·상태에 섞인 값들을 항상 **`Tag[]`**로 맞춤 (관리자 폼 `setTags` / `setAllTags` 등) |
| `safeLower(s)` | 검색·자동완성에서 `String(s ?? "").toLowerCase()` — **비문자열에 `.toLowerCase()` 호출로 인한 TypeError 방지** |

#### 구/신 버전 혼재 시 안전 처리

1. **`lib/supabase.ts`**
   - `parseTags()`: 배열 요소가 **객체(`name` 있음)** 이면 `{ name, color }`로 정규화, **문자열**이면 `{ name, color: "" }`로 승격.
   - `fetchAllTags()`: 행 단위로 태그를 훑어 고유 `name` 기준 맵에 색상 병합.
2. **`lib/tag-utils.ts`**
   - UI·필터·자동완성은 가능한 한 **`tagStringLabel` / `normalizeTagArray` / `safeLower`** 경로만 사용.
3. **`app/page.tsx`**
   - 검색·태그 필터는 `safeLower` + `tagStringLabel` 기준.

이렇게 해서 DB에 옛 `text[]` 데이터가 남아 있거나, 중간 형태가 섞여 있어도 **클라이언트에서 크래시 없이** 동작하도록 맞춰 둔 상태입니다.

---

### 2.2 이미지 출처(`image_credit`)

- **과거**: 단일 문자열 등 단순 형태로 쓰이던 적이 있음.
- **현재(앱 모델)**:
  - 읽기: `parseImageCredits()`가 다음을 모두 수용 → 최종적으로 **`string[]`** (이미지 URL 순서와 맞는 출처 문구 배열).
    - `null` / `undefined` → `[]`
    - 단일 문자열 → 한 요소 배열
    - `string[]` → 그대로
    - **`[{ url, credit }]` jsonb** → `credit`만 뽑아 배열
  - 쓰기(`toDbRow`): `imageUrls` 순서에 맞춰 **`[{ url, credit }]`** 형태로 DB에 저장.

즉 “한 컬럼 안에 여러 형식이 섞일 수 있는 상태”를 전제로 **방어 파싱**이 들어가 있습니다.

---

### 2.3 에러 방지용 방어 로직 요약

| 항목 | 설명 |
|------|------|
| `safeLower` | 메인 검색, 태그 자동완성 등에서 소문자 비교 시 사용. `e.toLowerCase is not a function` 류 예방. |
| `normalizeTagArray` | 관리자 페이지에서 `fetchAllTags` / `fetchDestinationById` 직후 상태를 **항상 `Tag[]`**로 고정. |
| `toDestination` (try/catch) | 행 파싱 실패 시 빈 안전 객체 반환으로 **흰 화면 방지**. |
| `fetchDestinationById` | try/catch + 실패 시 `null`. |
| 썸네일/미디어 배열 | `Array.isArray` 가드로 렌더 단계 예외 완화. |

배포 후에도 **옛 JS 번들이 CDN/브라우저에 남으면** 예전 에러가 다시 보일 수 있으므로, 배포 뒤 **강력 새로고침** 또는 **캐시 무효화**가 중요합니다(4절 참고).

---

## 3. 새 PC로 이사하기 (Migration Guide)

### 3.1 설치할 도구

- **Node.js**: **LTS 권장** (예: 20.x / 22.x — `package.json`의 `@types/node`와 맞추면 됨).
- **Git**: 저장소 클론·커밋·푸시용.
- **에디터**: VS Code / Cursor 등.
- (선택) **pnpm/yarn** — 본 프로젝트는 **npm** 기준으로 스크립트가 작성됨.

### 3.2 클론 후 실행 순서

```bash
git clone <저장소 URL>
cd 세줄여행   # 또는 실제 폴더명
npm install
```

로컬 개발 서버:

```bash
npm run dev
```

프로덕션 빌드 검증:

```bash
npm run build
npm run start
```

기타:

```bash
npm run lint
```

---

### 3.3 [중요] 수동으로 옮겨야 하는 파일 — `.env.local`

GitHub에 **커밋하지 않는** 것이 정석인 **비밀·환경 전용** 파일입니다. **USB·암호화 메일·비밀 메모** 등으로 **직접** 새 PC에 복사하세요.

#### 이 프로젝트에서 코드가 참조하는 변수

| 파일 | 변수명 | 용도 |
|------|--------|------|
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `.env.local` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon(public) 키 |

- **`NEXT_PUBLIC_*`**: 브라우저 번들에 포함됩니다. **anon 키는 공개 전제**이지만, RLS(행 수준 보안)·Storage 정책으로 권한을 제한해야 합니다.
- 이 파일이 없으면 `lib/supabase.ts`에서 클라이언트 생성이 깨지고 **로컬에서 DB/로그인/업로드가 동작하지 않습니다.**

#### 새 PC에서 할 일

1. 프로젝트 루트에 `.env.local` 생성.
2. 옛 PC의 동일 파일 내용을 붙여넣기 (또는 Supabase 대시보드에서 URL/anon key 재발급·복사).
3. `.env.local.example` 같은 템플릿을 repo에 두고 싶다면 **값은 비우고 키 이름만** 커밋하는 방식을 권장.

---

### 3.4 GitHub에서 Clone 해야 하는 이유 / `node_modules`를 복사하면 안 되는 이유

| 방식 | 이유 |
|------|------|
| **Git clone** | 소스만 버전 관리되고, 플랫폼(Windows ↔ Mac 등)·Node 버전에 따라 네이티브 의존성이 달라질 수 있음. **항상 `npm install`로 재생성**하는 것이 안전. |
| **폴더 통째 복사** | `.git` 없이 복사하면 이력·원격이 끊기고, `.env.local` 누락·`node_modules` 꼬임이 잦음. |
| **`node_modules` 복사 비권장** | 용량이 크고, OS/CPU 아키텍처/Node 버전 불일치로 **빌드 오류**가 난다. `package-lock.json`이 있으면 lock 기준으로 `npm install`이 재현성이 좋음. |

---

## 4. 운영 및 관리 가이드

### 4.1 새 태그 추가 및 색상 지정

1. 관리자 계정으로 로그인 후 **`/admin/write`** 접속.
2. 태그 입력란에 이름 입력 후 **Enter** 또는 **쉼표(`,`)**로 추가.
3. 추가된 **칩(태그)을 클릭**하면 색상 피커가 열림 — 노션 스타일 팔레트(`ADMIN_PALETTE` in `components/TagChip.tsx`) 또는 **자동 배정** 선택.
4. 저장 시 `tags`는 jsonb **`[{ name, color }]`** 형태로 DB에 반영됨.

자동완성 후보는 `fetchAllTags()`로 기존 글들에서 수집한 고유 태그입니다.

---

### 4.2 수정 후 배포 순서 (Git)

```bash
git status
git add .
git commit -m "변경 요약"
git push origin main   # 실제 브랜치명에 맞게 수정
```

- 호스팅(Vercel 등)이 Git 연동이면 **push 후 자동 배포**되는 경우가 많음.
- 배포가 끝난 뒤 사이트에서 **이전 빌드의 JS가 캐시**되어 있으면, 예전 버그가 “아직 남아 있는 것처럼” 보일 수 있음.

### 4.3 브라우저 캐시 / CDN 이슈 해결

- **강력 새로고침**: `Ctrl + Shift + R` (Windows) / `Cmd + Shift + R` (Mac).
- **시크릿 창**으로 동일 URL 접속해 비교.
- CDN 사용 시: 호스팅 패널에서 **캐시 무효화(Purge)** 실행.
- 개발자 도구 **Network** 탭에서 로드되는 `page-*.js` 해시가 배포 후 바뀌었는지 확인(해시가 그대로면 캐시 가능성).

---

## 5. 향후 개선 제안 (남은 과제)

1. **서버 측 검증 강화**  
   현재는 프론트·클라이언트에서 `Tag` 형태·출처 배열 등을 맞추지만, **Supabase Edge Functions / DB 제약(체크·트리거) / RLS 정책**으로 “submit 시점” 검증을 두면 잘못된 jsonb 삽입을 더 줄일 수 있음.

2. **`.env` 템플릿 커밋**  
   `.env.local.example`에 키 이름만 넣어 두면 새 PC·신규 기여자 온보딩이 쉬움.

3. **관리자 이메일 설정화**  
   `ADMIN_EMAIL`을 환경 변수로 빼면 코드 수정 없이 운영 계정 변경 가능.

4. **E2E / 단위 테스트**  
   `parseTags`, `parseImageCredits`, `tag-utils`는 순수 로직이므로 테스트 추가 시 회귀 방지에 유리.

5. **favicon 404**  
   콘솔에 `/favicon.ico` 404가 보이면 `app/favicon.ico` 또는 metadata 설정으로 정리 가능(기능과 무관하지만 운영 품질).

---

## 빠른 참조: 주요 파일

| 경로 | 설명 |
|------|------|
| `lib/supabase.ts` | Supabase 클라이언트, CRUD, Storage, `parseTags` / `parseImageCredits`, `toDestination` / `toDbRow` |
| `lib/tag-utils.ts` | 태그 문자열화·정규화·안전 소문자 |
| `lib/db/schema.ts` | `Tag`, `Destination` 타입 |
| `lib/auth.ts` | 관리자 이메일, 로그인 헬퍼 |
| `app/page.tsx` | 메인 목록·필터·검색 |
| `app/admin/write/page.tsx` | 글 작성/수정, 태그 입력, 미디어 |
| `components/TagChip.tsx` | 태그 칩 UI, 팔레트, `getColors` |

---

*문서 버전: 인수인계용 초안 — 프로젝트 변경 시 이 파일도 함께 갱신할 것.*
