import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables are missing!");
  console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl);
  console.error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY:",
    supabaseAnonKey ? "***set***" : "missing",
  );
}

// クライアントコンポーネント用
export const supabase = createSupabaseClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    db: {
      schema: 'public'
    }
  }
);

// サーバーコンポーネント用（認証コールバック等で使用）
export function createClient() {
  return createSupabaseClient<Database>(
    supabaseUrl, 
    supabaseAnonKey,
    {
      db: {
        schema: 'public'
      }
    }
  );
}
