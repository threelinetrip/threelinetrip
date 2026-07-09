"use client";

import { useMemo, useState } from "react";
import type { DailyStat } from "@/lib/supabase";

interface Series {
  key: keyof Omit<DailyStat, "date">;
  label: string;
  color: string;
}

const SERIES: Series[] = [
  { key: "detailViews", label: "게시글 조회", color: "#059669" },
  { key: "mainViews", label: "메인 방문", color: "#d97706" },
  { key: "shares", label: "공유", color: "#7c3aed" },
];

const W = 720;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 40, left: 40 };

function niceMax(v: number): number {
  if (v <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** 짧은 날짜 라벨 (MM-DD) */
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${m}-${d}`;
}

export default function TrendChart({ data }: { data: DailyStat[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<number | null>(null);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = useMemo(() => {
    let m = 0;
    for (const d of data) {
      for (const s of SERIES) {
        if (hidden.has(s.key)) continue;
        m = Math.max(m, d[s.key]);
      }
    }
    return niceMax(m);
  }, [data, hidden]);

  const n = data.length;
  const xAt = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const yAt = (v: number) => PAD.top + innerH - (maxVal === 0 ? 0 : (innerH * v) / maxVal);

  // x축 라벨 표시 간격 (너무 촘촘하지 않게 최대 ~8개)
  const labelStep = Math.max(1, Math.ceil(n / 8));

  // y축 눈금 (5칸)
  const yTicks = Array.from({ length: 6 }, (_, i) => (maxVal / 5) * i);

  if (n === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-slate-400">
        선택한 기간에 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div>
      {/* 범례 */}
      <div className="flex flex-wrap gap-3 mb-3">
        {SERIES.map((s) => {
          const off = hidden.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() =>
                setHidden((prev) => {
                  const next = new Set(prev);
                  if (next.has(s.key)) next.delete(s.key);
                  else next.add(s.key);
                  return next;
                })
              }
              className={`inline-flex items-center gap-1.5 text-xs font-medium transition-opacity ${
                off ? "opacity-40" : ""
              }`}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[560px]"
          onMouseLeave={() => setHover(null)}
        >
          {/* y축 그리드 + 라벨 */}
          {yTicks.map((t, i) => {
            const y = yAt(t);
            return (
              <g key={i}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400"
                  fontSize={10}
                >
                  {Math.round(t)}
                </text>
              </g>
            );
          })}

          {/* x축 라벨 */}
          {data.map((d, i) =>
            i % labelStep === 0 || i === n - 1 ? (
              <text
                key={d.date}
                x={xAt(i)}
                y={H - PAD.bottom + 16}
                textAnchor="middle"
                className="fill-slate-400"
                fontSize={10}
              >
                {shortDate(d.date)}
              </text>
            ) : null
          )}

          {/* 세로 호버 가이드 */}
          {hover !== null && (
            <line
              x1={xAt(hover)}
              x2={xAt(hover)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="#cbd5e1"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          {/* 데이터 라인 */}
          {SERIES.map((s) => {
            if (hidden.has(s.key)) return null;
            const pts = data.map((d, i) => `${xAt(i)},${yAt(d[s.key])}`).join(" ");
            return (
              <g key={s.key}>
                <polyline
                  points={pts}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {data.map((d, i) => (
                  <circle
                    key={i}
                    cx={xAt(i)}
                    cy={yAt(d[s.key])}
                    r={hover === i ? 3.5 : 2}
                    fill={s.color}
                  />
                ))}
              </g>
            );
          })}

          {/* 호버 감지용 투명 영역 */}
          {data.map((d, i) => (
            <rect
              key={i}
              x={xAt(i) - (n <= 1 ? innerW / 2 : innerW / (n - 1) / 2)}
              y={PAD.top}
              width={n <= 1 ? innerW : innerW / (n - 1)}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
      </div>

      {/* 호버 상세 */}
      {hover !== null && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          <span className="font-medium text-slate-800">{data[hover].date}</span>
          {SERIES.filter((s) => !hidden.has(s.key)).map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label} {data[hover][s.key].toLocaleString()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
