"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Camera } from "lucide-react";
import type { Database } from "@/types/database";

type TransactionType = "income" | "expense";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export default function TransactionInputPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [transactionType, setTransactionType] =
    useState<TransactionType>("income");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [memo, setMemo] = useState("");
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("type", transactionType)
        .order("display_order");

      if (error) {
        console.error("カテゴリー取得エラー:", error);
      } else if (data) {
        // supabase client は lib/supabase.ts で Database を指定しているので型が推論されるはず
        const cats = data as CategoryRow[];
        setCategories(cats);
        // カテゴリーが変わったら最初のカテゴリーを選択
        if (cats.length > 0) {
          setCategoryId(cats[0].category_id);
        }
      }
    };

    fetchCategories();
  }, [transactionType]);

  const handleReceiptUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingReceipt(true);
    setError(null);

    try {
      console.log("📤 レシート画像を送信中:", file.name);

      // レシート画像をAPIに送信
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/analyze-receipt", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("📥 API応答:", result);

      if (!result.success || !result.data) {
        const errorMsg = result.details
          ? `${result.error}: ${result.details}`
          : result.error || "レシートの解析に失敗しました";
        throw new Error(errorMsg);
      }

      const receiptData = result.data;

      console.log("✅ レシート読み取り成功！");

      // レシート確認ページに遷移
      const dataParam = encodeURIComponent(JSON.stringify(receiptData));
      router.push(`/dashboard/input/receipt-review?data=${dataParam}`);
    } catch (err) {
      console.error("❌ レシート処理エラー:", err);
      setError(
        err instanceof Error ? err.message : "レシートの読み取りに失敗しました",
      );
    } finally {
      setIsProcessingReceipt(false);
      // input をリセット
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    // バリデーション
    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setError("金額を正しく入力してください");
      setLoading(false);
      return;
    }
    if (categoryId === null) {
      setError("カテゴリーを選択してください");
      setLoading(false);
      return;
    }

    const values: Database["public"]["Tables"]["transactions"]["Insert"] = {
      user_id: user.id,
      type: transactionType,
      amount: parsedAmount,
      category_id: categoryId,
      date: date,
      memo: memo || null,
    };

    // 型の不整合があったときに動作確認していた形に戻す
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("transactions")
      .insert([values]);

    if (error) {
      setError("保存に失敗しました: " + error.message);
    } else {
      setSuccess(true);
      // フォームをリセット
      setAmount("");
      setMemo("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      // 3秒後に成功メッセージを消す
      setTimeout(() => setSuccess(false), 3000);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー */}
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">ためるん</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-base text-gray-600 hover:text-gray-900"
            >
              ログアウト
            </button>
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
            入力
          </h2>

          {/* 成功メッセージ */}
          {success && (
            <div className="mb-4 rounded-md bg-green-50 p-4">
              <p className="text-sm text-green-800">保存しました！</p>
            </div>
          )}

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 収入/支出切り替え */}
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => setTransactionType("income")}
                className={`rounded-md px-8 py-2 font-medium ${
                  transactionType === "income"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                収入
              </button>
              <button
                type="button"
                onClick={() => setTransactionType("expense")}
                className={`rounded-md px-8 py-2 font-medium ${
                  transactionType === "expense"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                支出
              </button>
            </div>

            {/* レシート読み取りボタン（支出の場合のみ表示） */}
            {transactionType === "expense" && (
              <div>
                <label
                  htmlFor="receipt-upload"
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-blue-600 transition-colors hover:border-blue-400 hover:bg-blue-100"
                >
                  <Camera className="h-5 w-5" />
                  <span className="font-medium">
                    {isProcessingReceipt ? "処理中..." : "レシートを読み取る"}
                  </span>
                </label>
                <input
                  id="receipt-upload"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleReceiptUpload}
                  disabled={isProcessingReceipt}
                  className="hidden"
                />
                <p className="mt-1 text-xs text-gray-500">
                  レシートの写真を撮影して自動入力
                </p>
              </div>
            )}

            {/* 日付 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                日付
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                {format(new Date(date), "yyyy年M月d日(E)", { locale: ja })}
              </p>
            </div>

            {/* 金額 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                金額
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0"
                step="1"
                placeholder="0"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* カテゴリー選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                カテゴリー選択
              </label>
              <select
                value={categoryId ?? ""}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="" disabled>
                  カテゴリーを選択
                </option>
                {categories.map((category) => (
                  <option
                    key={category.category_id}
                    value={category.category_id}
                  >
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* メモ */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                メモ(任意)
              </label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={3}
                placeholder="メモを入力"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* 保存ボタン */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "保存中..." : "保存する"}
            </button>
          </form>
        </div>
      </main>

      {/* フッターナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg">
        <div className="mx-auto max-w-3xl">
          <div className="flex justify-around p-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex flex-col items-center text-base text-gray-600 hover:text-blue-600"
            >
              <span className="text-2xl">🏠</span>
              <span>ホーム</span>
            </button>
            <button
              onClick={() => router.push("/history")}
              className="flex flex-col items-center text-base text-gray-600 hover:text-blue-600"
            >
              <span className="text-2xl">📋</span>
              <span>履歴</span>
            </button>
            <button
              onClick={() => router.push("/dashboard/input")}
              className="flex flex-col items-center text-base text-blue-600"
            >
              <span className="text-2xl">➕</span>
              <span className="font-medium">入力</span>
            </button>
            <button
              onClick={() => router.push("/dashboard/stats")}
              className="flex flex-col items-center text-base text-gray-600 hover:text-blue-600"
            >
              <span className="text-2xl">📊</span>
              <span>グラフ</span>
            </button>
            <button
              onClick={() => router.push("/dashboard/goals")}
              className="flex flex-col items-center text-base text-gray-600 hover:text-blue-600"
            >
              <span className="text-2xl">🎯</span>
              <span>目標</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
