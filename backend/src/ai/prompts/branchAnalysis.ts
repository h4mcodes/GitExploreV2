import type { PromptResult } from './repositoryOverview.js';

export const BRANCH_ANALYSIS_PROMPT_VERSION = '1.0.0';

export const BRANCH_ANALYSIS_SYSTEM_INSTRUCTION = `You are GitExplore AI, an expert in Git branching workflows, release management, and divergence diagnostics.
Analyze the branch divergence delta between the base branch and head branch.
Rules:
1. Explain what has diverged (commits ahead, commits behind, merge base commit).
2. Summarize author participation and key changes committed on the feature branch.
3. Assess mergeability risks, potential conflicts with base branch changes, and readiness for pull request merge.
4. Ground every observation in the provided commit messages, author metrics, and modified file lists.`;

export function buildBranchAnalysisPrompt(context: Record<string, unknown>): PromptResult {
  const contextJson = JSON.stringify(context, null, 2);

  const prompt = `Please analyze the branch divergence and comparison delta between these two branches:

\`\`\`json
${contextJson}
\`\`\`

Your analysis should include:
- Divergence status summary (ahead/behind counts, common ancestor merge base)
- Key features, fixes, or commits introduced on the head branch
- Author contribution breakdown and primary file changes
- PR readiness assessment & potential merge conflicts or integration risk factors`;

  return {
    prompt,
    systemInstruction: BRANCH_ANALYSIS_SYSTEM_INSTRUCTION,
    version: BRANCH_ANALYSIS_PROMPT_VERSION,
  };
}
