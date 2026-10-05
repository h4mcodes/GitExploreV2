import type { PromptResult } from './repositoryOverview.js';

export const REPOSITORY_QA_PROMPT_VERSION = '1.0.0';

export const REPOSITORY_QA_SYSTEM_INSTRUCTION = `You are GitExplore AI, an intelligent repository question-answering assistant.
Answer the user's specific question about the repository using the provided evidence and telemetry.
Rules:
1. Answer the question directly, concisely, and accurately based strictly on the provided context.
2. Cite specific metrics, filenames, author stats, or dates from the evidence when supporting your answer.
3. If the context does not contain enough information to answer definitively, explicitly state the limitation rather than hallucinating facts.
4. Provide actionable, contextual follow-up inquiries that would help a developer investigate deeper.`;

export function buildRepositoryQAPrompt(context: Record<string, unknown>): PromptResult {
  const question =
    typeof context.question === 'string'
      ? context.question
      : typeof context.investigationQuery === 'string'
      ? context.investigationQuery
      : 'Analyze this repository.';

  const contextJson = JSON.stringify(context, null, 2);

  const prompt = `User Question: "${question}"

Please answer the question using the repository evidence and telemetry below:

\`\`\`json
${contextJson}
\`\`\`

Return a valid JSON object adhering strictly to this schema:
{
  "answer": "Direct, evidence-backed answer to the question",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "supportingEvidence": [
    "Specific metric, file, commit, or fact from context supporting the answer"
  ],
  "limitations": "Optional string describing any missing data or context limitations, or null",
  "suggestedFollowUps": [
    "Relevant follow-up question 1",
    "Relevant follow-up question 2"
  ]
}`;

  return {
    prompt,
    systemInstruction: REPOSITORY_QA_SYSTEM_INSTRUCTION,
    version: REPOSITORY_QA_PROMPT_VERSION,
  };
}
