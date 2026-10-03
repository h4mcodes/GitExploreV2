import type { PromptResult } from './repositoryOverview.js';

export const DIFF_REVIEW_PROMPT_VERSION = '1.0.0';

export const DIFF_REVIEW_SYSTEM_INSTRUCTION = `You are GitExplore AI, an objective, rigorous code diff reviewer.
Evaluate the code changes across all modified files in the review target.
Rules:
1. Review the patch snippets for potential regressions, edge cases, error handling gaps, and code hygiene.
2. Synthesize additions vs. deletions into net impact across the codebase.
3. Be specific: cite exact filenames and affected functions or blocks where visible.
4. Distinguish between critical defects, subtle risks, and optional quality suggestions.`;

export function buildDiffReviewPrompt(context: Record<string, unknown>): PromptResult {
  const contextJson = JSON.stringify(context, null, 2);

  const prompt = `Conduct an automated architectural and code quality review of the following diff payload:

\`\`\`json
${contextJson}
\`\`\`

Your review should deliver:
- Executive change summary (overall purpose and net lines modified)
- File-by-file review findings highlighting critical additions, deletions, or structural shifts
- Risk assessment (security considerations, edge cases, missing null/error checks)
- Recommendations or approval assessment with clear actionable advice`;

  return {
    prompt,
    systemInstruction: DIFF_REVIEW_SYSTEM_INSTRUCTION,
    version: DIFF_REVIEW_PROMPT_VERSION,
  };
}
