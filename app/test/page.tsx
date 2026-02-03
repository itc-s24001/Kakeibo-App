"use client";

import { useEffect, useState } from "react";

type SuccessResult = {
  success: true;
  message: string;
  categoriesCount: number;
  sampleCategories: {
    category_id: string;
    icon: string;
    name: string;
    type: string;
    color: string;
  }[];
};
type ErrorResult = {
  success: false;
  error: string;
};
type ResultType = SuccessResult | ErrorResult;

export default function TestPage() {
  const [result, setResult] = useState<ResultType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/test-db")
      .then((res) => res.json())
      .then((data) => {
        setResult(data);
        setLoading(false);
      })
      .catch((error) => {
        setResult({ success: false, error: error.message });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">接続テスト中...</div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">データベース接続テスト</h1>

      <div
        className={`p-6 rounded-lg ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
      >
        <h2 className="text-xl font-semibold mb-4">
          {result.success ? "✅ 成功" : "❌ 失敗"}
        </h2>

        {result.success ? (
          <div>
            <p className="mb-2">メッセージ: {result.message}</p>
            <p className="mb-4">
              取得したカテゴリー数: {result.categoriesCount}
            </p>

            <h3 className="font-semibold mb-2">サンプルカテゴリー:</h3>
            <div className="space-y-2">
              {result.sampleCategories?.map((cat) => (
                <div
                  key={cat.category_id}
                  className="flex items-center gap-3 p-3 bg-white rounded"
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="font-medium">{cat.name}</span>
                  <span className="text-sm text-gray-500">({cat.type})</span>
                  <span
                    className="w-6 h-6 rounded-full ml-auto"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-red-600">エラー: {result.error}</p>
          </div>
        )}
      </div>

      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">完全なレスポンス:</h3>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    </div>
  );
}
