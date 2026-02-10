"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

interface ReceiptItem {
  name: string;
  price: number;
  category: string;
}

interface ReceiptData {
  storeName: string;
  date: string;
  totalAmount: number;
  items: ReceiptItem[];
}

export default function ReceiptReviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [editedItems, setEditedItems] = useState<ReceiptItem[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    // URLパラメータからレシートデータを取得
    const dataParam = searchParams.get("data");
    if (dataParam) {
      try {
        const data = JSON.parse(decodeURIComponent(dataParam));
        setReceiptData(data);
        setEditedItems(data.items || []);
      } catch (err) {
        console.error("データの解析エラー:", err);
        setError("レシートデータの読み込みに失敗しました");
      }
    }

    // カテゴリーを取得
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("type", "expense")
        .order("category_id");

      if (error) {
        console.error("カテゴリー取得エラー:", error);
      } else {
        setCategories(data as CategoryRow[]);
      }
    };

    fetchCategories();
  }, [user, authLoading, router, searchParams]);

  const handleCategoryChange = (index: number, newCategory: string) => {
    const newItems = [...editedItems];
    newItems[index].category = newCategory;
    setEditedItems(newItems);
  };

  const handleRegister = async () => {
    if (!user || !receiptData) return;

    setLoading(true);
    setError(null);

    try {
      // カテゴリーごとに商品を集計
      const categoryTotals = new Map<
        string,
        { category: CategoryRow; items: ReceiptItem[]; total: number }
      >();

      for (const item of editedItems) {
        const category = categories.find((cat) => cat.name === item.category);
        if (!category) continue;

        if (categoryTotals.has(item.category)) {
          const existing = categoryTotals.get(item.category)!;
          existing.items.push(item);
          existing.total += item.price;
        } else {
          categoryTotals.set(item.category, {
            category,
            items: [item],
            total: item.price,
          });
        }
      }

      // カテゴリーごとに1つの取引として登録
      for (const [, data] of categoryTotals) {
        const itemsList = data.items
          .map((item) => `${item.name} ¥${item.price}`)
          .join(", ");
        const memo = `${receiptData.storeName}\n${itemsList}`;

        console.log("📝 登録データ:", {
          user_id: user.id,
          type: "expense",
          amount: data.total,
          category_id: data.category.category_id,
          date: receiptData.date,
          memo: memo,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: insertData, error: insertError } = await (supabase as any)
          .from("transactions")
          .insert({
            user_id: user.id,
            type: "expense",
            amount: data.total,
            category_id: data.category.category_id,
            date: receiptData.date,
            memo: memo,
            created_at: new Date().toISOString(),
          })
          .select();

        if (insertError) {
          console.error("❌ Supabase挿入エラー:", insertError);
          throw new Error(`データベースエラー: ${insertError.message}`);
        }

        console.log("✅ 登録成功:", insertData);
      }

      console.log("🎉 全ての取引を登録しました");
      // 登録成功後、ダッシュボードに戻る
      router.push("/dashboard");
    } catch (err) {
      console.error("❌ 登録エラー:", err);
      const errorMessage =
        err instanceof Error ? err.message : "取引の登録に失敗しました";
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/input");
  };

  // カテゴリーごとの集計を計算
  const getCategorySummary = () => {
    const categoryTotals = new Map<string, number>();

    for (const item of editedItems) {
      if (categoryTotals.has(item.category)) {
        categoryTotals.set(
          item.category,
          categoryTotals.get(item.category)! + item.price,
        );
      } else {
        categoryTotals.set(item.category, item.price);
      }
    }

    return categoryTotals;
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!receiptData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-gray-600">レシートデータが見つかりません</p>
          <button
            onClick={() => router.push("/dashboard/input")}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            入力画面に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="mx-auto max-w-2xl p-4">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">
          レシート内容の確認
        </h1>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {/* レシート基本情報 */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-md">
          <h2 className="mb-3 text-lg font-bold text-gray-800">基本情報</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium text-gray-600">店名:</span>{" "}
              <span className="text-gray-800">{receiptData.storeName}</span>
            </p>
            <p>
              <span className="font-medium text-gray-600">日付:</span>{" "}
              <span className="text-gray-800">{receiptData.date}</span>
            </p>
            <p>
              <span className="font-medium text-gray-600">合計金額:</span>{" "}
              <span className="text-lg font-bold text-gray-800">
                ¥{receiptData.totalAmount.toLocaleString()}
              </span>
            </p>
          </div>
        </div>

        {/* 商品一覧 */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-md">
          <h2 className="mb-4 text-lg font-bold text-gray-800">商品一覧</h2>
          <div className="space-y-3">
            {editedItems.map((item, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{item.name}</p>
                    <p className="text-lg font-bold text-blue-600">
                      ¥{item.price.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">
                    カテゴリー
                  </label>
                  <select
                    value={item.category}
                    onChange={(e) =>
                      handleCategoryChange(index, e.target.value)
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.category_id} value={cat.name}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* カテゴリー別集計 */}
          <div className="mt-4 rounded-md bg-blue-50 p-3">
            <h3 className="mb-2 text-sm font-bold text-gray-700">
              カテゴリー別集計
            </h3>
            <div className="space-y-1">
              {Array.from(getCategorySummary()).map(([categoryName, total]) => {
                const category = categories.find(
                  (cat) => cat.name === categoryName,
                );
                return (
                  <div
                    key={categoryName}
                    className="flex justify-between text-sm"
                  >
                    <span>
                      {category?.icon} {categoryName}
                    </span>
                    <span className="font-medium">
                      ¥{total.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg">
          <div className="mx-auto flex max-w-2xl gap-3">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleRegister}
              disabled={loading}
              className="flex-1 rounded-md bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading
                ? "登録中..."
                : `${getCategorySummary().size}カテゴリーを登録`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
