import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { toDestination } from "@/lib/supabase";
import type { Destination } from "@/lib/db/schema";

/** uuid 형식이 아닌 id는 DB 조회 없이 미존재로 처리 (Postgres 22P02 에러 회피) */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("[server/destinations] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 미설정");
  }
  // 서버에는 로그인 세션이 없으므로 저장·갱신을 끈 읽기 전용 anon 클라이언트
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** 전체 여행지 (최신순). 조회 실패는 throw */
export const getAllDestinations = cache(async (): Promise<Destination[]> => {
  const { data, error } = await getServerClient()
    .from("destinations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`[목록 조회 실패] ${error.message}`);
  return (data ?? []).map(toDestination);
});

/**
 * 단일 여행지. 없으면 null, 조회 실패는 throw.
 * 일시 장애를 404로 응답하면 검색엔진이 페이지를 색인에서 지울 수 있어 둘을 구분한다.
 */
export const getDestinationById = cache(async (id: string): Promise<Destination | null> => {
  if (!UUID_RE.test(id)) return null;
  const { data, error } = await getServerClient()
    .from("destinations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`[여행지 조회 실패] ${error.message}`);
  return data ? toDestination(data as Record<string, unknown>) : null;
});
