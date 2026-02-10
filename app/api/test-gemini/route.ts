import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "APIキーが設定されていません" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // 利用可能なモデルを試す
    const modelsToTry = [
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-pro-vision",
      "gemini-pro",
    ];

    const results = [];

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello");
        const response = await result.response;
        const text = response.text();
        results.push({
          model: modelName,
          status: "✅ 利用可能",
          response: text.substring(0, 50),
        });
      } catch (err) {
        results.push({
          model: modelName,
          status: "❌ エラー",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      apiKeySet: true,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "不明なエラー",
      },
      { status: 500 },
    );
  }
}
