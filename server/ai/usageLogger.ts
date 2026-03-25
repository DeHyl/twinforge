import { db } from "../db.js";
import { tokenUsage } from "../../shared/schema.js";

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-5-20250929": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4.0 },
  "claude-opus-4-6": { input: 15.0, output: 75.0 },
};

function calcCost(model: string, inputTokens: number, outputTokens: number): string {
  const pricing = MODEL_PRICING[model] ?? { input: 3.0, output: 15.0 };
  const cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  return cost.toFixed(6);
}

export async function logUsage(params: {
  operation: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  try {
    const costUsd = calcCost(params.model, params.inputTokens, params.outputTokens);
    await db.insert(tokenUsage).values({
      operation: params.operation,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      costUsd,
    });
  } catch (err) {
    console.error("[twinforge] Failed to log usage:", err);
  }
}
