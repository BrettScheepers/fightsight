/**
 * LLM Prompt Templates
 *
 * Structured prompts for vision-based strike classification and analysis
 */

export interface StrikeClassificationPromptParams {
  sportType: string;
  frameNumber: number;
  timestamp: number;
}

/**
 * Generate strike classification prompt for vision model
 */
export function generateStrikeClassificationPrompt(
  params: StrikeClassificationPromptParams
): string {
  return `You are analyzing a frame from a ${params.sportType} sparring session.

Frame Information:
- Frame Number: ${params.frameNumber}
- Timestamp: ${params.timestamp}s

Your task is to classify any strike visible in this frame. Analyze the image and provide the following information in JSON format:

{
  "strikeDetected": boolean,
  "technique": string | null,
  "strikeCategory": "hand" | "kick" | "elbow" | "knee" | null,
  "thrower": "fighter_a" | "fighter_b" | null,
  "receiver": "fighter_a" | "fighter_b" | null,
  "throwerStance": "orthodox" | "southpaw" | "switch" | null,
  "targetZone": "head" | "body" | "legs" | null,
  "outcome": "landed_clean" | "partially_landed" | "blocked" | "slipped" | "parried" | "rolled" | "missed" | "countered" | null,
  "confidence": number (0-1)
}

Guidelines:
- strikeDetected: true if ANY strike is visible (throwing, landing, or in motion)
- technique: Specific strike type (jab, cross, hook, uppercut, front_kick, roundhouse, etc.)
- strikeCategory: Type of strike weapon used
  * hand: Punches (jab, cross, hook, uppercut, etc.)
  * kick: Kicks (front kick, roundhouse, side kick, etc.)
  * elbow: Elbow strikes
  * knee: Knee strikes
- thrower: Which fighter is throwing the strike
- receiver: Which fighter is receiving/defending against the strike
- throwerStance: The stance of the fighter throwing the strike
  * orthodox: Left foot forward, right hand power side (most common for right-handed)
  * southpaw: Right foot forward, left hand power side (most common for left-handed)
  * switch: Fighter has switched stance from their usual
- targetZone: Where the strike is aimed (ONLY use head, body, or legs - map neck/face to head, torso/chest to body)
- outcome: What happened with the strike
  * landed_clean: Strike connected cleanly with target
  * partially_landed: Strike grazed or partially connected
  * blocked: Strike was blocked by guard/arms
  * slipped: Defender moved head/body to avoid
  * parried: Strike was redirected by defender
  * rolled: Defender rolled with the strike to minimize impact
  * missed: Strike completely missed target
  * countered: Strike was met with a counter-strike
- confidence: Your confidence in this classification (0.0-1.0)

Important:
- If no strike is visible in the frame, set strikeDetected to false and all other fields to null
- Be conservative with "landed_clean" - only use when strike clearly connects
- Consider fighter positioning, glove placement, and body movement
- Use context clues like defensive reactions to help classify outcome
- Maintain consistency with ${params.sportType} techniques and rules

Return ONLY the JSON object, no additional text.`;
}

export interface ReportGenerationPromptParams {
  sportType: string;
  totalStrikes: number;
  totalDuration: number;
  fighterCount: number;
}

/**
 * Generate report generation prompt
 */
export function generateReportGenerationPrompt(
  params: ReportGenerationPromptParams,
  data: string
): string {
  return `You are a ${params.sportType} coach analyzing a sparring session.

Session Information:
- Sport: ${params.sportType}
- Duration: ${params.totalDuration}s
- Fighters: ${params.fighterCount}
- Total Strikes: ${params.totalStrikes}

Strike Data:
${data}

Generate a comprehensive analysis report in JSON format:

{
  "overview": string,
  "keyInsights": string[],
  "strengths": string[],
  "areasForImprovement": string[]
}

Guidelines:
- overview: 2-3 sentences summarizing the session (overall performance, strike volume, patterns)
- keyInsights: 4-5 specific observations about the session (accuracy, combinations, patterns, effectiveness)
- strengths: 4-5 positive aspects to reinforce (technique, defense, strategy, conditioning)
- areasForImprovement: 4-5 constructive areas to work on (technique gaps, defensive holes, tactical adjustments)

Tone:
- Professional but encouraging
- Specific and actionable
- Focus on technique and tactics, not just numbers
- Balance praise with constructive feedback
- Reference specific strike types and patterns from the data

Return ONLY the JSON object, no additional text.`;
}
