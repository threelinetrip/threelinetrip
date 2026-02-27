"use client";

import { useState, useEffect, useRef } from "react";
import { Star, ChevronDown } from "lucide-react";

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

  const label =
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
        <span className="truncate leading-none">{label}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          } ${active ? "text-amber-500" : "text-slate-400"}`}
        />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 w-40">
          {[5, 4, 3, 2, 1].map((r) => (
            <label
              key={r}
              className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm select-none"
            >
              <input
                type="checkbox"
                checked={selected.includes(r)}
                onChange={() => toggle(r)}
                className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
              />
              <span className="flex items-center gap-1 text-slate-700">
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
                <span className="ml-0.5 text-slate-600">{r}점</span>
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
                className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
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
