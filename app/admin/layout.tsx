import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";

// robots.txt의 Disallow와 별개로, 주소가 외부 링크로 알려져도 검색 결과에 오르지 않게 한다
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
