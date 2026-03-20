"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Star, Loader2, X, ImagePlus, GripVertical, Play } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { REGIONS, getSigunguBySido } from "@/constants/regions";
import { getRatingLabel, getRatingBadgeClass } from "@/constants/rating";
import {
  fetchDestinationById,
  insertDestination,
  updateDestinationById,
  uploadFilesWithProgress,
  deleteStorageFiles,
  fetchAllTags,
} from "@/lib/supabase";
import TagChip, { ADMIN_PALETTE, getColors } from "@/components/TagChip";
import type { Tag } from "@/lib/db/schema";
import { tagStringLabel, tagColorFromUnknown, safeLower, normalizeTagArray } from "@/lib/tag-utils";

// ─────────────────────────────────────────────
// 상수 및 헬퍼
// ─────────────────────────────────────────────
const MAX_ITEMS    = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const VIDEO_EXTS = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"];

function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase().split("?")[0];
  return VIDEO_EXTS.some((ext) => lower.endsWith(ext));
}

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────
type NewMediaItem = {
  kind: "new";
  id: string;
  file: File;
  previewUrl: string;
  isVideo: boolean;
  credit: string;
};
type ExistingMediaItem = {
  kind: "existing";
  id: string;
  url: string;
  isVideo: boolean;
  credit: string;
};
type MediaItem = NewMediaItem | ExistingMediaItem;

// ─────────────────────────────────────────────
// 태그 입력 컴포넌트 (색상 피커 내장)
// ─────────────────────────────────────────────
const MAX_TAGS = 10;

