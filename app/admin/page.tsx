"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Pencil, Trash2, MapPin, ArrowUp, ArrowDown, Eye, Share2, Users, Home, TrendingUp } from "lucide-react";
import { REGIONS } from "@/constants/regions";
import {
  fetchAllDestinations,
  deleteDestinationById,
  fetchDashboardStats,
  type DashboardStats,
} from "@/lib/supabase";
import type { Destination } from "@/lib/db/schema";

type SortKey = "title" | "region" | "createdAt" | "rating";
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

export default function AdminDashboardPage() {
  const [items, setItems] = useState<Destination[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sidoFilter, setSidoFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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
    fetchDashboardStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, [loadItems]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filteredAndSorted = items
    .filter((d) => !sidoFilter || d.sido === sidoFilter)
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") {
        cmp = (a.title ?? "").localeCompare(b.title ?? "");
      } else if (sortKey === "region") {
        const aStr = `${a.sido} ${a.sigungu}`;
        const bStr = `${b.sido} ${b.sigungu}`;
        cmp = aStr.localeCompare(bStr);
      } else if (sortKey === "createdAt") {
        const aDate = a.createdAt ?? "";
        const bDate = b.createdAt ?? "";
        cmp = aDate.localeCompare(bDate);
      } else if (sortKey === "rating") {
        cmp = (a.rating ?? 0) - (b.rating ?? 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`정말 삭제하시겠습니까?\n\n"${title}"`)) return;
    try {
      await deleteDestinationById(id);
      await loadItems();
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const STAT_CARDS = [
    {
      label: "전체 방문",
      value: stats?.totalViews ?? "-",
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      border: "border-blue-100",
    },
    {
      label: "게시글 조회",
      value: stats?.detailPageViews ?? "-",
      icon: TrendingUp,
      color: "bg-emerald-50 text-emerald-600",
      border: "border-emerald-100",
    },
    {
      label: "공유 횟수",
      value: stats?.totalShares ?? "-",
      icon: Share2,
      color: "bg-purple-50 text-purple-600",
      border: "border-purple-100",
    },
    {
      label: "메인 방문",
      value: stats?.mainPageViews ?? "-",
      icon: Home,
      color: "bg-amber-50 text-amber-600",
      border: "border-amber-100",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-800 mb-6">
        게시글 관리
      </h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
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

      {/* 필터 (정렬은 테이블 헤더 클릭으로 동작) */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="sm:w-64">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            지역 필터
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={sidoFilter}
              onChange={(e) => setSidoFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300"
            >
              <option value="">전체 지역</option>
              {REGIONS.map((r) => (
                <option key={r.sido} value={r.sido}>
                  {r.sido}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-end">
          <p className="text-xs text-slate-400 pb-2.5">
            테이블 헤더를 클릭하면 해당 열 기준으로 정렬됩니다.
          </p>
        </div>
      </div>

      {/* 테이블 */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        {filteredAndSorted.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            등록된 게시글이 없습니다.
            <Link
              href="/admin/write"
              className="block mt-2 text-slate-700 font-medium hover:underline"
            >
              새 글 등록하기 →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th
                    onClick={() => handleSort("title")}
                    className="text-left py-3 px-4 font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      제목
                      {sortKey === "title" &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5" />
                        ))}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort("region")}
                    className="text-left py-3 px-4 font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      지역
                      {sortKey === "region" &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5" />
                        ))}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort("createdAt")}
                    className="text-left py-3 px-4 font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      등록일
                      {sortKey === "createdAt" &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5" />
                        ))}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort("rating")}
                    className="text-left py-3 px-4 font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      평점
                      {sortKey === "rating" &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5" />
                        ))}
                    </span>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700 w-28">
                    조회 / 공유
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-slate-700 w-40">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
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
                    <td className="py-3 px-4 text-slate-600">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{row.rating}점</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                        <Eye className="w-3.5 h-3.5" />
                        {(stats?.destStats[row.id]?.views ?? 0).toLocaleString()}
                      </span>
                      <span className="mx-1 text-slate-300">/</span>
                      <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                        <Share2 className="w-3.5 h-3.5" />
                        {(stats?.destStats[row.id]?.shares ?? 0).toLocaleString()}
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
