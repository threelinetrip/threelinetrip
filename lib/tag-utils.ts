import type { Tag } from "@/lib/db/schema";

/** 검색·비교용 — 어떤 값이 와도 안전하게 소문자 문자열 */
export function safeLower(s: unknown): string {
  return String(s ?? "").toLowerCase();
}

/**
 * DB·상태에서 올 수 있는 태그 표현을 문자열 라벨로 통일
 * - 구버전: string
 * - 신버전: { name, color }
 * - 비정상 JSON(name이 숫자 등)도 String()으로 흡수
 */
export function tagStringLabel(t: unknown): string {
  if (t == null) return "";
  if (typeof t === "string") return t.trim();
  if (typeof t === "object" && "name" in (t as object)) {
    const n = (t as { name?: unknown }).name;
    if (typeof n === "string") return n.trim();
    if (n != null) return String(n).trim();
  }
  return "";
}

export function tagColorFromUnknown(t: unknown): string {
  if (t && typeof t === "object" && "color" in (t as object)) {
    return String((t as { color?: unknown }).color ?? "");
  }
  return "";
}

/**
 * API/상태에 섞인 string | 객체 | null 을 항상 Tag[] 로 통일 (관리자 폼·자동완성용)
 */
export function normalizeTagArray(raw: unknown): Tag[] {
  if (!Array.isArray(raw)) return [];
  const out: Tag[] = [];
  for (const item of raw) {
    const name = tagStringLabel(item);
    if (!name) continue;
    out.push({ name, color: tagColorFromUnknown(item) });
  }
  return out;
}
