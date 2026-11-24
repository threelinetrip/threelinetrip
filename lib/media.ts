const VIDEO_EXTS = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"];

/** URL이 동영상인지 확장자로 판단 */
export function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase().split("?")[0];
  return VIDEO_EXTS.some((ext) => lower.endsWith(ext));
}

/** OG·JSON-LD용 이미지 URL만 추림. 동영상과 data: URL은 외부 크롤러가 쓸 수 없어 제외 */
export function pickShareableImages(urls: string[]): string[] {
  return urls.filter((u) => /^https?:\/\//i.test(u) && !isVideoUrl(u));
}
