/**
 * 점수별 가이드 문구
 * 색상·굵기는 모두 동일(text-slate-700) — 강조 효과 없음
 */

export const RATING_LABELS: Record<number, string> = {
  5: "강력 추천",
  4: "추천",
  3: "한 번쯤은",
  2: "시간이 남으면",
  1: "굳이",
};

/** 점수 → 가이드 문구 */
export function getRatingLabel(rating: number): string {
  return RATING_LABELS[Math.round(rating)] ?? "";
}

/**
 * 점수 → 텍스트 색상 클래스 (전체 동일)
 * 이전의 명도 그라데이션·유채색 모두 제거
 */
export function getRatingTextColor(_rating: number): string {
  return "text-slate-700";
}

/** 점수 → 배지 클래스 (전체 동일) */
export function getRatingBadgeClass(_rating: number): string {
  return "bg-slate-50 border-slate-200 text-slate-700";
}
