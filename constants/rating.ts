/**
 * 점수별 단축 가이드 문구
 * 5점: 강력 추천 · 4점: 추천 · 3점: 한 번쯤은 · 2점: 시간이 남으면 · 1점: 굳이
 */
export const RATING_LABELS: Record<number, string> = {
  5: "강력 추천",
  4: "추천",
  3: "한 번쯤은",
  2: "시간이 남으면",
  1: "굳이",
};

/** 정수 점수 → 가이드 문구 반환 (범위 밖이면 빈 문자열) */
export function getRatingLabel(rating: number): string {
  return RATING_LABELS[Math.round(rating)] ?? "";
}
