import type { Tag } from "@/lib/db/schema";

/** 검색·비교용 — 어떤 값이 와도 안전하게 소문자 문자열 */
export function safeLower(s: unknown): string {
  return String(s ?? "").toLowerCase();
}

// 한글 자모 분해 (부분 음절 검색 지원: "도"가 "동"에도 매칭되도록)
const HANGUL_CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const HANGUL_JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const HANGUL_JONG = "\u0000ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";

/** 문자열을 한글 자모 시퀀스로 분해 (완성형 음절 → 초·중·종성) */
function decomposeHangul(str: string): string {
  let out = "";
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const s = code - 0xac00;
      const cho = Math.floor(s / 588);
      const jung = Math.floor((s % 588) / 28);
      const jong = s % 28;
      out += HANGUL_CHO[cho] + HANGUL_JUNG[jung] + (jong ? HANGUL_JONG[jong] : "");
    } else {
      out += ch.toLowerCase();
    }
  }
  return out;
}

/**
 * 한글 부분 음절까지 매칭하는 포함 검색
 * - "도" 입력 시 "동해", "도시" 모두 매칭
 * - 초성만 입력해도(ㄷ) 매칭
 */
export function hangulIncludes(text: unknown, query: unknown): boolean {
  const q = String(query ?? "").trim();
  if (!q) return true;
  return decomposeHangul(String(text ?? "")).includes(decomposeHangul(q));
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
