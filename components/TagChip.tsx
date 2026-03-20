"use client";

import { X } from "lucide-react";

// ─────────────────────────────────────────────
// 해시 기반 자동 팔레트 (색상 미지정 태그용)
// ─────────────────────────────────────────────
const HASH_PALETTE = [
  { bg: "#FEE2E2", fg: "#9F1239" },
  { bg: "#FFEDD5", fg: "#9A3412" },
  { bg: "#FEF9C3", fg: "#854D0E" },
  { bg: "#DCFCE7", fg: "#166534" },
  { bg: "#D1FAE5", fg: "#065F46" },
  { bg: "#CFFAFE", fg: "#155E75" },
  { bg: "#E0F2FE", fg: "#075985" },
  { bg: "#E0E7FF", fg: "#3730A3" },
  { bg: "#EDE9FE", fg: "#4C1D95" },
  { bg: "#FCE7F3", fg: "#831843" },
  { bg: "#FFF1F2", fg: "#BE123C" },
  { bg: "#FFFBEB", fg: "#78350F" },
];

/** 태그 텍스트 해시로 결정론적 색상 배정 (빈 값·undefined 안전) */
export function getTagColor(tag: string | undefined | null): { bg: string; fg: string } {
  if (!tag) return HASH_PALETTE[0];
  let h = 0;
  for (const ch of tag) h = ((h * 31) + ch.charCodeAt(0)) & 0xffff;
  return HASH_PALETTE[h % HASH_PALETTE.length];
}

// ─────────────────────────────────────────────
// 관리자 색상 피커용 노션 스타일 팔레트
// ─────────────────────────────────────────────
export const ADMIN_PALETTE: { label: string; bg: string; fg: string }[] = [
  { label: "회색",   bg: "#F1F1EF", fg: "#787774" },
  { label: "갈색",   bg: "#F4EEEE", fg: "#9F6B53" },
  { label: "주황",   bg: "#FBECDD", fg: "#D9730D" },
  { label: "노랑",   bg: "#FBF3DB", fg: "#CB912F" },
  { label: "초록",   bg: "#EEF3ED", fg: "#448361" },
  { label: "파랑",   bg: "#E7F3F8", fg: "#337EA9" },
  { label: "보라",   bg: "#F4EEFC", fg: "#9065B0" },
  { label: "분홍",   bg: "#FCE8F3", fg: "#C14C8A" },
  { label: "빨강",   bg: "#FFE2DD", fg: "#C4433C" },
];

/**
 * 색상 결정 함수 (undefined·null 완전 안전)
 * - colorBg 가 지정된 경우 ADMIN_PALETTE 에서 fg 를 조회해 반환
 * - colorBg 가 없으면 해시 기반 색상 반환
 */
export function getColors(
  tag: string | undefined | null,
  colorBg?: string | null
): { bg: string; fg: string } {
  if (colorBg) {
    const entry = ADMIN_PALETTE.find((p) => p.bg === colorBg);
    return entry ? { bg: entry.bg, fg: entry.fg } : { bg: colorBg, fg: "#444444" };
  }
  return getTagColor(tag);
}

// ─────────────────────────────────────────────
// TagChip 컴포넌트
// ─────────────────────────────────────────────
type Props = {
  tag: string;
  /** 관리자 지정 배경 색상 hex (없으면 해시 자동 배정) */
  color?: string;
  /** 관리자 입력: X 버튼으로 개별 삭제 */
  onRemove?: () => void;
  /** 메인/상세 페이지: 클릭으로 태그 필터 */
  onClick?: () => void;
  size?: "sm" | "md";
};

export default function TagChip({ tag, color, onRemove, onClick, size = "md" }: Props) {
  const safeName = tag || "";
  const { bg, fg } = getColors(safeName, color || undefined);
  const padding = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium select-none
                  ${padding}
                  ${onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : "cursor-default"}`}
      style={{ backgroundColor: bg, color: fg }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {safeName}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="hover:opacity-60 transition-opacity"
          aria-label={`${tag} 태그 삭제`}
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}
