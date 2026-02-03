import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // カテゴリーを取得してデータベース接続をテスト
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .limit(5);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "データベース接続成功！",
      categoriesCount: data.length,
      sampleCategories: data,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "サーバーエラー" },
      { status: 500 },
    );
  }
}
