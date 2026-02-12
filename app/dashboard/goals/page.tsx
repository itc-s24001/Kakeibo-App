"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { format, differenceInMonths, differenceInDays } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Target,
  Plus,
  TrendingUp,
  Calendar,
  Edit2,
  Trash2,
  PiggyBank,
} from "lucide-react";
import type { Database } from "@/types/database";

type SavingsGoal = Database["public"]["Tables"]["savings_goals"]["Row"];

interface GoalWithCalculations extends SavingsGoal {
  progress_percentage: number;
  monthly_required_amount: number;
  days_remaining: number | null;
  months_remaining: number | null;
}

export default function GoalsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [goals, setGoals] = useState<GoalWithCalculations[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<number | null>(null);
  const [newGoal, setNewGoal] = useState({
    goal_name: "",
    target_amount: "",
    deadline: "",
  });
  const [editGoal, setEditGoal] = useState({
    goal_name: "",
    target_amount: "",
    current_amount: "",
    deadline: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [addSavingsGoalId, setAddSavingsGoalId] = useState<number | null>(null);
  const [addSavingsAmount, setAddSavingsAmount] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]);

  const fetchGoals = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const goalsWithCalc: GoalWithCalculations[] = (
        (data as SavingsGoal[]) || []
      ).map((goal) => {
        const targetAmount = Number(goal.target_amount) || 0;
        const currentAmount = Number(goal.current_amount) || 0;
        const progress =
          targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;

        let monthsRemaining: number | null = null;
        let daysRemaining: number | null = null;
        let monthlyRequired = 0;

        let validDeadline = null;
        if (goal.deadline) {
          const deadlineDate = new Date(goal.deadline);
          if (!isNaN(deadlineDate.getTime())) {
            validDeadline = deadlineDate;
            const today = new Date();
            monthsRemaining = differenceInMonths(deadlineDate, today);
            daysRemaining = differenceInDays(deadlineDate, today);
            if (monthsRemaining > 0) {
              const remaining = targetAmount - currentAmount;
              monthlyRequired = remaining / monthsRemaining;
            }
          }
        }

        return {
          ...goal,
          target_amount: targetAmount,
          current_amount: currentAmount,
          progress_percentage: Math.min(progress, 100),
          monthly_required_amount: Math.max(monthlyRequired, 0),
          days_remaining: daysRemaining,
          months_remaining: monthsRemaining,
          deadline: validDeadline
            ? validDeadline.toISOString().slice(0, 10)
            : goal.deadline || "",
        };
      });

      setGoals(goalsWithCalc);
    } catch (err) {
      console.error("Error fetching goals:", err);
      setError("目標の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    const targetAmount = parseFloat(newGoal.target_amount);

    if (isNaN(targetAmount) || targetAmount <= 0) {
      setError("目標金額を正しく入力してください");
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from("savings_goals")
        // @ts-expect-error - Supabase type generation issue
        .insert([
          {
            user_id: user.id,
            goal_name: newGoal.goal_name,
            target_amount: targetAmount,
            current_amount: 0,
            deadline: newGoal.deadline || null,
            is_active: true,
          },
        ]);

      if (insertError) throw insertError;

      setSuccess(true);
      setNewGoal({ goal_name: "", target_amount: "", deadline: "" });
      setShowNewGoalForm(false);
      fetchGoals();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error creating goal:", err);
      setError("目標の作成に失敗しました");
    }
  };

  const toggleGoalActive = async (goalId: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("savings_goals")
        // @ts-expect-error - Supabase type generation issue
        .update({ is_active: !currentStatus })
        .eq("goal_id", goalId);

      if (error) throw error;

      fetchGoals();
    } catch (err) {
      console.error("Error toggling goal:", err);
      setError("目標の更新に失敗しました");
    }
  };

  const startEditGoal = (goal: GoalWithCalculations) => {
    setEditingGoal(goal.goal_id);
    setEditGoal({
      goal_name: goal.goal_name,
      target_amount: goal.target_amount.toString(),
      current_amount: goal.current_amount.toString(),
      deadline: goal.deadline || "",
    });
  };

  const cancelEdit = () => {
    setEditingGoal(null);
    setEditGoal({
      goal_name: "",
      target_amount: "",
      current_amount: "",
      deadline: "",
    });
  };

  const handleUpdateGoal = async (goalId: number) => {
    setError(null);
    const targetAmount = parseFloat(editGoal.target_amount);
    const currentAmount = parseFloat(editGoal.current_amount);

    if (isNaN(targetAmount) || targetAmount <= 0) {
      setError("目標金額を正しく入力してください");
      return;
    }

    if (isNaN(currentAmount) || currentAmount < 0) {
      setError("現在額を正しく入力してください");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from("savings_goals")
        // @ts-expect-error - Supabase type generation issue
        .update({
          goal_name: editGoal.goal_name,
          target_amount: targetAmount,
          current_amount: currentAmount,
          deadline: editGoal.deadline || null,
        })
        .eq("goal_id", goalId);

      if (updateError) throw updateError;

      setSuccess(true);
      setEditingGoal(null);
      fetchGoals();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error updating goal:", err);
      setError("目標の更新に失敗しました");
    }
  };

  const handleDeleteGoal = async (goalId: number) => {
    try {
      const { error: deleteError } = await supabase
        .from("savings_goals")
        .delete()
        .eq("goal_id", goalId);

      if (deleteError) throw deleteError;

      setSuccess(true);
      setDeleteConfirm(null);
      fetchGoals();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error deleting goal:", err);
      setError("目標の削除に失敗しました");
    }
  };

  const startAddSavings = (goalId: number) => {
    setAddSavingsGoalId(goalId);
    setAddSavingsAmount("");
  };

  const handleAddSavings = async (goal: GoalWithCalculations) => {
    setError(null);
    const amount = parseFloat(addSavingsAmount);

    if (isNaN(amount) || amount <= 0) {
      setError("金額を正しく入力してください");
      return;
    }

    const newCurrentAmount = goal.current_amount + amount;

    try {
      const { error: updateError } = await supabase
        .from("savings_goals")
        // @ts-expect-error - Supabase type generation issue
        .update({
          current_amount: newCurrentAmount,
        })
        .eq("goal_id", goal.goal_id);

      if (updateError) throw updateError;

      setSuccess(true);
      setAddSavingsGoalId(null);
      setAddSavingsAmount("");
      fetchGoals();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error adding savings:", err);
      setError("貯金の追加に失敗しました");
    }
  };

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
              className="text-base text-gray-900 hover:text-gray-900"
            >
              ログアウト
            </button>
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            <Target className="mb-1 mr-2 inline-block h-6 w-6" />
            目標貯金
          </h2>
          <button
            onClick={() => setShowNewGoalForm(!showNewGoalForm)}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            新しい目標
          </button>
        </div>

        {/* 成功メッセージ */}
        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">操作が完了しました！</p>
          </div>
        )}

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* 新規目標作成フォーム */}
        {showNewGoalForm && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              新しい目標を作成
            </h3>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  目標名
                </label>
                <input
                  type="text"
                  value={newGoal.goal_name}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, goal_name: e.target.value })
                  }
                  required
                  placeholder="例：ハワイ旅行、車購入"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900">
                  目標金額
                </label>
                <input
                  type="number"
                  value={newGoal.target_amount}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, target_amount: e.target.value })
                  }
                  required
                  min="0"
                  step="1000"
                  placeholder="0"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900">
                  期限（任意）
                </label>
                <input
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, deadline: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  作成
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewGoalForm(false)}
                  className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 目標一覧 */}
        {goals.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <Target className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              目標がありません
            </h3>
            <p className="text-sm text-gray-700">
              「新しい目標」ボタンから目標を作成しましょう
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <div
                key={goal.goal_id}
                className={`rounded-lg bg-white p-6 shadow transition-opacity ${
                  !goal.is_active ? "opacity-60" : ""
                }`}
              >
                {editingGoal === goal.goal_id ? (
                  /* 編集モード */
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      目標を編集
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-900">
                        目標名
                      </label>
                      <input
                        type="text"
                        value={editGoal.goal_name}
                        onChange={(e) =>
                          setEditGoal({
                            ...editGoal,
                            goal_name: e.target.value,
                          })
                        }
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900">
                          目標金額
                        </label>
                        <input
                          type="number"
                          value={editGoal.target_amount}
                          onChange={(e) =>
                            setEditGoal({
                              ...editGoal,
                              target_amount: e.target.value,
                            })
                          }
                          required
                          min="0"
                          step="1000"
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900">
                          現在額
                        </label>
                        <input
                          type="number"
                          value={editGoal.current_amount}
                          onChange={(e) =>
                            setEditGoal({
                              ...editGoal,
                              current_amount: e.target.value,
                            })
                          }
                          required
                          min="0"
                          step="1000"
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900">
                        期限（任意）
                      </label>
                      <input
                        type="date"
                        value={editGoal.deadline}
                        onChange={(e) =>
                          setEditGoal({ ...editGoal, deadline: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateGoal(goal.goal_id)}
                        className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        保存
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 表示モード */
                  <>
                    {/* ヘッダー */}
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {goal.goal_name}
                        </h3>
                        {goal.deadline && (
                          <p className="mt-1 flex items-center text-sm text-gray-700">
                            <Calendar className="mr-1 h-4 w-4" />
                            期限:{" "}
                            {format(new Date(goal.deadline), "yyyy年M月d日", {
                              locale: ja,
                            })}
                            {goal.days_remaining !== null &&
                              goal.days_remaining >= 0 && (
                                <span className="ml-2 text-blue-600">
                                  （残り{goal.days_remaining}日）
                                </span>
                              )}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            toggleGoalActive(goal.goal_id, goal.is_active)
                          }
                          className={`rounded-full px-4 py-1 text-xs font-medium ${
                            goal.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-200 text-gray-900"
                          }`}
                        >
                          {goal.is_active ? "ON" : "OFF"}
                        </button>
                      </div>
                    </div>

                    {/* アクションボタン */}
                    <div className="mb-4 flex gap-2">
                      <button
                        onClick={() => startAddSavings(goal.goal_id)}
                        className="flex items-center gap-1 rounded-md bg-green-50 px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-100"
                      >
                        <PiggyBank className="h-4 w-4" />
                        貯金を追加
                      </button>
                      <button
                        onClick={() => startEditGoal(goal)}
                        className="flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100"
                      >
                        <Edit2 className="h-4 w-4" />
                        編集
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(goal.goal_id)}
                        className="flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        削除
                      </button>
                    </div>

                    {/* 貯金追加フォーム */}
                    {addSavingsGoalId === goal.goal_id && (
                      <div className="mb-4 rounded-md bg-green-50 p-4">
                        <p className="mb-3 text-sm font-medium text-green-800">
                          貯金額を入力してください
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={addSavingsAmount}
                            onChange={(e) =>
                              setAddSavingsAmount(e.target.value)
                            }
                            min="0"
                            step="100"
                            placeholder="金額を入力"
                            className="flex-1 rounded-md border border-green-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                          <button
                            onClick={() => handleAddSavings(goal)}
                            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                          >
                            追加
                          </button>
                          <button
                            onClick={() => {
                              setAddSavingsGoalId(null);
                              setAddSavingsAmount("");
                            }}
                            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 削除確認 */}
                    {deleteConfirm === goal.goal_id && (
                      <div className="mb-4 rounded-md bg-red-50 p-4">
                        <p className="mb-3 text-sm font-medium text-red-800">
                          本当に削除しますか？この操作は取り消せません。
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeleteGoal(goal.goal_id)}
                            className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                          >
                            削除する
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 目標金額と現在額 */}
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-700">目標金額</p>
                        <p className="text-2xl font-bold text-gray-900">
                          ¥{Number(goal.target_amount).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-700">現在額</p>
                        <p className="text-2xl font-bold text-blue-600">
                          ¥{Number(goal.current_amount).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* 達成率バー */}
                    <div className="mb-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          達成率
                        </span>
                        <span className="text-sm font-medium text-blue-600">
                          {goal.progress_percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                          style={{ width: `${goal.progress_percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* 月間必要額 */}
                    {goal.is_active &&
                      goal.deadline &&
                      goal.months_remaining !== null &&
                      goal.months_remaining > 0 && (
                        <div className="rounded-md bg-blue-50 p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
                              <span className="text-sm font-medium text-gray-900">
                                月間必要貯金額
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-blue-600">
                                ¥
                                {Math.ceil(
                                  goal.monthly_required_amount,
                                ).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-700">
                                残り{goal.months_remaining}ヶ月
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* 達成済みメッセージ */}
                    {goal.progress_percentage >= 100 && (
                      <div className="mt-4 rounded-md bg-green-50 p-4 text-center">
                        <p className="font-semibold text-green-800">
                          🎉 目標達成おめでとうございます！
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

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
              className="flex flex-col items-center text-base text-gray-900 hover:text-blue-600"
            >
              <span className="text-2xl">📋</span>
              <span>履歴</span>
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
              className="flex flex-col items-center text-base text-blue-600"
            >
              <span className="text-2xl">🎯</span>
              <span className="font-medium">目標</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
