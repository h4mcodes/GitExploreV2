import type { PromptResult } from './repositoryOverview.js';

export const COMMIT_EXPLANATION_PROMPT_VERSION = '1.0.0';

export const COMMIT_EXPLANATION_SYSTEM_INSTRUCTION = `You are GitExplore AI, an expert code reviewer and Git forensics assistant.
Analyze the provided commit metadata, change stats, and file diff patches to explain why the change was made and what technical impact it carries.
Rules:
1. Ground your explanation directly in the commit message, author notes, and patch contents provided.
2. Clearly categorize the commit intent (e.g. bugfix, feature enhancement, refactor, dependency update, documentation).
3. Identify key files changed and summarize the architectural shift or behavioral modification.
4. Do not assume or fabricate functionality beyond the visible diff hunks.`;

export function buildCommitExplanationPrompt(context: Record<string, unknown>): PromptResult {
  const contextJson = JSON.stringify(context, null, 2);

  const prompt = `Please analyze and explain this specific Git commit using the structured evidence provided below:

\`\`\`json
${contextJson}
\`\`\`

Your explanation should evaluate:
- Summary of the primary intent and motivation behind this commit
- Breakdown of notable file changes and key code logic modifications
- Technical scope, complexity, and potential blast radius / side-effects
- Clarification on whether this is a merge commit, breaking change, or routine maintenance

Return a valid JSON object adhering strictly to this schema:
{
  "intent": "FEATURE" | "BUGFIX" | "REFACTOR" | "PERFORMANCE" | "DOCUMENTATION" | "DEPENDENCY" | "CHORE" | "MERGE" | "OTHER",
  "summary": "Concise summary of the commit and what it accomplishes",
  "motivation": "Why this commit was created, underlying problem or requirement solved",
  "technicalImpact": "Technical consequences, architectural shifts, or downstream impacts",
  "complexity": "LOW" | "MEDIUM" | "HIGH",
  "changesPerFile": [
    {
      "filename": "path/to/file.ext",
      "summary": "Specific changes made in this file",
      "riskLevel": "LOW" | "MEDIUM" | "HIGH"
    }
  ],
  "modifiedComponents": [
    {
      "filename": "path/to/file.ext",
      "summary": "Specific changes made in this file",
      "riskLevel": "LOW" | "MEDIUM" | "HIGH"
    }
  ],
  "potentialRisks": ["Potential risks, regression vectors, or edge cases to test"],
  "isBreakingChange": false,
  "keyChanges": ["Bullet list of key logic or configuration modifications"],
  "supportingEvidence": ["Commit SHA and specific modified file paths"]
}`;

  return {
    prompt,
    systemInstruction: COMMIT_EXPLANATION_SYSTEM_INSTRUCTION,
    version: COMMIT_EXPLANATION_PROMPT_VERSION,
  };
}

