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
import {
  RATING_LABELS,
  getRatingLabel,
  getRatingTextColor,
  getRatingBadgeClass,
} from "@/constants/rating";

// ─────────────────────────────────────────────
// 헬퍼: URL이 동영상인지 판단
// ─────────────────────────────────────────────
const VIDEO_EXTS = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"];

function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase().split("?")[0];
  return VIDEO_EXTS.some((ext) => lower.endsWith(ext));
}

/** Swiper 슬라이드 컨테이너 내 모든 <video> 를 일시정지 */
function pauseVideosInSwiper(swiper: SwiperInstance) {
  swiper.el?.querySelectorAll<HTMLVideoElement>("video").forEach((v) => v.pause());
}

// ─────────────────────────────────────────────
// 슬라이드 내 미디어 렌더러 (이미지 / 동영상 분기)
// ─────────────────────────────────────────────
interface MediaSlideProps {
  url: string;
  label: string;
  /** 이미지 클릭 시 라이트박스 열기 콜백 (동영상이면 undefined) */
  onImageClick?: () => void;
  priority?: boolean;
}

function MediaSlide({ url, label, onImageClick, priority = false }: MediaSlideProps) {
  if (isVideoUrl(url)) {
    return (
      // 동영상: 자동재생(muted)·반복·컨트롤 표시
      // playsInline: 모바일 풀스크린 방지
      <video
        src={url}
        autoPlay
        muted
        loop
        playsInline
        controls
        className="w-full h-full object-contain bg-black"
      />
    );
  }

  // 이미지
  return (
    <div
      className={`relative w-full h-full bg-slate-100 group ${
        onImageClick ? "cursor-zoom-in" : ""
      }`}
      onClick={onImageClick}
    >
      {url.startsWith("data:") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="w-full h-full object-contain" />
      ) : (
        <Image
          src={url}
          alt={label}
          fill
          className="object-contain"
          sizes="(max-width: 672px) 100vw, 672px"
          priority={priority}
        />
      )}
      {/* 확대 힌트 */}
      {onImageClick && (
        <div
          className="absolute inset-0 flex items-center justify-center
                     opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        >
          <div className="bg-black/40 rounded-full p-2">
            <ZoomIn className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 라이트박스 (Swiper 기반, 이미지 + 동영상 혼합)
// ─────────────────────────────────────────────
interface LightboxProps {
  media: string[];
  initialIdx: number;
  title: string;
  onClose: () => void;
}

function Lightbox({ media, initialIdx, title, onClose }: LightboxProps) {
  const swiperRef   = useRef<SwiperInstance | null>(null);
  const [currentIdx, setCurrentIdx] = useState(initialIdx);
  const multi = media.length > 1;

  // Esc / 방향키 + body 스크롤 잠금
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
      // 닫을 때 재생 중인 동영상 정지
      swiperRef.current && pauseVideosInSwiper(swiperRef.current);
    };
  }, [onClose]);

  const handleSlideChange = useCallback((swiper: SwiperInstance) => {
    // 이전 슬라이드 동영상 정지
    pauseVideosInSwiper(swiper);
    setCurrentIdx(swiper.realIndex);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col select-none"
      onClick={onClose}
    >
      {/* 상단 바 */}
      <div
        className="flex items-center justify-between px-4 h-14 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {multi ? (
          <span className="text-white/60 text-sm tabular-nums font-medium">
            {currentIdx + 1} / {media.length}
            {isVideoUrl(media[currentIdx]) && (
              <span className="ml-2 text-indigo-400 text-xs">동영상</span>
            )}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-9 h-9 rounded-full text-white/70
                     hover:text-white hover:bg-white/10 transition-colors"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 슬라이더 */}
      <div className="relative flex-1 min-h-0" onClick={(e) => e.stopPropagation()}>
        <Swiper
          initialSlide={initialIdx}
          loop={multi}
          grabCursor
          speed={320}
          onSwiper={(s) => { swiperRef.current = s; }}
          onSlideChangeTransitionStart={handleSlideChange}
          className="h-full w-full"
        >
          {media.map((url, i) => (
            <SwiperSlide key={i}>
              <div className="relative w-full h-full flex items-center justify-center">
                {isVideoUrl(url) ? (
                  <video
                    src={url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls
                    className="max-w-full max-h-full object-contain"
                  />
                ) : url.startsWith("data:") ? (
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

        {/* 좌우 화살표 — 2개 이상일 때만 */}
        {multi && (
          <>
            <button
              type="button"
              onClick={() => swiperRef.current?.slidePrev()}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10
                         flex items-center justify-center w-10 h-10 rounded-full
                         bg-black/40 hover:bg-black/65 text-white transition-colors"
              aria-label="이전"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={() => swiperRef.current?.slideNext()}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10
                         flex items-center justify-center w-10 h-10 rounded-full
                         bg-black/40 hover:bg-black/65 text-white transition-colors"
              aria-label="다음"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

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

  const mainSwiperRef  = useRef<SwiperInstance | null>(null);
  const ratingRef      = useRef<HTMLDivElement>(null);

  const [destination,  setDestination]  = useState<Destination | undefined>(undefined);
  const [shared,       setShared]        = useState(false);
  const [lightboxIdx,  setLightboxIdx]   = useState<number | null>(null);
  const [showGuide,    setShowGuide]     = useState(false);

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

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);

  // 슬라이드 이동 시 동영상 정지
  const handleMainSlideChange = useCallback((swiper: SwiperInstance) => {
    pauseVideosInSwiper(swiper);
  }, []);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareTitle = destination?.title ?? "세줄여행";
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, url });
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
  const media: string[] = destination?.imageUrls ?? [];

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

        {/* 메인 슬라이더 + 출처 */}
        <div className="mb-6">
        <div className="rounded-xl overflow-hidden bg-slate-100">
          {media.length > 0 ? (
            <Swiper
              modules={[Navigation, Pagination]}
              navigation={media.length > 1}
              pagination={media.length > 1 ? { clickable: true } : false}
              loop={media.length > 1}
              onSwiper={(s) => { mainSwiperRef.current = s; }}
              onSlideChangeTransitionStart={handleMainSlideChange}
              className="aspect-[4/3] w-full"
            >
              {media.map((url, i) => (
                <SwiperSlide key={i}>
                  <MediaSlide
                    url={url}
                    label={`${destination.title} ${i + 1}`}
                    // 동영상이면 라이트박스 안 열고 인라인 재생
                    onImageClick={isVideoUrl(url) ? undefined : () => setLightboxIdx(i)}
                    priority={i === 0}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center text-slate-400 rounded-xl">
              미디어 없음
            </div>
          )}
        </div>
        {/* 이미지 출처 — 값이 있을 때만 표시, 슬라이더 바로 아래 우측 정렬 */}
        {destination.imageCredit && (
          <p className="mt-1.5 text-right text-[11px] text-gray-400 leading-none">
            © {destination.imageCredit}
          </p>
        )}
        </div>

        {/* 여행지 이름 */}
        <h1 className="text-2xl font-bold text-slate-900 mb-3">{destination.title}</h1>

        {/*
          평점 + 가이드 배지 + 팝오버
          - 별·점수·배지 영역 자체가 호버/터치 트리거 (별도 "전체 기준" 버튼 없음)
          - PC: onMouseEnter/Leave 로 팝오버 토글
          - 모바일: 영역 탭 시 onClick 토글, 바깥 터치 시 닫힘
        */}
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
            {/* 별 */}
            <span className="flex items-center gap-0.5">
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
            </span>
            {/* 점수 */}
            <span className="text-base font-medium text-slate-700">
              {destination.rating}점
            </span>
            {/* 가이드 문구 배지 — 단일 스타일 */}
            {getRatingLabel(destination.rating) && (
              <span className="text-sm px-2.5 py-0.5 rounded-full border
                               bg-slate-50 border-slate-200 text-slate-700">
                {getRatingLabel(destination.rating)}
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
                    {/* 별 */}
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
                    {/* 점수 번호 */}
                    <span className="text-[13px] text-slate-500 shrink-0 tabular-nums">
                      {r}점
                    </span>
                    {/* 가이드 문구 */}
                    <span className="text-[13px] text-slate-700">
                      {RATING_LABELS[r]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 지역 정보 */}
        <div className="flex items-center gap-2 text-slate-500 text-sm mb-8">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>
            {destination.sido} {destination.sigungu}
            {destination.address && ` · ${destination.address}`}
          </span>
        </div>

        {/* 세 줄 여행 */}
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-800">세 줄 여행</h2>
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

      {/* 라이트박스 — 이미지 클릭 시만 열림 */}
      {lightboxIdx !== null && (
        <Lightbox
          media={media}
          initialIdx={lightboxIdx}
          title={destination.title}
          onClose={closeLightbox}
        />
      )}
    </main>
  );
}
