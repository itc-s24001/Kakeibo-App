"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { TrendingUp, TrendingDown, Target, Plus } from "lucide-react";
import type { Database } from "@/types/database";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type SavingsGoal = Database["public"]["Tables"]["savings_goals"]["Row"];

interface TransactionWithCategory extends Transaction {
  category: CategoryRow | null;
}

interface MonthlySummary {
  totalIncome: number;
  totalExpense: number;
  totalGoalsSavings: number;
  remainingBudget: number;
}

interface GoalWithCalculations extends SavingsGoal {
  progress_percentage: number;
  monthly_required_amount: number;
}

export default function DashboardHome() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<MonthlySummary>({
    totalIncome: 0,
    totalExpense: 0,
    totalGoalsSavings: 0,
    remainingBudget: 0,
  });
  const [activeGoals, setActiveGoals] = useState<GoalWithCalculations[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<
    TransactionWithCategory[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 今月の年月を取得
      const now = new Date();
      const yearMonth = format(now, "yyyy-MM");
      const firstDayOfMonth = `${yearMonth}-01`;
      const lastDayOfMonth = format(
        new Date(now.getFullYear(), now.getMonth() + 1, 0),
        "yyyy-MM-dd",
      );

      // 今月の取引を取得
      const { data: transactions, error: transactionsError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", firstDayOfMonth)
        .lte("date", lastDayOfMonth);

      if (transactionsError) throw transactionsError;

      // 型アサーションを追加
      const txs = (transactions ?? []) as Transaction[];

      // 収入と支出を計算
      const totalIncome =
        txs
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const totalExpense =
        txs
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // アクティブな貯金目標を取得
      const { data: goals, error: goalsError } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (goalsError) throw goalsError;

      // 型アサーションを追加
      const goalsArr = (goals ?? []) as SavingsGoal[];

      // 目標の現在貯金額の合計を計算
      let totalCurrentSavings = 0;
      const goalsWithCalc: GoalWithCalculations[] = [];

      if (goalsArr) {
        for (const goal of goalsArr) {
          const targetAmount = Number(goal.target_amount);
          const currentAmount = Number(goal.current_amount);
          const progress =
            targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;

          let monthlyRequired = 0;
          if (goal.deadline) {
            const deadlineDate = new Date(goal.deadline);
            const today = new Date();
            const monthsRemaining = Math.max(
              0,
              (deadlineDate.getFullYear() - today.getFullYear()) * 12 +
                (deadlineDate.getMonth() - today.getMonth()),
            );
            if (monthsRemaining > 0) {
              const remaining = targetAmount - currentAmount;
              monthlyRequired = remaining / monthsRemaining;
            }
          }

          totalCurrentSavings += currentAmount;

          goalsWithCalc.push({
            ...goal,
            target_amount: targetAmount,
            current_amount: currentAmount,
            progress_percentage: Math.min(progress, 100),
            monthly_required_amount: Math.max(monthlyRequired, 0),
          });
        }
      }

      // 目標貯金額として現在の貯金額の合計を使用
      const totalGoalsSavings = totalCurrentSavings;

      // 残り使えるお金 = 今月の収入 - (今月の支出 + 目標貯金)
      const remainingBudget = totalIncome - (totalExpense + totalGoalsSavings);

      setSummary({
        totalIncome,
        totalExpense,
        totalGoalsSavings,
        remainingBudget,
      });

      setActiveGoals(goalsWithCalc);

      // 直近の履歴を5件取得
      const { data: recentTxs, error: recentError } = await supabase
        .from("transactions")
        .select(
          `
          *,
          category:categories(*)
        `,
        )
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      setRecentTransactions((recentTxs ?? []) as TransactionWithCategory[]);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
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
        {/* 今月のサマリーカード */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            今月のサマリー
          </h2>

          <div className="space-y-4">
            {/* 今月の収入 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="mr-3 rounded-full bg-blue-100 p-2">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-base text-gray-600">今月の収入</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">
                ¥{summary.totalIncome.toLocaleString()}
              </span>
            </div>

            {/* 今月の支出 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="mr-3 rounded-full bg-red-100 p-2">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <span className="text-base text-gray-600">今月の支出</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">
                ¥{summary.totalExpense.toLocaleString()}
              </span>
            </div>

            {/* 目標の月々必要額 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="mr-3 rounded-full bg-purple-100 p-2">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-base text-gray-600">目標貯金</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">
                ¥{summary.totalGoalsSavings.toLocaleString()}
              </span>
            </div>

            {/* 区切り線 */}
            <div className="border-t border-gray-200"></div>

            {/* 残り使えるお金 */}
            <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
              <div className="mb-2 text-center text-base text-gray-600">
                残り使えるお金
              </div>
              <div className="text-center text-4xl font-bold text-indigo-600">
                ¥{summary.remainingBudget.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 目標貯金バー */}
        {activeGoals.length > 0 && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                <Target className="mb-1 mr-2 inline-block h-6 w-6" />
                目標貯金
              </h2>
              <button
                onClick={() => router.push("/dashboard/goals")}
                className="text-base text-blue-600 hover:text-blue-700"
              >
                すべて見る →
              </button>
            </div>

            <div className="space-y-4">
              {activeGoals.slice(0, 3).map((goal) => (
                <div key={goal.goal_id}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-base font-medium text-gray-700">
                      {goal.goal_name}
                    </span>
                    <span className="text-base font-medium text-blue-600">
                      {goal.progress_percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                      style={{ width: `${goal.progress_percentage}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm text-gray-500">
                    <span>
                      ¥{goal.current_amount.toLocaleString()} / ¥
                      {goal.target_amount.toLocaleString()}
                    </span>
                    {goal.deadline && (
                      <span>
                        期限: {format(new Date(goal.deadline), "M/d")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 直近の履歴 */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">直近の履歴</h2>
            <button
              onClick={() => router.push("/history")}
              className="text-base text-blue-600 hover:text-blue-700"
            >
              すべて見る →
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <p className="py-8 text-center text-base text-gray-500">
              まだ履歴がありません
            </p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.transaction_id}
                  className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center">
                    <div
                      className={`mr-3 rounded-full p-2 ${
                        transaction.type === "income"
                          ? "bg-blue-100"
                          : "bg-red-100"
                      }`}
                    >
                      <span className="text-xl">
                        {transaction.category?.icon || "💰"}
                      </span>
                    </div>
                    <div>
                      <div className="text-base font-medium text-gray-900">
                        {transaction.category?.name || "未分類"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(transaction.date), "M月d日(E)", {
                          locale: ja,
                        })}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xl font-semibold ${
                      transaction.type === "income"
                        ? "text-blue-600"
                        : "text-red-600"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}¥
                    {Number(transaction.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* フローティング追加ボタン */}
      <button
        onClick={() => router.push("/dashboard/input")}
        className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* フッターナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg">
        <div className="mx-auto max-w-3xl">
          <div className="flex justify-around p-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex flex-col items-center text-base text-blue-600"
            >
              <span className="text-2xl">🏠</span>
              <span className="font-medium">ホーム</span>
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
              className="flex flex-col items-center text-base text-gray-600 hover:text-blue-600"
            >
              <span className="text-2xl">➕</span>
              <span>入力</span>
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
