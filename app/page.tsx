"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, MapPin, Star, ArrowDownAZ } from "lucide-react";
import { REGIONS, getSigunguBySido } from "@/constants/regions";
import { fetchAllDestinations, insertViewLog } from "@/lib/supabase";
import RatingFilter from "@/components/RatingFilter";
import type { Destination } from "@/lib/db/schema";

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  return (
    <div className="flex items-center gap-px shrink-0">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
            i <= fullStars ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"
          }`}
        />
      ))}
      <span className="ml-1 text-xs font-medium text-slate-600">{rating}</span>
    </div>
  );
}

function DestinationCard({ item }: { item: Destination }) {
  const thumb = item.imageUrls?.[0];
  return (
    <Link href={`/destination/${item.id}`} className="block group">
      {/* flex flex-col + h-full → 모든 카드가 행 높이에 맞춰 동일하게 늘어남 */}
      <article className="flex flex-col h-full bg-white rounded-xl overflow-hidden border border-slate-100 hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out">
        {/* 이미지: 4:3 고정 비율, 전체 보기 */}
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
        {/* 텍스트 영역: flex-1로 남은 공간을 채워 높이 통일 */}
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

export default function Home() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [search, setSearch] = useState("");
  const [sortByName, setSortByName] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<number[]>([]);
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");

  const sigunguList = getSigunguBySido(sido);

  useEffect(() => {
    fetchAllDestinations()
      .then(setDestinations)
      .catch(() => setDestinations([]));
    insertViewLog(null);
  }, []);

  const filteredAndSorted = useMemo(() => {
    let result = [...destinations];

    // 검색 필터
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.summary.toLowerCase().includes(q) ||
          `${d.sido} ${d.sigungu}`.toLowerCase().includes(q)
      );
    }

    // 지역 필터
    if (sido) result = result.filter((d) => d.sido === sido);
    if (sigungu) result = result.filter((d) => d.sigungu === sigungu);

    // 별점 복수 필터
    if (ratingFilter.length > 0) {
      result = result.filter((d) => ratingFilter.includes(d.rating));
    }

    // 가나다순 정렬
    if (sortByName) {
      result.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
    }

    return result;
  }, [destinations, search, sortByName, ratingFilter, sido, sigungu]);

  const handleSidoChange = (value: string) => {
    setSido(value);
    setSigungu("");
  };

  return (
    <main className="min-h-screen bg-white">
      {/* 검색 & 필터 바 */}
      <div className="sticky top-14 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
          {/*
            모바일: flex-col → 3행 수직 구조
            PC(sm+): flex-row → 기존 가로 배치 유지
            sm:contents 를 쓴 그룹 div는 sm 이상에서 투명해져
            자식들이 바로 flex-row 에 합류함
          */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">

            {/* ── 1행(모바일) / PC 첫 요소: 검색창 ── */}
            <div className="relative w-full sm:flex-1 sm:min-w-[140px] sm:max-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                placeholder="검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full pl-10 pr-4 text-sm border border-slate-100 rounded-lg bg-white
                           focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300
                           placeholder:text-slate-400"
              />
            </div>

            {/* ── 2행(모바일) 5:5: 가나다순 + 별점 필터 ── */}
            <div className="grid grid-cols-2 gap-2 sm:contents">
              {/* 가나다순 토글 */}
              <button
                type="button"
                onClick={() => setSortByName((v) => !v)}
                className={`h-10 flex items-center justify-center gap-1.5 px-3 text-sm border rounded-lg
                            transition-colors overflow-hidden sm:shrink-0 sm:w-auto ${
                  sortByName
                    ? "bg-slate-800 border-slate-800 text-white"
                    : "bg-gray-50 border-slate-100 text-slate-700 hover:border-slate-300"
                }`}
              >
                <ArrowDownAZ className="w-4 h-4 shrink-0" />
                <span className="truncate">가나다순</span>
              </button>

              {/* 별점 복수 필터 */}
              <RatingFilter
                selected={ratingFilter}
                onChange={setRatingFilter}
                className="sm:w-[148px] sm:shrink-0"
              />
            </div>

            {/* ── 3행(모바일) 5:5: 시/도 + 시/군/구 ── */}
            <div className="grid grid-cols-2 gap-2 sm:contents">
              {/* 시/도 */}
              <select
                value={sido}
                onChange={(e) => handleSidoChange(e.target.value)}
                className="h-10 w-full sm:w-[140px] sm:shrink-0 px-3 text-sm border border-slate-100
                           rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-200
                           text-slate-700 cursor-pointer overflow-hidden"
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
                className="h-10 w-full sm:w-[130px] sm:shrink-0 px-3 text-sm border border-slate-100
                           rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-200
                           text-slate-700 cursor-pointer overflow-hidden
                           disabled:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                <option value="">전체 시/군/구</option>
                {sigunguList.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

          </div>
        </div>
      </div>

      {/* 카드 그리드 */}
      <section className="max-w-6xl mx-auto px-3 sm:px-6 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {filteredAndSorted.map((item) => (
            <DestinationCard key={item.id} item={item} />
          ))}
        </div>
        {filteredAndSorted.length === 0 && (
          <p className="text-center text-slate-500 py-12">
            조건에 맞는 여행지가 없습니다.
          </p>
        )}
      </section>
    </main>
  );
}
