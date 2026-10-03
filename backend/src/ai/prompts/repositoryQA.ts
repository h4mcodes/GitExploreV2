import type { PromptResult } from './repositoryOverview.js';

export const REPOSITORY_QA_PROMPT_VERSION = '1.0.0';

export const REPOSITORY_QA_SYSTEM_INSTRUCTION = `You are GitExplore AI, an intelligent repository question-answering assistant.
Answer the user's specific question about the repository using the provided evidence and telemetry.
Rules:
1. Answer the question directly, concisely, and accurately based strictly on the provided context.
2. Cite specific metrics, filenames, author stats, or dates from the evidence when supporting your answer.
3. If the context does not contain enough information to answer definitively, explicitly state the limitation rather than hallucinating facts.`;

export function buildRepositoryQAPrompt(context: Record<string, unknown>): PromptResult {
  const question = typeof context.question === 'string' ? context.question : 'Analyze this repository.';
  const contextJson = JSON.stringify(context, null, 2);

  const prompt = `User Question: "${question}"

Please answer the question using the repository evidence below:

\`\`\`json
${contextJson}
\`\`\`

Provide a clear, fact-based answer citing specific evidence from the context where relevant.`;

  return {
    prompt,
    systemInstruction: REPOSITORY_QA_SYSTEM_INSTRUCTION,
    version: REPOSITORY_QA_PROMPT_VERSION,
  };
}
