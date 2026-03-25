import { useState } from "react";
import { useLocation } from "wouter";

export default function Welcome() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/sessions", { method: "POST" });
      const data = await res.json();
      navigate(`/s/${data.id}`);
    } catch {
      setLoading(false);
      alert("Something went wrong. Try again.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-forge-50 via-white to-forge-100 px-6">
      <div className="max-w-md text-center">
        {/* Logo / Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-forge-600 shadow-lg">
          <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.591.659H9.061a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V17a2.25 2.25 0 01-2.25 2.25H7.25A2.25 2.25 0 015 17v-2.5" />
          </svg>
        </div>

        <h1 className="mb-3 text-3xl font-bold text-gray-900">TwinForge</h1>
        <p className="mb-2 text-lg text-gray-600">Build your digital twin in 3 conversations.</p>
        <p className="mb-8 text-sm text-gray-400">
          ~15 min per session. No signup needed. Just chat.
        </p>

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full rounded-xl bg-forge-600 px-8 py-4 text-lg font-semibold text-white shadow-md transition-all hover:bg-forge-700 hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "Starting..." : "Start"}
        </button>

        <p className="mt-6 text-xs text-gray-400">
          Your data stays private. Sessions are identified by a unique link — no account required.
        </p>
      </div>
    </div>
  );
}
