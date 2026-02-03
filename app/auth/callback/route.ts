import { createClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // URLをダッシュボードにリダイレクト
  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
