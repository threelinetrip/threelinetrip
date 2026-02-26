"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Star, Loader2, X } from "lucide-react";
import { REGIONS, getSigunguBySido } from "@/constants/regions";
import {
  fetchDestinationById,
  insertDestination,
  updateDestinationById,
  uploadImages,
} from "@/lib/supabase";

/** 선택된 파일의 미리보기 Object URL 생성 */
function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/** 배열에서 특정 인덱스를 맨 앞으로 이동 */
function putFirst<T>(arr: T[], idx: number): T[] {
  if (idx <= 0 || idx >= arr.length) return arr;
  return [arr[idx], ...arr.slice(0, idx), ...arr.slice(idx + 1)];
}

function AdminWriteForm() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEditMode = !!editId;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);

  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    address: "",
    rating: "",
    summary: "",
  });

  // 새로 선택한 파일
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [newRepIdx, setNewRepIdx] = useState(0);        // 새 파일 중 대표 인덱스

  // 수정 모드: 기존 이미지 URL 목록 (imageUrls[0]이 현재 대표)
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [existingRepIdx, setExistingRepIdx] = useState(0); // 기존 이미지 중 대표 인덱스

  const [uploading, setUploading] = useState(false);
  const sigunguList = getSigunguBySido(sido);

  // 미리보기 Object URL 메모리 정리
  useEffect(() => {
    return () => { previewUrlsRef.current.forEach(URL.revokeObjectURL); };
  }, []);

  // 수정 모드 초기값 세팅
  useEffect(() => {
    if (!editId) return;
    fetchDestinationById(editId).then((existing) => {
      if (!existing) return;
      setFormData({
        title: existing.title,
        address: existing.address,
        rating: String(existing.rating),
        summary: existing.summary,
      });
      setSido(existing.sido);
      setSigungu(existing.sigungu);
      setExistingUrls(existing.imageUrls ?? []);
      setExistingRepIdx(0);
    });
  }, [editId]);

  const handleSidoChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSido(e.target.value);
      setSigungu("");
    },
    []
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    previewUrlsRef.current.forEach(URL.revokeObjectURL);
    const urls = files.map(createPreviewUrl);
    previewUrlsRef.current = urls;
    setImageFiles(files);
    setPreviews(urls);
    setNewRepIdx(0);
  };

  const removeNewFile = (idx: number) => {
    URL.revokeObjectURL(previews[idx]);
    const newFiles = imageFiles.filter((_, i) => i !== idx);
    const newPreviews = previews.filter((_, i) => i !== idx);
    setImageFiles(newFiles);
    setPreviews(newPreviews);
    setNewRepIdx((prev) => (prev >= newFiles.length ? Math.max(0, newFiles.length - 1) : prev));
  };

  const resetForm = () => {
    setFormData({ title: "", address: "", rating: "", summary: "" });
    setSido(""); setSigungu("");
    setImageFiles([]); setPreviews([]);
    setExistingUrls([]); setExistingRepIdx(0); setNewRepIdx(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);

    let finalUrls: string[] = [];

    // ── 1단계: 이미지 결정 ──────────────────────────────
    if (imageFiles.length > 0) {
      // 새 파일이 있으면 Storage에 업로드
      try {
        const uploaded = await uploadImages(imageFiles);
        // 대표 이미지를 맨 앞으로 재배열
        finalUrls = putFirst(uploaded, newRepIdx);
      } catch (err) {
        const msg = err instanceof Error ? err.message : JSON.stringify(err);
        console.error("[이미지 업로드 오류]", err);
        alert(
          `이미지 업로드 중 오류가 발생했습니다:\n\n${msg}\n\n` +
          `▶ Supabase Storage 버킷(destinations)이 생성되어 있는지 확인하세요.\n` +
          `▶ supabase/add_image_urls.sql을 실행했는지 확인하세요.`
        );
        setUploading(false);
        return;
      }
    } else if (existingUrls.length > 0) {
      // 기존 이미지 유지, 선택한 대표를 맨 앞으로
      finalUrls = putFirst(existingUrls, existingRepIdx);
    }

    // ── 2단계: DB 저장 ────────────────────────────────────
    const payload = {
      title: formData.title,
      sido,
      sigungu,
      address: formData.address,
      summary: formData.summary,
      rating: formData.rating ? Number(formData.rating) : 5,
      imageUrls: finalUrls,
    };

    try {
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
      console.error("[DB 저장 오류]", err);
      alert(
        `데이터 저장 중 오류가 발생했습니다:\n\n${msg}\n\n` +
        `▶ Supabase SQL Editor에서 add_image_urls.sql을 실행했는지 확인하세요.\n` +
        `▶ destinations 테이블의 RLS 정책을 확인하세요.`
      );
    } finally {
      setUploading(false);
    }
  };

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
            id="title" type="text" value={formData.title}
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

        {/* 이미지 업로드 */}
        <div>
          <label htmlFor="image" className="block text-sm font-medium text-slate-700 mb-2">
            이미지
            <span className="ml-1.5 text-xs text-slate-400 font-normal">
              여러 장 선택 가능 · 대표 이미지가 카드에 표시됩니다
            </span>
          </label>

          <input
            ref={fileInputRef} id="image" type="file" accept="image/*" multiple
            onChange={handleFileChange}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:text-sm file:font-medium hover:file:bg-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
          />

          {/* 새로 선택한 파일 미리보기 */}
          {previews.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500 mb-3">
                선택된 이미지 ({previews.length}장) — 대표 이미지를 선택하세요
              </p>
              <div className="grid grid-cols-3 gap-3">
                {previews.map((url, i) => (
                  <div key={i}
                    className={`relative rounded-xl overflow-hidden border-2 transition-colors ${newRepIdx === i ? "border-amber-400" : "border-slate-200"}`}>
                    <div className="relative aspect-[4/3]">
                      <img src={url} alt={`미리보기 ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-2 flex items-center justify-between bg-white">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="newRepImage" value={i}
                          checked={newRepIdx === i}
                          onChange={() => setNewRepIdx(i)}
                          className="w-3.5 h-3.5 accent-amber-400"
                        />
                        <span className={`text-xs font-medium ${newRepIdx === i ? "text-amber-600" : "text-slate-500"}`}>
                          {newRepIdx === i ? "★ 대표" : "대표"}
                        </span>
                      </label>
                      <button type="button" onClick={() => removeNewFile(i)}
                        className="p-0.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="absolute top-1.5 left-1.5 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 수정 모드: 기존 이미지 (새 파일 선택 전까지 표시) */}
          {isEditMode && imageFiles.length === 0 && existingUrls.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500 mb-3">
                기존 이미지 ({existingUrls.length}장) — 대표 이미지를 변경하거나 새 파일을 선택하세요
              </p>
              <div className="grid grid-cols-3 gap-3">
                {existingUrls.map((url, i) => (
                  <div key={i}
                    className={`relative rounded-xl overflow-hidden border-2 transition-colors ${existingRepIdx === i ? "border-amber-400" : "border-slate-200"}`}>
                    <div className="relative aspect-[4/3]">
                      <Image src={url} alt={`기존 ${i + 1}`} fill className="object-cover" />
                    </div>
                    <div className="p-2 bg-white">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="existingRepImage" value={i}
                          checked={existingRepIdx === i}
                          onChange={() => setExistingRepIdx(i)}
                          className="w-3.5 h-3.5 accent-amber-400"
                        />
                        <span className={`text-xs font-medium ${existingRepIdx === i ? "text-amber-600" : "text-slate-500"}`}>
                          {existingRepIdx === i ? "★ 대표" : "대표"}
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
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

        {/* 버튼 */}
        <div className="pt-4">
          <button type="submit" disabled={uploading}
            className="w-full py-4 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 disabled:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2">
            {uploading && <Loader2 className="w-5 h-5 animate-spin" />}
            {uploading ? "업로드 중..." : isEditMode ? "수정하기" : "등록하기"}
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
