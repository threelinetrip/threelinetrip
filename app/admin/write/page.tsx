"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Star, Loader2, X, ImagePlus, GripVertical } from "lucide-react";
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
import {
  fetchDestinationById,
  insertDestination,
  updateDestinationById,
  uploadImages,
  deleteStorageFiles,
} from "@/lib/supabase";

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────
type NewImageItem      = { kind: "new";      id: string; file: File;   previewUrl: string };
type ExistingImageItem = { kind: "existing"; id: string; url: string };
type ImageItem         = NewImageItem | ExistingImageItem;

const MAX_IMAGES = 10;

// ─────────────────────────────────────────────
// 드래그 가능한 썸네일 컴포넌트
// ─────────────────────────────────────────────
function SortableThumbnail({
  item,
  index,
  onRemove,
}: {
  item: ImageItem;
  index: number;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const imgSrc = item.kind === "new" ? item.previewUrl : item.url;
  const isRep  = index === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-xl overflow-hidden border-2 transition-all duration-150 select-none
        ${isRep ? "border-amber-400" : "border-slate-200"}
        ${isDragging ? "opacity-40 shadow-2xl ring-2 ring-slate-400" : "opacity-100"}`}
    >
      {/* 이미지 + 드래그 핸들 */}
      <div
        {...attributes}
        {...listeners}
        className="relative aspect-[4/3] bg-slate-100 cursor-grab active:cursor-grabbing touch-none"
        title="드래그하여 순서 변경"
      >
        {item.kind === "new" ? (
          // blob URL → <img> 사용 (next/image 최적화 불가)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={`이미지 ${index + 1}`}
            className="w-full h-full object-contain"
          />
        ) : (
          // Supabase URL → next/image 최적화 적용
          <Image
            src={imgSrc}
            alt={`이미지 ${index + 1}`}
            fill
            className="object-contain"
            sizes="200px"
          />
        )}

        {/* 드래그 핸들 아이콘 */}
        <div className="absolute bottom-1.5 right-1.5 bg-black/30 rounded p-0.5">
          <GripVertical className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      {/* 대표 뱃지 */}
      {isRep && (
        <span className="absolute top-1.5 left-1.5 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          ★ 대표
        </span>
      )}

      {/* 순서 번호 */}
      <span className="absolute top-1.5 right-8 bg-black/40 text-white text-[10px] px-1.5 py-0.5 rounded">
        {index + 1}
      </span>

      {/* 삭제 버튼 */}
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="absolute top-1.5 right-1.5 flex items-center justify-center w-5 h-5 rounded-full
                   bg-black/50 hover:bg-red-500 text-white transition-colors z-10"
        aria-label="이미지 삭제"
      >
        <X className="w-3 h-3" />
      </button>
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
  const originalUrlsRef = useRef<string[]>([]); // 편집 시 원본 URL 보관 (스토리지 정리용)

  const [sido, setSido]         = useState("");
  const [sigungu, setSigungu]   = useState("");
  const [formData, setFormData] = useState({
    title:   "",
    address: "",
    rating:  "",
    summary: "",
  });

  // 단일 imageItems 배열로 신규·기존 이미지 통합 관리
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [uploading, setUploading]   = useState(false);

  const sigunguList = getSigunguBySido(sido);

  // ── 언마운트 시 blob URL 해제 ─────────────────────
  useEffect(() => {
    return () => {
      imageItems.forEach((item) => {
        if (item.kind === "new") URL.revokeObjectURL(item.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 수정 모드 초기값 세팅 ─────────────────────────
  useEffect(() => {
    if (!editId) return;
    fetchDestinationById(editId).then((existing) => {
      if (!existing) return;
      setFormData({
        title:   existing.title,
        address: existing.address,
        rating:  String(existing.rating),
        summary: existing.summary,
      });
      setSido(existing.sido);
      setSigungu(existing.sigungu);

      const loaded = existing.imageUrls ?? [];
      originalUrlsRef.current = loaded; // 원본 보관
      setImageItems(
        loaded.map((url) => ({
          kind: "existing" as const,
          id:   `existing-${url}`,
          url,
        }))
      );
    });
  }, [editId]);

  // ── dnd-kit 센서 (마우스·터치·키보드) ─────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setImageItems((items) => {
        const oldIdx = items.findIndex((i) => i.id === active.id);
        const newIdx = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIdx, newIdx);
      });
    }
  }, []);

  // ── 파일 선택 (누적 Append) ───────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - imageItems.length;
    if (remaining <= 0) {
      alert(`이미지는 최대 ${MAX_IMAGES}장까지 등록 가능합니다.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) {
      alert(`최대 ${MAX_IMAGES}장 제한으로 ${toAdd.length}장만 추가됩니다.`);
    }

    const newItems: NewImageItem[] = toAdd.map((file) => ({
      kind:       "new",
      id:         `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImageItems((prev) => [...prev, ...newItems]);
    // 같은 파일을 다시 추가할 수 있도록 input 초기화
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── 개별 이미지 제거 ─────────────────────────────
  const removeItem = useCallback((id: string) => {
    setImageItems((items) => {
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
    setImageItems([]);
    originalUrlsRef.current = [];
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── 제출 ─────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);

    try {
      // 1. 신규 파일 업로드
      const newItems = imageItems.filter((i): i is NewImageItem => i.kind === "new");
      const uploadedMap = new Map<string, string>(); // item.id → 업로드된 URL

      if (newItems.length > 0) {
        const urls = await uploadImages(newItems.map((i) => i.file));
        newItems.forEach((item, idx) => uploadedMap.set(item.id, urls[idx]));
      }

      // 2. 최종 URL 배열 (현재 순서 기준, [0] = 대표)
      const finalUrls = imageItems.map((item) =>
        item.kind === "new" ? uploadedMap.get(item.id)! : item.url
      );

      // 3. 편집 모드: 제거된 기존 이미지를 Storage에서 삭제
      if (isEditMode && originalUrlsRef.current.length > 0) {
        const removedUrls = originalUrlsRef.current.filter(
          (url) => !finalUrls.includes(url)
        );
        if (removedUrls.length > 0) await deleteStorageFiles(removedUrls);
      }

      // 4. DB 저장
      const payload = {
        title:     formData.title,
        sido,
        sigungu,
        address:   formData.address,
        summary:   formData.summary,
        rating:    formData.rating ? Number(formData.rating) : 5,
        imageUrls: finalUrls,
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

        {/* ── 이미지 업로드 ───────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700">
              이미지
              <span className="ml-1.5 text-xs text-slate-400 font-normal">
                최대 {MAX_IMAGES}장 · 드래그로 순서 변경 · 맨 앞이 대표 이미지
              </span>
            </label>
            <span className={`text-xs font-medium tabular-nums ${imageItems.length >= MAX_IMAGES ? "text-red-500" : "text-slate-400"}`}>
              {imageItems.length} / {MAX_IMAGES}
            </span>
          </div>

          {/* 파일 선택 버튼 */}
          <label
            className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors
              ${imageItems.length >= MAX_IMAGES
                ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                : "border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-500"}`}
          >
            <ImagePlus className="w-4 h-4" />
            <span className="text-sm font-medium">
              {imageItems.length >= MAX_IMAGES ? "최대 장수 도달" : "이미지 추가 (여러 장 선택 가능)"}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              disabled={imageItems.length >= MAX_IMAGES}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* 썸네일 그리드 (DnD) */}
          {imageItems.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-slate-400 mb-3">
                ↕ 드래그하여 순서를 바꾸세요. 첫 번째 이미지가 대표로 사용됩니다.
              </p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={imageItems.map((i) => i.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-3 gap-3">
                    {imageItems.map((item, index) => (
                      <SortableThumbnail
                        key={item.id}
                        item={item}
                        index={index}
                        onRemove={removeItem}
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
        </div>

        {/* 세 줄 요약 */}
        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-slate-700 mb-2">세 줄 요약</label>
          <textarea id="summary" value={formData.summary}
            onChange={(e) => setFormData((p) => ({ ...p, summary: e.target.value }))}
            placeholder={`여행지를 세 줄로 요약해 주세요.\n각 줄마다 엔터로 구분할 수 있습니다.`}
            rows={8}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 placeholder:text-slate-400 resize-y min-h-[180px]"
          />
        </div>

        {/* 제출 버튼 */}
        <div className="pt-4">
          <button type="submit" disabled={uploading}
            className="w-full py-4 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 disabled:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2">
            {uploading && <Loader2 className="w-5 h-5 animate-spin" />}
            {uploading ? "저장 중..." : isEditMode ? "수정하기" : "등록하기"}
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
