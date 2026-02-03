import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// クライアントコンポーネント用
export const supabase = createSupabaseClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
);

// サーバーコンポーネント用（認証コールバック等で使用）
export function createClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);
}
