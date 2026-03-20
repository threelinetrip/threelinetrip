"use client";

import { X } from "lucide-react";

// 파스텔 팔레트 — 태그 텍스트 해시로 결정론적 색상 배정
const PALETTE = [
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

export function getTagColor(tag: string): { bg: string; fg: string } {
  let h = 0;
  for (const ch of tag) h = ((h * 31) + ch.charCodeAt(0)) & 0xffff;
  return PALETTE[h % PALETTE.length];
}

type Props = {
  tag: string;
  /** 관리자 입력: X 버튼으로 개별 삭제 */
  onRemove?: () => void;
  /** 메인/상세 페이지: 클릭으로 태그 필터 */
  onClick?: () => void;
  size?: "sm" | "md";
};

export default function TagChip({ tag, onRemove, onClick, size = "md" }: Props) {
  const { bg, fg } = getTagColor(tag);
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
      {tag}
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
