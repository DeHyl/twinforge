import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { HardHat } from "lucide-react";

export default function Login() {
  const { login, loginError, isLoggingIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ email, password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-wcc-500">
            <HardHat className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">WCC Project CRM</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to manage your projects</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-xl">
          {loginError && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {loginError}
            </div>
          )}

          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none focus:ring-1 focus:ring-wcc-500"
            placeholder="you@wcc.com"
            required
          />

          <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-6 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none focus:ring-1 focus:ring-wcc-500"
            placeholder="Enter password"
            required
          />

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full rounded-lg bg-wcc-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-wcc-600 disabled:opacity-50"
          >
            {isLoggingIn ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
