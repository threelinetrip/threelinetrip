/**
 * 샘플 여행지 데이터 (DB 연결 전)
 * constants/regions.ts 시도·시군구 정보 활용
 */

import type { Destination } from "@/lib/db/schema";

export const SAMPLE_DESTINATIONS: Destination[] = [
  {
    id: "1",
    title: "강릉 안목해변",
    sido: "강원특별자치도",
    sigungu: "강릉시",
    address: "강원특별자치도 강릉시 연곡면 해변로",
    summary:
      "솔향 가득한 해송 숲과 맑은 바다가 어우러진 동해안의 대표 해수욕장.\n커피거리에서 산바람과 바다를 보며 여유로운 시간을.\n해돋이와 일몰이 모두 아름다운 로맨틱한 해변.",
    rating: 4.8,
    imageUrls: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"],
    viewCount: 0,
    shareCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "제주 성산일출봉",
    sido: "제주특별자치도",
    sigungu: "서귀포시",
    address: "제주특별자치도 서귀포시 성산읍 성산리",
    summary:
      "한라산 분화로 형성된 5천 년 된 솟대 모양의 UNESCO 세계자연유산.\n새벽 성산항에서 바라보는 일출은 일생의 추억이 되는 장관.\n들판과 바다가 한눈에 들어오는 전망이 압도적.",
    rating: 4.9,
    imageUrls: ["https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=800"],
    viewCount: 0,
    shareCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    title: "서울 경복궁",
    sido: "서울특별시",
    sigungu: "종로구",
    address: "서울특별시 종로구 사직로 161",
    summary:
      "조선의 정궁으로 600년 역사를 품은 대한민국 대표 궁궐.\n근정전·광화문 등 웅장한 한옥 건축의 진수를 만나다.\n사계절 각기 다른 아름다움, 특히 봄 벚꽃이 환상적.",
    rating: 4.7,
    imageUrls: ["https://images.unsplash.com/photo-1538485399081-7191377e8241?w=800"],
    viewCount: 0,
    shareCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getSampleDestinationById(id: string): Destination | undefined {
  return SAMPLE_DESTINATIONS.find((d) => d.id === id);
}
