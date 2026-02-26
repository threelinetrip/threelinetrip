"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FilePlus, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isAdminEmail, signOut } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

const ADMIN_NAV = [
  { href: "/admin", label: "관리자 목록", icon: LayoutDashboard },
  { href: "/admin/write", label: "새 글 쓰기", icon: FilePlus },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 초기 세션 로드
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setReady(true);
    });

    // 세션 변경(로그인/로그아웃) 실시간 반영
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const admin = ready && isAdminEmail(user?.email);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-50 h-14 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* 왼쪽: 로고 */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/logo.png?v=1"
            alt="세줄여행"
            width={32}
            height={32}
            priority
            className="object-contain"
          />
          <span className="text-lg font-semibold tracking-tight text-slate-800 leading-none">
            세줄여행
          </span>
        </Link>

        {/* 오른쪽: 관리자 링크 (로그인 상태일 때만) + 로그인/로그아웃 */}
        <nav className="flex items-center gap-1">
          {/* 관리자 메뉴 - 관리자 계정으로 로그인한 경우만 표시 */}
          {admin &&
            ADMIN_NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(href)
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}

          {/* 구분선 */}
          {admin && (
            <span className="w-px h-5 bg-slate-200 mx-1" aria-hidden />
          )}

          {/* 관리자로 로그인된 경우에만 로그아웃 버튼 표시 */}
          {ready && admin && (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
