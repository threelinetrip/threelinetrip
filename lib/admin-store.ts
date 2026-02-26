/**
 * 관리자용 여행지 데이터 저장소 (localStorage)
 * DB 연동 전 임시 저장소
 */

import type { Destination } from "@/lib/db/schema";
import { SAMPLE_DESTINATIONS } from "@/constants/sample-destinations";

const STORAGE_KEY = "sejul-yeoheng-destinations";

function getStored(): Destination[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStored(items: Destination[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getAllDestinations(): Destination[] {
  return getStored();
}

export function getDestinationById(id: string): Destination | undefined {
  return getStored().find((d) => d.id === id);
}

export function createDestination(
  data: Omit<Destination, "id" | "viewCount" | "shareCount" | "createdAt" | "updatedAt">
): Destination {
  const items = getStored();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const newItem: Destination = {
    ...data,
    id,
    viewCount: 0,
    shareCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  items.push(newItem);
  setStored(items);
  return newItem;
}

export function updateDestination(
  id: string,
  data: Partial<Omit<Destination, "id" | "viewCount" | "shareCount" | "createdAt">>
): Destination | null {
  const items = getStored();
  const idx = items.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  const updated: Destination = {
    ...items[idx],
    ...data,
    id: items[idx].id,
    viewCount: items[idx].viewCount,
    shareCount: items[idx].shareCount,
    createdAt: items[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  items[idx] = updated;
  setStored(items);
  return updated;
}

export function deleteDestination(id: string): boolean {
  const items = getStored().filter((d) => d.id !== id);
  if (items.length === getStored().length) return false;
  setStored(items);
  return true;
}

/** 초기 샘플 데이터 - constants/sample-destinations.ts 활용 */
export function seedSampleDataIfEmpty(): void {
  const { SAMPLE_DESTINATIONS } = require("@/constants/sample-destinations");
  if (typeof window === "undefined") return;
  const items = getStored();
  if (items.length > 0) return;
  setStored(SAMPLE_DESTINATIONS);
}
