import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "APIキーが設定されていません" });
    }

    // 利用可能なモデルのリストを取得
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: `API Error: ${response.status}`,
          details: errorText,
        },
        { status: response.status },
      );
    }

    const data = await response.json();

    // generateContentをサポートするモデルのみをフィルタリング
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelsWithGenerate = data.models?.filter((model: any) =>
      model.supportedGenerationMethods?.includes("generateContent"),
    );

    return NextResponse.json({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      allModels: data.models?.map((m: any) => ({
        name: m.name,
        displayName: m.displayName,
        supportedMethods: m.supportedGenerationMethods,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      modelsWithGenerateContent: modelsWithGenerate?.map((m: any) => ({
        name: m.name,
        displayName: m.displayName,
      })),
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
