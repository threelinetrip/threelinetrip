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
  };
}

/** Storage에 이미지 한 장 업로드 → 공개 URL 반환 */
export async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(`[Storage 업로드 실패] ${toErrorMessage(error)}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Storage에 이미지 여러 장 병렬 업로드 → 공개 URL 배열 반환 */
export async function uploadImages(files: File[]): Promise<string[]> {
  return Promise.all(files.map((f) => uploadImage(f)));
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
