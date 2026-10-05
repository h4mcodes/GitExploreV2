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

  const prompt = `Analyze the repository evidence below and provide an intelligent architectural overview in JSON format:

\`\`\`json
${contextJson}
\`\`\`

Your analysis must evaluate:
- High-level executive summary of what this repository is and its main language/purpose
- Key activity indicators (commit velocity, active days, changes per commit)
- Architecture & file hotspot observations (areas of high churn or risk)
- Evolutionary growth pattern assessment (accelerating, steady, fading, etc.)
- 2-3 key takeaways for a developer investigating this codebase for the first time

Return a valid JSON object adhering strictly to this schema:
{
  "summary": "Concise executive summary of what this repository is and does",
  "purpose": "Primary purpose and goal of the project",
  "primaryStack": ["Primary languages, frameworks, and core libraries"],
  "techStack": ["Comprehensive list of technologies detected in evidence"],
  "activityLevel": "HIGH" | "MODERATE" | "LOW" | "INACTIVE",
  "maintenanceAssessment": "Assessment of maintenance vitality, release pace, and commit cadence",
  "architectureObservations": ["Key observations about directory structure, separation of concerns, and system design"],
  "notablePatterns": ["Notable software engineering patterns, conventions, or design choices"],
  "hotspotAnalysis": {
    "criticalFiles": ["Files showing concentrated churn or high modification frequency"],
    "observations": "Summary of file change concentration and potential stability hotspots"
  },
  "growthTrajectory": "Trajectory classification (e.g. steady growth, accelerating, stable maintenance, inactive)",
  "keyTakeaways": ["2-3 key takeaways for a developer investigating this codebase for the first time"],
  "supportingEvidence": ["Specific file paths, branches, or commit SHAs referenced as concrete evidence"]
}`;

  return {
    prompt,
    systemInstruction: REPOSITORY_OVERVIEW_SYSTEM_INSTRUCTION,
    version: REPOSITORY_OVERVIEW_PROMPT_VERSION,
  };
}