function TagInput({
  tags,
  onChange,
  allTags,
}: {
  tags: Tag[];
  onChange: (tags: Tag[]) => void;
  allTags: Tag[];
}) {
  const [input, setInput] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 방어: null/undefined 아이템 제거 후 이름 목록 추출
  const safeTags = (tags ?? []).filter((t) => t && typeof t.name === "string" && t.name.trim());
  const tagNames = safeTags.map((t) => t.name);

  // 자동완성: 입력값 포함 & 아직 추가되지 않은 태그
  const suggestions = (allTags ?? []).filter((t) => {
    const label = tagStringLabel(t);
    return (
      Boolean(label) &&
      label.toLowerCase().includes(String(input ?? "").toLowerCase()) &&
      !tagNames.includes(label)
    );
  });

  const addTag = useCallback(
    (raw: string, colorOverride?: string) => {
      const name = raw.replace(/,/g, "").trim();
      if (!name || tagNames.includes(name) || safeTags.length >= MAX_TAGS) return;
      const color = colorOverride ?? "";
      onChange([...safeTags, { name, color }]);
      setInput("");
      setShowDrop(false);
    },
    [safeTags, tagNames, onChange]
  );

  const removeTag = useCallback(
    (name: string) => onChange(safeTags.filter((t) => t.name !== name)),
    [safeTags, onChange]
  );

  const updateTagColor = useCallback(
    (name: string, color: string) => {
      onChange(safeTags.map((t) => (t.name === name ? { ...t, color } : t)));
      setColorPickerFor(null);
    },
    [safeTags, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && safeTags.length > 0) {
      removeTag(safeTags[safeTags.length - 1].name);
    } else if (e.key === "Escape") {
      setShowDrop(false);
      setColorPickerFor(null);
    }
  };

  // 외부 클릭 시 드롭다운 & 색상 피커 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDrop(false);
        setColorPickerFor(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* 태그 칩 + 입력창 */}
      <div
        className="min-h-[46px] flex flex-wrap gap-1.5 items-center px-3 py-2
                   border border-slate-200 rounded-lg cursor-text
                   focus-within:ring-2 focus-within:ring-slate-200 focus-within:border-slate-400"
        onClick={() => inputRef.current?.focus()}
      >
        {safeTags.map((tag) => {
          const safeName = tag.name || "";
          const { bg, fg } = getColors(safeName, tag.color || undefined);
          const isOpen = colorPickerFor === safeName;

          return (
            <div key={safeName} className="relative inline-block">
              {/* 칩 본체: 클릭 → 색상 피커 토글 */}
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                           text-xs font-medium cursor-pointer select-none
                           hover:opacity-80 transition-opacity"
                style={{ backgroundColor: bg, color: fg }}
                onClick={(e) => {
                  e.stopPropagation();
                  setColorPickerFor(isOpen ? null : safeName);
                  setShowDrop(false);
                }}
                title="클릭해서 색상 변경"
              >
                {safeName}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeTag(safeName); }}
                  className="hover:opacity-60 transition-opacity"
                  aria-label={`${safeName} 태그 삭제`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>

              {/* 색상 피커 팝오버 */}
              {isOpen && (
                <div
                  className="absolute z-50 top-full mt-1.5 left-0
                             bg-white border border-slate-200 rounded-2xl shadow-2xl p-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-[10px] font-medium text-slate-400 mb-2 whitespace-nowrap">
                    색상 선택 (칩을 다시 클릭하면 닫힘)
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {/* 기본 (자동 배정) */}
                    <button
                      type="button"
                      title="자동 배정"
                      onClick={() => updateTagColor(safeName, "")}
                      className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110
                        bg-gradient-to-br from-slate-200 to-slate-300
                        ${!tag.color ? "border-slate-600 scale-110" : "border-white"}`}
                    />
                    {ADMIN_PALETTE.map((p) => (
                      <button
                        key={p.bg}
                        type="button"
                        title={p.label}
                        onClick={() => updateTagColor(safeName, p.bg)}
                        className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110
                          ${tag.color === p.bg ? "border-slate-600 scale-110" : "border-white"}`}
                        style={{ backgroundColor: p.bg }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowDrop(true); setColorPickerFor(null); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDrop(true)}
          placeholder={safeTags.length === 0 ? "태그 입력 후 Enter 또는 , 로 추가 (최대 10개)" : ""}
          className="flex-1 min-w-[140px] text-sm outline-none bg-transparent placeholder:text-slate-400"
        />
      </div>

      {/* 자동완성 드롭다운 */}
      {showDrop && suggestions.length > 0 && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200
                        rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto">
          {suggestions.map((tag) => {
            const name = tagStringLabel(tag);
            const color = tagColorFromUnknown(tag);
            return (
              <button
                key={name}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(name, color);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-left"
              >
                <TagChip tag={name} color={color || undefined} />
              </button>
            );
          })}
        </div>
      )}

      {/* 태그 수 카운터 + 색상 힌트 */}
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs text-slate-400">칩을 클릭하면 색상을 변경할 수 있습니다</p>
        {safeTags.length > 0 && (
          <p className="text-xs text-slate-400 tabular-nums">{safeTags.length} / {MAX_TAGS}</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 드래그 가능한 썸네일 컴포넌트
// ─────────────────────────────────────────────
function SortableThumbnail({
  item,
  index,
  onRemove,
  onCreditChange,
}: {
  item: MediaItem;
  index: number;
  onRemove: (id: string) => void;
  onCreditChange: (id: string, credit: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const src    = item.kind === "new" ? item.previewUrl : item.url;
  const isRep  = index === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-xl border-2 transition-all duration-150 select-none bg-white
        ${isRep ? "border-amber-400" : "border-slate-200"}
        ${isDragging ? "opacity-40 shadow-2xl ring-2 ring-slate-400" : "opacity-100"}`}
    >
      {/* 미디어 영역 + 드래그 핸들 */}
      <div
        {...attributes}
        {...listeners}
        className="relative aspect-[4/3] bg-slate-100 cursor-grab active:cursor-grabbing touch-none overflow-hidden rounded-t-[10px]"
        title="드래그하여 순서 변경"
      >
        {item.isVideo ? (
          <video
            src={src}
            muted
            preload="metadata"
            className="w-full h-full object-contain pointer-events-none"
          />
        ) : item.kind === "new" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`미디어 ${index + 1}`}
            className="w-full h-full object-contain pointer-events-none"
          />
        ) : (
          <Image
            src={src}
            alt={`미디어 ${index + 1}`}
            fill
            className="object-contain"
            sizes="200px"
          />
        )}

        {item.isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
            <div className="bg-black/50 rounded-full p-2">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
          </div>
        )}

        <div className="absolute bottom-1.5 right-1.5 bg-black/30 rounded p-0.5">
          <GripVertical className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      {/* 뱃지 — 이미지 영역 위에 절대 배치 */}
      {isRep && (
        <span className="absolute top-1.5 left-1.5 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          ★ 대표
        </span>
      )}
      {item.isVideo && (
        <span
          className={`absolute text-white text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500
            ${isRep ? "top-7 left-1.5" : "top-1.5 left-1.5"}`}
        >
          동영상
        </span>
      )}
      <span className="absolute top-1.5 right-8 bg-black/40 text-white text-[10px] px-1.5 py-0.5 rounded">
        {index + 1}
      </span>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="absolute top-1.5 right-1.5 flex items-center justify-center w-5 h-5 rounded-full
                   bg-black/50 hover:bg-red-500 text-white transition-colors z-10"
        aria-label="삭제"
      >
        <X className="w-3 h-3" />
      </button>

      {/* 출처 입력 — 이미지 영역 아래, 드래그 이벤트 비전파 */}
      <div
        className="px-2 pt-1.5 pb-2 border-t border-slate-100"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          value={item.credit}
          onChange={(e) => onCreditChange(item.id, e.target.value)}
          placeholder="출처 입력 (선택)"
          className="w-full text-[11px] text-slate-600 placeholder:text-slate-300
                     border-b border-slate-200 bg-transparent focus:outline-none
                     focus:border-slate-400 pb-0.5"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 메인 폼
// ─────────────────────────────────────────────
function AdminWriteForm() {
  const searchParams = useSearchParams();
  const editId      = searchParams.get("id");
  const isEditMode  = !!editId;

  const fileInputRef    = useRef<HTMLInputElement>(null);
  const originalUrlsRef = useRef<string[]>([]);

  const [sido, setSido]         = useState("");
  const [sigungu, setSigungu]   = useState("");
  const [formData, setFormData] = useState({
    title:   "",
    address: "",
    rating:  "",
    summary: "",
  });

  const [tags, setTags]                 = useState<Tag[]>([]);
  const [allTags, setAllTags]           = useState<Tag[]>([]);
  const [mediaItems, setMediaItems]     = useState<MediaItem[]>([]);
  const [uploading, setUploading]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const sigunguList = getSigunguBySido(sido);

  // 기존 태그 목록 로드 (자동완성용)
  useEffect(() => {
    fetchAllTags()
      .then((tags) => {
        if (process.env.NODE_ENV === "development") {
          console.log("[AdminWrite] fetchAllTags 결과:", tags);
        }
        setAllTags(normalizeTagArray(tags));
      })
      .catch((err) => {
        console.error("[AdminWrite] fetchAllTags 오류:", err);
        setAllTags([]);
      });
  }, []);

  // 언마운트 시 blob URL 해제
  useEffect(() => {
    return () => {
      mediaItems.forEach((item) => {
        if (item.kind === "new") URL.revokeObjectURL(item.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 수정 모드 초기값 세팅
  useEffect(() => {
    if (!editId) return;

    fetchDestinationById(editId)
      .then((existing) => {
        if (!existing) {
          console.warn("[AdminWrite] editId로 데이터를 찾지 못함:", editId);
          return;
        }

        if (process.env.NODE_ENV === "development") {
          console.log("[AdminWrite] 불러온 데이터:", {
            id:           existing.id,
            title:        existing.title,
            tags:         existing.tags,
            imageCredits: existing.imageCredits,
            imageUrls:    existing.imageUrls?.length,
          });
        }

        setFormData({
          title:   String(existing.title ?? ""),
          address: String(existing.address ?? ""),
          rating:  String(existing.rating ?? ""),
          summary: String(existing.summary ?? ""),
        });
        setSido(String(existing.sido ?? ""));
        setSigungu(String(existing.sigungu ?? ""));

        // 태그: string | 객체 혼합 → 항상 Tag[] 로 정규화
        setTags(normalizeTagArray(existing.tags));

        // 미디어 아이템: imageCredits 방어 처리
        const loaded  = Array.isArray(existing.imageUrls) ? existing.imageUrls : [];
        const credits = Array.isArray(existing.imageCredits) ? existing.imageCredits : [];
        originalUrlsRef.current = loaded;

        setMediaItems(
          loaded
            .filter((url) => typeof url === "string" && url)
            .map((url, idx) => ({
              kind:    "existing" as const,
              id:      `existing-${url}`,
              url:     String(url),
              isVideo: isVideoUrl(String(url)),
              credit:  String(credits[idx] ?? ""),
            }))
        );
      })
      .catch((err) => {
        console.error("[AdminWrite] 데이터 로딩 오류:", err);
      });
  }, [editId]);

  // dnd-kit 센서
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setMediaItems((items) => {
        const oldIdx = items.findIndex((i) => i.id === active.id);
        const newIdx = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIdx, newIdx);
      });
    }
  }, []);

  const handleCreditChange = useCallback((id: string, credit: string) => {
    setMediaItems((items) =>
      items.map((item) => (item.id === id ? { ...item, credit } : item))
    );
  }, []);

  // 파일 선택 (누적 Append)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    // ① 파일 크기 검사 (50 MB 초과 제외)
    const oversized = files.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      alert(
        `다음 파일은 50 MB를 초과하여 제외됩니다:\n${oversized.map((f) => f.name).join("\n")}`
      );
      files = files.filter((f) => f.size <= MAX_FILE_SIZE);
    }

    if (!files.length) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // ② 최대 개수 검사
    const remaining = MAX_ITEMS - mediaItems.length;
    if (remaining <= 0) {
      alert(`최대 ${MAX_ITEMS}개까지 등록 가능합니다.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) {
      alert(`최대 ${MAX_ITEMS}개 제한으로 ${toAdd.length}개만 추가됩니다.`);
    }

    const newItems: NewMediaItem[] = toAdd.map((file) => ({
      kind:       "new",
      id:         `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      isVideo:    isVideoFile(file),
      credit:     "",
    }));

    setMediaItems((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 개별 항목 제거
  const removeItem = useCallback((id: string) => {
    setMediaItems((items) => {
      const target = items.find((i) => i.id === id);
      if (target?.kind === "new") URL.revokeObjectURL(target.previewUrl);
      return items.filter((i) => i.id !== id);
    });
  }, []);

  const handleSidoChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSido(e.target.value);
      setSigungu("");
    },
    []
  );

  const resetForm = () => {
    setFormData({ title: "", address: "", rating: "", summary: "" });
    setSido("");
    setSigungu("");
    setTags([]);
    setMediaItems([]);
    setUploadProgress(0);
    originalUrlsRef.current = [];
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 제출
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. 신규 파일 순차 업로드 + 진행률
      const newItems = mediaItems.filter((i): i is NewMediaItem => i.kind === "new");
      const uploadedMap = new Map<string, string>();

      if (newItems.length > 0) {
        const urls = await uploadFilesWithProgress(
          newItems.map((i) => i.file),
          (pct) => setUploadProgress(pct)
        );
        newItems.forEach((item, idx) => uploadedMap.set(item.id, urls[idx]));
      } else {
        setUploadProgress(100);
      }

      // 2. 최종 URL 배열 및 출처 배열 (순서 동기화)
      const finalUrls    = mediaItems.map((item) =>
        item.kind === "new" ? uploadedMap.get(item.id)! : item.url
      );
      const finalCredits = mediaItems.map((item) => item.credit?.trim() ?? "");

      // 저장할 image_credit 구조를 콘솔에서 확인 가능
      console.log(
        "[저장 확인] image_credit 전송 데이터:",
        finalUrls.map((url, i) => ({ url, credit: finalCredits[i] }))
      );

      // 3. 편집 모드: 제거된 기존 파일을 Storage에서 삭제
      if (isEditMode && originalUrlsRef.current.length > 0) {
        const removedUrls = originalUrlsRef.current.filter(
          (url) => !finalUrls.includes(url)
        );
        if (removedUrls.length > 0) await deleteStorageFiles(removedUrls);
      }

      // 4. DB 저장
      const payload = {
        title:       formData.title,
        sido,
        sigungu,
        address:     formData.address,
        summary:     formData.summary,
        rating:      formData.rating ? Number(formData.rating) : 5,
        imageUrls:    finalUrls,
        imageCredits: finalCredits,
        tags,
      };

      if (isEditMode && editId) {
        await updateDestinationById(editId, payload);
        alert("성공적으로 수정되었습니다!");
        window.location.href = "/admin";
        return;
      }

      await insertDestination(payload);
      alert("성공적으로 등록되었습니다!");
      resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("[저장 오류]", err);
      alert(
        `오류가 발생했습니다:\n\n${msg}\n\n` +
        `▶ Supabase Storage 버킷(destinations)이 생성되어 있는지 확인하세요.\n` +
        `▶ supabase/add_image_urls.sql을 실행했는지 확인하세요.`
      );
    } finally {
      setUploading(false);
    }
  };

  // ─────────────────────────────────────────────
  // 렌더
  // ─────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-800 mb-8">
        {isEditMode ? "여행지 수정" : "여행지 등록"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 여행지 이름 */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
            여행지 이름
          </label>
          <input
            id="title" type="text" value={formData.title} required
            onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
            placeholder="예: 강릉 안목해변"
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 placeholder:text-slate-400"
          />
        </div>

        {/* 지역 선택 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sido" className="block text-sm font-medium text-slate-700 mb-2">시도</label>
            <select id="sido" value={sido} onChange={handleSidoChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 text-slate-700 cursor-pointer">
              <option value="">시도 선택</option>
              {REGIONS.map((r) => <option key={r.sido} value={r.sido}>{r.sido}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sigungu" className="block text-sm font-medium text-slate-700 mb-2">시군구</label>
            <select id="sigungu" value={sigungu} onChange={(e) => setSigungu(e.target.value)} disabled={!sido}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 text-slate-700 cursor-pointer disabled:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              <option value="">시군구 선택</option>
              {sigunguList.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* 상세 주소 */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-2">상세 주소</label>
          <input id="address" type="text" value={formData.address}
            onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
            placeholder="예: 강원특별자치도 강릉시 연곡면 해변로"
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 placeholder:text-slate-400"
          />
        </div>

        {/* ── 이미지 / 동영상 업로드 ──────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700">
              이미지 / 동영상
              <span className="ml-1.5 text-xs text-slate-400 font-normal">
                최대 {MAX_ITEMS}개 · 파일당 50 MB · 드래그로 순서 변경 · 맨 앞이 대표
              </span>
            </label>
            <span
              className={`text-xs font-medium tabular-nums
                ${mediaItems.length >= MAX_ITEMS ? "text-red-500" : "text-slate-400"}`}
            >
              {mediaItems.length} / {MAX_ITEMS}
            </span>
          </div>

          {/* 파일 선택 버튼 */}
          <label
            className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors
              ${mediaItems.length >= MAX_ITEMS
                ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                : "border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-500"}`}
          >
            <ImagePlus className="w-4 h-4" />
            <span className="text-sm font-medium">
              {mediaItems.length >= MAX_ITEMS
                ? "최대 개수 도달"
                : "이미지 또는 동영상 추가 (여러 파일 선택 가능)"}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              disabled={mediaItems.length >= MAX_ITEMS}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* 업로드 진행 바 */}
          {uploading && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">업로드 중...</span>
                <span className="text-xs font-medium text-slate-700 tabular-nums">
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-800 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* 썸네일 그리드 (DnD) */}
          {Array.isArray(mediaItems) && mediaItems.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-slate-400 mb-3">
                ↕ 드래그하여 순서를 바꾸세요. 첫 번째 항목이 대표로 사용됩니다.
              </p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={(Array.isArray(mediaItems) ? mediaItems : []).map((i) => i.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-3 gap-3">
                    {(Array.isArray(mediaItems) ? mediaItems : []).map((item, index) => (
                      <SortableThumbnail
                        key={item.id}
                        item={item}
                        index={index}
                        onRemove={removeItem}
                        onCreditChange={handleCreditChange}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>

        {/* 평점 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">평점</label>
          <div className="flex flex-wrap gap-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="rating" value={n}
                  checked={formData.rating === String(n)}
                  onChange={(e) => setFormData((p) => ({ ...p, rating: e.target.value }))}
                  className="w-4 h-4 text-slate-600 border-slate-300 focus:ring-slate-400"
                />
                <Star className={`w-4 h-4 ${formData.rating >= String(n) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                <span className="text-sm text-slate-700">{n}점</span>
              </label>
            ))}
          </div>
          {/* 선택된 점수 가이드 문구 */}
          {formData.rating && (
            <p className="mt-2.5 flex items-center gap-2 text-sm text-slate-500">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
              {formData.rating}점 ·
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full border
                            ${getRatingBadgeClass(Number(formData.rating))}`}
              >
                {getRatingLabel(Number(formData.rating))}
              </span>
            </p>
          )}
        </div>

        {/* 세 줄 여행 */}
        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-slate-700 mb-2">세 줄 여행</label>
          <textarea id="summary" value={formData.summary}
            onChange={(e) => setFormData((p) => ({ ...p, summary: e.target.value }))}
            placeholder={`여행지를 세 줄로 요약해 주세요.\n각 줄마다 엔터로 구분할 수 있습니다.`}
            rows={8}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 placeholder:text-slate-400 resize-y min-h-[180px]"
          />
        </div>

        {/* 태그 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            태그
            <span className="ml-1.5 text-xs text-slate-400 font-normal">
              선택 사항 · 최대 10개 · Enter 또는 ,로 추가
            </span>
          </label>
          <TagInput tags={tags} onChange={setTags} allTags={allTags} />
        </div>

        {/* 제출 버튼 */}
        <div className="pt-4">
          <button type="submit" disabled={uploading}
            className="w-full py-4 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 disabled:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2">
            {uploading && <Loader2 className="w-5 h-5 animate-spin" />}
            {uploading ? `저장 중... (${uploadProgress}%)` : isEditMode ? "수정하기" : "등록하기"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminWritePage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8 animate-pulse">로딩 중...</div>}>
      <AdminWriteForm />
    </Suspense>
  );
}
