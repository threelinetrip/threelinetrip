"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin, Star, Sparkles, ArrowLeft,
  Share2, Check, X, ZoomIn, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { fetchDestinationById, insertViewLog } from "@/lib/supabase";
import type { Destination } from "@/lib/db/schema";

// ─────────────────────────────────────────────
// 라이트박스 (Swiper 기반)
// ─────────────────────────────────────────────
interface LightboxProps {
  images: string[];
  initialIdx: number;
  title: string;
  onClose: () => void;
}

function Lightbox({ images, initialIdx, title, onClose }: LightboxProps) {
  const swiperRef = useRef<SwiperInstance | null>(null);
  const [currentIdx, setCurrentIdx] = useState(initialIdx);
  const multi = images.length > 1;

  // Esc / 방향키 지원 + body 스크롤 잠금
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")  swiperRef.current?.slidePrev();
      if (e.key === "ArrowRight") swiperRef.current?.slideNext();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    /* 배경 클릭으로 닫기 */
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col select-none"
      onClick={onClose}
    >
      {/* 상단 바 ── 닫기 버튼 & 카운터 */}
      <div
        className="flex items-center justify-between px-4 h-14 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {multi ? (
          <span className="text-white/60 text-sm tabular-nums font-medium">
            {currentIdx + 1} / {images.length}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-9 h-9 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 슬라이더 */}
      <div
        className="relative flex-1 min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Swiper
          // 터치·스와이프는 Swiper 기본 지원 — 별도 모듈 불필요
          initialSlide={initialIdx}
          loop={multi}
          grabCursor
          speed={320}
          onSwiper={(s) => { swiperRef.current = s; }}
          onSlideChange={(s) => setCurrentIdx(s.realIndex)}
          className="h-full w-full"
        >
          {images.map((url, i) => (
            <SwiperSlide key={i}>
              <div className="relative w-full h-full">
                {url.startsWith("data:") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={`${title} ${i + 1}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Image
                    src={url}
                    alt={`${title} ${i + 1}`}
                    fill
                    className="object-contain"
                    sizes="100vw"
                    priority={i === initialIdx}
                  />
                )}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* 좌우 화살표 — 이미지 2장 이상일 때만 표시 */}
        {multi && (
          <>
            <button
              type="button"
              onClick={() => swiperRef.current?.slidePrev()}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10
                         flex items-center justify-center w-10 h-10 rounded-full
                         bg-black/40 hover:bg-black/65 text-white transition-colors"
              aria-label="이전 이미지"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={() => swiperRef.current?.slideNext()}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10
                         flex items-center justify-center w-10 h-10 rounded-full
                         bg-black/40 hover:bg-black/65 text-white transition-colors"
              aria-label="다음 이미지"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* 하단 여백 */}
      <div className="h-4 shrink-0" />
    </div>
  );
}

// ─────────────────────────────────────────────
// 상세 페이지
// ─────────────────────────────────────────────
export default function DestinationDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [destination, setDestination] = useState<Destination | undefined>(undefined);
  const [shared, setShared] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);

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
    insertViewLog(id, "share");
  };

  useEffect(() => {
    fetchDestinationById(id)
      .then((d) => setDestination(d ?? undefined))
      .catch(() => setDestination(undefined));
    insertViewLog(id);
  }, [id]);

  const summaryLines = destination?.summary?.split("\n").filter(Boolean) ?? [];
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

        {/* 메인 슬라이더 */}
        <div className="rounded-xl overflow-hidden mb-6 bg-slate-100">
          {images.length > 0 ? (
            <Swiper
              modules={[Navigation, Pagination]}
              navigation={images.length > 1}
              pagination={images.length > 1 ? { clickable: true } : false}
              loop={images.length > 1}
              className="aspect-[4/3] w-full"
            >
              {images.map((url, i) => (
                <SwiperSlide key={i}>
                  <div
                    className="relative w-full h-full bg-slate-100 cursor-zoom-in group"
                    onClick={() => setLightboxIdx(i)}
                  >
                    {url.startsWith("data:") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={`${destination.title} ${i + 1}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Image
                        src={url}
                        alt={`${destination.title} ${i + 1}`}
                        fill
                        className="object-contain"
                        sizes="(max-width: 672px) 100vw, 672px"
                        priority={i === 0}
                      />
                    )}
                    {/* 확대 힌트 */}
                    <div className="absolute inset-0 flex items-center justify-center
                                    opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-black/40 rounded-full p-2">
                        <ZoomIn className="w-5 h-5 text-white" />
                      </div>
                    </div>
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
              <><Check className="w-4 h-4" />링크 복사됨</>
            ) : (
              <><Share2 className="w-4 h-4" />공유하기</>
            )}
          </button>
        </div>
      </div>

      {/* 라이트박스 */}
      {lightboxIdx !== null && (
        <Lightbox
          images={images}
          initialIdx={lightboxIdx}
          title={destination.title}
          onClose={closeLightbox}
        />
      )}
    </main>
  );
}
