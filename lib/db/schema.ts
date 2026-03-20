/**
 * 세줄여행 - 여행지 테이블 스키마
 * destinations: 여행지 정보를 저장하는 테이블
 */

export interface Destination {
  /** 고유 ID (UUID 권장) */
  id: string;

  /** 여행지 제목 */
  title: string;

  /** 시도 (예: 서울특별시, 경기도) */
  sido: string;

  /** 시군구 (예: 강남구, 수원시) */
  sigungu: string;

  /** 상세 주소 */
  address: string;

  /** 세 줄 여행 (3줄로 요약한 여행지 설명) */
  summary: string;

  /** 평점 (0~5, 소수점 가능) */
  rating: number;

  /**
   * 이미지 URL 목록 (DB: image_urls jsonb)
   * imageUrls[0] 이 대표 이미지로 사용됩니다.
   */
  imageUrls: string[];

  /**
   * 사진별 출처 배열 (DB: image_credit jsonb → [{url, credit}] 객체 배열)
   * imageCredits[i] 가 imageUrls[i] 의 출처
   * 빈 문자열 = 해당 사진 출처 없음
   */
  imageCredits?: string[];

  /**
   * 태그 배열 (DB: tags text[])
   * 예: ["해변", "일출", "드라이브"]
   */
  tags?: string[];

  /** 조회수 */
  viewCount: number;

  /** 공유수 */
  shareCount: number;

  /** 생성일시 (ISO 8601) */
  createdAt?: string;

  /** 수정일시 (ISO 8601) */
  updatedAt?: string;
}

/** 새 여행지 생성 시 사용하는 입력 타입 (id, 조회수, 공유수는 서버에서 설정) */
export type DestinationCreateInput = Omit<
  Destination,
  "id" | "viewCount" | "shareCount" | "createdAt" | "updatedAt"
> & {
  viewCount?: number;
  shareCount?: number;
};
