"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";

type TabType = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage(
        "確認メールを送信しました。メールを確認してアカウントを有効化してください。",
      );
    }
    setLoading(false);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setError(null);
    setMessage(null);
    setEmail("");
    setPassword("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* キャラクター表示 */}
        <div className="mb-8 flex justify-center">
          <div className="relative h-48 w-48 transition-transform hover:scale-105">
            <Image
              src="/tamerun-mascot.png"
              alt="ためるんマスコット"
              fill
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>
        </div>

        {/* ロゴとメッセージ */}
        <div className="mb-6 text-center">
          <h1 className="mb-3 text-5xl font-bold text-gray-900">ためるん</h1>
          <p className="text-lg font-medium text-gray-700">
            {activeTab === "login"
              ? "おかえりなさい！💰"
              : "一緒に貯金を始めましょう！🐻"}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* タブヘッダー */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleTabChange("login")}
              className={`flex-1 px-6 py-4 text-center text-lg font-semibold transition-all duration-200 ${
                activeTab === "login"
                  ? "border-b-3 border-blue-600 bg-gradient-to-t from-blue-50 to-white text-blue-600"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              ログイン
            </button>
            <button
              onClick={() => handleTabChange("signup")}
              className={`flex-1 px-6 py-4 text-center text-lg font-semibold transition-all duration-200 ${
                activeTab === "signup"
                  ? "border-b-3 border-blue-600 bg-gradient-to-t from-blue-50 to-white text-blue-600"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              新規登録
            </button>
          </div>

          {/* タブコンテンツ */}
          <div className="p-8">
            {error && (
              <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-base text-red-800 font-medium">{error}</p>
              </div>
            )}

            {message && (
              <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="text-base text-green-800 font-medium">
                  {message}
                </p>
              </div>
            )}

            {activeTab === "login" ? (
              <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    メールアドレス
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="example@email.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    パスワード
                  </label>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-4 text-lg font-bold text-white shadow-lg hover:from-blue-700 hover:to-blue-800 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? "処理中..." : "ログイン"}
                </button>
              </form>
            ) : (
              <form className="space-y-6" onSubmit={handleSignup}>
                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    メールアドレス
                  </label>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="example@email.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    パスワード
                  </label>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="••••••••"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    💡 6文字以上で設定してください
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-4 text-lg font-bold text-white shadow-lg hover:from-blue-700 hover:to-blue-800 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? "処理中..." : "新規登録"}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          © 2026 ためるん - 家計簿アプリ
        </p>
      </div>
    </div>
  );
}
