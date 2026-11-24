"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { X, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { isVideoUrl } from "@/lib/media";

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
// 메인 슬라이더 + 출처 + 라이트박스
// ─────────────────────────────────────────────
interface MediaGalleryProps {
  media: string[];
  credits: string[];
  title: string;
}

export default function MediaGallery({ media, credits, title }: MediaGalleryProps) {
  const mainSwiperRef = useRef<SwiperInstance | null>(null);
  const [lightboxIdx,    setLightboxIdx]    = useState<number | null>(null);
  const [mainCurrentIdx, setMainCurrentIdx] = useState(0);

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);

  // 슬라이드 이동 시 동영상 정지 (transition 시작 시점에 멈춰야 부드러움)
  const handleMainSlideTransition = useCallback((swiper: SwiperInstance) => {
    pauseVideosInSwiper(swiper);
  }, []);

  // 실제 슬라이드 변경 완료 시 현재 인덱스 추적
  // onSlideChange 가 realIndex 갱신 직후 호출되어 loop 모드에서 가장 안정적
  const handleMainSlideChange = useCallback((swiper: SwiperInstance) => {
    setMainCurrentIdx(swiper.realIndex);
  }, []);

  const credit = credits[mainCurrentIdx];

  return (
    <>
      <div className="mb-6">
        <div className="rounded-xl overflow-hidden bg-slate-100">
          {media.length > 0 ? (
            <Swiper
              modules={[Navigation, Pagination]}
              navigation={media.length > 1}
              pagination={media.length > 1 ? { clickable: true } : false}
              loop={media.length > 1}
              onSwiper={(s) => {
                mainSwiperRef.current = s;
                // 초기 인덱스 동기화 (loop 모드에서 안전하게)
                setMainCurrentIdx(s.realIndex ?? 0);
              }}
              onSlideChange={handleMainSlideChange}
              onSlideChangeTransitionStart={handleMainSlideTransition}
              className="aspect-[4/3] w-full"
            >
              {media.map((url, i) => (
                <SwiperSlide key={i}>
                  <MediaSlide
                    url={url}
                    label={`${title} ${i + 1}`}
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
        {/* 이미지 출처 — 현재 슬라이드의 출처가 있을 때만 표시 */}
        {credit ? (
          <p className="mt-1.5 text-right text-[11px] text-gray-400 leading-none">
            © {credit}
          </p>
        ) : null}
      </div>

      {/* 라이트박스 — 이미지 클릭 시만 열림 */}
      {lightboxIdx !== null && (
        <Lightbox
          media={media}
          initialIdx={lightboxIdx}
          title={title}
          onClose={closeLightbox}
        />
      )}
    </>
  );
}
