"use client";

import { useEffect } from "react";
import { insertViewLog } from "@/lib/supabase";

/** 마운트 시 조회 로그 1회 기록. 화면에는 아무것도 그리지 않는다 */
export default function ViewLogger({ destinationId }: { destinationId: string | null }) {
  useEffect(() => {
    insertViewLog(destinationId);
  }, [destinationId]);
  return null;
}
