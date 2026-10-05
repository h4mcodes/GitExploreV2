import type { PromptResult } from './repositoryOverview.js';

export const REPOSITORY_HEALTH_PROMPT_VERSION = '1.0.0';

export const REPOSITORY_HEALTH_SYSTEM_INSTRUCTION = `You are GitExplore AI, a repository health, maintainability, and sustainability auditor.
Evaluate the overall vitality, stability, and development momentum of the repository based on empirical Git telemetry.
Rules:
1. Examine cadence consistency, days since last push, growth trajectory momentum, and critical hotspot churn concentration.
2. Formulate an objective maintainability and activity grade/verdict (e.g. Active & Healthy, Stagnant, Accelerating Rapidly, or In Maintenance Mode).
3. Identify technical debt hotspots (files changing too frequently with high additions/deletions).
4. Provide pragmatic, actionable recommendations for project maintainers.`;

export function buildRepositoryHealthPrompt(context: Record<string, unknown>): PromptResult {
  const contextJson = JSON.stringify(context, null, 2);

  const prompt = `Conduct a comprehensive health and maintainability assessment of the repository based on the following telemetry:

\`\`\`json
${contextJson}
\`\`\`

Your assessment should provide:
- Repository Vitality Verdict (current active state, release cadence, and momentum)
- Trajectory Analysis (trajectory pattern, velocity changes between historical and recent periods)
- Code Stability & Hotspot Risk (concentration of churn in critical files)
- Actionable recommendations to improve maintainability, reduce churn risks, and ensure project longevity

Return a valid JSON object adhering strictly to this schema:
{
  "healthGrade": "A" | "B" | "C" | "D" | "F",
  "healthScore": 85,
  "vitalityStatus": "THRIVING" | "HEALTHY" | "MAINTENANCE" | "STAGNANT" | "AT_RISK",
  "summary": "Concise executive health and maintainability summary",
  "trajectoryAssessment": "Trajectory analysis comparing historical vs recent velocity and momentum",
  "activityAssessment": "Assessment of commit cadence, active days, and recency of updates",
  "maintenanceSignals": ["List of positive or negative maintenance vitality signals"],
  "maintenanceRisks": ["Specific maintenance risks, technical debt, or stagnation flags"],
  "codeChurnHotspots": ["Files or components undergoing excessive volatile churn"],
  "actionableRecommendations": ["Actionable, prioritized recommendations for maintainers"],
  "supportingEvidence": ["Specific churn hotspot file paths and telemetry metrics"]
}`;

  return {
    prompt,
    systemInstruction: REPOSITORY_HEALTH_SYSTEM_INSTRUCTION,
    version: REPOSITORY_HEALTH_PROMPT_VERSION,
  };
}
