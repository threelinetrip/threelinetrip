"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, Sparkles, ArrowLeft, Share2, Check } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { fetchDestinationById, insertViewLog } from "@/lib/supabase";
import type { Destination } from "@/lib/db/schema";

export default function DestinationDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [destination, setDestination] = useState<Destination | undefined>(undefined);
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = destination?.title ?? "세줄여행";
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      // 공유 취소 시 무시
    }
    // 공유 로그 기록 (fire-and-forget)
    insertViewLog(id, "share");
  };

  useEffect(() => {
    fetchDestinationById(id)
      .then((d) => setDestination(d ?? undefined))
      .catch(() => setDestination(undefined));

    // 조회 로그 기록 (fire-and-forget — 실패해도 페이지에 영향 없음)
    insertViewLog(id);
  }, [id]);

  const summaryLines = destination?.summary?.split("\n").filter(Boolean) ?? [];

  // imageUrls[0]이 대표 이미지, 전체를 슬라이드로 표시
  const images: string[] = destination?.imageUrls ?? [];

  if (!destination) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-slate-500 mb-4">여행지를 찾을 수 없습니다.</p>
          <Link href="/" className="inline-flex items-center gap-2 text-slate-700 font-medium hover:underline">
            <ArrowLeft className="w-4 h-4" />
            목록으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Swiper 이미지 슬라이더 */}
        <div className="rounded-xl overflow-hidden mb-6">
          {images.length > 0 ? (
            <Swiper
              modules={[Navigation, Pagination]}
              navigation
              pagination={{ clickable: true }}
              loop={images.length > 1}
              className="aspect-[4/3] w-full"
            >
              {images.map((url, i) => (
                <SwiperSlide key={i}>
                  <div className="relative w-full h-full">
                    {url.startsWith("data:") ? (
                      <img src={url} alt={`${destination.title} ${i + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <Image
                        src={url}
                        alt={`${destination.title} ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 672px) 100vw, 672px"
                        priority={i === 0}
                      />
                    )}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center text-slate-400 rounded-xl">
              이미지 없음
            </div>
          )}
        </div>

        {/* 여행지 이름 */}
        <h1 className="text-2xl font-bold text-slate-900 mb-3">{destination.title}</h1>

        {/* 평점 */}
        <div className="flex items-center gap-0.5 mb-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${
                i <= Math.floor(destination.rating)
                  ? "fill-amber-400 text-amber-400"
                  : "fill-slate-200 text-slate-200"
              }`}
            />
          ))}
          <span className="ml-2 text-base font-medium text-slate-700">{destination.rating}점</span>
        </div>

        {/* 지역 정보 */}
        <div className="flex items-center gap-2 text-slate-500 text-sm mb-8">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>
            {destination.sido} {destination.sigungu}
            {destination.address && ` · ${destination.address}`}
          </span>
        </div>

        {/* 세 줄 요약 */}
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold text-slate-800">세 줄 요약</h2>
          </div>
          <div className="space-y-3">
            {summaryLines.map((line, i) => (
              <p key={i} className="text-slate-700 leading-relaxed">{line}</p>
            ))}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로 돌아가기
          </Link>
          <button
            type="button"
            onClick={handleShare}
            className={`inline-flex items-center gap-2 px-6 py-3 font-medium rounded-lg border transition-colors ${
              shared
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {shared ? (
              <>
                <Check className="w-4 h-4" />
                링크 복사됨
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                공유하기
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
