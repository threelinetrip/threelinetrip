/**
 * 점수별 가이드 문구 및 색상 체계
 *
 * 5점: 안 가면 후회  (선명한 주황)
 * 4점: 추천          (차분한 주황)
 * 3점: 한 번은       (짙은 회색 — 기본)
 * 2점: 시간이 남으면 (중간 회색)
 * 1점: 굳이          (연한 회색 — AA 대비 유지)
 */

export const RATING_LABELS: Record<number, string> = {
  5: "안 가면 후회",
  4: "추천",
  3: "한 번은",
  2: "시간이 남으면",
  1: "굳이",
};

/** 점수 → 텍스트 색상 Tailwind 클래스 (필터 목록·팝오버 등 일반 텍스트용) */
export const RATING_TEXT_COLORS: Record<number, string> = {
  5: "text-amber-500 font-bold",
  4: "text-orange-400 font-medium",
  3: "text-slate-600",
  2: "text-slate-500",
  1: "text-slate-400",   // WCAG AA 최소 대비(4.5:1) 충족
};

/** 점수 → 배지 전체 클래스 (상세 페이지 배지용: bg + border + text + font) */
export const RATING_BADGE_CLASSES: Record<number, string> = {
  5: "bg-amber-50  border-amber-300  text-amber-600  font-bold",
  4: "bg-orange-50 border-orange-200 text-orange-500 font-semibold",
  3: "bg-slate-50  border-slate-200  text-slate-600",
  2: "bg-slate-50  border-slate-200  text-slate-500",
  1: "bg-slate-50  border-slate-100  text-slate-400",
};

/** 정수 점수 → 가이드 문구 */
export function getRatingLabel(rating: number): string {
  return RATING_LABELS[Math.round(rating)] ?? "";
}

/** 정수 점수 → 텍스트 색상 클래스 */
export function getRatingTextColor(rating: number): string {
  return RATING_TEXT_COLORS[Math.round(rating)] ?? "text-slate-600";
}

/** 정수 점수 → 배지 클래스 */
export function getRatingBadgeClass(rating: number): string {
  return RATING_BADGE_CLASSES[Math.round(rating)] ?? "bg-slate-50 border-slate-200 text-slate-600";
}
