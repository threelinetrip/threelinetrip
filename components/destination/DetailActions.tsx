"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Share2, Check } from "lucide-react";
import { insertViewLog } from "@/lib/supabase";
import { getMainReturnUrl } from "@/lib/main-page-state";

interface DetailActionsProps {
  id: string;
  title: string;
}

/** 하단 "목록으로 돌아가기" + "공유하기" 버튼 */
export default function DetailActions({ id, title }: DetailActionsProps) {
  const router = useRouter();
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    let sharedOk = false;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        sharedOk = true;
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        sharedOk = true;
      }
    } catch {
      // 공유 취소 시 무시
    }
    if (sharedOk) insertViewLog(id, "share");
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => router.push(getMainReturnUrl())}
        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        목록으로 돌아가기
      </button>
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
  );
}
