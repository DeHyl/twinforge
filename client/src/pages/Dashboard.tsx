import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";

interface SoulPackageData {
  id: string;
  soulDocument: string;
  voiceProfile: Record<string, unknown>;
  episodicMemories: Array<Record<string, unknown>>;
  relationshipModes: Record<string, unknown>;
  valuesMatrix: Record<string, unknown>;
  accuracyScore: number;
  correctionLog: Array<{
    twin_response: string;
    user_correction: string;
    scenario_context: string;
  }>;
}

export default function Dashboard() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const [copied, setCopied] = useState(false);

  const { data: pkg, isLoading, error, refetch } = useQuery<SoulPackageData>({
    queryKey: ["soul-package", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/sessions/${sessionId}/soul-package`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/sessions/${sessionId}/soul-package`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Generation failed");
      return res.json();
    },
    onSuccess: () => refetch(),
  });

  function handleCopy() {
    if (pkg?.soulDocument) {
      navigator.clipboard.writeText(pkg.soulDocument);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleDownload() {
    if (!pkg?.soulDocument) return;
    const blob = new Blob([pkg.soulDocument], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "soul-package.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-forge-200 border-t-forge-600" />
      </div>
    );
  }

  // No package yet — show generate button
  if (!pkg) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-forge-50 via-white to-forge-100 px-6">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Your Soul Package</h1>
          <p className="mb-6 text-gray-500">
            All sessions are complete. Generate your digital twin's personality profile.
          </p>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="rounded-xl bg-forge-600 px-8 py-4 text-lg font-semibold text-white shadow-md hover:bg-forge-700 disabled:opacity-60"
          >
            {generateMutation.isPending ? "Generating..." : "Generate Soul Package"}
          </button>
          {generateMutation.isError && (
            <p className="mt-4 text-sm text-red-500">Failed to generate. Try again.</p>
          )}
        </div>
      </div>
    );
  }

  const voiceProfile = pkg.voiceProfile as Record<string, unknown>;
  const valuesMatrix = pkg.valuesMatrix as Record<string, unknown>;
  const memories = pkg.episodicMemories ?? [];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-forge-600 to-forge-700 px-6 py-8 text-white">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold">Your Twin's DNA</h1>
          <p className="mt-1 text-forge-200">Soul Package generated from 3 interview sessions</p>
          {pkg.accuracyScore > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm">
              Mirror test accuracy: {Math.round(pkg.accuracyScore * 100)}%
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-6 pt-6">
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 rounded-lg border border-forge-300 bg-white px-4 py-2.5 text-sm font-medium text-forge-700 hover:bg-forge-50"
          >
            {copied ? "Copied!" : "Copy System Prompt"}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 rounded-lg border border-forge-300 bg-white px-4 py-2.5 text-sm font-medium text-forge-700 hover:bg-forge-50"
          >
            Download Markdown
          </button>
        </div>

        {/* Voice Profile */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Voice Profile</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(voiceProfile).slice(0, 10).map(([key, value]) => (
              <div key={key}>
                <span className="text-gray-400">{key.replace(/_/g, " ")}:</span>{" "}
                <span className="font-medium text-gray-700">
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Values */}
        {valuesMatrix && Object.keys(valuesMatrix).length > 0 && (
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Values Matrix</h3>
            <div className="space-y-2 text-sm">
              {Object.entries(valuesMatrix).map(([key, value]) => (
                <div key={key}>
                  <span className="text-gray-400">{key.replace(/_/g, " ")}:</span>{" "}
                  <span className="font-medium text-gray-700">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stories */}
        {memories.length > 0 && (
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Stories ({memories.length})
            </h3>
            <div className="space-y-4">
              {memories.map((memory, i) => (
                <div key={i} className="border-l-2 border-forge-200 pl-3">
                  <p className="font-medium text-gray-800">{String(memory.title ?? `Story ${i + 1}`)}</p>
                  <p className="mt-1 text-sm text-gray-500">{String(memory.narrative ?? "")}</p>
                  {memory.emotion && (
                    <span className="mt-1 inline-block rounded-full bg-forge-50 px-2 py-0.5 text-xs text-forge-600">
                      {String(memory.emotion)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Soul Document */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Soul Document</h3>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {pkg.soulDocument}
          </div>
        </div>

        {/* Corrections */}
        {pkg.correctionLog.length > 0 && (
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Corrections ({pkg.correctionLog.length})
            </h3>
            <div className="space-y-3">
              {pkg.correctionLog.map((c, i) => (
                <div key={i} className="rounded-lg bg-gray-50 p-3 text-sm">
                  <p className="text-red-400 line-through">{c.twin_response}</p>
                  <p className="mt-1 font-medium text-green-700">{c.user_correction}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
