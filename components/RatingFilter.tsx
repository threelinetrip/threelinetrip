"use client";

import { useState, useEffect, useRef } from "react";
import { Star, ChevronDown } from "lucide-react";
import { getRatingLabel, getRatingTextColor } from "@/constants/rating";

interface Props {
  selected: number[];
  onChange: (v: number[]) => void;
  className?: string;
}

export default function RatingFilter({ selected, onChange, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (r: number) => {
    onChange(
      selected.includes(r)
        ? selected.filter((v) => v !== r)
        : [...selected, r].sort((a, b) => a - b)
    );
  };

  const buttonLabel =
    selected.length === 0
      ? "전체 점수"
      : selected.map((r) => `${r}점`).join(", ");

  const active = selected.length > 0;

  return (
    <div ref={ref} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`h-10 flex items-center gap-2 px-3 text-sm border rounded-lg cursor-pointer w-full justify-between transition-colors focus:outline-none ${
          active
            ? "bg-amber-50 border-amber-300 text-amber-700"
            : "bg-gray-50 border-slate-100 text-slate-700 hover:border-slate-200"
        }`}
      >
        <span className="truncate leading-none">{buttonLabel}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          } ${active ? "text-amber-500" : "text-slate-400"}`}
        />
      </button>

      {open && (
        /*
         * min-w-[240px]: "시간이 남으면" 등 긴 문구가 잘리지 않도록
         * max-w-[90vw]: 모바일에서 화면 밖으로 나가지 않도록
         */
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-200
                        rounded-xl shadow-lg py-1.5 min-w-[240px] max-w-[90vw]">
          {[5, 4, 3, 2, 1].map((r) => (
            <label
              key={r}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 select-none"
            >
              {/* 체크박스 */}
              <input
                type="checkbox"
                checked={selected.includes(r)}
                onChange={() => toggle(r)}
                className="w-4 h-4 rounded accent-amber-400 cursor-pointer shrink-0"
              />

              {/* 별 (소형) */}
              <span className="flex items-center gap-0.5 shrink-0">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i <= r
                        ? "fill-amber-400 text-amber-400"
                        : "fill-slate-200 text-slate-200"
                    }`}
                  />
                ))}
              </span>

              {/* 점수 (살짝 작은 크기) */}
              <span className="text-xs text-slate-500 shrink-0 tabular-nums">{r}점</span>

              {/* 가이드 문구 — 좌측 정렬, 채도 색상 */}
              <span className={`text-xs ${getRatingTextColor(r)}`}>
                {getRatingLabel(r)}
              </span>
            </label>
          ))}

          {active && (
            <>
              <div className="border-t border-slate-100 mt-1 pt-1" />
              <button
                type="button"
                onClick={() => {
                  onChange([]);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-400
                           hover:text-slate-600 transition-colors"
              >
                선택 초기화
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
