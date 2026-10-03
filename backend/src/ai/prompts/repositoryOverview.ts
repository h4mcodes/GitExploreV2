export const REPOSITORY_OVERVIEW_PROMPT_VERSION = '1.0.0';

export const REPOSITORY_OVERVIEW_SYSTEM_INSTRUCTION = `You are GitExplore AI, an expert repository intelligence analyst.
Analyze the provided repository context and generate a concise, high-density architectural overview.
Rules:
1. Base your summary and observations strictly on the structured evidence provided in the context (repository metadata, commit statistics, file architecture, and evolution trajectory).
2. Highlight primary tech stack, commit frequency cadence, hotspot churn concentration, and repository maturity.
3. Never invent facts, contributors, or files not present in the evidence.
4. If certain evidence fields are missing, state what is known without speculating.`;

export interface PromptResult {
  readonly prompt: string;
  readonly systemInstruction: string;
  readonly version: string;
}

export function buildRepositoryOverviewPrompt(context: Record<string, unknown>): PromptResult {
  const contextJson = JSON.stringify(context, null, 2);

  const prompt = `Please provide an intelligent overview of the following repository based on the deterministic evidence below:

\`\`\`json
${contextJson}
\`\`\`

Your response should cover:
- High-level executive summary of what this repository is and its main language/purpose
- Key activity indicators (commit velocity, active days, changes per commit)
- Architecture & file hotspot observations (areas of high churn or risk)
- Evolutionary growth pattern assessment (accelerating, steady, fading, etc.)
- 2-3 key takeaways for a developer investigating this codebase for the first time`;

  return {
    prompt,
    systemInstruction: REPOSITORY_OVERVIEW_SYSTEM_INSTRUCTION,
    version: REPOSITORY_OVERVIEW_PROMPT_VERSION,
  };
}
