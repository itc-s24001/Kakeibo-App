import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

// Supabaseクライアント
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        { error: "画像ファイルが見つかりません" },
        { status: 400 },
      );
    }

    console.log("📸 レシート画像受信:", file.name, file.type, file.size);

    // データベースから支出カテゴリーを取得
    const { data: categories, error: categoryError } = await supabase
      .from("categories")
      .select("name")
      .eq("type", "expense")
      .returns<{ name: string }[]>();

    if (categoryError) {
      console.error("❌ カテゴリー取得エラー:", categoryError);
      return NextResponse.json(
        {
          error: "カテゴリーの取得に失敗しました",
          details: categoryError.message,
        },
        { status: 500 },
      );
    }

    const categoryNames =
      categories?.map((cat) => cat.name).join("\n       * ") || "その他";
    console.log("📋 取得したカテゴリー:", categoryNames);

    // APIキーの確認
    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEYが設定されていません");
      return NextResponse.json(
        { error: "APIキーが設定されていません" },
        { status: 500 },
      );
    }

    // ファイルをBase64に変換
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");
    console.log("✅ 画像をBase64に変換完了");

    // Gemini 2.5 Flash を使用（最新の画像解析対応モデル）
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const prompt = `
この画像はレシートです。以下の情報をJSON形式で抽出してください：

1. 店舗名 (storeName)
2. 日付 (date: YYYY-MM-DD形式)
3. 合計金額 (totalAmount: 数値のみ)
4. 商品一覧 (items: 配列)
   - 各商品について:
     - 商品名 (name)
     - 金額 (price: 数値のみ)
     - カテゴリー (category: 以下から選択)
       * ${categoryNames}

レシートが読み取れない場合や不明な項目がある場合は、該当項目をnullにしてください。

必ず以下のJSON形式で返してください（他の説明は不要）:
{
  "storeName": "店舗名",
  "date": "YYYY-MM-DD",
  "totalAmount": 金額,
  "items": [
    {
      "name": "商品名",
      "price": 金額,
      "category": "カテゴリー名"
    }
  ]
}
`;

    console.log("🤖 Gemini APIを呼び出し中...");

    const apiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: file.type,
                  data: base64Image,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("❌ Gemini API エラー:", errorText);
      throw new Error(
        `Gemini API エラー: ${apiResponse.status} - ${errorText}`,
      );
    }

    const apiResult = await apiResponse.json();
    console.log("📄 Geminiからの応答:", apiResult);

    const text = apiResult.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Geminiからのレスポンスが空です");
    }

    // JSONを抽出（マークダウンのコードブロックを除去）
    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\n/, "").replace(/\n```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\n/, "").replace(/\n```$/, "");
    }

    console.log("🔍 抽出したJSON:", jsonText);
    const receiptData = JSON.parse(jsonText);
    console.log("✅ レシート解析成功:", receiptData);

    return NextResponse.json({
      success: true,
      data: receiptData,
    });
  } catch (error) {
    console.error("❌ レシート解析エラー:", error);
    return NextResponse.json(
      {
        error: "レシートの解析に失敗しました",
        details: error instanceof Error ? error.message : "不明なエラー",
      },
      { status: 500 },
    );
  }
}
