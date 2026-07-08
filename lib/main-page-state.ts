export interface MainPageFilters {
  search: string;
  sido: string;
  sigungu: string;
  ratingFilter: number | "";
  tagFilter: string;
  sortByName: boolean;
}

const SCROLL_KEY = "threelinetrip:main-scroll";

/** URL 쿼리 → 필터 state */
export function parseFiltersFromUrl(search: string): MainPageFilters {
  const params = new URLSearchParams(search);
  const rating = params.get("rating");
  return {
    search: params.get("q") ?? "",
    sido: params.get("sido") ?? "",
    sigungu: params.get("sigungu") ?? "",
    ratingFilter: rating && rating !== "" ? Number(rating) : "",
    tagFilter: params.get("tag") ?? "",
    sortByName: params.get("sort") === "name",
  };
}

/** 필터 state → URL 쿼리 문자열 (앞의 ? 제외) */
export function filtersToSearch(filters: MainPageFilters): string {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.sido) params.set("sido", filters.sido);
  if (filters.sigungu) params.set("sigungu", filters.sigungu);
  if (filters.ratingFilter !== "") params.set("rating", String(filters.ratingFilter));
  if (filters.tagFilter) params.set("tag", filters.tagFilter);
  if (filters.sortByName) params.set("sort", "name");
  return params.toString();
}

/** 현재 필터 상태를 URL에 반영 (히스토리 항목 추가 없음) */
export function syncFiltersToUrl(filters: MainPageFilters): void {
  const qs = filtersToSearch(filters);
  const path = qs ? `/?${qs}` : "/";
  window.history.replaceState(null, "", path);
}

/** 상세 페이지 이동 전 스크롤 위치 저장 */
export function saveMainScroll(): void {
  sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
}

/** 저장된 스크롤 위치 복원 (없으면 null) */
export function consumeMainScroll(): number | null {
  const raw = sessionStorage.getItem(SCROLL_KEY);
  if (raw === null) return null;
  sessionStorage.removeItem(SCROLL_KEY);
  const y = Number(raw);
  return Number.isFinite(y) ? y : null;
}

/** 필터 state → 복귀용 목록 URL */
export function buildReturnUrl(filters: MainPageFilters): string {
  const qs = filtersToSearch(filters);
  return qs ? `/?${qs}` : "/";
}

/** 현재 필터·URL을 상세→목록 복귀용으로 저장 */
export function saveMainReturnUrl(filters?: MainPageFilters): void {
  const url = filters
    ? buildReturnUrl(filters)
    : window.location.pathname + window.location.search;
  sessionStorage.setItem("threelinetrip:main-return-url", url);
}

/** 저장된 목록 URL (없으면 "/") */
export function getMainReturnUrl(): string {
  return sessionStorage.getItem("threelinetrip:main-return-url") || "/";
}

/** 스크롤 복원 (레이아웃·이미지 로드 후 재시도) */
export function restoreMainScroll(y: number): void {
  const apply = () => window.scrollTo(0, y);
  apply();
  requestAnimationFrame(() => {
    apply();
    requestAnimationFrame(apply);
  });
  setTimeout(apply, 100);
  setTimeout(apply, 300);
}
