import { createClient } from "@supabase/supabase-js";
import type { Destination } from "@/lib/db/schema";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKET = "destinations";

/** Supabase 에러 객체 → 사람이 읽을 수 있는 문자열 변환 */
function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const parts: string[] = [];
    if (e.message) parts.push(String(e.message));
    if (e.code) parts.push(`코드: ${e.code}`);
    if (e.details) parts.push(`상세: ${e.details}`);
    if (e.hint) parts.push(`힌트: ${e.hint}`);
    if (parts.length) return parts.join(" | ");
    return JSON.stringify(err);
  }
  return String(err);
}

/**
 * DB 컬럼(snake_case) → 앱 타입(camelCase) 변환
 * DB에는 image_urls(jsonb) 만 존재. imageUrls[0] 이 대표 이미지.
 */
export function toDestination(row: Record<string, unknown>): Destination {
  const rawUrls = row.image_urls;
  const imageUrls: string[] = Array.isArray(rawUrls) ? (rawUrls as string[]) : [];
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    sido: String(row.sido ?? ""),
    sigungu: String(row.sigungu ?? ""),
    address: String(row.address ?? ""),
    summary: String(row.summary ?? ""),
    rating: Number(row.rating ?? 0),
    imageUrls,
    // main_tag: null / undefined → undefined (상세 페이지에서 조건부 렌더링)
    mainTag: row.main_tag ? String(row.main_tag) : undefined,
    viewCount: Number(row.view_count ?? 0),
    shareCount: Number(row.share_count ?? 0),
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

/** 앱 타입(camelCase) → DB 컬럼(snake_case) 변환 */
export function toDbRow(
  data: Omit<Destination, "id" | "viewCount" | "shareCount" | "createdAt" | "updatedAt">
) {
  return {
    title: data.title,
    sido: data.sido,
    sigungu: data.sigungu,
    address: data.address,
    summary: data.summary,
    rating: data.rating,
    image_urls: data.imageUrls,
    // 빈 문자열은 null 로 저장 (DB 조회 일관성 유지)
    main_tag: data.mainTag?.trim() || null,
  };
}

/** 기존 게시글에서 사용된 태그 목록 반환 (datalist 자동완성용) */
export async function fetchAllTags(): Promise<string[]> {
  const { data } = await supabase
    .from("destinations")
    .select("main_tag")
    .not("main_tag", "is", null);
  if (!data) return [];
  const tags = data
    .map((r: { main_tag: string | null }) => r.main_tag)
    .filter(Boolean) as string[];
  return [...new Set(tags)].sort((a, b) => a.localeCompare(b));
}

/**
 * Storage에 파일 한 개 업로드 → 공개 URL 반환
 * - 이미지·동영상 모두 지원 (file.type 으로 MIME 타입 자동 지정)
 */
export async function uploadFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw new Error(`[Storage 업로드 실패] ${toErrorMessage(error)}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** 하위 호환 — 이미지 단일 업로드 */
export async function uploadImage(file: File): Promise<string> {
  return uploadFile(file);
}

/** 여러 파일 병렬 업로드 */
export async function uploadImages(files: File[]): Promise<string[]> {
  return Promise.all(files.map((f) => uploadFile(f)));
}

/**
 * 여러 파일 순차 업로드 + 진행률 콜백 (0 → 100)
 * - 파일 수가 많거나 동영상처럼 용량이 클 때 프로그레스 바에 활용
 */
export async function uploadFilesWithProgress(
  files: File[],
  onProgress: (percent: number) => void
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    urls.push(await uploadFile(files[i]));
    onProgress(Math.round(((i + 1) / files.length) * 100));
  }
  return urls;
}

/**
 * Storage에서 이미지 파일 삭제 (편집 시 제거된 기존 이미지 정리용)
 * - URL 에서 버킷 이후 경로를 추출해 remove 호출
 * - 실패해도 저장 흐름에 영향 없도록 warn 처리
 */
export async function deleteStorageFiles(urls: string[]): Promise<void> {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const paths = urls
    .map((url) => {
      const idx = url.indexOf(marker);
      return idx !== -1 ? url.slice(idx + marker.length) : null;
    })
    .filter(Boolean) as string[];

  if (paths.length === 0) return;

  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) console.warn("[Storage 파일 삭제 실패]", toErrorMessage(error));
}

/** 전체 여행지 조회 */
export async function fetchAllDestinations(): Promise<Destination[]> {
  const { data, error } = await supabase
    .from("destinations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`[목록 조회 실패] ${toErrorMessage(error)}`);
  return (data ?? []).map(toDestination);
}

/** ID로 단일 여행지 조회 */
export async function fetchDestinationById(id: string): Promise<Destination | null> {
  const { data, error } = await supabase
    .from("destinations")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return toDestination(data);
}

/** 여행지 등록 */
export async function insertDestination(
  data: Omit<Destination, "id" | "viewCount" | "shareCount" | "createdAt" | "updatedAt">
): Promise<Destination> {
  const row = toDbRow(data);
  console.log("[insertDestination] 전송 데이터:", row);
  const { data: created, error } = await supabase
    .from("destinations")
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(`[DB 등록 실패] ${toErrorMessage(error)}`);
  return toDestination(created);
}

/** 여행지 수정 */
export async function updateDestinationById(
  id: string,
  data: Omit<Destination, "id" | "viewCount" | "shareCount" | "createdAt" | "updatedAt">
): Promise<Destination> {
  const row = toDbRow(data);
  console.log("[updateDestinationById] 전송 데이터:", row);
  const { data: updated, error } = await supabase
    .from("destinations")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`[DB 수정 실패] ${toErrorMessage(error)}`);
  return toDestination(updated);
}

/** 여행지 삭제 */
export async function deleteDestinationById(id: string): Promise<void> {
  const { error } = await supabase.from("destinations").delete().eq("id", id);
  if (error) throw new Error(`[DB 삭제 실패] ${toErrorMessage(error)}`);
}

/**
 * 페이지 조회·공유 로그 기록 (fire-and-forget)
 * - eventType: 'view'(기본) | 'share'
 * - 상세 페이지: destinationId에 UUID 전달
 * - 메인 페이지:  destinationId에 null 전달
 */
export async function insertViewLog(
  destinationId: string | null,
  eventType: "view" | "share" = "view"
): Promise<void> {
  const userAgent =
    typeof navigator !== "undefined" ? navigator.userAgent : "";
  const referrer =
    typeof document !== "undefined" ? document.referrer : "";

  const { error } = await supabase.from("view_logs").insert({
    destination_id: destinationId,
    user_agent: userAgent,
    referrer: referrer,
    event_type: eventType,
  });

  if (error) {
    console.warn("[view_log 기록 실패]", toErrorMessage(error));
  }
}

// ──────────────────────────────────────────────
// 관리자 대시보드 통계
// ──────────────────────────────────────────────

export interface DashboardStats {
  /** event_type='view' 전체 건수 */
  totalViews: number;
  /** event_type='share' 전체 건수 */
  totalShares: number;
  /** destination_id IS NULL (메인 페이지 방문) */
  mainPageViews: number;
  /** destination_id IS NOT NULL (상세 페이지 조회) */
  detailPageViews: number;
  /** 게시글별 { views, shares } 맵 */
  destStats: Record<string, { views: number; shares: number }>;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [totalViewsRes, totalSharesRes, mainRes, detailRes, destRes] =
    await Promise.all([
      supabase
        .from("view_logs")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "view"),
      supabase
        .from("view_logs")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "share"),
      supabase
        .from("view_logs")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "view")
        .is("destination_id", null),
      supabase
        .from("view_logs")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "view")
        .not("destination_id", "is", null),
      supabase.rpc("get_destination_stats"),
    ]);

  const destStats: Record<string, { views: number; shares: number }> = {};
  if (destRes.data) {
    for (const row of destRes.data as Array<{
      destination_id: string;
      view_count: number;
      share_count: number;
    }>) {
      destStats[row.destination_id] = {
        views: Number(row.view_count),
        shares: Number(row.share_count),
      };
    }
  }

  return {
    totalViews: totalViewsRes.count ?? 0,
    totalShares: totalSharesRes.count ?? 0,
    mainPageViews: mainRes.count ?? 0,
    detailPageViews: detailRes.count ?? 0,
    destStats,
  };
}
