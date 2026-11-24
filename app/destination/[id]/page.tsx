import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, Sparkles } from "lucide-react";
import MediaGallery from "@/components/destination/MediaGallery";
import RatingGuide from "@/components/destination/RatingGuide";
import DetailActions from "@/components/destination/DetailActions";
import DestinationTags from "@/components/destination/DestinationTags";
import ViewLogger from "@/components/destination/ViewLogger";
import { getDestinationById } from "@/lib/server/destinations";
import { pickShareableImages } from "@/lib/media";
import { TAGS_VISIBLE } from "@/constants/feature-flags";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from "@/constants/site";
import type { Destination } from "@/lib/db/schema";

// sitemap과 같은 주기로 HTML 재생성 (관리자 수정은 최대 1시간 뒤 반영)
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

// 구글 검색 결과에 description이 잘리지 않고 노출되는 대략적인 길이
const DESCRIPTION_MAX = 150;

function getSummaryLines(d: Destination): string[] {
  return d.summary.split("\n").map((l) => l.trim()).filter(Boolean);
}

/** "장수동 은행나무 - 인천광역시 남동구" (지역이 비어 있으면 이름만) */
function buildPageTitle(d: Destination): string {
  const region = [d.sido, d.sigungu].map((s) => s.trim()).filter(Boolean).join(" ");
  return region ? `${d.title} - ${region}` : d.title;
}

/** 최대 길이를 넘으면 단어 경계에서 자르고 "…"를 붙인다 */
function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  // 공백이 너무 앞에 있으면(긴 단어) 그냥 글자 수로 자른다
  const end = lastSpace > max * 0.6 ? lastSpace : max;
  return `${cut.slice(0, end).trimEnd()}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const d = await getDestinationById(id);
  if (!d) return {};

  const url = `${SITE_URL}/destination/${d.id}`;
  const description = truncateAtWord(getSummaryLines(d).join(" "), DESCRIPTION_MAX);
  const pageTitle = buildPageTitle(d);
  const fullTitle = `${pageTitle} | ${SITE_NAME}`;
  const images = pickShareableImages(d.imageUrls);
  const ogImage = images[0] ?? DEFAULT_OG_IMAGE;

  // openGraph·twitter는 layout 값과 병합되지 않고 통째로 대체되므로 모든 필드를 다시 적는다
  return {
    title: pageTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: "ko_KR",
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: [{ url: ogImage, alt: d.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
    },
  };
}

function buildJsonLd(d: Destination) {
  const images = pickShareableImages(d.imageUrls);
  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: d.title,
    description: getSummaryLines(d).join(" "),
    url: `${SITE_URL}/destination/${d.id}`,
    ...(images.length > 0 && { image: images }),
    address: {
      "@type": "PostalAddress",
      addressCountry: "KR",
      addressRegion: d.sido,
      addressLocality: d.sigungu,
      ...(d.address && { streetAddress: d.address }),
    },
  };
}

export default async function DestinationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const destination = await getDestinationById(id);
  if (!destination) notFound();

  const summaryLines = getSummaryLines(destination);
  const tags = (destination.tags ?? []).filter((t) => t?.name?.trim());
  // "<" 이스케이프: 데이터에 </script>가 있어도 스크립트 태그를 벗어나지 못하게
  const jsonLd = JSON.stringify(buildJsonLd(destination)).replace(/</g, "\\u003c");

  return (
    <main className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <ViewLogger destinationId={destination.id} />
      <div className="max-w-2xl mx-auto px-4 py-8">

        <MediaGallery
          media={destination.imageUrls}
          credits={destination.imageCredits ?? []}
          title={destination.title}
        />

        {/* 여행지 이름 */}
        <h1 className="text-2xl font-bold text-slate-900 mb-3">{destination.title}</h1>

        <RatingGuide rating={destination.rating} />

        {/* 지역 정보 */}
        <div className="flex items-center gap-2 text-slate-500 text-sm mb-8">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>
            {destination.sido} {destination.sigungu}
            {destination.address && ` · ${destination.address}`}
          </span>
        </div>

        {TAGS_VISIBLE && tags.length > 0 && <DestinationTags tags={tags} />}

        {/* 세 줄 여행 */}
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-800">세 줄 여행</h2>
          </div>
          <div className="space-y-3">
            {summaryLines.map((line, i) => (
              <p key={i} className="text-slate-700 leading-relaxed">{line}</p>
            ))}
          </div>
        </div>

        <DetailActions id={destination.id} title={destination.title} />
      </div>
    </main>
  );
}
