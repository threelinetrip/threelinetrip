"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Pencil, Trash2, MapPin, ArrowUp, ArrowDown, Eye, Share2,
  Users, Home, TrendingUp, Search,
} from "lucide-react";
import { REGIONS, matchesSidoFilter } from "@/constants/regions";
import {
  fetchAllDestinations,
  deleteDestinationById,
  fetchRangeAnalytics,
  type RangeAnalytics,
} from "@/lib/supabase";
import RatingFilter from "@/components/RatingFilter";
import TrendChart from "@/components/TrendChart";
import type { Destination } from "@/lib/db/schema";
import { hangulIncludes } from "@/lib/tag-utils";

type SortKey = "number" | "title" | "region" | "createdAt" | "views" | "shares";
type SortDir = "asc" | "desc";

function formatDate(iso: string | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Date → YYYY-MM-DD (로컬) */
function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateInput(d);
}

const RANGE_PRESETS = [
  { label: "전체", allTime: true as const },
  { label: "최근 7일", days: 6 },
  { label: "최근 14일", days: 13 },
  { label: "최근 30일", days: 29 },
  { label: "최근 90일", days: 89 },
];

export default function AdminDashboardPage() {
  const [items, setItems] = useState<Destination[]>([]);
  const [analytics, setAnalytics] = useState<RangeAnalytics | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const [search, setSearch] = useState("");
  const [sidoFilter, setSidoFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("number");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [fromDate, setFromDate] = useState(() => daysAgo(13));
  const [toDate, setToDate] = useState(() => toDateInput(new Date()));
  const [allTime, setAllTime] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const data = await fetchAllDestinations();
      setItems(data);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!toDate) return;
    if (!allTime && (!fromDate || fromDate > toDate)) return;
    setLoadingStats(true);
    fetchRangeAnalytics(allTime ? null : fromDate, toDate)
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setLoadingStats(false));
  }, [fromDate, toDate, allTime]);

  // 등록일 오름차순 기준 고유 번호 (필터와 무관하게 유지)
  const postNumberMap = useMemo(() => {
    const sorted = [...items].sort((a, b) =>
      (a.createdAt ?? "").localeCompare(b.createdAt ?? "")
    );
    const map = new Map<string, number>();
    sorted.forEach((item, i) => map.set(item.id, i + 1));
    return map;
  }, [items]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // 수치형은 큰 값 우선, 그 외는 오름차순 기본
      setSortDir(key === "views" || key === "shares" ? "desc" : "asc");
    }
  };

  const statFor = useCallback(
    (id: string) => analytics?.destStats[id] ?? { views: 0, shares: 0 },
    [analytics]
  );

  const filteredAndSorted = useMemo(() => {
    return items
      .filter((d) => hangulIncludes(d.title, search))
      .filter((d) => matchesSidoFilter(d.sido, sidoFilter))
      .filter((d) => ratingFilter.length === 0 || ratingFilter.includes(d.rating))
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "number") {
          cmp = (postNumberMap.get(a.id) ?? 0) - (postNumberMap.get(b.id) ?? 0);
        } else if (sortKey === "title") {
          cmp = (a.title ?? "").localeCompare(b.title ?? "");
        } else if (sortKey === "region") {
          cmp = `${a.sido} ${a.sigungu}`.localeCompare(`${b.sido} ${b.sigungu}`);
        } else if (sortKey === "createdAt") {
          cmp = (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
        } else if (sortKey === "views") {
          cmp = statFor(a.id).views - statFor(b.id).views;
        } else {
          cmp = statFor(a.id).shares - statFor(b.id).shares;
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [items, search, sidoFilter, ratingFilter, sortKey, sortDir, statFor, postNumberMap]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`정말 삭제하시겠습니까?\n\n"${title}"`)) return;
    try {
      await deleteDestinationById(id);
      await loadItems();
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const applyPreset = (days: number) => {
    setAllTime(false);
    setFromDate(daysAgo(days));
    setToDate(toDateInput(new Date()));
  };

  const applyAllTime = () => {
    setAllTime(true);
    setFromDate(toDateInput(new Date()));
    setToDate(toDateInput(new Date()));
  };

  const STAT_CARDS = [
    {
      label: "전체 조회",
      value: analytics?.totalViews ?? "-",
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      border: "border-blue-100",
    },
    {
      label: "게시글 조회",
      value: analytics?.detailViews ?? "-",
      icon: TrendingUp,
      color: "bg-emerald-50 text-emerald-600",
      border: "border-emerald-100",
    },
    {
      label: "공유 횟수",
      value: analytics?.totalShares ?? "-",
      icon: Share2,
      color: "bg-purple-50 text-purple-600",
      border: "border-purple-100",
    },
    {
      label: "메인 방문",
      value: analytics?.mainViews ?? "-",
      icon: Home,
      color: "bg-amber-50 text-amber-600",
      border: "border-amber-100",
    },
  ];

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (
      sortDir === "asc" ? (
        <ArrowUp className="w-3.5 h-3.5" />
      ) : (
        <ArrowDown className="w-3.5 h-3.5" />
      )
    ) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-800 mb-2">게시글 관리</h1>
      <p className="text-sm text-slate-500 mb-6">
        전체 {items.length.toLocaleString()}건
      </p>

      {/* ── 통계 기간 선택 ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">시작일</label>
            <input
              type="date"
              value={fromDate}
              max={toDate}
              disabled={allTime}
              onChange={(e) => { setAllTime(false); setFromDate(e.target.value); }}
              className={`px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 ${
                allTime ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "bg-white"
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">종료일</label>
            <input
              type="date"
              value={toDate}
              min={allTime ? undefined : fromDate}
              max={toDateInput(new Date())}
              onChange={(e) => { setAllTime(false); setToDate(e.target.value); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {RANGE_PRESETS.map((p) => {
              const isActive = "allTime" in p ? allTime : !allTime && fromDate === daysAgo(p.days);
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => ("allTime" in p ? applyAllTime() : applyPreset(p.days))}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    isActive
                      ? "bg-slate-800 border-slate-800 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          {loadingStats && (
            <span className="text-xs text-slate-400 pb-2">불러오는 중…</span>
          )}
        </div>
      </div>

      {/* ── 통계 카드 ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, border }) => (
          <div
            key={label}
            className={`rounded-xl border ${border} bg-white p-4 flex items-center gap-3`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">{label}</p>
              <p className="text-xl font-bold text-slate-800 leading-none">
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── 추이 그래프 ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          기간별 추이{" "}
          <span className="font-normal text-slate-400">
            ({allTime ? "전체 기간" : `${fromDate} ~ ${toDate}`})
          </span>
        </h2>
        <TrendChart data={analytics?.daily ?? []} />
      </div>

      {/* ── 필터 & 검색 ── */}
      <div className="flex flex-wrap gap-3 mb-6 items-end">
        {/* 검색 */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">제목 검색</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제목 검색"
              className="pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 w-56"
            />
          </div>
        </div>

        {/* 별점 복수 필터 */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">별점 필터</label>
          <RatingFilter selected={ratingFilter} onChange={setRatingFilter} />
        </div>

        {/* 지역 필터 */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">시/도</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={sidoFilter}
              onChange={(e) => setSidoFilter(e.target.value)}
              className="pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 w-52"
            >
              <option value="">전체 시/도</option>
              {REGIONS.map((r) => (
                <option key={r.sido} value={r.sido}>{r.sido}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-end pb-0.5">
          <p className="text-xs text-slate-400">
            표 헤더(No.·제목·지역·등록일·조회·공유) 클릭으로 정렬
          </p>
        </div>
      </div>

      {/* ── 테이블 ── */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        {filteredAndSorted.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            {items.length === 0 ? (
              <>
                등록된 게시글이 없습니다.
                <Link
                  href="/admin/write"
                  className="block mt-2 text-slate-700 font-medium hover:underline"
                >
                  새 글 등록하기 →
                </Link>
              </>
            ) : (
              "조건에 맞는 게시글이 없습니다."
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th
                    onClick={() => handleSort("number")}
                    className="text-center py-3 px-3 font-medium text-slate-700 w-14 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <span className="inline-flex items-center gap-1">No. {sortIcon("number")}</span>
                  </th>
                  <th
                    onClick={() => handleSort("title")}
                    className="text-left py-3 px-4 font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <span className="inline-flex items-center gap-1">제목 {sortIcon("title")}</span>
                  </th>
                  <th
                    onClick={() => handleSort("region")}
                    className="text-left py-3 px-4 font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <span className="inline-flex items-center gap-1">지역 {sortIcon("region")}</span>
                  </th>
                  <th
                    onClick={() => handleSort("createdAt")}
                    className="text-left py-3 px-4 font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <span className="inline-flex items-center gap-1">등록일 {sortIcon("createdAt")}</span>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">평점</th>
                  <th
                    onClick={() => handleSort("views")}
                    className="text-left py-3 px-4 font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors select-none w-24"
                  >
                    <span className="inline-flex items-center gap-1">조회수 {sortIcon("views")}</span>
                  </th>
                  <th
                    onClick={() => handleSort("shares")}
                    className="text-left py-3 px-4 font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors select-none w-24"
                  >
                    <span className="inline-flex items-center gap-1">공유수 {sortIcon("shares")}</span>
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-slate-700 w-40">작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3 px-3 text-center text-slate-500 tabular-nums">
                      {postNumberMap.get(row.id) ?? "-"}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/destination/${row.id}`}
                        className="text-slate-800 font-medium hover:text-slate-600 hover:underline"
                      >
                        {row.title}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {row.sido} {row.sigungu}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(row.createdAt)}</td>
                    <td className="py-3 px-4 text-slate-700">{row.rating}점</td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        {statFor(row.id).views.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Share2 className="w-3.5 h-3.5 text-slate-400" />
                        {statFor(row.id).shares.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/destination/${row.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          보기
                        </Link>
                        <Link
                          href={`/admin/write?id=${row.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          수정
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id, row.title)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
