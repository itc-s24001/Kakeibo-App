"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Edit2, Trash2 } from "lucide-react";
import type { Database } from "@/types/database";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

interface TransactionWithCategory extends Transaction {
  category: CategoryRow | null;
}

interface DailyTotal {
  income: number;
  expense: number;
  net: number;
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>(
    [],
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dailyTotals, setDailyTotals] = useState<Map<string, DailyTotal>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionWithCategory | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  // 編集フォームの状態
  const [editAmount, setEditAmount] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState("");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const firstDay = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const lastDay = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      // カテゴリーを取得
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (categoriesError) throw categoriesError;
      setCategories((categoriesData ?? []) as CategoryRow[]);

      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          *,
          category:categories(*)
        `,
        )
        .eq("user_id", user.id)
        .gte("date", firstDay)
        .lte("date", lastDay)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const txs = (data ?? []) as TransactionWithCategory[];
      setTransactions(txs);

      // 日別の合計を計算
      const totals = new Map<string, DailyTotal>();
      txs.forEach((tx) => {
        const dateKey = tx.date;
        const existing = totals.get(dateKey) || {
          income: 0,
          expense: 0,
          net: 0,
        };

        if (tx.type === "income") {
          existing.income += Number(tx.amount);
        } else {
          existing.expense += Number(tx.amount);
        }
        existing.net = existing.income - existing.expense;

        totals.set(dateKey, existing);
      });

      setDailyTotals(totals);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [user, currentMonth]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, fetchTransactions]);

  const handlePreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
    );
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
    );
    setSelectedDate(null);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    if (!confirm("この取引を削除しますか？")) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("transaction_id", transactionId);

      if (error) throw error;

      await fetchTransactions();
    } catch (err) {
      console.error("Error deleting transaction:", err);
      alert("削除に失敗しました");
    }
  };

  const handleEditTransaction = (transaction: TransactionWithCategory) => {
    setEditingTransaction(transaction);
    setEditAmount(transaction.amount.toString());
    setEditCategoryId(transaction.category_id);
    setEditDate(transaction.date);
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction || !editAmount || !editCategoryId || !editDate) {
      alert("すべての項目を入力してください");
      return;
    }

    try {
      const { error } = await supabase
        .from("transactions")
        // @ts-expect-error - Supabase type generation issue
        .update({
          amount: Number(editAmount),
          category_id: editCategoryId,
          date: editDate,
        })
        .eq("transaction_id", editingTransaction.transaction_id);

      if (error) throw error;

      setEditingTransaction(null);
      await fetchTransactions();
    } catch (err) {
      console.error("Error updating transaction:", err);
      alert("更新に失敗しました");
    }
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setEditAmount("");
    setEditCategoryId(null);
    setEditDate("");
  };

  // カレンダーの日付を生成
  const generateCalendarDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // 月の最初の日の曜日を取得（0: 日曜日）
    const firstDayOfWeek = start.getDay();

    // 空白のセルを追加
    const blanks = Array(firstDayOfWeek).fill(null);

    return [...blanks, ...days];
  };

  const getTransactionsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return transactions.filter((tx) => tx.date === dateStr);
  };

  const getFilteredTransactions = () => {
    if (selectedDate) {
      return getTransactionsForDate(selectedDate);
    }
    return transactions;
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const calendarDays = generateCalendarDays();
  const filteredTransactions = getFilteredTransactions();

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
              className="text-base text-gray-900 hover:text-gray-900"
            >
              ログアウト
            </button>
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        {/* カレンダーカード */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          {/* 月の選択 */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={handlePreviousMonth}
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {format(currentMonth, "yyyy年M月", { locale: ja })}
            </h2>
            <button
              onClick={handleNextMonth}
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* 曜日ヘッダー */}
          <div className="mb-3 grid grid-cols-7 gap-2">
            {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
              <div
                key={day}
                className={`text-center text-sm font-bold ${
                  index === 0
                    ? "text-red-500"
                    : index === 6
                      ? "text-blue-500"
                      : "text-gray-900"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`blank-${index}`} className="aspect-square" />;
              }

              const dateStr = format(day, "yyyy-MM-dd");
              const total = dailyTotals.get(dateStr);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDateClick(day)}
                  className={`aspect-square rounded-xl border-2 p-2 text-xs transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : isToday
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm"
                  }`}
                >
                  <div className="flex h-full flex-col items-center justify-start">
                    <span
                      className={`mb-1.5 text-xl font-bold ${
                        isSelected || isToday
                          ? "text-blue-600"
                          : "text-gray-900"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    {total && (
                      <div className="w-full space-y-1">
                        {total.income > 0 && (
                          <div className="text-sm font-bold leading-tight text-blue-600">
                            +{total.income.toLocaleString()}
                          </div>
                        )}
                        {total.expense > 0 && (
                          <div className="text-sm font-bold leading-tight text-red-600">
                            -{total.expense.toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className="mt-4 w-full text-sm text-blue-600 hover:text-blue-700"
            >
              すべての日付を表示
            </button>
          )}
        </div>

        {/* 履歴リスト */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {selectedDate
              ? format(selectedDate, "M月d日(E)の履歴", { locale: ja })
              : "すべての履歴"}
          </h2>

          {filteredTransactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-700">
              {selectedDate
                ? "この日の履歴はありません"
                : "まだ履歴がありません"}
            </p>
          ) : (
            <div className="space-y-4">
              {/* 日付ごとにグループ化 */}
              {Array.from(
                filteredTransactions.reduce((acc, tx) => {
                  const date = tx.date;
                  if (!acc.has(date)) {
                    acc.set(date, []);
                  }
                  acc.get(date)!.push(tx);
                  return acc;
                }, new Map<string, TransactionWithCategory[]>()),
              ).map(([date, txs]) => {
                const dateObj = parseISO(date);
                const total = dailyTotals.get(date);

                return (
                  <div
                    key={date}
                    className="border-b border-gray-100 pb-4 last:border-b-0"
                  >
                    {/* 日付ヘッダー */}
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">
                        {format(dateObj, "M月d日(E)", { locale: ja })}
                      </h3>
                      {total && (
                        <div className="flex items-center gap-3 text-sm">
                          {total.income > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-700">
                                収入
                              </span>
                              <span className="text-lg font-semibold text-blue-600">
                                +¥{total.income.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {total.expense > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-700">
                                支出
                              </span>
                              <span className="text-lg font-semibold text-red-600">
                                -¥{total.expense.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* その日の取引リスト */}
                    <div className="space-y-2">
                      {txs.map((transaction) => (
                        <div
                          key={transaction.transaction_id}
                          className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50"
                        >
                          <div className="flex items-center">
                            <div
                              className={`mr-3 rounded-full p-2 ${
                                transaction.type === "income"
                                  ? "bg-blue-100"
                                  : "bg-red-100"
                              }`}
                            >
                              <span className="text-base">
                                {transaction.category?.icon || "💰"}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {transaction.category?.name || "未分類"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-lg font-semibold ${
                                transaction.type === "income"
                                  ? "text-blue-600"
                                  : "text-red-600"
                              }`}
                            >
                              {transaction.type === "income" ? "+" : "-"}¥
                              {Number(transaction.amount).toLocaleString()}
                            </span>
                            <button
                              onClick={() => handleEditTransaction(transaction)}
                              className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteTransaction(
                                  transaction.transaction_id,
                                )
                              }
                              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 編集モーダル */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              取引を編集
            </h3>

            <div className="space-y-4">
              {/* 金額 */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  金額
                </label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="金額を入力"
                />
              </div>

              {/* カテゴリー */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  カテゴリー
                </label>
                <select
                  value={editCategoryId || ""}
                  onChange={(e) => setEditCategoryId(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">カテゴリーを選択</option>
                  {categories
                    .filter((cat) => cat.type === editingTransaction.type)
                    .map((category) => (
                      <option
                        key={category.category_id}
                        value={category.category_id}
                      >
                        {category.icon} {category.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* 日付 */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  日付
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* ボタン */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCancelEdit}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フッターナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg">
        <div className="mx-auto max-w-3xl">
          <div className="flex justify-around p-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex flex-col items-center text-base text-gray-900 hover:text-blue-600"
            >
              <span className="text-2xl">🏠</span>
              <span>ホーム</span>
            </button>
            <button
              onClick={() => router.push("/history")}
              className="flex flex-col items-center text-base text-blue-600"
            >
              <span className="text-2xl">📋</span>
              <span className="font-medium">履歴</span>
            </button>
            <button
              onClick={() => router.push("/dashboard/input")}
              className="flex flex-col items-center text-base text-gray-900 hover:text-blue-600"
            >
              <span className="text-2xl">➕</span>
              <span>入力</span>
            </button>
            <button
              onClick={() => router.push("/dashboard/stats")}
              className="flex flex-col items-center text-base text-gray-900 hover:text-blue-600"
            >
              <span className="text-2xl">📊</span>
              <span>グラフ</span>
            </button>
            <button
              onClick={() => router.push("/dashboard/goals")}
              className="flex flex-col items-center text-base text-gray-900 hover:text-blue-600"
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
