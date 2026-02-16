"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";
import {
  startOfMonth,
  endOfMonth,
  format,
  addMonths,
  subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];

type TabType = "expense" | "income";

export default function StatsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("expense");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          console.log("User not authenticated");
          return;
        }

        const startDate = startOfMonth(currentMonth);
        const endDate = endOfMonth(currentMonth);

        console.log("Fetching data for period:", {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          userId: user.id,
        });

        // Fetch transactions
        const { data: transactionsData, error: transactionsError } =
          await supabase
            .from("transactions")
            .select("*")
            .eq("user_id", user.id)
            .gte("date", startDate.toISOString())
            .lte("date", endDate.toISOString());

        if (transactionsError) {
          console.error("Error fetching transactions:", transactionsError);
        } else {
          console.log("Fetched transactions:", transactionsData);
        }

        // Fetch all categories (no user_id filter)
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("*");

        if (categoriesError) {
          console.error("Error fetching categories:", categoriesError);
        } else {
          console.log("Fetched categories:", categoriesData);
        }

        setTransactions(transactionsData || []);
        setCategories(categoriesData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Calculate category totals
  const getCategoryTotals = (type: "expense" | "income") => {
    const filtered = transactions.filter((t) => t.type === type);
    const totals = new Map<
      number,
      { name: string; amount: number; icon: string; color: string }
    >();

    filtered.forEach((transaction) => {
      const category = categories.find(
        (c) => c.category_id === transaction.category_id,
      );
      if (category) {
        const current = totals.get(category.category_id) || {
          name: category.name,
          amount: 0,
          icon: category.icon || "📁",
          color: category.color || "#6B7280",
        };
        current.amount += transaction.amount;
        totals.set(category.category_id, current);
      }
    });

    return Array.from(totals.values()).sort((a, b) => b.amount - a.amount);
  };

  // Calculate pie chart paths
  const getPieChartData = (
    categoryTotals: {
      name: string;
      amount: number;
      icon: string;
      color: string;
    }[],
  ) => {
    const total = categoryTotals.reduce((sum, cat) => sum + cat.amount, 0);
    if (total === 0) return [];

    // カテゴリーが1つだけの場合は完全な円を描画
    if (categoryTotals.length === 1) {
      return [
        {
          ...categoryTotals[0],
          percentage: 100,
          path: `M 100 20 A 80 80 0 1 1 99.99 20 Z`,
        },
      ];
    }

    let currentAngle = -90; // Start from top
    return categoryTotals.map((cat) => {
      const percentage = (cat.amount / total) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const x1 = 100 + 80 * Math.cos(startRad);
      const y1 = 100 + 80 * Math.sin(startRad);
      const x2 = 100 + 80 * Math.cos(endRad);
      const y2 = 100 + 80 * Math.sin(endRad);
      const largeArc = angle > 180 ? 1 : 0;

      return {
        ...cat,
        percentage,
        path: `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`,
      };
    });
  };

  const expenseTotals = getCategoryTotals("expense");
  const incomeTotals = getCategoryTotals("income");

  const pieChartData =
    activeTab === "expense"
      ? getPieChartData(expenseTotals)
      : getPieChartData(incomeTotals);

  const currentTotals = activeTab === "expense" ? expenseTotals : incomeTotals;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">ためるん</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-base text-gray-900 hover:text-blue-600"
            >
              ログアウト
            </button>
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Month Selector */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="前の月"
            >
              <svg
                className="w-5 h-5 text-gray-900"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <span className="text-2xl font-bold text-gray-900">
              {format(currentMonth, "yyyy年M月", { locale: ja })}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="次の月"
            >
              <svg
                className="w-5 h-5 text-gray-900"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 rounded-lg bg-white shadow overflow-hidden">
          <div className="flex">
            <button
              onClick={() => setActiveTab("expense")}
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                activeTab === "expense"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-700 hover:text-gray-700"
              }`}
            >
              支出
            </button>
            <button
              onClick={() => setActiveTab("income")}
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                activeTab === "income"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-700 hover:text-gray-700"
              }`}
            >
              収入
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-700">読み込み中...</div>
          </div>
        ) : (
          <>
            {currentTotals.length > 0 ? (
              <>
                {/* Summary Header */}
                <div className="bg-white rounded-lg p-6 shadow mb-6">
                  <div className="text-center">
                    <p className="text-xl font-semibold text-gray-900 mb-2">
                      {activeTab === "expense" ? "今月の支出" : "今月の収入"}
                    </p>
                    <p className="text-4xl font-bold text-gray-900">
                      ¥
                      {currentTotals
                        .reduce((sum, cat) => sum + cat.amount, 0)
                        .toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-white rounded-lg p-6 shadow mb-6">
                  <svg
                    viewBox="0 0 200 200"
                    className="w-full max-w-sm mx-auto"
                  >
                    {pieChartData.map((segment, index) => (
                      <path
                        key={index}
                        d={segment.path}
                        fill={segment.color}
                        stroke="white"
                        strokeWidth="2"
                      />
                    ))}
                  </svg>
                </div>

                {/* Category List */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">
                      カテゴリー別
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {currentTotals.map((category, index) => {
                      const total = currentTotals.reduce(
                        (sum, cat) => sum + cat.amount,
                        0,
                      );
                      const percentage =
                        total > 0 ? (category.amount / total) * 100 : 0;
                      return (
                        <div key={index} className="px-6 py-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-3xl">{category.icon}</span>
                              <span className="text-lg font-semibold text-gray-900">
                                {category.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-lg font-semibold text-gray-900 min-w-[3rem] text-right">
                                {percentage.toFixed(1)}%
                              </span>
                              <span className="text-xl font-bold text-gray-900 min-w-[6rem] text-right">
                                ¥{category.amount.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: category.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg p-8 shadow text-center">
                <p className="text-gray-700">この月のデータがありません</p>
              </div>
            )}
          </>
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
              className="flex flex-col items-center text-base text-blue-600"
            >
              <span className="text-2xl">📊</span>
              <span className="font-medium">グラフ</span>
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
