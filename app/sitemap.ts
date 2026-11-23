import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/site";
import { fetchAllDestinations } from "@/lib/supabase";

// 새 여행지가 배포 없이도 1시간 안에 sitemap에 반영되도록 재생성
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const destinations = await fetchAllDestinations();

  return [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
    ...destinations.map((d) => ({
      url: `${SITE_URL}/destination/${d.id}`,
      lastModified: d.updatedAt ?? d.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
