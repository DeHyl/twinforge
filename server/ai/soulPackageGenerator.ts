import { getClaudeClient } from "./claudeClient.js";
import { logUsage } from "./usageLogger.js";
import type { Message, WritingSample } from "../../shared/schema.js";

const MODEL = "claude-sonnet-4-5-20250929";

const GENERATION_SYSTEM = `You are TwinForge's Soul Package Generator. Given the complete interview data (3 sessions + writing samples), you produce a structured personality profile — the "Soul Package" — that can power a digital twin.

## Your Output Structure
Return a JSON object with these fields:

{
  "soul_document": "A 3,000-6,000 word markdown document that serves as the definitive system prompt for this person's digital twin. Include: identity summary, communication style, values, decision-making patterns, humor style, emotional patterns, relationship dynamics, stories they tell, phrases they use, topics they care about.",

  "voice_profile": {
    "sentence_length": "short|medium|long|mixed",
    "vocabulary_level": "casual|moderate|formal|code-switches",
    "emoji_usage": "never|rare|moderate|heavy",
    "punctuation_style": "description of their punctuation patterns",
    "humor_style": "description of how they're funny",
    "energy_level": "low-key|moderate|high-energy|context-dependent",
    "directness": 1-10,
    "formality": 1-10,
    "warmth": 1-10,
    "opening_patterns": ["how they typically start messages"],
    "closing_patterns": ["how they typically end messages"],
    "filler_phrases": ["phrases they use frequently"],
    "tone_markers": ["key tone descriptors"]
  },

  "episodic_memories": [
    {
      "title": "short title",
      "narrative": "the story as they told it",
      "emotion": "primary emotion",
      "lesson": "what they took from it",
      "telling_style": "how they narrate (dramatic, understated, etc.)",
      "tags": ["relevant tags"]
    }
  ],

  "relationship_modes": {
    "close_friends": { "tone": "...", "formality": 1-10, "humor": 1-10, "example": "..." },
    "professional": { "tone": "...", "formality": 1-10, "humor": 1-10, "example": "..." },
    "strangers": { "tone": "...", "formality": 1-10, "humor": 1-10, "example": "..." },
    "conflict": { "tone": "...", "formality": 1-10, "humor": 1-10, "example": "..." },
    "emotional_support": { "tone": "...", "formality": 1-10, "humor": 1-10, "example": "..." }
  },

  "values_matrix": {
    "core_values": ["ranked list of 5-7 core values"],
    "tradeoff_preferences": { "honesty_vs_kindness": "their preference + nuance", ... },
    "decision_style": "description of how they make decisions",
    "moral_boundaries": ["things they won't compromise on"]
  }
}

## Instructions
- Base EVERYTHING on actual data from the interviews — never invent
- Quote their exact words when possible
- Note contradictions as features, not bugs
- The soul document should read like it was written by someone who knows them deeply
- Be specific, not generic — "uses 'lol' to defuse tension" beats "uses humor"
- The voice profile must be precise enough to reconstruct their writing style`;

export interface SoulPackageData {
  soulDocument: string;
  voiceProfile: Record<string, unknown>;
  episodicMemories: Record<string, unknown>[];
  relationshipModes: Record<string, unknown>;
  valuesMatrix: Record<string, unknown>;
  correctionLog: Array<{
    twin_response: string;
    user_correction: string;
    scenario_context: string;
  }>;
  accuracyScore: number;
}

export async function generateSoulPackage(
  allMessages: Message[],
  writingSamples: WritingSample[]
): Promise<SoulPackageData> {
  const client = getClaudeClient();

  // Organize messages by phase
  const session1 = allMessages.filter((m) => m.phase === 1);
  const session2 = allMessages.filter((m) => m.phase === 2);
  const session3 = allMessages.filter((m) => m.phase === 3);

  // Extract corrections from session 3
  const corrections: SoulPackageData["correctionLog"] = [];
  let totalMirrorTests = 0;
  let correctCount = 0;

  for (let i = 0; i < session3.length; i++) {
    const msg = session3[i];
    if (msg?.role === "user" && msg.metadata) {
      const meta = msg.metadata as Record<string, unknown>;
      if (meta.accuracy_vote === "yes") {
        totalMirrorTests++;
        correctCount++;
      } else if (meta.accuracy_vote === "no") {
        totalMirrorTests++;
        // Find the assistant message this corrects
        const correctedMsg = session3
          .slice(0, i)
          .reverse()
          .find((m) => m.role === "assistant");
        if (correctedMsg) {
          corrections.push({
            twin_response: correctedMsg.content,
            user_correction: msg.content,
            scenario_context: correctedMsg.content.slice(0, 100),
          });
        }
      }
    }
  }

  const accuracyScore = totalMirrorTests > 0 ? correctCount / totalMirrorTests : 0;

  // Build the data payload for Claude
  const dataPayload = {
    session_1_messages: session1.map((m) => ({
      role: m.role,
      content: m.content,
      type: m.messageType,
    })),
    session_2_messages: session2.map((m) => ({
      role: m.role,
      content: m.content,
      type: m.messageType,
    })),
    session_3_messages: session3.map((m) => ({
      role: m.role,
      content: m.content,
      type: m.messageType,
      metadata: m.metadata,
    })),
    writing_samples: writingSamples.map((s) => ({
      content: s.content,
      context: s.contextTag,
      voice_analysis: s.voiceAnalysis,
    })),
    corrections,
    accuracy_score: accuracyScore,
  };

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: GENERATION_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Generate the Soul Package from this interview data:\n\n${JSON.stringify(dataPayload, null, 2)}`,
      },
    ],
  });

  const rawContent =
    response.content[0]?.type === "text" ? response.content[0].text : "{}";

  // Log usage
  await logUsage({
    operation: "soul_package_generation",
    model: MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  });

  // Parse the JSON response
  let parsed: Record<string, unknown>;
  try {
    // Extract JSON from potential markdown code fences
    const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)```/) ||
      rawContent.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : rawContent;
    parsed = JSON.parse(jsonStr);
  } catch {
    parsed = { soul_document: rawContent };
  }

  return {
    soulDocument: (parsed.soul_document as string) ?? "",
    voiceProfile: (parsed.voice_profile as Record<string, unknown>) ?? {},
    episodicMemories: (parsed.episodic_memories as Record<string, unknown>[]) ?? [],
    relationshipModes: (parsed.relationship_modes as Record<string, unknown>) ?? {},
    valuesMatrix: (parsed.values_matrix as Record<string, unknown>) ?? {},
    correctionLog: corrections,
    accuracyScore,
  };
}
