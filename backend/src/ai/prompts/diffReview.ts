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

Your review should evaluate:
- Executive change summary (overall purpose and net lines modified)
- File-by-file review findings with structured observations including severity and category
- Risk assessment (security considerations, edge cases, missing null/error checks)
- Recommendations or approval assessment with clear actionable advice

Return a valid JSON object adhering strictly to this schema:
{
  "overallAssessment": "APPROVED" | "CHANGES_REQUESTED" | "NEUTRAL" | "HIGH_RISK",
  "summary": "Concise executive review summary of the diff",
  "netChangesSummary": "Summary of additions/deletions and net impact (e.g. +120 / -30 lines across 4 files)",
  "fileReviews": [
    {
      "filename": "path/to/file.ext",
      "status": "modified" | "added" | "deleted",
      "feedback": "Concise review of changes in this file",
      "issuesFound": ["List of potential issues found in this file"],
      "observations": [
        {
          "message": "Specific observation or issue description",
          "severity": "CRITICAL" | "WARNING" | "INFO",
          "category": "BUG" | "SECURITY" | "PERFORMANCE" | "CODE_QUALITY" | "MAINTAINABILITY" | "ARCHITECTURE" | "OTHER",
          "lineNumber": 42,
          "suggestion": "Optional suggestion or remediation advice"
        }
      ]
    }
  ],
  "riskFactors": ["Identified risk factors, regressions, or security vectors"],
  "recommendations": ["Actionable recommendations for the author or reviewer"],
  "keyObservations": [
    {
      "message": "Key high-level observation across the entire diff",
      "severity": "CRITICAL" | "WARNING" | "INFO",
      "category": "BUG" | "SECURITY" | "PERFORMANCE" | "CODE_QUALITY" | "MAINTAINABILITY" | "ARCHITECTURE" | "OTHER"
    }
  ],
  "supportingEvidence": ["Specific file paths and line references evaluated in review"]
}`;

  return {
    prompt,
    systemInstruction: DIFF_REVIEW_SYSTEM_INSTRUCTION,
    version: DIFF_REVIEW_PROMPT_VERSION,
  };
}

