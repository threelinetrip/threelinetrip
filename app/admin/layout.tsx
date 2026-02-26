"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { FilePlus, LayoutDashboard, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // 최초 세션 확인
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !isAdminEmail(user.email)) {
        router.replace("/login");
      } else {
        setChecking(false);
      }
    });

    // 로그아웃 등 세션 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session || !isAdminEmail(session.user.email)) {
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // 인증 확인 중 → 빈 화면 (깜박임 방지)
  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 관리자 전용 탭 네비 (전역 Header 아래에 고정) */}
      <div className="sticky top-14 z-40 bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4">
          <nav className="flex gap-1 py-2">
            <Link
              href="/admin/write"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/admin/write"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <FilePlus className="w-4 h-4" />
              새 글 등록하기
            </Link>
            <Link
              href="/admin"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/admin"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              게시글 관리
            </Link>
          </nav>
        </div>
      </div>

      {children}
    </div>
  );
}
