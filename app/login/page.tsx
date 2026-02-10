"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* ロゴ */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">ためるん</h1>
          <p className="mt-2 text-base text-gray-600">
            シンプルで使いやすい家計簿アプリ
          </p>
        </div>

        <div className="rounded-lg bg-white shadow-lg">
          {/* タブヘッダー */}
          <div className="flex border-b">
            <button
              onClick={() => handleTabChange("login")}
              className={`flex-1 px-6 py-4 text-center text-base font-medium transition-colors ${
                activeTab === "login"
                  ? "border-b-2 border-blue-500 bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              ログイン
            </button>
            <button
              onClick={() => handleTabChange("signup")}
              className={`flex-1 px-6 py-4 text-center text-base font-medium transition-colors ${
                activeTab === "signup"
                  ? "border-b-2 border-blue-500 bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              新規登録
            </button>
          </div>

          {/* タブコンテンツ */}
          <div className="p-8">
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <p className="text-base text-red-800">{error}</p>
              </div>
            )}

            {message && (
              <div className="mb-4 rounded-md bg-green-50 p-4">
                <p className="text-base text-green-800">{message}</p>
              </div>
            )}

            {activeTab === "login" ? (
              <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-base font-medium text-gray-700"
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
                    className="mt-2 block w-full rounded-md border border-gray-300 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-base font-medium text-gray-700"
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
                    className="mt-2 block w-full rounded-md border border-gray-300 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-blue-600 px-4 py-3 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "処理中..." : "ログイン"}
                </button>
              </form>
            ) : (
              <form className="space-y-6" onSubmit={handleSignup}>
                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-base font-medium text-gray-700"
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
                    className="mt-2 block w-full rounded-md border border-gray-300 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-base font-medium text-gray-700"
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
                    className="mt-2 block w-full rounded-md border border-gray-300 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    6文字以上で設定してください
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-blue-600 px-4 py-3 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
