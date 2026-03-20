"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search, MapPin, Star, ArrowDownAZ, RotateCcw, ChevronDown, Check,
} from "lucide-react";
import { REGIONS, getSigunguBySido } from "@/constants/regions";
import { fetchAllDestinations, insertViewLog } from "@/lib/supabase";
import { getRatingLabel } from "@/constants/rating";
import TagChip, { getTagColor } from "@/components/TagChip";
import type { Destination } from "@/lib/db/schema";

// ─────────────────────────────────────────────
// 별점 표시
// ─────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  return (
    <div className="flex items-center gap-px shrink-0">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
            i <= full ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"
          }`}
        />
      ))}
      <span className="ml-1 text-xs font-medium text-slate-600">{rating}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// 여행지 카드
// ─────────────────────────────────────────────
function DestinationCard({ item }: { item: Destination }) {
  const thumb = item.imageUrls?.[0];
  return (
    <Link href={`/destination/${item.id}`} className="block group">
      <article className="flex flex-col h-full bg-white rounded-xl overflow-hidden border border-slate-100
                          hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5
                          transition-all duration-200 ease-out">
        <div className="relative aspect-[4/3] shrink-0 bg-slate-100">
          {thumb ? (
            <Image
              src={thumb} alt={item.title} fill
              className="object-contain"
              sizes="(max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
              이미지 없음
            </div>
          )}
        </div>
        <div className="flex flex-col justify-between flex-1 p-2.5 sm:p-3">
          <h2 className="font-semibold text-xs sm:text-sm text-slate-800 line-clamp-2 mb-1 leading-snug">
            {item.title}
          </h2>
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 text-slate-500 text-xs min-w-0">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{item.sido} {item.sigungu}</span>
            </div>
            <StarRating rating={item.rating} />
          </div>
        </div>
      </article>
    </Link>
  );
}

// ─────────────────────────────────────────────
// 노션 스타일 태그 드롭다운
// ─────────────────────────────────────────────
function TagFilterDropdown({
  value,
  onChange,
  tags,
  fullWidth = false,
}: {
  value: string;
  onChange: (tag: string) => void;
  tags: string[];
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 바깥 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  return (
    <div ref={ref} className={`relative ${fullWidth ? "w-full" : "shrink-0"}`}>
      {/* 트리거 버튼 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`h-9 flex items-center gap-1.5 px-2.5 text-sm border rounded-lg bg-gray-50
                    focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors
                    ${fullWidth ? "w-full" : "min-w-[90px]"}
                    ${open
                      ? "border-slate-300 bg-white"
                      : "border-slate-100 hover:border-slate-300 text-slate-700"
                    }`}
      >
        <span className="flex-1 text-left truncate">
          {value
            ? <TagChip tag={value} size="sm" />
            : <span className="text-slate-500">전체 태그</span>
          }
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* 드롭다운 패널 */}
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 min-w-full w-max max-w-[240px]
                        bg-white border border-slate-200 rounded-xl shadow-xl py-1.5
                        max-h-60 overflow-y-auto">
          {/* 전체 태그 (해제) */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onChange(""); close(); }}
            className="w-full flex items-center justify-between px-3 py-1.5 text-sm
                       text-slate-500 hover:bg-slate-50 rounded-lg mx-auto"
          >
            <span>전체 태그</span>
            {!value && <Check className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {/* 구분선 */}
          {tags.length > 0 && <hr className="my-1 border-slate-100" />}

          {/* 태그 목록 — 노션 스타일 칩 */}
          {tags.map((tag) => {
            const { bg, fg } = getTagColor(tag);
            const isSelected = tag === value;
            return (
              <button
                key={tag}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(tag); close(); }}
                className="w-full flex items-center justify-between gap-2 px-3 py-1.5
                           hover:bg-slate-50 rounded-lg transition-colors"
              >
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium"
                  style={{ backgroundColor: bg, color: fg }}
                >
                  {tag}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-slate-400" />}
              </button>
            );
          })}

          {tags.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400">등록된 태그가 없습니다</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 공용 스타일
// ─────────────────────────────────────────────
const selectCls =
  "h-9 px-2.5 text-sm border border-slate-100 rounded-lg bg-gray-50 " +
  "focus:outline-none focus:ring-2 focus:ring-slate-200 " +
  "text-slate-700 cursor-pointer " +
  "disabled:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400";

// ─────────────────────────────────────────────
// 메인 페이지
// ─────────────────────────────────────────────
export default function Home() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [search,       setSearch]       = useState("");
  const [sortByName,   setSortByName]   = useState(false);
  const [ratingFilter, setRatingFilter] = useState<number | "">("");
  const [sido,         setSido]         = useState("");
  const [sigungu,      setSigungu]      = useState("");
  const [tagFilter,    setTagFilter]    = useState("");

  const sigunguList = getSigunguBySido(sido);

  // 데이터 로드 + URL ?tag= 초기화
  useEffect(() => {
    fetchAllDestinations()
      .then(setDestinations)
      .catch(() => setDestinations([]));
    insertViewLog(null);
    const urlTag = new URLSearchParams(window.location.search).get("tag") ?? "";
    if (urlTag) setTagFilter(urlTag);
  }, []);

  // 전체 고유 태그 (데이터에서 즉시 추출)
  const allTags = useMemo(() => {
    const s = new Set<string>();
    destinations.forEach((d) => (d.tags ?? []).forEach((t) => t && s.add(t)));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [destinations]);

  // 복합 필터 + 정렬
  const filteredAndSorted = useMemo(() => {
    let result = [...destinations];

    // 검색: 제목 · 지역 · 요약 · 태그
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.summary.toLowerCase().includes(q) ||
          `${d.sido} ${d.sigungu}`.toLowerCase().includes(q) ||
          (d.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    }

    if (sido)    result = result.filter((d) => d.sido === sido);
    if (sigungu) result = result.filter((d) => d.sigungu === sigungu);

    if (ratingFilter !== "") {
      result = result.filter((d) => d.rating === ratingFilter);
    }

    if (tagFilter) {
      result = result.filter((d) => (d.tags ?? []).includes(tagFilter));
    }

    if (sortByName) {
      result.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
    }

    return result;
  }, [destinations, search, sortByName, ratingFilter, sido, sigungu, tagFilter]);

  const handleSidoChange = (value: string) => { setSido(value); setSigungu(""); };

  const resetAll = () => {
    setSearch(""); setSortByName(false); setRatingFilter("");
    setSido(""); setSigungu(""); setTagFilter("");
    window.history.replaceState({}, "", "/");
  };

  const hasFilter =
    !!search || sortByName || ratingFilter !== "" || !!sido || !!sigungu || !!tagFilter;

  // ── 공용 서브 컴포넌트 (JSX 조각) ─────────────
  const SearchBox = ({ extraCls = "" }: { extraCls?: string }) => (
    <div className={`relative flex-1 min-w-0 ${extraCls}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="search"
        placeholder="제목, 지역, 태그 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-9 w-full pl-9 pr-3 text-sm border border-slate-100 rounded-lg bg-white
                   focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300
                   placeholder:text-slate-400"
      />
    </div>
  );

  const SortBtn = () => (
    <button
      type="button"
      onClick={() => setSortByName((v) => !v)}
      title={sortByName ? "가나다순 해제" : "가나다순 정렬"}
      className={`h-9 w-9 flex items-center justify-center rounded-lg border shrink-0 transition-colors ${
        sortByName
          ? "bg-slate-800 border-slate-800 text-white"
          : "bg-gray-50 border-slate-100 text-slate-500 hover:border-slate-300"
      }`}
    >
      <ArrowDownAZ className="w-4 h-4" />
    </button>
  );

  const ResetBtn = () => (
    <button
      type="button"
      onClick={resetAll}
      title="필터 초기화"
      className={`h-9 w-9 flex items-center justify-center rounded-lg border shrink-0 transition-colors ${
        hasFilter
          ? "bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100"
          : "bg-gray-50 border-slate-100 text-slate-300 cursor-default"
      }`}
    >
      <RotateCcw className="w-3.5 h-3.5" />
    </button>
  );

  const SidoSelect = ({ fullW = false }: { fullW?: boolean }) => (
    <select
      value={sido}
      onChange={(e) => handleSidoChange(e.target.value)}
      className={`${selectCls} ${fullW ? "w-full" : "shrink-0"}`}
    >
      <option value="">전체 시/도</option>
      {REGIONS.map((r) => <option key={r.sido} value={r.sido}>{r.sido}</option>)}
    </select>
  );

  const SigunguSelect = ({ fullW = false }: { fullW?: boolean }) => (
    <select
      value={sigungu}
      onChange={(e) => setSigungu(e.target.value)}
      disabled={!sido}
      className={`${selectCls} ${fullW ? "w-full" : "shrink-0"}`}
    >
      <option value="">전체 시/군/구</option>
      {sigunguList.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );

  const RatingSelect = ({ fullW = false }: { fullW?: boolean }) => (
    <select
      value={ratingFilter}
      onChange={(e) =>
        setRatingFilter(e.target.value === "" ? "" : Number(e.target.value))
      }
      className={`${selectCls} ${fullW ? "w-full" : "shrink-0"}`}
    >
      <option value="">전체 점수</option>
      {[5, 4, 3, 2, 1].map((n) => (
        <option key={n} value={n}>{n}점 · {getRatingLabel(n)}</option>
      ))}
    </select>
  );

  // ─────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-white">

      {/* ── 필터 바 ── */}
      <div className="sticky top-14 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2">

          {/* ────────────────────────────────────────
              모바일 전용 레이아웃 (sm 미만)
              3행 구조:
               1행: 검색 | 가나다순 | 초기화
               2행: 시/도 | 시/군/구
               3행: 점수  | 태그
          ──────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5 sm:hidden">
            {/* 1행 */}
            <div className="flex items-center gap-1.5">
              <SearchBox />
              <SortBtn />
              <ResetBtn />
            </div>
            {/* 2행 */}
            <div className="grid grid-cols-2 gap-1.5">
              <SidoSelect fullW />
              <SigunguSelect fullW />
            </div>
            {/* 3행 */}
            <div className="grid grid-cols-2 gap-1.5">
              <RatingSelect fullW />
              <TagFilterDropdown
                value={tagFilter}
                onChange={setTagFilter}
                tags={allTags}
                fullWidth
              />
            </div>
          </div>

          {/* ────────────────────────────────────────
              PC 전용 레이아웃 (sm 이상) — 단일 행
              [좌] 검색 · ↕ · ⟳   [우] 시/도 · 시/군/구 · 점수 · 태그
          ──────────────────────────────────────── */}
          <div className="hidden sm:flex sm:items-center sm:gap-3">

            {/* ── 좌측 그룹: 검색 + 도구 버튼 ── */}
            <div className="flex items-center gap-1.5 shrink-0">
              <SearchBox extraCls="w-[260px] max-w-[300px]" />
              <SortBtn />
              <ResetBtn />
            </div>

            {/* 구분선 */}
            <div className="h-5 w-px bg-slate-200 shrink-0" />

            {/* ── 우측 그룹: 상세 필터 ── */}
            <div className="flex items-center gap-2 flex-wrap">
              <SidoSelect />
              <SigunguSelect />
              <RatingSelect />
              <TagFilterDropdown
                value={tagFilter}
                onChange={setTagFilter}
                tags={allTags}
              />
            </div>
          </div>

        </div>
      </div>

      {/* 카드 그리드 */}
      <section className="max-w-6xl mx-auto px-3 sm:px-6 py-4">
        {filteredAndSorted.length === 0 ? (
          <p className="text-center text-slate-500 py-12">
            조건에 맞는 여행지가 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {filteredAndSorted.map((item) => (
              <DestinationCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
