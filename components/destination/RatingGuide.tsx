"use client";

import { useState, useEffect, useRef } from "react";
import { Star } from "lucide-react";
import { RATING_LABELS, getRatingLabel } from "@/constants/rating";

interface RatingGuideProps {
  rating: number;
}

/**
 * 평점 + 가이드 배지 + 팝오버
 * - 별·점수·배지 영역 자체가 호버/터치 트리거 (별도 "전체 기준" 버튼 없음)
 * - PC: onMouseEnter/Leave 로 팝오버 토글
 * - 모바일: 영역 탭 시 onClick 토글, 바깥 터치 시 닫힘
 */
export default function RatingGuide({ rating }: RatingGuideProps) {
  const ratingRef = useRef<HTMLDivElement>(null);
  const [showGuide, setShowGuide] = useState(false);

  // 팝오버 외부 클릭/터치 시 닫기
  useEffect(() => {
    const close = (e: MouseEvent | TouchEvent) => {
      if (ratingRef.current && !ratingRef.current.contains(e.target as Node)) {
        setShowGuide(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, []);

  const label = getRatingLabel(rating);

  return (
    <div
      ref={ratingRef}
      className="relative inline-block mb-3 cursor-pointer"
      onMouseEnter={() => setShowGuide(true)}
      onMouseLeave={() => setShowGuide(false)}
      onClick={() => setShowGuide((v) => !v)}
      role="button"
      tabIndex={0}
      aria-label="평점 기준 보기"
      onKeyDown={(e) => e.key === "Enter" && setShowGuide((v) => !v)}
    >
      {/* 별 · 점수 · 가이드 배지 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${
                i <= Math.floor(rating)
                  ? "fill-amber-400 text-amber-400"
                  : "fill-slate-200 text-slate-200"
              }`}
            />
          ))}
        </span>
        <span className="text-base font-medium text-slate-700">
          {rating}점
        </span>
        {label && (
          <span className="text-sm px-2.5 py-0.5 rounded-full border
                           bg-slate-50 border-slate-200 text-slate-700">
            {label}
          </span>
        )}
      </div>

      {/* 팝오버 — 전체 기준표 */}
      {showGuide && (
        <div
          className="absolute top-full left-0 mt-2 z-[60] bg-white rounded-2xl
                     shadow-xl border border-slate-100 p-4 w-max max-w-[90vw]"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-medium text-slate-400 mb-3 whitespace-nowrap">평점 기준</p>
          <div className="space-y-2">
            {([5, 4, 3, 2, 1] as const).map((r) => (
              <div key={r} className="flex items-center gap-2.5 whitespace-nowrap">
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
                <span className="text-[13px] text-slate-500 shrink-0 tabular-nums">
                  {r}점
                </span>
                <span className="text-[13px] text-slate-700">
                  {RATING_LABELS[r]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
