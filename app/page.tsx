"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  MapPin,
  Star,
} from "lucide-react";
import {
  REGIONS,
  getSigunguBySido,
} from "@/constants/regions";
import { fetchAllDestinations, insertViewLog } from "@/lib/supabase";
import type { Destination } from "@/lib/db/schema";

type SortType = "name" | "ratingHigh" | "ratingLow";

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i <= fullStars ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"
          }`}
        />
      ))}
      <span className="ml-1.5 text-sm font-medium text-slate-600">
        {rating}
      </span>
    </div>
  );
}

function DestinationCard({ item }: { item: Destination }) {
  const thumb = item.imageUrls?.[0];

  return (
    <Link href={`/destination/${item.id}`} className="block group">
      <article className="h-full bg-white rounded-xl overflow-hidden border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
        <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
          {thumb ? (
            <Image
              src={thumb}
              alt={item.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
              이미지 없음
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h2 className="font-semibold text-base text-slate-800 line-clamp-1">
              {item.title}
            </h2>
            <StarRating rating={item.rating} />
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 text-sm">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="line-clamp-1">{item.sido} {item.sigungu}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function Home() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortType>("ratingHigh");
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");

  const sigunguList = getSigunguBySido(sido);

  useEffect(() => {
    fetchAllDestinations()
      .then(setDestinations)
      .catch(() => setDestinations([]));

    // 메인 페이지 조회 로그 (destination_id = null)
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

    // 지역1 (시/도) 필터
    if (sido) {
      result = result.filter((d) => d.sido === sido);
    }

    // 지역2 (시/군/구) 필터
    if (sigungu) {
      result = result.filter((d) => d.sigungu === sigungu);
    }

    // 정렬
    if (sort === "name") {
      result.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
    } else if (sort === "ratingHigh") {
      result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sort === "ratingLow") {
      result.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
    }

    return result;
  }, [destinations, search, sort, sido, sigungu]);

  const handleSidoChange = (value: string) => {
    setSido(value);
    setSigungu("");
  };

  return (
    <main className="min-h-screen bg-white">
      {/* 검색 & 필터 바 (전역 Header 아래에 고정) */}
      <div className="sticky top-14 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-row items-center gap-3 flex-wrap">
            {/* 검색 */}
            <div className="relative flex-1 min-w-[160px] max-w-[260px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                placeholder="검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-100 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 placeholder:text-slate-400"
              />
            </div>

            {/* 정렬 */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortType)}
              className="px-3 py-2 text-sm border border-slate-100 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-200 text-slate-700 cursor-pointer shrink-0 w-[130px]"
            >
              <option value="name">가나다 순</option>
              <option value="ratingHigh">점수 높은 순</option>
              <option value="ratingLow">점수 낮은 순</option>
            </select>

            {/* 시/도 */}
            <select
              value={sido}
              onChange={(e) => handleSidoChange(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-100 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-200 text-slate-700 cursor-pointer shrink-0 w-[140px]"
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
              className="px-3 py-2 text-sm border border-slate-100 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-200 text-slate-700 cursor-pointer shrink-0 w-[130px] disabled:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <option value="">전체 시/군/구</option>
              {sigunguList.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 카드 그리드 */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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
