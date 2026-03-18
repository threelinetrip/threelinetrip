/**
 * 점수별 가이드 문구 및 흑백 명도 체계
 *
 * 유채색(amber/orange 등) 없이 검정 → 회색 농도만으로 위계 표현
 * 1점 #CCCCCC 는 사용자 요청 색상이며, opacity 효과 없이 텍스트 자체 색상으로 적용
 *
 * 5점: 강력 추천   — #000000 + bold  (21:1)
 * 4점: 추천        — #2D2D2D         (15.3:1)
 * 3점: 한 번쯤은  — #666666         (5.74:1)
 * 2점: 시간이 남으면 — #999999      (2.85:1)
 * 1점: 굳이        — #CCCCCC         (1.6:1  ※ 사용자 지정)
 */

export const RATING_LABELS: Record<number, string> = {
  5: "강력 추천",
  4: "추천",
  3: "한 번쯤은",
  2: "시간이 남으면",
  1: "굳이",
};

/**
 * 점수 → 텍스트 색상 클래스
 * opacity 없이 실제 텍스트 색상으로만 적용 (흐릿한 필터 효과 금지)
 */
export const RATING_TEXT_COLORS: Record<number, string> = {
  5: "text-black font-bold",
  4: "text-[#2D2D2D]",
  3: "text-[#666666]",
  2: "text-[#999999]",
  1: "text-[#CCCCCC]",
};

/**
 * 점수 → 배지 클래스 (상세 페이지·관리자 배지)
 * 배경은 중립 색상, 텍스트만 명도 차이
 */
export const RATING_BADGE_CLASSES: Record<number, string> = {
  5: "bg-slate-50 border-slate-200 text-black   font-bold",
  4: "bg-slate-50 border-slate-200 text-[#2D2D2D]",
  3: "bg-slate-50 border-slate-200 text-[#666666]",
  2: "bg-slate-50 border-slate-200 text-[#999999]",
  1: "bg-slate-50 border-slate-200 text-[#CCCCCC]",
};

/** 정수 점수 → 가이드 문구 */
export function getRatingLabel(rating: number): string {
  return RATING_LABELS[Math.round(rating)] ?? "";
}

/** 정수 점수 → 텍스트 색상 클래스 */
export function getRatingTextColor(rating: number): string {
  return RATING_TEXT_COLORS[Math.round(rating)] ?? "text-[#666666]";
}

/** 정수 점수 → 배지 클래스 */
export function getRatingBadgeClass(rating: number): string {
  return RATING_BADGE_CLASSES[Math.round(rating)] ?? "bg-slate-50 border-slate-200 text-[#666666]";
}
