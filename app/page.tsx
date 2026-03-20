"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search, MapPin, Star, ArrowDownAZ, RotateCcw, Tag,
} from "lucide-react";
import { REGIONS, getSigunguBySido } from "@/constants/regions";
import { fetchAllDestinations, insertViewLog } from "@/lib/supabase";
import { getRatingLabel } from "@/constants/rating";
import TagChip from "@/components/TagChip";
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
      <article className="flex flex-col h-full bg-white rounded-xl overflow-hidden border border-slate-100 hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out">
        <div className="relative aspect-[4/3] shrink-0 bg-slate-100">
          {thumb ? (
            <Image
              src={thumb}
              alt={item.title}
              fill
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
// 공용 select 스타일
// ─────────────────────────────────────────────
const selectCls =
  "h-9 shrink-0 px-2.5 text-sm border border-slate-100 rounded-lg bg-gray-50 " +
  "focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-700 cursor-pointer " +
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

  // 전체 고유 태그 (destinations 에서 즉시 추출)
  const allTags = useMemo(() => {
    const s = new Set<string>();
    destinations.forEach((d) => (d.tags ?? []).forEach((t) => t && s.add(t)));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [destinations]);

  // 복합 필터 + 정렬
  const filteredAndSorted = useMemo(() => {
    let result = [...destinations];

    // 검색 (제목 · 지역 · 요약 · 태그)
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

    // 지역 필터
    if (sido)    result = result.filter((d) => d.sido === sido);
    if (sigungu) result = result.filter((d) => d.sigungu === sigungu);

    // 별점 필터 (단일 선택)
    if (ratingFilter !== "") {
      result = result.filter((d) => d.rating === ratingFilter);
    }

    // 태그 필터
    if (tagFilter) {
      result = result.filter((d) => (d.tags ?? []).includes(tagFilter));
    }

    // 가나다순
    if (sortByName) {
      result.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
    }

    return result;
  }, [destinations, search, sortByName, ratingFilter, sido, sigungu, tagFilter]);

  // 시도 변경 시 시군구 초기화
  const handleSidoChange = (value: string) => {
    setSido(value);
    setSigungu("");
  };

  // 전체 초기화
  const resetAll = () => {
    setSearch("");
    setSortByName(false);
    setRatingFilter("");
    setSido("");
    setSigungu("");
    setTagFilter("");
    window.history.replaceState({}, "", "/");
  };

  // 활성 필터가 하나라도 있는지 (초기화 버튼 강조용)
  const hasFilter =
    !!search || sortByName || ratingFilter !== "" || !!sido || !!sigungu || !!tagFilter;

  return (
    <main className="min-h-screen bg-white">

      {/* ── 검색 & 필터 바 ── */}
      <div className="sticky top-14 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 space-y-2">

          {/* ── 1행: 검색창 | 가나다순(아이콘) | 초기화 ── */}
          <div className="flex items-center gap-2">

            {/* 검색창 */}
            <div className="relative flex-1">
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

            {/* 가나다순 토글 — 아이콘만 */}
            <button
              type="button"
              onClick={() => setSortByName((v) => !v)}
              title={sortByName ? "가나다순 정렬 해제" : "가나다순 정렬"}
              className={`h-9 w-9 flex items-center justify-center rounded-lg border shrink-0 transition-colors ${
                sortByName
                  ? "bg-slate-800 border-slate-800 text-white"
                  : "bg-gray-50 border-slate-100 text-slate-500 hover:border-slate-300"
              }`}
            >
              <ArrowDownAZ className="w-4 h-4" />
            </button>

            {/* 초기화 버튼 */}
            <button
              type="button"
              onClick={resetAll}
              title="필터 초기화"
              className={`h-9 flex items-center gap-1.5 px-2.5 rounded-lg border shrink-0 text-sm
                          transition-colors ${
                hasFilter
                  ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                  : "bg-gray-50 border-slate-100 text-slate-400 cursor-default"
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline text-xs font-medium">초기화</span>
            </button>
          </div>

          {/*
            ── 2행: 지역·별점·태그 필터 ──
            모바일: overflow-x-auto 로 좌우 스크롤
            PC(sm+): flex-wrap 으로 자연스럽게 줄바꿈
          */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

            {/* 시/도 */}
            <select
              value={sido}
              onChange={(e) => handleSidoChange(e.target.value)}
              className={selectCls}
            >
              <option value="">전체 시/도</option>
              {REGIONS.map((r) => (
                <option key={r.sido} value={r.sido}>{r.sido}</option>
              ))}
            </select>

            {/* 시/군/구 */}
            <select
              value={sigungu}
              onChange={(e) => setSigungu(e.target.value)}
              disabled={!sido}
              className={selectCls}
            >
              <option value="">전체 시/군/구</option>
              {sigunguList.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* 별점 */}
            <select
              value={ratingFilter}
              onChange={(e) =>
                setRatingFilter(e.target.value === "" ? "" : Number(e.target.value))
              }
              className={selectCls}
            >
              <option value="">전체 점수</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n}점 · {getRatingLabel(n)}
                </option>
              ))}
            </select>

            {/* 태그 필터 */}
            <select
              value={tagFilter}
              onChange={(e) => {
                setTagFilter(e.target.value);
                // URL 정리
                if (!e.target.value) window.history.replaceState({}, "", "/");
              }}
              className={`${selectCls} flex items-center gap-1`}
            >
              <option value="">전체 태그</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* 활성 태그 칩 표시 (태그 선택 시 색상 칩으로 강조) */}
      {tagFilter && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 flex items-center gap-2 text-sm text-slate-500">
          <Tag className="w-3.5 h-3.5 shrink-0" />
          <TagChip
            tag={tagFilter}
            onRemove={() => {
              setTagFilter("");
              window.history.replaceState({}, "", "/");
            }}
          />
        </div>
      )}

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
