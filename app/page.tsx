import type { Metadata } from "next";
import HomeClient from "@/components/home/HomeClient";
import { getAllDestinations } from "@/lib/server/destinations";
import { SITE_URL } from "@/constants/site";

// sitemap과 같은 주기로 목록 HTML 재생성
export const revalidate = 3600;

export const metadata: Metadata = {
  // 필터 쿼리(?sido=… 등)가 붙은 URL도 대표 주소는 메인 하나로
  alternates: { canonical: SITE_URL },
};

export default async function Home() {
  const destinations = await getAllDestinations();
  return <HomeClient destinations={destinations} />;
}
