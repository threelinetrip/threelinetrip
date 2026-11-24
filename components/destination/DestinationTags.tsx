"use client";

import { useRouter } from "next/navigation";
import TagChip from "@/components/TagChip";
import type { Tag } from "@/lib/db/schema";

/** 태그 칩 목록. 클릭 시 메인을 해당 태그로 필터링 */
export default function DestinationTags({ tags }: { tags: Tag[] }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-1.5 mb-6">
      {tags.map((tag) => (
        <TagChip
          key={tag.name}
          tag={tag.name}
          color={tag.color || undefined}
          onClick={() => router.push(`/?tag=${encodeURIComponent(tag.name)}`)}
        />
      ))}
    </div>
  );
}
