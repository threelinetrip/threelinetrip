import { supabase } from "@/lib/supabase";

/** 관리자로 허용된 이메일 */
export const ADMIN_EMAIL = "threelinetrip@gmail.com";

/** 관리자 이메일인지 확인 */
export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}

/** 이메일 + 비밀번호 로그인 */
export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

/** 로그아웃 */
export async function signOut() {
  return supabase.auth.signOut();
}

/** 현재 로그인된 유저 반환 (없으면 null) */
export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
